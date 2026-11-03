import { appConfig } from '../../../../app/config/env';
import { authorizedFetch } from '../../../../platform/auth';
import type {
  ApplyOnBehalfDto,
  BalanceAdjustmentDto,
  BalanceRegister,
  EmployeeLedger,
  HolidayCalendarView,
  LeaveReport,
  LeaveReportId,
  LeaveReportQuery,
  TeamCalendar,
  YearEndView,
  ApprovalQueueItem,
  ApprovalStats,
  EmployeeLeaveWorkspace,
  LeaveOverview,
  LeaveRequestDetail,
  LeaveRequestList,
  LeaveRequestQuery,
} from '../types/leaveOperations.types';

const BASE = () => `${appConfig.apiBaseUrl}/hrms/leave`;

async function call<T>(path: string, fallbackMessage: string, init?: RequestInit): Promise<T> {
  const res = await authorizedFetch(`${BASE()}${path}`, {
    ...init,
    headers: init?.body ? { 'Content-Type': 'application/json' } : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error?.message || fallbackMessage);
  return json.data as T;
}

const post = (body?: unknown): RequestInit => ({
  method: 'POST',
  body: body === undefined ? undefined : JSON.stringify(body),
});

function toQuery(params: Record<string, unknown>): string {
  const q = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '' || value === false) continue;
    q.set(key, String(value));
  }
  const s = q.toString();
  return s ? `?${s}` : '';
}

export const leaveOperationsApi = {
  overview: (params: { date?: string; departmentId?: string; locationId?: string } = {}) =>
    call<LeaveOverview>(`/overview${toQuery(params)}`, 'Failed to load leave overview'),

  requests: (query: LeaveRequestQuery = {}) =>
    call<LeaveRequestList>(`/requests${toQuery({ ...query })}`, 'Failed to load leave requests'),
  request: (id: string) =>
    call<LeaveRequestDetail>(`/requests/${id}`, 'Failed to load leave request'),
  applyOnBehalf: (dto: ApplyOnBehalfDto) =>
    call<{ id: string; status: string; warnings: string[] }>(
      '/requests',
      'Failed to apply leave',
      post(dto),
    ),
  cancel: (id: string, reason: string) =>
    call<{ id: string; status: string }>(
      `/requests/${id}/cancel`,
      'Failed to cancel leave',
      post({ reason }),
    ),
  employeeWorkspace: (employeeId: string) =>
    call<EmployeeLeaveWorkspace>(
      `/employees/${employeeId}/workspace`,
      'Failed to load employee leave balances',
    ),

  queue: (scope: 'mine' | 'all') =>
    call<ApprovalQueueItem[]>(`/approvals?scope=${scope}`, 'Failed to load approval queue'),
  approvalStats: () => call<ApprovalStats>('/approval-stats', 'Failed to load approval stats'),
  approve: (approvalId: string, comment?: string) =>
    call<{ status: string }>(
      `/approvals/${approvalId}/approve`,
      'Failed to approve',
      post({ comment }),
    ),
  reject: (approvalId: string, comment: string) =>
    call<{ status: string }>(
      `/approvals/${approvalId}/reject`,
      'Failed to reject',
      post({ comment }),
    ),
  bulkApprove: (approvalIds: string[], comment?: string) =>
    call<{ approved: number; results: Array<{ approvalId: string; ok: boolean; error?: string }> }>(
      '/approvals/bulk-approve',
      'Failed to approve',
      post({ approvalIds, comment }),
    ),

  calendar: (params: {
    from: string;
    to: string;
    departmentId?: string;
    locationId?: string;
    leaveTypeId?: string;
  }) => call<TeamCalendar>(`/calendar${toQuery(params)}`, 'Failed to load team calendar'),

  balances: (params: {
    cycleStart?: string;
    departmentId?: string;
    locationId?: string;
    search?: string;
    negativeOnly?: boolean;
    page?: number;
    pageSize?: number;
  }) => call<BalanceRegister>(`/balances${toQuery(params)}`, 'Failed to load leave balances'),
  ledger: (employeeId: string, params: { cycleStart?: string; leaveTypeId?: string } = {}) =>
    call<EmployeeLedger>(
      `/balances/${employeeId}/ledger${toQuery(params)}`,
      'Failed to load the balance ledger',
    ),
  adjustBalance: (dto: BalanceAdjustmentDto) =>
    call<{ balanceId: string; days: number }>(
      '/balances/adjustments',
      'Failed to adjust the balance',
      post(dto),
    ),

  holidayCalendar: (params: { year?: number; locationId?: string } = {}) =>
    call<HolidayCalendarView>(
      `/holiday-calendar${toQuery(params)}`,
      'Failed to load the holiday calendar',
    ),

  yearEnd: (cycleStart?: string) =>
    call<YearEndView>(`/year-end${toQuery({ cycleStart })}`, 'Failed to load year-end data'),
  closeYear: (cycleStart: string) =>
    call<{
      runId: string;
      balances: number;
      encashed: number;
      carriedForward: number;
      lapsed: number;
    }>('/year-end/close', 'Failed to close the leave year', post({ cycleStart })),

  report: (reportId: LeaveReportId, query: LeaveReportQuery = {}) =>
    call<LeaveReport>(`/reports/${reportId}${toQuery({ ...query })}`, 'Failed to load the report'),

  /** Downloads the report as CSV through the authorised session. */
  downloadReportCsv: async (reportId: LeaveReportId, query: LeaveReportQuery = {}) => {
    const res = await authorizedFetch(
      `${BASE()}/reports/${reportId}${toQuery({ ...query, format: 'csv' })}`,
    );
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      throw new Error(json.error?.message || 'Failed to export the report');
    }
    const name =
      /filename="([^"]+)"/.exec(res.headers.get('Content-Disposition') ?? '')?.[1] ??
      `leave-${reportId}.csv`;
    const url = URL.createObjectURL(await res.blob());
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    link.click();
    URL.revokeObjectURL(url);
  },
};
