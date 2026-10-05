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
      const { search, status, moduleCode, attention, page, limit } = req.query;
      const result = await this.service.listTenants({
        search: typeof search === 'string' ? search : undefined,
        status: typeof status === 'string' ? (status as TenantStatus) : undefined,
        moduleCode: typeof moduleCode === 'string' ? moduleCode : undefined,
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
      const actor = { id: req.user?.id, email: req.user?.email };
      const result = await this.service.activateTenant(id, actor);
      res.status(200).json({ data: result });
    } catch (err) {
      next(err);
    }
  };

  suspend = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = String(req.params.id);
      const actor = { id: req.user?.id, email: req.user?.email };
      const result = await this.service.suspendTenant(id, actor);
      res.status(200).json({ data: result });
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
