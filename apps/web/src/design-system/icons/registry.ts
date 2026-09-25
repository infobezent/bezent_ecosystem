import type { IconDefinition } from './types';
import { ICON_DEFINITIONS } from './definitions';

/**
 * Canonical concept mapping: resolves legacy/loose identifiers to the one
 * canonical icon key. Faithfully preserved from the old approved UI's
 * `iconRegistry.ts` `CANONICAL_CONCEPT_MAP`. This is the ONLY part of the
 * old `iconRegistry.ts` that belongs to the icon system — everything else
 * in that old file (`FIXED_PRIMARY_ITEMS`, `MODULE_CATALOG`,
 * `HRMS_PRIMARY_RAIL`, `isModulePermitted`, `getParentModuleForChild`,
 * etc.) was the HRMS navigation catalog and a permission check, not icon
 * data, and is deliberately NOT migrated here — see
 * docs/architecture/ICON-SYSTEM.md §5.
 */
export const CANONICAL_CONCEPT_MAP: Record<string, string> = {
  // Global & Shared
  dashboard: 'dashboard',
  overview: 'dashboard',
  'my tasks': 'tasks',
  tasks: 'tasks',
  task: 'tasks',
  checklist: 'tasks',
  approvals: 'approvals',
  approval: 'approvals',
  task_alt: 'approvals',
  calendar: 'calendar',
  events: 'calendar',
  schedule: 'calendar',
  notes: 'notes',
  description: 'notes',
  notifications: 'notifications',
  bell: 'notifications',
  search: 'search',
  filter: 'filter',
  filter_list: 'filter',
  announcements: 'announcements',
  campaign: 'announcements',
  help: 'help',
  help_outline: 'help',
  settings: 'settings',
  hrsettings: 'hrSettings',
  crmsettings: 'settings',
  pmsettings: 'settings',
  customize: 'settings',
  operations: 'operations',
  hub: 'operations',
  reports: 'reports',
  analytics: 'reports',
  documents: 'documents',
  docs: 'documents',
  document: 'documents',
  folders: 'documents',
  folder: 'documents',
  assets: 'assets',
  inventory_2: 'assets',
  requests: 'requests',
  assignment: 'requests',
  more: 'more',
  more_horiz: 'more',
  moreh: 'more',
  home: 'home',
  add: 'add',
  plus: 'add',
  edit: 'edit',
  delete: 'delete',
  security: 'security',
  sop: 'sop',

  // Shell Utilities
  "what's new": 'whatsNew',
  'whats new': 'whatsNew',
  whatsnew: 'whatsNew',
  badgeinfo: 'whatsNew',
  badge_info: 'whatsNew',
  explore: 'explore',
  rocket: 'explore',
  apps: 'apps',
  grid: 'apps',
  grid2x2: 'apps',
  'quick actions': 'apps',
  sparkles: 'sparkles',
  ai: 'sparkles',
  plussign: 'plusSign',
  chevronleft: 'chevronLeft',
  chevronright: 'chevronRight',
  moon: 'moon',
  sun: 'sun',
  close: 'close',
  chevronup: 'chevronUp',
  chevronUp: 'chevronUp',
  chevrondown: 'chevronDown',
  chevronDown: 'chevronDown',
  check: 'check',
  arrowright: 'arrowRight',
  clock: 'clock',
  arrowleft: 'arrowLeft',
  warning: 'warning',
  menu: 'menu',
  hamburger: 'menu',
  helpcircle: 'helpCircle',
  help_circle: 'helpCircle',
  gemini: 'gemini',
  pin: 'pin',

  // HRMS Concepts
  employees: 'employees',
  groups: 'employees',
  people: 'employees',
  directory: 'employees',
  'employee directory': 'employees',
  employeedirectory: 'employees',
  workforce: 'workforce',
  onboarding: 'onboarding',
  onboard: 'onboarding',
  person_add: 'onboarding',
  leave: 'leave',
  'leave tracker': 'leave',
  event_busy: 'leave',
  attendance: 'attendance',
  'time tracker': 'timeTracker',
  timetracker: 'timeTracker',
  timer: 'timeTracker',
  shifts: 'shifts',
  'shift management': 'shifts',
  date_range: 'shifts',
  timesheets: 'timesheets',
  payroll: 'payroll',
  compensation: 'compensation',
  benefits: 'benefits',
  performance: 'performance',
  perf: 'performance',
  trending_up: 'performance',
  goals: 'goals',
  reviews: 'reviews',
  learning: 'learning',
  school: 'learning',
  career: 'career',
  route: 'career',
  recruitment: 'recruitment',
  recruit: 'recruitment',
  work: 'recruitment',
  candidates: 'candidates',
  badge: 'candidates',
  interviews: 'interviews',
  event_available: 'interviews',
  jobopenings: 'jobOpenings',
  'job openings': 'jobOpenings',
  offers: 'offers',
  organization: 'organization',
  account_tree: 'organization',

  // CRM Concepts
  leads: 'leads',
  contacts: 'contacts',
  accounts: 'accounts',
  deals: 'deals',
  pipeline: 'pipeline',
  campaigns: 'campaigns',
  products: 'products',
  quotes: 'quotes',
  invoices: 'invoices',
  support: 'support',

  // Project Management (PM) Concepts
  projects: 'projects',
  planning: 'planning',
  milestones: 'milestones',
  risks: 'risks',
  issues: 'issues',
  changes: 'changes',
  delivery: 'delivery',
};

/**
 * Resolves any semantic or legacy icon name to its canonical
 * IconDefinition. Falls back to "dashboard" for an unknown name, matching
 * the old system's behavior — never throws for a bad dynamic string.
 */
export function getBezentIconDefinition(name: string): IconDefinition {
  const normalized = (name || '').toLowerCase().trim();
  const canonicalKey = CANONICAL_CONCEPT_MAP[normalized] || normalized;
  // "dashboard" is always present in ICON_DEFINITIONS (defined in
  // definitions/global.tsx) — the non-null assertion reflects that
  // guarantee under `noUncheckedIndexedAccess`, not an unchecked risk.
  return ICON_DEFINITIONS[canonicalKey] ?? ICON_DEFINITIONS.dashboard!;
}
