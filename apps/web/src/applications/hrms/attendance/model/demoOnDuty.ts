import type {
  OnDutyApprovalStatus,
  OnDutyDetailV1,
  OnDutyDurationType,
  OnDutyFilterV1,
  OnDutyItemV1,
  OnDutyProcessingStatus,
  OnDutyQueryResultV1,
  OnDutySummaryCounters,
} from '../types/attendance.types';

/**
 * Sample On-Duty requests used only when the API has nothing to show,
 * so reviewers can see how the workspace looks. All dates are relative to today.
 */

function isoDay(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
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
  odTypeId: string;
  odTypeName: string;
  startOffset: number;
  days: number;
  duration: OnDutyDurationType;
  halfDay?: 'first_half' | 'second_half';
  location: string;
  purpose: string;
  project?: string;
  approval: OnDutyApprovalStatus;
  processing: OnDutyProcessingStatus;
  reviewer: string | null;
  submittedOffset: number;
  highRisk?: boolean;
}

const SEEDS: DemoSeed[] = [
  {
    n: 1,
    name: 'Aarav Sharma',
    code: 'EMP-1001',
    dept: 'Sales',
    odTypeId: 'od_client_visit',
    odTypeName: 'Client Visit',
    startOffset: 2,
    days: 1,
    duration: 'full_day',
    location: 'Tata Consultancy, Pune',
    purpose: 'Quarterly business review with the client team',
    project: 'ACC-2201',
    approval: 'submitted',
    processing: 'not_applicable',
    reviewer: null,
    submittedOffset: -1,
  },
  {
    n: 2,
    name: 'Priya Nair',
    code: 'EMP-1002',
    dept: 'Engineering',
    odTypeId: 'od_site_work',
    odTypeName: 'Customer Site Work',
    startOffset: 3,
    days: 3,
    duration: 'multi_day',
    location: 'Infosys Campus, Mysuru',
    purpose: 'On-site integration and go-live support',
    project: 'INT-908',
    approval: 'under_review',
    processing: 'not_applicable',
    reviewer: 'Meera Iyer',
    submittedOffset: -2,
  },
  {
    n: 3,
    name: 'Rohan Gupta',
    code: 'EMP-1003',
    dept: 'Operations',
    odTypeId: 'od_field_duty',
    odTypeName: 'Field Duty',
    startOffset: 1,
    days: 1,
    duration: 'half_day',
    halfDay: 'second_half',
    location: 'Warehouse 4, Bhiwandi',
    purpose: 'Stock audit and dispatch verification',
    approval: 'awaiting_info',
    processing: 'not_applicable',
    reviewer: 'Meera Iyer',
    submittedOffset: -3,
  },
  {
    n: 4,
    name: 'Sneha Kulkarni',
    code: 'EMP-1004',
    dept: 'Support',
    odTypeId: 'od_seminar',
    odTypeName: 'Seminar / Training',
    startOffset: 0,
    days: 2,
    duration: 'multi_day',
    location: 'Bengaluru Tech Summit',
    purpose: 'Customer success certification workshop',
    approval: 'approved',
    processing: 'applied',
    reviewer: 'Karan Mehta',
    submittedOffset: -6,
  },
  {
    n: 5,
    name: 'Vikram Singh',
    code: 'EMP-1005',
    dept: 'Sales',
    odTypeId: 'od_travel',
    odTypeName: 'Business Travel',
    startOffset: -3,
    days: 2,
    duration: 'multi_day',
    location: 'Delhi NCR',
    purpose: 'Distributor meet and contract renewal',
    project: 'DST-114',
    approval: 'approved',
    processing: 'pending',
    reviewer: 'Karan Mehta',
    submittedOffset: -8,
  },
  {
    n: 6,
    name: 'Ishita Rao',
    code: 'EMP-1006',
    dept: 'Engineering',
    odTypeId: 'od_deployment',
    odTypeName: 'Project Deployment',
    startOffset: -5,
    days: 1,
    duration: 'hourly',
    location: 'Client Data Centre, Hyderabad',
    purpose: 'Production release window support',
    project: 'REL-77',
    approval: 'approved',
    processing: 'processing_issues',
    reviewer: 'Meera Iyer',
    submittedOffset: -9,
    highRisk: true,
  },
  {
    n: 7,
    name: 'Manish Verma',
    code: 'EMP-1007',
    dept: 'Operations',
    odTypeId: 'od_field_duty',
    odTypeName: 'Field Duty',
    startOffset: -7,
    days: 1,
    duration: 'full_day',
    location: 'Plant 2, Chakan',
    purpose: 'Vendor quality inspection',
    approval: 'rejected',
    processing: 'not_applicable',
    reviewer: 'Karan Mehta',
    submittedOffset: -10,
  },
  {
    n: 8,
    name: 'Divya Menon',
    code: 'EMP-1008',
    dept: 'Support',
    odTypeId: 'od_client_visit',
    odTypeName: 'Client Visit',
    startOffset: 5,
    days: 1,
    duration: 'half_day',
    halfDay: 'first_half',
    location: 'HDFC Tower, Mumbai',
    purpose: 'Escalation review with the client',
    approval: 'submitted',
    processing: 'not_applicable',
    reviewer: null,
    submittedOffset: 0,
  },
  {
    n: 9,
    name: 'Arjun Patel',
    code: 'EMP-1009',
    dept: 'Engineering',
    odTypeId: 'od_other',
    odTypeName: 'Other Official Duty',
    startOffset: 4,
    days: 1,
    duration: 'full_day',
    location: 'Regional Office, Ahmedabad',
    purpose: 'Statutory compliance filing',
    approval: 'submitted',
    processing: 'not_applicable',
    reviewer: null,
    submittedOffset: -1,
  },
  {
    n: 10,
    name: 'Kavya Reddy',
    code: 'EMP-1010',
    dept: 'Sales',
    odTypeId: 'od_travel',
    odTypeName: 'Business Travel',
    startOffset: -10,
    days: 1,
    duration: 'full_day',
    location: 'Chennai',
    purpose: 'Trade expo booth set-up',
    approval: 'cancelled',
    processing: 'not_applicable',
    reviewer: null,
    submittedOffset: -14,
  },
];

