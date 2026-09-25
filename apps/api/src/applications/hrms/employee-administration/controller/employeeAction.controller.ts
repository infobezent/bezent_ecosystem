import type { Request, Response, NextFunction } from 'express';
import { EmployeeActionService } from '../service/employeeAction.service.js';
import { AppError } from '../../../../app/errors/AppError.js';
import type { DevContext } from '../../../../platform/context/devContext.js';

function requireContext(req: Request): DevContext {
  if (!req.devContext) {
    throw new AppError('Context not resolved', 400, 'CONTEXT_MISSING');
  }
  return req.devContext;
}

function requireActionId(req: Request): string {
  const rawId = req.params.actionId;
  const actionId = Array.isArray(rawId) ? rawId[0] : rawId;
  if (!actionId) {
    throw new AppError('Employee action ID is required', 400, 'VALIDATION_ERROR');
  }
  return actionId;
}

/**
 * The acting user is recorded as null until platform authentication supplies
 * an authenticated identity; the development context carries no actor.
 */
const UNAUTHENTICATED_ACTOR = null;

export class EmployeeActionController {
  constructor(private readonly service = new EmployeeActionService()) {}

  listActions = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = requireContext(req);
      const result = await this.service.listActions(
        tenantId,
        companyId,
        req.query as Record<string, unknown>,
      );

      res.json({
        data: result.items,
        pagination: result.pagination,
        counts: result.counts,
      });
    } catch (err) {
      next(err);
    }
  };

  getAction = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = requireContext(req);
      const action = await this.service.getActionDetail(tenantId, companyId, requireActionId(req));

      res.json({
        data: action,
      });
    } catch (err) {
      next(err);
    }
  };

  createAction = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = requireContext(req);
      const created = await this.service.createAction(
        tenantId,
        companyId,
        req.body,
        UNAUTHENTICATED_ACTOR,
      );

      res.status(201).json({
        data: created,
      });
    } catch (err) {
      next(err);
    }
  };

  updateAction = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = requireContext(req);
      const updated = await this.service.updateAction(
        tenantId,
        companyId,
        requireActionId(req),
        req.body,
        UNAUTHENTICATED_ACTOR,
      );

      res.json({
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  };

  cancelAction = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = requireContext(req);
      const cancelled = await this.service.cancelAction(
        tenantId,
        companyId,
        requireActionId(req),
        req.body,
        UNAUTHENTICATED_ACTOR,
      );

      res.json({
        data: cancelled,
      });
    } catch (err) {
      next(err);
    }
  };

  applyAction = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = requireContext(req);
      const applied = await this.service.applyAction(
        tenantId,
        companyId,
        requireActionId(req),
        req.body,
        UNAUTHENTICATED_ACTOR,
      );

      res.json({
        data: applied,
      });
    } catch (err) {
      next(err);
    }
  };
}
