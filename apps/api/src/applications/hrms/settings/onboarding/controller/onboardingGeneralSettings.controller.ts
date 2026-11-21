import type { Request, Response, NextFunction } from 'express';
import { OnboardingGeneralSettingsService } from '../service/onboardingGeneralSettings.service.js';
import { BadRequestError } from '../../../../../app/errors/AppError.js';

export class OnboardingGeneralSettingsController {
  constructor(
    private readonly service = new OnboardingGeneralSettingsService(),
  ) {}

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

  private getActorUserId(req: Request): string | undefined {
    const user = (req as unknown as { user?: { id?: string } }).user;
    return user?.id;
  }

  /**
   * Retrieves the current general settings configuration
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
   * Updates general settings configuration
   */
  updateConfig = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, companyId } = this.getTenantAndCompany(req);
      const actorUserId = this.getActorUserId(req);
      const data = await this.service.updateConfig(
        tenantId,
        companyId,
        req.body,
        actorUserId,
      );
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  };

  /**
   * Resets general settings configuration to system defaults
   */
  resetConfig = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, companyId } = this.getTenantAndCompany(req);
      const actorUserId = this.getActorUserId(req);
      const data = await this.service.resetConfig(tenantId, companyId, actorUserId);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  };
}
