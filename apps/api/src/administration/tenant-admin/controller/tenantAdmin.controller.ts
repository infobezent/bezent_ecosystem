import type { Request, Response, NextFunction } from 'express';
import { tenantAdminService, TenantAdminService } from '../service/tenantAdmin.service.js';
import { companyService } from '../../../platform/companies/service/company.service.js';
import { validateCreateTenantAdminCompany } from '../../../platform/companies/validation/company.schema.js';
import {
  validateInviteTenantMember,
  validateGrantCompanyAccess,
  validateAssignCompanyRoles,
  validateUpdateTenantProfile,
  validateAssignCompanyUser,
  validateInviteCompanyUser,
  validateUpdateCompanyUserRole,
} from '../validation/tenantAdmin.schema.js';
import type { ModuleCode } from '../../../platform/modules/types/module.types.js';
import { UnauthorizedError, BadRequestError } from '../../../app/errors/AppError.js';
import { mediaService } from '../../../platform/data/index.js';
import { parseUploadFromRequest } from './tenantAdminMedia.helper.js';

const VALID_MODULE_CODES: readonly string[] = ['hrms', 'crm', 'project_management'];

function parseModuleCode(code: string): ModuleCode {
  if (!VALID_MODULE_CODES.includes(code)) {
    throw new BadRequestError(
      `Invalid application module code: '${code}'. Valid codes: ${VALID_MODULE_CODES.join(', ')}`,
    );
  }
  return code as ModuleCode;
}

export class TenantAdminController {
  constructor(private readonly service: TenantAdminService = tenantAdminService) {}

