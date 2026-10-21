import { appConfig } from '../../../../app/config/env';
import { authorizedFetch } from '../../../../platform/auth';
import type {
  AttendanceOverviewKpis,
  DailyAttendanceItem,
  DailyLogFilter,
  DailyLogResponse,
  DailyLogEmployeeDetail,
  MonthlySummaryEmployeeRow,
  PunchLogItem,
  PunchLogFilter,
  PunchLogResult,
  PunchEventDetail,
  UpdatePunchInvestigationInput,
  BulkPunchActionInput,
  RegularizationItem,
  RegularizationItemV1,
  RegularizationDetailV1,
  RegularizationFilterV1,
  RegularizationQueryResultV1,
  RegularizationSubmissionInput,
  RegularizationEligibilityCheckResult,
  BulkRegularizationActionInput,
  BulkRegularizationActionResult,
  AttendanceExceptionItem,
  ExceptionFilter,
  ExceptionQueryResult,
  AttendanceExceptionCaseItem,
  ExceptionCaseDetail,
  BulkExceptionActionInput,
  AttendancePolicy,
  EffectivePolicyResolution,
  ManualCorrectionPayload,
  AttendanceGeneralSettings,
  GeneralSettingsInput,
  AttendanceRegularizationSettings,
  RegularizationSettingsInput,
  AttendanceDevice,
  DeviceInput,
  DeviceTestResult,
  AttendanceImportBatch,
  BulkImportPayload,
  AttendanceSecuritySettings,
  SecuritySettingsInput,
  AttendancePayrollSettings,
  PayrollSettingsInput,
  AttendancePeriod,
  PeriodLockReadiness,
  AttendancePayrollHandoverBatch,
  AttendanceSettingsAuditLog,
  SettingsAuditFilter,
  OnDutyRequestItem,
  OnDutyTypeConfig,
  CreateOnDutyRequestPayload,
  ReviewOnDutyRequestPayload,
  OnDutyFilterV1,
  OnDutyItemV1,
  OnDutyDetailV1,
  OnDutyQueryResultV1,
  ReviewOnDutyDecisionInput,
  BulkOnDutyActionInput,
  BulkOnDutyActionResult,
  BulkOnDutyEligibilityPreview,
  OnDutyExportFilter,
  MonthlySummaryRow,
  MonthlySummaryFilter,
  MonthlySummaryDailyRecord,
  MonthlySummaryReadinessReport,
  MonthlySummaryReviewHistoryItem,
  MonthlySummaryBulkActionInput,
  MonthlySummaryBulkActionResult,
  MonthlySummaryBulkPreviewResult,
  MonthlySummaryExportInput,
  MonthlySummaryQueryResult,
  CompanyShiftTemplate,
  ShiftRosterSettings,
  UpdateShiftRosterSettingsInput,
  CreateShiftInput,
  UpdateShiftInput,
} from '../types/attendance.types';

export async function fetchAttendanceOverview(
  date?: string,
  options?: {
    trendRange?: '7d' | '30d' | 'custom';
    startDate?: string;
    endDate?: string;
    month?: string;
  },
): Promise<AttendanceOverviewKpis> {
  const query = new URLSearchParams();
  if (date) query.set('date', date);
  if (options?.trendRange) query.set('trendRange', options.trendRange);
  if (options?.startDate) query.set('startDate', options.startDate);
  if (options?.endDate) query.set('endDate', options.endDate);
  if (options?.month) query.set('month', options.month);

  const qs = query.toString();
  const url = `${appConfig.apiBaseUrl}/hrms/attendance/overview${qs ? `?${qs}` : ''}`;
  const res = await authorizedFetch(url);
  const body = await res.json();
  if (!res.ok || !body?.data) {
    throw new Error(body?.error?.message ?? `Failed to fetch overview: ${res.status}`);
  }
  return body.data;
}

export async function fetchDailyAttendanceLogV1(params: DailyLogFilter): Promise<DailyLogResponse> {
  const query = new URLSearchParams();
  query.set('date', params.date);
  if (params.departmentId) query.set('departmentId', params.departmentId);
  if (params.status) query.set('status', params.status);
  if (params.search) query.set('search', params.search);
  if (params.processingState) query.set('processingState', params.processingState);
  if (params.shiftRef) query.set('shiftRef', params.shiftRef);
  if (params.locationId) query.set('locationId', params.locationId);
  if (params.indicator) query.set('indicator', params.indicator);
  if (params.punchSource) query.set('punchSource', params.punchSource);
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));
  if (params.sortBy) query.set('sortBy', params.sortBy);
  if (params.sortOrder) query.set('sortOrder', params.sortOrder);

  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/hrms/attendance/daily-log?${query.toString()}`,
  );
  const body = await res.json();
  if (!res.ok || !body?.data) {
    throw new Error(body?.error?.message ?? `Failed to fetch daily log: ${res.status}`);
  }
  return {
    data: body.data,
    counters: body.counters ?? {
      scheduled: 0,
      present: 0,
      absent: 0,
      onLeave: 0,
      onDuty: 0,
      pendingReview: 0,
    },
    total: body.total ?? body.data.length,
    page: body.page ?? 1,
    limit: body.limit ?? body.data.length,
    totalPages: body.totalPages ?? 1,
  };
}

export async function fetchDailyAttendanceLog(params: {
  date: string;
  departmentId?: string;
  status?: string;
  search?: string;
}): Promise<DailyAttendanceItem[]> {
  const res = await fetchDailyAttendanceLogV1(params);
  return res.data;
}

export async function fetchEmployeeDailyDetail(
  employeeId: string,
  date: string,
): Promise<DailyLogEmployeeDetail> {
  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/hrms/attendance/daily-log/employee/${encodeURIComponent(employeeId)}?date=${encodeURIComponent(date)}`,
  );
  const body = await res.json();
  if (!res.ok || !body?.data) {
    throw new Error(body?.error?.message ?? `Failed to fetch employee details: ${res.status}`);
  }
  return body.data;
}

export async function recalculateDailyAttendance(payload: {
  employeeIds: string[];
  date: string;
}): Promise<{ recalculatedCount: number; failures: Array<{ employeeId: string; error: string }> }> {
  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/hrms/attendance/daily-log/recalculate`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
  );
  const body = await res.json();
  if (!res.ok || !body?.data) {
    throw new Error(body?.error?.message ?? `Failed to recalculate attendance: ${res.status}`);
  }
  return body.data;
}

export async function bulkFinalizeDailyAttendance(payload: {
  employeeIds: string[];
  date: string;
}): Promise<{ finalizedCount: number }> {
  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/hrms/attendance/daily-log/bulk-finalize`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
  );
  const body = await res.json();
  if (!res.ok || !body?.data) {
    throw new Error(body?.error?.message ?? `Failed to finalize attendance: ${res.status}`);
  }
  return body.data;
}

