import type { Request, Response, NextFunction } from 'express';
import { OrganizationStructureService } from '../service/organizationStructure.service.js';
import { AppError } from '../../../app/errors/AppError.js';
import {
  validateCreateBusinessUnit,
  validateUpdateBusinessUnit,
  validateCreateDivision,
  validateUpdateDivision,
  validateSetStatus,
} from '../validation/structure.schema.js';

export class OrganizationStructureController {
  constructor(private readonly service = new OrganizationStructureService()) {}

  private getContext(req: Request) {
    const ctx = req.companyContext;
    if (!ctx) {
      throw new AppError('Context not resolved', 400, 'CONTEXT_MISSING');
    }
    return ctx;
  }

  getHierarchy = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = this.getContext(req);
      const hierarchy = await this.service.getHierarchy(tenantId, companyId);
      res.json({ data: hierarchy });
    } catch (err) {
      next(err);
    }
  };

  getEligibleHeads = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = this.getContext(req);
      const heads = await this.service.getEligibleHeads(tenantId, companyId);
      res.json({ data: heads });
    } catch (err) {
      next(err);
    }
  };

  listBusinessUnits = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = this.getContext(req);
      const units = await this.service.listBusinessUnits(tenantId, companyId);
      res.json({ data: units });
    } catch (err) {
      next(err);
    }
  };

  createBusinessUnit = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = this.getContext(req);
      const validated = validateCreateBusinessUnit(req.body);
      const created = await this.service.createBusinessUnit(tenantId, companyId, validated);
      res.status(201).json({ data: created });
    } catch (err) {
      next(err);
    }
  };

  updateBusinessUnit = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = this.getContext(req);
      const id = String(req.params.id);
      const validated = validateUpdateBusinessUnit(req.body);
      const updated = await this.service.updateBusinessUnit(tenantId, companyId, id, validated);
      res.json({ data: updated });
    } catch (err) {
      next(err);
    }
  };

  setBusinessUnitStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = this.getContext(req);
      const id = String(req.params.id);
      const { status } = validateSetStatus(req.body);
      const updated = await this.service.setBusinessUnitStatus(tenantId, companyId, id, status);
      res.json({ data: updated });
    } catch (err) {
      next(err);
    }
  };

  listDivisions = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = this.getContext(req);
      const businessUnitId = req.query.businessUnitId as string | undefined;
      const divisions = await this.service.listDivisions(tenantId, companyId, businessUnitId);
      res.json({ data: divisions });
    } catch (err) {
      next(err);
    }
  };

  createDivision = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = this.getContext(req);
      const validated = validateCreateDivision(req.body);
      const created = await this.service.createDivision(tenantId, companyId, validated);
      res.status(201).json({ data: created });
    } catch (err) {
      next(err);
    }
  };

  updateDivision = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = this.getContext(req);
      const id = String(req.params.id);
      const validated = validateUpdateDivision(req.body);
      const updated = await this.service.updateDivision(tenantId, companyId, id, validated);
      res.json({ data: updated });
    } catch (err) {
      next(err);
    }
  };

  setDivisionStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = this.getContext(req);
      const id = String(req.params.id);
      const { status } = validateSetStatus(req.body);
      const updated = await this.service.setDivisionStatus(tenantId, companyId, id, status);
      res.json({ data: updated });
    } catch (err) {
      next(err);
    }
  };
}

export const organizationStructureController = new OrganizationStructureController();
