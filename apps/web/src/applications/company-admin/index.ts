import type { BezentApplication } from '../../shared/types/application';
import { companyAdminNavigation } from './navigation/companyAdminNavigation';
import {
  COMPANY_ADMIN_BASE_PATH,
  COMPANY_ADMIN_DEFAULT_DESTINATION_ID,
  companyAdminRoutes,
} from './routes/companyAdminRoutes';

export * from './api/companyAdminApi';
export * from './context/CompanyAdminContext';
export * from './navigation/companyAdminNavigation';
export * from './routes/companyAdminRoutes';

/**
 * Company Admin Platform Application Definition
 * Registered in global application catalog (applications.ts) inside canonical AppShell.
 */
export const companyAdminApplication: BezentApplication = {
  id: 'company-admin',
  label: 'Company Admin',
  basePath: COMPANY_ADMIN_BASE_PATH,
  defaultDestinationId: COMPANY_ADMIN_DEFAULT_DESTINATION_ID,
  navigation: companyAdminNavigation,
  routes: companyAdminRoutes,
};
