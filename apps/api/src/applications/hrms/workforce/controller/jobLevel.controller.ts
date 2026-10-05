import type { Request, Response, NextFunction } from 'express';
import { JobLevelService } from '../service/jobLevel.service.js';
import { AppError } from '../../../../app/errors/AppError.js';
import {
  validateCreateJobLevel,
  validateUpdateJobLevel,
  validateListJobLevelsFilter,
} from '../validation/jobLevel.schema.js';
import type { JobLevelStatus } from '../types/jobLevel.types.js';

export class JobLevelController {
  constructor(private readonly service: JobLevelService = new JobLevelService()) {}

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

  listJobLevels = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = this.getContext(req);
      const filter = validateListJobLevelsFilter(req.query as Record<string, unknown>);
      const result = await this.service.listJobLevels(tenantId, companyId, filter);
      res.json({ data: result.items, total: result.total });
    } catch (err) {
      next(err);
    }
  };

  getJobLevelById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = this.getContext(req);
      const id = String(req.params.id);
      const item = await this.service.getJobLevelById(tenantId, companyId, id);
      res.json({ data: item });
    } catch (err) {
      next(err);
    }
  };

  createJobLevel = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = this.getContext(req);
      const actor = this.getActor(req);
      const validated = validateCreateJobLevel(req.body);
      const created = await this.service.createJobLevel(
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

  updateJobLevel = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = this.getContext(req);
      const actor = this.getActor(req);
      const id = String(req.params.id);
      const validated = validateUpdateJobLevel(req.body);
      const updated = await this.service.updateJobLevel(
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

  setJobLevelStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = this.getContext(req);
      const actor = this.getActor(req);
      const id = String(req.params.id);
      const status = req.body?.status as JobLevelStatus;

      if (status !== 'active' && status !== 'inactive') {
        throw new AppError('Status must be either "active" or "inactive"', 400, 'VALIDATION_ERROR');
      }

      const result = await this.service.setJobLevelStatus(tenantId, companyId, id, status, actor);
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

  deactivateJobLevel = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = this.getContext(req);
      const actor = this.getActor(req);
      const id = String(req.params.id);
      const result = await this.service.deactivateJobLevel(
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

  reactivateJobLevel = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = this.getContext(req);
      const actor = this.getActor(req);
      const id = String(req.params.id);
      const result = await this.service.reactivateJobLevel(
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

export const jobLevelController = new JobLevelController();
