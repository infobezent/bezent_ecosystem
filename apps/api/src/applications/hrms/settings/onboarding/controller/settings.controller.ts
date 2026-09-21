import type { Request, Response, NextFunction } from 'express';
import { OnboardingSettingsService } from '../service/settings.service.js';
import {
  validateUpdateGeneralSettings,
  validateUpdateStageConfig,
  validateUpdateFieldConfig,
  validateCreateDocumentRequirement,
  validateUpdateDocumentRequirement,
  validateCreateChecklistTemplate,
  validateUpdateChecklistTemplate,
  validateUpdateConversionSettings,
} from '../validation/settings.schema.js';
import { AppError } from '../../../../../app/errors/AppError.js';

export class OnboardingSettingsController {
  constructor(private readonly service = new OnboardingSettingsService()) {}

  private getContext(req: Request) {
    const devContext = req.devContext;
    if (!devContext) {
      throw new AppError('Context not resolved', 400, 'CONTEXT_MISSING');
    }
    return devContext;
  }

  // ==================== Aggregate ====================

  getAggregateSettings = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = this.getContext(req);
      const settings = await this.service.getAggregateSettings(tenantId, companyId);
      res.json({ data: settings });
    } catch (err) {
      next(err);
    }
  };

  initializeSettings = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = this.getContext(req);
      await this.service.initializeCompanySettings(tenantId, companyId);
      const settings = await this.service.getAggregateSettings(tenantId, companyId);
      res.status(200).json({
        message: 'Onboarding settings initialized successfully',
        data: settings,
      });
    } catch (err) {
      next(err);
    }
  };

  // ==================== General ====================

  getGeneralSettings = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = this.getContext(req);
      const settings = await this.service.getGeneralSettings(tenantId, companyId);
      res.json({ data: settings });
    } catch (err) {
      next(err);
    }
  };

  updateGeneralSettings = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = this.getContext(req);
      const dto = validateUpdateGeneralSettings(req.body);
      const updated = await this.service.updateGeneralSettings(tenantId, companyId, dto);
      res.json({ data: updated });
    } catch (err) {
      next(err);
    }
  };

  // ==================== Stages ====================

  getStageConfigs = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = this.getContext(req);
      const stages = await this.service.getStageConfigs(tenantId, companyId);
      res.json({ data: stages });
    } catch (err) {
      next(err);
    }
  };

  updateStageConfig = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = this.getContext(req);
      const stageKey = req.params.stageKey as string;
      const dto = validateUpdateStageConfig(stageKey, req.body);
      const updated = await this.service.updateStageConfig(tenantId, companyId, stageKey, dto);
      res.json({ data: updated });
    } catch (err) {
      next(err);
    }
  };

  // ==================== Fields ====================

  getFieldConfigs = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = this.getContext(req);
      const fields = await this.service.getFieldConfigs(tenantId, companyId);
      res.json({ data: fields });
    } catch (err) {
      next(err);
    }
  };

  updateFieldConfig = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = this.getContext(req);
      const fieldKey = req.params.fieldKey as string;
      const dto = validateUpdateFieldConfig(fieldKey, req.body);
      const updated = await this.service.updateFieldConfig(tenantId, companyId, fieldKey, dto);
      res.json({ data: updated });
    } catch (err) {
      next(err);
    }
  };

  // ==================== Documents ====================

  getDocumentRequirements = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = this.getContext(req);
      const docs = await this.service.getDocumentRequirements(tenantId, companyId);
      res.json({ data: docs });
    } catch (err) {
      next(err);
    }
  };

  createDocumentRequirement = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = this.getContext(req);
      const dto = validateCreateDocumentRequirement(req.body);
      const created = await this.service.createDocumentRequirement(tenantId, companyId, dto);
      res.status(201).json({ data: created });
    } catch (err) {
      next(err);
    }
  };

  updateDocumentRequirement = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = this.getContext(req);
      const id = req.params.id as string;
      const dto = validateUpdateDocumentRequirement(req.body);
      const updated = await this.service.updateDocumentRequirement(tenantId, companyId, id, dto);
      res.json({ data: updated });
    } catch (err) {
      next(err);
    }
  };

  deleteDocumentRequirement = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = this.getContext(req);
      const id = req.params.id as string;
      await this.service.deleteDocumentRequirement(tenantId, companyId, id);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  };

  // ==================== Checklists ====================

  getChecklistTemplates = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = this.getContext(req);
      const stageKey = typeof req.query.stageKey === 'string' ? req.query.stageKey : undefined;
      const checklists = await this.service.getChecklistTemplates(tenantId, companyId, stageKey);
      res.json({ data: checklists });
    } catch (err) {
      next(err);
    }
  };

  createChecklistTemplate = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = this.getContext(req);
      const dto = validateCreateChecklistTemplate(req.body);
      const created = await this.service.createChecklistTemplate(tenantId, companyId, dto);
      res.status(201).json({ data: created });
    } catch (err) {
      next(err);
    }
  };

  updateChecklistTemplate = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = this.getContext(req);
      const id = req.params.id as string;
      const dto = validateUpdateChecklistTemplate(req.body);
      const updated = await this.service.updateChecklistTemplate(tenantId, companyId, id, dto);
      res.json({ data: updated });
    } catch (err) {
      next(err);
    }
  };

  deleteChecklistTemplate = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = this.getContext(req);
      const id = req.params.id as string;
      await this.service.deleteChecklistTemplate(tenantId, companyId, id);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  };

  // ==================== Conversion ====================

  getConversionSettings = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = this.getContext(req);
      const conversion = await this.service.getConversionSettings(tenantId, companyId);
      res.json({ data: conversion });
    } catch (err) {
      next(err);
    }
  };

  updateConversionSettings = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = this.getContext(req);
      const dto = validateUpdateConversionSettings(req.body);
      const updated = await this.service.updateConversionSettings(tenantId, companyId, dto);
      res.json({ data: updated });
    } catch (err) {
      next(err);
    }
  };
}