export async function fetchMonthlyAttendanceSummary(params: {
  year: number;
  month: number;
  departmentId?: string;
  search?: string;
}): Promise<MonthlySummaryEmployeeRow[]> {
  const query = new URLSearchParams();
  query.set('year', String(params.year));
  query.set('month', String(params.month));
  if (params.departmentId) query.set('departmentId', params.departmentId);
  if (params.search) query.set('search', params.search);

  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/hrms/attendance/monthly-summary?${query.toString()}`,
  );
  const body = await res.json();
  if (!res.ok || !body?.data) {
    throw new Error(body?.error?.message ?? `Failed to fetch monthly summary: ${res.status}`);
  }
  return body.data;
}

export async function fetchAttendanceExceptions(params: {
  date?: string;
  type?: string;
  departmentId?: string;
}): Promise<AttendanceExceptionItem[]> {
  const query = new URLSearchParams();
  if (params.date) query.set('date', params.date);
  if (params.type) query.set('type', params.type);
  if (params.departmentId) query.set('departmentId', params.departmentId);

  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/hrms/attendance/exceptions?${query.toString()}`,
  );
  const body = await res.json();
  if (!res.ok || !body?.data) {
    throw new Error(body?.error?.message ?? `Failed to fetch exceptions: ${res.status}`);
  }
  return body.data;
}

export async function fetchExceptionCases(
  filter: ExceptionFilter = {},
): Promise<ExceptionQueryResult> {
  const query = new URLSearchParams();
  query.set('v1', 'true');
  if (filter.dateFrom) query.set('dateFrom', filter.dateFrom);
  if (filter.dateTo) query.set('dateTo', filter.dateTo);
  if (filter.dateInterpretation) query.set('dateInterpretation', filter.dateInterpretation);
  if (filter.status) query.set('status', filter.status);
  if (filter.severity) query.set('severity', filter.severity);
  if (filter.exceptionType) query.set('exceptionType', filter.exceptionType);
  if (filter.source) query.set('source', filter.source);
  if (filter.assignment) query.set('assignment', filter.assignment);
  if (filter.assignedTo) query.set('assignedTo', filter.assignedTo);
  if (filter.departmentId) query.set('departmentId', filter.departmentId);
  if (filter.pendingActionReason) query.set('pendingActionReason', filter.pendingActionReason);
  if (filter.search) query.set('search', filter.search);
  if (filter.page) query.set('page', String(filter.page));
  if (filter.limit) query.set('limit', String(filter.limit));
  if (filter.sortBy) query.set('sortBy', filter.sortBy);
  if (filter.sortOrder) query.set('sortOrder', filter.sortOrder);

  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/hrms/attendance/exceptions?${query.toString()}`,
  );
  const body = await res.json();
  if (!res.ok || !body?.data) {
    throw new Error(body?.error?.message ?? `Failed to fetch exceptions: ${res.status}`);
  }
  return body.data;
}

export async function fetchExceptionDetails(id: string): Promise<ExceptionCaseDetail> {
  const res = await authorizedFetch(`${appConfig.apiBaseUrl}/hrms/attendance/exceptions/${id}`);
  const body = await res.json();
  if (!res.ok || !body?.data) {
    throw new Error(body?.error?.message ?? `Failed to fetch exception details: ${res.status}`);
  }
  return body.data;
}

export async function assignExceptionCase(
  id: string,
  input: { assignedTo?: string; assignedQueue?: string; notes?: string },
): Promise<AttendanceExceptionCaseItem> {
  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/hrms/attendance/exceptions/${id}/assign`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    },
  );
  const body = await res.json();
  if (!res.ok || !body?.data) {
    throw new Error(body?.error?.message ?? `Failed to assign exception: ${res.status}`);
  }
  return body.data;
}

export async function updateExceptionCaseStatus(
  id: string,
  input: {
    status: string;
    pendingActionReason?: string;
    pendingActionAwaitedFrom?: string;
    notes?: string;
    resolutionNotes?: string;
    resolutionType?: string;
  },
): Promise<AttendanceExceptionCaseItem> {
  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/hrms/attendance/exceptions/${id}/status`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    },
  );
  const body = await res.json();
  if (!res.ok || !body?.data) {
    throw new Error(body?.error?.message ?? `Failed to update exception status: ${res.status}`);
  }
  return body.data;
}

export async function overrideExceptionCaseSeverity(
  id: string,
  input: { severity: string; reason: string },
): Promise<AttendanceExceptionCaseItem> {
  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/hrms/attendance/exceptions/${id}/severity`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    },
  );
  const body = await res.json();
  if (!res.ok || !body?.data) {
    throw new Error(body?.error?.message ?? `Failed to override severity: ${res.status}`);
  }
  return body.data;
}

export async function verifyAndResolveExceptionCase(
  id: string,
  resolutionNotes: string,
): Promise<AttendanceExceptionCaseItem> {
  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/hrms/attendance/exceptions/${id}/verify-resolve`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resolutionNotes }),
    },
  );
  const body = await res.json();
  if (!res.ok || !body?.data) {
    throw new Error(
      body?.error?.message ?? `Failed to verify and resolve exception: ${res.status}`,
    );
  }
  return body.data;
}

export async function bulkExceptionCaseAction(
  input: BulkExceptionActionInput,
): Promise<{ success: boolean; affectedCount: number; message: string }> {
  const res = await authorizedFetch(`${appConfig.apiBaseUrl}/hrms/attendance/exceptions/bulk`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const body = await res.json();
  if (!res.ok || !body?.data) {
    throw new Error(body?.error?.message ?? `Failed to execute bulk action: ${res.status}`);
  }
  return body.data;
}

export async function exportExceptionsCsv(
  filter: ExceptionFilter = {},
  selectedIds?: string[],
): Promise<Blob> {
  const query = new URLSearchParams();
  if (filter.dateFrom) query.set('dateFrom', filter.dateFrom);
  if (filter.dateTo) query.set('dateTo', filter.dateTo);
  if (filter.dateInterpretation) query.set('dateInterpretation', filter.dateInterpretation);
  if (filter.status) query.set('status', filter.status);
  if (filter.severity) query.set('severity', filter.severity);
  if (filter.exceptionType) query.set('exceptionType', filter.exceptionType);
  if (filter.source) query.set('source', filter.source);
  if (filter.assignedTo) query.set('assignedTo', filter.assignedTo);
  if (filter.departmentId) query.set('departmentId', filter.departmentId);
  if (filter.search) query.set('search', filter.search);
  if (selectedIds && selectedIds.length > 0) {
    query.set('selectedIds', selectedIds.join(','));
  }

  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/hrms/attendance/exceptions/export?${query.toString()}`,
  );
  if (!res.ok) {
    throw new Error(`Failed to export exceptions CSV: ${res.status}`);
  }
  return res.blob();
}

export async function fetchRegularizationRequests(params?: {
  status?: string;
}): Promise<RegularizationItem[]> {
  const query = new URLSearchParams();
  if (params?.status) query.set('status', params.status);

  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/hrms/attendance/regularization?${query.toString()}`,
  );
  const body = await res.json();
  if (!res.ok || !body?.data) {
    throw new Error(
      body?.error?.message ?? `Failed to fetch regularization requests: ${res.status}`,
    );
  }
  return body.data;
}

export async function reviewRegularizationRequest(
  id: string,
  payload: { status: 'approved' | 'rejected'; remarks: string },
): Promise<RegularizationItem> {
  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/hrms/attendance/regularization/${id}/review`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
  );
  const body = await res.json();
  if (!res.ok || !body?.data) {
    throw new Error(body?.error?.message ?? `Failed to review regularization: ${res.status}`);
  }
  return body.data;
}

// -------------------------------------------------------------
// Regularization V1.0 Advanced Enterprise Workspace API
// -------------------------------------------------------------

