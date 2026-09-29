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
import type { WorkspaceId } from '../catalog/accessCatalog.js';
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

/** Deny-by-default permission check against the resolved company access. */
export function requirePermission(permission: string) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.access) {
      return next(new UnauthorizedError('Company context has not been resolved'));
    }
    if (!req.access.permissions.includes(permission)) {
      return next(
        new ForbiddenError(`Permission '${permission}' is required`, 'FORBIDDEN_PERMISSION'),
      );
    }
    next();
  };
}
