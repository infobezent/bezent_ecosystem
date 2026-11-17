import type {
  RegularizationApplicationStatus,
  RegularizationApprovalStatus,
  RegularizationDetailV1,
  RegularizationFilterV1,
  RegularizationItemV1,
  RegularizationQueryResultV1,
  RegularizationRequestType,
  RegularizationSource,
  RegularizationSummaryCounters,
} from '../types/attendance.types';

/**
 * Sample regularization requests used only when the API has nothing to show,
 * so reviewers can see how the workspace looks. All dates are relative to today.
 */

function isoDay(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() - offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function isoAt(offsetDays: number, time: string): string {
  return new Date(`${isoDay(offsetDays)}T${time}:00`).toISOString();
}

interface DemoSeed {
  n: number;
  name: string;
  code: string;
  dept: string;
  dayOffset: number;
  type: RegularizationRequestType;
  approval: RegularizationApprovalStatus;
  application: RegularizationApplicationStatus;
  source: RegularizationSource;
  queue: string | null;
  reviewer: string | null;
  exception: string | null;
  change: string;
  recIn: string | null;
  recOut: string | null;
  recStatus: string;
  propIn: string | null;
  propOut: string | null;
  propStatus: string | null;
  hours: number | null;
  reason: string;
  highRisk?: boolean;
  submittedOffset: number;
  decidedOffset?: number;
  blockedReason?: string;
  attachments?: number;
}

const SEEDS: DemoSeed[] = [
  {
    n: 1,
    name: 'Aarav Sharma',
    code: 'EMP-0142',
    dept: 'Engineering',
    dayOffset: 1,
    type: 'missing_out',
    approval: 'submitted',
    application: 'not_applicable',
    source: 'ess',
    queue: 'manager_queue',
    reviewer: 'Meera Nair',
    exception: 'EXC-10421',
    change: 'Add OUT punch at 06:30 PM',
    recIn: '09:12',
    recOut: null,
    recStatus: 'Missing Punch',
    propIn: null,
    propOut: '18:30',
    propStatus: 'Present',
    hours: 9.3,
    reason: 'Biometric device was offline at the exit gate. Left after the sprint review.',
    submittedOffset: 1,
  },
  {
    n: 2,
    name: 'Priya Venkatesh',
    code: 'EMP-0087',
    dept: 'Sales',
    dayOffset: 2,
    type: 'missing_in',
    approval: 'submitted',
    application: 'not_applicable',
    source: 'mobile',
    queue: 'manager_queue',
    reviewer: 'Rohan Kapoor',
    exception: 'EXC-10398',
    change: 'Add IN punch at 09:45 AM',
    recIn: null,
    recOut: '18:05',
    recStatus: 'Missing Punch',
    propIn: '09:45',
    propOut: null,
    propStatus: 'Present',
    hours: 8.3,
    reason: 'Client visit in the morning. Forgot to punch on arrival at the branch.',
    submittedOffset: 2,
    attachments: 1,
  },
  {
    n: 3,
    name: 'Karthik Raman',
    code: 'EMP-0213',
    dept: 'Operations',
    dayOffset: 3,
    type: 'incorrect_time',
    approval: 'submitted',
    application: 'not_applicable',
    source: 'web',
    queue: 'hr_queue',
    reviewer: 'Anjali Desai',
    exception: null,
    change: 'Change IN from 11:02 AM to 09:02 AM',
    recIn: '11:02',
    recOut: '18:10',
    recStatus: 'Late',
    propIn: '09:02',
    propOut: '18:10',
    propStatus: 'Present',
    hours: 9.1,
    reason: 'Punch machine clock was two hours ahead. IT ticket raised and confirmed.',
    highRisk: true,
    submittedOffset: 3,
    attachments: 2,
  },
  {
    n: 4,
    name: 'Neha Iyer',
    code: 'EMP-0164',
    dept: 'Human Resources',
    dayOffset: 4,
    type: 'status_correction',
    approval: 'submitted',
    application: 'not_applicable',
    source: 'ess',
    queue: 'hr_unassigned',
    reviewer: null,
    exception: 'EXC-10377',
    change: 'Mark Absent as Present',
    recIn: null,
    recOut: null,
    recStatus: 'Absent',
    propIn: '09:30',
    propOut: '18:00',
    propStatus: 'Present',
    hours: 8.5,
    reason: 'Worked from the partner office. Attendance was not synced.',
    submittedOffset: 4,
  },
  {
    n: 5,
    name: 'Vikram Singh',
    code: 'EMP-0031',
    dept: 'Finance',
    dayOffset: 5,
    type: 'both_missing',
    approval: 'submitted',
    application: 'not_applicable',
    source: 'ess',
    queue: 'hr_unassigned',
    reviewer: null,
    exception: 'EXC-10352',
    change: 'Add IN 09:00 AM and OUT 06:00 PM',
    recIn: null,
    recOut: null,
    recStatus: 'Missing Punch',
    propIn: '09:00',
    propOut: '18:00',
    propStatus: 'Present',
    hours: 9,
    reason: 'Month-end closing. Staff access card was left at home.',
    highRisk: true,
    submittedOffset: 5,
  },
  {
    n: 6,
    name: 'Divya Menon',
    code: 'EMP-0276',
    dept: 'Engineering',
    dayOffset: 2,
    type: 'worked_hours',
    approval: 'under_review',
    application: 'not_applicable',
    source: 'web',
    queue: 'hr_queue',
    reviewer: 'Anjali Desai',
    exception: null,
    change: 'Claim 9.5 worked hours',
    recIn: '09:05',
    recOut: '17:20',
    recStatus: 'Early Exit',
    propIn: null,
    propOut: null,
    propStatus: 'Present',
    hours: 9.5,
    reason: 'Production incident. Continued the on-call bridge from home after leaving the office.',
    submittedOffset: 2,
    attachments: 1,
  },
  {
    n: 7,
    name: 'Rahul Gupta',
    code: 'EMP-0119',
    dept: 'Support',
    dayOffset: 6,
    type: 'wrong_direction',
    approval: 'under_review',
    application: 'not_applicable',
    source: 'biometric',
    queue: 'manager_queue',
    reviewer: 'Meera Nair',
    exception: 'EXC-10310',
    change: 'Flip second punch from IN to OUT',
    recIn: '09:10',
    recOut: null,
    recStatus: 'Missing Punch',
    propIn: null,
    propOut: '18:15',
    propStatus: 'Present',
    hours: 9.1,
    reason: 'Pressed the wrong direction key while leaving.',
    submittedOffset: 6,
  },
  {
    n: 8,
    name: 'Sneha Pillai',
    code: 'EMP-0198',
    dept: 'Sales',
    dayOffset: 7,
    type: 'missing_out',
    approval: 'awaiting_info',
    application: 'not_applicable',
    source: 'mobile',
    queue: 'manager_queue',
    reviewer: 'Rohan Kapoor',
    exception: 'EXC-10288',
    change: 'Add OUT punch at 07:10 PM',
    recIn: '09:20',
    recOut: null,
    recStatus: 'Missing Punch',
    propIn: null,
    propOut: '19:10',
    propStatus: 'Present',
    hours: 9.8,
    reason: 'Stayed back for the quarterly demo.',
    submittedOffset: 7,
  },
  {
    n: 9,
    name: 'Arjun Reddy',
    code: 'EMP-0052',
    dept: 'Operations',
    dayOffset: 8,
    type: 'incorrect_time',
    approval: 'awaiting_info',
    application: 'not_applicable',
    source: 'web',
    queue: 'hr_queue',
    reviewer: 'Anjali Desai',
    exception: null,
    change: 'Change OUT from 03:40 PM to 06:40 PM',
    recIn: '09:00',
    recOut: '15:40',
    recStatus: 'Early Exit',
    propIn: null,
    propOut: '18:40',
    propStatus: 'Present',
    hours: 9.6,
    reason: 'Device timestamp shifted after power cut. Need payroll correction.',
    submittedOffset: 8,
  },
  {
    n: 10,
    name: 'Ishita Joshi',
    code: 'EMP-0233',
    dept: 'Finance',
    dayOffset: 9,
    type: 'missing_in',
    approval: 'approved',
    application: 'applied',
    source: 'ess',
    queue: null,
    reviewer: 'Anjali Desai',
    exception: 'EXC-10214',
    change: 'Add IN punch at 09:15 AM',
    recIn: null,
    recOut: '18:00',
    recStatus: 'Missing Punch',
    propIn: '09:15',
    propOut: null,
    propStatus: 'Present',
    hours: 8.7,
    reason: 'Attended audit kickoff before reaching the desk.',
    submittedOffset: 9,
    decidedOffset: 0,
  },
  {
    n: 11,
    name: 'Mohammed Faiz',
    code: 'EMP-0301',
    dept: 'Engineering',
    dayOffset: 10,
    type: 'status_correction',
    approval: 'approved',
    application: 'applied',
    source: 'web',
    queue: null,
    reviewer: 'Meera Nair',
    exception: null,
    change: 'Mark Half Day as Present',
    recIn: '09:00',
    recOut: '13:30',
    recStatus: 'Half Day',
    propIn: null,
    propOut: '18:00',
    propStatus: 'Present',
    hours: 9,
    reason: 'Left for a client call and resumed from the second floor lab.',
    submittedOffset: 10,
    decidedOffset: 0,
  },
  {
    n: 12,
    name: 'Ananya Das',
    code: 'EMP-0154',
    dept: 'Support',
    dayOffset: 11,
    type: 'missing_out',
    approval: 'approved',
    application: 'pending_application',
    source: 'mobile',
    queue: null,
    reviewer: 'Rohan Kapoor',
    exception: 'EXC-10190',
    change: 'Add OUT punch at 06:05 PM',
    recIn: '08:55',
    recOut: null,
    recStatus: 'Missing Punch',
    propIn: null,
    propOut: '18:05',
    propStatus: 'Present',
    hours: 9.2,
    reason: 'Forgot to punch out while leaving for the shuttle.',
    submittedOffset: 11,
    decidedOffset: 1,
  },
  {
    n: 13,
    name: 'Rohit Bansal',
    code: 'EMP-0098',
    dept: 'Operations',
    dayOffset: 12,
    type: 'both_missing',
    approval: 'approved',
    application: 'blocked',
    source: 'web',
    queue: null,
    reviewer: 'Anjali Desai',
    exception: 'EXC-10155',
    change: 'Add IN 09:00 AM and OUT 06:00 PM',
    recIn: null,
    recOut: null,
    recStatus: 'Absent',
    propIn: '09:00',
    propOut: '18:00',
    propStatus: 'Present',
    hours: 9,
    reason: 'Warehouse audit day. Floor staff exempted from the gate scanner.',
    submittedOffset: 12,
    decidedOffset: 0,
    blockedReason: 'Payroll period for this workday is locked.',
  },
  {
    n: 14,
    name: 'Kavya Nambiar',
    code: 'EMP-0187',
    dept: 'Sales',
    dayOffset: 4,
    type: 'incorrect_time',
    approval: 'rejected',
    application: 'not_applicable',
    source: 'ess',
    queue: null,
    reviewer: 'Rohan Kapoor',
    exception: null,
    change: 'Change IN from 10:40 AM to 09:00 AM',
    recIn: '10:40',
    recOut: '18:30',
    recStatus: 'Late',
    propIn: '09:00',
    propOut: null,
    propStatus: 'Present',
    hours: 9.5,
    reason: 'Traffic jam on the highway.',
    submittedOffset: 4,
    decidedOffset: 0,
  },
  {
    n: 15,
    name: 'Sandeep Kulkarni',
    code: 'EMP-0072',
    dept: 'Finance',
    dayOffset: 6,
    type: 'worked_hours',
    approval: 'rejected',
    application: 'not_applicable',
    source: 'web',
    queue: null,
    reviewer: 'Anjali Desai',
    exception: null,
    change: 'Claim 10 worked hours',
    recIn: '09:30',
    recOut: '17:30',
    recStatus: 'Present',
    propIn: null,
    propOut: null,
    propStatus: 'Present',
    hours: 10,
    reason: 'Worked beyond hours without logging in the system.',
    submittedOffset: 6,
    decidedOffset: 2,
  },
  {
    n: 16,
    name: 'Lakshmi Prasad',
    code: 'EMP-0249',
    dept: 'Human Resources',
    dayOffset: 0,
    type: 'missing_out',
    approval: 'submitted',
    application: 'not_applicable',
    source: 'ess',
    queue: 'manager_queue',
    reviewer: 'Meera Nair',
    exception: 'EXC-10433',
    change: 'Add OUT punch at 05:45 PM',
    recIn: '09:00',
    recOut: null,
    recStatus: 'Missing Punch',
    propIn: null,
    propOut: '17:45',
    propStatus: 'Present',
    hours: 8.7,
    reason: 'Left early for a doctor appointment after informing the manager.',
    submittedOffset: 0,
  },
];

function toItem(s: DemoSeed): RegularizationItemV1 {
  const attachments = Array.from({ length: s.attachments ?? 0 }, (_, i) => ({
    name: i === 0 ? 'supporting-evidence.pdf' : `screenshot-${i}.png`,
    size: i === 0 ? '214 KB' : '98 KB',
  }));
  return {
    id: `reg_demo_${String(s.n).padStart(3, '0')}`,
    requestNumber: `REG-2026-${String(1000 + s.n)}`,
    employeeId: `emp_demo_${String(s.n).padStart(2, '0')}`,
    employeeCode: s.code,
    employeeName: s.name,
    departmentName: s.dept,
    workday: isoDay(s.dayOffset),
    requestType: s.type,
    approvalStatus: s.approval,
    applicationStatus: s.application,
    source: s.source,
    assignedTo: s.reviewer ? `usr_demo_${(s.reviewer.split(' ')[0] ?? '').toLowerCase()}` : null,
    assignedToName: s.reviewer,
    assignedQueue: s.queue,
    relatedExceptionId: s.exception,
    requestedChange: s.change,
    recordedCheckIn: s.recIn,
    recordedCheckOut: s.recOut,
    recordedStatus: s.recStatus,
    proposedCheckIn: s.propIn,
    proposedCheckOut: s.propOut,
    proposedStatus: s.propStatus,
    claimedHours: s.hours,
    reason: s.reason,
    evidenceAttachments: attachments,
    isHighRisk: Boolean(s.highRisk),
    submittedAt: isoAt(s.submittedOffset, '10:15'),
    decidedAt: s.decidedOffset === undefined ? null : isoAt(s.decidedOffset, '15:40'),
    decidedByUserId: s.decidedOffset === undefined ? null : 'usr_demo_reviewer',
    appliedAt: s.application === 'applied' ? isoAt(s.decidedOffset ?? 0, '15:41') : null,
    applicationError: s.application === 'failed' ? 'Attendance record is locked.' : null,
    applicationBlockedReason: s.blockedReason ?? null,
  };
}

function buildCounters(items: RegularizationItemV1[]): RegularizationSummaryCounters {
  const today = isoDay(0);
  const decidedToday = (i: RegularizationItemV1) =>
    Boolean(i.decidedAt) && i.decidedAt!.slice(0, 10) === today;
  return {
    pendingReview: items.filter((i) => i.approvalStatus === 'submitted').length,
    underReview: items.filter((i) => i.approvalStatus === 'under_review').length,
    awaitingInfo: items.filter((i) => i.approvalStatus === 'awaiting_info').length,
    approved: items.filter((i) => i.approvalStatus === 'approved').length,
    approvedToday: items.filter((i) => i.approvalStatus === 'approved' && decidedToday(i)).length,
    applicationIssues: items.filter(
      (i) => i.applicationStatus === 'failed' || i.applicationStatus === 'blocked',
    ).length,
    rejected: items.filter((i) => i.approvalStatus === 'rejected').length,
    rejectedToday: items.filter((i) => i.approvalStatus === 'rejected' && decidedToday(i)).length,
  };
}

/** Applies the same filters the API supports so the demo behaves like real data. */
export function getDemoRegularizationWorkspace(
  filter: RegularizationFilterV1,
): RegularizationQueryResultV1 {
  const all = SEEDS.map(toItem);
  const q = filter.search?.trim().toLowerCase();
  const filtered = all.filter((i) => {
    if (filter.workdayFrom && i.workday < filter.workdayFrom) return false;
    if (filter.workdayTo && i.workday > filter.workdayTo) return false;
    if (filter.approvalStatus && i.approvalStatus !== filter.approvalStatus) return false;
    if (filter.applicationStatus && i.applicationStatus !== filter.applicationStatus) return false;
    if (filter.requestType && i.requestType !== filter.requestType) return false;
    if (filter.source && i.source !== filter.source) return false;
    if (filter.assignedQueue && i.assignedQueue !== filter.assignedQueue) return false;
    if (filter.assignedTo === 'unassigned' && i.assignedTo) return false;
    if (filter.relatedException === 'has_exception' && !i.relatedExceptionId) return false;
    if (filter.submittedFrom && i.submittedAt.slice(0, 10) < filter.submittedFrom) return false;
    if (filter.submittedTo && i.submittedAt.slice(0, 10) > filter.submittedTo) return false;
    if (q) {
      const hay = `${i.employeeName} ${i.employeeCode} ${i.requestNumber}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
  const limit = filter.limit ?? 50;
  const page = filter.page ?? 1;
  const inRange = all.filter(
    (i) =>
      (!filter.workdayFrom || i.workday >= filter.workdayFrom) &&
      (!filter.workdayTo || i.workday <= filter.workdayTo),
  );
  return {
    items: filtered.slice((page - 1) * limit, page * limit),
    counters: buildCounters(inRange),
    total: filtered.length,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(filtered.length / limit)),
  };
}

export function getDemoRegularizationDetail(id: string): RegularizationDetailV1 | null {
  const seed = SEEDS.find((s) => `reg_demo_${String(s.n).padStart(3, '0')}` === id);
  if (!seed) return null;
  const item = toItem(seed);
  const punches = [
    seed.recIn && {
      id: `${id}_in`,
      time: seed.recIn,
      type: 'in',
      source: 'Biometric',
      loc: 'HQ Gate 1',
    },
    seed.recOut && {
      id: `${id}_out`,
      time: seed.recOut,
      type: 'out',
      source: 'Biometric',
      loc: 'HQ Gate 1',
    },
  ].filter(Boolean) as Array<{
    id: string;
    time: string;
    type: string;
    source: string;
    loc: string;
  }>;
  return {
    ...item,
    targetPunchId: null,
    targetPunchDirection: seed.type === 'missing_in' ? 'IN' : 'OUT',
    clarificationRequestedAt:
      seed.approval === 'awaiting_info' ? isoAt(seed.submittedOffset - 1, '12:00') : null,
    clarificationNotes:
      seed.approval === 'awaiting_info' ? 'Please attach proof of the reason stated.' : null,
    clarificationProvidedAt: null,
    clarificationResponse: null,
    decisionReason: seed.approval === 'rejected' ? 'Insufficient supporting evidence.' : null,
    riskFactors: seed.highRisk ? ['Large time change', 'Repeated request this month'] : [],
    appliedAdjustmentId: null,
    evidenceContext: {
      recordedAttendance: {
        date: item.workday,
        checkInTime: seed.recIn,
        checkOutTime: seed.recOut,
        status: seed.recStatus,
        workedMinutes: seed.recIn && seed.recOut ? 450 : 0,
        isMissingPunch: !seed.recIn || !seed.recOut,
        isLate: seed.recStatus === 'Late',
        isEarlyExit: seed.recStatus === 'Early Exit',
        isRegularized: seed.approval === 'approved',
      },
      punchTimeline: punches.map((p) => ({
        id: p.id,
        punchTime: new Date(`${item.workday}T${p.time}:00`).toISOString(),
        punchType: p.type,
        source: p.source,
        workLocation: p.loc,
        notes: null,
      })),
      shiftSchedule: {
        name: 'General Shift',
        startTime: '09:00',
        endTime: '18:00',
        isOvernight: false,
      },
      policyRules: {
        policyName: 'Standard Attendance Policy',
        gracePeriodMinutes: 15,
        missingPunchPolicy: 'Regularization required',
        allowRegularization: true,
        submissionWindowDays: 15,
      },
      leaveConflict: { hasConflict: false },
      onDutyConflict: { hasConflict: false },
      payrollLockState: {
        isLocked: seed.application === 'blocked',
        periodCode: seed.application === 'blocked' ? 'PAY-2026-10' : undefined,
      },
    },
    audits: [
      {
        id: `${id}_a1`,
        action: 'submitted',
        actorUserId: null,
        actorName: seed.name,
        oldState: null,
        newState: null,
        notes: seed.reason,
        createdAt: item.submittedAt,
      },
    ],
  };
}
