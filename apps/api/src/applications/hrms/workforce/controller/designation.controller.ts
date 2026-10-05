import type { Request, Response, NextFunction } from 'express';
import { DesignationService, designationService } from '../service/designation.service.js';
import { AppError } from '../../../../app/errors/AppError.js';
import {
  validateCreateDesignation,
  validateUpdateDesignation,
  validateSetDesignationStatus,
  validateListDesignationsQuery,
} from '../validation/designation.schema.js';

export class DesignationController {
  constructor(private readonly service: DesignationService = designationService) {}

  private getContext(req: Request) {
    const ctx = req.companyContext;
    if (!ctx) {
      throw new AppError('Context not resolved', 400, 'CONTEXT_MISSING');
    }
    return ctx;
  }

  private getActor(req: Request) {
    return {
      userId: req.user?.id,
      email: req.user?.email,
    };
  }

  listDesignations = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = this.getContext(req);
      const query = validateListDesignationsQuery(req.query as Record<string, unknown>);
      const result = await this.service.listDesignations(tenantId, companyId, query);
      res.json({ data: result.items, total: result.total });
    } catch (err) {
      next(err);
    }
  };

  getDesignationById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = this.getContext(req);
      const id = String(req.params.id);
      const item = await this.service.getDesignationById(tenantId, companyId, id);
      res.json({ data: item });
    } catch (err) {
      next(err);
    }
  };

  createDesignation = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = this.getContext(req);
      const actor = this.getActor(req);
      const validated = validateCreateDesignation(req.body);
      const created = await this.service.createDesignation(
        tenantId,
        companyId,
        validated,
        actor,
      );
      res.status(201).json({ data: created });
    } catch (err) {
      next(err);
    }
  };

  updateDesignation = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = this.getContext(req);
      const actor = this.getActor(req);
      const id = String(req.params.id);
      const validated = validateUpdateDesignation(req.body);
      const updated = await this.service.updateDesignation(
        tenantId,
        companyId,
        id,
        validated,
        actor,
      );
      res.json({ data: updated });
    } catch (err) {
      next(err);
    }
  };

  setDesignationStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = this.getContext(req);
      const actor = this.getActor(req);
      const id = String(req.params.id);
      const { status } = validateSetDesignationStatus(req.body);
      const updated = await this.service.setStatus(
        tenantId,
        companyId,
        id,
        status,
        actor,
      );
      res.json({ data: updated });
    } catch (err) {
      next(err);
    }
  };

  deactivateDesignation = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = this.getContext(req);
      const actor = this.getActor(req);
      const id = String(req.params.id);
      const result = await this.service.deactivateDesignation(
        tenantId,
        companyId,
        id,
        actor,
      );
      res.json({
        data: result.designation,
        affectedEmployeeCount: result.affectedEmployeeCount,
        message:
          result.affectedEmployeeCount > 0
            ? `Designation deactivated. ${result.affectedEmployeeCount} active employee(s) currently keep this designation historically.`
            : 'Designation deactivated successfully.',
      });
    } catch (err) {
      next(err);
    }
  };

  reactivateDesignation = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = this.getContext(req);
      const actor = this.getActor(req);
      const id = String(req.params.id);
      const updated = await this.service.reactivateDesignation(
        tenantId,
        companyId,
        id,
        actor,
      );
      res.json({
        data: updated,
        message: 'Designation reactivated successfully.',
      });
    } catch (err) {
      next(err);
    }
  };
}

export const designationController = new DesignationController();