export async function fetchRegularizationWorkspace(
  filter: RegularizationFilterV1 = {},
): Promise<RegularizationQueryResultV1> {
  const query = new URLSearchParams();
  if (filter.search) query.set('search', filter.search);
  if (filter.approvalStatus) query.set('approvalStatus', filter.approvalStatus);
  if (filter.applicationStatus) query.set('applicationStatus', filter.applicationStatus);
  if (filter.requestType) query.set('requestType', filter.requestType);
  if (filter.workdayFrom) query.set('workdayFrom', filter.workdayFrom);
  if (filter.workdayTo) query.set('workdayTo', filter.workdayTo);
  if (filter.submittedFrom) query.set('submittedFrom', filter.submittedFrom);
  if (filter.submittedTo) query.set('submittedTo', filter.submittedTo);
  if (filter.assignedTo) query.set('assignedTo', filter.assignedTo);
  if (filter.departmentId) query.set('departmentId', filter.departmentId);
  if (filter.locationId) query.set('locationId', filter.locationId);
  if (filter.relatedException) query.set('relatedException', filter.relatedException);
  if (filter.source) query.set('source', filter.source);
  if (filter.employeeId) query.set('employeeId', filter.employeeId);
  if (filter.page) query.set('page', String(filter.page));
  if (filter.limit) query.set('limit', String(filter.limit));
  if (filter.sortBy) query.set('sortBy', filter.sortBy);
  if (filter.sortOrder) query.set('sortOrder', filter.sortOrder);

  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/hrms/attendance/regularization?${query.toString()}`,
  );
  const body = await res.json();
  if (!res.ok || !body?.data) {
    throw new Error(
      body?.error?.message ?? `Failed to fetch regularization workspace: ${res.status}`,
    );
  }

  return {
    items: body.data,
    counters: body.counters ?? {
      pendingReview: 0,
      underReview: 0,
      awaitingInfo: 0,
      approvedToday: 0,
      applicationIssues: 0,
      rejectedToday: 0,
    },
    total: body.total ?? body.data.length,
    page: body.page ?? 1,
    limit: body.limit ?? 50,
    totalPages: body.totalPages ?? 1,
  };
}

export async function fetchRegularizationDetails(id: string): Promise<RegularizationDetailV1> {
  const res = await authorizedFetch(`${appConfig.apiBaseUrl}/hrms/attendance/regularization/${id}`);
  const body = await res.json();
  if (!res.ok || !body?.data) {
    throw new Error(
      body?.error?.message ?? `Failed to fetch regularization details: ${res.status}`,
    );
  }
  return body.data;
}

export async function checkRegularizationEligibility(
  employeeId: string,
  workday: string,
  requestType: string,
): Promise<RegularizationEligibilityCheckResult> {
  const query = new URLSearchParams({ employeeId, workday, requestType });
  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/hrms/attendance/regularization/eligibility?${query.toString()}`,
  );
  const body = await res.json();
  if (!res.ok || !body?.data) {
    throw new Error(
      body?.error?.message ?? `Failed to check regularization eligibility: ${res.status}`,
    );
  }
  return body.data;
}

export async function submitRegularization(
  payload: RegularizationSubmissionInput,
): Promise<RegularizationItemV1> {
  const res = await authorizedFetch(`${appConfig.apiBaseUrl}/hrms/attendance/regularization`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const body = await res.json();
  if (!res.ok || !body?.data) {
    throw new Error(
      body?.error?.message ?? `Failed to submit regularization request: ${res.status}`,
    );
  }
  return body.data;
}

export async function assignRegularizationReviewer(
  id: string,
  assignedTo: string | null,
): Promise<RegularizationItemV1> {
  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/hrms/attendance/regularization/${id}/assign`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assignedTo }),
    },
  );
  const body = await res.json();
  if (!res.ok || !body?.data) {
    throw new Error(body?.error?.message ?? `Failed to assign reviewer: ${res.status}`);
  }
  return body.data;
}

export async function startRegularizationReview(id: string): Promise<RegularizationItemV1> {
  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/hrms/attendance/regularization/${id}/start-review`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
  );
  const body = await res.json();
  if (!res.ok || !body?.data) {
    throw new Error(body?.error?.message ?? `Failed to start review: ${res.status}`);
  }
  return body.data;
}

export async function requestRegularizationInfo(
  id: string,
  notes: string,
): Promise<RegularizationItemV1> {
  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/hrms/attendance/regularization/${id}/request-info`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes }),
    },
  );
  const body = await res.json();
  if (!res.ok || !body?.data) {
    throw new Error(body?.error?.message ?? `Failed to request more info: ${res.status}`);
  }
  return body.data;
}

export async function provideRegularizationClarification(
  id: string,
  response: string,
): Promise<RegularizationItemV1> {
  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/hrms/attendance/regularization/${id}/clarify`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ response }),
    },
  );
  const body = await res.json();
  if (!res.ok || !body?.data) {
    throw new Error(body?.error?.message ?? `Failed to provide clarification: ${res.status}`);
  }
  return body.data;
}

export async function reviewRegularizationDecision(
  id: string,
  payload: { status: 'approved' | 'rejected'; reason?: string; remarks?: string },
): Promise<RegularizationItemV1> {
  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/hrms/attendance/regularization/${id}/review`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
  );
  const body = await res.json();
  if (!res.ok || !body?.data) {
    throw new Error(body?.error?.message ?? `Failed to review regularization: ${res.status}`);
  }
  return body.data;
}

export async function cancelRegularization(
  id: string,
  reason: string,
): Promise<RegularizationItemV1> {
  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/hrms/attendance/regularization/${id}/cancel`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    },
  );
  const body = await res.json();
  if (!res.ok || !body?.data) {
    throw new Error(body?.error?.message ?? `Failed to cancel request: ${res.status}`);
  }
  return body.data;
}

