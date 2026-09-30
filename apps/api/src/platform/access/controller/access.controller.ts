import type { Request, Response, NextFunction } from 'express';
import { accessResolverService, AccessResolverService } from '../service/accessResolver.service.js';
import { roleManagementService, RoleManagementService } from '../service/roleManagement.service.js';
import {
  validateAssignRole,
  validateCreateCustomRole,
  validateRoleStatus,
  validateUpdateCustomRole,
} from '../validation/access.schema.js';
import { PERMISSION_CATALOG, PERMISSION_GROUP_LABELS } from '../catalog/accessCatalog.js';
import { AppError, UnauthorizedError } from '../../../app/errors/AppError.js';
import type {
  AccessActor,
  CompanyAccess,
  PermissionDirectoryEntry,
} from '../types/access.types.js';

function requireAccess(req: Request): CompanyAccess {
  if (!req.access) throw new UnauthorizedError('Company context has not been resolved');
  return req.access;
}

function actorOf(req: Request): AccessActor {
  if (!req.user) throw new UnauthorizedError('Authentication required');
  return { id: req.user.id, email: req.user.email };
}

function requireParam(req: Request, name: string): string {
  const raw = req.params[name];
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value) throw new AppError(`${name} is required`, 400, 'VALIDATION_ERROR');
  return value;
}

export class AccessController {
  constructor(
    private readonly resolver: AccessResolverService = accessResolverService,
    private readonly roles: RoleManagementService = roleManagementService,
  ) {}

  /** GET /platform/access — the signed-in user's companies and workspaces. */
  getOverview = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      res.json({ data: await this.resolver.resolveOverview(req.user) });
    } catch (err) {
      next(err);
    }
  };

  /** GET /platform/access/context — validated access for the selected company. */
  getCompanyContext = (req: Request, res: Response, next: NextFunction) => {
    try {
      res.json({ data: requireAccess(req) });
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /platform/access/permissions — the permission directory. Platform
   * permissions are listed only for a platform Super Admin.
   */
  getPermissionDirectory = (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const isSuperAdmin = req.user.isSuperAdmin;
      const entries: PermissionDirectoryEntry[] = PERMISSION_CATALOG.filter(
        (p) => isSuperAdmin || p.scope !== 'platform',
      ).map((p) => ({
        id: p.id,
        group: p.group,
        groupLabel: PERMISSION_GROUP_LABELS[p.group],
        scope: p.scope,
        label: p.label,
        description: p.description,
        moduleCode: p.moduleCode,
      }));
      res.json({ data: entries });
    } catch (err) {
      next(err);
    }
  };

  listAssignablePermissions = (req: Request, res: Response, next: NextFunction) => {
    try {
      res.json({ data: this.roles.listAssignablePermissions(requireAccess(req)) });
    } catch (err) {
      next(err);
    }
  };

  getPermissionTree = (req: Request, res: Response, next: NextFunction) => {
    try {
      res.json({ data: this.roles.getPermissionTree(requireAccess(req)) });
    } catch (err) {
      next(err);
    }
  };

  listRoles = async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.json({ data: await this.roles.listRoles(requireAccess(req)) });
    } catch (err) {
      next(err);
    }
  };

  createCustomRole = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = validateCreateCustomRole(req.body);
      const role = await this.roles.createCustomRole(requireAccess(req), actorOf(req), input);
      res.status(201).json({ data: role });
    } catch (err) {
      next(err);
    }
  };

  updateCustomRole = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = validateUpdateCustomRole(req.body);
      const role = await this.roles.updateCustomRole(
        requireAccess(req),
        actorOf(req),
        requireParam(req, 'roleId'),
        input,
      );
      res.json({ data: role });
    } catch (err) {
      next(err);
    }
  };

  setCustomRoleStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const status = validateRoleStatus(req.body);
      const role = await this.roles.setCustomRoleStatus(
        requireAccess(req),
        actorOf(req),
        requireParam(req, 'roleId'),
        status,
      );
      res.json({ data: role });
    } catch (err) {
      next(err);
    }
  };

  getUserAccess = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.roles.getUserAccess(
        requireAccess(req),
        requireParam(req, 'userId'),
      );
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  };

  assignRole = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const roleId = validateAssignRole(req.body);
      const result = await this.roles.assignRole(
        requireAccess(req),
        actorOf(req),
        requireParam(req, 'userId'),
        roleId,
      );
      res.status(201).json({ data: result });
    } catch (err) {
      next(err);
    }
  };

  revokeRole = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.roles.revokeRole(
        requireAccess(req),
        actorOf(req),
        requireParam(req, 'userId'),
        requireParam(req, 'roleId'),
      );
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  };
}

export const accessController = new AccessController();
