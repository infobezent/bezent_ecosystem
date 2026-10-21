import {
  AttendanceSettingsRepository,
  attendanceSettingsRepository,
} from '../repository/attendanceSettings.repository.js';
import { AttendanceRepository, attendanceRepository } from '../repository/attendance.repository.js';
import { attendanceCalculationService } from './attendanceCalculation.service.js';
import { DEFAULT_DEVICE_PORT, probeTcp } from './attendanceDeviceProbe.js';
import {
  computePeriodBounds,
  daysBetweenInclusive,
  periodCodeForDate,
} from './attendancePeriodCalendar.js';
import type {
  AttendancePolicy,
  AttendanceGeneralSettingsWithV1,
  AttendanceRegularizationSettings,
  AttendanceDevice,
  AttendanceImportBatch,
  AttendanceSecuritySettings,
  AttendancePayrollSettings,
  AttendancePeriod,
  AttendancePayrollHandoverBatch,
  AttendanceSettingsAuditLog,
  GeneralSettingsInput,
  UpdateAttendancePolicyInput,
  RegularizationSettingsInput,
  DeviceInput,
  SecuritySettingsInput,
  PayrollSettingsInput,
  SettingsAuditFilter,
  MonthlySummaryEmployeeRow,
  PenaltyRulesConfig,
  OnDutyRulesConfig,
  ClassificationRulesConfig,
  EffectivePolicyResolution,
  PublishPolicyInput,
  CompanyShiftTemplate,
  ShiftRosterSettings,
  UpdateShiftRosterSettingsInput,
  CreateShiftInput,
  UpdateShiftInput,
} from '../types/attendance.types.js';
import { BadRequestError, NotFoundError } from '../../../../app/errors/AppError.js';

export class AttendanceSettingsService {
  constructor(
    private readonly repo: AttendanceSettingsRepository = attendanceSettingsRepository,
    private readonly attRepo: AttendanceRepository = attendanceRepository,
  ) {}

  /* ── 1. General Settings ────────────────────────────────────────── */

  async getGeneralSettings(
    tenantId: string,
    companyId: string,
  ): Promise<AttendanceGeneralSettingsWithV1> {
    const settings = await this.repo.getGeneralSettings(tenantId, companyId);
    if (settings) return settings;
    // Default bootstrap
    return this.repo.upsertGeneralSettings(tenantId, companyId, {});
  }

