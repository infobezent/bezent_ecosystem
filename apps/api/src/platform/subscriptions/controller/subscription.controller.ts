import type { Request, Response, NextFunction } from 'express';
import { subscriptionService, SubscriptionService } from '../service/subscription.service.js';
import {
  validateCreateSubscription,
  validateUpdateSubscription,
  validateCancelSubscription,
  validateRenewSubscription,
  parseSubscriptionFilter,
} from '../validation/subscription.schema.js';

export class SubscriptionController {
  constructor(private readonly service: SubscriptionService = subscriptionService) {}

  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const filter = parseSubscriptionFilter(req.query as Record<string, unknown>);
      const subs = await this.service.listSubscriptions(filter);
      res.json({
        data: subs,
        total: subs.length,
      });
    } catch (err) {
      next(err);
    }
  };

  listByTenant = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = String(req.params.tenantId);
      const parsed = parseSubscriptionFilter(req.query as Record<string, unknown>);
      const filter = { ...parsed, tenantId };
      const subs = await this.service.listSubscriptions(filter);
      res.json({
        data: subs,
        total: subs.length,
      });
    } catch (err) {
      next(err);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const sub = await this.service.getSubscriptionById(String(req.params.id));
      res.json({ data: sub });
    } catch (err) {
      next(err);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = req.params.tenantId ? String(req.params.tenantId) : req.body?.tenantId;
      const dto = validateCreateSubscription({ ...req.body, tenantId });
      const actor = req.user ? { id: req.user.id, email: req.user.email } : undefined;
      const created = await this.service.createSubscription(dto, actor);
      res.status(201).json({ data: created });
    } catch (err) {
      next(err);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dto = validateUpdateSubscription(req.body);
      const actor = req.user ? { id: req.user.id, email: req.user.email } : undefined;
      const updated = await this.service.updateSubscription(String(req.params.id), dto, actor);
      res.json({ data: updated });
    } catch (err) {
      next(err);
    }
  };

  activate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const actor = req.user ? { id: req.user.id, email: req.user.email } : undefined;
      const activated = await this.service.activateSubscription(String(req.params.id), actor);
      res.json({ data: activated });
    } catch (err) {
      next(err);
    }
  };

  renew = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dto = validateRenewSubscription(req.body);
      const actor = req.user ? { id: req.user.id, email: req.user.email } : undefined;
      const renewed = await this.service.renewSubscription(String(req.params.id), dto, actor);
      res.json({ data: renewed });
    } catch (err) {
      next(err);
    }
  };

  cancel = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dto = validateCancelSubscription(req.body);
      const actor = req.user ? { id: req.user.id, email: req.user.email } : undefined;
      const cancelled = await this.service.cancelSubscription(String(req.params.id), dto, actor);
      res.json({ data: cancelled });
    } catch (err) {
      next(err);
    }
  };
}

export const subscriptionController = new SubscriptionController();
