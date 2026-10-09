import type { BezentApplication } from '../../shared/types/application';
import { superAdminNavigation } from './navigation/superAdminNavigation';
import {
  SUPER_ADMIN_BASE_PATH,
  SUPER_ADMIN_DEFAULT_DESTINATION_ID,
  superAdminRoutes,
} from './routes/superAdminRoutes';

export * from './api/superAdminApi';
export * from './context/SuperAdminAuthContext';
export * from './navigation/superAdminNavigation';
export * from './routes/superAdminRoutes';

/**
 * Super Admin Platform Application Definition
 * Registered in global application catalog (apps.ts) inside canonical AppShell.
 */
export const superAdminApplication: BezentApplication = {
  id: 'super-admin',
  label: 'Super Admin',
  basePath: SUPER_ADMIN_BASE_PATH,
  defaultDestinationId: SUPER_ADMIN_DEFAULT_DESTINATION_ID,
  navigation: superAdminNavigation,
  routes: superAdminRoutes,
};
