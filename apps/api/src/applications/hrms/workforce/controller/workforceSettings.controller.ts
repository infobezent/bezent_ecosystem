import type { Request, Response, NextFunction } from 'express';
import {
  WorkforceSettingsService,
  workforceSettingsService,
} from '../service/workforceSettings.service.js';
import { AppError } from '../../../../app/errors/AppError.js';
import {
  validateUpdateGeneralSettings,
  validateCreateEmploymentType,
  validateUpdateEmploymentType,
  validateUpdateProbationPolicy,
  validateUpdateLifecyclePolicy,
  validateUpdateOffboardingPolicy,
  validateCreateClearanceTemplate,
  validateUpdateClearanceTemplate,
} from '../validation/workforceSettings.schema.js';

export class WorkforceSettingsController {
  constructor(
    private readonly service: WorkforceSettingsService = workforceSettingsService,
  ) {}

  private getContext(req: Request) {
    const ctx = req.companyContext;
    if (!ctx) {
      throw new AppError('Context not resolved', 400, 'CONTEXT_MISSING');
    }
    return ctx;
  }

  // =========================================================================
  // BUNDLE
  // =========================================================================

  getSettingsBundle = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = this.getContext(req);
      const data = await this.service.getSettingsBundle(tenantId, companyId);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  };

  // =========================================================================
  // 1. GENERAL SETTINGS & ID GENERATION
  // =========================================================================

  getGeneralSettings = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = this.getContext(req);
      const data = await this.service.getGeneralSettings(tenantId, companyId);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  };

  updateGeneralSettings = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = this.getContext(req);
      const validated = validateUpdateGeneralSettings(req.body);
      const data = await this.service.updateGeneralSettings(tenantId, companyId, validated);
      res.json({ data, message: 'Workforce general settings updated successfully' });
    } catch (err) {
      next(err);
    }
  };

  previewNextEmployeeId = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = this.getContext(req);
      const data = await this.service.previewNextEmployeeId(tenantId, companyId);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  };

  reserveNextEmployeeId = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = this.getContext(req);
      const data = await this.service.reserveNextEmployeeId(tenantId, companyId);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  };

  // =========================================================================
  // 2. EMPLOYMENT TYPES
  // =========================================================================

  listEmploymentTypes = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = this.getContext(req);
      const activeOnly = req.query.activeOnly === 'true';
      const data = await this.service.listEmploymentTypes(tenantId, companyId, activeOnly);
      res.json({ data, total: data.length });
    } catch (err) {
      next(err);
    }
  };

  createEmploymentType = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = this.getContext(req);
      const validated = validateCreateEmploymentType(req.body);
      const data = await this.service.createEmploymentType(tenantId, companyId, validated);
      res.status(201).json({ data, message: 'Employment type created successfully' });
    } catch (err) {
      next(err);
    }
  };

  updateEmploymentType = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = this.getContext(req);
      const id = String(req.params.id);
      const validated = validateUpdateEmploymentType(req.body);
      const data = await this.service.updateEmploymentType(tenantId, companyId, id, validated);
      res.json({ data, message: 'Employment type updated successfully' });
    } catch (err) {
      next(err);
    }
  };

  deleteEmploymentType = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = this.getContext(req);
      const id = String(req.params.id);
      await this.service.deleteEmploymentType(tenantId, companyId, id);
      res.json({ success: true, message: 'Employment type deleted successfully' });
    } catch (err) {
      next(err);
    }
  };

  // =========================================================================
  // 3. PROBATION POLICY
  // =========================================================================

  getProbationPolicy = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = this.getContext(req);
      const data = await this.service.getProbationPolicy(tenantId, companyId);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  };

  updateProbationPolicy = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = this.getContext(req);
      const validated = validateUpdateProbationPolicy(req.body);
      const data = await this.service.updateProbationPolicy(tenantId, companyId, validated);
      res.json({ data, message: 'Probation policy updated successfully' });
    } catch (err) {
      next(err);
    }
  };

  // =========================================================================
  // 4. LIFECYCLE & TRANSFER POLICY
  // =========================================================================

  getLifecyclePolicy = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = this.getContext(req);
      const data = await this.service.getLifecyclePolicy(tenantId, companyId);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  };

  updateLifecyclePolicy = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = this.getContext(req);
      const validated = validateUpdateLifecyclePolicy(req.body);
      const data = await this.service.updateLifecyclePolicy(tenantId, companyId, validated);
      res.json({ data, message: 'Lifecycle policy updated successfully' });
    } catch (err) {
      next(err);
    }
  };

  // =========================================================================
  // 5. OFFBOARDING POLICY
  // =========================================================================

  getOffboardingPolicy = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = this.getContext(req);
      const data = await this.service.getOffboardingPolicy(tenantId, companyId);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  };

  updateOffboardingPolicy = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = this.getContext(req);
      const validated = validateUpdateOffboardingPolicy(req.body);
      const data = await this.service.updateOffboardingPolicy(tenantId, companyId, validated);
      res.json({ data, message: 'Offboarding policy updated successfully' });
    } catch (err) {
      next(err);
    }
  };

  // =========================================================================
  // 6. CLEARANCE CHECKLIST TEMPLATES
  // =========================================================================

  listClearanceTemplates = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = this.getContext(req);
      const department = req.query.department as 'it' | 'admin' | 'finance' | 'hr' | undefined;
      const data = await this.service.listClearanceTemplates(tenantId, companyId, department);
      res.json({ data, total: data.length });
    } catch (err) {
      next(err);
    }
  };

  createClearanceTemplate = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = this.getContext(req);
      const validated = validateCreateClearanceTemplate(req.body);
      const data = await this.service.createClearanceTemplate(tenantId, companyId, validated);
      res.status(201).json({ data, message: 'Clearance checklist template item created successfully' });
    } catch (err) {
      next(err);
    }
  };

  updateClearanceTemplate = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = this.getContext(req);
      const id = String(req.params.id);
      const validated = validateUpdateClearanceTemplate(req.body);
      const data = await this.service.updateClearanceTemplate(tenantId, companyId, id, validated);
      res.json({ data, message: 'Clearance checklist template item updated successfully' });
    } catch (err) {
      next(err);
    }
  };

  deleteClearanceTemplate = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = this.getContext(req);
      const id = String(req.params.id);
      await this.service.deleteClearanceTemplate(tenantId, companyId, id);
      res.json({ success: true, message: 'Clearance checklist template item deleted successfully' });
    } catch (err) {
      next(err);
    }
  };
}

export const workforceSettingsController = new WorkforceSettingsController();
