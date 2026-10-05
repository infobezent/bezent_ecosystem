import { hrmsApplication } from '../../applications/hrms';
import { superAdminApplication } from '../../applications/super-admin';
import { tenantAdminApplication } from '../../applications/tenant-admin';
import { companyAdminApplication } from '../../applications/company-admin';
import { essApplication } from '../../applications/ess';
import type { BezentApplication } from '../../shared/types/application';

/**
 * The business applications mounted inside the global shell. Adding CRM or
 * Projects later means registering its `BezentApplication` here — the shell,
 * sidebar, sub-navigation and More launcher need no change.
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
