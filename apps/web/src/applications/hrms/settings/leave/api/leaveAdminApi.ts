import { appConfig } from '../../../../../app/config/env';
import { authorizedFetch } from '../../../../../platform/auth';
import type {
  AccrualRule,
  AccrualRuleRow,
  ApprovalQueueItem,
  ApprovalWorkflowDto,
  ApprovalWorkflowItem,
  HolidayCalendarDetail,
  HolidayCalendarDto,
  HolidayCalendarItem,
  HolidayImportResult,
  HolidayType,
  RestrictionDto,
  RestrictionRuleItem,
  YearEndPreview,
  YearEndRun,
} from '../types/leaveAdmin.types';

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

const send = (method: string, body?: unknown): RequestInit => ({
  method,
  body: body === undefined ? undefined : JSON.stringify(body),
});

// ── Holidays ──────────────────────────────────────────────────────────────────

export const holidaysApi = {
  list: (year?: number) =>
    call<HolidayCalendarItem[]>(
      `/holidays/calendars${year ? `?year=${year}` : ''}`,
      'Failed to load holiday calendars',
    ),
  get: (id: string) =>
    call<HolidayCalendarDetail>(`/holidays/calendars/${id}`, 'Failed to load calendar'),
  create: (dto: HolidayCalendarDto) =>
    call<HolidayCalendarDetail>(
      '/holidays/calendars',
      'Failed to create calendar',
      send('POST', dto),
    ),
  update: (id: string, dto: Partial<HolidayCalendarDto>) =>
    call<HolidayCalendarDetail>(
      `/holidays/calendars/${id}`,
      'Failed to update calendar',
      send('PUT', dto),
    ),
  remove: (id: string) =>
    call<{ deleted: boolean }>(
      `/holidays/calendars/${id}`,
      'Failed to delete calendar',
      send('DELETE'),
    ),
  publish: (id: string) =>
    call<HolidayCalendarDetail>(
      `/holidays/calendars/${id}/publish`,
      'Failed to publish calendar',
      send('POST'),
    ),
  addHoliday: (id: string, dto: { date: string; name: string; type: HolidayType }) =>
    call<HolidayCalendarDetail>(
      `/holidays/calendars/${id}/holidays`,
      'Failed to add holiday',
      send('POST', dto),
    ),
  updateHoliday: (holidayId: string, dto: { date?: string; name?: string; type?: HolidayType }) =>
    call<HolidayCalendarDetail>(
      `/holidays/${holidayId}`,
      'Failed to update holiday',
      send('PUT', dto),
    ),
  removeHoliday: (holidayId: string) =>
    call<HolidayCalendarDetail>(
      `/holidays/${holidayId}`,
      'Failed to delete holiday',
      send('DELETE'),
    ),
  copyFrom: (id: string, sourceCalendarId: string) =>
    call<{ copied: number; skipped: number; calendar: HolidayCalendarDetail }>(
      `/holidays/calendars/${id}/copy`,
      'Failed to copy holidays',
      send('POST', { sourceCalendarId }),
    ),
  importCsv: (id: string, csv: string) =>
    call<HolidayImportResult>(
      `/holidays/calendars/${id}/import`,
      'Failed to import holidays',
      send('POST', { csv }),
    ),
};

// ── Approval workflows & queue ────────────────────────────────────────────────

export const workflowsApi = {
  list: () => call<ApprovalWorkflowItem[]>('/workflows', 'Failed to load approval workflows'),
  create: (dto: ApprovalWorkflowDto) =>
    call<ApprovalWorkflowItem>('/workflows', 'Failed to create workflow', send('POST', dto)),
  update: (id: string, dto: Partial<ApprovalWorkflowDto>) =>
    call<ApprovalWorkflowItem>(`/workflows/${id}`, 'Failed to update workflow', send('PUT', dto)),
  queue: (scope: 'mine' | 'all') =>
    call<ApprovalQueueItem[]>(`/approvals?scope=${scope}`, 'Failed to load approval queue'),
  approve: (approvalId: string, comment?: string) =>
    call<{ status: string }>(
      `/approvals/${approvalId}/approve`,
      'Failed to approve',
      send('POST', { comment }),
    ),
  reject: (approvalId: string, comment: string) =>
    call<{ status: string }>(
      `/approvals/${approvalId}/reject`,
      'Failed to reject',
      send('POST', { comment }),
    ),
};

// ── Restrictions ──────────────────────────────────────────────────────────────

export const restrictionsApi = {
  list: () => call<RestrictionRuleItem[]>('/restrictions', 'Failed to load restriction rules'),
  create: (dto: RestrictionDto) =>
    call<RestrictionRuleItem>('/restrictions', 'Failed to create rule', send('POST', dto)),
  update: (ruleKey: string, dto: Partial<RestrictionDto>) =>
    call<RestrictionRuleItem>(
      `/restrictions/${ruleKey}`,
      'Failed to update rule',
      send('PUT', dto),
    ),
};

// ── Accrual & year-end ────────────────────────────────────────────────────────

export const accrualApi = {
  rules: () => call<AccrualRuleRow[]>('/accrual/rules', 'Failed to load accrual rules'),
  saveRule: (leaveTypeId: string, dto: Partial<AccrualRule>) =>
    call<AccrualRule>(
      `/accrual/rules/${leaveTypeId}`,
      'Failed to save accrual rule',
      send('PUT', dto),
    ),
  preview: (cycleStart: string) =>
    call<YearEndPreview>(
      `/accrual/year-end/preview?cycleStart=${encodeURIComponent(cycleStart)}`,
      'Failed to preview year-end',
    ),
  commit: (cycleStart: string) =>
    call<{
      runId: string;
      balances: number;
      encashed: number;
      carriedForward: number;
      lapsed: number;
    }>('/accrual/year-end/commit', 'Failed to close the leave year', send('POST', { cycleStart })),
  runs: () => call<YearEndRun[]>('/accrual/year-end/runs', 'Failed to load year-end runs'),
};