export async function bulkRegularizationAction(
  payload: BulkRegularizationActionInput,
): Promise<BulkRegularizationActionResult> {
  const res = await authorizedFetch(`${appConfig.apiBaseUrl}/hrms/attendance/regularization/bulk`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const body = await res.json();
  if (!res.ok || !body?.data) {
    throw new Error(body?.error?.message ?? `Failed to execute bulk action: ${res.status}`);
  }
  return body.data;
}

export async function exportRegularizationsCsvBlob(
  filter: RegularizationFilterV1 = {},
  selectedIds?: string[],
): Promise<Blob> {
  const query = new URLSearchParams();
  if (filter.workdayFrom) query.set('workdayFrom', filter.workdayFrom);
  if (filter.workdayTo) query.set('workdayTo', filter.workdayTo);
  if (filter.approvalStatus) query.set('approvalStatus', filter.approvalStatus);
  if (filter.applicationStatus) query.set('applicationStatus', filter.applicationStatus);
  if (filter.requestType) query.set('requestType', filter.requestType);
  if (filter.assignedTo) query.set('assignedTo', filter.assignedTo);
  if (filter.departmentId) query.set('departmentId', filter.departmentId);
  if (selectedIds && selectedIds.length > 0) {
    query.set('selectedIds', selectedIds.join(','));
  }

  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/hrms/attendance/regularization/export?${query.toString()}`,
  );
  if (!res.ok) {
    throw new Error(`Failed to export regularizations: ${res.status}`);
  }
  return res.blob();
}

export async function submitManualCorrection(
  payload: ManualCorrectionPayload,
): Promise<DailyAttendanceItem> {
  const res = await authorizedFetch(`${appConfig.apiBaseUrl}/hrms/attendance/manual-correction`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const body = await res.json();
  if (!res.ok || !body?.data) {
    throw new Error(body?.error?.message ?? `Failed to submit manual correction: ${res.status}`);
  }
  return body.data;
}

export async function fetchAttendancePolicy(): Promise<AttendancePolicy> {
  const res = await authorizedFetch(`${appConfig.apiBaseUrl}/hrms/attendance/policies`);
  const body = await res.json();
  if (!res.ok || !body?.data) {
    throw new Error(body?.error?.message ?? `Failed to fetch policy: ${res.status}`);
  }
  return body.data;
}

export async function updateAttendancePolicy(
  payload: Partial<AttendancePolicy>,
): Promise<AttendancePolicy> {
  const res = await authorizedFetch(`${appConfig.apiBaseUrl}/hrms/attendance/policies`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const body = await res.json();
  if (!res.ok || !body?.data) {
    throw new Error(body?.error?.message ?? `Failed to update policy: ${res.status}`);
  }
  return body.data;
}

export async function downloadAttendanceCsv(
  type: 'daily' | 'monthly',
  params: Record<string, string>,
): Promise<void> {
  const query = new URLSearchParams({ type, ...params });
  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/hrms/attendance/reports/export?${query.toString()}`,
  );
  if (!res.ok) {
    throw new Error(`Failed to export attendance report: ${res.status}`);
  }
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `attendance_${type}_${params.date || params.year || 'report'}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

/* ═══════════════════════════════════════════════════════════════════
   ATTENDANCE SETTINGS V1.0 API CLIENTS
   ═══════════════════════════════════════════════════════════════════ */

/* ── 1. General Settings ── */

export async function fetchGeneralSettings(): Promise<AttendanceGeneralSettings> {
  const res = await authorizedFetch(`${appConfig.apiBaseUrl}/hrms/attendance/settings/general`);
  const body = await res.json();
  if (!res.ok || !body?.data) {
    throw new Error(body?.error?.message ?? `Failed to fetch general settings: ${res.status}`);
  }
  return body.data;
}

export async function updateGeneralSettings(
  payload: GeneralSettingsInput,
): Promise<AttendanceGeneralSettings> {
  const res = await authorizedFetch(`${appConfig.apiBaseUrl}/hrms/attendance/settings/general`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const body = await res.json();
  if (!res.ok || !body?.data) {
    throw new Error(body?.error?.message ?? `Failed to update general settings: ${res.status}`);
  }
  return body.data;
}

/* ── 2. Attendance Policies & Overrides ── */

export async function fetchAttendancePoliciesList(params?: {
  scope?: string;
  status?: string;
}): Promise<AttendancePolicy[]> {
  const query = new URLSearchParams();
  if (params?.scope) query.set('scope', params.scope);
  if (params?.status) query.set('status', params.status);

  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/hrms/attendance/settings/policies?${query.toString()}`,
  );
  const body = await res.json();
  if (!res.ok || !body?.data) {
    throw new Error(body?.error?.message ?? `Failed to fetch policies: ${res.status}`);
  }
  return body.data;
}

export async function fetchAttendancePolicyById(id: string): Promise<AttendancePolicy> {
  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/hrms/attendance/settings/policies/${id}`,
  );
  const body = await res.json();
  if (!res.ok || !body?.data) {
    throw new Error(body?.error?.message ?? `Failed to fetch policy: ${res.status}`);
  }
  return body.data;
}

export async function fetchEffectiveAttendancePolicy(params?: {
  employeeId?: string;
  departmentId?: string;
}): Promise<EffectivePolicyResolution> {
  const query = new URLSearchParams();
  if (params?.employeeId) query.set('employeeId', params.employeeId);
  if (params?.departmentId) query.set('departmentId', params.departmentId);

  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/hrms/attendance/settings/policies/effective?${query.toString()}`,
  );
  const body = await res.json();
  if (!res.ok || !body?.data) {
    throw new Error(body?.error?.message ?? `Failed to fetch effective policy: ${res.status}`);
  }
  return body.data;
}

export async function publishAttendancePolicy(
  id: string,
  payload: { changeReason: string; effectiveFrom?: string },
): Promise<AttendancePolicy> {
  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/hrms/attendance/settings/policies/${id}/publish`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
  );
  const body = await res.json();
  if (!res.ok || !body?.data) {
    throw new Error(body?.error?.message ?? `Failed to publish policy: ${res.status}`);
  }
  return body.data;
}

export async function createAttendancePolicy(
  payload: Partial<AttendancePolicy>,
): Promise<AttendancePolicy> {
  const res = await authorizedFetch(`${appConfig.apiBaseUrl}/hrms/attendance/settings/policies`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const body = await res.json();
  if (!res.ok || !body?.data) {
    throw new Error(body?.error?.message ?? `Failed to create policy: ${res.status}`);
  }
  return body.data;
}

export async function updateAttendancePolicyV1(
  id: string,
  payload: Partial<AttendancePolicy>,
): Promise<AttendancePolicy> {
  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/hrms/attendance/settings/policies/${id}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
  );
  const body = await res.json();
  if (!res.ok || !body?.data) {
    throw new Error(body?.error?.message ?? `Failed to update policy: ${res.status}`);
  }
  return body.data;
}

export async function rollbackAttendancePolicyVersion(id: string): Promise<AttendancePolicy> {
  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/hrms/attendance/settings/policies/${id}/rollback`,
    {
      method: 'POST',
    },
  );
  const body = await res.json();
  if (!res.ok || !body?.data) {
    throw new Error(body?.error?.message ?? `Failed to rollback policy: ${res.status}`);
  }
  return body.data;
}

/* ── 2b. Shift & Roster Settings ── */

export async function fetchShiftRosterSettings(): Promise<ShiftRosterSettings> {
  const res = await authorizedFetch(`${appConfig.apiBaseUrl}/hrms/attendance/settings/shifts`);
  const body = await res.json();
  if (!res.ok || !body?.data) {
    throw new Error(body?.error?.message ?? `Failed to fetch shift settings: ${res.status}`);
  }
  return body.data;
}

export async function updateShiftRosterSettings(
  payload: UpdateShiftRosterSettingsInput,
): Promise<ShiftRosterSettings> {
  const res = await authorizedFetch(`${appConfig.apiBaseUrl}/hrms/attendance/settings/shifts`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const body = await res.json();
  if (!res.ok || !body?.data) {
    throw new Error(body?.error?.message ?? `Failed to update shift settings: ${res.status}`);
  }
  return body.data;
}

export async function createCompanyShift(payload: CreateShiftInput): Promise<CompanyShiftTemplate> {
  const res = await authorizedFetch(`${appConfig.apiBaseUrl}/hrms/attendance/settings/shifts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const body = await res.json();
  if (!res.ok || !body?.data) {
    throw new Error(body?.error?.message ?? `Failed to create company shift: ${res.status}`);
  }
  return body.data;
}

export async function updateCompanyShift(
  id: string,
  payload: UpdateShiftInput,
): Promise<CompanyShiftTemplate> {
  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/hrms/attendance/settings/shifts/${id}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
  );
  const body = await res.json();
  if (!res.ok || !body?.data) {
    throw new Error(body?.error?.message ?? `Failed to update company shift: ${res.status}`);
  }
  return body.data;
}

export async function deleteCompanyShift(id: string): Promise<boolean> {
  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/hrms/attendance/settings/shifts/${id}`,
    {
      method: 'DELETE',
    },
  );
  const body = await res.json();
  if (!res.ok) {
    throw new Error(body?.error?.message ?? `Failed to delete company shift: ${res.status}`);
  }
  return true;
}

/* ── 3. Regularization Settings ── */

export async function fetchRegularizationSettings(): Promise<AttendanceRegularizationSettings> {
  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/hrms/attendance/settings/regularization`,
  );
  const body = await res.json();
  if (!res.ok || !body?.data) {
    throw new Error(
      body?.error?.message ?? `Failed to fetch regularization settings: ${res.status}`,
    );
  }
  return body.data;
}

export async function updateRegularizationSettings(
  payload: RegularizationSettingsInput,
): Promise<AttendanceRegularizationSettings> {
  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/hrms/attendance/settings/regularization`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
  );
  const body = await res.json();
  if (!res.ok || !body?.data) {
    throw new Error(
      body?.error?.message ?? `Failed to update regularization settings: ${res.status}`,
    );
  }
  return body.data;
}

