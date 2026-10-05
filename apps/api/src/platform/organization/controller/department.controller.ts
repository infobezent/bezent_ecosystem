import type { Request, Response, NextFunction } from 'express';
import { DepartmentService, departmentService } from '../service/department.service.js';
import { AppError } from '../../../app/errors/AppError.js';
import {
  validateCreateDepartment,
  validateUpdateDepartment,
  validateSetDepartmentStatus,
} from '../validation/department.schema.js';

export class DepartmentController {
  constructor(private readonly service: DepartmentService = departmentService) {}

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

  listDepartments = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = this.getContext(req);
      const status = req.query.status as 'active' | 'inactive' | 'all' | undefined;
      const businessUnitId = req.query.businessUnitId as string | undefined;
      const divisionId = req.query.divisionId as string | undefined;
      const parentDepartmentId = req.query.parentDepartmentId as string | undefined;
      const search = req.query.search as string | undefined;

      const items = await this.service.listDepartments(tenantId, companyId, {
        status,
        businessUnitId,
        divisionId,
        parentDepartmentId,
        search,
      });

      res.json({ data: items });
    } catch (err) {
      next(err);
    }
  };

  getDepartmentById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = this.getContext(req);
      const id = String(req.params.id);
      const item = await this.service.getDepartmentById(tenantId, companyId, id);
      res.json({ data: item });
    } catch (err) {
      next(err);
    }
  };

  createDepartment = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = this.getContext(req);
      const actor = this.getActor(req);
      const validated = validateCreateDepartment(req.body);
      const created = await this.service.createDepartment(tenantId, companyId, validated, actor);
      res.status(201).json({ data: created });
    } catch (err) {
      next(err);
    }
  };

  updateDepartment = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = this.getContext(req);
      const actor = this.getActor(req);
      const id = String(req.params.id);
      const validated = validateUpdateDepartment(req.body);
      const updated = await this.service.updateDepartment(
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

  setDepartmentStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = this.getContext(req);
      const actor = this.getActor(req);
      const id = String(req.params.id);
      const { status } = validateSetDepartmentStatus(req.body);
      const updated = await this.service.setDepartmentStatus(
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

  deactivateDepartment = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = this.getContext(req);
      const actor = this.getActor(req);
      const id = String(req.params.id);
      const updated = await this.service.setDepartmentStatus(
        tenantId,
        companyId,
        id,
        'inactive',
        actor,
      );
      res.json({ data: updated });
    } catch (err) {
      next(err);
    }
  };

  reactivateDepartment = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = this.getContext(req);
      const actor = this.getActor(req);
      const id = String(req.params.id);
      const updated = await this.service.setDepartmentStatus(
        tenantId,
        companyId,
        id,
        'active',
        actor,
      );
      res.json({ data: updated });
    } catch (err) {
      next(err);
    }
  };
}

export const departmentController = new DepartmentController();
