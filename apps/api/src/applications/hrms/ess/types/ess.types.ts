import type { EmployeeAttendance } from '../../attendance/types/attendance.types.js';

export interface EssEmployeeSummary {
  id: string;
  tenantId: string;
  companyId: string;
  employeeNumber: string;
  firstName: string;
  lastName: string | null;
  email: string;
  workPhone?: string | null;
  departmentId: string | null;
  departmentName?: string | null;
  departmentCode?: string | null;
  designationId: string | null;
  designationTitle?: string | null;
  designationCode?: string | null;
  locationId: string | null;
  locationName?: string | null;
  reportingManagerId?: string | null;
  reportingManagerName?: string | null;
  reportingManagerDesignation?: string | null;
  employmentType: string;
  employmentStatus: string;
  joiningDate: string;
  probationEndDate?: string | null;
  confirmationDate?: string | null;
  confirmedJoiningDate?: string | null;
  contractEndDate?: string | null;
  noticePeriodDays?: number | null;
  gender?: string | null;
  avatarPreference?: string | null;
}

export interface EssCareerEvent {
  id: string;
  eventType:
    | 'designation_change'
    | 'department_change'
    | 'location_transfer'
    | 'employment_type_change'
    | 'confirm_employee';
  eventLabel: string;
  effectiveDate: string;
  previousValue: string | null;
  newValue: string | null;
  appliedAt: string | null;
}

export interface EssPunchEvent {
  id: string;
  punchType: 'in' | 'out' | 'break_in' | 'break_out' | 'auto' | 'unknown';
  punchTime: string;
  source: string;
  workLocation: string;
  notes?: string | null;
}

export interface EssShiftDetails {
  name: string | null;
  startTime: string | null;
  endTime: string | null;
  requiredHours: number;
  graceMinutes: number;
  breakAllowanceMinutes: number;
  isAssigned?: boolean;
  timeZone?: string | null;
  effectiveTimezone?: string | null;
  workingDays?: (string | number)[];
}

export interface EssAttendanceSummaryCounters {
  presentDays: number;
  absentDays: number;
  halfDays: number;
  leaveDays: number;
  payableDays: number;
  lateMarksCount: number;
  regularizationQuotaUsed: number;
  regularizationQuotaLimit: number;
  workedMinutes?: number;
  missingPunchesCount?: number;
}

export interface EssTodayAttendance {
  date: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  status:
    | 'present'
    | 'absent'
    | 'half_day'
    | 'on_leave'
    | 'holiday'
    | 'incomplete'
    | 'not_checked_in'
    | 'working'
    | 'on_break'
    | 'checked_out';
  workLocation: string;
  notes?: string | null;
  workedMinutes?: number;
  breakMinutes?: number;
  isOnBreak?: boolean;
  currentBreakType?: string | null;
  currentBreakStartTime?: string | null;
  shift?: EssShiftDetails;
  punches?: EssPunchEvent[];
}

export interface EssLeaveBalanceItem {
  leaveType: 'annual' | 'sick' | 'casual' | 'unpaid';
  totalDays: number;
  usedDays: number;
  pendingDays: number;
  availableDays: number;
}

export interface EssMonthlyAttendanceSnapshot {
  presentDays: number;
  absentDays: number;
  lateDays: number;
  attendancePercent: number;
  totalWorkingDays: number;
  history?: EmployeeAttendance[];
}

export interface EssActionCenterItem {
  id: string;
  title: string;
  category: 'attendance' | 'documents' | 'learning' | 'onboarding' | 'performance' | 'general';
  subtitle: string;
  priority: 'urgent' | 'action_required' | 'due_soon';
  link: string;
  dueDate?: string;
}

export interface EssFeedPost {
  id: string;
  type: 'birthday' | 'new_joiner' | 'anniversary' | 'holiday' | 'event' | 'announcement' | 'milestone_poster';
  title: string;
  subtitle: string;
  message: string;
  date: string;
  badge: string;
  likesCount: number;
  commentsCount: number;
  hasLiked?: boolean;
  posterData?: {
    employeeName: string;
    milestoneKey: string;
    milestoneTitle: string;
    hours: number;
    headline: string;
    quote: string;
    posterUrl?: string;
    avatarUrl?: string;
    issuedAt?: string;
  };
}

export interface EssUpcomingEventItem {
  id: string;
  title: string;
  dateStr: string;
  dayNumber: number;
  monthShort: string;
  category: string;
  teamOrVenue: string;
}

export interface EssGrowthSnapshot {
  learningProgressPercent: number;
  activeCoursesCount: number;
  activeGoalsCount: number;
  pendingReviewsCount: number;
  nextDeadline?: string;
}

export interface EssTeamMember {
  id: string;
  name: string;
  designation: string;
  status: 'working' | 'on_break' | 'on_leave' | 'off_duty';
  workLocation: string;
}

export interface EssTeamSnapshot {
  reportingManagerName: string;
  reportingManagerDesignation: string;
  teamMembers: EssTeamMember[];
}

export interface EssDailyBriefing {
  pendingActionsCount: number;
  actionsSummary: string;
  todayShift: string;
  workLocation: string;
  upcomingEventTitle?: string;
}

export interface EssLatestPayslipSnapshot {
  month: string;
  released: boolean;
  maskedAmount: string;
  actualAmount: number;
}

