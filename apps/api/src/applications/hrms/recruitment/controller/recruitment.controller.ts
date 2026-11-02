import type { Request, Response, NextFunction } from 'express';
import {
  RecruitmentService,
  recruitmentService,
} from '../service/recruitment.service.js';
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

export class RecruitmentController {
  constructor(private readonly service: RecruitmentService = recruitmentService) {}

  // ---------------------------------------------------------------------------
  // Job Requisitions
  // ---------------------------------------------------------------------------

  createRequisition = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const ctx = getCompanyContext(req);
      const result = await this.service.createRequisition(
        ctx.tenantId,
        ctx.companyId,
        req.body,
        getActor(req),
      );
      res.status(201).json({ data: result });
    } catch (err) {
      next(err);
    }
  };

  listRequisitions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const ctx = getCompanyContext(req);
      const result = await this.service.listRequisitions(
        ctx.tenantId,
        ctx.companyId,
        req.query as Record<string, unknown>,
      );
      res.json(result);
    } catch (err) {
      next(err);
    }
  };

  getRequisitionById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const ctx = getCompanyContext(req);
      const result = await this.service.getRequisitionById(
        ctx.tenantId,
        ctx.companyId,
        requireParam(req, 'id'),
      );
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  };

  updateRequisition = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const ctx = getCompanyContext(req);
      const result = await this.service.updateRequisition(
        ctx.tenantId,
        ctx.companyId,
        requireParam(req, 'id'),
        req.body,
        getActor(req),
      );
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  };

  closeRequisition = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const ctx = getCompanyContext(req);
      const result = await this.service.closeRequisition(
        ctx.tenantId,
        ctx.companyId,
        requireParam(req, 'id'),
        req.body?.reason,
        getActor(req),
      );
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  };

  // ---------------------------------------------------------------------------
  // Job Postings
  // ---------------------------------------------------------------------------

  createJobPosting = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const ctx = getCompanyContext(req);
      const result = await this.service.createJobPosting(
        ctx.tenantId,
        ctx.companyId,
        req.body,
        getActor(req),
      );
      res.status(201).json({ data: result });
    } catch (err) {
      next(err);
    }
  };

  listJobPostings = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const ctx = getCompanyContext(req);
      const result = await this.service.listJobPostings(
        ctx.tenantId,
        ctx.companyId,
        req.query as Record<string, unknown>,
      );
      res.json(result);
    } catch (err) {
      next(err);
    }
  };

  getJobPostingById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const ctx = getCompanyContext(req);
      const result = await this.service.getJobPostingById(
        ctx.tenantId,
        ctx.companyId,
        requireParam(req, 'id'),
      );
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  };

  publishJobPosting = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const ctx = getCompanyContext(req);
      const result = await this.service.publishJobPosting(
        ctx.tenantId,
        ctx.companyId,
        requireParam(req, 'id'),
        getActor(req),
      );
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  };

  closeJobPosting = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const ctx = getCompanyContext(req);
      const result = await this.service.closeJobPosting(
        ctx.tenantId,
        ctx.companyId,
        requireParam(req, 'id'),
        getActor(req),
      );
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  };

  // ---------------------------------------------------------------------------
  // Candidates
  // ---------------------------------------------------------------------------

  createCandidate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const ctx = getCompanyContext(req);
      const result = await this.service.createCandidate(ctx.tenantId, req.body, getActor(req));
      res.status(201).json({ data: result });
    } catch (err) {
      next(err);
    }
  };

  listCandidates = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const ctx = getCompanyContext(req);
      const result = await this.service.listCandidates(
        ctx.tenantId,
        req.query as Record<string, unknown>,
      );
      res.json(result);
    } catch (err) {
      next(err);
    }
  };

  getCandidateById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const ctx = getCompanyContext(req);
      const result = await this.service.getCandidateById(ctx.tenantId, requireParam(req, 'id'));
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  };

  updateCandidate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const ctx = getCompanyContext(req);
      const result = await this.service.updateCandidate(
        ctx.tenantId,
        requireParam(req, 'id'),
        req.body,
        getActor(req),
      );
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  };

  // ---------------------------------------------------------------------------
  // Candidate Applications
  // ---------------------------------------------------------------------------

  createApplication = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const ctx = getCompanyContext(req);
      const result = await this.service.createApplication(
        ctx.tenantId,
        ctx.companyId,
        req.body,
        getActor(req),
      );
      res.status(201).json({ data: result });
    } catch (err) {
      next(err);
    }
  };

  listApplications = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const ctx = getCompanyContext(req);
      const result = await this.service.listApplications(
        ctx.tenantId,
        ctx.companyId,
        req.query as Record<string, unknown>,
      );
      res.json(result);
    } catch (err) {
      next(err);
    }
  };

  getApplicationById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const ctx = getCompanyContext(req);
      const result = await this.service.getApplicationById(
        ctx.tenantId,
        ctx.companyId,
        requireParam(req, 'id'),
      );
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  };

  changeApplicationStage = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const ctx = getCompanyContext(req);
      const result = await this.service.changeApplicationStage(
        ctx.tenantId,
        ctx.companyId,
        requireParam(req, 'id'),
        req.body,
        getActor(req),
      );
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  };

  rejectApplication = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const ctx = getCompanyContext(req);
      const result = await this.service.rejectApplication(
        ctx.tenantId,
        ctx.companyId,
        requireParam(req, 'id'),
        req.body,
        getActor(req),
      );
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  };

  withdrawApplication = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const ctx = getCompanyContext(req);
      const result = await this.service.withdrawApplication(
        ctx.tenantId,
        ctx.companyId,
        requireParam(req, 'id'),
        req.body,
        getActor(req),
      );
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  };

  assignRecruiter = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const ctx = getCompanyContext(req);
      const result = await this.service.assignRecruiter(
        ctx.tenantId,
        ctx.companyId,
        requireParam(req, 'id'),
        req.body,
        getActor(req),
      );
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  };

  // ---------------------------------------------------------------------------
  // Pipeline Stages
  // ---------------------------------------------------------------------------

  listStages = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const ctx = getCompanyContext(req);
      const result = await this.service.listStages(ctx.tenantId, ctx.companyId);
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  };

  // ---------------------------------------------------------------------------
  // Candidate Notes and Activity History
  // ---------------------------------------------------------------------------

  addNote = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const ctx = getCompanyContext(req);
      const result = await this.service.addNote(
        ctx.tenantId,
        ctx.companyId,
        requireParam(req, 'applicationId'),
        req.body,
        getActor(req),
      );
      res.status(201).json({ data: result });
    } catch (err) {
      next(err);
    }
  };

  listActivities = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const ctx = getCompanyContext(req);
      const result = await this.service.listActivities(
        ctx.tenantId,
        ctx.companyId,
        requireParam(req, 'applicationId'),
      );
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  };

  // ---------------------------------------------------------------------------
  // Interviews
  // ---------------------------------------------------------------------------

  scheduleInterview = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const ctx = getCompanyContext(req);
      const result = await this.service.scheduleInterview(
        ctx.tenantId,
        ctx.companyId,
        req.body,
        getActor(req),
      );
      res.status(201).json({ data: result });
    } catch (err) {
      next(err);
    }
  };

  listInterviews = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const ctx = getCompanyContext(req);
      const result = await this.service.listInterviews(
        ctx.tenantId,
        ctx.companyId,
        req.query as Record<string, unknown>,
      );
      res.json(result);
    } catch (err) {
      next(err);
    }
  };

  getInterviewById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const ctx = getCompanyContext(req);
      const result = await this.service.getInterviewById(
        ctx.tenantId,
        ctx.companyId,
        requireParam(req, 'id'),
      );
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  };

  rescheduleInterview = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const ctx = getCompanyContext(req);
      const result = await this.service.rescheduleInterview(
        ctx.tenantId,
        ctx.companyId,
        requireParam(req, 'id'),
        req.body,
        getActor(req),
      );
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  };

  cancelInterview = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const ctx = getCompanyContext(req);
      const result = await this.service.cancelInterview(
        ctx.tenantId,
        ctx.companyId,
        requireParam(req, 'id'),
        req.body,
        getActor(req),
      );
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  };

  recordFeedback = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const ctx = getCompanyContext(req);
      const result = await this.service.recordInterviewFeedback(
        ctx.tenantId,
        ctx.companyId,
        requireParam(req, 'id'),
        req.body,
        getActor(req),
      );
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  };
}

export const recruitmentController = new RecruitmentController();
