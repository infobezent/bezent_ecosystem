import type { Request, Response, NextFunction } from 'express';
import { companyAdminService, CompanyAdminService } from '../service/companyAdmin.service.js';
import { validateAssignCompanyAdmin } from '../validation/companyAdmin.schema.js';

export class CompanyAdminController {
  constructor(private readonly service: CompanyAdminService = companyAdminService) {}

  list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = req.query;
      const result = await this.service.listCompanyAdmins(
        typeof tenantId === 'string' ? tenantId : undefined,
        typeof companyId === 'string' ? companyId : undefined,
      );
      res.status(200).json({ data: result });
    } catch (err) {
      next(err);
    }
  };

  assign = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const dto = validateAssignCompanyAdmin(req.body);
      const actor = { id: req.user?.id, email: req.user?.email };
      const result = await this.service.assignCompanyAdmin(dto, actor);
      res.status(200).json({ data: result });
    } catch (err) {
      next(err);
    }
  };

  revoke = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const membershipId = String(req.params.membershipId);
      const actor = { id: req.user?.id, email: req.user?.email };
      await this.service.revokeCompanyAdmin(membershipId, actor);
      res.status(200).json({ data: { message: 'Company admin assignment revoked' } });
    } catch (err) {
      next(err);
    }
  };

  resendInvitation = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const membershipId = String(req.params.membershipId);
      const actor = { id: req.user?.id, email: req.user?.email };
      const result = await this.service.resendInvitation(membershipId, actor);
      res.status(200).json({ data: result });
    } catch (err) {
      next(err);
    }
  };
}

export const companyAdminController = new CompanyAdminController();
