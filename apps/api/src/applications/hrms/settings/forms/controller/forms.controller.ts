import type { Request, Response, NextFunction } from 'express';
import { FormsService } from '../service/forms.service.js';
import { AppError } from '../../../../../app/errors/AppError.js';
import type { CompanyContext } from '../../../../../platform/access/types/access.types.js';

function requireContext(req: Request): CompanyContext {
  if (!req.companyContext) {
    throw new AppError('Context not resolved', 400, 'CONTEXT_MISSING');
  }
  return req.companyContext;
}

export class FormsController {
  constructor(private readonly service = new FormsService()) {}

  listForms = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = requireContext(req);
      res.json({ data: await this.service.listForms(tenantId, companyId) });
    } catch (err) {
      next(err);
    }
  };

  createForm = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = requireContext(req);
      const { name, description } = req.body ?? {};
      const form = await this.service.createForm(tenantId, companyId, name, description);
      res.status(201).json({ data: form });
    } catch (err) {
      next(err);
    }
  };

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

  publishForm = async (req: Request<{ formKey: string }>, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = requireContext(req);
      const user = (req as any).user;
      const result = await this.service.publishForm(
        tenantId,
        companyId,
        req.params.formKey,
        user ? { name: user.name, email: user.email } : undefined,
      );
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  };

  getFormVersions = async (
    req: Request<{ formKey: string }>,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const { tenantId, companyId } = requireContext(req);
      const versions = await this.service.getFormVersions(tenantId, companyId, req.params.formKey);
      res.json({ data: versions });
    } catch (err) {
      next(err);
    }
  };
}
