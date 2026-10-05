import type { Request, Response, NextFunction } from 'express';
import { WorkLocationService } from '../service/workLocation.service.js';
import { AppError } from '../../../app/errors/AppError.js';
import {
  validateCreateWorkLocation,
  validateUpdateWorkLocation,
} from '../validation/workLocation.schema.js';
import type { LocationType, WorkLocationStatus } from '../types/workLocation.types.js';

export class WorkLocationController {
  constructor(private readonly service: WorkLocationService = new WorkLocationService()) {}

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

  listWorkLocations = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = this.getContext(req);
      const statusParam = req.query.status as string | undefined;
      const typeParam = req.query.locationType as string | undefined;
      const searchParam = req.query.search as string | undefined;

      const result = await this.service.listWorkLocations(tenantId, companyId, {
        status: statusParam as 'active' | 'inactive' | 'all' | undefined,
        locationType: typeParam as LocationType | 'all' | undefined,
        search: searchParam,
      });

      res.json({ data: result.items, total: result.total });
    } catch (err) {
      next(err);
    }
  };

  getWorkLocationById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = this.getContext(req);
      const id = String(req.params.id);
      const item = await this.service.getWorkLocationById(tenantId, companyId, id);
      res.json({ data: item });
    } catch (err) {
      next(err);
    }
  };

  createWorkLocation = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = this.getContext(req);
      const actor = this.getActor(req);
      const validated = validateCreateWorkLocation(req.body);
      const created = await this.service.createWorkLocation(
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

  updateWorkLocation = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = this.getContext(req);
      const actor = this.getActor(req);
      const id = String(req.params.id);
      const validated = validateUpdateWorkLocation(req.body);
      const updated = await this.service.updateWorkLocation(
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

  setWorkLocationStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = this.getContext(req);
      const actor = this.getActor(req);
      const id = String(req.params.id);
      const status = req.body?.status as WorkLocationStatus;

      if (status !== 'active' && status !== 'inactive') {
        throw new AppError('Status must be either "active" or "inactive"', 400, 'VALIDATION_ERROR');
      }

      if (status === 'inactive') {
        const result = await this.service.deactivateWorkLocation(tenantId, companyId, id, actor);
        res.json({
          data: result.data,
          affectedEmployeeCount: result.affectedEmployeeCount,
          message: result.message,
        });
      } else {
        const result = await this.service.reactivateWorkLocation(tenantId, companyId, id, actor);
        res.json({
          data: result.data,
          affectedEmployeeCount: result.affectedEmployeeCount,
          message: result.message,
        });
      }
    } catch (err) {
      next(err);
    }
  };

  deactivateWorkLocation = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = this.getContext(req);
      const actor = this.getActor(req);
      const id = String(req.params.id);
      const result = await this.service.deactivateWorkLocation(
        tenantId,
        companyId,
        id,
        actor,
      );
      res.json({
        data: result.data,
        affectedEmployeeCount: result.affectedEmployeeCount,
        message: result.message,
      });
    } catch (err) {
      next(err);
    }
  };

  reactivateWorkLocation = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = this.getContext(req);
      const actor = this.getActor(req);
      const id = String(req.params.id);
      const result = await this.service.reactivateWorkLocation(
        tenantId,
        companyId,
        id,
        actor,
      );
      res.json({
        data: result.data,
        affectedEmployeeCount: result.affectedEmployeeCount,
        message: result.message,
      });
    } catch (err) {
      next(err);
    }
  };
}

export const workLocationController = new WorkLocationController();
