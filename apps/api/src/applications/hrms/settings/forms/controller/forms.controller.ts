import type { Request, Response, NextFunction } from 'express';
import { FormsService } from '../service/forms.service.js';
import { AppError } from '../../../../../app/errors/AppError.js';
import type { DevContext } from '../../../../../platform/context/devContext.js';

function requireContext(req: Request): DevContext {
  if (!req.devContext) {
    throw new AppError('Context not resolved', 400, 'CONTEXT_MISSING');
  }
  return req.devContext;
}

export class FormsController {
  constructor(private readonly service = new FormsService()) {}

  getResolvedForm = async (
    req: Request<{ formKey: string }>,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const { tenantId, companyId } = requireContext(req);
      const form = await this.service.getResolvedForm(tenantId, companyId, req.params.formKey);
      res.json({ data: form });
    } catch (err) {
      next(err);
    }
  };

  getOverrides = async (req: Request<{ formKey: string }>, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = requireContext(req);
      const overrides = await this.service.getOverrides(tenantId, companyId, req.params.formKey);
      res.json({ data: overrides });
    } catch (err) {
      next(err);
    }
  };

  updateOverrides = async (
    req: Request<{ formKey: string }>,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const { tenantId, companyId } = requireContext(req);
      const form = await this.service.updateOverrides(
        tenantId,
        companyId,
        req.params.formKey,
        req.body,
      );
      res.json({ data: form });
    } catch (err) {
      next(err);
    }
  };

  saveFormDefinition = async (
    req: Request<{ formKey: string }>,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const { tenantId, companyId } = requireContext(req);
      const form = await this.service.saveFormDefinition(
        tenantId,
        companyId,
        req.params.formKey,
        req.body,
      );
      res.json({ data: form });
    } catch (err) {
      next(err);
    }
  };
}
