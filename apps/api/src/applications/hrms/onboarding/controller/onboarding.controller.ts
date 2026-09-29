import type { Request, Response, NextFunction } from 'express';
import { OnboardingService } from '../service/onboarding.service.js';
import {
  validateCreateNewHire,
  validateCreateCase,
  validateUpdateDraft,
  validateSubmitCase,
  validateTransitionStage,
  validateWithdrawCase,
  validateListNewHiresQuery,
} from '../validation/onboarding.schema.js';
import { AppError } from '../../../../app/errors/AppError.js';

export class OnboardingController {
  constructor(private readonly service = new OnboardingService()) {}

  listNewHires = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const companyContext = req.companyContext;
      if (!companyContext) {
        throw new AppError('Context not resolved', 400, 'CONTEXT_MISSING');
      }

      const queryParams = validateListNewHiresQuery(req.query as Record<string, unknown>);

      const result = await this.service.listNewHires(
        companyContext.tenantId,
        companyContext.companyId,
        queryParams,
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

  listCases = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const companyContext = req.companyContext;
      if (!companyContext) {
        throw new AppError('Context not resolved', 400, 'CONTEXT_MISSING');
      }

      const statusQuery = typeof req.query.status === 'string' ? req.query.status : undefined;

      const items = await this.service.listCases(companyContext.tenantId, companyContext.companyId, {
        status: statusQuery,
      });

      res.json({
        data: items,
      });
    } catch (err) {
      next(err);
    }
  };

  createNewHire = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const companyContext = req.companyContext;
      if (!companyContext) {
        throw new AppError('Context not resolved', 400, 'CONTEXT_MISSING');
      }

      const validatedDto = validateCreateNewHire(req.body);

      const created = await this.service.createNewHire(
        companyContext.tenantId,
        companyContext.companyId,
        validatedDto,
      );

      res.status(201).json({
        data: created,
      });
    } catch (err) {
      next(err);
    }
  };

  createCase = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const companyContext = req.companyContext;
      if (!companyContext) {
        throw new AppError('Context not resolved', 400, 'CONTEXT_MISSING');
      }

      const validatedDto = validateCreateCase(req.body);

      const created = await this.service.createCase(
        companyContext.tenantId,
        companyContext.companyId,
        validatedDto,
      );

      res.status(201).json({
        data: created,
      });
    } catch (err) {
      next(err);
    }
  };

  getCaseById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const companyContext = req.companyContext;
      if (!companyContext) {
        throw new AppError('Context not resolved', 400, 'CONTEXT_MISSING');
      }

      const rawId = req.params.caseId ?? req.params.id;
      const id = Array.isArray(rawId) ? rawId[0] : rawId;
      if (!id) {
        throw new AppError('Onboarding case ID is required', 400, 'VALIDATION_ERROR');
      }

      const item = await this.service.getCaseById(companyContext.tenantId, companyContext.companyId, id);

      res.json({
        data: item,
      });
    } catch (err) {
      next(err);
    }
  };

  getNewHireById = async (req: Request, res: Response, next: NextFunction) => {
    return this.getCaseById(req, res, next);
  };

  updateDraft = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const companyContext = req.companyContext;
      if (!companyContext) {
        throw new AppError('Context not resolved', 400, 'CONTEXT_MISSING');
      }

      const rawId = req.params.caseId;
      const caseId = Array.isArray(rawId) ? rawId[0] : rawId;
      if (!caseId) {
        throw new AppError('Onboarding case ID is required', 400, 'VALIDATION_ERROR');
      }

      const validatedDto = validateUpdateDraft(req.body);

      const updated = await this.service.updateDraft(
        companyContext.tenantId,
        companyContext.companyId,
        caseId,
        validatedDto,
      );

      res.json({
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  };

  submitCase = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const companyContext = req.companyContext;
      if (!companyContext) {
        throw new AppError('Context not resolved', 400, 'CONTEXT_MISSING');
      }

      const rawId = req.params.caseId;
      const caseId = Array.isArray(rawId) ? rawId[0] : rawId;
      if (!caseId) {
        throw new AppError('Onboarding case ID is required', 400, 'VALIDATION_ERROR');
      }

      const validatedDto = validateSubmitCase(req.body);

      const submitted = await this.service.submitCase(
        companyContext.tenantId,
        companyContext.companyId,
        caseId,
        validatedDto,
      );

      res.json({
        data: submitted,
      });
    } catch (err) {
      next(err);
    }
  };

  deleteDraft = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const companyContext = req.companyContext;
      if (!companyContext) {
        throw new AppError('Context not resolved', 400, 'CONTEXT_MISSING');
      }

      const rawId = req.params.caseId;
      const caseId = Array.isArray(rawId) ? rawId[0] : rawId;
      if (!caseId) {
        throw new AppError('Onboarding case ID is required', 400, 'VALIDATION_ERROR');
      }

      await this.service.deleteDraft(companyContext.tenantId, companyContext.companyId, caseId);

      res.status(204).send();
    } catch (err) {
      next(err);
    }
  };

  transitionStage = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const companyContext = req.companyContext;
      if (!companyContext) {
        throw new AppError('Context not resolved', 400, 'CONTEXT_MISSING');
      }

      const rawId = req.params.caseId;
      const caseId = Array.isArray(rawId) ? rawId[0] : rawId;
      if (!caseId) {
        throw new AppError('Onboarding case ID is required', 400, 'VALIDATION_ERROR');
      }

      const validatedDto = validateTransitionStage(req.body);

      const updated = await this.service.transitionStage(
        companyContext.tenantId,
        companyContext.companyId,
        caseId,
        validatedDto,
      );

      res.json({
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  };

  withdrawCase = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const companyContext = req.companyContext;
      if (!companyContext) {
        throw new AppError('Context not resolved', 400, 'CONTEXT_MISSING');
      }

      const rawId = req.params.caseId;
      const caseId = Array.isArray(rawId) ? rawId[0] : rawId;
      if (!caseId) {
        throw new AppError('Onboarding case ID is required', 400, 'VALIDATION_ERROR');
      }

      const validatedDto = validateWithdrawCase(req.body);

      const withdrawn = await this.service.withdrawCase(
        companyContext.tenantId,
        companyContext.companyId,
        caseId,
        validatedDto,
      );

      res.json({
        data: withdrawn,
      });
    } catch (err) {
      next(err);
    }
  };

  getCaseHistory = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const companyContext = req.companyContext;
      if (!companyContext) {
        throw new AppError('Context not resolved', 400, 'CONTEXT_MISSING');
      }

      const rawId = req.params.caseId;
      const caseId = Array.isArray(rawId) ? rawId[0] : rawId;
      if (!caseId) {
        throw new AppError('Onboarding case ID is required', 400, 'VALIDATION_ERROR');
      }

      const history = await this.service.getCaseHistory(
        companyContext.tenantId,
        companyContext.companyId,
        caseId,
      );

      res.json({
        data: history,
      });
    } catch (err) {
      next(err);
    }
  };
}
