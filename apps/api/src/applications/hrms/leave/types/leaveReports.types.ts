export type LeaveReportId =
  'utilisation' | 'lop' | 'liability' | 'absenteeism' | 'approval_sla' | 'audit';

export interface LeaveReportColumn {
  key: string;
  label: string;
  /** Right-aligned and summed by spreadsheets; string columns are left-aligned. */
  numeric: boolean;
}

export type LeaveReportRow = Record<string, string | number | null>;

export interface LeaveReport {
  reportId: LeaveReportId;
  title: string;
  description: string;
  range: { from: string; to: string };
  columns: LeaveReportColumn[];
  rows: LeaveReportRow[];
  summary: Array<{ label: string; value: string | number }>;
  /** True when the row cap cut the result (audit trail only). */
  truncated: boolean;
  generatedAt: string;
}
