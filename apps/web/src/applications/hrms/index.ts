import type { BezentApplication } from '../../shared/types/application';
import { hrmsNavigation } from './navigation';
import { HRMS_BASE_PATH, HRMS_DEFAULT_DESTINATION_ID, hrmsRoutes } from './routes';

/** What HRMS hands the global app: identity, navigation catalog, routes. */
export const hrmsApplication: BezentApplication = {
  id: 'hrms',
  label: 'HRMS',
  basePath: HRMS_BASE_PATH,
  defaultDestinationId: HRMS_DEFAULT_DESTINATION_ID,
  navigation: hrmsNavigation,
  routes: hrmsRoutes,
};