  async updateGeneralSettings(
    tenantId: string,
    companyId: string,
    input: GeneralSettingsInput,
    userId?: string,
    clientIp?: string,
  ): Promise<AttendanceGeneralSettingsWithV1> {
    const prev = await this.getGeneralSettings(tenantId, companyId);

    // 1. Timezone validation (valid IANA timezone)
    if (input.timezone) {
      try {
        Intl.DateTimeFormat(undefined, { timeZone: input.timezone });
      } catch {
        throw new BadRequestError(`Invalid IANA timezone identifier: ${input.timezone}`);
      }
    }

    // 2. Day boundary fallback cutoff format validation
    const cutoffTime = input.unscheduledFallbackCutoff || input.dayBoundaryTime;
    if (cutoffTime && !/^\d{2}:\d{2}(:\d{2})?$/.test(cutoffTime)) {
      throw new BadRequestError(
        'Day boundary fallback cutoff time must be in HH:mm or HH:mm:ss format',
      );
    }

    // 3. Controlled modification for Tracking Start Date (Go-Live Date)
    if (input.trackingStartDate) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(input.trackingStartDate)) {
        throw new BadRequestError('Tracking start date must be in YYYY-MM-DD format');
      }
      // If tracking start date is changed after initial setup, require change reason
      if (prev?.trackingStartDate && prev.trackingStartDate !== input.trackingStartDate) {
        if (!input.trackingStartDateReason || !input.trackingStartDateReason.trim()) {
          throw new BadRequestError(
            'A change reason is required when modifying the attendance tracking start date',
          );
        }
      }
    }

    // 4. Controlled manual entry permissions validation
    if (input.manualEntryAllowed && input.manualEntryConfig) {
      const validRoles = ['hr', 'reporting_manager', 'company_admin', 'super_admin'];
      const hasInvalidRole = input.manualEntryConfig.allowedRoles?.some(
        (role) => !validRoles.includes(role),
      );
      if (hasInvalidRole) {
        throw new BadRequestError('Manual attendance entry config specifies unauthorized roles');
      }
    }

    // 5. Default history view validation
    if (input.defaultHistoryView === 'custom' && typeof input.defaultHistoryViewDays === 'number') {
      if (input.defaultHistoryViewDays < 1 || input.defaultHistoryViewDays > 365) {
        throw new BadRequestError('Custom history view days must be between 1 and 365');
      }
    }

    const updated = await this.repo.upsertGeneralSettings(tenantId, companyId, input);

    await this.repo.recordAuditLog(tenantId, companyId, {
      category: 'general',
      action: 'updated',
      entityId: updated.id,
      entityType: 'attendance_general_settings',
      previousValues: prev as unknown as Record<string, unknown>,
      newValues: {
        ...(input as Record<string, unknown>),
        changeReason: input.trackingStartDateReason || 'Attendance general settings updated',
      },
      changedByUserId: userId,
      clientIp,
    });

    return updated;
  }

  /* ── 2. Policies & Overrides ────────────────────────────────────── */

  async listPolicies(
    tenantId: string,
    companyId: string,
    filter?: {
      scope?: 'company' | 'department' | 'employee';
      status?: 'draft' | 'published' | 'archived';
    },
  ): Promise<AttendancePolicy[]> {
    return this.repo.listPolicies(tenantId, companyId, filter);
  }

  async getPolicyById(
    tenantId: string,
    companyId: string,
    policyId: string,
  ): Promise<AttendancePolicy> {
    const policy = await this.repo.getPolicyById(tenantId, companyId, policyId);
    if (!policy) throw new NotFoundError(`Attendance policy ${policyId} not found`);
    return policy;
  }

  private async validatePolicyInput(
    tenantId: string,
    companyId: string,
    input: Partial<UpdateAttendancePolicyInput> | AttendancePolicy,
    isCreate = false,
  ): Promise<void> {
    if (isCreate) {
      if (!input.policyName || !input.policyName.trim()) {
        throw new BadRequestError('Policy name is required');
      }
      if (input.scope === 'department') {
        if (!input.scopeId || !input.scopeId.trim()) {
          throw new BadRequestError('Department ID is required for department policy override');
        }
        const valid = await this.repo.validateScopeId(
          tenantId,
          companyId,
          'department',
          input.scopeId,
        );
        if (!valid) {
          throw new BadRequestError(
            `Department ${input.scopeId} does not exist or does not belong to this company`,
          );
        }
      }
      if (input.scope === 'employee') {
        if (!input.scopeId || !input.scopeId.trim()) {
          throw new BadRequestError('Employee ID is required for employee policy override');
        }
        const valid = await this.repo.validateScopeId(
          tenantId,
          companyId,
          'employee',
          input.scopeId,
        );
        if (!valid) {
          throw new BadRequestError(
            `Employee ${input.scopeId} does not exist or does not belong to this company`,
          );
        }
      }
    }

    // Threshold validation on top-level hours if present
    const halfDay = Number(input.halfDayThresholdHours ?? 0);
    const fullDay = Number(input.fullDayThresholdHours ?? 0);
    if (fullDay > 0 && halfDay > 0 && fullDay <= halfDay) {
      throw new BadRequestError(
        'Full day minimum hours must be greater than half day minimum hours',
      );
    }

    if (input.gracePeriodMinutes !== undefined && Number(input.gracePeriodMinutes) < 0) {
      throw new BadRequestError('Grace period minutes cannot be negative');
    }

    // Validate classificationRules if provided
    if (input.classificationRules) {
      const cr = input.classificationRules as unknown as ClassificationRulesConfig;
      if (cr.thresholdMode === 'fixed_hours') {
        const full = cr.minHoursForPresent ?? fullDay;
        const half = cr.minHoursForHalfDay ?? halfDay;
        if (full > 0 && half > 0 && full <= half) {
          throw new BadRequestError(
            'Full day minimum hours must be greater than half day minimum hours',
          );
        }
      } else if (cr.thresholdMode === 'percentage_of_shift') {
        const fullPct = cr.fullDayPercentage ?? 100;
        const halfPct = cr.halfDayPercentage ?? 50;
        if (fullPct <= halfPct) {
          throw new BadRequestError('Full day percentage must be greater than half day percentage');
        }
      }

      if (cr.workingHoursConfig) {
        const wh = cr.workingHoursConfig;
        if (wh.fullDayHours !== undefined && (wh.fullDayHours <= 0 || wh.fullDayHours > 24)) {
          throw new BadRequestError('Standard working hours must be greater than 0 and at most 24');
        }
      }

      if (cr.lateArrivalConfig) {
        const la = cr.lateArrivalConfig;
        if (la.graceMinutes !== undefined && la.graceMinutes < 0) {
          throw new BadRequestError('Late grace minutes cannot be negative');
        }
      }

      if (cr.earlyExitConfig) {
        const ee = cr.earlyExitConfig;
        if (ee.graceMinutes !== undefined && ee.graceMinutes < 0) {
          throw new BadRequestError('Early exit grace minutes cannot be negative');
        }
      }
    }

    // Validate penaltyRules if provided
    if (input.penaltyRules) {
      const pr = input.penaltyRules as unknown as PenaltyRulesConfig;
      if (pr.enabled) {
        if (
          pr.lateMarksThreshold !== undefined &&
          (!Number.isInteger(Number(pr.lateMarksThreshold)) || Number(pr.lateMarksThreshold) < 1)
        ) {
          throw new BadRequestError('Late marks threshold must be a positive integer');
        }
        if (
          pr.maxPenaltyUnits !== undefined &&
          pr.maxPenaltyUnits !== null &&
          Number(pr.maxPenaltyUnits) < 0
        ) {
          throw new BadRequestError('Maximum penalty units cannot be negative');
        }
      }
    }
  }

  async resolveEffectivePolicy(
    tenantId: string,
    companyId: string,
    employeeId?: string,
    departmentId?: string,
    targetDate?: string,
  ): Promise<EffectivePolicyResolution> {
    const effectiveDate = targetDate ?? new Date().toISOString().slice(0, 10);

    let effectiveDeptId = departmentId;
    if (employeeId && !effectiveDeptId) {
      effectiveDeptId =
        (await this.repo.getEmployeeDepartmentId(tenantId, companyId, employeeId)) ?? undefined;
    }

    const all = await this.repo.listPolicies(tenantId, companyId, {
      status: 'published',
      effectiveBefore: effectiveDate,
    });

    let companyPolicy = all.find((p) => p.scope === 'company');
    if (!companyPolicy) {
      companyPolicy = await this.repo.createPolicy(tenantId, companyId, {
        policyName: 'Standard Corporate Attendance Policy',
        scope: 'company',
        status: 'published',
        halfDayThresholdHours: 4.0,
        fullDayThresholdHours: 8.0,
        gracePeriodMinutes: 15,
        enableLateTracking: true,
        enableEarlyExitTracking: true,
        breakDeductionMethod: 'scheduled',
        missingPunchPolicy: 'flag_exception',
      });
    }

    const deptPolicy = effectiveDeptId
      ? all.find((p) => p.scope === 'department' && p.scopeId === effectiveDeptId)
      : null;
    const empPolicy = employeeId
      ? all.find((p) => p.scope === 'employee' && p.scopeId === employeeId)
      : null;

    const provenance: Record<string, 'employee' | 'department' | 'company' | 'default'> = {};
    const inheritableKeys = [
      'breakDeductionMethod',
      'enableLateTracking',
      'gracePeriodMinutes',
      'enableEarlyExitTracking',
      'halfDayThresholdHours',
      'fullDayThresholdHours',
      'missingPunchPolicy',
      'allowRegularization',
      'regularizationCutoffDays',
      'requiresApproval',
      'penaltyRules',
      'odRules',
      'classificationRules',
    ] as const;

    const resolved: AttendancePolicy = { ...companyPolicy };

    for (const key of inheritableKeys) {
      if (
        empPolicy &&
        (empPolicy as Record<string, unknown>)[key] !== null &&
        (empPolicy as Record<string, unknown>)[key] !== undefined
      ) {
        (resolved as Record<string, unknown>)[key] = (empPolicy as Record<string, unknown>)[key];
        provenance[key] = 'employee';
      } else if (
        deptPolicy &&
        (deptPolicy as Record<string, unknown>)[key] !== null &&
        (deptPolicy as Record<string, unknown>)[key] !== undefined
      ) {
        (resolved as Record<string, unknown>)[key] = (deptPolicy as Record<string, unknown>)[key];
        provenance[key] = 'department';
      } else if (
        companyPolicy &&
        (companyPolicy as Record<string, unknown>)[key] !== null &&
        (companyPolicy as Record<string, unknown>)[key] !== undefined
      ) {
        (resolved as Record<string, unknown>)[key] = (companyPolicy as Record<string, unknown>)[
          key
        ];
        provenance[key] = 'company';
      } else {
        provenance[key] = 'default';
      }
    }

    // Set identification based on highest level
    if (empPolicy) {
      resolved.id = empPolicy.id;
      resolved.policyName = `${empPolicy.policyName} (Resolved with Company Defaults)`;
      resolved.scope = 'employee';
      resolved.scopeId = empPolicy.scopeId;
      resolved.version = empPolicy.version;
    } else if (deptPolicy) {
      resolved.id = deptPolicy.id;
      resolved.policyName = `${deptPolicy.policyName} (Resolved with Company Defaults)`;
      resolved.scope = 'department';
      resolved.scopeId = deptPolicy.scopeId;
      resolved.version = deptPolicy.version;
    }

    const activeOverridesCount = Object.values(provenance).filter(
      (source) => source === 'employee' || source === 'department',
    ).length;

    return {
      policy: resolved,
      provenance,
      activeOverridesCount,
      effectiveDate: resolved.effectiveFrom || new Date().toISOString().slice(0, 10),
    };
  }

  async createPolicy(
    tenantId: string,
    companyId: string,
    input: UpdateAttendancePolicyInput,
    userId?: string,
    clientIp?: string,
  ): Promise<AttendancePolicy> {
    await this.validatePolicyInput(tenantId, companyId, input, true);

    const created = await this.repo.createPolicy(tenantId, companyId, input);

    await this.repo.recordAuditLog(tenantId, companyId, {
      category: 'policy',
      action: input.status === 'draft' ? 'draft_created' : 'published',
      entityId: created.id,
      entityType: 'attendance_policies',
      newValues: created as unknown as Record<string, unknown>,
      changedByUserId: userId,
      clientIp,
    });

    return created;
  }

  async updatePolicy(
    tenantId: string,
    companyId: string,
    policyId: string,
    input: UpdateAttendancePolicyInput,
    userId?: string,
    clientIp?: string,
  ): Promise<AttendancePolicy> {
    await this.validatePolicyInput(tenantId, companyId, input, false);
    const prev = await this.getPolicyById(tenantId, companyId, policyId);
    const updated = await this.repo.updatePolicy(tenantId, companyId, policyId, input);

    await this.repo.recordAuditLog(tenantId, companyId, {
      category: 'policy',
      action: input.status === 'published' && prev.status === 'draft' ? 'published' : 'updated',
      entityId: policyId,
      entityType: 'attendance_policies',
      previousValues: prev as unknown as Record<string, unknown>,
      newValues: input as Record<string, unknown>,
      changedByUserId: userId,
      clientIp,
    });

    return updated;
  }

  async publishPolicy(
    tenantId: string,
    companyId: string,
    policyId: string,
    input: PublishPolicyInput,
    userId?: string,
    clientIp?: string,
  ): Promise<AttendancePolicy> {
    if (!input.changeReason || !input.changeReason.trim()) {
      throw new BadRequestError('A change reason is required when publishing an attendance policy');
    }
    const prev = await this.getPolicyById(tenantId, companyId, policyId);
    await this.validatePolicyInput(tenantId, companyId, prev, false);

    const published = await this.repo.publishPolicy(
      tenantId,
      companyId,
      policyId,
      input.effectiveFrom,
    );

    await this.repo.recordAuditLog(tenantId, companyId, {
      category: 'policy',
      action: 'published',
      entityId: policyId,
      entityType: 'attendance_policies',
      previousValues: prev as unknown as Record<string, unknown>,
      newValues: {
        ...(published as unknown as Record<string, unknown>),
        changeReason: input.changeReason,
      },
      changedByUserId: userId,
      clientIp,
    });

    return published;
  }

  async rollbackPolicyVersion(
    tenantId: string,
    companyId: string,
    targetPolicyId: string,
    userId?: string,
    clientIp?: string,
  ): Promise<AttendancePolicy> {
    const target = await this.getPolicyById(tenantId, companyId, targetPolicyId);
    const all = await this.repo.listPolicies(tenantId, companyId);
    const maxVersion = Math.max(...all.map((p) => p.version), 0);

    // Rollback creates a new published version reflecting the old policy's config
    const rolledBack = await this.repo.createPolicy(tenantId, companyId, {
      policyName: `${target.policyName} (Restored v${target.version})`,
      version: maxVersion + 1,
      status: 'published',
      description: `Rolled back from version ${target.version} (snapshot id: ${target.id})`,
      scope: target.scope as 'company' | 'department' | 'employee',
      scopeId: target.scopeId,
      captureMethods: target.captureMethods,
      breakDeductionMethod: target.breakDeductionMethod as 'scheduled' | 'actual' | 'none',
      enableLateTracking: target.enableLateTracking,
      gracePeriodMinutes: target.gracePeriodMinutes,
      enableEarlyExitTracking: target.enableEarlyExitTracking,
      halfDayThresholdHours: Number(target.halfDayThresholdHours),
      fullDayThresholdHours: Number(target.fullDayThresholdHours),
      missingPunchPolicy: target.missingPunchPolicy as
        'mark_absent' | 'half_day' | 'flag_exception' | 'none',
      allowRegularization: target.allowRegularization,
      regularizationCutoffDays: target.regularizationCutoffDays,
      requiresApproval: target.requiresApproval,
      effectiveFrom: new Date().toISOString().slice(0, 10),
      penaltyRules: target.penaltyRules as unknown as PenaltyRulesConfig | undefined,
      odRules: target.odRules as unknown as OnDutyRulesConfig | undefined,
      classificationRules: target.classificationRules as unknown as
        ClassificationRulesConfig | undefined,
    });

    await this.repo.recordAuditLog(tenantId, companyId, {
      category: 'policy',
      action: 'rolled_back',
      entityId: rolledBack.id,
      entityType: 'attendance_policies',
      previousValues: { fromPolicyId: targetPolicyId, fromVersion: target.version },
      newValues: { newPolicyId: rolledBack.id, newVersion: rolledBack.version },
      changedByUserId: userId,
      clientIp,
    });

    return rolledBack;
  }

  /* ── 3. Regularization Settings ─────────────────────────────────── */

  async getRegularizationSettings(
    tenantId: string,
    companyId: string,
  ): Promise<AttendanceRegularizationSettings> {
    const settings = await this.repo.getRegularizationSettings(tenantId, companyId);
    if (settings) return settings;
    return this.repo.upsertRegularizationSettings(tenantId, companyId, {});
  }

  async updateRegularizationSettings(
    tenantId: string,
    companyId: string,
    input: RegularizationSettingsInput,
    userId?: string,
    clientIp?: string,
  ): Promise<AttendanceRegularizationSettings> {
    const prev = await this.getRegularizationSettings(tenantId, companyId);
    const updated = await this.repo.upsertRegularizationSettings(tenantId, companyId, input);

    await this.repo.recordAuditLog(tenantId, companyId, {
      category: 'regularization',
      action: 'updated',
      entityId: updated.id,
      entityType: 'attendance_regularization_settings',
      previousValues: prev as unknown as Record<string, unknown>,
      newValues: input as Record<string, unknown>,
      changedByUserId: userId,
      clientIp,
    });

    return updated;
  }

  /* ── 4. Capture & Devices ───────────────────────────────────────── */

  async listDevices(tenantId: string, companyId: string): Promise<AttendanceDevice[]> {
    return this.repo.listDevices(tenantId, companyId);
  }

  async registerDevice(
    tenantId: string,
    companyId: string,
    input: DeviceInput,
    userId?: string,
    clientIp?: string,
  ): Promise<AttendanceDevice> {
    if (!input.deviceName || !input.deviceCode) {
      throw new BadRequestError('Device name and device code are required');
    }
    const created = await this.repo.createDevice(tenantId, companyId, input);

    await this.repo.recordAuditLog(tenantId, companyId, {
      category: 'capture_device',
      action: 'device_registered',
      entityId: created.id,
      entityType: 'attendance_devices',
      newValues: created as unknown as Record<string, unknown>,
      changedByUserId: userId,
      clientIp,
    });

    return created;
  }

  async updateDevice(
    tenantId: string,
    companyId: string,
    deviceId: string,
    input: Partial<DeviceInput>,
    userId?: string,
    clientIp?: string,
  ): Promise<AttendanceDevice> {
    const prev = await this.repo.getDeviceById(tenantId, companyId, deviceId);
    if (!prev) throw new NotFoundError(`Device ${deviceId} not found`);

    const updated = await this.repo.updateDevice(tenantId, companyId, deviceId, input);

    await this.repo.recordAuditLog(tenantId, companyId, {
      category: 'capture_device',
      action: 'device_updated',
      entityId: deviceId,
      entityType: 'attendance_devices',
      previousValues: prev as unknown as Record<string, unknown>,
      newValues: input as Record<string, unknown>,
      changedByUserId: userId,
      clientIp,
    });

    return updated;
  }

  async testDeviceConnection(
    tenantId: string,
    companyId: string,
    deviceId: string,
  ): Promise<{ status: 'online' | 'offline' | 'testing'; latencyMs: number; message: string }> {
    const device = await this.repo.getDeviceById(tenantId, companyId, deviceId);
    if (!device) throw new NotFoundError(`Device ${deviceId} not found`);

    if (!device.ipAddress) {
      return {
        status: 'offline',
        latencyMs: 0,
        message: `Device ${device.deviceCode} has no host or IP address configured.`,
      };
    }

    const port = device.port ?? DEFAULT_DEVICE_PORT;
    const probe = await probeTcp(device.ipAddress, port);
    const status = probe.reachable ? 'online' : 'offline';
    await this.repo.updateDevice(tenantId, companyId, deviceId, {
      status,
      lastHeartbeatAt: probe.reachable ? new Date() : undefined,
    });

    const reasons: Record<NonNullable<typeof probe.error>, string> = {
      timeout: 'the connection timed out',
      refused: 'the connection was refused',
      unreachable: 'the host could not be reached',
      blocked: 'the address is not allowed for device checks',
    };
    return {
      status,
      latencyMs: probe.latencyMs,
      message: probe.reachable
        ? `Device ${device.deviceCode} accepted a connection on ${device.ipAddress}:${port} in ${probe.latencyMs}ms.`
        : `Device ${device.deviceCode} is unreachable at ${device.ipAddress}:${port}: ${reasons[probe.error ?? 'unreachable']}.`,
    };
  }

  async listImportBatches(tenantId: string, companyId: string): Promise<AttendanceImportBatch[]> {
    return this.repo.listImportBatches(tenantId, companyId);
  }

  /* ── 5. Location & Security Settings ────────────────────────────── */

  async getSecuritySettings(
    tenantId: string,
    companyId: string,
  ): Promise<AttendanceSecuritySettings> {
    const settings = await this.repo.getSecuritySettings(tenantId, companyId);
    if (settings) return settings;
    return this.repo.upsertSecuritySettings(tenantId, companyId, {});
  }

  async updateSecuritySettings(
    tenantId: string,
    companyId: string,
    input: SecuritySettingsInput,
    userId?: string,
    clientIp?: string,
  ): Promise<AttendanceSecuritySettings> {
    const prev = await this.getSecuritySettings(tenantId, companyId);
    const updated = await this.repo.upsertSecuritySettings(tenantId, companyId, input);

    await this.repo.recordAuditLog(tenantId, companyId, {
      category: 'location_security',
      action: 'updated',
      entityId: updated.id,
      entityType: 'attendance_security_settings',
      previousValues: prev as unknown as Record<string, unknown>,
      newValues: input as Record<string, unknown>,
      changedByUserId: userId,
      clientIp,
    });

    return updated;
  }

  /* ── 6. Payroll & Locking ───────────────────────────────────────── */

  async getPayrollSettings(
    tenantId: string,
    companyId: string,
  ): Promise<AttendancePayrollSettings> {
    const settings = await this.repo.getPayrollSettings(tenantId, companyId);
    if (settings) return settings;
    return this.repo.upsertPayrollSettings(tenantId, companyId, {});
  }

  async updatePayrollSettings(
    tenantId: string,
    companyId: string,
    input: PayrollSettingsInput,
    userId?: string,
    clientIp?: string,
  ): Promise<AttendancePayrollSettings> {
    const prev = await this.getPayrollSettings(tenantId, companyId);
    const updated = await this.repo.upsertPayrollSettings(tenantId, companyId, input);

    await this.repo.recordAuditLog(tenantId, companyId, {
      category: 'payroll_locking',
      action: 'updated',
      entityId: updated.id,
      entityType: 'attendance_payroll_settings',
      previousValues: prev as unknown as Record<string, unknown>,
      newValues: input as Record<string, unknown>,
      changedByUserId: userId,
      clientIp,
    });

    return updated;
  }

  /**
   * The period for `periodCode`, created on first use and (while still open)
   * re-aligned to the company's current payroll cycle. Locked periods keep the
   * boundaries they were locked with.
   */
  private async ensurePeriod(
    tenantId: string,
    companyId: string,
    periodCode: string,
  ): Promise<AttendancePeriod> {
    const settings = await this.getPayrollSettings(tenantId, companyId);
    const bounds = computePeriodBounds(periodCode, settings.cycleType, settings.cutoffDay);
    if (!bounds) {
      throw new BadRequestError(`Invalid period code '${periodCode}'. Use YYYY-MM.`);
    }
    const existing = await this.repo.getPeriodByCode(tenantId, companyId, periodCode);
    if (!existing) {
      return this.repo.upsertPeriod(tenantId, companyId, bounds);
    }
    if (
      existing.status === 'open' &&
      (existing.startDate !== bounds.startDate || existing.endDate !== bounds.endDate)
    ) {
      await this.repo.updateOpenPeriodBounds(tenantId, companyId, periodCode, bounds);
      return (await this.repo.getPeriodByCode(tenantId, companyId, periodCode))!;
    }
    return existing;
  }

  async listPeriods(tenantId: string, companyId: string): Promise<AttendancePeriod[]> {
    const periods = await this.repo.listPeriods(tenantId, companyId);
    const settings = await this.getPayrollSettings(tenantId, companyId);
    const currentCode = periodCodeForDate(
      new Date().toISOString().slice(0, 10),
      settings.cycleType,
      settings.cutoffDay,
    );
    if (periods.length === 0) {
      return [await this.ensurePeriod(tenantId, companyId, currentCode)];
    }
    // Open periods follow the current cycle settings; locked ones are left as locked.
    const aligned = await Promise.all(
      periods.map((p) =>
        p.status === 'open' ? this.ensurePeriod(tenantId, companyId, p.periodCode) : p,
      ),
    );
    return aligned;
  }

  async checkPeriodLockReadiness(
    tenantId: string,
    companyId: string,
    periodCode: string,
  ): Promise<{
    canLock: boolean;
    unresolvedMissingPunches: number;
    pendingRegularizations: number;
    unreviewedMonthlySummaries: number;
    warnings: string[];
  }> {
    const period = await this.ensurePeriod(tenantId, companyId, periodCode);
    const payrollSettings = await this.getPayrollSettings(tenantId, companyId);

    // Inspect pending regularizations and missing punches
    const pendingRegularizations = await this.repo.countPendingRegularizationsInRange(
      tenantId,
      companyId,
      period.startDate,
      period.endDate,
    );
    const rows = await this.attRepo.getPeriodMatrix(
      tenantId,
      companyId,
      period.startDate,
      period.endDate,
    );

    let unresolvedMissingPunches = 0;
    for (const emp of rows) {
      for (const day of Object.values(emp.days)) {
        if (day.isMissingPunch) {
          unresolvedMissingPunches++;
        }
      }
    }

    const warnings: string[] = [];
    if (pendingRegularizations > 0) {
      warnings.push(
        `${pendingRegularizations} employee regularization request(s) remain pending in this period.`,
      );
    }
    if (unresolvedMissingPunches > 0) {
      warnings.push(
        `${unresolvedMissingPunches} missing punch instance(s) have not been reconciled.`,
      );
    }

    // "Require approval before lock" is a hard requirement, independent of the
    // blocking severity used for the soft checks above.
    let unreviewedMonthlySummaries = 0;
    let approvalMissing = false;
    if (payrollSettings.requireApprovalBeforeLock) {
      const reviews = await this.repo.countMonthlySummaryReviews(tenantId, companyId, periodCode);
      unreviewedMonthlySummaries = reviews.notReviewed;
      if (reviews.total === 0) {
        approvalMissing = true;
        warnings.push(
          `No reviewed monthly attendance summary exists for ${periodCode}; company settings require review before locking.`,
        );
      } else if (reviews.notReviewed > 0) {
        approvalMissing = true;
        warnings.push(
          `${reviews.notReviewed} monthly attendance summar${reviews.notReviewed === 1 ? 'y is' : 'ies are'} not reviewed; company settings require review before locking.`,
        );
      }
    }

    const canLock =
      !approvalMissing &&
      (payrollSettings.blockingSeverity === 'warning_only' ||
        (pendingRegularizations === 0 && unresolvedMissingPunches === 0));

    return {
      canLock,
      unresolvedMissingPunches,
      pendingRegularizations,
      unreviewedMonthlySummaries,
      warnings,
    };
  }

  async lockPeriod(
    tenantId: string,
    companyId: string,
    periodCode: string,
    userId: string,
    clientIp?: string,
  ): Promise<AttendancePeriod> {
    const readiness = await this.checkPeriodLockReadiness(tenantId, companyId, periodCode);
    if (!readiness.canLock) {
      throw new BadRequestError(
        `Cannot lock period ${periodCode}: Unresolved items present under hard-block policy. ${readiness.warnings.join(' ')}`,
      );
    }

    const locked = await this.repo.lockPeriod(tenantId, companyId, periodCode, userId);

    await this.repo.recordAuditLog(tenantId, companyId, {
      category: 'payroll_locking',
      action: 'period_locked',
      entityId: locked.id,
      entityType: 'attendance_periods',
      newValues: { periodCode, lockedAt: locked.lockedAt },
      changedByUserId: userId,
      clientIp,
    });

    return locked;
  }

  async unlockPeriod(
    tenantId: string,
    companyId: string,
    periodCode: string,
    reason: string,
    userId: string,
    clientIp?: string,
  ): Promise<AttendancePeriod> {
    if (!reason || reason.trim().length < 5) {
      throw new BadRequestError(
        'A detailed reason (minimum 5 characters) is required to reopen a locked period',
      );
    }

    await this.ensurePeriod(tenantId, companyId, periodCode);
    const unlocked = await this.repo.unlockPeriod(tenantId, companyId, periodCode, userId, reason);

    await this.repo.recordAuditLog(tenantId, companyId, {
      category: 'payroll_locking',
      action: 'period_unlocked',
      entityId: unlocked.id,
      entityType: 'attendance_periods',
      newValues: { periodCode, reason },
      changedByUserId: userId,
      clientIp,
    });

    return unlocked;
  }

  async listHandoverBatches(
    tenantId: string,
    companyId: string,
  ): Promise<AttendancePayrollHandoverBatch[]> {
    return this.repo.listHandoverBatches(tenantId, companyId);
  }

  async generatePayrollHandover(
    tenantId: string,
    companyId: string,
    periodCode: string,
    format: 'csv' | 'json' | 'api_push',
    userId?: string,
    clientIp?: string,
  ): Promise<{ batch: AttendancePayrollHandoverBatch; exportData: string }> {
    let periods = await this.repo.listPeriods(tenantId, companyId);
    if (periods.length === 0) periods = await this.listPeriods(tenantId, companyId);
    const period = periods.find((p) => p.periodCode === periodCode);
    if (!period) throw new NotFoundError(`Period ${periodCode} not found`);

    const rows = await this.attRepo.getPeriodMatrix(
      tenantId,
      companyId,
      period.startDate,
      period.endDate,
    );
    const daysInMonth = daysBetweenInclusive(period.startDate, period.endDate);

    const effectivePolicy = await this.resolveEffectivePolicy(tenantId, companyId);
    const penaltyRules = effectivePolicy.policy
      .penaltyRules as unknown as PenaltyRulesConfig | null;

    let totalEligibleDays = 0;
    let totalRecommendedPenaltyUnits = 0;
    const records = rows.map((r: MonthlySummaryEmployeeRow) => {
      // 1. Attendance Facts
      const days = Object.values(r.days ?? {});
      const lateMarks = days.filter((d) => d.isLate).length;
      const unresolvedExceptions = days.filter(
        (d) =>
          d.isMissingPunch || d.status === 'incomplete' || d.processingState === 'pending_review',
      ).length;

      // 2. Policy-derived penalty recommendation (ADVISORY, NOT DIRECT DEDUCTION OF ATTENDANCE PAYABLE DAYS)
      const penalty = penaltyRules
        ? attendanceCalculationService.calculatePenaltyUnits(lateMarks, penaltyRules)
        : {
            penaltyUnits: 0,
            triggers: 0,
            isCapped: false,
            isWarningOnly: false,
            unitType: 'none',
            explanation: 'No penalty rules configured',
          };
      const penaltyDays = penalty.penaltyUnits ?? 0;

      // Eligible work days based strictly on attendance facts:
      const eligibleWorkDays =
        r.totals.present + r.totals.halfDay * 0.5 + r.totals.onLeave + r.totals.holiday;
      const readinessStatus: 'ready' | 'blocked' | 'requires_review' =
        unresolvedExceptions > 0 ? 'requires_review' : 'ready';

      totalEligibleDays += eligibleWorkDays;
      totalRecommendedPenaltyUnits += penaltyDays;

      return {
        employeeId: r.employeeId,
        employeeCode: r.employeeCode,
        employeeName: r.employeeName,
        department: r.departmentName ?? 'General',
        attendanceSummary: {
          totalDays: daysInMonth,
          scheduledDays: daysInMonth - r.totals.holiday,
          presentDays: r.totals.present,
          halfDays: r.totals.halfDay,
          absentDays: r.totals.absent,
          approvedLeaveDays: r.totals.onLeave,
          approvedOdDays: 0,
          verifiedWorkedMinutes: r.totals.totalWorkedMinutes,
          eligibleWorkDays: Math.round(eligibleWorkDays * 10) / 10,
        },
        penaltyRecommendations: [
          {
            policyVersionId: effectivePolicy.policy.id || 'v1',
            reasonCode: 'LATE_ARRIVAL_PENALTY',
            occurrenceCount: lateMarks,
            dayEquivalentUnits: Math.round(penaltyDays * 10) / 10,
          },
        ],
        readiness: {
          status: readinessStatus,
          unresolvedExceptionCount: unresolvedExceptions,
        },
        calculationVersion: '1.0',
        // Backward-compatibility fields for consumers
        totalDays: daysInMonth,
        presentDays: r.totals.present,
        absentDays: r.totals.absent,
        halfDays: r.totals.halfDay,
        leaveDays: r.totals.onLeave,
        holidayDays: r.totals.holiday,
        payableDays: Math.round(eligibleWorkDays * 10) / 10,
        deductionUnits: Math.round(penaltyDays * 10) / 10,
        penaltyUnits: Math.round(penaltyDays * 10) / 10,
        workedHours: Math.round((r.totals.totalWorkedMinutes / 60) * 10) / 10,
        lateMinutes: r.totals.totalLateMinutes,
      };
    });

    const batchNumber = `PAY-HO-${periodCode}-${Date.now().toString().slice(-4)}`;
    const batch = await this.repo.createHandoverBatch(tenantId, companyId, {
      periodId: period.id,
      batchNumber,
      totalEmployees: rows.length,
      totalPayableDays: Math.round(totalEligibleDays * 10) / 10,
      totalDeductionUnits: Math.round(totalRecommendedPenaltyUnits * 10) / 10,
      exportedFormat: format,
      generatedByUserId: userId,
      summarySnapshot: {
        totalEmployees: rows.length,
        totalEligibleWorkDays: Math.round(totalEligibleDays * 10) / 10,
        totalRecommendedPenaltyUnits: Math.round(totalRecommendedPenaltyUnits * 10) / 10,
        periodCode,
        policyVersionId: effectivePolicy.policy.id,
        calculationVersion: '1.0',
      },
    });

    await this.repo.recordAuditLog(tenantId, companyId, {
      category: 'payroll_locking',
      action: 'payroll_handover_generated',
      entityId: batch.id,
      entityType: 'attendance_payroll_handover_batches',
      newValues: { batchNumber, format, employees: rows.length },
      changedByUserId: userId,
      clientIp,
    });

    if (format === 'json') {
      return { batch, exportData: JSON.stringify(records, null, 2) };
    }

    // CSV format
    const headers = [
      'Employee Code',
      'Employee Name',
      'Department',
      'Total Days',
      'Present Days',
      'Absent Days',
      'Half Days',
      'Leave Days',
      'Holidays',
      'Verified Worked Hours',
      'Eligible Work Days',
      'Recommended Penalty Units',
      'Readiness Status',
    ];
    const csvLines = [
      headers.join(','),
      ...records.map((rec) =>
        [
          `"${rec.employeeCode}"`,
          `"${rec.employeeName}"`,
          `"${rec.department}"`,
          rec.totalDays,
          rec.presentDays,
          rec.absentDays,
          rec.halfDays,
          rec.leaveDays,
          rec.holidayDays,
          rec.workedHours,
          rec.payableDays,
          rec.deductionUnits,
          rec.readiness.status,
        ].join(','),
      ),
    ];

    return { batch, exportData: csvLines.join('\n') };
  }

  /* ── 7. Audit & History ─────────────────────────────────────────── */

  async getAuditLogs(
    tenantId: string,
    companyId: string,
    filter?: SettingsAuditFilter,
  ): Promise<{ items: AttendanceSettingsAuditLog[]; total: number }> {
    return this.repo.queryAuditLogs(tenantId, companyId, filter);
  }

  /* ── 8. Shift & Roster Configuration ────────────────────────────── */

  async getShiftRosterSettings(tenantId: string, companyId: string): Promise<ShiftRosterSettings> {
    return this.repo.getShiftRosterSettings(tenantId, companyId);
  }

  async updateShiftRosterSettings(
    tenantId: string,
    companyId: string,
    input: UpdateShiftRosterSettingsInput,
    userId?: string,
    clientIp?: string,
  ): Promise<ShiftRosterSettings> {
    const prev = await this.repo.getShiftRosterSettings(tenantId, companyId);
    const updated = await this.repo.updateShiftRosterSettings(tenantId, companyId, input);

    await this.repo.recordAuditLog(tenantId, companyId, {
      category: 'general',
      action: 'roster_settings_updated',
      entityId: companyId,
      entityType: 'shift_roster_settings',
      previousValues: prev as unknown as Record<string, unknown>,
      newValues: updated as unknown as Record<string, unknown>,
      changedByUserId: userId,
      clientIp,
    });

    return updated;
  }

  async createCompanyShift(
    tenantId: string,
    companyId: string,
    input: CreateShiftInput,
    userId?: string,
    clientIp?: string,
  ): Promise<CompanyShiftTemplate> {
    if (!input.name || !input.code || !input.startTime || !input.endTime) {
      throw new BadRequestError('Shift name, code, start time, and end time are required');
    }

    const created = await this.repo.createCompanyShift(tenantId, companyId, input);

    await this.repo.recordAuditLog(tenantId, companyId, {
      category: 'general',
      action: 'shift_created',
      entityId: created.id,
      entityType: 'company_shifts',
      newValues: created as unknown as Record<string, unknown>,
      changedByUserId: userId,
      clientIp,
    });

    return created;
  }

  async updateCompanyShift(
    tenantId: string,
    companyId: string,
    shiftId: string,
    input: UpdateShiftInput,
    userId?: string,
    clientIp?: string,
  ): Promise<CompanyShiftTemplate> {
    const prevSettings = await this.repo.getShiftRosterSettings(tenantId, companyId);
    const prevShift = prevSettings.shifts.find((s) => s.id === shiftId);
    if (!prevShift) {
      throw new NotFoundError(`Shift template '${shiftId}' was not found`);
    }

    const updated = await this.repo.updateCompanyShift(tenantId, companyId, shiftId, input);
    if (!updated) {
      throw new NotFoundError(`Shift template '${shiftId}' was not found`);
    }

    await this.repo.recordAuditLog(tenantId, companyId, {
      category: 'general',
      action: 'shift_updated',
      entityId: shiftId,
      entityType: 'company_shifts',
      previousValues: prevShift as unknown as Record<string, unknown>,
      newValues: updated as unknown as Record<string, unknown>,
      changedByUserId: userId,
      clientIp,
    });

    return updated;
  }

  async deleteCompanyShift(
    tenantId: string,
    companyId: string,
    shiftId: string,
    userId?: string,
    clientIp?: string,
  ): Promise<{ success: boolean }> {
    const prevSettings = await this.repo.getShiftRosterSettings(tenantId, companyId);
    const prevShift = prevSettings.shifts.find((s) => s.id === shiftId);
    if (!prevShift) {
      throw new NotFoundError(`Shift template '${shiftId}' was not found`);
    }

    const success = await this.repo.deleteCompanyShift(tenantId, companyId, shiftId);

    await this.repo.recordAuditLog(tenantId, companyId, {
      category: 'general',
      action: 'shift_deleted',
      entityId: shiftId,
      entityType: 'company_shifts',
      previousValues: prevShift as unknown as Record<string, unknown>,
      changedByUserId: userId,
      clientIp,
    });

    return { success };
  }
}

export const attendanceSettingsService = new AttendanceSettingsService();