/* ── 4. Capture & Devices ── */

export async function fetchAttendanceDevices(): Promise<AttendanceDevice[]> {
  const res = await authorizedFetch(`${appConfig.apiBaseUrl}/hrms/attendance/settings/devices`);
  const body = await res.json();
  if (!res.ok || !body?.data) {
    throw new Error(body?.error?.message ?? `Failed to fetch devices: ${res.status}`);
  }
  return body.data;
}

export async function registerAttendanceDevice(payload: DeviceInput): Promise<AttendanceDevice> {
  const res = await authorizedFetch(`${appConfig.apiBaseUrl}/hrms/attendance/settings/devices`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const body = await res.json();
  if (!res.ok || !body?.data) {
    throw new Error(body?.error?.message ?? `Failed to register device: ${res.status}`);
  }
  return body.data;
}

export async function updateAttendanceDevice(
  id: string,
  payload: Partial<DeviceInput>,
): Promise<AttendanceDevice> {
  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/hrms/attendance/settings/devices/${id}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
  );
  const body = await res.json();
  if (!res.ok || !body?.data) {
    throw new Error(body?.error?.message ?? `Failed to update device: ${res.status}`);
  }
  return body.data;
}

export async function testAttendanceDeviceConnection(id: string): Promise<DeviceTestResult> {
  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/hrms/attendance/settings/devices/${id}/test`,
    {
      method: 'POST',
    },
  );
  const body = await res.json();
  if (!res.ok || !body?.data) {
    throw new Error(body?.error?.message ?? `Failed to test device: ${res.status}`);
  }
  return body.data;
}

export async function fetchImportBatches(): Promise<AttendanceImportBatch[]> {
  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/hrms/attendance/settings/import/batches`,
  );
  const body = await res.json();
  if (!res.ok || !body?.data) {
    throw new Error(body?.error?.message ?? `Failed to fetch import batches: ${res.status}`);
  }
  return body.data;
}

export async function submitBulkImport(payload: BulkImportPayload): Promise<AttendanceImportBatch> {
  const res = await authorizedFetch(`${appConfig.apiBaseUrl}/hrms/attendance/settings/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const body = await res.json();
  if (!res.ok || !body?.data) {
    throw new Error(body?.error?.message ?? `Bulk import failed: ${res.status}`);
  }
  return body.data;
}

export async function rollbackImportBatch(id: string): Promise<void> {
  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/hrms/attendance/settings/import/batches/${id}/rollback`,
    {
      method: 'POST',
    },
  );
  if (!res.ok) {
    throw new Error(`Failed to rollback import batch: ${res.status}`);
  }
}

/* ── 5. Location & Security ── */

export async function fetchSecuritySettings(): Promise<AttendanceSecuritySettings> {
  const res = await authorizedFetch(`${appConfig.apiBaseUrl}/hrms/attendance/settings/security`);
  const body = await res.json();
  if (!res.ok || !body?.data) {
    throw new Error(body?.error?.message ?? `Failed to fetch security settings: ${res.status}`);
  }
  return body.data;
}

export async function updateSecuritySettings(
  payload: SecuritySettingsInput,
): Promise<AttendanceSecuritySettings> {
  const res = await authorizedFetch(`${appConfig.apiBaseUrl}/hrms/attendance/settings/security`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const body = await res.json();
  if (!res.ok || !body?.data) {
    throw new Error(body?.error?.message ?? `Failed to update security settings: ${res.status}`);
  }
  return body.data;
}

/* ── 6. Payroll & Locking ── */

export async function fetchPayrollSettings(): Promise<AttendancePayrollSettings> {
  const res = await authorizedFetch(`${appConfig.apiBaseUrl}/hrms/attendance/settings/payroll`);
  const body = await res.json();
  if (!res.ok || !body?.data) {
    throw new Error(body?.error?.message ?? `Failed to fetch payroll settings: ${res.status}`);
  }
  return body.data;
}

export async function updatePayrollSettings(
  payload: PayrollSettingsInput,
): Promise<AttendancePayrollSettings> {
  const res = await authorizedFetch(`${appConfig.apiBaseUrl}/hrms/attendance/settings/payroll`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const body = await res.json();
  if (!res.ok || !body?.data) {
    throw new Error(body?.error?.message ?? `Failed to update payroll settings: ${res.status}`);
  }
  return body.data;
}

export async function fetchAttendancePeriods(): Promise<AttendancePeriod[]> {
  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/hrms/attendance/settings/payroll/periods`,
  );
  const body = await res.json();
  if (!res.ok || !body?.data) {
    throw new Error(body?.error?.message ?? `Failed to fetch attendance periods: ${res.status}`);
  }
  return body.data;
}

export async function checkPeriodLockReadiness(periodCode: string): Promise<PeriodLockReadiness> {
  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/hrms/attendance/settings/payroll/periods/${encodeURIComponent(periodCode)}/readiness`,
  );
  const body = await res.json();
  if (!res.ok || !body?.data) {
    throw new Error(body?.error?.message ?? `Failed to check period readiness: ${res.status}`);
  }
  return body.data;
}

export async function lockAttendancePeriod(periodCode: string): Promise<AttendancePeriod> {
  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/hrms/attendance/settings/payroll/periods/${encodeURIComponent(periodCode)}/lock`,
    {
      method: 'POST',
    },
  );
  const body = await res.json();
  if (!res.ok || !body?.data) {
    throw new Error(body?.error?.message ?? `Failed to lock period: ${res.status}`);
  }
  return body.data;
}

export async function unlockAttendancePeriod(
  periodCode: string,
  reason: string,
): Promise<AttendancePeriod> {
  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/hrms/attendance/settings/payroll/periods/${encodeURIComponent(periodCode)}/unlock`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    },
  );
  const body = await res.json();
  if (!res.ok || !body?.data) {
    throw new Error(body?.error?.message ?? `Failed to unlock period: ${res.status}`);
  }
  return body.data;
}

