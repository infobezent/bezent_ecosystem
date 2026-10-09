import type { Request, Response, NextFunction } from 'express';
import { planService, PlanService } from '../service/plan.service.js';
import {
  validateCreatePlan,
  validateUpdatePlan,
  validateCreatePlanPrice,
  validateUpdatePlanPrice,
  parsePlanFilter,
} from '../validation/plan.schema.js';

export class PlanController {
  constructor(private readonly service: PlanService = planService) {}

  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const filter = parsePlanFilter(req.query as Record<string, unknown>);
      const plans = await this.service.listPlans(filter);
      res.json({
        data: plans,
        total: plans.length,
      });
    } catch (err) {
      next(err);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const plan = await this.service.getPlanById(String(req.params.id));
      res.json({ data: plan });
    } catch (err) {
      next(err);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dto = validateCreatePlan(req.body);
      const actor = req.user ? { id: req.user.id, email: req.user.email } : undefined;
      const created = await this.service.createPlan(dto, actor);
      res.status(201).json({ data: created });
    } catch (err) {
      next(err);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dto = validateUpdatePlan(req.body);
      const actor = req.user ? { id: req.user.id, email: req.user.email } : undefined;
      const updated = await this.service.updatePlan(String(req.params.id), dto, actor);
      res.json({ data: updated });
    } catch (err) {
      next(err);
    }
  };

  addPrice = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dto = validateCreatePlanPrice(req.body);
      const actor = req.user ? { id: req.user.id, email: req.user.email } : undefined;
      const price = await this.service.addPrice(String(req.params.id), dto, actor);
      res.status(201).json({ data: price });
    } catch (err) {
      next(err);
    }
  };

  updatePrice = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dto = validateUpdatePlanPrice(req.body);
      const actor = req.user ? { id: req.user.id, email: req.user.email } : undefined;
      const price = await this.service.updatePrice(String(req.params.priceId), dto, actor);
      res.json({ data: price });
    } catch (err) {
      next(err);
    }
  };
}

export const planController = new PlanController();
