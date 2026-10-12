import type { BezentApplication } from '../../../shared/types/application';
import { essNavigation } from './navigation/essNavigation';
import { ESS_BASE_PATH, ESS_DEFAULT_DESTINATION_ID, essRoutes } from './routes/essRoutes';

export * from './api/essApi';
export * from './context/EssContext';
export * from './navigation/essNavigation';
export * from './routes/essRoutes';

/**
 * Employee Self Service (ESS) Business Application Definition.
 * ESS is a permission-scoped experience within the HRMS business application —
 * not a separate application. Each employee accesses their personal workspace here.
 * Registered in the global application catalog (applications.ts) alongside the shell.
 */
export const essApplication: BezentApplication = {
  id: 'ess',
  label: 'Employee Self Service',
  basePath: ESS_BASE_PATH,
  defaultDestinationId: ESS_DEFAULT_DESTINATION_ID,
  navigation: essNavigation,
  routes: essRoutes,
};