export interface EssDashboardData {
  employee: EssEmployeeSummary;
  todayAttendance: EssTodayAttendance;
  monthlyAttendance: EssMonthlyAttendanceSnapshot;
  dailyBriefing: EssDailyBriefing;
  leaveBalances: EssLeaveBalanceItem[];
  nextApprovedLeave?: string | null;
  pendingRequestsCount: number;
  assignedTasksCount: number;
  unreadNotificationsCount: number;
  actionCenterTasks: EssActionCenterItem[];
  companyFeed: EssFeedPost[];
  upcomingEvents: EssUpcomingEventItem[];
  growth: EssGrowthSnapshot;
  myTeam?: EssTeamSnapshot;
  latestPayslip?: EssLatestPayslipSnapshot;
  profileCompleteness: number;
  recentNotifications: Array<{
    id: string;
    title: string;
    message: string;
    type: string;
    isRead: boolean;
    link?: string | null;
    createdAt: Date | string;
  }>;
  upcomingHolidays: Array<{
    name: string;
    date: string;
    dayOfWeek: string;
  }>;
}

export interface EssFullProfile {
  employee: EssEmployeeSummary;
  personal: Record<string, unknown> | null;
  familyMembers: Array<Record<string, unknown>>;
  emergencyContacts: Array<Record<string, unknown>>;
  bankAccount: {
    bankName: string;
    accountHolderName: string;
    maskedAccountNumber: string;
    ifscCode: string;
    branchName: string | null;
    bankLocation: string | null;
  } | null;
  skills: Array<Record<string, unknown>>;
  workSchedule: Record<string, unknown> | null;
  careerHistory?: EssCareerEvent[];
}

export interface EssDocumentDto {
  id: string;
  category:
    | 'personal_identity'
    | 'address_proof'
    | 'education'
    | 'previous_employment'
    | 'bank_payroll'
    | 'tax_other';
  documentName: string;
  documentNumber: string | null;
  status:
    'pending' | 'under_review' | 'verified' | 'rejected' | 'resubmission_required' | 'expired';
  expiryDate: string | null;
  verificationRemarks?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateContactDetailsInput {
  personalEmail?: string | null;
  homePhone?: string | null;
  businessPhone?: string | null;
  workPhone?: string | null;
  addressStreet?: string | null;
  addressLine2?: string | null;
  addressCity?: string | null;
  addressDistrict?: string | null;
  addressState?: string | null;
  addressPostalCode?: string | null;
  addressCountry?: string | null;
  isPermanentSameAsCurrent?: boolean;
  permanentAddressStreet?: string | null;
  permanentAddressLine2?: string | null;
  permanentAddressCity?: string | null;
  permanentAddressDistrict?: string | null;
  permanentAddressState?: string | null;
  permanentAddressPostalCode?: string | null;
  permanentAddressCountry?: string | null;
}

export interface EmergencyContactItemInput {
  priority: 'primary' | 'secondary';
  name: string;
  relationship: string;
  phone: string;
  email?: string | null;
  address?: string | null;
  isPrivate?: boolean;
}

export interface FamilyMemberItemInput {
  name: string;
  relationship: string;
  dateOfBirth?: string | null;
  phone?: string | null;
}

export interface CreateProfileChangeRequestInput {
  subject: string;
  section: 'personal' | 'emergency_contact' | 'bank_account' | 'address';
  changes: Record<string, unknown>;
  reason: string;
}

export interface EssProfileChangeRequestDto {
  id: string;
  requestType:
    | 'profile_change'
    | 'attendance_regularization'
    | 'document_request'
    | 'general_service'
    | string;
  subject: string;
  section?: string;
  reason?: string | null;
  changes?: Record<string, unknown>;
  details: {
    section?: string;
    changes?: Record<string, unknown>;
    reason?: string | null;
    [key: string]: unknown;
  };
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  reviewerNotes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CheckInInput {
  workLocation?: string;
  notes?: string;
  /** Client-reported location/device details (latitude, longitude, accuracy, ...). */
  deviceMetadata?: Record<string, unknown>;
  /** Set by the server from the request, never from the client body. */
  clientIp?: string;
}

export interface CheckOutInput {
  deviceMetadata?: Record<string, unknown>;
  clientIp?: string;
}

export interface BreakPunchInput {
  breakType?: 'tea' | 'lunch' | 'personal';
  notes?: string;
}

export interface RegularizeAttendanceInput {
  date?: string;
  workday?: string;
  checkInTime?: string | null;
  checkOutTime?: string | null;
  proposedCheckIn?: string | null;
  proposedCheckOut?: string | null;
  proposedStatus?: string | null;
  claimedHours?: number | null;
  requestType?: string;
  reason: string;
  evidenceAttachments?: Array<{ name: string; size: string; url?: string }>;
}

export interface EssAttendanceRegularizationDto {
  id: string;
  requestNumber: string;
  workday: string;
  date: string;
  requestType: string;
  category?: string;
  approvalStatus: string;
  status: string;
  applicationStatus: string;
  proposedCorrection: string;
  proposedCheckIn?: string | null;
  proposedCheckOut?: string | null;
  proposedStatus?: string | null;
  claimedHours?: number | null;
  reason: string;
  decisionRemarks: string | null;
  decisionReason: string | null;
  decidedAt?: string | null;
  submittedAt: string;
  createdAt: string;
}

export interface ApplyLeaveInput {
  leaveType: 'annual' | 'sick' | 'casual' | 'unpaid';
  startDate: string;
  endDate: string;
  reason: string;
}

export interface LogTimesheetInput {
  date: string;
  projectName: string;
  taskDescription: string;
  hours: number;
}

export interface UpdateTimesheetInput {
  date?: string;
  projectName?: string;
  taskDescription?: string;
  hours?: number;
}

export interface SubmitDocumentInput {
  category:
    | 'personal_identity'
    | 'address_proof'
    | 'education'
    | 'previous_employment'
    | 'bank_payroll'
    | 'tax_other';
  documentName: string;
  documentNumber?: string;
  expiryDate?: string;
}
