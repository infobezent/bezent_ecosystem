import type { Request, Response, NextFunction } from 'express';
import { moduleService, ModuleService } from '../service/module.service.js';
import { validateModuleTogglePayload } from '../validation/module.schema.js';

export class ModuleController {
  constructor(private readonly service: ModuleService = moduleService) {}

  getCatalog = (req: Request, res: Response) => {
    const appCode = req.query.applicationCode || req.query.application;
    const catalog = appCode ? this.service.getCatalog(String(appCode)) : this.service.getCatalog();
    res.status(200).json({ data: catalog });
  };

  getPlanModules = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const planId = String(req.params.planId || req.params.id);
      const modules = await this.service.getPlanModuleEligibility(planId);
      res.status(200).json({ data: modules });
    } catch (err) {
      next(err);
    }
  };

  listTenantModules = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = req.query;
      if (typeof tenantId !== 'string' || !tenantId.trim()) {
        res.status(400).json({ error: { message: 'tenantId query parameter is required' } });
        return;
      }
      const modules = await this.service.getTenantModules(
        tenantId.trim(),
        typeof companyId === 'string' ? companyId.trim() : undefined,
      );
      res.status(200).json({ data: modules });
    } catch (err) {
      next(err);
    }
  };

  enable = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, moduleCode, companyId } = validateModuleTogglePayload(req.body);
      const actor = { id: req.user?.id, email: req.user?.email };
      const record = await this.service.enableModule(tenantId, moduleCode, companyId, actor);
      res.status(200).json({ data: record });
    } catch (err) {
      next(err);
    }
  };

  disable = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, moduleCode, companyId } = validateModuleTogglePayload(req.body);
      const actor = { id: req.user?.id, email: req.user?.email };
      const record = await this.service.disableModule(tenantId, moduleCode, companyId, actor);
      res.status(200).json({ data: record });
    } catch (err) {
      next(err);
    }
  };
}

export const moduleController = new ModuleController();