export async function fetchPayrollHandoverBatches(): Promise<AttendancePayrollHandoverBatch[]> {
  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/hrms/attendance/settings/payroll/handover`,
  );
  const body = await res.json();
  if (!res.ok || !body?.data) {
    throw new Error(body?.error?.message ?? `Failed to fetch handover batches: ${res.status}`);
  }
  return body.data;
}

export async function generatePayrollHandover(payload: {
  periodCode: string;
  format: 'csv' | 'json';
}): Promise<{ batch: AttendancePayrollHandoverBatch; exportData: string }> {
  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/hrms/attendance/settings/payroll/handover/generate`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
  );
  const body = await res.json();
  if (!res.ok || !body?.data) {
    throw new Error(body?.error?.message ?? `Failed to generate payroll handover: ${res.status}`);
  }
  return body.data;
}

/* ── 7. Audit & History ── */

export async function fetchSettingsAuditLogs(
  params?: SettingsAuditFilter,
): Promise<{ items: AttendanceSettingsAuditLog[]; total: number }> {
  const query = new URLSearchParams();
  if (params?.category) query.set('category', params.category);
  if (params?.action) query.set('action', params.action);
  if (params?.page) query.set('page', String(params.page));
  if (params?.limit) query.set('limit', String(params.limit));

  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/hrms/attendance/settings/audit?${query.toString()}`,
  );
  const body = await res.json();
  if (!res.ok || !body?.data) {
    throw new Error(body?.error?.message ?? `Failed to fetch audit logs: ${res.status}`);
  }
  return { items: body.data, total: body.total ?? body.data.length };
}

/* ── 8. On-Duty (OD) Operational API V1.0 ── */

export async function fetchOnDutyTypes(): Promise<OnDutyTypeConfig[]> {
  const res = await authorizedFetch(`${appConfig.apiBaseUrl}/hrms/attendance/on-duty/types`);
  const body = await res.json();
  if (!res.ok || !body?.data) {
    throw new Error(body?.error?.message ?? `Failed to fetch OD types: ${res.status}`);
  }
  return body.data;
}

export async function fetchOnDutyWorkspace(
  filter: OnDutyFilterV1 = {},
): Promise<OnDutyQueryResultV1> {
  const query = new URLSearchParams();
  if (filter.startDate) query.set('startDate', filter.startDate);
  if (filter.endDate) query.set('endDate', filter.endDate);
  if (filter.approvalStatus) query.set('approvalStatus', filter.approvalStatus);
  if (filter.odTypeId) query.set('odTypeId', filter.odTypeId);
  if (filter.processingStatus) query.set('processingStatus', filter.processingStatus);
  if (filter.durationType) query.set('durationType', filter.durationType);
  if (filter.assignedTo) query.set('assignedTo', filter.assignedTo);
  if (filter.departmentId) query.set('departmentId', filter.departmentId);
  if (filter.locationId) query.set('locationId', filter.locationId);
  if (filter.submittedFrom) query.set('submittedFrom', filter.submittedFrom);
  if (filter.submittedTo) query.set('submittedTo', filter.submittedTo);
  if (filter.conflictStatus) query.set('conflictStatus', filter.conflictStatus);
  if (filter.source) query.set('source', filter.source);
  if (filter.employeeId) query.set('employeeId', filter.employeeId);
  if (filter.search) query.set('search', filter.search);
  if (filter.page) query.set('page', String(filter.page));
  if (filter.pageSize) query.set('pageSize', String(filter.pageSize));

  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/hrms/attendance/on-duty?${query.toString()}`,
  );
  const body = await res.json();
  if (!res.ok) {
    throw new Error(body?.error?.message ?? `Failed to fetch OD workspace: ${res.status}`);
  }

  // Handle both array response and wrapped workspace response
  if (Array.isArray(body.data)) {
    return {
      items: body.data,
      counters: body.counters ?? {
        pendingReview: 0,
        underReview: 0,
        awaitingInfo: 0,
        approvedToday: 0,
        processingIssues: 0,
        upcomingOd: 0,
      },
      totalCount: body.total ?? body.data.length,
      page: filter.page ?? 1,
      pageSize: filter.pageSize ?? 20,
      totalPages: Math.ceil((body.total ?? body.data.length) / (filter.pageSize ?? 20)) || 1,
    };
  }

  return (
    body.data ?? {
      items: [],
      counters: {
        pendingReview: 0,
        underReview: 0,
        awaitingInfo: 0,
        approvedToday: 0,
        processingIssues: 0,
        upcomingOd: 0,
      },
      totalCount: 0,
      page: 1,
      pageSize: 20,
      totalPages: 1,
    }
  );
}

export async function fetchOnDutyRequests(params?: {
  employeeId?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  departmentId?: string;
}): Promise<OnDutyRequestItem[]> {
  const query = new URLSearchParams();
  if (params?.employeeId) query.set('employeeId', params.employeeId);
  if (params?.status) query.set('status', params.status);
  if (params?.startDate) query.set('startDate', params.startDate);
  if (params?.endDate) query.set('endDate', params.endDate);
  if (params?.departmentId) query.set('departmentId', params.departmentId);

  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/hrms/attendance/on-duty?${query.toString()}`,
  );
  const body = await res.json();
  if (!res.ok) {
    throw new Error(body?.error?.message ?? `Failed to fetch OD requests: ${res.status}`);
  }
  return Array.isArray(body.data) ? body.data : (body.data?.items ?? []);
}

export async function fetchOnDutyDetails(id: string): Promise<OnDutyDetailV1> {
  const res = await authorizedFetch(`${appConfig.apiBaseUrl}/hrms/attendance/on-duty/${id}`);
  const body = await res.json();
  if (!res.ok || !body?.data) {
    throw new Error(body?.error?.message ?? `Failed to fetch OD details: ${res.status}`);
  }
  return body.data;
}

export async function fetchOnDutyRequestById(id: string): Promise<OnDutyRequestItem> {
  const res = await authorizedFetch(`${appConfig.apiBaseUrl}/hrms/attendance/on-duty/${id}`);
  const body = await res.json();
  if (!res.ok || !body?.data) {
    throw new Error(body?.error?.message ?? `Failed to fetch OD request: ${res.status}`);
  }
  return body.data;
}

export async function createOnDutyRequest(
  payload: CreateOnDutyRequestPayload,
  isDraft = false,
): Promise<OnDutyItemV1> {
  const url = `${appConfig.apiBaseUrl}/hrms/attendance/on-duty${isDraft ? '?draft=true' : ''}`;
  const res = await authorizedFetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const body = await res.json();
  if (!res.ok || !body?.data) {
    throw new Error(body?.error?.message ?? `Failed to create OD request: ${res.status}`);
  }
  return body.data;
}

export async function assignOnDutyReviewer(
  id: string,
  assignedTo: string,
  assignedRole?: string,
): Promise<OnDutyItemV1> {
  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/hrms/attendance/on-duty/${id}/assign`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assignedTo, assignedRole }),
    },
  );
  const body = await res.json();
  if (!res.ok || !body?.data) {
    throw new Error(body?.error?.message ?? `Failed to assign reviewer: ${res.status}`);
  }
  return body.data;
}

export async function startOnDutyReview(id: string): Promise<OnDutyItemV1> {
  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/hrms/attendance/on-duty/${id}/start-review`,
    { method: 'POST' },
  );
  const body = await res.json();
  if (!res.ok || !body?.data) {
    throw new Error(body?.error?.message ?? `Failed to start review: ${res.status}`);
  }
  return body.data;
}

export async function requestOnDutyClarification(id: string, notes: string): Promise<OnDutyItemV1> {
  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/hrms/attendance/on-duty/${id}/request-info`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes }),
    },
  );
  const body = await res.json();
  if (!res.ok || !body?.data) {
    throw new Error(body?.error?.message ?? `Failed to request info: ${res.status}`);
  }
  return body.data;
}

