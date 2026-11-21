import type { Request, Response, NextFunction } from 'express';
import { CandidateIntakeService } from '../service/candidateIntake.service.js';
import { AppError } from '../../../../app/errors/AppError.js';
import type { CompanyContext } from '../../../../platform/access/types/access.types.js';

function requireContext(req: Request): CompanyContext {
  if (!req.companyContext) {
    throw new AppError('Context not resolved', 400, 'CONTEXT_MISSING');
  }
  return req.companyContext;
}

export class CandidateIntakeController {
  constructor(private readonly service = new CandidateIntakeService()) {}

  getLatestForm = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = requireContext(req);
      const data = await this.service.getLatestIntakeForm(tenantId, companyId);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  };

  createManualEntry = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = requireContext(req);
      const user = (req as any).user;
      const result = await this.service.createManualEntry(
        tenantId,
        companyId,
        req.body,
        user ? { id: user.id, name: user.name } : undefined,
      );
      res.status(201).json({ data: result });
    } catch (err) {
      next(err);
    }
  };

  inviteCandidate = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = requireContext(req);
      const user = (req as any).user;
      const result = await this.service.inviteCandidate(
        tenantId,
        companyId,
        req.body,
        user ? { id: user.id, name: user.name } : undefined,
      );
      res.status(201).json({ data: result });
    } catch (err) {
      next(err);
    }
  };

  getByToken = async (req: Request<{ token: string }>, res: Response, next: NextFunction) => {
    try {
      const { token } = req.params;
      const result = await this.service.getCandidateIntakeByToken(token);
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  };

  saveDraftByToken = async (req: Request<{ token: string }>, res: Response, next: NextFunction) => {
    try {
      const { token } = req.params;
      await this.service.saveCandidateDraft(token, req.body.answers || req.body);
      res.json({ data: { success: true } });
    } catch (err) {
      next(err);
    }
  };

  submitByToken = async (req: Request<{ token: string }>, res: Response, next: NextFunction) => {
    try {
      const { token } = req.params;
      const result = await this.service.submitCandidateIntake(token, req.body.answers || req.body);
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  };

  approveSubmission = async (
    req: Request<{ caseId: string }>,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const { tenantId, companyId } = requireContext(req);
      const user = (req as any).user;
      const result = await this.service.approveCandidateIntake(
        tenantId,
        companyId,
        req.params.caseId,
        user ? { name: user.name, email: user.email } : undefined,
      );
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  };

  requestChanges = async (req: Request<{ caseId: string }>, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = requireContext(req);
      const user = (req as any).user;
      const { notes } = req.body;
      const result = await this.service.requestCandidateChanges(
        tenantId,
        companyId,
        req.params.caseId,
        notes || 'Please update your submitted details.',
        user ? { name: user.name, email: user.email } : undefined,
      );
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  };
}
