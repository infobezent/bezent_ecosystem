import type { Request, Response, NextFunction } from 'express';
import { EmployeeConversionService, type ConversionActor } from '../service/employeeConversion.service.js';
import { BadRequestError } from '../../../../../app/errors/AppError.js';

export class EmployeeConversionController {
  constructor(private readonly service = new EmployeeConversionService()) {}

  private getTenantAndCompany(req: Request): { tenantId: string; companyId: string } {
    const companyContext = req.companyContext;
    const tenantId =
      companyContext?.tenantId ||
      (req.headers['x-tenant-id'] as string) ||
      (req as unknown as { tenantId?: string }).tenantId;
    const companyId =
      companyContext?.companyId ||
      (req.headers['x-company-id'] as string) ||
      (req as unknown as { companyId?: string }).companyId;

    if (!tenantId || !companyId) {
      throw new BadRequestError(
        'Tenant ID and Company ID are required',
        'TENANT_OR_COMPANY_MISSING',
      );
    }

    return { tenantId, companyId };
  }

  private getActor(req: Request): ConversionActor {
    const user = (req as unknown as { user?: { id?: string; name?: string; role?: string } }).user;
    return {
      userId: user?.id,
      name: user?.name || 'Authorized HR User',
      role: user?.role || 'company_admin',
    };
  }

  /**
   * Retrieves the current employee conversion configuration
   */
  getConfig = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, companyId } = this.getTenantAndCompany(req);
      const data = await this.service.getConfig(tenantId, companyId);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  };

  /**
   * Updates employee conversion configuration
   */
  updateConfig = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, companyId } = this.getTenantAndCompany(req);
      const actor = this.getActor(req);
      const data = await this.service.updateConfig(tenantId, companyId, req.body, actor.userId);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  };

  /**
   * Resets employee conversion configuration to defaults
   */
  resetConfig = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, companyId } = this.getTenantAndCompany(req);
      const data = await this.service.resetConfig(tenantId, companyId);
      res.json({ success: true, data, message: 'Configuration reset to defaults successfully' });
    } catch (err) {
      next(err);
    }
  };

  /**
   * Evaluates conversion readiness for an onboarding case
   */
  previewConversion = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, companyId } = this.getTenantAndCompany(req);
      const caseId = String(req.params.caseId);
      const data = await this.service.previewConversion(tenantId, companyId, caseId);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  };

  /**
   * Executes candidate to employee conversion
   */
  executeConversion = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, companyId } = this.getTenantAndCompany(req);
      const caseId = String(req.params.caseId);
      const actor = this.getActor(req);
      const data = await this.service.executeConversion(tenantId, companyId, caseId, req.body, actor);
      res.status(201).json({ success: true, data, message: 'Candidate converted to employee successfully' });
    } catch (err) {
      next(err);
    }
  };

  /**
   * Retries failed post-conversion actions
   */
  retryConversion = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, companyId } = this.getTenantAndCompany(req);
      const caseId = String(req.params.caseId);
      const actor = this.getActor(req);
      const data = await this.service.retryConversion(tenantId, companyId, caseId, actor);
      res.json({ success: true, data, message: 'Post-conversion actions retried successfully' });
    } catch (err) {
      next(err);
    }
  };
}
