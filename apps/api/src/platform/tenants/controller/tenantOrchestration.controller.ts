import type { Request, Response, NextFunction } from 'express';
import {
  tenantCreationOrchestrationService,
  TenantCreationOrchestrationService,
} from '../service/tenantOrchestration.service.js';

export class TenantOrchestrationController {
  constructor(
    private readonly service: TenantCreationOrchestrationService = tenantCreationOrchestrationService,
  ) {}

  preflight = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.service.preflight(req.body);
      res.status(200).json({ data: result });
    } catch (err) {
      next(err);
    }
  };

  orchestrate = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const idempotencyKey =
        (req.headers['idempotency-key'] as string) ||
        (req.headers['x-idempotency-key'] as string) ||
        req.body?.idempotencyKey;
      const actor = { id: req.user?.id, email: req.user?.email };
      const result = await this.service.orchestrate(req.body, actor, idempotencyKey);
      const statusCode = result.idempotentReplay ? 200 : 201;
      res.status(statusCode).json({ data: result });
    } catch (err) {
      next(err);
    }
  };
}

export const tenantOrchestrationController = new TenantOrchestrationController();
