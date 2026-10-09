import { hrmsApplication } from '../../applications/hrms';
import { superAdminApplication } from '../../administration/super-admin';
import { tenantAdminApplication } from '../../administration/tenant-admin';
import { companyAdminApplication } from '../../applications/company-admin';
import { essApplication } from '../../applications/hrms/ess';
import type { BezentApplication } from '../../shared/types/application';

/**
 * Commercial business applications: top-level business products (ADR-014).
 * CRM and Project Management join here when implemented.
 */
export const COMMERCIAL_APPLICATIONS: readonly BezentApplication[] = [
  hrmsApplication,
];

/**
 * All workspaces mounted inside the global AppShell.
 * Separates commercial business products from administrative workspaces (Super Admin,
 * Tenant Admin, delegated Company Admin) and employee experience (ESS).
 */
export const APPLICATIONS: readonly BezentApplication[] = [
  hrmsApplication,
  superAdminApplication,
  tenantAdminApplication,
  companyAdminApplication,
  essApplication,
];

/** Application opened at `/`. */
export const DEFAULT_APPLICATION: BezentApplication = hrmsApplication;

export function findApplicationByPath(pathname: string): BezentApplication | undefined {
  return APPLICATIONS.find(
    (app) => pathname === app.basePath || pathname.startsWith(`${app.basePath}/`),
  );
}
