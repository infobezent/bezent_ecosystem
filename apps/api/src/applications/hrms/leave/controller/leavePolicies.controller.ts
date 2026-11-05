import type { Request, Response, NextFunction } from 'express';
import { LeavePoliciesService, leavePoliciesService } from '../service/leavePolicies.service.js';

export class LeavePoliciesController {
  constructor(private readonly service: LeavePoliciesService = leavePoliciesService) {}

  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, companyId } = req.companyContext!;
      const data = await this.service.listLeavePolicies(tenantId, companyId, req.query);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, companyId } = req.companyContext!;
      const id = String(req.params.id);
      const data = await this.service.getLeavePolicyById(tenantId, companyId, id);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, companyId } = req.companyContext!;
      const userId = req.user?.id || 'system';
      const data = await this.service.createLeavePolicy(tenantId, companyId, userId, req.body);
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
      const data = await this.service.updateLeavePolicy(tenantId, companyId, id, userId, req.body);
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
      const { status } = req.body ?? {};
      const data = await this.service.changeStatus(tenantId, companyId, id, userId, status);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  };
}

export const leavePoliciesController = new LeavePoliciesController();
