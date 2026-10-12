import { appConfig } from '../../../../app/config/env';
import { authorizedFetch } from '../../../../platform/auth';
import type {
  ReportDefinition,
  ReportId,
  ReportPreviewResult,
  SavedReportConfiguration,
  CreateSavedReportInput,
  ReportGenerationHistoryItem,
  ReportSortingOption,
  ReportAnalyticsResult,
} from '../types/attendanceReports.types';

export async function fetchReportCatalog(): Promise<ReportDefinition[]> {
  const res = await authorizedFetch(`${appConfig.apiBaseUrl}/hrms/attendance/reports/catalog`);
  const body = await res.json();
  if (!res.ok || !body?.data) {
    throw new Error(body?.error?.message ?? `Failed to fetch report catalog: ${res.status}`);
  }
  return body.data;
}

export async function fetchReportAnalytics(
  reportId: ReportId,
  filters: Record<string, unknown> = {},
): Promise<ReportAnalyticsResult> {
  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/hrms/attendance/reports/${encodeURIComponent(reportId)}/analytics`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filters }),
    },
  );
  const body = await res.json();
  if (!res.ok || !body?.data) {
    throw new Error(body?.error?.message ?? `Failed to fetch report analytics: ${res.status}`);
  }
  return body.data;
}

export async function fetchReportPreview(
  reportId: ReportId,
  options: {
    filters: Record<string, unknown>;
    sorting?: ReportSortingOption;
    pagination?: { page: number; pageSize: number };
    selectedColumns?: string[];
  },
): Promise<ReportPreviewResult> {
  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/hrms/attendance/reports/${encodeURIComponent(reportId)}/preview`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options),
    },
  );
  const body = await res.json();
  if (!res.ok || !body?.data) {
    throw new Error(body?.error?.message ?? `Failed to preview report: ${res.status}`);
  }
  return body.data;
}

export async function downloadReportExport(
  reportId: ReportId,
  input: {
    format: 'csv' | 'xlsx' | 'pdf';
    filters: Record<string, unknown>;
    sorting?: ReportSortingOption;
    selectedColumns?: string[];
    includeAnalytics?: boolean;
  },
): Promise<void> {
  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/hrms/attendance/reports/${encodeURIComponent(reportId)}/export`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    },
  );

  if (!res.ok) {
    let msg = `Export failed with status ${res.status}`;
    try {
      const errBody = await res.json();
      if (errBody?.error?.message) msg = errBody.error.message;
    } catch {
      // ignore
    }
    throw new Error(msg);
  }

  const blob = await res.blob();
  const disposition = res.headers.get('Content-Disposition');
  let filename = `attendance_${reportId.toLowerCase()}_export.${input.format === 'xlsx' ? 'xls' : input.format}`;
  if (disposition && disposition.includes('filename=')) {
    const match = disposition.match(/filename="?([^"]+)"?/);
    if (match?.[1]) filename = match[1];
  }

  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

export async function fetchSavedReports(reportId?: ReportId): Promise<SavedReportConfiguration[]> {
  const query = reportId ? `?reportId=${encodeURIComponent(reportId)}` : '';
  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/hrms/attendance/reports/saved${query}`,
  );
  const body = await res.json();
  if (!res.ok || !body?.data) {
    throw new Error(body?.error?.message ?? `Failed to fetch saved reports: ${res.status}`);
  }
  return body.data;
}

export async function createSavedReport(
  input: CreateSavedReportInput,
): Promise<SavedReportConfiguration> {
  const res = await authorizedFetch(`${appConfig.apiBaseUrl}/hrms/attendance/reports/saved`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const body = await res.json();
  if (!res.ok || !body?.data) {
    throw new Error(body?.error?.message ?? `Failed to save configuration: ${res.status}`);
  }
  return body.data;
}

export async function deleteSavedReport(id: string): Promise<void> {
  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/hrms/attendance/reports/saved/${encodeURIComponent(id)}`,
    {
      method: 'DELETE',
    },
  );
  if (!res.ok) {
    throw new Error(`Failed to delete saved report: ${res.status}`);
  }
}

export async function fetchReportHistory(): Promise<ReportGenerationHistoryItem[]> {
  const res = await authorizedFetch(`${appConfig.apiBaseUrl}/hrms/attendance/reports/history`);
  const body = await res.json();
  if (!res.ok || !body?.data) {
    throw new Error(body?.error?.message ?? `Failed to fetch report history: ${res.status}`);
  }
  return body.data;
}

export async function downloadHistoryFile(historyId: string): Promise<void> {
  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/hrms/attendance/reports/history/${encodeURIComponent(historyId)}/download`,
  );
  if (!res.ok) {
    let msg = `Download failed with status ${res.status}`;
    try {
      const errBody = await res.json();
      if (errBody?.error?.message) msg = errBody.error.message;
    } catch {
      // ignore
    }
    throw new Error(msg);
  }

  const blob = await res.blob();
  const disposition = res.headers.get('Content-Disposition');
  let filename = `report_download_${historyId.slice(0, 8)}`;
  if (disposition && disposition.includes('filename=')) {
    const match = disposition.match(/filename="?([^"]+)"?/);
    if (match?.[1]) filename = match[1];
  }

  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}
