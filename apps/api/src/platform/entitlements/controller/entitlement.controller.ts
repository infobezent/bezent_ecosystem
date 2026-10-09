import type { Request, Response, NextFunction } from 'express';
import {
  effectiveEntitlementService,
  EffectiveEntitlementService,
} from '../service/effectiveEntitlement.service.js';
import {
  validateCreateOverride,
  validateRevokeOverride,
} from '../validation/entitlement.schema.js';
import type { ApplicationCode } from '../../plans/types/plan.types.js';

export class EntitlementController {
  constructor(private readonly service: EffectiveEntitlementService = effectiveEntitlementService) {}

  getEffective = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = String(req.params.tenantId);
      const appCode = (req.query.applicationCode as ApplicationCode) || 'hrms';
      const companyId = req.query.companyId ? String(req.query.companyId) : null;

      const result = await this.service.resolveEffectiveEntitlements(tenantId, appCode, companyId);
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  };

  listOverrides = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = String(req.params.tenantId);
      const overrides = await this.service.listOverrides(tenantId);
      res.json({ data: overrides, total: overrides.length });
    } catch (err) {
      next(err);
    }
  };

  createOverride = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = String(req.params.tenantId);
      const dto = validateCreateOverride({ ...req.body, tenantId });
      const actor = req.user ? { id: req.user.id, email: req.user.email } : undefined;
      const created = await this.service.createOverride(dto, actor);
      res.status(201).json({ data: created });
    } catch (err) {
      next(err);
    }
  };

  revokeOverride = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const overrideId = String(req.params.overrideId);
      const dto = validateRevokeOverride(req.body);
      const actor = req.user ? { id: req.user.id, email: req.user.email } : undefined;
      const revoked = await this.service.revokeOverride(overrideId, dto, actor);
      res.json({ data: revoked });
    } catch (err) {
      next(err);
    }
  };

  reconcile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = String(req.params.tenantId);
      const appCode = (req.query.applicationCode as ApplicationCode) || 'hrms';
      const report = await this.service.reconcile(tenantId, appCode);
      res.json({ data: report });
    } catch (err) {
      next(err);
    }
  };
}

export const entitlementController = new EntitlementController();
