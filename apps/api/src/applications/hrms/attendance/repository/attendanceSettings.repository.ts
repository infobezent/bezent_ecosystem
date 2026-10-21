import { and, desc, eq, gte, inArray, lte, sql } from 'drizzle-orm';
import { getDb } from '../../../../db/connection.js';
import {
  attendancePolicies,
  attendanceGeneralSettings,
  attendanceRegularizationSettings,
  attendanceDevices,
  attendanceImportBatches,
  attendanceSecuritySettings,
  attendancePayrollSettings,
  attendancePeriods,
  attendanceMonthlySummaries,
  attendanceRegularizations,
  employeeRequests,
  attendancePayrollHandoverBatches,
  attendanceSettingsAuditLogs,
  employees,
  departments,
  employeeWorkSchedules,
  type AttendancePolicy,
  type AttendanceRegularizationSettings,
  type AttendanceDevice,
  type AttendanceImportBatch,
  type AttendancePayrollSettings,
  type AttendancePeriod,
  type AttendancePayrollHandoverBatch,
  type AttendanceSettingsAuditLog,
} from '../../../../db/schema.js';
import { generateSurrogateId } from '../../../../platform/auth/security.js';
import type {
  UpdateAttendancePolicyInput,
  GeneralSettingsInput,
  RegularizationSettingsInput,
  DeviceInput,
  SecuritySettingsInput,
  PayrollSettingsInput,
  SettingsAuditFilter,
  AttendanceGeneralSettingsWithV1,
  AttendanceAlertSettings,
  CompanyShiftTemplate,
  ShiftRosterSettings,
  UpdateShiftRosterSettingsInput,
  CreateShiftInput,
  UpdateShiftInput,
  AttendanceSecuritySettingsWithRemote,
} from '../types/attendance.types.js';

export const DEFAULT_COMPANY_SHIFTS: CompanyShiftTemplate[] = [
  {
    id: 'shift_gen_std',
    name: 'General Shift',
    code: 'GEN-09',
    startTime: '09:00',
    endTime: '18:00',
    workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    breakMinutes: 60,
    lunchMinutes: 30,
    graceMinutes: 15,
    isOvernight: false,
    color: '#2563EB',
    description: 'Standard 9-hour daytime office shift with 60-min break allowance',
    isActive: true,
  },
  {
    id: 'shift_mor_06',
    name: 'Morning Shift',
    code: 'MOR-06',
    startTime: '06:00',
    endTime: '14:30',
    workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    breakMinutes: 45,
    lunchMinutes: 30,
    graceMinutes: 10,
    isOvernight: false,
    color: '#059669',
    description: 'Early morning operations and field support shift',
    isActive: true,
  },
  {
    id: 'shift_eve_14',
    name: 'Evening Shift',
    code: 'EVE-14',
    startTime: '14:00',
    endTime: '22:30',
    workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    breakMinutes: 45,
    lunchMinutes: 30,
    graceMinutes: 10,
    isOvernight: false,
    color: '#D97706',
    description: 'Afternoon to late evening operational shift',
    isActive: true,
  },
  {
    id: 'shift_nig_22',
    name: 'Night Shift',
    code: 'NIG-22',
    startTime: '22:00',
    endTime: '06:30',
    workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    breakMinutes: 60,
    lunchMinutes: 30,
    graceMinutes: 15,
    isOvernight: true,
    color: '#7C3AED',
    description: 'Overnight shift spanning across midnight to next morning',
    isActive: true,
  },
];

export class AttendanceSettingsRepository {
  /* ── 1. General Settings ────────────────────────────────────────── */

  async getGeneralSettings(
    tenantId: string,
    companyId: string,
  ): Promise<AttendanceGeneralSettingsWithV1 | null> {
    const db = getDb();
    const rows = await db
      .select()
      .from(attendanceGeneralSettings)
      .where(
        and(
          eq(attendanceGeneralSettings.tenantId, tenantId),
          eq(attendanceGeneralSettings.companyId, companyId),
        ),
      )
      .limit(1);
    const row = rows[0];
    if (!row) return null;

    const prefs = (row.alertPreferences ?? {}) as Record<string, unknown>;
    return {
      ...row,
      dayBoundaryMode:
        (prefs.dayBoundaryMode as AttendanceGeneralSettingsWithV1['dayBoundaryMode']) ??
        'shift_workday_based',
      unscheduledFallbackCutoff:
        (prefs.unscheduledFallbackCutoff as string) ?? row.dayBoundaryTime ?? '04:00:00',
      trackingStartDateReason: (prefs.trackingStartDateReason as string | null) ?? null,
      trackingStartDateEffectiveFrom:
        (prefs.trackingStartDateEffectiveFrom as string | null) ?? null,
      processingMode: (row.processingMode === 'realtime'
        ? 'automatic'
        : row.processingMode) as AttendanceGeneralSettingsWithV1['processingMode'],
      manualEntryConfig:
        (prefs.manualEntryConfig as AttendanceGeneralSettingsWithV1['manualEntryConfig']) ?? {
          allowedRoles: ['hr', 'reporting_manager', 'company_admin'],
          allowedMethods: ['actual_times', 'full_day_admin', 'half_day_admin'],
          approvalMode: 'approval_required',
          requireReason: true,
          requireAttachment: false,
        },
      // The DB enum only knows self_only/department/company, so the finer-grained
      // employee view (daily_only, monthly_summary_only, ...) lives in alertPreferences.
      employeeVisibility: ((prefs.employeeVisibilityMode as string | undefined) ??
        (row.employeeVisibility === 'self_only'
          ? 'daily_and_monthly'
          : row.employeeVisibility)) as AttendanceGeneralSettingsWithV1['employeeVisibility'],
      defaultHistoryView:
        (prefs.defaultHistoryView as AttendanceGeneralSettingsWithV1['defaultHistoryView']) ??
        'current_month',
      alertSettings: (prefs.alertSettings as AttendanceGeneralSettingsWithV1['alertSettings']) ?? {
        events: {
          missingPunch: {
            enabled: (prefs.notifyOnMissingPunch as boolean) ?? true,
            recipients: ['employee', 'reporting_manager'],
            channels: ['in_app', 'email'],
          },
          lateArrival: {
            enabled: (prefs.notifyOnLateArrival as boolean) ?? true,
            recipients: ['employee', 'reporting_manager'],
            channels: ['in_app', 'email'],
          },
          earlyExit: { enabled: false, recipients: ['employee'], channels: ['in_app'] },
          regularizationPending: {
            enabled: (prefs.notifyApproverOnRegularization as boolean) ?? true,
            recipients: ['assigned_approver', 'reporting_manager'],
            channels: ['in_app', 'email'],
          },
          exceptions: {
            enabled: true,
            recipients: ['reporting_manager', 'hr'],
            channels: ['in_app'],
          },
          onDutyPending: { enabled: true, recipients: ['assigned_approver'], channels: ['in_app'] },
          deviceSyncFailure: {
            enabled: true,
            recipients: ['device_admin', 'hr'],
            channels: ['in_app', 'email'],
          },
        },
        timing: {
          missingPunchDelayMinutes: 30,
          digestFrequency:
            (prefs.digestFrequency as 'instant' | 'daily' | 'weekly' | 'none') ?? 'daily',
          reminderIntervalHours: 24,
        },
        escalation: {
          enabled: false,
          deadlineHours: 48,
          targetRole: 'next_level_manager',
        },
      },
    };
  }

