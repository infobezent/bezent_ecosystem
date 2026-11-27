import { ForbiddenError } from '../../../../app/errors/AppError.js';
import {
  attendanceSettingsRepository,
  type AttendanceSettingsRepository,
} from '../repository/attendanceSettings.repository.js';
import type { ManualCorrectionInput, ManualEntryConfig } from '../types/attendance.types.js';

/**
 * Applies the company's "Manual attendance entry" settings (HR Settings ->
 * Attendance -> General) to an administrator's manual correction request.
 *
 * Only the interactive admin endpoint calls this. Internal callers (for example
 * applying an already-approved regularization) do not pass an actor and are
 * never blocked here.
 */

export interface ManualEntryActor {
  /** System role codes held in the selected company (hr_manager, manager, company_admin, ...). */
  roleCodes: string[];
  isSuperAdmin: boolean;
  isTenantAdmin: boolean;
  /** The actor's own employee record, when linked (used for team-scoping a reporting manager). */
  employeeId: string | null;
}

/** True when the actor's only settings-role is 'reporting_manager' -- team-scoped, not company-wide (audit finding C4). */
export function isTeamScopedActor(actor: ManualEntryActor): boolean {
  const roles = actorSettingsRoles(actor);
  return roles.length > 0 && roles.every((r) => r === 'reporting_manager');
}

export type ManualEntryMethod = 'actual_times' | 'full_day_admin' | 'half_day_admin';

const DEFAULT_MANUAL_ENTRY_CONFIG: ManualEntryConfig = {
  allowedRoles: ['hr', 'reporting_manager', 'company_admin'],
  allowedMethods: ['actual_times', 'full_day_admin', 'half_day_admin'],
  approvalMode: 'approval_required',
  requireReason: true,
};

/** Settings use short role names; the access system uses system role codes. */
const SETTINGS_ROLE_BY_ROLE_CODE: Record<string, string> = {
  hr_manager: 'hr',
  manager: 'reporting_manager',
  company_admin: 'company_admin',
};

export function resolveManualEntryMethod(input: ManualCorrectionInput): ManualEntryMethod {
  if (input.checkInTime || input.checkOutTime) return 'actual_times';
  return input.status === 'half_day' ? 'half_day_admin' : 'full_day_admin';
}

export function actorSettingsRoles(actor: ManualEntryActor): string[] {
  const roles = new Set<string>();
  for (const code of actor.roleCodes) {
    const mapped = SETTINGS_ROLE_BY_ROLE_CODE[code];
    if (mapped) roles.add(mapped);
  }
  if (actor.isTenantAdmin) roles.add('company_admin');
  if (actor.isSuperAdmin) roles.add('super_admin');
  return [...roles];
}

export class AttendanceManualEntryService {
  constructor(
    private readonly settingsRepo: AttendanceSettingsRepository = attendanceSettingsRepository,
  ) {}

  /**
   * Throws when manual entry is not permitted. Otherwise returns whether a
   * reason is mandatory, the employee id a team-scoped reporting manager must
   * be restricted to (null for HR/company_admin/super_admin, who see the
   * whole company), and whether approvalMode requires routing this through
   * the approval pipeline instead of applying it directly (audit finding C4:
   * approvalMode was stored but never read).
   */
  async assertAllowed(
    tenantId: string,
    companyId: string,
    input: ManualCorrectionInput,
    actor: ManualEntryActor,
  ): Promise<{
    reasonRequired: boolean;
    teamScopeManagerId: string | null;
    requiresApproval: boolean;
  }> {
    const settings = await this.settingsRepo.getGeneralSettings(tenantId, companyId);
    const config = settings?.manualEntryConfig ?? DEFAULT_MANUAL_ENTRY_CONFIG;

    if (settings && !settings.manualEntryAllowed) {
      throw new ForbiddenError(
        'Manual attendance entry is disabled in company attendance settings.',
        'MANUAL_ENTRY_DISABLED',
      );
    }

    const permittedRoles = config.allowedRoles ?? DEFAULT_MANUAL_ENTRY_CONFIG.allowedRoles;
    if (!actorSettingsRoles(actor).some((role) => permittedRoles.includes(role))) {
      throw new ForbiddenError(
        'Your role is not permitted to enter attendance manually.',
        'MANUAL_ENTRY_ROLE_NOT_ALLOWED',
      );
    }

    const method = resolveManualEntryMethod(input);
    const permittedMethods = config.allowedMethods ?? DEFAULT_MANUAL_ENTRY_CONFIG.allowedMethods;
    if (!permittedMethods.includes(method)) {
      throw new ForbiddenError(
        `Manual entry method '${method}' is not enabled in company attendance settings.`,
        'MANUAL_ENTRY_METHOD_NOT_ALLOWED',
      );
    }

    const teamScoped = isTeamScopedActor(actor);
    return {
      reasonRequired: config.requireReason ?? true,
      teamScopeManagerId: teamScoped ? actor.employeeId : null,
      requiresApproval: teamScoped && config.approvalMode === 'approval_required',
    };
  }
}

export const attendanceManualEntryService = new AttendanceManualEntryService();
