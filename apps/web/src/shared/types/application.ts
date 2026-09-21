import type { RouteObject } from 'react-router-dom';
import type { ApplicationNavigation } from './navigation';

/**
 * What a business application hands the global app: its identity, its
 * navigation catalog, and its routes. The shell is generic over this — it
 * never imports an application; `app/config/applications.ts` registers them.
 */
export interface BezentApplication {
  id: string;
  label: string;
  /** Mount path, e.g. `/hrms`. */
  basePath: string;
  /** Destination id opened when the base path is visited. */
  defaultDestinationId: string;
  navigation: ApplicationNavigation;
  /** Route objects rendered inside the shell workspace, relative to the root. */
  routes: RouteObject[];
}
