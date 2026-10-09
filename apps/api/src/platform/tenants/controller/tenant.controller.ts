import type { Request, Response, NextFunction } from 'express';
import { tenantService, TenantService } from '../service/tenant.service.js';
import {
  validateCreateTenant,
  validateUpdateTenant,
  validateUpdateCompanyCapacity,
} from '../validation/tenant.schema.js';
import type { TenantStatus } from '../types/tenant.types.js';

export class TenantController {
  constructor(private readonly service: TenantService = tenantService) {}

  list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const {
        search,
        status,
        moduleCode,
        application,
        planId,
        trial,
        createdFrom,
        createdTo,
        sortBy,
        sortOrder,
        attention,
        page,
        limit,
      } = req.query;
      const result = await this.service.listTenants({
        search: typeof search === 'string' ? search : undefined,
        status: typeof status === 'string' ? (status as TenantStatus) : undefined,
        moduleCode: typeof moduleCode === 'string' ? moduleCode : undefined,
        application: typeof application === 'string' ? application : undefined,
        planId: typeof planId === 'string' ? planId : undefined,
        trial: typeof trial === 'string' ? trial === 'true' : undefined,
        createdFrom: typeof createdFrom === 'string' ? createdFrom : undefined,
        createdTo: typeof createdTo === 'string' ? createdTo : undefined,
        sortBy: typeof sortBy === 'string' ? (sortBy as any) : undefined,
        sortOrder: typeof sortOrder === 'string' ? (sortOrder as any) : undefined,
        attention:
          typeof attention === 'string'
            ? (attention as import('../types/tenant.types.js').CustomerHealthStatus)
            : undefined,
        page: typeof page === 'string' ? parseInt(page, 10) : 1,
        limit: typeof limit === 'string' ? parseInt(limit, 10) : 20,
      });
      res.status(200).json({ data: result });
    } catch (err) {
      next(err);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = String(req.params.id);
      const result = await this.service.getTenantById(id);
      res.status(200).json({ data: result });
    } catch (err) {
      next(err);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const dto = validateCreateTenant(req.body);
      const actor = { id: req.user?.id, email: req.user?.email };
      const result = await this.service.createTenant(dto, actor);
      res.status(201).json({ data: result });
    } catch (err) {
      next(err);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = String(req.params.id);
      const dto = validateUpdateTenant(req.body);
      const actor = { id: req.user?.id, email: req.user?.email };
      const result = await this.service.updateTenant(id, dto, actor);
      res.status(200).json({ data: result });
    } catch (err) {
      next(err);
    }
  };

  activate = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = String(req.params.id);
      const reason = req.body?.reason ? String(req.body.reason) : undefined;
      const actor = { id: req.user?.id, email: req.user?.email };
      const result = await this.service.activateTenant(id, reason, actor);
      res.status(200).json({ data: result });
    } catch (err) {
      next(err);
    }
  };

  suspend = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = String(req.params.id);
      const reason = req.body?.reason ? String(req.body.reason) : 'Administrative suspension';
      const actor = { id: req.user?.id, email: req.user?.email };
      const result = await this.service.suspendTenant(id, reason, actor);
      res.status(200).json({ data: result });
    } catch (err) {
      next(err);
    }
  };

  terminate = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = String(req.params.id);
      const { confirmTenantId, reason } = req.body || {};
      const actor = { id: req.user?.id, email: req.user?.email };
      const result = await this.service.terminateTenant(id, confirmTenantId, reason, actor);
      res.status(200).json({ data: result, success: true });
    } catch (err) {
      next(err);
    }
  };

  getLifecycleHistory = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = String(req.params.id);
      const history = await this.service.getLifecycleHistory(id);
      res.status(200).json({ data: history });
    } catch (err) {
      next(err);
    }
  };

  getSummary = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const metrics = await this.service.getSummaryMetrics();
      res.status(200).json({ data: metrics });
    } catch (err) {
      next(err);
    }
  };

  getOverview = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = String(req.params.id);
      const overview = await this.service.getTenantOverview(id);
      res.status(200).json({ data: overview });
    } catch (err) {
      next(err);
    }
  };

  getActivity = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = String(req.params.id);
      const { action, actorUserId, actorEmail, startDate, endDate, page, limit } = req.query;
      const activity = await this.service.getTenantActivity(id, {
        action: typeof action === 'string' ? action : undefined,
        actorUserId: typeof actorUserId === 'string' ? actorUserId : undefined,
        actorEmail: typeof actorEmail === 'string' ? actorEmail : undefined,
        startDate: typeof startDate === 'string' ? startDate : undefined,
        endDate: typeof endDate === 'string' ? endDate : undefined,
        page: typeof page === 'string' ? parseInt(page, 10) : 1,
        limit: typeof limit === 'string' ? parseInt(limit, 10) : 50,
      });
      res.status(200).json({ data: activity });
    } catch (err) {
      next(err);
    }
  };

  exportActivity = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = String(req.params.id);
      const { action, actorUserId, actorEmail, startDate, endDate } = req.query;
      const csv = await this.service.exportTenantActivityCsv(id, {
        action: typeof action === 'string' ? action : undefined,
        actorUserId: typeof actorUserId === 'string' ? actorUserId : undefined,
        actorEmail: typeof actorEmail === 'string' ? actorEmail : undefined,
        startDate: typeof startDate === 'string' ? startDate : undefined,
        endDate: typeof endDate === 'string' ? endDate : undefined,
      });
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="tenant-activity-${id}.csv"`);
      res.status(200).send(csv);
    } catch (err) {
      next(err);
    }
  };

  getCapacity = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = String(req.params.id);
      const result = await this.service.getCompanyCapacity(id);
      res.status(200).json({ data: result });
    } catch (err) {
      next(err);
    }
  };

  updateCapacity = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = String(req.params.id);
      const dto = validateUpdateCompanyCapacity(req.body);
      const actor = { id: req.user?.id, email: req.user?.email };
      const result = await this.service.updateCompanyCapacity(id, dto.maxCompanies, actor);
      res.status(200).json({ data: result });
    } catch (err) {
      next(err);
    }
  };
}

export const tenantController = new TenantController();
