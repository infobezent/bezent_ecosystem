import type { Request, Response, NextFunction } from 'express';
import { eq, and, or, sql, isNull } from 'drizzle-orm';
import { authService } from '../service/auth.service.js';
import {
  UnauthorizedError,
  ForbiddenError,
  BadRequestError,
  NotFoundError,
} from '../../../app/errors/AppError.js';
import { getDb } from '../../../db/connection.js';
import { companies, tenants, employees } from '../../../db/schema.js';
import type { AuthenticatedUser } from '../types/auth.types.js';
import type { CompanyContext } from '../../access/types/access.types.js';
import { moduleService } from '../../modules/service/module.service.js';

export interface EmployeeContext {
  id: string;
  tenantId: string;
  companyId: string;
  employeeNumber: string;
  firstName: string;
  lastName: string | null;
  email: string;
  departmentId: string | null;
  designationId: string | null;
  locationId: string | null;
  reportingManagerId: string | null;
  employmentType: string;
  employmentStatus: string;
  joiningDate: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      sessionToken?: string;
      companyContext?: CompanyContext;
      employeeContext?: EmployeeContext;
    }
  }
}

export async function requirePlatformAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Authentication token required');
    }

    const token = authHeader.substring(7).trim();
    if (!token) {
      throw new UnauthorizedError('Authentication token required');
    }

    const user = await authService.validateToken(token);
    req.user = user;
    req.sessionToken = token;
    next();
  } catch (err) {
    next(err);
  }
}

export function requireSuperAdmin(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) {
    return next(new UnauthorizedError('Authentication required'));
  }

  if (!req.user.isSuperAdmin) {
    return next(new ForbiddenError('Super Admin privileges required'));
  }

  next();
}

/**
 * ESS Authentication & Employee Context Middleware
 * Enforces:
 * 1. Valid platform authentication (req.user).
 * 2. Active company context (via X-Company-Id or user's active membership).
 * 3. Non-suspended company and tenant.
 * 4. Resolves the Employee record associated with this User account.
 * 5. Binds req.employeeContext and req.companyContext.
 */
export async function requireEssAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required');
    }

    const rawCompanyId = req.headers['x-company-id'] || req.params.companyId || req.query.companyId;

    let companyId: string | undefined;

    if (rawCompanyId) {
      companyId =
        typeof rawCompanyId === 'string'
          ? rawCompanyId
          : Array.isArray(rawCompanyId)
            ? String(rawCompanyId[0])
            : String(rawCompanyId);
    } else {
      // Default to user's first active company membership if only one exists
      const activeMemberships = req.user.memberships.filter((m) => m.status === 'active');
      if (activeMemberships.length === 1 && activeMemberships[0]) {
        companyId = activeMemberships[0].companyId;
      } else if (activeMemberships.length > 1) {
        throw new BadRequestError('Active company context (X-Company-Id header) is required');
      } else {
        throw new ForbiddenError('No active company membership found for user');
      }
    }

    // A client-supplied company is only honoured when the user holds an active
    // membership in it (req.user.memberships contains active rows only).
    const membership = req.user.memberships.find((m) => m.companyId === companyId);
    if (!membership) {
      throw new ForbiddenError(
        'No active membership in the selected company',
        'FORBIDDEN_COMPANY_ACCESS',
      );
    }

    const db = getDb();
    const [comp] = await db.select().from(companies).where(eq(companies.id, companyId));
    if (!comp || comp.tenantId !== membership.tenantId) {
      throw new ForbiddenError(
        'No active membership in the selected company',
        'FORBIDDEN_COMPANY_ACCESS',
      );
    }
    if (comp.status === 'suspended') {
      throw new ForbiddenError(
        'Company account is suspended. Please contact company administration.',
        'COMPANY_SUSPENDED',
      );
    }

    const [tent] = await db.select().from(tenants).where(eq(tenants.id, comp.tenantId));
    if (!tent) {
      throw new NotFoundError(`Tenant '${comp.tenantId}' not found`);
    }
    if (tent.status === 'suspended') {
      throw new ForbiddenError(
        'Tenant organization is suspended. Please contact platform administration.',
        'TENANT_SUSPENDED',
      );
    }

    // Resolve the Employee record in this company. An email match is only a
    // candidate for an UNLINKED record; a record already linked to another
    // User is never claimable by email.
    const [emp] = await db
      .select()
      .from(employees)
      .where(
        and(
          eq(employees.tenantId, comp.tenantId),
          eq(employees.companyId, companyId),
          or(
            eq(employees.userId, req.user.id),
            and(
              isNull(employees.userId),
              eq(sql`LOWER(${employees.email})`, req.user.email.toLowerCase()),
            ),
          ),
        ),
      );

    if (!emp) {
      throw new ForbiddenError(
        'No eligible employee record associated with this account in the selected company',
        'ESS_NOT_ELIGIBLE',
      );
    }

    if (emp.employmentStatus === 'terminated' || emp.employmentStatus === 'suspended') {
      throw new ForbiddenError('Employee account is inactive or suspended', 'EMPLOYEE_INACTIVE');
    }

    // ESS is an HRMS experience: it follows the HRMS entitlement.
    if (!(await moduleService.isModuleEnabled(comp.tenantId, 'hrms', comp.id))) {
      throw new ForbiddenError('HRMS is not enabled for this company', 'MODULE_DISABLED');
    }

    // If userId was not linked yet, establish IAM bridge. The IS NULL guard
    // keeps a concurrent link by another User from being overwritten.
    if (!emp.userId) {
      await db
        .update(employees)
        .set({ userId: req.user.id })
        .where(and(eq(employees.id, emp.id), isNull(employees.userId)));
    }

    req.companyContext = {
      tenantId: comp.tenantId,
      companyId: comp.id,
    };

    req.employeeContext = {
      id: emp.id,
      tenantId: emp.tenantId,
      companyId: emp.companyId,
      employeeNumber: emp.employeeNumber,
      firstName: emp.firstName,
      lastName: emp.lastName,
      email: emp.email,
      departmentId: emp.departmentId,
      designationId: emp.designationId,
      locationId: emp.locationId,
      reportingManagerId: emp.reportingManagerId,
      employmentType: emp.employmentType,
      employmentStatus: emp.employmentStatus,
      joiningDate: emp.joiningDate,
    };

    next();
  } catch (err) {
    next(err);
  }
}