function toItem(s: DemoSeed): OnDutyItemV1 {
  const startDate = isoDay(s.startOffset);
  const endDate = isoDay(s.startOffset + s.days - 1);
  return {
    id: `od_demo_${String(s.n).padStart(2, '0')}`,
    requestNumber: `OD-${String(2400 + s.n)}`,
    employeeId: `emp_demo_${String(s.n).padStart(2, '0')}`,
    employeeName: s.name,
    employeeCode: s.code,
    departmentName: s.dept,
    odTypeId: s.odTypeId,
    odTypeName: s.odTypeName,
    startDate,
    endDate,
    startTime: s.duration === 'hourly' ? '10:00' : null,
    endTime: s.duration === 'hourly' ? '16:00' : null,
    dutyPeriodDisplay: startDate === endDate ? startDate : `${startDate} – ${endDate}`,
    durationType: s.duration,
    durationHours: s.duration === 'half_day' ? 4 : s.duration === 'hourly' ? 6 : s.days * 8,
    halfDaySession: s.halfDay ?? null,
    locationOrSite: s.location,
    purpose: s.purpose,
    projectReference: s.project ?? null,
    submittedAt: isoAt(s.submittedOffset, '10:30'),
    assignedTo: s.reviewer ? `usr_${s.reviewer.split(' ')[0]?.toLowerCase()}` : null,
    assignedToName: s.reviewer,
    assignedRole: s.reviewer ? 'HR Reviewer' : null,
    approvalStatus: s.approval,
    status: s.approval,
    processingStatus: s.processing,
    isHighRisk: s.highRisk ?? false,
    riskFactors: s.highRisk ? ['Processing issue on a credited workday'] : null,
    evidenceAttachments: null,
  };
}

function buildCounters(items: OnDutyItemV1[]): OnDutySummaryCounters {
  const today = isoDay(0);
  return {
    pendingReview: items.filter((i) => i.approvalStatus === 'submitted').length,
    underReview: items.filter((i) => i.approvalStatus === 'under_review').length,
    awaitingInfo: items.filter((i) => i.approvalStatus === 'awaiting_info').length,
    approvedToday: items.filter((i) => i.approvalStatus === 'approved').length,
    processingIssues: items.filter((i) => i.processingStatus === 'processing_issues').length,
    upcomingOd: items.filter((i) => i.startDate >= today && i.approvalStatus !== 'cancelled')
      .length,
  };
}

export function getDemoOnDutyWorkspace(filter: OnDutyFilterV1): OnDutyQueryResultV1 {
  const all = SEEDS.map(toItem);
  const counters = buildCounters(all);
  const search = filter.search?.trim().toLowerCase();

  const filtered = all.filter((i) => {
    if (filter.approvalStatus && i.approvalStatus !== filter.approvalStatus) return false;
    if (filter.odTypeId && i.odTypeId !== filter.odTypeId) return false;
    if (filter.processingStatus && i.processingStatus !== filter.processingStatus) return false;
    if (filter.durationType && i.durationType !== filter.durationType) return false;
    if (filter.assignedTo === 'unassigned' && i.assignedToName) return false;
    if (filter.departmentId && i.departmentName !== filter.departmentId) return false;
    if (filter.conflictStatus === 'has_conflict' && !i.isHighRisk) return false;
    if (filter.submittedFrom && i.submittedAt.slice(0, 10) < filter.submittedFrom) return false;
    if (filter.submittedTo && i.submittedAt.slice(0, 10) > filter.submittedTo) return false;
    if (search) {
      const hay =
        `${i.employeeName} ${i.employeeCode} ${i.requestNumber} ${i.locationOrSite ?? ''}`.toLowerCase();
      if (!hay.includes(search)) return false;
    }
    return true;
  });

  const pageSize = filter.pageSize ?? 25;
  const page = filter.page ?? 1;
  return {
    items: filtered.slice((page - 1) * pageSize, page * pageSize),
    counters,
    totalCount: filtered.length,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(filtered.length / pageSize)),
  };
}

export function getDemoOnDutyDetail(id: string): OnDutyDetailV1 | null {
  const seed = SEEDS.find((s) => `od_demo_${String(s.n).padStart(2, '0')}` === id);
  if (!seed) return null;
  const item = toItem(seed);
  return {
    ...item,
    submittedByUserId: null,
    decisionReason: seed.approval === 'rejected' ? 'Overlaps with a critical delivery week.' : null,
    attendanceContext: {
      shiftSchedule: { startTime: '09:00', endTime: '18:00', shiftName: 'General Shift' },
      recordedPunchesSummary: 'No punches recorded for the duty period',
      leaveConflict: null,
      otherOdOverlap: null,
      regularizationConflict: null,
      isPayrollLocked: false,
    },
    workdays: [],
    audits: [
      {
        id: `${item.id}_audit_1`,
        action: 'submitted',
        actorUserId: null,
        notes: 'Request submitted',
        createdAt: item.submittedAt,
      },
    ],
  };
}
