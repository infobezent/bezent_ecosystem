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
 * Delegated Company Administration Workspace Adapter (ADR-014, ADR-026).
 * Company Admin is an authority/scope within the Tenant Administration governance model,
 * not a separate commercial BEZENT Application.
 * This adapter mounts company-scoped administration routes under `/company-admin/*` with
 * strict company-boundary authorization.
 */
export const companyAdminApplication: BezentApplication = {
  id: 'company-admin',
  label: 'Company Admin',
  basePath: COMPANY_ADMIN_BASE_PATH,
  defaultDestinationId: COMPANY_ADMIN_DEFAULT_DESTINATION_ID,
  navigation: companyAdminNavigation,
  routes: companyAdminRoutes,
};