  getContext = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user || !req.tenantAdminContext) {
        throw new UnauthorizedError('Tenant Admin authority required');
      }
      const context = await this.service.getTenantAdminContext(
        req.user.id,
        req.tenantAdminContext.tenantId,
      );
      res.json({ data: context });
    } catch (err) {
      next(err);
    }
  };

  getTenantDetails = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.tenantAdminContext) {
        throw new UnauthorizedError('Tenant Admin authority required');
      }
      const details = await this.service.getTenantDetails(req.tenantAdminContext.tenantId);
      res.json({ data: details });
    } catch (err) {
      next(err);
    }
  };

  updateTenantProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.tenantAdminContext || !req.user) {
        throw new UnauthorizedError('Tenant Admin authority required');
      }
      const dto = validateUpdateTenantProfile(req.body);
      const actor = { id: req.user.id, email: req.user.email };
      // Resolve tenantId strictly from authenticated tenantAdminContext
      const tenantId = req.tenantAdminContext.tenantId;
      const updated = await this.service.updateTenantProfile(tenantId, dto, actor);
      res.json({ data: updated });
    } catch (err) {
      next(err);
    }
  };

  listCompanies = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.tenantAdminContext) {
        throw new UnauthorizedError('Tenant Admin authority required');
      }
      const { items, capacity } = await this.service.listCompanies(req.tenantAdminContext.tenantId);
      res.json({ data: items, capacity });
    } catch (err) {
      next(err);
    }
  };

  createCompany = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.tenantAdminContext || !req.user) {
        throw new UnauthorizedError('Tenant Admin authority required');
      }
      const dto = validateCreateTenantAdminCompany(req.body);
      const actor = { id: req.user.id, email: req.user.email };
      const company = await this.service.createCompany(req.tenantAdminContext.tenantId, dto, actor);
      res.status(201).json({ data: company });
    } catch (err) {
      next(err);
    }
  };

  getCompanyContext = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.tenantAdminCompanyContext) {
        throw new BadRequestError('Company context not resolved');
      }
      res.json({ data: req.tenantAdminCompanyContext });
    } catch (err) {
      next(err);
    }
  };

  listAdmins = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.tenantAdminContext) {
        throw new UnauthorizedError('Tenant Admin authority required');
      }
      const admins = await this.service.listTenantAdmins(req.tenantAdminContext.tenantId);
      res.json({ data: admins });
    } catch (err) {
      next(err);
    }
  };

  assignAdmin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.tenantAdminContext || !req.user) {
        throw new UnauthorizedError('Tenant Admin authority required');
      }
      const { userId, newUser } = req.body;
      const actor = { id: req.user.id, email: req.user.email };

      // Strictly force tenantId to caller's verified tenant
      const result = await this.service.assignTenantAdmin(
        {
          tenantId: req.tenantAdminContext.tenantId,
          userId,
          newUser,
        },
        actor,
      );

      res.status(201).json({ data: result });
    } catch (err) {
      next(err);
    }
  };

  revokeAdmin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.tenantAdminContext || !req.user) {
        throw new UnauthorizedError('Tenant Admin authority required');
      }
      const rawTargetUserId = req.params.userId;
      const targetUserId =
        typeof rawTargetUserId === 'string'
          ? rawTargetUserId.trim()
          : Array.isArray(rawTargetUserId)
            ? String(rawTargetUserId[0]).trim()
            : undefined;
      if (!targetUserId) {
        throw new BadRequestError('Target user ID is required');
      }
      const actor = { id: req.user.id, email: req.user.email };

      await this.service.revokeTenantAdmin(req.tenantAdminContext.tenantId, targetUserId, actor);

      res.json({ message: 'Tenant Administrator revoked successfully' });
    } catch (err) {
      next(err);
    }
  };

  getCompanyProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.tenantAdminCompanyContext) {
        throw new BadRequestError('Company context not resolved');
      }
      const profile = await companyService.getCompanyProfile(req.tenantAdminCompanyContext.id);
      res.json({ data: profile });
    } catch (err) {
      next(err);
    }
  };

  updateCompanyProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.tenantAdminCompanyContext || !req.tenantAdminContext || !req.user) {
        throw new BadRequestError('Company context not resolved');
      }
      const actor = { id: req.user.id, email: req.user.email };
      const profile = await companyService.updateCompanyProfile(
        req.tenantAdminContext.tenantId,
        req.tenantAdminCompanyContext.id,
        req.body,
        actor,
      );
      res.json({ data: profile });
    } catch (err) {
      next(err);
    }
  };

  // =========================================================================
  // Phase 2D: Tenant-wide Members & Company Access
  // =========================================================================

  listMembers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.tenantAdminContext) {
        throw new UnauthorizedError('Tenant Admin authority required');
      }
      const search = typeof req.query.search === 'string' ? req.query.search : undefined;
      const authority =
        req.query.authority === 'tenant_admin' || req.query.authority === 'standard'
          ? req.query.authority
          : undefined;
      const companyId = typeof req.query.companyId === 'string' ? req.query.companyId : undefined;
      const limit = req.query.limit ? Number(req.query.limit) : undefined;
      const offset = req.query.offset ? Number(req.query.offset) : undefined;

      const result = await this.service.listMembers(req.tenantAdminContext.tenantId, {
        search,
        authority,
        companyId,
        limit,
        offset,
      });

      res.json({ data: result.items, total: result.total });
    } catch (err) {
      next(err);
    }
  };

  getMember = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.tenantAdminContext) {
        throw new UnauthorizedError('Tenant Admin authority required');
      }
      const rawUserId = req.params.userId;
      const userId =
        typeof rawUserId === 'string'
          ? rawUserId.trim()
          : Array.isArray(rawUserId)
            ? String(rawUserId[0]).trim()
            : undefined;
      if (!userId) {
        throw new BadRequestError('User ID is required');
      }

      const member = await this.service.getMember(req.tenantAdminContext.tenantId, userId);
      res.json({ data: member });
    } catch (err) {
      next(err);
    }
  };

  inviteMember = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.tenantAdminContext || !req.user) {
        throw new UnauthorizedError('Tenant Admin authority required');
      }
      const dto = validateInviteTenantMember(req.body);
      const actor = { id: req.user.id, email: req.user.email };

      const result = await this.service.inviteMember(req.tenantAdminContext.tenantId, dto, actor);

      res.status(201).json({ data: result });
    } catch (err) {
      next(err);
    }
  };

  grantCompanyAccess = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.tenantAdminContext || !req.user) {
        throw new UnauthorizedError('Tenant Admin authority required');
      }
      const rawUserId = req.params.userId;
      const userId =
        typeof rawUserId === 'string'
          ? rawUserId.trim()
          : Array.isArray(rawUserId)
            ? String(rawUserId[0]).trim()
            : undefined;
      if (!userId) {
        throw new BadRequestError('User ID is required');
      }
      const dto = validateGrantCompanyAccess(req.body);
      const actor = { id: req.user.id, email: req.user.email };

      const result = await this.service.grantCompanyAccess(
        req.tenantAdminContext.tenantId,
        userId,
        dto,
        actor,
      );

      res.status(201).json({ data: result });
    } catch (err) {
      next(err);
    }
  };

  revokeCompanyAccess = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.tenantAdminContext || !req.user) {
        throw new UnauthorizedError('Tenant Admin authority required');
      }
      const rawUserId = req.params.userId;
      const rawCompanyId = req.params.companyId;
      const userId =
        typeof rawUserId === 'string'
          ? rawUserId.trim()
          : Array.isArray(rawUserId)
            ? String(rawUserId[0]).trim()
            : undefined;
      const companyId =
        typeof rawCompanyId === 'string'
          ? rawCompanyId.trim()
          : Array.isArray(rawCompanyId)
            ? String(rawCompanyId[0]).trim()
            : undefined;
      if (!userId || !companyId) {
        throw new BadRequestError('User ID and Company ID are required');
      }
      const actor = { id: req.user.id, email: req.user.email };

      await this.service.revokeCompanyAccess(
        req.tenantAdminContext.tenantId,
        userId,
        companyId,
        actor,
      );

      res.json({ message: 'Company access revoked successfully' });
    } catch (err) {
      next(err);
    }
  };

  assignCompanyRoles = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.tenantAdminContext || !req.user) {
        throw new UnauthorizedError('Tenant Admin authority required');
      }
      const rawUserId = req.params.userId;
      const rawCompanyId = req.params.companyId;
      const userId =
        typeof rawUserId === 'string'
          ? rawUserId.trim()
          : Array.isArray(rawUserId)
            ? String(rawUserId[0]).trim()
            : undefined;
      const companyId =
        typeof rawCompanyId === 'string'
          ? rawCompanyId.trim()
          : Array.isArray(rawCompanyId)
            ? String(rawCompanyId[0]).trim()
            : undefined;
      if (!userId || !companyId) {
        throw new BadRequestError('User ID and Company ID are required');
      }
      const dto = validateAssignCompanyRoles(req.body);
      const actor = { id: req.user.id, email: req.user.email };

      const result = await this.service.assignCompanyRoles(
        req.tenantAdminContext.tenantId,
        userId,
        companyId,
        dto,
        actor,
      );

      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  };

  revokeCompanyRole = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.tenantAdminContext || !req.user) {
        throw new UnauthorizedError('Tenant Admin authority required');
      }
      const rawUserId = req.params.userId;
      const rawCompanyId = req.params.companyId;
      const rawRoleId = req.params.roleId;
      const userId =
        typeof rawUserId === 'string'
          ? rawUserId.trim()
          : Array.isArray(rawUserId)
            ? String(rawUserId[0]).trim()
            : undefined;
      const companyId =
        typeof rawCompanyId === 'string'
          ? rawCompanyId.trim()
          : Array.isArray(rawCompanyId)
            ? String(rawCompanyId[0]).trim()
            : undefined;
      const roleId =
        typeof rawRoleId === 'string'
          ? rawRoleId.trim()
          : Array.isArray(rawRoleId)
            ? String(rawRoleId[0]).trim()
            : undefined;
      if (!userId || !companyId || !roleId) {
        throw new BadRequestError('User ID, Company ID, and Role ID are required');
      }
      const actor = { id: req.user.id, email: req.user.email };

      await this.service.revokeCompanyRole(
        req.tenantAdminContext.tenantId,
        userId,
        companyId,
        roleId,
        actor,
      );

      res.json({ message: 'Company role revoked successfully' });
    } catch (err) {
      next(err);
    }
  };

  promoteMemberToAdmin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.tenantAdminContext || !req.user) {
        throw new UnauthorizedError('Tenant Admin authority required');
      }
      const rawUserId = req.params.userId;
      const userId =
        typeof rawUserId === 'string'
          ? rawUserId.trim()
          : Array.isArray(rawUserId)
            ? String(rawUserId[0]).trim()
            : undefined;
      if (!userId) {
        throw new BadRequestError('User ID is required');
      }
      const actor = { id: req.user.id, email: req.user.email };

      const result = await this.service.assignTenantAdmin(
        {
          tenantId: req.tenantAdminContext.tenantId,
          userId,
        },
        actor,
      );

      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  };

  demoteMemberFromAdmin = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      if (!req.tenantAdminContext || !req.user) {
        throw new UnauthorizedError('Tenant Admin authority required');
      }
      const rawUserId = req.params.userId;
      const userId =
        typeof rawUserId === 'string'
          ? rawUserId.trim()
          : Array.isArray(rawUserId)
            ? String(rawUserId[0]).trim()
            : undefined;
      if (!userId) {
        throw new BadRequestError('User ID is required');
      }
      const actor = { id: req.user.id, email: req.user.email };

      await this.service.revokeTenantAdmin(req.tenantAdminContext.tenantId, userId, actor);

      res.json({ message: 'Tenant Administrator revoked successfully' });
    } catch (err) {
      next(err);
    }
  };

  // =========================================================================
  // Phase 2E: Application Distribution
  // =========================================================================

  listApplications = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.tenantAdminContext) {
        throw new UnauthorizedError('Tenant Admin authority required');
      }
      const catalog = await this.service.listApplications(req.tenantAdminContext.tenantId);
      res.json({ data: catalog });
    } catch (err) {
      next(err);
    }
  };

  getCompanyApplications = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      if (!req.tenantAdminContext) {
        throw new UnauthorizedError('Tenant Admin authority required');
      }
      const rawCompanyId = req.params.companyId;
      const companyId =
        typeof rawCompanyId === 'string'
          ? rawCompanyId.trim()
          : Array.isArray(rawCompanyId)
            ? String(rawCompanyId[0]).trim()
            : undefined;
      if (!companyId) {
        throw new BadRequestError('Company ID is required');
      }

      const apps = await this.service.getCompanyApplications(
        req.tenantAdminContext.tenantId,
        companyId,
      );
      res.json({ data: apps });
    } catch (err) {
      next(err);
    }
  };

  enableCompanyApplication = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      if (!req.tenantAdminContext || !req.user) {
        throw new UnauthorizedError('Tenant Admin authority required');
      }
      const rawCompanyId = req.params.companyId;
      const rawModuleCode = req.params.moduleCode;
      const companyId =
        typeof rawCompanyId === 'string'
          ? rawCompanyId.trim()
          : Array.isArray(rawCompanyId)
            ? String(rawCompanyId[0]).trim()
            : undefined;
      const moduleCode =
        typeof rawModuleCode === 'string'
          ? rawModuleCode.trim()
          : Array.isArray(rawModuleCode)
            ? String(rawModuleCode[0]).trim()
            : undefined;
      if (!companyId || !moduleCode) {
        throw new BadRequestError('Company ID and Module Code are required');
      }
      const parsedCode = parseModuleCode(moduleCode);
      const actor = { id: req.user.id, email: req.user.email };

      const result = await this.service.enableCompanyApplication(
        req.tenantAdminContext.tenantId,
        companyId,
        parsedCode,
        actor,
      );

      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  };

  disableCompanyApplication = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      if (!req.tenantAdminContext || !req.user) {
        throw new UnauthorizedError('Tenant Admin authority required');
      }
      const rawCompanyId = req.params.companyId;
      const rawModuleCode = req.params.moduleCode;
      const companyId =
        typeof rawCompanyId === 'string'
          ? rawCompanyId.trim()
          : Array.isArray(rawCompanyId)
            ? String(rawCompanyId[0]).trim()
            : undefined;
      const moduleCode =
        typeof rawModuleCode === 'string'
          ? rawModuleCode.trim()
          : Array.isArray(rawModuleCode)
            ? String(rawModuleCode[0]).trim()
            : undefined;
      if (!companyId || !moduleCode) {
        throw new BadRequestError('Company ID and Module Code are required');
      }
      const parsedCode = parseModuleCode(moduleCode);
      const actor = { id: req.user.id, email: req.user.email };

      const result = await this.service.disableCompanyApplication(
        req.tenantAdminContext.tenantId,
        companyId,
        parsedCode,
        actor,
      );

      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  };

  // =========================================================================
  // Media & Branding Operations
  // =========================================================================

  uploadTenantLogo = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.tenantAdminContext || !req.user) {
        throw new UnauthorizedError('Tenant Admin authority required');
      }
      const upload = parseUploadFromRequest(req);
      const result = await mediaService.uploadTenantLogo(
        req.tenantAdminContext.tenantId,
        upload,
        req.user.id,
      );
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  };

  removeTenantLogo = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.tenantAdminContext) {
        throw new UnauthorizedError('Tenant Admin authority required');
      }
      await mediaService.removeTenantLogo(req.tenantAdminContext.tenantId);
      res.json({ data: { success: true } });
    } catch (err) {
      next(err);
    }
  };

  uploadTenantBanner = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.tenantAdminContext || !req.user) {
        throw new UnauthorizedError('Tenant Admin authority required');
      }
      const upload = parseUploadFromRequest(req);
      const result = await mediaService.uploadTenantBanner(
        req.tenantAdminContext.tenantId,
        upload,
        req.user.id,
      );
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  };

  removeTenantBanner = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.tenantAdminContext) {
        throw new UnauthorizedError('Tenant Admin authority required');
      }
      await mediaService.removeTenantBanner(req.tenantAdminContext.tenantId);
      res.json({ data: { success: true } });
    } catch (err) {
      next(err);
    }
  };

  uploadCompanyLogo = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.tenantAdminContext || !req.tenantAdminCompanyContext || !req.user) {
        throw new UnauthorizedError('Tenant Admin company authority required');
      }
      const upload = parseUploadFromRequest(req);
      const result = await mediaService.uploadCompanyLogo(
        req.tenantAdminContext.tenantId,
        req.tenantAdminCompanyContext.id,
        upload,
        req.user.id,
      );
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  };

  removeCompanyLogo = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.tenantAdminContext || !req.tenantAdminCompanyContext) {
        throw new UnauthorizedError('Tenant Admin company authority required');
      }
      await mediaService.removeCompanyLogo(
        req.tenantAdminContext.tenantId,
        req.tenantAdminCompanyContext.id,
      );
      res.json({ data: { success: true } });
    } catch (err) {
      next(err);
    }
  };

  updateCompanyBranding = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.tenantAdminContext || !req.tenantAdminCompanyContext) {
        throw new UnauthorizedError('Tenant Admin company authority required');
      }
      const rawMode = req.body?.brandingMode;
      if (rawMode !== 'own_logo' && rawMode !== 'tenant_logo' && rawMode !== 'initials') {
        throw new BadRequestError('Valid brandingMode is required (own_logo, tenant_logo, initials)');
      }
      const result = await mediaService.updateCompanyBranding(
        req.tenantAdminContext.tenantId,
        req.tenantAdminCompanyContext.id,
        rawMode,
      );
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  };

  listCompanyAccessUsers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.tenantAdminContext || !req.tenantAdminCompanyContext) {
        throw new UnauthorizedError('Tenant Admin company authority required');
      }
      const users = await this.service.listCompanyAccessUsers(
        req.tenantAdminContext.tenantId,
        req.tenantAdminCompanyContext.id,
      );
      res.json({ data: users });
    } catch (err) {
      next(err);
    }
  };

  listAvailableTenantUsers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.tenantAdminContext || !req.tenantAdminCompanyContext) {
        throw new UnauthorizedError('Tenant Admin company authority required');
      }
      const users = await this.service.listAvailableTenantUsers(
        req.tenantAdminContext.tenantId,
        req.tenantAdminCompanyContext.id,
      );
      res.json({ data: users });
    } catch (err) {
      next(err);
    }
  };

  assignCompanyUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.tenantAdminContext || !req.tenantAdminCompanyContext || !req.user) {
        throw new UnauthorizedError('Tenant Admin company authority required');
      }
      const dto = validateAssignCompanyUser(req.body);
      const result = await this.service.assignExistingTenantUser(
        req.tenantAdminContext.tenantId,
        req.tenantAdminCompanyContext.id,
        dto,
        req.user,
      );
      res.status(201).json({ data: result });
    } catch (err) {
      next(err);
    }
  };

  inviteCompanyUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.tenantAdminContext || !req.tenantAdminCompanyContext || !req.user) {
        throw new UnauthorizedError('Tenant Admin company authority required');
      }
      const dto = validateInviteCompanyUser(req.body);
      const result = await this.service.inviteUserToCompany(
        req.tenantAdminContext.tenantId,
        req.tenantAdminCompanyContext.id,
        dto,
        req.user,
      );
      res.status(201).json({ data: result });
    } catch (err) {
      next(err);
    }
  };

  updateCompanyUserRole = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.tenantAdminContext || !req.tenantAdminCompanyContext || !req.user) {
        throw new UnauthorizedError('Tenant Admin company authority required');
      }
      const rawUserId = req.params.userId;
      const userId = typeof rawUserId === 'string' ? rawUserId.trim() : Array.isArray(rawUserId) ? String(rawUserId[0]).trim() : undefined;
      if (!userId) {
        throw new BadRequestError('User ID is required');
      }
      const dto = validateUpdateCompanyUserRole(req.body);
      const result = await this.service.updateCompanyUserRole(
        req.tenantAdminContext.tenantId,
        req.tenantAdminCompanyContext.id,
        userId,
        dto.role,
        req.user,
      );
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  };

  revokeCompanyUserAccess = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.tenantAdminContext || !req.tenantAdminCompanyContext || !req.user) {
        throw new UnauthorizedError('Tenant Admin company authority required');
      }
      const rawUserId = req.params.userId;
      const userId = typeof rawUserId === 'string' ? rawUserId.trim() : Array.isArray(rawUserId) ? String(rawUserId[0]).trim() : undefined;
      if (!userId) {
        throw new BadRequestError('User ID is required');
      }
      const result = await this.service.revokeCompanyAccess(
        req.tenantAdminContext.tenantId,
        userId,
        req.tenantAdminCompanyContext.id,
        req.user,
      );
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  };

  resendCompanyInvitation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.tenantAdminContext || !req.tenantAdminCompanyContext || !req.user) {
        throw new UnauthorizedError('Tenant Admin company authority required');
      }
      const rawInvId = req.params.invitationId;
      const invitationId = typeof rawInvId === 'string' ? rawInvId.trim() : Array.isArray(rawInvId) ? String(rawInvId[0]).trim() : undefined;
      if (!invitationId) {
        throw new BadRequestError('Invitation ID is required');
      }
      const result = await this.service.resendCompanyInvitation(
        req.tenantAdminContext.tenantId,
        req.tenantAdminCompanyContext.id,
        invitationId,
        req.user,
      );
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  };

  cancelCompanyInvitation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.tenantAdminContext || !req.tenantAdminCompanyContext || !req.user) {
        throw new UnauthorizedError('Tenant Admin company authority required');
      }
      const rawInvId = req.params.invitationId;
      const invitationId = typeof rawInvId === 'string' ? rawInvId.trim() : Array.isArray(rawInvId) ? String(rawInvId[0]).trim() : undefined;
      if (!invitationId) {
        throw new BadRequestError('Invitation ID is required');
      }
      const result = await this.service.cancelCompanyInvitation(
        req.tenantAdminContext.tenantId,
        req.tenantAdminCompanyContext.id,
        invitationId,
        req.user,
      );
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  };

  getCompanyRolesOverview = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.tenantAdminContext || !req.tenantAdminCompanyContext) {
        throw new UnauthorizedError('Tenant Admin company authority required');
      }
      const roles = await this.service.getCompanyRolesOverview(
        req.tenantAdminContext.tenantId,
        req.tenantAdminCompanyContext.id,
      );
      res.json({ data: roles });
    } catch (err) {
      next(err);
    }
  };
}

export const tenantAdminController = new TenantAdminController();
