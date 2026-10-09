import type { Request, Response, NextFunction } from 'express';
import { primaryAdminService, PrimaryAdminService } from '../service/primaryAdmin.service.js';
import { ValidationError } from '../../../app/errors/AppError.js';

export class PrimaryAdminController {
  constructor(private readonly service: PrimaryAdminService = primaryAdminService) {}

  getPrimaryAdmin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = String(req.params.tenantId);
      const data = await this.service.getPrimaryAdmin(tenantId);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  };

  invite = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = String(req.params.tenantId);
      const { email, jobTitle } = req.body || {};
      if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        throw new ValidationError('Validation failed', { email: 'Valid email is required' });
      }

      const actor = req.user ? { id: req.user.id, email: req.user.email } : undefined;
      const data = await this.service.invitePrimaryAdmin(
        tenantId,
        email.trim(),
        jobTitle ? String(jobTitle).trim() : undefined,
        actor,
      );
      res.status(201).json({ data });
    } catch (err) {
      next(err);
    }
  };

  resend = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = String(req.params.tenantId);
      const invitationId = String(req.params.invitationId);
      const actor = req.user ? { id: req.user.id, email: req.user.email } : undefined;
      const data = await this.service.resendInvitation(
        tenantId,
        invitationId,
        actor,
      );
      res.json({ data });
    } catch (err) {
      next(err);
    }
  };

  revoke = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = String(req.params.tenantId);
      const invitationId = String(req.params.invitationId);
      const { reason } = req.body || {};
      const actor = req.user ? { id: req.user.id, email: req.user.email } : undefined;
      await this.service.revokeInvitation(
        tenantId,
        invitationId,
        reason ? String(reason).trim() : undefined,
        actor,
      );
      res.json({ success: true, message: 'Invitation revoked successfully' });
    } catch (err) {
      next(err);
    }
  };

  reassign = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = String(req.params.tenantId);
      const { userId } = req.body || {};
      if (!userId || typeof userId !== 'string' || !userId.trim()) {
        throw new ValidationError('Validation failed', { userId: 'userId is required' });
      }

      const actor = req.user ? { id: req.user.id, email: req.user.email } : undefined;
      await this.service.reassignPrimaryAdmin(
        tenantId,
        userId.trim(),
        actor,
      );
      res.json({ success: true, message: 'Primary Admin reassigned successfully' });
    } catch (err) {
      next(err);
    }
  };

  accept = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const token = String(req.params.token);
      const caller = req.user ? { id: req.user.id, email: req.user.email } : undefined;
      const result = await this.service.acceptInvitation(token, caller);
      res.json({ data: { ...result, success: true }, success: true });
    } catch (err) {
      next(err);
    }
  };
}

export const primaryAdminController = new PrimaryAdminController();