  async upsertGeneralSettings(
    tenantId: string,
    companyId: string,
    input: GeneralSettingsInput,
  ): Promise<AttendanceGeneralSettingsWithV1> {
    const db = getDb();
    const existing = await this.getGeneralSettings(tenantId, companyId);
    const existingPrefs = (existing?.alertPreferences as Record<string, unknown>) ?? {};

    const dayBoundaryMode = (input.dayBoundaryMode ??
      existingPrefs.dayBoundaryMode ??
      'shift_workday_based') as string;
    const unscheduledFallbackCutoff = (input.unscheduledFallbackCutoff ??
      input.dayBoundaryTime ??
      existingPrefs.unscheduledFallbackCutoff ??
      existing?.dayBoundaryTime ??
      '04:00:00') as string;
    const defaultHistoryView = (input.defaultHistoryView ??
      existingPrefs.defaultHistoryView ??
      'current_month') as string;
    const trackingStartDateReason = (input.trackingStartDateReason ??
      existingPrefs.trackingStartDateReason ??
      null) as string | null;
    const trackingStartDateEffectiveFrom = (input.trackingStartDateEffectiveFrom ??
      existingPrefs.trackingStartDateEffectiveFrom ??
      null) as string | null;
    const manualEntryConfig = input.manualEntryConfig ??
      existingPrefs.manualEntryConfig ?? {
        allowedRoles: ['hr', 'reporting_manager', 'company_admin'],
        allowedMethods: ['actual_times', 'full_day_admin', 'half_day_admin'],
        approvalMode: 'approval_required',
        requireReason: true,
        requireAttachment: false,
      };
    const alertSettings = (input.alertSettings ??
      existingPrefs.alertSettings ?? {
        events: {
          missingPunch: {
            enabled: true,
            recipients: ['employee', 'reporting_manager'],
            channels: ['in_app', 'email'],
          },
          lateArrival: {
            enabled: true,
            recipients: ['employee', 'reporting_manager'],
            channels: ['in_app', 'email'],
          },
          earlyExit: { enabled: false, recipients: ['employee'], channels: ['in_app'] },
          regularizationPending: {
            enabled: true,
            recipients: ['assigned_approver', 'reporting_manager'],
            channels: ['in_app', 'email'],
          },
          exceptions: {
            enabled: true,
            recipients: ['reporting_manager', 'hr'],
            channels: ['in_app'],
          },
          onDutyPending: { enabled: true, recipients: ['assigned_approver'], channels: ['in_app'] },
          deviceSyncFailure: {
            enabled: true,
            recipients: ['device_admin', 'hr'],
            channels: ['in_app', 'email'],
          },
        },
        timing: {
          missingPunchDelayMinutes: 30,
          digestFrequency: 'daily',
          reminderIntervalHours: 24,
        },
        escalation: {
          enabled: false,
          deadlineHours: 48,
          targetRole: 'next_level_manager',
        },
      }) as AttendanceAlertSettings;

    const mergedAlertPreferences = {
      ...existingPrefs,
      ...(input.alertPreferences ?? {}),
      dayBoundaryMode,
      unscheduledFallbackCutoff,
      defaultHistoryView,
      trackingStartDateReason,
      trackingStartDateEffectiveFrom,
      manualEntryConfig,
      alertSettings,
      employeeVisibilityMode: input.employeeVisibility ?? existingPrefs.employeeVisibilityMode,
      notifyOnMissingPunch: alertSettings?.events?.missingPunch?.enabled ?? true,
      notifyOnLateArrival: alertSettings?.events?.lateArrival?.enabled ?? true,
      notifyApproverOnRegularization: alertSettings?.events?.regularizationPending?.enabled ?? true,
      digestFrequency: alertSettings?.timing?.digestFrequency ?? 'daily',
    };

    // Calculate defaultHistoryViewDays based on defaultHistoryView
    let calculatedHistoryDays =
      typeof input.defaultHistoryViewDays === 'number'
        ? input.defaultHistoryViewDays
        : (existing?.defaultHistoryViewDays ?? 30);
    if (input.defaultHistoryView === 'today') calculatedHistoryDays = 1;
    else if (
      input.defaultHistoryView === 'current_week' ||
      input.defaultHistoryView === 'last_7_days'
    )
      calculatedHistoryDays = 7;
    else if (
      input.defaultHistoryView === 'current_month' ||
      input.defaultHistoryView === 'previous_month' ||
      input.defaultHistoryView === 'last_30_days'
    )
      calculatedHistoryDays = 30;
    else if (input.defaultHistoryView === 'last_60_days') calculatedHistoryDays = 60;
    else if (input.defaultHistoryView === 'last_90_days') calculatedHistoryDays = 90;

    // Map processingMode for DB enum: 'automatic' -> 'realtime'
    let dbProcessingMode: 'realtime' | 'daily_batch' | 'manual' = 'realtime';
    if (input.processingMode === 'daily_batch') dbProcessingMode = 'daily_batch';
    else if (input.processingMode === 'manual') dbProcessingMode = 'manual';
    else dbProcessingMode = 'realtime';

    // Map employeeVisibility for DB enum
    let dbVisibility: 'self_only' | 'department' | 'company' = 'self_only';
    if (input.employeeVisibility === 'department') dbVisibility = 'department';
    else if (input.employeeVisibility === 'company') dbVisibility = 'company';
    else dbVisibility = 'self_only';

    if (existing) {
      await db
        .update(attendanceGeneralSettings)
        .set({
          ...(input.timezone ? { timezone: input.timezone } : {}),
          dayBoundaryTime: unscheduledFallbackCutoff,
          ...(input.trackingStartDate ? { trackingStartDate: input.trackingStartDate } : {}),
          processingMode: dbProcessingMode,
          ...(typeof input.manualEntryAllowed === 'boolean'
            ? { manualEntryAllowed: input.manualEntryAllowed }
            : {}),
          employeeVisibility: dbVisibility,
          defaultHistoryViewDays: calculatedHistoryDays,
          alertPreferences: mergedAlertPreferences as Record<string, unknown>,
          updatedAt: new Date(),
        })
        .where(eq(attendanceGeneralSettings.id, existing.id));
      return (await this.getGeneralSettings(tenantId, companyId))!;
    }

    const id = generateSurrogateId('att_gen');
    await db.insert(attendanceGeneralSettings).values({
      id,
      tenantId,
      companyId,
      timezone: input.timezone ?? 'Asia/Kolkata',
      dayBoundaryTime: unscheduledFallbackCutoff,
      trackingStartDate: input.trackingStartDate ?? '2026-01-01',
      processingMode: dbProcessingMode,
      manualEntryAllowed: input.manualEntryAllowed ?? true,
      employeeVisibility: dbVisibility,
      defaultHistoryViewDays: calculatedHistoryDays,
      alertPreferences: mergedAlertPreferences as Record<string, unknown>,
    });
    return (await this.getGeneralSettings(tenantId, companyId))!;
  }

  /* ── 2. Attendance Policies & Overrides ─────────────────────────── */

  async listPolicies(
    tenantId: string,
    companyId: string,
    filter?: {
      scope?: 'company' | 'department' | 'employee';
      status?: 'draft' | 'published' | 'archived';
      effectiveBefore?: string;
    },
  ): Promise<AttendancePolicy[]> {
    const db = getDb();
    const conditions = [
      eq(attendancePolicies.tenantId, tenantId),
      eq(attendancePolicies.companyId, companyId),
    ];
    if (filter?.scope) {
      conditions.push(eq(attendancePolicies.scope, filter.scope));
    }
    if (filter?.status) {
      conditions.push(eq(attendancePolicies.status, filter.status));
    }
    if (filter?.effectiveBefore) {
      conditions.push(lte(attendancePolicies.effectiveFrom, filter.effectiveBefore));
    }
    return db
      .select()
      .from(attendancePolicies)
      .where(and(...conditions))
      .orderBy(
        desc(attendancePolicies.effectiveFrom),
        desc(attendancePolicies.overridesPriority),
        desc(attendancePolicies.version),
      );
  }

