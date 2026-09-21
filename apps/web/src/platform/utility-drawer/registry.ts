import type { BezentIconName } from '../../design-system/icons';

/**
 * The global utility capabilities. This is the ONE definition every
 * consumer (the right rail, the host's drawer/panel switch) derives from.
 * It holds metadata only — no records, no renderers (which would make this
 * file import every capability).
 *
 * Old-UI evidence (`App.tsx` RIGHT_ITEMS / RIGHT_UTILITIES): the rail had
 * Tasks, Approvals, Calendar and a "Documents" button that actually opened
 * the Notes drawer (corrected to "Notes" in Phase 0B.8). Notifications was
 * never a rail item — it is the panel under the top-nav bell. See docs/architecture/GLOBAL-UTILITIES.md.
 */
export type UtilityCapabilityId = 'notifications' | 'approvals' | 'tasks' | 'calendar' | 'notes';

export type UtilityPlacement = 'rail' | 'topnav';

export interface UtilityCapabilityDefinition {
  id: UtilityCapabilityId;
  /** Accessible/tooltip name of the control that opens it. */
  label: string;
  /** Title shown while the drawer reveals. */
  title: string;
  icon: BezentIconName;
  /** Where its opening control lives. */
  placement: UtilityPlacement;
}

export const UTILITY_CAPABILITIES: readonly UtilityCapabilityDefinition[] = [
  { id: 'calendar', label: 'Calendar', title: 'Calendar', icon: 'calendar', placement: 'rail' },
  { id: 'notes', label: 'Notes', title: 'Notes', icon: 'notes', placement: 'rail' },
  { id: 'tasks', label: 'My Tasks', title: 'My Tasks', icon: 'tasks', placement: 'rail' },
  {
    id: 'approvals',
    label: 'Approvals',
    title: 'Approvals',
    icon: 'approvals',
    placement: 'rail',
  },
  {
    id: 'notifications',
    label: 'Notifications',
    title: 'Notifications',
    icon: 'notifications',
    placement: 'topnav',
  },
];

export function getUtilityCapability(id: UtilityCapabilityId): UtilityCapabilityDefinition {
  // Registry is exhaustive over UtilityCapabilityId by construction.
  return UTILITY_CAPABILITIES.find((c) => c.id === id)!;
}
