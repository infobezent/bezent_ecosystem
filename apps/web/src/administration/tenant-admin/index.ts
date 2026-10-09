import type { BezentApplication } from '../../shared/types/application';
import { tenantAdminNavigation } from './navigation/tenantAdminNavigation';
import {
  TENANT_ADMIN_BASE_PATH,
  TENANT_ADMIN_DEFAULT_DESTINATION_ID,
  tenantAdminRoutes,
} from './routes/tenantAdminRoutes';

export * from './types/tenantAdmin.types';
export * from './api/tenantAdminApi';
export * from './context/TenantAdminContext';
export * from './navigation/tenantAdminNavigation';
export * from './routes/tenantAdminRoutes';

/**
 * Tenant Admin Platform Application Definition
 * Registered in global application catalog (applications.ts) inside canonical AppShell.
 */
export const tenantAdminApplication: BezentApplication = {
  id: 'tenant-admin',
  label: 'Tenant Admin',
  basePath: TENANT_ADMIN_BASE_PATH,
  defaultDestinationId: TENANT_ADMIN_DEFAULT_DESTINATION_ID,
  navigation: tenantAdminNavigation,
  routes: tenantAdminRoutes,
};
