import type { Request, Response, NextFunction } from 'express';
import { dashboardService, DashboardService } from '../service/dashboard.service.js';

export class DashboardController {
  constructor(private readonly service: DashboardService = dashboardService) {}

  getOverview = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const overview = await this.service.getOverview();
      res.status(200).json({ data: overview });
    } catch (err) {
      next(err);
    }
  };
}

export const dashboardController = new DashboardController();
