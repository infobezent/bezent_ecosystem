import { appConfig } from '../../../../app/config/env';
import { authorizedFetch } from '../../../../platform/auth';

const API_BASE = `${appConfig.apiBaseUrl}/ess`;

export const PLATFORM_TOKEN_KEY = 'bezent_platform_token';
export const ACTIVE_COMPANY_KEY = 'bezent_active_company_id';

/* ── Domain Types ─────────────────────────────────────────────────── */

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
  avatarPreference?: 'male' | 'female' | 'neutral' | string | null;
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

export interface EssNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'action_required';
  isRead: boolean;
  link?: string | null;
  createdAt: string;
}

export interface EssMonthlyAttendanceSnapshot {
  presentDays: number;
  absentDays: number;
  lateDays: number;
  attendancePercent: number;
  totalWorkingDays: number;
  history?: EssAttendanceRecord[];
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
  type:
    | 'birthday'
    | 'new_joiner'
    | 'anniversary'
    | 'holiday'
    | 'event'
    | 'announcement'
    | 'milestone_poster';
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
  recentNotifications: EssNotification[];
  upcomingHolidays: Array<{ name: string; date: string; dayOfWeek: string }>;
}

export interface EssLeaveRequest {
  id: string;
  leaveType: 'annual' | 'sick' | 'casual' | 'unpaid';
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}

export interface EssAttendanceRecord {
  id: string;
  date: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  status: 'present' | 'absent' | 'half_day' | 'on_leave' | 'holiday' | 'incomplete';
  workLocation: string;
  notes?: string | null;
  workedMinutes?: number;
  breakMinutes?: number;
  lateMinutes?: number;
  earlyMinutes?: number;
  isLate?: boolean;
  isEarlyExit?: boolean;
  isMissingPunch?: boolean;
  isRegularized?: boolean;
  shiftScheduleRef?: string | null;
}

export interface EssMonthlyAttendanceSummary {
  month: string;
  present: number;
  halfDay: number;
  absent: number;
  onLeave: number;
  holiday: number;
  lateDays: number;
  workedMinutes: number;
}

/** How the company's attendance settings shape the employee's own history view. */
export interface EssAttendanceView {
  visibility: string;
  historyDays: number;
}

export interface EssTimesheet {
  id: string;
  date: string;
  projectName: string;
  taskDescription: string;
  hours: number;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  createdAt: string;
}

export interface EssDocument {
  id: string;
  category:
    | 'personal_identity'
    | 'address_proof'
    | 'education'
    | 'previous_employment'
    | 'bank_payroll'
    | 'tax_other';
  documentName: string;
  documentType?: string | null;
  documentNumber?: string | null;
  status:
    'pending' | 'under_review' | 'verified' | 'rejected' | 'resubmission_required' | 'expired';
  expiryDate?: string | null;
  verificationRemarks?: string | null;
  createdAt: string;
}

