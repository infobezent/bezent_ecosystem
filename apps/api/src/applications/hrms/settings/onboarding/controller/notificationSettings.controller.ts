import type { Request, Response, NextFunction } from 'express';
import { NotificationSettingsService } from '../service/notificationSettings.service.js';
import { AppError } from '../../../../../app/errors/AppError.js';

export class NotificationSettingsController {
  constructor(private readonly service = new NotificationSettingsService()) {}

  private getTenantAndCompany(req: Request): { tenantId: string; companyId: string } {
    const tenantId =
      req.companyContext?.tenantId ||
      (req.headers['x-tenant-id'] as string) ||
      (req.headers['x-company-id'] as string) ||
      '';
    const companyId =
      req.companyContext?.companyId ||
      (req.headers['x-company-id'] as string) ||
      (req.headers['x-tenant-id'] as string) ||
      '';

    if (!tenantId || !companyId) {
      throw new AppError('Tenant or company context is missing', 400, 'TENANT_OR_COMPANY_MISSING');
    }
    return { tenantId, companyId };
  }

  // Overview
  getOverview = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = this.getTenantAndCompany(req);
      const data = await this.service.getOverview(tenantId, companyId);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  };

  // Event Notification Settings
  getSettings = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = this.getTenantAndCompany(req);
      const data = await this.service.getSettings(tenantId, companyId);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  };

  updateSettings = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = this.getTenantAndCompany(req);
      const data = await this.service.updateSettings(
        tenantId,
        companyId,
        req.body.configs || req.body,
      );
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  };

  // Reminder Rules
  listReminderRules = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = this.getTenantAndCompany(req);
      const data = await this.service.listReminderRules(tenantId, companyId);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  };

  createReminderRule = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = this.getTenantAndCompany(req);
      const data = await this.service.createReminderRule(tenantId, companyId, req.body);
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  };

  updateReminderRule = async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = this.getTenantAndCompany(req);
      const data = await this.service.updateReminderRule(
        tenantId,
        companyId,
        req.params.id,
        req.body,
      );
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  };

  deleteReminderRule = async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = this.getTenantAndCompany(req);
      await this.service.deleteReminderRule(tenantId, companyId, req.params.id);
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  };

  evaluateReminderRules = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = this.getTenantAndCompany(req);
      const data = await this.service.evaluateReminderRules(tenantId, companyId);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  };

  // Email Templates
  listEmailTemplates = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = this.getTenantAndCompany(req);
      const data = await this.service.listEmailTemplates(tenantId, companyId);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  };

  getEmailTemplate = async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = this.getTenantAndCompany(req);
      const data = await this.service.getEmailTemplateById(tenantId, companyId, req.params.id);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  };

  createEmailTemplate = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = this.getTenantAndCompany(req);
      const data = await this.service.createEmailTemplate(tenantId, companyId, req.body);
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  };

  updateEmailTemplate = async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = this.getTenantAndCompany(req);
      const data = await this.service.updateEmailTemplate(
        tenantId,
        companyId,
        req.params.id,
        req.body,
      );
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  };

  duplicateEmailTemplate = async (
    req: Request<{ id: string }>,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const { tenantId, companyId } = this.getTenantAndCompany(req);
      const data = await this.service.duplicateEmailTemplate(tenantId, companyId, req.params.id);
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  };

  deleteEmailTemplate = async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = this.getTenantAndCompany(req);
      await this.service.deleteEmailTemplate(tenantId, companyId, req.params.id);
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  };

  previewTemplate = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = this.getTenantAndCompany(req);
      const data = await this.service.previewTemplate(tenantId, companyId, req.body);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  };

  sendTestEmail = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = this.getTenantAndCompany(req);
      const data = await this.service.sendTestEmail(tenantId, companyId, req.body);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  };

  // Notification History
  listHistory = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = this.getTenantAndCompany(req);
      const filters = {
        eventKey: req.query.eventKey as string | undefined,
        channel: req.query.channel as any,
        status: req.query.status as any,
        search: req.query.search as string | undefined,
        page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
        pageSize: req.query.pageSize ? parseInt(req.query.pageSize as string, 10) : undefined,
      };
      const data = await this.service.listHistory(tenantId, companyId, filters);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  };

  getHistoryItem = async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = this.getTenantAndCompany(req);
      const data = await this.service.getHistoryItemById(tenantId, companyId, req.params.id);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  };

  retryNotification = async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = this.getTenantAndCompany(req);
      const data = await this.service.retryNotification(tenantId, companyId, req.params.id);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  };
}
