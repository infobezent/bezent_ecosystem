import type { Request, Response, NextFunction } from 'express';
import {
  AppError,
  BadRequestError,
  ForbiddenError,
  UnauthorizedError,
} from '../../../app/errors/AppError.js';
import {
  accessResolverService,
  FORBIDDEN_COMPANY_ACCESS,
} from '../service/accessResolver.service.js';
import { findPermission, type WorkspaceId } from '../catalog/accessCatalog.js';
import type { ModuleCode } from '../../modules/types/module.types.js';
import type { CompanyAccess } from '../types/access.types.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /** Server-resolved access for the selected company (requireCompanyContext). */
      access?: CompanyAccess;
    }
  }
}

/** The selected company as sent by the client — a claim, validated before use. */
export function readRequestedCompanyId(req: Request): string | undefined {
  const raw = req.headers['x-company-id'] || req.params.companyId || req.query.companyId;
  if (!raw) return undefined;
  const value = Array.isArray(raw) ? String(raw[0]) : String(raw);
  return value.trim() || undefined;
}

/**
 * Resolves and validates the selected company on EVERY request (ADR-017).
 * The client-supplied company id is never trusted: membership, company and
 * tenant status, roles and entitlements are re-evaluated from MySQL, so a
 * revoked role or membership takes effect on the next request.
 * Requires `requirePlatformAuth` first.
 */
export async function requireCompanyContext(req: Request, _res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required');
    }
    const companyId = readRequestedCompanyId(req);
    if (!companyId) {
      throw new BadRequestError('Active company context (X-Company-Id header) is required');
    }

    const access = await accessResolverService.resolveCompanyAccess(req.user, companyId);
    req.access = access;
    req.companyContext = { tenantId: access.tenantId, companyId: access.companyId };
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Requires that the selected company grants a workspace. Both "not a member
 * of this company" and "no permission for this workspace" surface as the
 * same `code`, so the response never reveals which one applies.
 * Use after `requirePlatformAuth`; it resolves the company context itself.
 */
export function requireWorkspace(workspace: WorkspaceId, code: string, message: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    requireCompanyContext(req, res, (err?: unknown) => {
      if (err) {
        if (err instanceof AppError && err.code === FORBIDDEN_COMPANY_ACCESS) {
          return next(new ForbiddenError(message, code));
        }
        return next(err);
      }
      if (!req.access?.workspaces.includes(workspace)) {
        return next(new ForbiddenError(message, code));
      }
      next();
    });
  };
}

/**
 * Guards a whole business application's API (e.g. `/api/v1/hrms`): the
 * selected company is validated, the application must be entitled for it
 * (`MODULE_DISABLED` otherwise, so direct calls to a disabled module fail),
 * and the caller's effective permissions must grant the workspace. Per-route
 * `requirePermission` checks then apply on top.
 * Use after `requirePlatformAuth`.
 */
export function requireApplicationAccess(moduleCode: ModuleCode, workspace: WorkspaceId) {
  return (req: Request, res: Response, next: NextFunction) => {
    requireCompanyContext(req, res, (err?: unknown) => {
      if (err) return next(err);
      const access = req.access!;
      if (!access.enabledModules.includes(moduleCode)) {
        return next(
          new ForbiddenError(
            `Application '${moduleCode}' is not enabled for this company`,
            'MODULE_DISABLED',
          ),
        );
      }
      if (!access.workspaces.includes(workspace)) {
        return next(
          new ForbiddenError(
            `You do not have access to '${moduleCode}' in this company`,
            'FORBIDDEN_WORKSPACE',
          ),
        );
      }
      next();
    });
  };
}

/**
 * Enforces effective module entitlement for a specific business module within an entitled application
 * (e.g. `requireModuleEntitlement('hrms', 'leave')`).
 * Reuses existing effectiveEntitlementService without introducing a second engine.
 */
export function requireModuleEntitlement(applicationCode: 'hrms' | 'crm' | 'project_management', moduleKey: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    requireCompanyContext(req, res, async (err?: unknown) => {
      if (err) return next(err);
      const access = req.access!;
      if (!access.enabledModules.includes(applicationCode)) {
        return next(
          new ForbiddenError(
            `Application '${applicationCode}' is not enabled for this company`,
            'MODULE_DISABLED',
          ),
        );
      }
      try {
        const { effectiveEntitlementService } = await import(
          '../../entitlements/service/effectiveEntitlement.service.js'
        );
        const eff = await effectiveEntitlementService.resolveEffectiveEntitlements(
          access.tenantId,
          applicationCode,
          access.companyId,
        );
        const targetModule = eff.modules.find((m) => m.moduleCode === moduleKey);
        if (targetModule && !targetModule.isEnabled) {
          return next(
            new ForbiddenError(
              `Module '${moduleKey}' in application '${applicationCode}' is not entitled for this tenant`,
              'MODULE_ENTITLEMENT_DENIED',
            ),
          );
        }
        next();
      } catch (e) {
        next(e);
      }
    });
  };
}

function matchesPermission(held: string[], required: string): boolean {
  if (held.includes(required)) return true;
  const def = findPermission(required);
  if (!def) return false;
  if (held.includes(def.id)) return true;
  return Boolean(def.aliases?.some((a) => held.includes(a)));
}

function checkPermissions(permissions: string[], mode: 'all' | 'any') {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.access) {
      return next(new UnauthorizedError('Company context has not been resolved'));
    }
    const held = req.access.permissions;
    const ok =
      mode === 'all'
        ? permissions.every((p) => matchesPermission(held, p))
        : permissions.some((p) => matchesPermission(held, p));
    if (!ok) {
      const label = permissions.map((p) => `'${p}'`).join(mode === 'all' ? ' and ' : ' or ');
      return next(new ForbiddenError(`Permission ${label} is required`, 'FORBIDDEN_PERMISSION'));
    }
    next();
  };
}

/** Deny-by-default permission check against the resolved company access. */
export function requirePermission(permission: string) {
  return checkPermissions([permission], 'all');
}

/** Passes when the caller holds at least one of the permissions (e.g. shared read access). */
export function requireAnyPermission(...permissions: string[]) {
  return checkPermissions(permissions, 'any');
}

/**
 * Router-level guard for a resource prefix: safe reads (GET/HEAD) need any of
 * `readPermissions`; every other method needs `writePermission`. Mounting it on
 * the prefix covers routes added later, keeping the router deny-by-default.
 */
export function requireReadWrite(readPermissions: string[], writePermission: string) {
  const read = checkPermissions(readPermissions, 'any');
  const write = checkPermissions([writePermission], 'all');
  return (req: Request, res: Response, next: NextFunction) =>
    req.method === 'GET' || req.method === 'HEAD' ? read(req, res, next) : write(req, res, next);
}
