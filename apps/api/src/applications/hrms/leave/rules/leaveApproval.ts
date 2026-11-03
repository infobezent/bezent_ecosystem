/**
 * HRMS Leave Domain — approval routing rules (pure).
 */

import type { LeaveApprovalLevel } from '../../../../db/schema.js';

export interface ResolvedApprover {
  employeeId: string | null;
  roleId: string | null;
}

export interface PlannedStep {
  level: number;
  approverEmployeeId: string | null;
  approverRoleId: string | null;
  action: 'pending' | 'waiting' | 'skipped';
  slaDueAt: Date | null;
  onSlaBreach: LeaveApprovalLevel['onSlaBreach'];
}

export const addHours = (date: Date, hours: number) => new Date(date.getTime() + hours * 3_600_000);

/**
 * Turns workflow levels and their resolved approvers into request steps.
 * Levels whose approver is the applicant are skipped unless HR self-approval is authorized;
 * the first remaining level becomes pending with its SLA clock started.
 * Auto-approval applies ONLY when the total duration is within the configured autoApproveUpToDays threshold.
 * It NEVER automatically approves simply because all levels were skipped (which routes to fallback).
 */
export function planApprovalSteps(input: {
  levels: LeaveApprovalLevel[];
  approvers: ResolvedApprover[];
  applicantEmployeeId: string;
  skipIfApproverIsApplicant: boolean;
  autoApproveUpToDays: number | null;
  totalDays: number;
  now: Date;
  fallbackApproverRoleId?: string | null;
  allowSelfApprovalForHr?: boolean;
  isApplicantHr?: boolean;
}): { steps: PlannedStep[]; autoApprove: boolean } {
  if (input.autoApproveUpToDays !== null && input.totalDays <= input.autoApproveUpToDays) {
    return { steps: [], autoApprove: true };
  }

  let pendingAssigned = false;
  const steps: PlannedStep[] = [];

  for (let i = 0; i < input.levels.length; i++) {
    const level = input.levels[i]!;
    const approver = input.approvers[i] ?? { employeeId: null, roleId: null };

    const isApplicant =
      approver.roleId === null &&
      approver.employeeId === input.applicantEmployeeId;

    const canSelfApprove =
      isApplicant && Boolean(input.allowSelfApprovalForHr && input.isApplicantHr);

    const shouldSkip = isApplicant && !canSelfApprove && input.skipIfApproverIsApplicant;

    const base = {
      level: i + 1,
      approverEmployeeId: approver.employeeId,
      approverRoleId: approver.roleId,
      onSlaBreach: level.onSlaBreach,
    };

    if (shouldSkip) {
      steps.push({ ...base, action: 'skipped', slaDueAt: null });
      continue;
    }

    if (!pendingAssigned) {
      pendingAssigned = true;
      steps.push({ ...base, action: 'pending', slaDueAt: addHours(input.now, level.slaHours) });
    } else {
      steps.push({ ...base, action: 'waiting', slaDueAt: null });
    }
  }

  // If all configured levels are skipped or unassigned:
  if (!pendingAssigned) {
    if (input.fallbackApproverRoleId) {
      steps.push({
        level: steps.length + 1,
        approverEmployeeId: null,
        approverRoleId: input.fallbackApproverRoleId,
        action: 'pending',
        slaDueAt: addHours(input.now, 24),
        onSlaBreach: 'notify_only',
      });
    } else {
      steps.push({
        level: steps.length + 1,
        approverEmployeeId: null,
        approverRoleId: null,
        action: 'pending',
        slaDueAt: addHours(input.now, 24),
        onSlaBreach: 'notify_only',
      });
    }
  }

  return { steps, autoApprove: false };
}
