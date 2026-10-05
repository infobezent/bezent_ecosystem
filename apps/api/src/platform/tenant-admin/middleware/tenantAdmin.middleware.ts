import type { Request, Response, NextFunction } from 'express';
import {
  UnauthorizedError,
  ForbiddenError,
  BadRequestError,
  NotFoundError,
} from '../../../app/errors/AppError.js';
import { tenantAdminRepository } from '../repository/tenantAdmin.repository.js';
import { tenantRepository } from '../../tenants/repository/tenant.repository.js';
import { companyRepository } from '../../companies/repository/company.repository.js';
import { accessResolverService } from '../../access/service/accessResolver.service.js';
import type { TenantRecord } from '../../tenants/types/tenant.types.js';
import type { CompanyRecord } from '../../companies/types/company.types.js';
import type { TenantAdminRecord } from '../types/tenantAdmin.types.js';

export interface TenantAdminRequestContext {
  tenantId: string;
  tenant: TenantRecord;
  tenantAdmin: TenantAdminRecord;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      tenantAdminContext?: TenantAdminRequestContext;
      tenantAdminCompanyContext?: CompanyRecord;
    }
  }
}

/**
 * Enforces valid Tenant Administrator authority for the authenticated user.
 * Derives and verifies tenant authority strictly server-side.
 *
 * Header `x-tenant-id` is treated only as a selection claim; it is strictly
 * verified against the user's active tenant admin records.
 */
export async function requireTenantAdmin(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required');
    }

    // Resolve caller's active tenant admin records from MySQL
    const activeAdmins = await tenantAdminRepository.listActiveByUser(req.user.id);
    if (!activeAdmins || activeAdmins.length === 0) {
      throw new ForbiddenError(
        'Tenant Administrator authority required',
        'TENANT_ADMIN_AUTHORITY_REQUIRED',
      );
    }

    // Check optional selection claim
    const rawClaim = req.headers['x-tenant-id'] || req.query.tenantId;
    const claimedTenantId =
      typeof rawClaim === 'string'
        ? rawClaim.trim()
        : Array.isArray(rawClaim)
          ? String(rawClaim[0]).trim()
          : undefined;

    let targetAdmin: TenantAdminRecord | undefined;
    if (claimedTenantId) {
      targetAdmin = activeAdmins.find((a) => a.tenantId === claimedTenantId);
      if (!targetAdmin) {
        throw new ForbiddenError(
          `Tenant Administrator authority required for tenant '${claimedTenantId}'`,
          'TENANT_ADMIN_AUTHORITY_REQUIRED',
        );
      }
    } else {
      // Default to first active tenant admin assignment
      targetAdmin = activeAdmins[0];
    }

    if (!targetAdmin) {
      throw new ForbiddenError(
        'Tenant Administrator authority required',
        'TENANT_ADMIN_AUTHORITY_REQUIRED',
      );
    }

    // Verify tenant exists and is active
    const tenant = await tenantRepository.findById(targetAdmin.tenantId);
    if (!tenant || tenant.status === 'suspended' || tenant.status === 'archived') {
      throw new ForbiddenError('Tenant account is not active', 'TENANT_NOT_ACTIVE');
    }

    req.tenantAdminContext = {
      tenantId: tenant.id,
      tenant,
      tenantAdmin: targetAdmin,
    };

    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Resolves and validates company context within the Tenant Administrator boundary.
 *
 * Invariants:
 * 1. Requires valid requireTenantAdmin first.
 * 2. Company must exist.
 * 3. Company must strictly belong to the verified tenant (req.tenantAdminContext.tenantId).
 *    Any cross-tenant attempt is rejected with 403 Forbidden.
 * 4. Binds req.tenantAdminCompanyContext and req.companyContext.
 */
export async function requireTenantAdminCompanyContext(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.tenantAdminContext) {
      throw new UnauthorizedError('Tenant Admin context must be resolved first');
    }

    const rawCompanyId =
      req.params.companyId || req.headers['x-company-id'] || req.query.companyId;
    const companyId =
      typeof rawCompanyId === 'string'
        ? rawCompanyId.trim()
        : Array.isArray(rawCompanyId)
          ? String(rawCompanyId[0]).trim()
          : undefined;

    if (!companyId) {
      throw new BadRequestError('Company ID is required', 'COMPANY_ID_REQUIRED');
    }

    const company = await companyRepository.findById(companyId);
    if (!company) {
      throw new NotFoundError(`Company '${companyId}' not found`);
    }

    // Cross-tenant boundary check: company must belong to caller's tenant
    if (company.tenantId !== req.tenantAdminContext.tenantId) {
      throw new ForbiddenError(
        'Requested company belongs to another tenant. Cross-tenant access is prohibited.',
        'CROSS_TENANT_COMPANY_ACCESS_DENIED',
      );
    }

    if (req.user) {
      const access = await accessResolverService.resolveCompanyAccess(req.user, company.id);
      req.access = access;
    }

    req.tenantAdminCompanyContext = company;
    req.companyContext = { tenantId: company.tenantId, companyId: company.id };

    next();
  } catch (err) {
    next(err);
  }
}
