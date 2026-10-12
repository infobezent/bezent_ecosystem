export type ReportId =
  | 'R01'
  | 'R02'
  | 'R03'
  | 'R04'
  | 'R05'
  | 'R06'
  | 'R07'
  | 'R08'
  | 'R09'
  | 'R10'
  | 'R11'
  | 'R12'
  | 'R13'
  | 'R14'
  | 'R15';

export type ReportCategory =
  | 'daily_operations'
  | 'monthly_registers'
  | 'trends_analytics'
  | 'exceptions_compliance'
  | 'operational_workflows'
  | 'payroll_handover'
  | 'audit_security';

export type ReportColumnType =
  'string' | 'number' | 'date' | 'time' | 'status' | 'badge' | 'currency';

export interface ReportColumnDefinition {
  id: string;
  label: string;
  type: ReportColumnType;
  align?: 'left' | 'center' | 'right';
  sensitive?: boolean;
  width?: number;
  defaultVisible?: boolean;
}

export type ReportFilterType = 'date' | 'month' | 'date_range' | 'select' | 'text' | 'number';

export interface ReportFilterOption {
  label: string;
  value: string;
}

export interface ReportFilterDefinition {
  id: string;
  label: string;
  type: ReportFilterType;
  options?: ReportFilterOption[];
  defaultValue?: unknown;
  placeholder?: string;
  required?: boolean;
}

export interface ReportSortingOption {
  column: string;
  direction: 'asc' | 'desc';
}

export interface ReportDefinition {
  id: ReportId;
  code: string;
  name: string;
  category: ReportCategory;
  categoryLabel: string;
  description: string;
  authoritativeSource: string;
  columns: ReportColumnDefinition[];
  allowedFilters: ReportFilterDefinition[];
  defaultSorting: ReportSortingOption;
  requiredPermission: string;
  sensitiveClassification: 'standard' | 'sensitive' | 'audit_restricted';
  supportedExportFormats: Array<'csv' | 'xlsx' | 'pdf'>;
  limitations?: string[];
}

export interface ReportQueryOptions {
  filters: Record<string, unknown>;
  sorting?: ReportSortingOption;
  pagination?: {
    page: number;
    pageSize: number;
  };
  selectedColumns?: string[];
}

export interface ReportPreviewResult {
  reportId: ReportId;
  reportName: string;
  category: ReportCategory;
  appliedFilters: Record<string, unknown>;
  columns: ReportColumnDefinition[];
  rows: Record<string, unknown>[];
  totalRows: number;
  page: number;
  pageSize: number;
  generatedAt: string;
  timezone: string;
  reportingCutoff?: string;
  sourceVersion?: string;
  limitations?: string[];
}

export interface SavedReportConfiguration {
  id: string;
  tenantId: string;
  companyId: string;
  ownerUserId: string;
  reportId: ReportId;
  configurationName: string;
  filters: Record<string, unknown>;
  selectedColumns?: string[];
  sorting?: ReportSortingOption;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSavedReportInput {
  reportId: ReportId;
  configurationName: string;
  filters: Record<string, unknown>;
  selectedColumns?: string[];
  sorting?: ReportSortingOption;
}

export interface UpdateSavedReportInput {
  configurationName?: string;
  filters?: Record<string, unknown>;
  selectedColumns?: string[];
  sorting?: ReportSortingOption;
}

export interface ReportGenerationHistoryItem {
  id: string;
  tenantId: string;
  companyId: string;
  actorUserId: string;
  reportId: ReportId;
  reportName: string;
  filtersSnapshot: Record<string, unknown>;
  selectedColumnsSnapshot?: string[];
  outputFormat: 'csv' | 'xlsx' | 'pdf';
  generationStatus: 'pending' | 'completed' | 'failed';
  generatedAt: string;
  reportingCutoff?: string;
  rowCount: number;
  fileReference?: string;
  errorMetadata?: Record<string, unknown>;
}

export interface ReportExportInput {
  format: 'csv' | 'xlsx' | 'pdf';
  filters: Record<string, unknown>;
  sorting?: ReportSortingOption;
  selectedColumns?: string[];
  configurationName?: string;
  includeAnalytics?: boolean;
}

export interface ReportExportResult {
  buffer: Buffer;
  mimeType: string;
  fileName: string;
  rowCount: number;
  historyId: string;
}

export interface ReportKpiItem {
  id: string;
  label: string;
  value: string | number;
  subtext?: string;
  variant?: 'neutral' | 'success' | 'warning' | 'danger' | 'info';
}

export interface StatusDistributionSlice {
  label: string;
  value: number;
  colorToken: string;
  key?: string;
  percentage?: number;
}

export interface ChartDataGroup {
  title: string;
  subtitle?: string;
  chartType: 'donut' | 'line' | 'bar' | 'grouped_bar' | 'stacked_bar';
  xAxisLabel?: string;
  yAxisLabel?: string;
  categories?: string[];
  slices?: StatusDistributionSlice[];
  series?: Array<{
    name: string;
    colorToken: string;
    points?: Array<{ label: string; value: number }>;
    values?: number[];
  }>;
  drillDownField?: string;
}

export interface ReportAnalyticsResult {
  reportId: ReportId;
  reportName: string;
  category: ReportCategory;
  appliedFilters: Record<string, unknown>;
  generatedAt: string;
  timezone: string;
  totalDatasetRows: number;
  kpis: ReportKpiItem[];
  charts: {
    statusDistribution?: ChartDataGroup;
    dateTrend?: ChartDataGroup;
    departmentComparison?: ChartDataGroup;
    comparisonOrComposition?: ChartDataGroup;
  };
  drillDownSupport: {
    supportedDimensions: Array<{
      field: string;
      label: string;
      targetFilterKey: string;
    }>;
  };
  limitations?: string[];
}