export interface EssRequest {
  id: string;
  requestType:
    'profile_change' | 'attendance_regularization' | 'document_request' | 'general_service';
  subject: string;
  details: Record<string, unknown>;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  reviewerNotes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EssAttendanceRegularizationDto {
  id: string;
  requestNumber: string;
  workday: string;
  date: string;
  requestType: string;
  category?: string;
  approvalStatus:
    | 'draft'
    | 'submitted'
    | 'under_review'
    | 'awaiting_info'
    | 'approved'
    | 'rejected'
    | 'cancelled';
  status: string;
  applicationStatus: 'not_applicable' | 'pending_application' | 'applied' | 'failed' | 'blocked';
  proposedCorrection: string;
  proposedCheckIn?: string | null;
  proposedCheckOut?: string | null;
  proposedStatus?: string | null;
  claimedHours?: number | null;
  reason: string;
  decisionRemarks?: string | null;
  decisionReason?: string | null;
  decidedAt?: string | null;
  submittedAt: string;
  createdAt: string;
}

export interface EssTask {
  id: string;
  title: string;
  description?: string | null;
  dueDate?: string | null;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in_progress' | 'completed';
  createdAt: string;
}

export interface EssPersonalDetails {
  employeeId?: string;
  middleName?: string | null;
  preferredName?: string | null;
  gender?: string | null;
  dateOfBirth?: string | null;
  maritalStatus?: string | null;
  bloodGroup?: string | null;
  nationality?: string | null;
  nativeLanguage?: string | null;
  fatherName?: string | null;
  guardianName?: string | null;
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

export interface EssEmergencyContact {
  id?: string;
  priority: 'primary' | 'secondary';
  name: string;
  relationship: string;
  phone: string;
  email?: string | null;
  address?: string | null;
  isPrivate?: boolean;
}

export interface EssFamilyMember {
  id?: string;
  name: string;
  relationship: string;
  dateOfBirth?: string | null;
  phone?: string | null;
  sortOrder?: number;
}

export interface EssSkill {
  id?: string;
  skillName: string;
  skillType: string;
  proficiency: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert' | string;
  level?: string | null;
  assessedOn?: string | null;
  yearsOfExperience?: number | null;
  sortOrder?: number;
}

export interface EssWorkSchedule {
  workingCalendar?: string | null;
  workSchedule?: string | null;
  workingDays?: string[];
  startTime?: string | null;
  endTime?: string | null;
  breakMinutes?: number | null;
  lunchMinutes?: number | null;
  timeZone?: string | null;
}

export interface EssFullProfile {
  employee: EssEmployeeSummary;
  personal: EssPersonalDetails | null;
  familyMembers: EssFamilyMember[];
  emergencyContacts: EssEmergencyContact[];
  bankAccount: {
    bankName: string;
    accountHolderName: string;
    maskedAccountNumber: string;
    ifscCode: string;
    branchName: string | null;
    bankLocation?: string | null;
  } | null;
  skills: EssSkill[];
  workSchedule: EssWorkSchedule | null;
  careerHistory?: EssCareerEvent[];
}

/* ── HTTP client ──────────────────────────────────────────────────── */

function getHeaders(): Record<string, string> {
  const token =
    typeof localStorage !== 'undefined' ? localStorage.getItem(PLATFORM_TOKEN_KEY) : null;
  const companyId =
    typeof localStorage !== 'undefined' ? localStorage.getItem(ACTIVE_COMPANY_KEY) : null;

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (companyId) headers['X-Company-Id'] = companyId;
  return headers;
}

async function req<T>(path: string, options: RequestInit = {}): Promise<T> {
  const resp = await authorizedFetch(`${API_BASE}${path}`, {
    ...options,
    headers: { ...getHeaders(), ...(options.headers as Record<string, string> | undefined) },
  });
  const body = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    const msg =
      body?.error?.message ??
      (typeof body?.error === 'string' ? body.error : undefined) ??
      `Request failed with status ${resp.status}`;
    throw Object.assign(new Error(msg), { code: body?.error?.code as string | undefined });
  }
  return (body?.data !== undefined ? body.data : body) as T;
}

/** The server asks for the employee's location before it will accept a punch. */
export function isLocationRequiredError(err: unknown): boolean {
  if (!err) return false;
  const code = (err as { code?: string })?.code;
  if (code === 'LOCATION_REQUIRED') return true;
  const message = (err as { message?: string })?.message;
  if (
    typeof message === 'string' &&
    (message.includes('LOCATION_REQUIRED') ||
      message.toLowerCase().includes('location is required'))
  ) {
    return true;
  }
  return false;
}

export interface PunchDeviceMetadata {
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  source?: 'web' | 'mobile' | 'kiosk' | string;
  clientType?: string;
  platform?: string;
  selfieUrl?: string;
  mockLocation?: boolean;
  [key: string]: unknown;
}

/* ── API methods ─────────────────────────────────────────────────── */

export const essApi = {
  // Dashboard
  getDashboard: () => req<EssDashboardData>('/dashboard'),

  // Profile
  getProfile: () => req<EssFullProfile>('/profile'),
  getCareerHistory: () => req<EssCareerEvent[]>('/career-history'),
  updateContactDetails: (payload: Partial<EssPersonalDetails>) =>
    req<EssFullProfile>('/profile/personal', {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  updateEmergencyContacts: (payload: EssEmergencyContact[]) =>
    req<EssFullProfile>('/profile/emergency-contacts', {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  updateFamilyMembers: (payload: EssFamilyMember[]) =>
    req<EssFullProfile>('/profile/family-members', {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  getProfileChangeRequests: () => req<EssRequest[]>('/profile/change-requests'),
  submitProfileChangeRequest: (payload: {
    subject: string;
    section: 'personal' | 'emergency_contact' | 'bank_account' | 'address';
    changes: Record<string, unknown>;
    reason: string;
  }) =>
    req<EssRequest>('/profile/change-requests', { method: 'POST', body: JSON.stringify(payload) }),

  // Attendance
  getAttendance: (params?: { month?: string }) =>
    req<{
      today: EssTodayAttendance & { notes?: string | null };
      summary?: EssAttendanceSummaryCounters & {
        attendancePercent?: number;
        totalWorkingDays?: number;
      };
      history: EssAttendanceRecord[];
      monthlySummary?: EssMonthlyAttendanceSummary[];
      view?: EssAttendanceView;
    }>(params?.month ? `/attendance?month=${encodeURIComponent(params.month)}` : '/attendance'),
  checkIn: (payload: {
    workLocation?: 'office' | 'wfh' | 'on_duty' | 'field' | string;
    notes?: string;
    deviceMetadata?: PunchDeviceMetadata;
  }) =>
    req<EssAttendanceRecord>('/attendance/check-in', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  checkOut: (payload?: { deviceMetadata?: PunchDeviceMetadata }) =>
    req<EssAttendanceRecord>('/attendance/check-out', {
      method: 'POST',
      body: JSON.stringify(payload ?? {}),
    }),
  startBreak: (payload: { breakType?: 'tea' | 'lunch' | 'personal'; notes?: string }) =>
    req<{ message: string; punch: EssPunchEvent }>('/attendance/break-start', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  endBreak: (payload?: { notes?: string }) =>
    req<{ message: string; punch: EssPunchEvent }>('/attendance/break-end', {
      method: 'POST',
      body: JSON.stringify(payload || {}),
    }),
  getAttendanceRegularizations: () =>
    req<EssAttendanceRegularizationDto[]>('/attendance/regularizations'),
  regularizeAttendance: (payload: {
    date: string;
    workday?: string;
    checkInTime?: string;
    checkOutTime?: string;
    proposedCheckIn?: string;
    proposedCheckOut?: string;
    proposedStatus?: string;
    claimedHours?: number;
    requestType?: string;
    reason: string;
  }) =>
    req<EssAttendanceRegularizationDto>('/attendance/regularize', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Leave
  getLeave: () =>
    req<{
      balances: EssLeaveBalanceItem[];
      requests: EssLeaveRequest[];
      holidays: Array<{ name: string; date: string; dayOfWeek: string }>;
    }>('/leave'),
  applyLeave: (payload: {
    leaveType: 'annual' | 'sick' | 'casual' | 'unpaid';
    startDate: string;
    endDate: string;
    reason: string;
  }) => req<EssLeaveRequest>('/leave/apply', { method: 'POST', body: JSON.stringify(payload) }),
  cancelLeave: (id: string) => req<EssLeaveRequest>(`/leave/${id}/cancel`, { method: 'POST' }),

  // Timesheets
  getTimesheets: () => req<{ timesheets: EssTimesheet[] }>('/timesheets'),
  logTimesheet: (payload: {
    date: string;
    projectName: string;
    taskDescription: string;
    hours: number;
  }) => req<EssTimesheet>('/timesheets/log', { method: 'POST', body: JSON.stringify(payload) }),
  updateTimesheet: (
    id: string,
    payload: {
      date?: string;
      projectName?: string;
      taskDescription?: string;
      hours?: number;
    },
  ) => req<EssTimesheet>(`/timesheets/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  deleteTimesheet: (id: string) =>
    req<{ success: boolean }>(`/timesheets/${id}`, { method: 'DELETE' }),
  submitTimesheets: (ids?: string[]) =>
    req<{ submittedCount: number }>('/timesheets/submit', {
      method: 'POST',
      body: JSON.stringify({ ids }),
    }),

  // Documents
  getDocuments: () => req<{ documents: EssDocument[] }>('/documents'),
  uploadDocument: (payload: {
    category: EssDocument['category'];
    documentName: string;
    documentNumber?: string;
    expiryDate?: string;
  }) => req<EssDocument>('/documents/upload', { method: 'POST', body: JSON.stringify(payload) }),

  // Requests
  getRequests: () => req<{ requests: EssRequest[] }>('/requests'),
  createRequest: (payload: {
    requestType: 'document_request' | 'general_service';
    subject: string;
    details?: Record<string, unknown>;
  }) => req<EssRequest>('/requests', { method: 'POST', body: JSON.stringify(payload) }),
  cancelRequest: (id: string) => req<EssRequest>(`/requests/${id}/cancel`, { method: 'POST' }),

  // Tasks
  getTasks: () => req<{ tasks: EssTask[] }>('/tasks'),
  updateTaskStatus: (id: string, status: EssTask['status']) =>
    req<EssTask>(`/tasks/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),

  // Notifications
  getNotifications: () =>
    req<{ notifications: EssNotification[]; unreadCount: number }>('/notifications'),
  markNotificationRead: (id: string) =>
    req<EssNotification>(`/notifications/${id}/read`, { method: 'PATCH' }),
  markAllRead: () => req<{ markedCount: number }>('/notifications/read-all', { method: 'POST' }),

  // Payslips
  getPayslips: () => req<{ enabled: boolean; message: string; payslips: unknown[] }>('/payslips'),
};
