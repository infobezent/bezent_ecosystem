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
  departmentId: string | null;
  departmentName?: string | null;
  designationId: string | null;
  designationTitle?: string | null;
  locationId: string | null;
  locationName?: string | null;
  employmentType: string;
  employmentStatus: string;
  joiningDate: string;
}

export interface EssTodayAttendance {
  date: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  status: 'present' | 'absent' | 'half_day' | 'on_leave' | 'holiday' | 'not_checked_in';
  workLocation: string;
  notes?: string | null;
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

export interface EssDashboardData {
  employee: EssEmployeeSummary;
  todayAttendance: EssTodayAttendance;
  leaveBalances: EssLeaveBalanceItem[];
  pendingRequestsCount: number;
  assignedTasksCount: number;
  unreadNotificationsCount: number;
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
  status: 'present' | 'absent' | 'half_day' | 'on_leave' | 'holiday';
  workLocation: string;
  notes?: string | null;
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
  documentNumber?: string | null;
  status:
    'pending' | 'under_review' | 'verified' | 'rejected' | 'resubmission_required' | 'expired';
  expiryDate?: string | null;
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

export interface EssTask {
  id: string;
  title: string;
  description?: string | null;
  dueDate?: string | null;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in_progress' | 'completed';
  createdAt: string;
}

export interface EssFullProfile {
  employee: EssEmployeeSummary;
  personal: Record<string, unknown> | null;
  familyMembers: Record<string, unknown>[];
  emergencyContacts: Record<string, unknown>[];
  bankAccount: {
    bankName: string;
    accountHolderName: string;
    maskedAccountNumber: string;
    ifscCode: string;
    branchName: string | null;
  } | null;
  skills: Record<string, unknown>[];
  workSchedule: Record<string, unknown> | null;
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
    throw new Error(msg);
  }
  return (body?.data !== undefined ? body.data : body) as T;
}

/* ── API methods ─────────────────────────────────────────────────── */

export const essApi = {
  // Dashboard
  getDashboard: () => req<EssDashboardData>('/dashboard'),

  // Profile
  getProfile: () => req<EssFullProfile>('/profile'),
  submitProfileChangeRequest: (payload: {
    subject: string;
    section: 'personal' | 'emergency_contact' | 'bank_account' | 'address';
    changes: Record<string, unknown>;
    reason: string;
  }) =>
    req<EssRequest>('/profile/change-requests', { method: 'POST', body: JSON.stringify(payload) }),

  // Attendance
  getAttendance: () =>
    req<{ today: EssTodayAttendance & { notes?: string | null }; history: EssAttendanceRecord[] }>(
      '/attendance',
    ),
  checkIn: (payload: { workLocation?: string; notes?: string }) =>
    req<EssAttendanceRecord>('/attendance/check-in', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  checkOut: () => req<EssAttendanceRecord>('/attendance/check-out', { method: 'POST' }),
  regularizeAttendance: (payload: {
    date: string;
    checkInTime: string;
    checkOutTime: string;
    reason: string;
  }) =>
    req<EssRequest>('/attendance/regularize', { method: 'POST', body: JSON.stringify(payload) }),

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
