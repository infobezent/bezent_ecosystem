import { Router, type Request, type Response, type NextFunction } from 'express';
import { requirePlatformAuth, requireSuperAdmin } from '../../../platform/auth/middleware/auth.middleware.js';
import { tenantAdminRepository } from '../repository/tenantAdmin.repository.js';
import { tenantAdminService } from '../service/tenantAdmin.service.js';
import { tenantAdminBackfillService } from '../service/tenantAdminBackfill.service.js';
import { BadRequestError } from '../../../app/errors/AppError.js';
import type { TenantAdminStatus } from '../types/tenantAdmin.types.js';

export const platformTenantAdminRouter = Router();

platformTenantAdminRouter.use(requirePlatformAuth, requireSuperAdmin);

// 1. List tenant admins across all tenants or filtered by tenantId
platformTenantAdminRouter.get(
  '/tenant-admins',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, status } = req.query;
      const records = await tenantAdminRepository.listAll({
        tenantId: typeof tenantId === 'string' ? tenantId : undefined,
        status: typeof status === 'string' ? (status as TenantAdminStatus) : undefined,
      });
      res.json({ data: records });
    } catch (err) {
      next(err);
    }
  },
);

// 2. Super Admin assignment (Scenario A: Initial / recovery assignment)
platformTenantAdminRouter.post(
  '/tenant-admins/assign',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, userId, newUser } = req.body;
      if (!tenantId) {
        throw new BadRequestError('Tenant ID is required', 'TENANT_ID_REQUIRED');
      }
      const actor = req.user ? { id: req.user.id, email: req.user.email } : undefined;
      const result = await tenantAdminService.assignTenantAdmin(
        { tenantId, userId, newUser },
        actor,
      );
      res.status(201).json({ data: result });
    } catch (err) {
      next(err);
    }
  },
);

// 3. Super Admin revocation (enforces last admin protection)
platformTenantAdminRouter.post(
  '/tenant-admins/:id/revoke',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rawId = req.params.id;
      const id =
        typeof rawId === 'string'
          ? rawId.trim()
          : Array.isArray(rawId)
            ? String(rawId[0]).trim()
            : '';
      if (!id) {
        throw new BadRequestError('Tenant Admin record ID is required');
      }
      const record = await tenantAdminRepository.findById(id);
      if (!record) {
        throw new BadRequestError(`Tenant Admin record '${id}' not found`);
      }
      const actor = req.user ? { id: req.user.id, email: req.user.email } : undefined;
      await tenantAdminService.revokeTenantAdmin(record.tenantId, record.userId, actor);
      res.json({ message: 'Tenant Administrator revoked successfully' });
    } catch (err) {
      next(err);
    }
  },
);

// 4. Trigger safe backfill for existing tenants
platformTenantAdminRouter.post(
  '/tenant-admins/backfill',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const actor = req.user ? { id: req.user.id, email: req.user.email } : undefined;
      const summary = await tenantAdminBackfillService.runBackfill(actor);
      res.json({ data: summary });
    } catch (err) {
      next(err);
    }
  },
);