  async getEmployeeDepartmentId(
    tenantId: string,
    companyId: string,
    employeeId: string,
  ): Promise<string | null> {
    const db = getDb();
    const rows = await db
      .select({ departmentId: employees.departmentId })
      .from(employees)
      .where(
        and(
          eq(employees.tenantId, tenantId),
          eq(employees.companyId, companyId),
          eq(employees.id, employeeId),
        ),
      )
      .limit(1);
    return rows[0]?.departmentId ?? null;
  }

  async validateScopeId(
    tenantId: string,
    companyId: string,
    scope: 'department' | 'employee',
    scopeId: string,
  ): Promise<boolean> {
    const db = getDb();
    if (scope === 'department') {
      const rows = await db
        .select({ id: departments.id })
        .from(departments)
        .where(and(eq(departments.companyId, companyId), eq(departments.id, scopeId)))
        .limit(1);
      return rows.length > 0;
    } else {
      const rows = await db
        .select({ id: employees.id })
        .from(employees)
        .where(
          and(
            eq(employees.tenantId, tenantId),
            eq(employees.companyId, companyId),
            eq(employees.id, scopeId),
          ),
        )
        .limit(1);
      return rows.length > 0;
    }
  }

  async getPolicyById(
    tenantId: string,
    companyId: string,
    id: string,
  ): Promise<AttendancePolicy | null> {
    const db = getDb();
    const rows = await db
      .select()
      .from(attendancePolicies)
      .where(
        and(
          eq(attendancePolicies.tenantId, tenantId),
          eq(attendancePolicies.companyId, companyId),
          eq(attendancePolicies.id, id),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  }

  async createPolicy(
    tenantId: string,
    companyId: string,
    input: UpdateAttendancePolicyInput,
  ): Promise<AttendancePolicy> {
    const db = getDb();
    const id = generateSurrogateId('att_pol');
    const priority = input.scope === 'employee' ? 20 : input.scope === 'department' ? 10 : 0;

    await db.insert(attendancePolicies).values({
      id,
      tenantId,
      companyId,
      policyName: input.policyName ?? 'Standard Corporate Attendance Policy',
      version: input.version ?? 1,
      status: input.status ?? 'published',
      description: input.description ?? null,
      scope: input.scope ?? 'company',
      scopeId: input.scopeId ?? null,
      overridesPriority: input.overridesPriority ?? priority,
      captureMethods: input.captureMethods ?? ['web', 'mobile', 'biometric'],
      breakDeductionMethod: input.breakDeductionMethod ?? 'scheduled',
      enableLateTracking: input.enableLateTracking ?? true,
      gracePeriodMinutes: input.gracePeriodMinutes ?? 15,
      enableEarlyExitTracking: input.enableEarlyExitTracking ?? true,
      halfDayThresholdHours: String(input.halfDayThresholdHours ?? 4.0),
      fullDayThresholdHours: String(input.fullDayThresholdHours ?? 8.0),
      missingPunchPolicy: input.missingPunchPolicy ?? 'flag_exception',
      allowRegularization: input.allowRegularization ?? true,
      regularizationCutoffDays: input.regularizationCutoffDays ?? 7,
      requiresApproval: input.requiresApproval ?? true,
      effectiveFrom: input.effectiveFrom ?? new Date().toISOString().slice(0, 10),
      penaltyRules: input.penaltyRules as Record<string, unknown> | undefined,
      odRules: input.odRules as Record<string, unknown> | undefined,
      classificationRules: input.classificationRules as Record<string, unknown> | undefined,
      isActive: true,
    });

    return (await this.getPolicyById(tenantId, companyId, id))!;
  }

  async updatePolicy(
    tenantId: string,
    companyId: string,
    policyId: string,
    input: UpdateAttendancePolicyInput,
  ): Promise<AttendancePolicy> {
    const db = getDb();
    const existing = await this.getPolicyById(tenantId, companyId, policyId);
    if (!existing) {
      throw new Error(`Policy ${policyId} not found`);
    }

    await db
      .update(attendancePolicies)
      .set({
        ...(input.policyName ? { policyName: input.policyName } : {}),
        ...(typeof input.version === 'number' ? { version: input.version } : {}),
        ...(input.status ? { status: input.status } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.scope ? { scope: input.scope } : {}),
        ...(input.scopeId !== undefined ? { scopeId: input.scopeId } : {}),
        ...(input.captureMethods ? { captureMethods: input.captureMethods } : {}),
        ...(input.breakDeductionMethod ? { breakDeductionMethod: input.breakDeductionMethod } : {}),
        ...(typeof input.enableLateTracking === 'boolean'
          ? { enableLateTracking: input.enableLateTracking }
          : {}),
        ...(typeof input.gracePeriodMinutes === 'number'
          ? { gracePeriodMinutes: input.gracePeriodMinutes }
          : {}),
        ...(typeof input.enableEarlyExitTracking === 'boolean'
          ? { enableEarlyExitTracking: input.enableEarlyExitTracking }
          : {}),
        ...(input.halfDayThresholdHours !== undefined
          ? { halfDayThresholdHours: String(input.halfDayThresholdHours) }
          : {}),
        ...(input.fullDayThresholdHours !== undefined
          ? { fullDayThresholdHours: String(input.fullDayThresholdHours) }
          : {}),
        ...(input.missingPunchPolicy ? { missingPunchPolicy: input.missingPunchPolicy } : {}),
        ...(typeof input.allowRegularization === 'boolean'
          ? { allowRegularization: input.allowRegularization }
          : {}),
        ...(typeof input.regularizationCutoffDays === 'number'
          ? { regularizationCutoffDays: input.regularizationCutoffDays }
          : {}),
        ...(typeof input.requiresApproval === 'boolean'
          ? { requiresApproval: input.requiresApproval }
          : {}),
        ...(input.effectiveFrom ? { effectiveFrom: input.effectiveFrom } : {}),
        ...(input.penaltyRules
          ? { penaltyRules: input.penaltyRules as unknown as Record<string, unknown> }
          : {}),
        ...(input.odRules ? { odRules: input.odRules as unknown as Record<string, unknown> } : {}),
        ...(input.classificationRules
          ? { classificationRules: input.classificationRules as unknown as Record<string, unknown> }
          : {}),
        updatedAt: new Date(),
      })
      .where(eq(attendancePolicies.id, policyId));

    return (await this.getPolicyById(tenantId, companyId, policyId))!;
  }

  async publishPolicy(
    tenantId: string,
    companyId: string,
    policyId: string,
    effectiveFrom?: string,
  ): Promise<AttendancePolicy> {
    const db = getDb();
    const existing = await this.getPolicyById(tenantId, companyId, policyId);
    if (!existing) {
      throw new Error(`Policy ${policyId} not found`);
    }

    if (existing.status === 'draft') {
      await db
        .update(attendancePolicies)
        .set({
          status: 'published',
          effectiveFrom:
            effectiveFrom || existing.effectiveFrom || new Date().toISOString().slice(0, 10),
          updatedAt: new Date(),
        })
        .where(eq(attendancePolicies.id, policyId));

      return (await this.getPolicyById(tenantId, companyId, policyId))!;
    }

    // Existing is already published: archive prior version snapshot and create new active published version
    const nextVersion = (existing.version ?? 1) + 1;
    const newId = generateSurrogateId('att_pol');

    await db
      .update(attendancePolicies)
      .set({
        status: 'archived',
        isActive: false,
        updatedAt: new Date(),
      })
      .where(eq(attendancePolicies.id, policyId));

    await db.insert(attendancePolicies).values({
      ...existing,
      id: newId,
      version: nextVersion,
      status: 'published',
      isActive: true,
      effectiveFrom: effectiveFrom || new Date().toISOString().slice(0, 10),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return (await this.getPolicyById(tenantId, companyId, newId))!;
  }

  /* ── 3. Regularization Settings ─────────────────────────────────── */

  async getRegularizationSettings(
    tenantId: string,
    companyId: string,
  ): Promise<AttendanceRegularizationSettings | null> {
    const db = getDb();
    const rows = await db
      .select()
      .from(attendanceRegularizationSettings)
      .where(
        and(
          eq(attendanceRegularizationSettings.tenantId, tenantId),
          eq(attendanceRegularizationSettings.companyId, companyId),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  }

  async upsertRegularizationSettings(
    tenantId: string,
    companyId: string,
    input: RegularizationSettingsInput,
  ): Promise<AttendanceRegularizationSettings> {
    const db = getDb();
    const existing = await this.getRegularizationSettings(tenantId, companyId);

    if (existing) {
      await db
        .update(attendanceRegularizationSettings)
        .set({
          ...(typeof input.isEnabled === 'boolean' ? { isEnabled: input.isEnabled } : {}),
          ...(input.allowedCorrectionTypes
            ? { allowedCorrectionTypes: input.allowedCorrectionTypes }
            : {}),
          ...(typeof input.submissionWindowDays === 'number'
            ? { submissionWindowDays: input.submissionWindowDays }
            : {}),
          ...(typeof input.maxRequestsPerMonth === 'number'
            ? { maxRequestsPerMonth: input.maxRequestsPerMonth }
            : {}),
          ...(typeof input.requireReason === 'boolean'
            ? { requireReason: input.requireReason }
            : {}),
          ...(typeof input.requireEvidence === 'boolean'
            ? { requireEvidence: input.requireEvidence }
            : {}),
          ...(input.approvalHierarchy ? { approvalHierarchy: input.approvalHierarchy } : {}),
          ...(typeof input.autoApproveGraceMinutes === 'number'
            ? { autoApproveGraceMinutes: input.autoApproveGraceMinutes }
            : {}),
          ...(typeof input.blockOnPayrollLock === 'boolean'
            ? { blockOnPayrollLock: input.blockOnPayrollLock }
            : {}),
          ...(typeof input.allowWithdrawal === 'boolean'
            ? { allowWithdrawal: input.allowWithdrawal }
            : {}),
          updatedAt: new Date(),
        })
        .where(eq(attendanceRegularizationSettings.id, existing.id));
      return (await this.getRegularizationSettings(tenantId, companyId))!;
    }

    const id = generateSurrogateId('att_reg');
    await db.insert(attendanceRegularizationSettings).values({
      id,
      tenantId,
      companyId,
      isEnabled: input.isEnabled ?? true,
      allowedCorrectionTypes: input.allowedCorrectionTypes ?? [
        'missed_in',
        'missed_out',
        'time_adjustment',
        'both_missing',
      ],
      submissionWindowDays: input.submissionWindowDays ?? 7,
      maxRequestsPerMonth: input.maxRequestsPerMonth ?? 3,
      requireReason: input.requireReason ?? true,
      requireEvidence: input.requireEvidence ?? false,
      approvalHierarchy: input.approvalHierarchy ?? 'manager_then_hr',
      autoApproveGraceMinutes: input.autoApproveGraceMinutes ?? 0,
      blockOnPayrollLock: input.blockOnPayrollLock ?? true,
      allowWithdrawal: input.allowWithdrawal ?? true,
    });
    return (await this.getRegularizationSettings(tenantId, companyId))!;
  }

  /* ── 4. Devices ─────────────────────────────────────────────────── */

  async listDevices(tenantId: string, companyId: string): Promise<AttendanceDevice[]> {
    const db = getDb();
    return db
      .select()
      .from(attendanceDevices)
      .where(
        and(eq(attendanceDevices.tenantId, tenantId), eq(attendanceDevices.companyId, companyId)),
      )
      .orderBy(desc(attendanceDevices.createdAt));
  }

  async getDeviceById(
    tenantId: string,
    companyId: string,
    id: string,
  ): Promise<AttendanceDevice | null> {
    const db = getDb();
    const rows = await db
      .select()
      .from(attendanceDevices)
      .where(
        and(
          eq(attendanceDevices.tenantId, tenantId),
          eq(attendanceDevices.companyId, companyId),
          eq(attendanceDevices.id, id),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  }

  async createDevice(
    tenantId: string,
    companyId: string,
    input: DeviceInput,
  ): Promise<AttendanceDevice> {
    const db = getDb();
    const id = input.id ?? generateSurrogateId('att_dev');
    await db.insert(attendanceDevices).values({
      id,
      tenantId,
      companyId,
      locationId: input.locationId ?? null,
      deviceName: input.deviceName,
      deviceCode: input.deviceCode,
      deviceType: input.deviceType,
      serialNumber: input.serialNumber ?? null,
      ipAddress: input.ipAddress ?? null,
      port: input.port ?? null,
      status: input.status ?? 'offline',
      firmwareVersion: input.firmwareVersion ?? null,
      metadata: input.metadata ?? null,
    });
    return (await this.getDeviceById(tenantId, companyId, id))!;
  }

  async updateDevice(
    tenantId: string,
    companyId: string,
    deviceId: string,
    input: Partial<DeviceInput>,
  ): Promise<AttendanceDevice> {
    const db = getDb();
    await db
      .update(attendanceDevices)
      .set({
        ...(input.deviceName ? { deviceName: input.deviceName } : {}),
        ...(input.locationId !== undefined ? { locationId: input.locationId } : {}),
        ...(input.deviceType ? { deviceType: input.deviceType } : {}),
        ...(input.serialNumber !== undefined ? { serialNumber: input.serialNumber } : {}),
        ...(input.ipAddress !== undefined ? { ipAddress: input.ipAddress } : {}),
        ...(input.port !== undefined ? { port: input.port } : {}),
        ...(input.status ? { status: input.status } : {}),
        ...(input.firmwareVersion !== undefined ? { firmwareVersion: input.firmwareVersion } : {}),
        ...(input.metadata ? { metadata: input.metadata } : {}),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(attendanceDevices.tenantId, tenantId),
          eq(attendanceDevices.companyId, companyId),
          eq(attendanceDevices.id, deviceId),
        ),
      );
    return (await this.getDeviceById(tenantId, companyId, deviceId))!;
  }

  /* ── 5. Import Batches ──────────────────────────────────────────── */

  async listImportBatches(tenantId: string, companyId: string): Promise<AttendanceImportBatch[]> {
    const db = getDb();
    return db
      .select()
      .from(attendanceImportBatches)
      .where(
        and(
          eq(attendanceImportBatches.tenantId, tenantId),
          eq(attendanceImportBatches.companyId, companyId),
        ),
      )
      .orderBy(desc(attendanceImportBatches.createdAt));
  }

  async createImportBatch(
    tenantId: string,
    companyId: string,
    data: {
      batchType: 'raw_punches' | 'historical_summary';
      fileName: string;
      totalRows: number;
      successRows: number;
      failedRows: number;
      duplicateRows: number;
      status: 'pending' | 'processing' | 'completed' | 'reversed' | 'failed';
      importedByUserId?: string;
      columnMapping?: Record<string, string>;
      errorLog?: Array<{ row: number; reason: string }>;
    },
  ): Promise<AttendanceImportBatch> {
    const db = getDb();
    const id = generateSurrogateId('att_imp');
    await db.insert(attendanceImportBatches).values({
      id,
      tenantId,
      companyId,
      batchType: data.batchType,
      fileName: data.fileName,
      totalRows: data.totalRows,
      successRows: data.successRows,
      failedRows: data.failedRows,
      duplicateRows: data.duplicateRows,
      status: data.status,
      importedByUserId: data.importedByUserId ?? null,
      columnMapping: data.columnMapping ?? null,
      errorLog: data.errorLog ?? null,
    });
    const rows = await db
      .select()
      .from(attendanceImportBatches)
      .where(eq(attendanceImportBatches.id, id))
      .limit(1);
    return rows[0]!;
  }

  async getImportBatch(
    tenantId: string,
    companyId: string,
    batchId: string,
  ): Promise<AttendanceImportBatch | null> {
    const db = getDb();
    const rows = await db
      .select()
      .from(attendanceImportBatches)
      .where(
        and(
          eq(attendanceImportBatches.tenantId, tenantId),
          eq(attendanceImportBatches.companyId, companyId),
          eq(attendanceImportBatches.id, batchId),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  }

  async finalizeImportBatch(
    tenantId: string,
    companyId: string,
    batchId: string,
    result: {
      status: 'completed' | 'failed';
      successRows: number;
      failedRows: number;
      duplicateRows: number;
      errorLog?: Array<{ row: number; reason: string }>;
    },
  ): Promise<AttendanceImportBatch> {
    const db = getDb();
    await db
      .update(attendanceImportBatches)
      .set({
        status: result.status,
        successRows: result.successRows,
        failedRows: result.failedRows,
        duplicateRows: result.duplicateRows,
        errorLog: result.errorLog ?? null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(attendanceImportBatches.tenantId, tenantId),
          eq(attendanceImportBatches.companyId, companyId),
          eq(attendanceImportBatches.id, batchId),
        ),
      );
    return (await this.getImportBatch(tenantId, companyId, batchId))!;
  }

  async updateImportBatchStatus(
    tenantId: string,
    companyId: string,
    batchId: string,
    status: 'completed' | 'reversed' | 'failed',
  ): Promise<void> {
    const db = getDb();
    await db
      .update(attendanceImportBatches)
      .set({ status, updatedAt: new Date() })
      .where(
        and(
          eq(attendanceImportBatches.tenantId, tenantId),
          eq(attendanceImportBatches.companyId, companyId),
          eq(attendanceImportBatches.id, batchId),
        ),
      );
  }

  /* ── 6. Location & Security Settings ────────────────────────────── */

  async getSecuritySettings(
    tenantId: string,
    companyId: string,
  ): Promise<AttendanceSecuritySettingsWithRemote | null> {
    const db = getDb();
    const rows = await db
      .select()
      .from(attendanceSecuritySettings)
      .where(
        and(
          eq(attendanceSecuritySettings.tenantId, tenantId),
          eq(attendanceSecuritySettings.companyId, companyId),
        ),
      )
      .limit(1);

    const base = rows[0] ?? null;
    if (!base) return null;

    const genRows = await db
      .select({ alertPreferences: attendanceGeneralSettings.alertPreferences })
      .from(attendanceGeneralSettings)
      .where(
        and(
          eq(attendanceGeneralSettings.tenantId, tenantId),
          eq(attendanceGeneralSettings.companyId, companyId),
        ),
      )
      .limit(1);

    const prefs = (genRows[0]?.alertPreferences ?? {}) as Record<string, unknown>;
    const remote = (prefs.remotePunchConfig ?? {}) as {
      allowWebPunch?: boolean;
      allowMobilePunch?: boolean;
      requireSelfiePunch?: boolean;
      allowPunchOutsideGeofence?: boolean;
    };

    return {
      ...base,
      allowWebPunch: remote.allowWebPunch ?? true,
      allowMobilePunch: remote.allowMobilePunch ?? true,
      requireSelfiePunch: remote.requireSelfiePunch ?? false,
      allowPunchOutsideGeofence: remote.allowPunchOutsideGeofence ?? false,
    };
  }

  async upsertSecuritySettings(
    tenantId: string,
    companyId: string,
    input: SecuritySettingsInput,
  ): Promise<AttendanceSecuritySettingsWithRemote> {
    const db = getDb();
    const existing = await this.getSecuritySettings(tenantId, companyId);

    if (existing) {
      await db
        .update(attendanceSecuritySettings)
        .set({
          ...(typeof input.enableGps === 'boolean' ? { enableGps: input.enableGps } : {}),
          ...(input.geofenceConfigs ? { geofenceConfigs: input.geofenceConfigs } : {}),
          ...(input.ipAllowlist ? { ipAllowlist: input.ipAllowlist } : {}),
          ...(typeof input.enforceIpRestriction === 'boolean'
            ? { enforceIpRestriction: input.enforceIpRestriction }
            : {}),
          ...(typeof input.maxDevicesPerEmployee === 'number'
            ? { maxDevicesPerEmployee: input.maxDevicesPerEmployee }
            : {}),
          ...(typeof input.allowSharedKiosk === 'boolean'
            ? { allowSharedKiosk: input.allowSharedKiosk }
            : {}),
          ...(typeof input.detectMockLocation === 'boolean'
            ? { detectMockLocation: input.detectMockLocation }
            : {}),
          ...(typeof input.detectImpossibleTravel === 'boolean'
            ? { detectImpossibleTravel: input.detectImpossibleTravel }
            : {}),
          ...(typeof input.rapidPunchThrottlingSeconds === 'number'
            ? { rapidPunchThrottlingSeconds: input.rapidPunchThrottlingSeconds }
            : {}),
          ...(typeof input.flagVpnProxy === 'boolean' ? { flagVpnProxy: input.flagVpnProxy } : {}),
          updatedAt: new Date(),
        })
        .where(eq(attendanceSecuritySettings.id, existing.id));
    } else {
      const id = generateSurrogateId('att_sec');
      await db.insert(attendanceSecuritySettings).values({
        id,
        tenantId,
        companyId,
        enableGps: input.enableGps ?? true,
        geofenceConfigs: input.geofenceConfigs ?? [],
        ipAllowlist: input.ipAllowlist ?? ['192.168.1.0/24'],
        enforceIpRestriction: input.enforceIpRestriction ?? false,
        maxDevicesPerEmployee: input.maxDevicesPerEmployee ?? 2,
        allowSharedKiosk: input.allowSharedKiosk ?? true,
        detectMockLocation: input.detectMockLocation ?? true,
        detectImpossibleTravel: input.detectImpossibleTravel ?? true,
        rapidPunchThrottlingSeconds: input.rapidPunchThrottlingSeconds ?? 60,
        flagVpnProxy: input.flagVpnProxy ?? true,
      });
    }

    if (
      input.allowWebPunch !== undefined ||
      input.allowMobilePunch !== undefined ||
      input.requireSelfiePunch !== undefined ||
      input.allowPunchOutsideGeofence !== undefined
    ) {
      const genRows = await db
        .select()
        .from(attendanceGeneralSettings)
        .where(
          and(
            eq(attendanceGeneralSettings.tenantId, tenantId),
            eq(attendanceGeneralSettings.companyId, companyId),
          ),
        )
        .limit(1);
      const row = genRows[0];
      const prefs = (row?.alertPreferences ?? {}) as Record<string, unknown>;
      const existingRemote = (prefs.remotePunchConfig ?? {}) as Record<string, unknown>;
      const updatedRemote = {
        ...existingRemote,
        ...(input.allowWebPunch !== undefined ? { allowWebPunch: input.allowWebPunch } : {}),
        ...(input.allowMobilePunch !== undefined
          ? { allowMobilePunch: input.allowMobilePunch }
          : {}),
        ...(input.requireSelfiePunch !== undefined
          ? { requireSelfiePunch: input.requireSelfiePunch }
          : {}),
        ...(input.allowPunchOutsideGeofence !== undefined
          ? { allowPunchOutsideGeofence: input.allowPunchOutsideGeofence }
          : {}),
      };
      const updatedPrefs = {
        ...prefs,
        remotePunchConfig: updatedRemote,
      };

      if (row) {
        await db
          .update(attendanceGeneralSettings)
          .set({
            alertPreferences: updatedPrefs,
            updatedAt: new Date(),
          })
          .where(eq(attendanceGeneralSettings.id, row.id));
      } else {
        await db.insert(attendanceGeneralSettings).values({
          id: generateSurrogateId('ags'),
          tenantId,
          companyId,
          timezone: 'UTC',
          dayBoundaryTime: '00:00:00',
          trackingStartDate: '2026-01-01',
          processingMode: 'realtime',
          manualEntryAllowed: true,
          employeeVisibility: 'self_only',
          defaultHistoryViewDays: 30,
          alertPreferences: updatedPrefs,
        });
      }
    }

    return (await this.getSecuritySettings(tenantId, companyId))!;
  }

  /* ── 7. Payroll & Locking ───────────────────────────────────────── */

  async getPayrollSettings(
    tenantId: string,
    companyId: string,
  ): Promise<AttendancePayrollSettings | null> {
    const db = getDb();
    const rows = await db
      .select()
      .from(attendancePayrollSettings)
      .where(
        and(
          eq(attendancePayrollSettings.tenantId, tenantId),
          eq(attendancePayrollSettings.companyId, companyId),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  }

  async upsertPayrollSettings(
    tenantId: string,
    companyId: string,
    input: PayrollSettingsInput,
  ): Promise<AttendancePayrollSettings> {
    const db = getDb();
    const existing = await this.getPayrollSettings(tenantId, companyId);

    if (existing) {
      await db
        .update(attendancePayrollSettings)
        .set({
          ...(input.cycleType ? { cycleType: input.cycleType } : {}),
          ...(typeof input.cutoffDay === 'number' ? { cutoffDay: input.cutoffDay } : {}),
          ...(typeof input.requireApprovalBeforeLock === 'boolean'
            ? { requireApprovalBeforeLock: input.requireApprovalBeforeLock }
            : {}),
          ...(typeof input.autoLockOnCutoff === 'boolean'
            ? { autoLockOnCutoff: input.autoLockOnCutoff }
            : {}),
          ...(input.blockingSeverity ? { blockingSeverity: input.blockingSeverity } : {}),
          updatedAt: new Date(),
        })
        .where(eq(attendancePayrollSettings.id, existing.id));
      return (await this.getPayrollSettings(tenantId, companyId))!;
    }

    const id = generateSurrogateId('att_pay');
    await db.insert(attendancePayrollSettings).values({
      id,
      tenantId,
      companyId,
      cycleType: input.cycleType ?? 'calendar_month',
      cutoffDay: input.cutoffDay ?? 30,
      requireApprovalBeforeLock: input.requireApprovalBeforeLock ?? true,
      autoLockOnCutoff: input.autoLockOnCutoff ?? false,
      blockingSeverity: input.blockingSeverity ?? 'warning_only',
    });
    return (await this.getPayrollSettings(tenantId, companyId))!;
  }

  async listPeriods(tenantId: string, companyId: string): Promise<AttendancePeriod[]> {
    const db = getDb();
    return db
      .select()
      .from(attendancePeriods)
      .where(
        and(eq(attendancePeriods.tenantId, tenantId), eq(attendancePeriods.companyId, companyId)),
      )
      .orderBy(desc(attendancePeriods.startDate));
  }

  async getPeriodByCode(
    tenantId: string,
    companyId: string,
    periodCode: string,
  ): Promise<AttendancePeriod | null> {
    const db = getDb();
    const rows = await db
      .select()
      .from(attendancePeriods)
      .where(
        and(
          eq(attendancePeriods.tenantId, tenantId),
          eq(attendancePeriods.companyId, companyId),
          eq(attendancePeriods.periodCode, periodCode),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  }

  /** Companies that switched on "auto-lock on cutoff", with their payroll cycle. */
  async listAutoLockCompanies(): Promise<
    Array<{
      tenantId: string;
      companyId: string;
      cycleType: 'calendar_month' | 'custom_cutoff';
      cutoffDay: number;
    }>
  > {
    const db = getDb();
    return db
      .select({
        tenantId: attendancePayrollSettings.tenantId,
        companyId: attendancePayrollSettings.companyId,
        cycleType: attendancePayrollSettings.cycleType,
        cutoffDay: attendancePayrollSettings.cutoffDay,
      })
      .from(attendancePayrollSettings)
      .where(eq(attendancePayrollSettings.autoLockOnCutoff, true));
  }

  /** Re-aligns an OPEN period with the company's current payroll cycle. */
  async updateOpenPeriodBounds(
    tenantId: string,
    companyId: string,
    periodCode: string,
    bounds: { startDate: string; endDate: string },
  ): Promise<void> {
    const db = getDb();
    await db
      .update(attendancePeriods)
      .set({ startDate: bounds.startDate, endDate: bounds.endDate, updatedAt: new Date() })
      .where(
        and(
          eq(attendancePeriods.tenantId, tenantId),
          eq(attendancePeriods.companyId, companyId),
          eq(attendancePeriods.periodCode, periodCode),
          eq(attendancePeriods.status, 'open'),
        ),
      );
  }

  /**
   * Regularization requests still waiting for a decision whose workday falls in
   * [startDate, endDate]: both the V1 workflow and the legacy ESS requests.
   */
  async countPendingRegularizationsInRange(
    tenantId: string,
    companyId: string,
    startDate: string,
    endDate: string,
  ): Promise<number> {
    const db = getDb();
    const [v1] = await db
      .select({ count: sql<number>`count(*)` })
      .from(attendanceRegularizations)
      .where(
        and(
          eq(attendanceRegularizations.tenantId, tenantId),
          eq(attendanceRegularizations.companyId, companyId),
          gte(attendanceRegularizations.workday, startDate),
          lte(attendanceRegularizations.workday, endDate),
          inArray(attendanceRegularizations.approvalStatus, [
            'submitted',
            'under_review',
            'awaiting_info',
          ]),
        ),
      );
    const legacy = await db
      .select({ details: employeeRequests.details })
      .from(employeeRequests)
      .where(
        and(
          eq(employeeRequests.tenantId, tenantId),
          eq(employeeRequests.companyId, companyId),
          eq(employeeRequests.requestType, 'attendance_regularization'),
          eq(employeeRequests.status, 'pending'),
        ),
      );
    const legacyInRange = legacy.filter((row) => {
      const date = (row.details as { date?: string } | null)?.date;
      return typeof date === 'string' && date >= startDate && date <= endDate;
    }).length;
    return Number(v1?.count ?? 0) + legacyInRange;
  }

  /** Monthly summaries of a `YYYY-MM` month and how many are not yet reviewed. */
  async countMonthlySummaryReviews(
    tenantId: string,
    companyId: string,
    month: string,
  ): Promise<{ total: number; notReviewed: number }> {
    const db = getDb();
    const rows = await db
      .select({ reviewState: attendanceMonthlySummaries.reviewState })
      .from(attendanceMonthlySummaries)
      .where(
        and(
          eq(attendanceMonthlySummaries.tenantId, tenantId),
          eq(attendanceMonthlySummaries.companyId, companyId),
          eq(attendanceMonthlySummaries.month, month),
        ),
      );
    return {
      total: rows.length,
      notReviewed: rows.filter((r) => r.reviewState !== 'reviewed').length,
    };
  }

  async upsertPeriod(
    tenantId: string,
    companyId: string,
    data: { periodCode: string; startDate: string; endDate: string },
  ): Promise<AttendancePeriod> {
    const db = getDb();
    const existing = await this.getPeriodByCode(tenantId, companyId, data.periodCode);
    if (existing) return existing;

    const id = generateSurrogateId('att_prd');
    await db.insert(attendancePeriods).values({
      id,
      tenantId,
      companyId,
      periodCode: data.periodCode,
      startDate: data.startDate,
      endDate: data.endDate,
      status: 'open',
    });
    return (await this.getPeriodByCode(tenantId, companyId, data.periodCode))!;
  }

  async lockPeriod(
    tenantId: string,
    companyId: string,
    periodCode: string,
    userId: string,
  ): Promise<AttendancePeriod> {
    const db = getDb();
    let period = await this.getPeriodByCode(tenantId, companyId, periodCode);
    if (!period) {
      const [yearStr, monthStr] = periodCode.split('-');
      const year = Number(yearStr) || new Date().getFullYear();
      const month = Number(monthStr) || new Date().getMonth() + 1;
      const lastDay = new Date(year, month, 0).getDate();
      period = await this.upsertPeriod(tenantId, companyId, {
        periodCode,
        startDate: `${year}-${String(month).padStart(2, '0')}-01`,
        endDate: `${year}-${String(month).padStart(2, '0')}-${lastDay}`,
      });
    }

    await db
      .update(attendancePeriods)
      .set({
        status: 'locked',
        lockedAt: new Date(),
        lockedByUserId: userId,
        updatedAt: new Date(),
      })
      .where(eq(attendancePeriods.id, period.id));
    return (await this.getPeriodByCode(tenantId, companyId, periodCode))!;
  }

  async unlockPeriod(
    tenantId: string,
    companyId: string,
    periodCode: string,
    userId: string,
    reason: string,
  ): Promise<AttendancePeriod> {
    const db = getDb();
    let period = await this.getPeriodByCode(tenantId, companyId, periodCode);
    if (!period) {
      const [yearStr, monthStr] = periodCode.split('-');
      const year = Number(yearStr) || new Date().getFullYear();
      const month = Number(monthStr) || new Date().getMonth() + 1;
      const lastDay = new Date(year, month, 0).getDate();
      period = await this.upsertPeriod(tenantId, companyId, {
        periodCode,
        startDate: `${year}-${String(month).padStart(2, '0')}-01`,
        endDate: `${year}-${String(month).padStart(2, '0')}-${lastDay}`,
      });
    }

    await db
      .update(attendancePeriods)
      .set({
        status: 'open',
        unlockedAt: new Date(),
        unlockedByUserId: userId,
        unlockReason: reason,
        updatedAt: new Date(),
      })
      .where(eq(attendancePeriods.id, period.id));
    return (await this.getPeriodByCode(tenantId, companyId, periodCode))!;
  }

  async listHandoverBatches(
    tenantId: string,
    companyId: string,
  ): Promise<AttendancePayrollHandoverBatch[]> {
    const db = getDb();
    return db
      .select()
      .from(attendancePayrollHandoverBatches)
      .where(
        and(
          eq(attendancePayrollHandoverBatches.tenantId, tenantId),
          eq(attendancePayrollHandoverBatches.companyId, companyId),
        ),
      )
      .orderBy(desc(attendancePayrollHandoverBatches.createdAt));
  }

  async createHandoverBatch(
    tenantId: string,
    companyId: string,
    data: {
      periodId: string;
      batchNumber: string;
      totalEmployees: number;
      totalPayableDays: number;
      totalDeductionUnits: number;
      exportedFormat: 'csv' | 'json' | 'api_push';
      status?: 'generated' | 'transferred' | 'reconciled';
      generatedByUserId?: string;
      summarySnapshot?: Record<string, unknown>;
    },
  ): Promise<AttendancePayrollHandoverBatch> {
    const db = getDb();
    const id = generateSurrogateId('att_hnd');
    await db.insert(attendancePayrollHandoverBatches).values({
      id,
      tenantId,
      companyId,
      periodId: data.periodId,
      batchNumber: data.batchNumber,
      totalEmployees: data.totalEmployees,
      totalPayableDays: String(data.totalPayableDays),
      totalDeductionUnits: String(data.totalDeductionUnits),
      exportedFormat: data.exportedFormat,
      status: data.status ?? 'generated',
      generatedByUserId: data.generatedByUserId ?? null,
      summarySnapshot: data.summarySnapshot ?? null,
    });
    const rows = await db
      .select()
      .from(attendancePayrollHandoverBatches)
      .where(eq(attendancePayrollHandoverBatches.id, id))
      .limit(1);
    return rows[0]!;
  }

  /* ── 8. Audit Logs ──────────────────────────────────────────────── */

  async recordAuditLog(
    tenantId: string,
    companyId: string,
    data: {
      category:
        | 'general'
        | 'policy'
        | 'regularization'
        | 'capture_device'
        | 'location_security'
        | 'payroll_locking';
      action: string;
      entityId?: string;
      entityType?: string;
      previousValues?: Record<string, unknown>;
      newValues?: Record<string, unknown>;
      changedByUserId?: string;
      clientIp?: string;
      userAgent?: string;
    },
  ): Promise<void> {
    const db = getDb();
    const id = generateSurrogateId('att_aud');
    await db.insert(attendanceSettingsAuditLogs).values({
      id,
      tenantId,
      companyId,
      category: data.category,
      action: data.action,
      entityId: data.entityId ?? null,
      entityType: data.entityType ?? null,
      previousValues: data.previousValues ?? null,
      newValues: data.newValues ?? null,
      changedByUserId: data.changedByUserId ?? null,
      clientIp: data.clientIp ?? null,
      userAgent: data.userAgent ?? null,
    });
  }

  async queryAuditLogs(
    tenantId: string,
    companyId: string,
    filter?: SettingsAuditFilter,
  ): Promise<{ items: AttendanceSettingsAuditLog[]; total: number }> {
    const db = getDb();
    const conditions = [
      eq(attendanceSettingsAuditLogs.tenantId, tenantId),
      eq(attendanceSettingsAuditLogs.companyId, companyId),
    ];
    if (
      filter?.category &&
      [
        'general',
        'policy',
        'regularization',
        'capture_device',
        'location_security',
        'payroll_locking',
      ].includes(filter.category)
    ) {
      conditions.push(
        eq(
          attendanceSettingsAuditLogs.category,
          filter.category as AttendanceSettingsAuditLog['category'],
        ),
      );
    }
    if (filter?.startDate) {
      conditions.push(
        gte(attendanceSettingsAuditLogs.createdAt, new Date(`${filter.startDate}T00:00:00.000Z`)),
      );
    }
    if (filter?.endDate) {
      conditions.push(
        lte(attendanceSettingsAuditLogs.createdAt, new Date(`${filter.endDate}T23:59:59.999Z`)),
      );
    }

    const limit = Math.min(100, Math.max(1, filter?.limit ?? 25));
    const offset = Math.max(0, filter?.offset ?? 0);

    const [items, totalRes] = await Promise.all([
      db
        .select()
        .from(attendanceSettingsAuditLogs)
        .where(and(...conditions))
        .orderBy(desc(attendanceSettingsAuditLogs.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)` })
        .from(attendanceSettingsAuditLogs)
        .where(and(...conditions)),
    ]);

    return {
      items,
      total: Number(totalRes[0]?.count ?? items.length),
    };
  }

  /* ── 9. Shift & Roster Configuration ────────────────────────────── */

  async getShiftRosterSettings(tenantId: string, companyId: string): Promise<ShiftRosterSettings> {
    const db = getDb();
    const rows = await db
      .select()
      .from(attendanceGeneralSettings)
      .where(
        and(
          eq(attendanceGeneralSettings.tenantId, tenantId),
          eq(attendanceGeneralSettings.companyId, companyId),
        ),
      )
      .limit(1);

    const row = rows[0];
    const prefs = (row?.alertPreferences ?? {}) as Record<string, unknown>;
    const rawRoster = prefs.shiftRosterConfig as Partial<ShiftRosterSettings> | undefined;

    const baseShifts: CompanyShiftTemplate[] =
      rawRoster?.shifts && rawRoster.shifts.length > 0 ? rawRoster.shifts : DEFAULT_COMPANY_SHIFTS;

    // Retrieve active employee counts assigned to each shift from employeeWorkSchedules
    const scheduleCounts = await db
      .select({
        workSchedule: employeeWorkSchedules.workSchedule,
        count: sql<number>`count(*)`,
      })
      .from(employeeWorkSchedules)
      .where(
        and(
          eq(employeeWorkSchedules.tenantId, tenantId),
          eq(employeeWorkSchedules.companyId, companyId),
        ),
      )
      .groupBy(employeeWorkSchedules.workSchedule);

    const countMap = new Map<string, number>();
    for (const sc of scheduleCounts) {
      if (sc.workSchedule) {
        countMap.set(sc.workSchedule.toLowerCase(), Number(sc.count));
      }
    }

    const shiftsWithCounts = baseShifts.map((shift) => {
      const assignedCount =
        countMap.get(shift.name.toLowerCase()) ??
        countMap.get(shift.code.toLowerCase()) ??
        countMap.get(shift.id.toLowerCase()) ??
        0;
      return {
        ...shift,
        assignedEmployeesCount: assignedCount,
      };
    });

    return {
      shifts: shiftsWithCounts,
      autoShiftAllocation: {
        enabled: rawRoster?.autoShiftAllocation?.enabled ?? true,
        matchingWindowMinutes: rawRoster?.autoShiftAllocation?.matchingWindowMinutes ?? 60,
        fallbackShiftId: rawRoster?.autoShiftAllocation?.fallbackShiftId ?? 'shift_gen_std',
        allowOvernightSpanning: rawRoster?.autoShiftAllocation?.allowOvernightSpanning ?? true,
      },
      shiftSwapRules: {
        allowEmployeeRequests: rawRoster?.shiftSwapRules?.allowEmployeeRequests ?? true,
        cutoffHours: rawRoster?.shiftSwapRules?.cutoffHours ?? 24,
        requireManagerApproval: rawRoster?.shiftSwapRules?.requireManagerApproval ?? true,
      },
    };
  }

  async updateShiftRosterSettings(
    tenantId: string,
    companyId: string,
    input: UpdateShiftRosterSettingsInput,
  ): Promise<ShiftRosterSettings> {
    const db = getDb();
    const current = await this.getShiftRosterSettings(tenantId, companyId);
    const existing = await db
      .select()
      .from(attendanceGeneralSettings)
      .where(
        and(
          eq(attendanceGeneralSettings.tenantId, tenantId),
          eq(attendanceGeneralSettings.companyId, companyId),
        ),
      )
      .limit(1);

    const mergedSettings: ShiftRosterSettings = {
      shifts: input.shifts ?? current.shifts,
      autoShiftAllocation: {
        ...current.autoShiftAllocation,
        ...(input.autoShiftAllocation ?? {}),
      },
      shiftSwapRules: {
        ...current.shiftSwapRules,
        ...(input.shiftSwapRules ?? {}),
      },
    };

    const row = existing[0];
    const prefs = (row?.alertPreferences ?? {}) as Record<string, unknown>;
    const updatedPrefs = {
      ...prefs,
      shiftRosterConfig: mergedSettings,
    };

    if (row) {
      await db
        .update(attendanceGeneralSettings)
        .set({
          alertPreferences: updatedPrefs,
          updatedAt: new Date(),
        })
        .where(eq(attendanceGeneralSettings.id, row.id));
    } else {
      await db.insert(attendanceGeneralSettings).values({
        id: generateSurrogateId('ags'),
        tenantId,
        companyId,
        timezone: 'UTC',
        dayBoundaryTime: '00:00:00',
        trackingStartDate: '2026-01-01',
        processingMode: 'realtime',
        manualEntryAllowed: true,
        employeeVisibility: 'self_only',
        defaultHistoryViewDays: 30,
        alertPreferences: updatedPrefs,
      });
    }

    return this.getShiftRosterSettings(tenantId, companyId);
  }

  async createCompanyShift(
    tenantId: string,
    companyId: string,
    shiftInput: CreateShiftInput,
  ): Promise<CompanyShiftTemplate> {
    const current = await this.getShiftRosterSettings(tenantId, companyId);
    const newShift: CompanyShiftTemplate = {
      id: shiftInput.id || `shift_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: shiftInput.name,
      code: shiftInput.code,
      startTime: shiftInput.startTime,
      endTime: shiftInput.endTime,
      workingDays: shiftInput.workingDays,
      breakMinutes: shiftInput.breakMinutes ?? 60,
      lunchMinutes: shiftInput.lunchMinutes ?? 30,
      graceMinutes: shiftInput.graceMinutes ?? 15,
      isOvernight: shiftInput.isOvernight ?? false,
      color: shiftInput.color ?? '#2563EB',
      description: shiftInput.description ?? '',
      isActive: shiftInput.isActive ?? true,
      assignedEmployeesCount: 0,
    };

    const updatedShifts = [...current.shifts, newShift];
    await this.updateShiftRosterSettings(tenantId, companyId, { shifts: updatedShifts });
    return newShift;
  }

  async updateCompanyShift(
    tenantId: string,
    companyId: string,
    shiftId: string,
    shiftUpdate: UpdateShiftInput,
  ): Promise<CompanyShiftTemplate | null> {
    const current = await this.getShiftRosterSettings(tenantId, companyId);
    const index = current.shifts.findIndex((s) => s.id === shiftId);
    if (index === -1) return null;

    const existing = current.shifts[index];
    if (!existing) return null;

    const updated: CompanyShiftTemplate = {
      ...existing,
      id: existing.id,
      name: shiftUpdate.name ?? existing.name,
      code: shiftUpdate.code ?? existing.code,
      startTime: shiftUpdate.startTime ?? existing.startTime,
      endTime: shiftUpdate.endTime ?? existing.endTime,
      workingDays: shiftUpdate.workingDays ?? existing.workingDays,
      breakMinutes: shiftUpdate.breakMinutes ?? existing.breakMinutes,
      lunchMinutes: shiftUpdate.lunchMinutes ?? existing.lunchMinutes,
      graceMinutes: shiftUpdate.graceMinutes ?? existing.graceMinutes,
      isOvernight: shiftUpdate.isOvernight ?? existing.isOvernight,
      color: shiftUpdate.color ?? existing.color,
      description: shiftUpdate.description ?? existing.description,
      isActive: shiftUpdate.isActive ?? existing.isActive,
    };

    current.shifts[index] = updated;
    await this.updateShiftRosterSettings(tenantId, companyId, { shifts: current.shifts });
    return updated;
  }

  async deleteCompanyShift(tenantId: string, companyId: string, shiftId: string): Promise<boolean> {
    const current = await this.getShiftRosterSettings(tenantId, companyId);
    const initialLen = current.shifts.length;
    const filtered = current.shifts.filter((s) => s.id !== shiftId);
    if (filtered.length === initialLen) return false;

    await this.updateShiftRosterSettings(tenantId, companyId, { shifts: filtered });
    return true;
  }
}

export const attendanceSettingsRepository = new AttendanceSettingsRepository();
