import type { Request, Response, NextFunction } from 'express';
import { companyService, CompanyService } from '../service/company.service.js';
import { validateCreateCompany, validateUpdateCompany } from '../validation/company.schema.js';
import type { CompanyStatus } from '../types/company.types.js';

export class CompanyController {
  constructor(private readonly service: CompanyService = companyService) {}

  list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, search, status, moduleCode, page, limit } = req.query;
      const result = await this.service.listCompanies({
        tenantId: typeof tenantId === 'string' ? tenantId : undefined,
        search: typeof search === 'string' ? search : undefined,
        status: typeof status === 'string' ? (status as CompanyStatus) : undefined,
        moduleCode: typeof moduleCode === 'string' ? moduleCode : undefined,
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
      const result = await this.service.getCompanyById(id);
      res.status(200).json({ data: result });
    } catch (err) {
      next(err);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const dto = validateCreateCompany(req.body);
      const actor = { id: req.user?.id, email: req.user?.email };
      const result = await this.service.createCompany(dto, actor);
      res.status(201).json({ data: result });
    } catch (err) {
      next(err);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = String(req.params.id);
      const dto = validateUpdateCompany(req.body);
      const actor = { id: req.user?.id, email: req.user?.email };
      const result = await this.service.updateCompany(id, dto, actor);
      res.status(200).json({ data: result });
    } catch (err) {
      next(err);
    }
  };

  activate = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = String(req.params.id);
      const actor = { id: req.user?.id, email: req.user?.email };
      const result = await this.service.activateCompany(id, actor);
      res.status(200).json({ data: result });
    } catch (err) {
      next(err);
    }
  };

  suspend = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = String(req.params.id);
      const actor = { id: req.user?.id, email: req.user?.email };
      const result = await this.service.suspendCompany(id, actor);
      res.status(200).json({ data: result });
    } catch (err) {
      next(err);
    }
  };
}

export const companyController = new CompanyController();
