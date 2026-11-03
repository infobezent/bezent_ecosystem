import type { Request, Response, NextFunction } from 'express';
import {
  RecruitmentOnboardingService,
  recruitmentOnboardingService,
} from '../service/recruitmentOnboarding.service.js';
import { AppError } from '../../../../app/errors/AppError.js';
import type { RecruitmentActorContext } from '../types/recruitment.types.js';

function getActor(req: Request): RecruitmentActorContext {
  return {
    userId: req.user?.id ?? null,
    email: req.user?.email ?? null,
    name: req.user?.email ? req.user.email.split('@')[0] : 'System User',
  };
}

function getCompanyContext(req: Request) {
  const ctx = req.companyContext;
  if (!ctx || !ctx.tenantId || !ctx.companyId) {
    throw new AppError('Company context not resolved', 400, 'CONTEXT_MISSING');
  }
  return ctx;
}

function requireParam(req: Request, name: string): string {
  const val = req.params[name];
  if (!val || typeof val !== 'string') {
    throw new AppError(`Missing route parameter: ${name}`, 400, 'BAD_REQUEST');
  }
  return val;
}

export class RecruitmentOnboardingController {
  constructor(
    private readonly service: RecruitmentOnboardingService = recruitmentOnboardingService,
  ) {}

  initiateOnboarding = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const ctx = getCompanyContext(req);
      const applicationId = requireParam(req, 'applicationId');
      const result = await this.service.initiateOnboarding(
        ctx.tenantId,
        ctx.companyId,
        applicationId,
        req.body,
        getActor(req),
      );
      res.status(201).json({ data: result });
    } catch (err) {
      next(err);
    }
  };

  getOnboardingById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const ctx = getCompanyContext(req);
      const id = requireParam(req, 'id');
      const result = await this.service.getOnboardingById(ctx.tenantId, ctx.companyId, id);
      res.status(200).json({ data: result });
    } catch (err) {
      next(err);
    }
  };

  listOnboardings = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const ctx = getCompanyContext(req);
      const result = await this.service.listOnboardings(ctx.tenantId, ctx.companyId, {
        status: req.query.status as any,
        departmentId: req.query.departmentId ? String(req.query.departmentId) : undefined,
        search: req.query.search ? String(req.query.search) : undefined,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
        offset: req.query.offset ? Number(req.query.offset) : undefined,
      });
      res.status(200).json({
        data: result.items,
        pagination: result.pagination,
      });
    } catch (err) {
      next(err);
    }
  };

  reviewOnboarding = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const ctx = getCompanyContext(req);
      const id = requireParam(req, 'id');
      const result = await this.service.reviewOnboarding(
        ctx.tenantId,
        ctx.companyId,
        id,
        req.body,
        getActor(req),
      );
      res.status(200).json({ data: result });
    } catch (err) {
      next(err);
    }
  };

  confirmOnboarding = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const ctx = getCompanyContext(req);
      const id = requireParam(req, 'id');
      const result = await this.service.confirmOnboarding(
        ctx.tenantId,
        ctx.companyId,
        id,
        req.body,
        getActor(req),
      );
      res.status(200).json({ data: result });
    } catch (err) {
      next(err);
    }
  };

  cancelOnboarding = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const ctx = getCompanyContext(req);
      const id = requireParam(req, 'id');
      const result = await this.service.cancelOnboarding(
        ctx.tenantId,
        ctx.companyId,
        id,
        req.body,
        getActor(req),
      );
      res.status(200).json({ data: result });
    } catch (err) {
      next(err);
    }
  };
}

export const recruitmentOnboardingController = new RecruitmentOnboardingController();