export async function provideOnDutyClarification(
  id: string,
  response: string,
): Promise<OnDutyItemV1> {
  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/hrms/attendance/on-duty/${id}/clarify`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ response }),
    },
  );
  const body = await res.json();
  if (!res.ok || !body?.data) {
    throw new Error(body?.error?.message ?? `Failed to submit clarification: ${res.status}`);
  }
  return body.data;
}

export async function reviewOnDutyDecision(
  id: string,
  decision: ReviewOnDutyDecisionInput,
): Promise<OnDutyItemV1> {
  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/hrms/attendance/on-duty/${id}/decision`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(decision),
    },
  );
  const body = await res.json();
  if (!res.ok || !body?.data) {
    throw new Error(body?.error?.message ?? `Failed to record OD decision: ${res.status}`);
  }
  return body.data;
}

export async function submitOnDutyDraft(id: string): Promise<OnDutyItemV1> {
  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/hrms/attendance/on-duty/${id}/submit`,
    { method: 'POST' },
  );
  const body = await res.json();
  if (!res.ok || !body?.data) {
    throw new Error(body?.error?.message ?? `Failed to submit OD draft: ${res.status}`);
  }
  return body.data;
}

export async function withdrawOnDutyRequest(id: string, reason?: string): Promise<OnDutyItemV1> {
  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/hrms/attendance/on-duty/${id}/withdraw`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    },
  );
  const body = await res.json();
  if (!res.ok || !body?.data) {
    throw new Error(body?.error?.message ?? `Failed to withdraw OD request: ${res.status}`);
  }
  return body.data;
}

export async function cancelOnDutyRequest(id: string, reason?: string): Promise<OnDutyItemV1> {
  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/hrms/attendance/on-duty/${id}/cancel`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    },
  );
  const body = await res.json();
  if (!res.ok || !body?.data) {
    throw new Error(body?.error?.message ?? `Failed to cancel OD request: ${res.status}`);
  }
  return body.data;
}

export async function reviewOnDutyRequest(
  id: string,
  payload: ReviewOnDutyRequestPayload,
): Promise<OnDutyItemV1> {
  return reviewOnDutyDecision(id, {
    action: payload.action === 'approve' ? 'approved' : 'rejected',
    reason: payload.decisionReason,
  });
}

export async function previewBulkOnDutyApproval(
  requestIds: string[],
): Promise<BulkOnDutyEligibilityPreview> {
  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/hrms/attendance/on-duty/bulk-preview`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestIds }),
    },
  );
  const body = await res.json();
  if (!res.ok || !body?.data) {
    throw new Error(body?.error?.message ?? `Failed to preview bulk approval: ${res.status}`);
  }
  return body.data;
}

export async function executeBulkOnDutyAction(
  payload: BulkOnDutyActionInput,
): Promise<BulkOnDutyActionResult> {
  const res = await authorizedFetch(`${appConfig.apiBaseUrl}/hrms/attendance/on-duty/bulk`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const body = await res.json();
  if (!res.ok || !body?.data) {
    throw new Error(body?.error?.message ?? `Failed to execute bulk action: ${res.status}`);
  }
  return body.data;
}

export async function exportOnDutyCsvBlob(filter: OnDutyExportFilter): Promise<Blob> {
  const res = await authorizedFetch(`${appConfig.apiBaseUrl}/hrms/attendance/on-duty/export`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(filter),
  });
  if (!res.ok) {
    const errorText = await res.text().catch(() => '');
    throw new Error(`Export failed (${res.status}): ${errorText}`);
  }
  return res.blob();
}

export async function fetchPunchLogs(params: PunchLogFilter): Promise<PunchLogResult> {
  const query = new URLSearchParams();
  if (params.date) query.set('date', params.date);
  if (params.dateFrom) query.set('dateFrom', params.dateFrom);
  if (params.dateTo) query.set('dateTo', params.dateTo);
  if (params.dateInterpretation) query.set('dateInterpretation', params.dateInterpretation);
  if (params.employeeId) query.set('employeeId', params.employeeId);
  if (params.source) query.set('source', params.source);
  if (params.punchType) query.set('punchType', params.punchType);
  if (params.validationStatus) query.set('validationStatus', params.validationStatus);
  if (params.processingState) query.set('processingState', params.processingState);
  if (params.departmentId) query.set('departmentId', params.departmentId);
  if (params.locationId) query.set('locationId', params.locationId);
  if (params.search) query.set('search', params.search);
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));

  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/hrms/attendance/punch-logs?${query.toString()}`,
  );
  const body = await res.json();
  if (!res.ok) {
    throw new Error(body?.error?.message ?? `Failed to fetch punch logs: ${res.status}`);
  }
  return {
    punches: body.data ?? [],
    counters: body.counters ?? {
      total: 0,
      valid: 0,
      needsReview: 0,
      duplicates: 0,
      unmatched: 0,
      processingFailed: 0,
    },
    total: body.total ?? 0,
  };
}

export async function fetchPunchDetails(id: string): Promise<PunchEventDetail> {
  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/hrms/attendance/punch-logs/${encodeURIComponent(id)}`,
  );
  const body = await res.json();
  if (!res.ok || !body?.data) {
    throw new Error(body?.error?.message ?? `Failed to fetch punch details: ${res.status}`);
  }
  return body.data;
}

export async function updatePunchInvestigation(
  payload: UpdatePunchInvestigationInput,
): Promise<PunchLogItem> {
  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/hrms/attendance/punch-logs/investigation`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
  );
  const body = await res.json();
  if (!res.ok || !body?.data) {
    throw new Error(body?.error?.message ?? `Failed to update investigation: ${res.status}`);
  }
  return body.data;
}

export async function retryPunchProcessing(
  punchIds: string[],
): Promise<{ retriedCount: number; message: string }> {
  const res = await authorizedFetch(`${appConfig.apiBaseUrl}/hrms/attendance/punch-logs/retry`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ punchIds }),
  });
  const body = await res.json();
  if (!res.ok || !body?.data) {
    throw new Error(body?.error?.message ?? `Failed to retry punch processing: ${res.status}`);
  }
  return body.data;
}

export async function bulkPunchAction(
  payload: BulkPunchActionInput,
): Promise<{ affectedCount: number; message: string }> {
  const res = await authorizedFetch(`${appConfig.apiBaseUrl}/hrms/attendance/punch-logs/bulk`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const body = await res.json();
  if (!res.ok || !body?.data) {
    throw new Error(body?.error?.message ?? `Failed to execute bulk punch action: ${res.status}`);
  }
  return body.data;
}

export async function exportPunchLogsCsv(
  params: PunchLogFilter,
  selectedIds?: string[],
): Promise<Blob> {
  const query = new URLSearchParams();
  if (params.date) query.set('date', params.date);
  if (params.dateFrom) query.set('dateFrom', params.dateFrom);
  if (params.dateTo) query.set('dateTo', params.dateTo);
  if (params.dateInterpretation) query.set('dateInterpretation', params.dateInterpretation);
  if (params.employeeId) query.set('employeeId', params.employeeId);
  if (params.source) query.set('source', params.source);
  if (params.punchType) query.set('punchType', params.punchType);
  if (params.validationStatus) query.set('validationStatus', params.validationStatus);
  if (params.processingState) query.set('processingState', params.processingState);
  if (params.departmentId) query.set('departmentId', params.departmentId);
  if (params.locationId) query.set('locationId', params.locationId);
  if (params.search) query.set('search', params.search);
  if (selectedIds && selectedIds.length > 0) query.set('selectedIds', selectedIds.join(','));

  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/hrms/attendance/punch-logs/export?${query.toString()}`,
  );
  if (!res.ok) {
    throw new Error(`Failed to export punch logs: ${res.status}`);
  }
  return res.blob();
}

