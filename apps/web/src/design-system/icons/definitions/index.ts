import type { IconDefinition } from '../types';
import { GLOBAL_ICON_DEFINITIONS } from './global';
import { HRMS_ICON_DEFINITIONS } from './hrms';
import { CRM_ICON_DEFINITIONS } from './crm';
import { PM_ICON_DEFINITIONS } from './pm';

/**
 * The canonical icon registry: one concept, one definition. Split into
 * per-category source files (global/hrms/crm/pm) purely for file size —
 * this merged map is the single source every lookup goes through. See
 * docs/architecture/ICON-SYSTEM.md.
 */
export const ICON_DEFINITIONS: Record<string, IconDefinition> = {
  ...GLOBAL_ICON_DEFINITIONS,
  ...HRMS_ICON_DEFINITIONS,
  ...CRM_ICON_DEFINITIONS,
  ...PM_ICON_DEFINITIONS,
};

export type BezentIconName = keyof typeof ICON_DEFINITIONS;
