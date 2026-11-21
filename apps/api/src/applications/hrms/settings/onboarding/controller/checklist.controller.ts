import type { Request, Response, NextFunction } from 'express';
import { ChecklistService } from '../service/checklist.service.js';
import { BadRequestError } from '../../../../../app/errors/AppError.js';

export class ChecklistController {
  constructor(private readonly service = new ChecklistService()) {}

  private getTenantAndCompany(req: Request): { tenantId: string; companyId: string } {
    const tenantId =
      (req.headers['x-tenant-id'] as string) ||
      (req as unknown as { tenantId?: string }).tenantId;
    const companyId =
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

  listTemplates = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, companyId } = this.getTenantAndCompany(req);
      const data = await this.service.listTemplates(tenantId, companyId);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  };

  getTemplate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, companyId } = this.getTenantAndCompany(req);
      const templateId = String(req.params.templateId);
      const data = await this.service.getTemplateById(tenantId, companyId, templateId);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  };

  createTemplate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, companyId } = this.getTenantAndCompany(req);
      const data = await this.service.createTemplate(tenantId, companyId, req.body);
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  };

  updateTemplate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, companyId } = this.getTenantAndCompany(req);
      const templateId = String(req.params.templateId);
      const data = await this.service.updateTemplate(tenantId, companyId, templateId, req.body);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  };

  duplicateTemplate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, companyId } = this.getTenantAndCompany(req);
      const templateId = String(req.params.templateId);
      const data = await this.service.duplicateTemplate(tenantId, companyId, templateId);
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  };

  deleteTemplate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, companyId } = this.getTenantAndCompany(req);
      const templateId = String(req.params.templateId);
      await this.service.deleteTemplate(tenantId, companyId, templateId);
      res.json({ success: true, message: 'Checklist template deleted' });
    } catch (err) {
      next(err);
    }
  };

  saveTasks = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, companyId } = this.getTenantAndCompany(req);
      const templateId = String(req.params.templateId);
      const data = await this.service.saveTasks(tenantId, companyId, templateId, req.body);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  };

  generateCandidateChecklist = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { tenantId, companyId } = this.getTenantAndCompany(req);
      const { caseId, joiningDate, templateId } = req.body;
      const data = await this.service.generateCandidateChecklist(
        tenantId,
        companyId,
        caseId,
        joiningDate,
        templateId,
      );
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  };
}
