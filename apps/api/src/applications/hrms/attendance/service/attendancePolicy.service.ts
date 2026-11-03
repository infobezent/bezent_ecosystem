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
import { attendanceSettingsRepository } from '../repository/attendanceSettings.repository.js';

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
    userId?: string,
  ): Promise<AttendancePolicy> {
    const existing = await this.getPolicy(tenantId, companyId);

    if (existing.id && existing.id !== 'att_pol_default') {
      if (existing.status !== 'draft') {
        const updated = await attendanceSettingsRepository.updatePolicy(
          tenantId,
          companyId,
          existing.id,
          input,
        );
        await attendanceSettingsRepository.recordAuditLog(tenantId, companyId, {
          category: 'policy',
          action: 'updated',
          entityId: existing.id,
          entityType: 'attendance_policies',
          previousValues: existing as unknown as Record<string, unknown>,
          newValues: input as Record<string, unknown>,
          changedByUserId: userId,
        });
        return updated;
      }

      // Route through attendanceSettingsService to strictly enforce policy immutability on published/archived policies (P0)
      return attendanceSettingsService.updatePolicy(
        tenantId,
        companyId,
        existing.id,
        input,
        userId,
      );
    }

    return attendanceSettingsService.createPolicy(
      tenantId,
      companyId,
      {
        policyName: input.policyName ?? 'Standard Corporate Attendance Policy',
        scope: 'company',
        status: 'draft',
        ...input,
      },
      userId,
    );
  }
}

export const attendancePolicyService = new AttendancePolicyService();
