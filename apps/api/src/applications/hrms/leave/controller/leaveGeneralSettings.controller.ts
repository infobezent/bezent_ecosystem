import type { Request, Response, NextFunction } from 'express';
import {
  LeaveGeneralSettingsService,
  leaveGeneralSettingsService,
} from '../service/leaveGeneralSettings.service.js';

export class LeaveGeneralSettingsController {
  constructor(
    private readonly service: LeaveGeneralSettingsService = leaveGeneralSettingsService,
  ) {}

  getSettings = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, companyId } = req.companyContext!;
      const data = await this.service.getSettings(tenantId, companyId);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  };

  updateSettings = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, companyId } = req.companyContext!;
      const userId = req.user?.id || 'system';
      const data = await this.service.updateSettings(tenantId, companyId, req.body, userId);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  };

  getVersionHistory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, companyId } = req.companyContext!;
      const data = await this.service.getVersionHistory(tenantId, companyId);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  };
}

export const leaveGeneralSettingsController = new LeaveGeneralSettingsController();
