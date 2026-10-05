import type { Request, Response, NextFunction } from 'express';
import { governanceService, GovernanceService } from '../service/governance.service.js';

export class GovernanceController {
  constructor(private readonly service: GovernanceService = governanceService) {}

  getSummary = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const summary = this.service.getSummary();
      res.status(200).json({ data: summary });
    } catch (err) {
      next(err);
    }
  };
}

export const governanceController = new GovernanceController();
