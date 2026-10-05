import type { Request, Response, NextFunction } from 'express';
import { tenantAdminService, TenantAdminService } from '../service/tenantAdmin.service.js';
import { companyService } from '../../companies/service/company.service.js';
import { validateCreateTenantAdminCompany } from '../../companies/validation/company.schema.js';
import { UnauthorizedError, BadRequestError } from '../../../app/errors/AppError.js';

export class TenantAdminController {
  constructor(private readonly service: TenantAdminService = tenantAdminService) {}

  getContext = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user || !req.tenantAdminContext) {
        throw new UnauthorizedError('Tenant Admin authority required');
      }
      const context = await this.service.getTenantAdminContext(
        req.user.id,
        req.tenantAdminContext.tenantId,
      );
      res.json({ data: context });
    } catch (err) {
      next(err);
    }
  };

  getTenantDetails = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.tenantAdminContext) {
        throw new UnauthorizedError('Tenant Admin authority required');
      }
      const details = await this.service.getTenantDetails(req.tenantAdminContext.tenantId);
      res.json({ data: details });
    } catch (err) {
      next(err);
    }
  };

  listCompanies = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.tenantAdminContext) {
        throw new UnauthorizedError('Tenant Admin authority required');
      }
      const { items, capacity } = await this.service.listCompanies(req.tenantAdminContext.tenantId);
      res.json({ data: items, capacity });
    } catch (err) {
      next(err);
    }
  };

  createCompany = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.tenantAdminContext || !req.user) {
        throw new UnauthorizedError('Tenant Admin authority required');
      }
      const dto = validateCreateTenantAdminCompany(req.body);
      const actor = { id: req.user.id, email: req.user.email };
      const company = await this.service.createCompany(
        req.tenantAdminContext.tenantId,
        dto,
        actor,
      );
      res.status(201).json({ data: company });
    } catch (err) {
      next(err);
    }
  };

  getCompanyContext = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.tenantAdminCompanyContext) {
        throw new BadRequestError('Company context not resolved');
      }
      res.json({ data: req.tenantAdminCompanyContext });
    } catch (err) {
      next(err);
    }
  };

  listAdmins = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.tenantAdminContext) {
        throw new UnauthorizedError('Tenant Admin authority required');
      }
      const admins = await this.service.listTenantAdmins(req.tenantAdminContext.tenantId);
      res.json({ data: admins });
    } catch (err) {
      next(err);
    }
  };

  assignAdmin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.tenantAdminContext || !req.user) {
        throw new UnauthorizedError('Tenant Admin authority required');
      }
      const { userId, newUser } = req.body;
      const actor = { id: req.user.id, email: req.user.email };

      // Strictly force tenantId to caller's verified tenant
      const result = await this.service.assignTenantAdmin(
        {
          tenantId: req.tenantAdminContext.tenantId,
          userId,
          newUser,
        },
        actor,
      );

      res.status(201).json({ data: result });
    } catch (err) {
      next(err);
    }
  };

  revokeAdmin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.tenantAdminContext || !req.user) {
        throw new UnauthorizedError('Tenant Admin authority required');
      }
      const rawTargetUserId = req.params.userId;
      const targetUserId =
        typeof rawTargetUserId === 'string'
          ? rawTargetUserId.trim()
          : Array.isArray(rawTargetUserId)
            ? String(rawTargetUserId[0]).trim()
            : undefined;
      if (!targetUserId) {
        throw new BadRequestError('Target user ID is required');
      }
      const actor = { id: req.user.id, email: req.user.email };

      await this.service.revokeTenantAdmin(
        req.tenantAdminContext.tenantId,
        targetUserId,
        actor,
      );

      res.json({ message: 'Tenant Administrator revoked successfully' });
    } catch (err) {
      next(err);
    }
  };

  getCompanyProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.tenantAdminCompanyContext) {
        throw new BadRequestError('Company context not resolved');
      }
      const profile = await companyService.getCompanyProfile(req.tenantAdminCompanyContext.id);
      res.json({ data: profile });
    } catch (err) {
      next(err);
    }
  };

  updateCompanyProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.tenantAdminCompanyContext || !req.tenantAdminContext || !req.user) {
        throw new BadRequestError('Company context not resolved');
      }
      const actor = { id: req.user.id, email: req.user.email };
      const profile = await companyService.updateCompanyProfile(
        req.tenantAdminContext.tenantId,
        req.tenantAdminCompanyContext.id,
        req.body,
        actor,
      );
      res.json({ data: profile });
    } catch (err) {
      next(err);
    }
  };
}

export const tenantAdminController = new TenantAdminController();
