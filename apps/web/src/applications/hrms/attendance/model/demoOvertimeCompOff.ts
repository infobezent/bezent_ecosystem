import type { CompOffRequestItem } from '../api/attendanceCompOffApi';
import type { OvertimeRequestItem } from '../api/attendanceOvertimeApi';

/**
 * Sample Overtime and Comp-Off requests used only when the API has nothing to show,
 * so reviewers can see how the pages look. Dates fall inside the current month.
 */

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** A day in the current month, `back` days before today (never before the 1st). */
function monthDay(back: number): string {
  const now = new Date();
  const day = Math.max(1, now.getDate() - back);
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(day)}`;
}

const PEOPLE = [
  { name: 'Aarav Sharma', code: 'EMP-1001', dept: 'Sales' },
  { name: 'Priya Nair', code: 'EMP-1002', dept: 'Engineering' },
  { name: 'Rohan Gupta', code: 'EMP-1003', dept: 'Operations' },
  { name: 'Sneha Kulkarni', code: 'EMP-1004', dept: 'Support' },
  { name: 'Vikram Singh', code: 'EMP-1005', dept: 'Sales' },
  { name: 'Ishita Rao', code: 'EMP-1006', dept: 'Engineering' },
  { name: 'Manish Verma', code: 'EMP-1007', dept: 'Operations' },
  { name: 'Divya Menon', code: 'EMP-1008', dept: 'Support' },
];

type DayType = 'regular' | 'weekly_off' | 'holiday';

const OT_SEEDS: Array<{
  p: number;
  back: number;
  dayType: DayType;
  requested: number;
  approved: number;
  status: OvertimeRequestItem['status'];
  settlement: OvertimeRequestItem['settlementStatus'];
  payable: number;
  compOff: number;
  reviewer: string | null;
  reason: string;
}> = [
  {
    p: 0,
    back: 1,
    dayType: 'regular',
    requested: 120,
    approved: 0,
    status: 'pending_approval',
    settlement: 'unallocated',
    payable: 0,
    compOff: 0,
    reviewer: null,
    reason: 'Month-end client reporting',
  },
  {
    p: 1,
    back: 2,
    dayType: 'regular',
    requested: 150,
    approved: 0,
    status: 'pending_approval',
    settlement: 'unallocated',
    payable: 0,
    compOff: 0,
    reviewer: 'Meera Iyer',
    reason: 'Production release support',
  },
  {
    p: 2,
    back: 3,
    dayType: 'weekly_off',
    requested: 480,
    approved: 480,
    status: 'approved',
    settlement: 'fully_allocated',
    payable: 480,
    compOff: 0,
    reviewer: 'Karan Mehta',
    reason: 'Stock audit on weekly off',
  },
  {
    p: 3,
    back: 4,
    dayType: 'regular',
    requested: 90,
    approved: 60,
    status: 'approved',
    settlement: 'fully_allocated',
    payable: 0,
    compOff: 60,
    reviewer: 'Karan Mehta',
    reason: 'Escalation handling after shift',
  },
  {
    p: 4,
    back: 5,
    dayType: 'holiday',
    requested: 360,
    approved: 360,
    status: 'approved',
    settlement: 'fully_allocated',
    payable: 360,
    compOff: 0,
    reviewer: 'Meera Iyer',
    reason: 'Distributor meet on a holiday',
  },
  {
    p: 5,
    back: 6,
    dayType: 'regular',
    requested: 180,
    approved: 180,
    status: 'approved',
    settlement: 'fully_allocated',
    payable: 0,
    compOff: 180,
    reviewer: 'Meera Iyer',
    reason: 'Deployment window',
  },
  {
    p: 6,
    back: 7,
    dayType: 'regular',
    requested: 240,
    approved: 0,
    status: 'rejected',
    settlement: 'unallocated',
    payable: 0,
    compOff: 0,
    reviewer: 'Karan Mehta',
    reason: 'Not pre-approved by the manager',
  },
  {
    p: 7,
    back: 8,
    dayType: 'weekly_off',
    requested: 300,
    approved: 0,
    status: 'pending_approval',
    settlement: 'unallocated',
    payable: 0,
    compOff: 0,
    reviewer: null,
    reason: 'Support rota on weekly off',
  },
];

export function getDemoOvertimeRequests(): OvertimeRequestItem[] {
  return OT_SEEDS.map((s, i) => {
    const person = PEOPLE[s.p]!;
    const workDate = monthDay(s.back);
    return {
      id: `ot_demo_${i + 1}`,
      requestNumber: `OT-${3100 + i}`,
      tenantId: 'demo',
      companyId: 'demo',
      employeeId: `emp_demo_${s.p + 1}`,
      employeeCode: person.code,
      employeeName: person.name,
      departmentName: person.dept,
      workDate,
      dayType: s.dayType,
      sourceRecordType: 'attendance',
      sourceRecordId: null,
      policyId: null,
      policyName: 'Standard Overtime Policy',
      policyVersion: 1,
      scheduledMinutes: s.dayType === 'regular' ? 480 : 0,
      actualWorkedMinutes: (s.dayType === 'regular' ? 480 : 0) + s.requested,
      extraWorkedMinutes: s.requested,
      eligibleOtMinutes: s.requested,
      requestedOtMinutes: s.requested,
      approvedOtMinutes: s.approved,
      allocatedPayableMinutes: s.payable,
      allocatedCompOffMinutes: s.compOff,
      unallocatedMinutes: Math.max(0, s.approved - s.payable - s.compOff),
      sourceIntervals: [
        {
          startTime: '18:00',
          endTime: '20:00',
          durationMinutes: s.requested,
          intervalType: 'after_shift',
        },
      ],
      reason: s.reason,
      locationOrSite: null,
      taskOrProject: null,
      evidenceAttachments: [],
      status: s.status,
      settlementStatus: s.settlement,
      currentStage: s.status === 'pending_approval' ? 'manager_review' : 'completed',
      assignedTo: s.reviewer ? `usr_${s.reviewer.split(' ')[0]?.toLowerCase()}` : null,
      assignedToName: s.reviewer,
      assignedAt: null,
      assignedRole: s.reviewer ? 'HR Reviewer' : null,
      submittedAt: new Date(`${workDate}T19:00:00`).toISOString(),
      submittedByUserId: null,
      reviewedByUserId: null,
      reviewedAt: null,
      reviewDecision:
        s.status === 'approved' ? 'approved' : s.status === 'rejected' ? 'rejected' : null,
      reviewNotes: null,
      cancellationReason: null,
      withdrawalReason: null,
      version: 1,
      createdAt: new Date(`${workDate}T19:00:00`).toISOString(),
      updatedAt: new Date(`${workDate}T19:00:00`).toISOString(),
    } as OvertimeRequestItem;
  });
}

const CO_SEEDS: Array<{
  p: number;
  back: number;
  dayType: DayType;
  source: string;
  days: number;
  status: CompOffRequestItem['status'];
  reviewer: string | null;
  reason: string;
}> = [
  {
    p: 0,
    back: 1,
    dayType: 'weekly_off',
    source: 'attendance',
    days: 1,
    status: 'pending_approval',
    reviewer: null,
    reason: 'Worked on weekly off for the quarter close',
  },
  {
    p: 1,
    back: 2,
    dayType: 'holiday',
    source: 'attendance',
    days: 1,
    status: 'pending_approval',
    reviewer: 'Meera Iyer',
    reason: 'Holiday go-live support',
  },
  {
    p: 2,
    back: 3,
    dayType: 'weekly_off',
    source: 'attendance',
    days: 0.5,
    status: 'approved',
    reviewer: 'Karan Mehta',
    reason: 'Half-day stock audit',
  },
  {
    p: 3,
    back: 5,
    dayType: 'regular',
    source: 'overtime',
    days: 0.5,
    status: 'approved',
    reviewer: 'Karan Mehta',
    reason: 'Overtime converted to comp-off',
  },
  {
    p: 4,
    back: 6,
    dayType: 'holiday',
    source: 'attendance',
    days: 1,
    status: 'approved',
    reviewer: 'Meera Iyer',
    reason: 'Holiday distributor meet',
  },
  {
    p: 5,
    back: 8,
    dayType: 'weekly_off',
    source: 'attendance',
    days: 1,
    status: 'rejected',
    reviewer: 'Karan Mehta',
    reason: 'Work was not approved in advance',
  },
  {
    p: 6,
    back: 9,
    dayType: 'regular',
    source: 'manual',
    days: 1,
    status: 'approved',
    reviewer: 'Meera Iyer',
    reason: 'Manual grant for the site shutdown',
  },
];

export function getDemoCompOffRequests(): CompOffRequestItem[] {
  return CO_SEEDS.map((s, i) => {
    const person = PEOPLE[s.p]!;
    const workDate = monthDay(s.back);
    return {
      id: `co_demo_${i + 1}`,
      requestNumber: `CO-${4100 + i}`,
      tenantId: 'demo',
      companyId: 'demo',
      employeeId: `emp_demo_${s.p + 1}`,
      employeeCode: person.code,
      employeeName: person.name,
      departmentName: person.dept,
      workDate,
      dayType: s.dayType,
      sourceRecordType: s.source,
      sourceRecordId: null,
      policyId: null,
      policyName: 'Standard Comp-Off Policy',
      policyVersion: 1,
      scheduledMinutes: 0,
      actualWorkedMinutes: s.days * 480,
      qualifyingWorkedMinutes: s.days * 480,
      requestedCreditDays: s.days,
      approvedCreditDays: s.status === 'approved' ? s.days : 0,
      sourceIntervals: [],
      reason: s.reason,
      locationOrSite: null,
      taskOrProject: null,
      evidenceAttachments: [],
      status: s.status,
      currentStage: s.status === 'pending_approval' ? 'manager_review' : 'completed',
      assignedTo: s.reviewer ? `usr_${s.reviewer.split(' ')[0]?.toLowerCase()}` : null,
      assignedToName: s.reviewer,
      assignedAt: null,
      assignedRole: s.reviewer ? 'HR Reviewer' : null,
      submittedAt: new Date(`${workDate}T19:00:00`).toISOString(),
      submittedByUserId: null,
      reviewedByUserId: null,
      reviewedAt: null,
      reviewDecision:
        s.status === 'approved' ? 'approved' : s.status === 'rejected' ? 'rejected' : null,
      reviewNotes: null,
      cancellationReason: null,
      withdrawalReason: null,
      version: 1,
      createdAt: new Date(`${workDate}T19:00:00`).toISOString(),
      updatedAt: new Date(`${workDate}T19:00:00`).toISOString(),
    } as CompOffRequestItem;
  });
}
