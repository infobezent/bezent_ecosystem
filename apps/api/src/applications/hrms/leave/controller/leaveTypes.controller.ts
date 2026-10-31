import type { Request, Response, NextFunction } from 'express';
import { LeaveTypesService, leaveTypesService } from '../service/leaveTypes.service.js';

export class LeaveTypesController {
  constructor(private readonly service: LeaveTypesService = leaveTypesService) {}

  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, companyId } = req.companyContext!;
      const data = await this.service.listLeaveTypes(tenantId, companyId, req.query);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, companyId } = req.companyContext!;
      const id = String(req.params.id);
      const data = await this.service.getLeaveTypeById(tenantId, companyId, id);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, companyId } = req.companyContext!;
      const userId = req.user?.id || 'system';
      const data = await this.service.createLeaveType(tenantId, companyId, userId, req.body);
      res.status(201).json({ data });
    } catch (err) {
      next(err);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, companyId } = req.companyContext!;
      const id = String(req.params.id);
      const userId = req.user?.id || 'system';
      const data = await this.service.updateLeaveType(tenantId, companyId, id, userId, req.body);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  };

  changeStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, companyId } = req.companyContext!;
      const id = String(req.params.id);
      const userId = req.user?.id || 'system';
      const { isActive } = req.body ?? {};
      const data = await this.service.changeStatus(tenantId, companyId, id, userId, isActive);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  };
}

export const leaveTypesController = new LeaveTypesController();
