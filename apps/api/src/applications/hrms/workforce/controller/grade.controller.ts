import type { Request, Response, NextFunction } from 'express';
import { GradeService } from '../service/grade.service.js';
import { AppError } from '../../../../app/errors/AppError.js';
import {
  validateCreateGrade,
  validateUpdateGrade,
  validateListGradesFilter,
} from '../validation/grade.schema.js';
import type { GradeStatus } from '../types/grade.types.js';

export class GradeController {
  constructor(private readonly service: GradeService = new GradeService()) {}

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

  listGrades = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = this.getContext(req);
      const filter = validateListGradesFilter(req.query as Record<string, unknown>);
      const result = await this.service.listGrades(tenantId, companyId, filter);
      res.json({ data: result.items, total: result.total });
    } catch (err) {
      next(err);
    }
  };

  getGradeById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = this.getContext(req);
      const id = String(req.params.id);
      const item = await this.service.getGradeById(tenantId, companyId, id);
      res.json({ data: item });
    } catch (err) {
      next(err);
    }
  };

  createGrade = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = this.getContext(req);
      const actor = this.getActor(req);
      const validated = validateCreateGrade(req.body);
      const created = await this.service.createGrade(
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

  updateGrade = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = this.getContext(req);
      const actor = this.getActor(req);
      const id = String(req.params.id);
      const validated = validateUpdateGrade(req.body);
      const updated = await this.service.updateGrade(
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

  setGradeStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = this.getContext(req);
      const actor = this.getActor(req);
      const id = String(req.params.id);
      const status = req.body?.status as GradeStatus;

      if (status !== 'active' && status !== 'inactive') {
        throw new AppError('Status must be either "active" or "inactive"', 400, 'VALIDATION_ERROR');
      }

      const result = await this.service.setGradeStatus(tenantId, companyId, id, status, actor);
      res.json({
        data: result.data,
        affectedEmployeeCount: result.affectedEmployeeCount,
        affectedDesignationCount: result.affectedDesignationCount,
        message: result.message,
      });
    } catch (err) {
      next(err);
    }
  };

  deactivateGrade = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = this.getContext(req);
      const actor = this.getActor(req);
      const id = String(req.params.id);
      const result = await this.service.deactivateGrade(
        tenantId,
        companyId,
        id,
        actor,
      );
      res.json({
        data: result.data,
        affectedEmployeeCount: result.affectedEmployeeCount,
        affectedDesignationCount: result.affectedDesignationCount,
        message: result.message,
      });
    } catch (err) {
      next(err);
    }
  };

  reactivateGrade = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = this.getContext(req);
      const actor = this.getActor(req);
      const id = String(req.params.id);
      const result = await this.service.reactivateGrade(
        tenantId,
        companyId,
        id,
        actor,
      );
      res.json({
        data: result.data,
        affectedEmployeeCount: result.affectedEmployeeCount,
        affectedDesignationCount: result.affectedDesignationCount,
        message: result.message,
      });
    } catch (err) {
      next(err);
    }
  };
}

export const gradeController = new GradeController();
