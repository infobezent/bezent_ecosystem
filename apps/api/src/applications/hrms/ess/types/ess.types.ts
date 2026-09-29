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
}

export interface EssLeaveBalanceItem {
  leaveType: 'annual' | 'sick' | 'casual' | 'unpaid';
  totalDays: number;
  usedDays: number;
  pendingDays: number;
  availableDays: number;
}

export interface EssDashboardData {
  employee: EssEmployeeSummary;
  todayAttendance: EssTodayAttendance;
  leaveBalances: EssLeaveBalanceItem[];
  pendingRequestsCount: number;
  assignedTasksCount: number;
  unreadNotificationsCount: number;
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
  } | null;
  skills: Array<Record<string, unknown>>;
  workSchedule: Record<string, unknown> | null;
}

export interface CreateProfileChangeRequestInput {
  subject: string;
  section: 'personal' | 'emergency_contact' | 'bank_account' | 'address';
  changes: Record<string, unknown>;
  reason: string;
}

export interface CheckInInput {
  workLocation?: string;
  notes?: string;
}

export interface RegularizeAttendanceInput {
  date: string;
  checkInTime: string;
  checkOutTime: string;
  reason: string;
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
