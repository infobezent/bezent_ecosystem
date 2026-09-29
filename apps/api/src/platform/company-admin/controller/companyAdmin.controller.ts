import type { Request, Response, NextFunction } from 'express';
import {
  companyAdminService,
  CompanyAdminService,
} from '../service/companyAdmin.service.js';
import { UnauthorizedError } from '../../../app/errors/AppError.js';
import type { ModuleCode } from '../../modules/types/module.types.js';

export class CompanyAdminController {
  constructor(private readonly service: CompanyAdminService = companyAdminService) {}

  getAuthorizedCompanies = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const companies = await this.service.getAuthorizedCompanies(
        req.user.id,
        req.user.isSuperAdmin,
      );
      res.json({ data: companies });
    } catch (err) {
      next(err);
    }
  };

  getDashboard = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = req.companyContext!;
      const dashboard = await this.service.getDashboard(tenantId, companyId);
      res.json({ data: dashboard });
    } catch (err) {
      next(err);
    }
  };

  getProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { companyId } = req.companyContext!;
      const profile = await this.service.getProfile(companyId);
      res.json({ data: profile });
    } catch (err) {
      next(err);
    }
  };

  updateProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = req.companyContext!;
      const actor = { id: req.user!.id, email: req.user!.email };
      const updated = await this.service.updateProfile(
        tenantId,
        companyId,
        req.body,
        actor,
      );
      res.json({ data: updated });
    } catch (err) {
      next(err);
    }
  };

  listUsers = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { companyId } = req.companyContext!;
      const { search, role, status, page, limit } = req.query;
      const result = await this.service.listUsers(companyId, {
        search: typeof search === 'string' ? search : undefined,
        role: typeof role === 'string' ? role : undefined,
        status: typeof status === 'string' ? status : undefined,
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 20,
      });
      res.json({
        data: result.items,
        pagination: {
          total: result.total,
          page: page ? Number(page) : 1,
          limit: limit ? Number(limit) : 20,
        },
      });
    } catch (err) {
      next(err);
    }
  };

  inviteUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = req.companyContext!;
      const actor = { id: req.user!.id, email: req.user!.email };
      const result = await this.service.inviteUser(
        tenantId,
        companyId,
        req.body,
        actor,
      );
      res.status(201).json({ data: result });
    } catch (err) {
      next(err);
    }
  };

  updateUserRole = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = req.companyContext!;
      const userId = String(req.params.userId);
      const { role } = req.body;
      const actor = { id: req.user!.id, email: req.user!.email };
      const result = await this.service.updateUserRole(
        tenantId,
        companyId,
        userId,
        role,
        actor,
      );
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  };

  updateUserStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = req.companyContext!;
      const userId = String(req.params.userId);
      const { status } = req.body;
      const actor = { id: req.user!.id, email: req.user!.email };
      const result = await this.service.updateUserStatus(
        tenantId,
        companyId,
        userId,
        status,
        actor,
      );
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  };

  revokeMembership = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = req.companyContext!;
      const userId = String(req.params.userId);
      const actor = { id: req.user!.id, email: req.user!.email };
      const result = await this.service.revokeMembership(
        tenantId,
        companyId,
        userId,
        actor,
      );
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  };

  listInvitations = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { companyId } = req.companyContext!;
      const items = await this.service.listInvitations(companyId);
      res.json({ data: items });
    } catch (err) {
      next(err);
    }
  };

  resendInvitation = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = req.companyContext!;
      const id = String(req.params.id);
      const actor = { id: req.user!.id, email: req.user!.email };
      const result = await this.service.resendInvitation(
        tenantId,
        companyId,
        id,
        actor,
      );
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  };

  cancelInvitation = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = req.companyContext!;
      const id = String(req.params.id);
      const actor = { id: req.user!.id, email: req.user!.email };
      const result = await this.service.cancelInvitation(
        tenantId,
        companyId,
        id,
        actor,
      );
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  };

  getRoles = async (_req: Request, res: Response) => {
    const roles = this.service.getRoles();
    res.json({ data: roles });
  };

  getModules = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = req.companyContext!;
      const modules = await this.service.getModules(tenantId, companyId);
      res.json({ data: modules });
    } catch (err) {
      next(err);
    }
  };

  setModuleStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = req.companyContext!;
      const moduleCode = String(req.params.moduleCode);
      const { enabled } = req.body;
      const actor = { id: req.user!.id, email: req.user!.email };
      const result = await this.service.setModuleStatus(
        tenantId,
        companyId,
        moduleCode as ModuleCode,
        Boolean(enabled),
        actor,
      );
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  };

  getOrganizationSummary = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { companyId } = req.companyContext!;
      const summary = await this.service.getOrganizationSummary(companyId);
      res.json({ data: summary });
    } catch (err) {
      next(err);
    }
  };

  getPoliciesSummary = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { companyId } = req.companyContext!;
      const summary = await this.service.getPoliciesSummary(companyId);
      res.json({ data: summary });
    } catch (err) {
      next(err);
    }
  };

  listAuditLogs = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { companyId } = req.companyContext!;
      const { page, limit, action } = req.query;
      const result = await this.service.listAuditLogs(companyId, {
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 20,
        action: typeof action === 'string' ? action : undefined,
      });
      res.json({
        data: result.items,
        pagination: {
          total: result.total,
          page: page ? Number(page) : 1,
          limit: limit ? Number(limit) : 20,
        },
      });
    } catch (err) {
      next(err);
    }
  };
}

export const companyAdminController = new CompanyAdminController();