// ============================================================================
// Attendance Monthly Summary V1.0 API Functions
// ============================================================================

export async function fetchMonthlySummaryWorkspace(
  filter: MonthlySummaryFilter,
): Promise<MonthlySummaryQueryResult> {
  const query = new URLSearchParams();
  query.set('month', filter.month);
  if (filter.search) query.set('search', filter.search);
  if (filter.departmentId) query.set('departmentId', filter.departmentId);
  if (filter.payrollReadiness) query.set('payrollReadiness', filter.payrollReadiness);
  if (filter.reviewState) query.set('reviewState', filter.reviewState);
  if (filter.isLocked !== undefined) query.set('isLocked', String(filter.isLocked));
  if (filter.hasExceptions) query.set('hasExceptions', 'true');
  if (filter.hasPendingCorrections) query.set('hasPendingCorrections', 'true');
  if (filter.hasProcessingIssues) query.set('hasProcessingIssues', 'true');
  if (filter.counterFilter) query.set('counterFilter', filter.counterFilter);
  if (filter.page) query.set('page', String(filter.page));
  if (filter.pageSize) query.set('pageSize', String(filter.pageSize));

  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/hrms/attendance/monthly-summary/workspace?${query.toString()}`,
  );
  const body = await res.json();
  if (!res.ok || !body?.data) {
    throw new Error(body?.error?.message ?? `Failed to fetch monthly summary: ${res.status}`);
  }
  return body.data;
}

export async function fetchMonthlySummaryById(id: string): Promise<MonthlySummaryRow> {
  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/hrms/attendance/monthly-summary/${encodeURIComponent(id)}`,
  );
  const body = await res.json();
  if (!res.ok || !body?.data) {
    throw new Error(body?.error?.message ?? `Failed to fetch summary detail: ${res.status}`);
  }
  return body.data;
}

export async function fetchMonthlySummaryDays(id: string): Promise<MonthlySummaryDailyRecord[]> {
  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/hrms/attendance/monthly-summary/${encodeURIComponent(id)}/days`,
  );
  const body = await res.json();
  if (!res.ok || !body?.data) {
    throw new Error(body?.error?.message ?? `Failed to fetch daily breakdown: ${res.status}`);
  }
  return body.data;
}

export async function fetchMonthlySummaryReadiness(
  id: string,
): Promise<MonthlySummaryReadinessReport> {
  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/hrms/attendance/monthly-summary/${encodeURIComponent(id)}/readiness`,
  );
  const body = await res.json();
  if (!res.ok || !body?.data) {
    throw new Error(body?.error?.message ?? `Failed to fetch readiness evaluation: ${res.status}`);
  }
  return body.data;
}

export async function fetchMonthlySummaryHistory(
  id: string,
): Promise<MonthlySummaryReviewHistoryItem[]> {
  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/hrms/attendance/monthly-summary/${encodeURIComponent(id)}/history`,
  );
  const body = await res.json();
  if (!res.ok || !body?.data) {
    throw new Error(body?.error?.message ?? `Failed to fetch review history: ${res.status}`);
  }
  return body.data;
}

export async function assignMonthlySummaryReviewer(
  id: string,
  reviewerId: string,
): Promise<MonthlySummaryRow> {
  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/hrms/attendance/monthly-summary/${encodeURIComponent(id)}/assign`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reviewerId }),
    },
  );
  const body = await res.json();
  if (!res.ok || !body?.data) {
    throw new Error(body?.error?.message ?? `Failed to assign reviewer: ${res.status}`);
  }
  return body.data;
}

export async function startMonthlySummaryReview(id: string): Promise<MonthlySummaryRow> {
  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/hrms/attendance/monthly-summary/${encodeURIComponent(id)}/start-review`,
    {
      method: 'POST',
    },
  );
  const body = await res.json();
  if (!res.ok || !body?.data) {
    throw new Error(body?.error?.message ?? `Failed to start review: ${res.status}`);
  }
  return body.data;
}

export async function requestMonthlySummaryCorrection(
  id: string,
  notes: string,
): Promise<MonthlySummaryRow> {
  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/hrms/attendance/monthly-summary/${encodeURIComponent(id)}/request-correction`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes }),
    },
  );
  const body = await res.json();
  if (!res.ok || !body?.data) {
    throw new Error(body?.error?.message ?? `Failed to request correction: ${res.status}`);
  }
  return body.data;
}

export async function markMonthlySummaryReviewed(
  id: string,
  notes?: string,
): Promise<MonthlySummaryRow> {
  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/hrms/attendance/monthly-summary/${encodeURIComponent(id)}/mark-reviewed`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes }),
    },
  );
  const body = await res.json();
  if (!res.ok || !body?.data) {
    throw new Error(body?.error?.message ?? `Failed to mark reviewed: ${res.status}`);
  }
  return body.data;
}

export async function reopenMonthlySummaryReview(
  id: string,
  reason: string,
): Promise<MonthlySummaryRow> {
  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/hrms/attendance/monthly-summary/${encodeURIComponent(id)}/reopen`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    },
  );
  const body = await res.json();
  if (!res.ok || !body?.data) {
    throw new Error(body?.error?.message ?? `Failed to reopen review: ${res.status}`);
  }
  return body.data;
}

export async function recalculateMonthlySummary(id: string): Promise<MonthlySummaryRow> {
  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/hrms/attendance/monthly-summary/${encodeURIComponent(id)}/recalculate`,
    {
      method: 'POST',
    },
  );
  const body = await res.json();
  if (!res.ok || !body?.data) {
    throw new Error(body?.error?.message ?? `Failed to recalculate summary: ${res.status}`);
  }
  return body.data;
}

export async function previewMonthlySummaryBulkAction(
  action: string,
  summaryIds: string[],
): Promise<MonthlySummaryBulkPreviewResult> {
  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/hrms/attendance/monthly-summary/bulk-preview`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, summaryIds }),
    },
  );
  const body = await res.json();
  if (!res.ok || !body?.data) {
    throw new Error(body?.error?.message ?? `Failed to preview bulk action: ${res.status}`);
  }
  return body.data;
}

export async function executeMonthlySummaryBulkAction(
  payload: MonthlySummaryBulkActionInput,
): Promise<MonthlySummaryBulkActionResult> {
  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/hrms/attendance/monthly-summary/bulk`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
  );
  const body = await res.json();
  if (!res.ok || !body?.data) {
    throw new Error(body?.error?.message ?? `Failed to execute bulk action: ${res.status}`);
  }
  return body.data;
}

export async function exportMonthlySummaryCsv(input: MonthlySummaryExportInput): Promise<Blob> {
  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/hrms/attendance/monthly-summary/export`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    },
  );
  if (!res.ok) {
    throw new Error(`Failed to export monthly summary: ${res.status}`);
  }
  return res.blob();
}
