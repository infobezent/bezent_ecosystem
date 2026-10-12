import { eq } from 'drizzle-orm';
import { getDb } from '../../../../db/connection.js';
import { attendancePolicies, type AttendancePolicy } from '../../../../db/schema.js';
import { generateSurrogateId } from '../../../../platform/auth/security.js';
import type { UpdateAttendancePolicyInput } from '../types/attendance.types.js';

export const FALLBACK_ATTENDANCE_POLICY: AttendancePolicy = {
  id: 'att_pol_default',
  tenantId: 'default',
  companyId: 'default',
  policyName: 'Default Standard Policy',
  version: 1,
  status: 'published',
  description: 'Default standard attendance policy',
  scope: 'company',
  scopeId: null,
  overridesPriority: 10,
  captureMethods: ['web', 'mobile', 'biometric'],
  breakDeductionMethod: 'scheduled',
  enableLateTracking: true,
  gracePeriodMinutes: 15,
  enableEarlyExitTracking: true,
  halfDayThresholdHours: '4.00',
  fullDayThresholdHours: '8.00',
  missingPunchPolicy: 'flag_exception',
  allowRegularization: true,
  regularizationCutoffDays: 7,
  requiresApproval: true,
  effectiveFrom: '2026-01-01',
  penaltyRules: null,
  odRules: null,
  classificationRules: null,
  isActive: true,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
};

import { attendanceSettingsService } from './attendanceSettings.service.js';

export class AttendancePolicyService {
  async getEffectivePolicy(
    tenantId: string,
    companyId: string,
    date?: string,
    employeeId?: string,
    departmentId?: string,
  ): Promise<AttendancePolicy> {
    try {
      const resolution = await attendanceSettingsService.resolveEffectivePolicy(
        tenantId,
        companyId,
        employeeId,
        departmentId,
        date,
      );
      return resolution.policy;
    } catch {
      return {
        ...FALLBACK_ATTENDANCE_POLICY,
        tenantId,
        companyId,
      };
    }
  }

  async getPolicy(tenantId: string, companyId: string): Promise<AttendancePolicy> {
    return this.getEffectivePolicy(tenantId, companyId);
  }

  async updatePolicy(
    tenantId: string,
    companyId: string,
    input: UpdateAttendancePolicyInput,
  ): Promise<AttendancePolicy> {
    const db = getDb();
    const existing = await this.getPolicy(tenantId, companyId);

    if (existing.id && existing.id !== 'att_pol_default') {
      await db
        .update(attendancePolicies)
        .set({
          policyName: input.policyName ?? existing.policyName,
          captureMethods: input.captureMethods ?? existing.captureMethods,
          gracePeriodMinutes: input.gracePeriodMinutes ?? existing.gracePeriodMinutes,
          halfDayThresholdHours:
            input.halfDayThresholdHours !== undefined
              ? Number(input.halfDayThresholdHours).toFixed(2)
              : existing.halfDayThresholdHours,
          fullDayThresholdHours:
            input.fullDayThresholdHours !== undefined
              ? Number(input.fullDayThresholdHours).toFixed(2)
              : existing.fullDayThresholdHours,
          missingPunchPolicy: input.missingPunchPolicy ?? existing.missingPunchPolicy,
          allowRegularization: input.allowRegularization ?? existing.allowRegularization,
          regularizationCutoffDays:
            input.regularizationCutoffDays ?? existing.regularizationCutoffDays,
          requiresApproval: input.requiresApproval ?? existing.requiresApproval,
          effectiveFrom: input.effectiveFrom ?? existing.effectiveFrom,
        })
        .where(eq(attendancePolicies.id, existing.id));

      const [updated] = await db
        .select()
        .from(attendancePolicies)
        .where(eq(attendancePolicies.id, existing.id));
      return updated!;
    }

    const id = generateSurrogateId('att_pol');
    const newPolicy = {
      id,
      tenantId,
      companyId,
      policyName: input.policyName ?? 'Standard Attendance Policy',
      captureMethods: input.captureMethods ?? ['web', 'mobile', 'biometric'],
      gracePeriodMinutes: input.gracePeriodMinutes ?? 15,
      halfDayThresholdHours: Number(input.halfDayThresholdHours ?? 4).toFixed(2),
      fullDayThresholdHours: Number(input.fullDayThresholdHours ?? 8).toFixed(2),
      missingPunchPolicy: input.missingPunchPolicy ?? 'flag_exception',
      allowRegularization: input.allowRegularization ?? true,
      regularizationCutoffDays: input.regularizationCutoffDays ?? 7,
      requiresApproval: input.requiresApproval ?? true,
      effectiveFrom: input.effectiveFrom ?? new Date().toISOString().slice(0, 10),
      isActive: true,
    };

    await db.insert(attendancePolicies).values(newPolicy);
    const [created] = await db
      .select()
      .from(attendancePolicies)
      .where(eq(attendancePolicies.id, id));
    return created!;
  }
}

export const attendancePolicyService = new AttendancePolicyService();
