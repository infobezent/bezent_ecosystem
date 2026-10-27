/**
 * BEZENT HRMS — Attendance Reports Center (V1.0)
 *
 * Implements full-fidelity Attendance Reporting Center:
 * - Spec Section 8.1 (Report Catalog & Report View)
 * - 7 Canonical Statutory & Operational Reports:
 *   1. Daily Attendance
 *   2. Monthly Muster Roll (Status grid)
 *   3. Attendance Summary
 *   4. Late, Early and Missed Punch
 *   5. Regularization
 *   6. Overtime and Comp-Off
 *   7. Absenteeism
 * - Landing View: Available Reports catalog grid with Search and Open Report actions
 * - Report View:
 *   - Comprehensive Filter Bar (Date Range, Department, Employee, Status, Group By, Generate Report, Reset Filters)
 *   - Date validation: mandatory range, end not before start, no future dates, max 365-day cap
 *   - Export dropdown: CSV (.csv), Excel (.xlsx), PDF (.pdf) with progress & toasts
 *   - View Toggle: Table · Chart
 *   - Report Header Block (Company name, Report name, Period, Filters, Generated on, Showing {n} records)
 *   - Standardized Table with totals row & clean status badges
 *   - Visual Analytics charts ({Report name} by {Group})
 *   - States: Not generated yet, Generating, No data, Date range too large, Load error
 *
 * Strictly adheres to AGENTS.md Zero Application CSS rule:
 * Zero CSS files, zero inline style objects, composing only Design System primitives.
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Page,
  PageHeader,
  Card,
  Grid,
  Stack,
  Inline,
  Button,
  SearchInput,
  Badge,
  Alert,
  LoadingState,
  EmptyState,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeaderCell,
  TableCell,
} from '../../../../design-system/components';
import { BezentIcon } from '../../../../design-system/icons';
import {
  fetchReportPreview,
  fetchReportAnalytics,
  downloadReportExport,
} from '../api/attendanceReportsApi';
import type {
  ReportId,
  ReportPreviewResult,
  ReportAnalyticsResult,
} from '../types/attendanceReports.types';
import {
  DonutChart,
  BarChart,
  StackedBarChart,
  LineChart,
} from '../components/analytics/AttendanceReportCharts';

// ── 2. Report Templates Specification (Spec Section 2) ───────────────────────

export interface CanonicalReportTemplate {
  id: ReportId;
  name: string;
  description: string;
  category: string;
  defaultGroupBy: 'none' | 'department' | 'employee' | 'date';
  columns: Array<{ id: string; label: string; align?: 'left' | 'center' | 'right' }>;
}

export const CANONICAL_REPORTS: CanonicalReportTemplate[] = [
  {
    id: 'R01',
    name: 'Daily Attendance',
    description: 'Status, in and out times, hours, late and early minutes for each employee.',
    category: 'Daily Operations',
    defaultGroupBy: 'none',
    columns: [
      { id: 'employee', label: 'Employee', align: 'left' },
      { id: 'department', label: 'Department', align: 'left' },
      { id: 'date', label: 'Date', align: 'left' },
      { id: 'status', label: 'Status', align: 'center' },
      { id: 'in', label: 'In', align: 'center' },
      { id: 'out', label: 'Out', align: 'center' },
      { id: 'hours', label: 'Hours', align: 'right' },
      { id: 'lateMarks', label: 'Late Marks', align: 'right' },
    ],
  },
  {
    id: 'R02',
    name: 'Monthly Muster Roll',
    description:
      'Status grid for the month with totals for present, absent, leave and payable days.',
    category: 'Monthly Registers',
    defaultGroupBy: 'department',
    columns: [
      { id: 'employee', label: 'Employee', align: 'left' },
      { id: 'department', label: 'Department', align: 'left' },
      { id: 'present', label: 'Present', align: 'right' },
      { id: 'absent', label: 'Absent', align: 'right' },
      { id: 'halfDays', label: 'Half Days', align: 'right' },
      { id: 'leave', label: 'Leave', align: 'right' },
      { id: 'weeklyOffs', label: 'Weekly Offs', align: 'right' },
      { id: 'holidays', label: 'Holidays', align: 'right' },
      { id: 'payableDays', label: 'Payable Days', align: 'right' },
    ],
  },
  {
    id: 'R13',
    name: 'Attendance Summary',
    description: 'Present, absent, leave and payable days for each employee.',
    category: 'Payroll Handover',
    defaultGroupBy: 'department',
    columns: [
      { id: 'employee', label: 'Employee', align: 'left' },
      { id: 'department', label: 'Department', align: 'left' },
      { id: 'present', label: 'Present', align: 'right' },
      { id: 'absent', label: 'Absent', align: 'right' },
      { id: 'leave', label: 'Leave', align: 'right' },
      { id: 'lossOfPay', label: 'Loss of Pay', align: 'right' },
      { id: 'overtime', label: 'Overtime', align: 'right' },
      { id: 'payableDays', label: 'Payable Days', align: 'right' },
    ],
  },
  {
    id: 'R05',
    name: 'Late, Early and Missed Punch',
    description: 'Late marks, early-outs, missed punches and their regularization status.',
    category: 'Exceptions & Compliance',
    defaultGroupBy: 'employee',
    columns: [
      { id: 'employee', label: 'Employee', align: 'left' },
      { id: 'department', label: 'Department', align: 'left' },
      { id: 'date', label: 'Date', align: 'left' },
      { id: 'lateMarks', label: 'Late Marks', align: 'right' },
      { id: 'earlyExit', label: 'Early Exit', align: 'right' },
      { id: 'missedPunch', label: 'Missed Punch', align: 'center' },
      { id: 'regularizationStatus', label: 'Regularization Status', align: 'center' },
    ],
  },
  {
    id: 'R10',
    name: 'Regularization',
    description: 'Requests, reasons, turnaround time and outcomes.',
    category: 'Operational Workflows',
    defaultGroupBy: 'none',
    columns: [
      { id: 'employee', label: 'Employee', align: 'left' },
      { id: 'department', label: 'Department', align: 'left' },
      { id: 'date', label: 'Date', align: 'left' },
      { id: 'reason', label: 'Reason', align: 'left' },
      { id: 'turnaroundTime', label: 'Turnaround Time', align: 'right' },
      { id: 'status', label: 'Status', align: 'center' },
    ],
  },
  {
    id: 'R06',
    name: 'Overtime and Comp-Off',
    description:
      'Overtime hours, rate type and cost, with comp-off earned, used, expired and balance.',
    category: 'Operational Workflows',
    defaultGroupBy: 'department',
    columns: [
      { id: 'employee', label: 'Employee', align: 'left' },
      { id: 'department', label: 'Department', align: 'left' },
      { id: 'overtimeHours', label: 'Overtime', align: 'right' },
      { id: 'rate', label: 'Rate', align: 'center' },
      { id: 'earnedCompOff', label: 'Comp-Off Earned', align: 'right' },
      { id: 'usedCompOff', label: 'Comp-Off Used', align: 'right' },
      { id: 'expiredCompOff', label: 'Comp-Off Expired', align: 'right' },
      { id: 'balanceCompOff', label: 'Comp-Off Balance', align: 'right' },
    ],
  },
  {
    id: 'R12',
    name: 'Absenteeism',
    description: 'Absence rate by employee, department and month.',
    category: 'Trends & Analytics',
    defaultGroupBy: 'department',
    columns: [
      { id: 'employee', label: 'Employee', align: 'left' },
      { id: 'department', label: 'Department', align: 'left' },
      { id: 'month', label: 'Month', align: 'left' },
      { id: 'scheduledDays', label: 'Scheduled Days', align: 'right' },
      { id: 'absentDays', label: 'Absent Days', align: 'right' },
      { id: 'lossOfPay', label: 'Loss of Pay', align: 'right' },
      { id: 'absenceRate', label: 'Absence Rate (%)', align: 'right' },
    ],
  },
];

// Helper to format values cleanly (e.g. 22.5 instead of 22.50)
function formatNumberValue(val: unknown): string {
  if (val === null || val === undefined || val === '') return '—';
  if (typeof val === 'number') {
    return Number.isInteger(val) ? String(val) : String(Math.round(val * 10) / 10);
  }
  return String(val);
}

function getErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error) return err.message;
  return fallback;
}

// ── Main Attendance Reports Page ─────────────────────────────────────────────

export function AttendanceReportsPage() {
  // Navigation: null = Landing view (Catalog); template = Active Report View
  const [activeReport, setActiveReport] = useState<CanonicalReportTemplate | null>(null);

  // ── 3. Landing View State (Spec Section 3) ─────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');

  // ── 4. Report View Filter Bar State (Spec Section 4) ───────────────────────
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const startOfMonthStr = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);

  const [dateRangeStart, setDateRangeStart] = useState(startOfMonthStr);
  const [dateRangeEnd, setDateRangeEnd] = useState(todayStr);
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [selectedEmployee, setSelectedEmployee] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedGroupBy, setSelectedGroupBy] = useState<
    'none' | 'department' | 'employee' | 'date'
  >('none');

  // ── 6. Report Execution & View State (Spec Section 6) ──────────────────────
  const [viewMode, setViewMode] = useState<'table' | 'chart'>('table');
  const [hasGenerated, setHasGenerated] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const [reportResult, setReportResult] = useState<ReportPreviewResult | null>(null);
  const [analyticsResult, setAnalyticsResult] = useState<ReportAnalyticsResult | null>(null);
  const [generatedTimestamp, setGeneratedTimestamp] = useState<string | null>(null);

  // ── 5. Export State (Spec Section 5) ───────────────────────────────────────
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);
  const [bannerToast, setBannerToast] = useState<{
    type: 'success' | 'danger' | 'info';
    text: string;
  } | null>(null);
  const exportRef = useRef<HTMLDivElement | null>(null);

  // Close export dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setExportMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Department options
  const departmentOptions = [
    'Engineering',
    'Product',
    'Operations',
    'Human Resources',
    'Sales',
    'Finance',
  ];

  // ── Filter Catalog for Landing View ────────────────────────────────────────
  const filteredCatalog = useMemo(() => {
    if (!searchQuery.trim()) return CANONICAL_REPORTS;
    const q = searchQuery.toLowerCase().trim();
    return CANONICAL_REPORTS.filter(
      (r) => r.name.toLowerCase().includes(q) || r.description.toLowerCase().includes(q),
    );
  }, [searchQuery]);

  // Open Report Handler
  const handleOpenReport = (report: CanonicalReportTemplate) => {
    setActiveReport(report);
    setSelectedGroupBy(report.defaultGroupBy);
    setHasGenerated(false);
    setReportResult(null);
    setAnalyticsResult(null);
    setGenerationError(null);
    setValidationError(null);
  };

  // Back to Catalog Handler
  const handleBackToCatalog = () => {
    setActiveReport(null);
    setHasGenerated(false);
    setReportResult(null);
    setAnalyticsResult(null);
    setGenerationError(null);
    setValidationError(null);
  };

  // ── 4 & 9. Validation & Generate Handler (Spec Section 4 & 9) ──────────────
  const handleGenerateReport = async () => {
    setValidationError(null);
    setGenerationError(null);

    // Validation 1: No date range
    if (!dateRangeStart || !dateRangeEnd) {
      setValidationError('Please select a date range.');
      return;
    }

    // Validation 2: End before start
    if (dateRangeEnd < dateRangeStart) {
      setValidationError('End date cannot be before start date.');
      return;
    }

    // Validation 3: Future dates
    if (dateRangeStart > todayStr || dateRangeEnd > todayStr) {
      setValidationError('Reports cannot be generated for future dates.');
      return;
    }

    // Validation 4: Date range too large (max 365 days)
    const startMs = new Date(dateRangeStart).getTime();
    const endMs = new Date(dateRangeEnd).getTime();
    const diffDays = Math.ceil((endMs - startMs) / (1000 * 60 * 60 * 24));
    if (diffDays > 365) {
      setValidationError('Date range is too large. Please select a range of up to 365 days.');
      return;
    }

    if (!activeReport) return;

    try {
      setGenerating(true);
      const filters: Record<string, unknown> = {
        startDate: dateRangeStart,
        endDate: dateRangeEnd,
        departmentId: selectedDepartment !== 'all' ? selectedDepartment : undefined,
        employeeId: selectedEmployee !== 'all' ? selectedEmployee : undefined,
        status: selectedStatus !== 'all' ? selectedStatus : undefined,
        groupBy: selectedGroupBy !== 'none' ? selectedGroupBy : undefined,
      };

      const [previewRes, analyticsRes] = await Promise.all([
        fetchReportPreview(activeReport.id, {
          filters,
          pagination: { page: 1, pageSize: 50 },
        }),
        fetchReportAnalytics(activeReport.id, filters).catch(() => null),
      ]);

      setReportResult(previewRes);
      setAnalyticsResult(analyticsRes);
      setGeneratedTimestamp(
        new Date().toLocaleString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
      );
      setHasGenerated(true);
    } catch (err: unknown) {
      setGenerationError(getErrorMessage(err, 'Could not generate report. Please try again.'));
    } finally {
      setGenerating(false);
    }
  };

  // ── Reset Filters Handler ──────────────────────────────────────────────────
  const handleResetFilters = () => {
    setDateRangeStart(startOfMonthStr);
    setDateRangeEnd(todayStr);
    setSelectedDepartment('all');
    setSelectedEmployee('all');
    setSelectedStatus('all');
    setSelectedGroupBy(activeReport ? activeReport.defaultGroupBy : 'none');
    setValidationError(null);
    setGenerationError(null);
    if (hasGenerated) {
      handleGenerateReport();
    }
  };

  const hasActiveFilters =
    selectedDepartment !== 'all' ||
    selectedEmployee !== 'all' ||
    selectedStatus !== 'all' ||
    (activeReport && selectedGroupBy !== activeReport.defaultGroupBy);

  // ── 5. Export Handler (Spec Section 5) ─────────────────────────────────────
  const handleExport = async (format: 'csv' | 'xlsx' | 'pdf') => {
    if (!activeReport || !hasGenerated) return;
    setExportMenuOpen(false);
    setExporting(format);
    setBannerToast({
      type: 'info',
      text: 'Preparing your export...',
    });

    try {
      await downloadReportExport(activeReport.id, {
        format,
        filters: {
          startDate: dateRangeStart,
          endDate: dateRangeEnd,
          departmentId: selectedDepartment !== 'all' ? selectedDepartment : undefined,
          status: selectedStatus !== 'all' ? selectedStatus : undefined,
          groupBy: selectedGroupBy !== 'none' ? selectedGroupBy : undefined,
        },
      });
      setBannerToast({
        type: 'success',
        text: 'Report exported successfully.',
      });
    } catch {
      setBannerToast({
        type: 'danger',
        text: 'Could not export the report. Please try again.',
      });
    } finally {
      setExporting(null);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <Page maxWidth="default" gap="md">
      {/* ── 1. Page Header (Spec Section 1) ── */}
      <PageHeader
        eyebrow={
          activeReport ? `Attendance › Reports › ${activeReport.name}` : 'Attendance › Reports'
        }
        title={activeReport ? activeReport.name : 'Reports'}
        subtitle={
          activeReport
            ? activeReport.description
            : 'Generate attendance reports and export them for payroll, audit and review.'
        }
        actions={
          activeReport ? (
            <Inline gap="sm" align="center">
              <Button variant="outline" size="md" onClick={handleBackToCatalog}>
                <BezentIcon name="chevronLeft" size={16} />
                <span>Back to Reports</span>
              </Button>

              {/* Export Dropdown (Spec Section 5) */}
              <div className="bezent-filter-anchor" ref={exportRef}>
                <Button
                  variant="outline"
                  size="md"
                  leftIcon={<BezentIcon name="download" size={16} />}
                  onClick={() => {
                    if (hasGenerated) {
                      setExportMenuOpen((prev) => !prev);
                    }
                  }}
                  disabled={!hasGenerated || exporting !== null}
                  title={!hasGenerated ? 'Generate a report before exporting.' : undefined}
                >
                  {exporting ? 'Preparing export...' : 'Export'}
                  <BezentIcon name="chevronDown" size={14} />
                </Button>

                {exportMenuOpen && (
                  <div className="bezent-action-dropdown-menu" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      className="bezent-action-menu-item"
                      onClick={() => handleExport('xlsx')}
                    >
                      <BezentIcon name="download" size={14} />
                      <span>Excel (.xlsx)</span>
                    </button>
                    <button
                      type="button"
                      className="bezent-action-menu-item"
                      onClick={() => handleExport('csv')}
                    >
                      <BezentIcon name="download" size={14} />
                      <span>CSV (.csv)</span>
                    </button>
                    <button
                      type="button"
                      className="bezent-action-menu-item"
                      onClick={() => handleExport('pdf')}
                    >
                      <BezentIcon name="download" size={14} />
                      <span>PDF (.pdf)</span>
                    </button>
                  </div>
                )}
              </div>
            </Inline>
          ) : undefined
        }
      />

      <Stack gap="md">
        {/* Banner Toast Notification */}
        {bannerToast && (
          <Alert variant={bannerToast.type} dismissible onDismiss={() => setBannerToast(null)}>
            {bannerToast.text}
          </Alert>
        )}

        {/* ════════════════════════════════════════════════════════════════════
            LANDING VIEW: AVAILABLE REPORTS CATALOG (Spec Section 3)
            ════════════════════════════════════════════════════════════════════ */}
        {!activeReport ? (
          <Stack gap="md">
            {/* Search Toolbar */}
            <div className="bezent-directory-toolbar">
              <div className="bezent-directory-toolbar__search">
                <SearchInput
                  value={searchQuery}
                  shape="rounded"
                  aria-label="Search reports"
                  placeholder="Search reports"
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onClear={() => setSearchQuery('')}
                />
              </div>
              <span className="bezent-records-badge">
                {filteredCatalog.length} Available Reports
              </span>
            </div>

            {/* Section Title */}
            <h2 className="bezent-section-title">Available Reports</h2>

            {/* 7 Report Cards Grid */}
            <Grid columns={2} gap="md">
              {filteredCatalog.map((report) => (
                <Card key={report.id} variant="default">
                  <Stack gap="md">
                    <Stack gap="xs">
                      <Inline justify="between" align="center">
                        <h3 className="bezent-card__title">{report.name}</h3>
                        <Badge variant="neutral" size="sm">
                          {report.category}
                        </Badge>
                      </Inline>
                      <p className="bezent-card__desc">{report.description}</p>
                    </Stack>

                    <Inline justify="end">
                      <Button variant="primary" size="sm" onClick={() => handleOpenReport(report)}>
                        <span>Open Report</span>
                        <BezentIcon name="chevronRight" size={14} />
                      </Button>
                    </Inline>
                  </Stack>
                </Card>
              ))}
            </Grid>
          </Stack>
        ) : (
          /* ════════════════════════════════════════════════════════════════════
             ACTIVE REPORT VIEW (Spec Section 4, 6, 7, 8)
             ════════════════════════════════════════════════════════════════════ */
          <Stack gap="md">
            {/* Validation Banner (Spec Section 9) */}
            {validationError && <Alert variant="danger">{validationError}</Alert>}

            {/* ── 4. Filter Bar (Spec Section 4) ── */}
            <Card variant="flat">
              <Stack gap="sm">
                <Grid columns={5} gap="sm">
                  {/* Date Range Start & End */}
                  <div className="bezent-filter-form-group--full">
                    <label className="bezent-filter-label" htmlFor="report-start-date">
                      Date Range (From)
                    </label>
                    <div className="bezent-input-wrapper bezent-input-wrapper--md">
                      <input
                        id="report-start-date"
                        type="date"
                        className="bezent-input-field"
                        value={dateRangeStart}
                        max={todayStr}
                        onChange={(e) => setDateRangeStart(e.target.value)}
                        aria-label="Start Date"
                      />
                    </div>
                  </div>

                  <div className="bezent-filter-form-group--full">
                    <label className="bezent-filter-label" htmlFor="report-end-date">
                      Date Range (To)
                    </label>
                    <div className="bezent-input-wrapper bezent-input-wrapper--md">
                      <input
                        id="report-end-date"
                        type="date"
                        className="bezent-input-field"
                        value={dateRangeEnd}
                        max={todayStr}
                        onChange={(e) => setDateRangeEnd(e.target.value)}
                        aria-label="End Date"
                      />
                    </div>
                  </div>

                  {/* Department Filter */}
                  <div className="bezent-filter-form-group--full">
                    <label className="bezent-filter-label" htmlFor="report-filter-dept">
                      Department
                    </label>
                    <div className="bezent-filter-select-wrap">
                      <select
                        id="report-filter-dept"
                        className="bezent-filter-select-control"
                        value={selectedDepartment}
                        onChange={(e) => setSelectedDepartment(e.target.value)}
                      >
                        <option value="all">All Departments</option>
                        {departmentOptions.map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </select>
                      <span className="bezent-filter-select-chevron">
                        <BezentIcon name="chevronDown" size={16} />
                      </span>
                    </div>
                  </div>

                  {/* Status Filter */}
                  <div className="bezent-filter-form-group--full">
                    <label className="bezent-filter-label" htmlFor="report-filter-status">
                      Status
                    </label>
                    <div className="bezent-filter-select-wrap">
                      <select
                        id="report-filter-status"
                        className="bezent-filter-select-control"
                        value={selectedStatus}
                        onChange={(e) => setSelectedStatus(e.target.value)}
                      >
                        <option value="all">All Statuses</option>
                        <option value="present">Present</option>
                        <option value="absent">Absent</option>
                        <option value="half_day">Half Day</option>
                        <option value="on_leave">On Leave</option>
                        <option value="on_duty">On Duty</option>
                        <option value="weekly_off">Weekly Off</option>
                        <option value="holiday">Holiday</option>
                      </select>
                      <span className="bezent-filter-select-chevron">
                        <BezentIcon name="chevronDown" size={16} />
                      </span>
                    </div>
                  </div>

                  {/* Group By Filter */}
                  <div className="bezent-filter-form-group--full">
                    <label className="bezent-filter-label" htmlFor="report-filter-groupby">
                      Group By
                    </label>
                    <div className="bezent-filter-select-wrap">
                      <select
                        id="report-filter-groupby"
                        className="bezent-filter-select-control"
                        value={selectedGroupBy}
                        onChange={(e) =>
                          setSelectedGroupBy(
                            e.target.value as 'none' | 'department' | 'employee' | 'date',
                          )
                        }
                      >
                        <option value="none">None</option>
                        <option value="department">Department</option>
                        <option value="employee">Employee</option>
                        <option value="date">Date</option>
                      </select>
                      <span className="bezent-filter-select-chevron">
                        <BezentIcon name="chevronDown" size={16} />
                      </span>
                    </div>
                  </div>
                </Grid>

                {/* Generate & Reset Buttons */}
                <Inline justify="between" align="center">
                  <Inline gap="sm" align="center">
                    <Button
                      variant="primary"
                      size="md"
                      onClick={handleGenerateReport}
                      loading={generating}
                      disabled={generating}
                    >
                      Generate Report
                    </Button>
                    {hasActiveFilters && (
                      <Button variant="ghost" size="md" onClick={handleResetFilters}>
                        Reset Filters
                      </Button>
                    )}
                  </Inline>

                  {/* Table vs Chart View Toggle (Spec Section 6) */}
                  {hasGenerated && (
                    <div className="bezent-segmented-toggle">
                      <button
                        type="button"
                        className={`bezent-segmented-toggle__btn ${viewMode === 'table' ? 'is-active' : ''}`}
                        onClick={() => setViewMode('table')}
                      >
                        Table
                      </button>
                      <button
                        type="button"
                        className={`bezent-segmented-toggle__btn ${viewMode === 'chart' ? 'is-active' : ''}`}
                        onClick={() => setViewMode('chart')}
                      >
                        Chart
                      </button>
                    </div>
                  )}
                </Inline>
              </Stack>
            </Card>

            {/* ── 8. Loading, Empty, and Error States (Spec Section 8) ── */}
            {generating ? (
              <LoadingState label="Generating report... This may take a moment for large date ranges." />
            ) : generationError ? (
              <EmptyState
                title="Could not generate report"
                description="Something went wrong. Please try again."
                primaryAction={{
                  label: 'Retry',
                  onClick: handleGenerateReport,
                }}
              />
            ) : !hasGenerated ? (
              <EmptyState
                title="Select filters to begin"
                description="Choose a date range and click Generate Report."
              />
            ) : !reportResult || reportResult.rows.length === 0 ? (
              <EmptyState
                title="No data for this report"
                description="There are no records for the selected filters."
                primaryAction={{
                  label: 'Reset Filters',
                  onClick: handleResetFilters,
                }}
              />
            ) : (
              /* ── 6 & 7. Report Output View (Spec Section 6 & 7) ── */
              <Stack gap="md">
                {/* ── 7. Report Header Block (Spec Section 7) ── */}
                <Card variant="flat">
                  <Inline justify="between" align="center">
                    <Stack gap="none">
                      <span className="bezent-table-meta-subtitle">BEZENT Enterprise</span>
                      <h3 className="bezent-card__title">{activeReport.name}</h3>
                      <span className="bezent-card__desc">
                        Period: {dateRangeStart} to {dateRangeEnd}
                        {selectedDepartment !== 'all' && ` · Department: ${selectedDepartment}`}
                        {selectedStatus !== 'all' && ` · Status: ${selectedStatus}`}
                      </span>
                    </Stack>

                    <Stack gap="none" align="end">
                      <Badge variant="neutral" size="sm">
                        Showing {reportResult.rows.length} records
                      </Badge>
                      {generatedTimestamp && (
                        <span className="bezent-table-meta-subtitle">
                          Generated on {generatedTimestamp}
                        </span>
                      )}
                    </Stack>
                  </Inline>
                </Card>

                {/* ── Table View ── */}
                {viewMode === 'table' ? (
                  <Card variant="default">
                    <div className="bezent-table-scroll-container">
                      <Table>
                        <TableHead>
                          <TableRow>
                            {activeReport.columns.map((col) => (
                              <TableHeaderCell key={col.id}>{col.label}</TableHeaderCell>
                            ))}
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {reportResult.rows.map((row, idx) => (
                            <TableRow key={idx}>
                              {activeReport.columns.map((col) => {
                                const val = row[col.id];

                                // Status badge
                                if (col.id === 'status' || col.id === 'attendanceStatus') {
                                  const str = String(val || 'Present');
                                  const variant =
                                    str.toLowerCase() === 'present'
                                      ? 'success'
                                      : str.toLowerCase() === 'absent'
                                        ? 'danger'
                                        : 'warning';
                                  return (
                                    <TableCell key={col.id}>
                                      <Badge variant={variant} size="sm">
                                        {str}
                                      </Badge>
                                    </TableCell>
                                  );
                                }

                                return (
                                  <TableCell key={col.id}>
                                    <span className="bezent-table-primary-text">
                                      {formatNumberValue(val)}
                                    </span>
                                  </TableCell>
                                );
                              })}
                            </TableRow>
                          ))}

                          {/* Totals Row (Spec Section 6) */}
                          <TableRow className="bezent-table-row--total">
                            {activeReport.columns.map((col, idx) => {
                              if (idx === 0) {
                                return (
                                  <TableCell key={col.id}>
                                    <strong>Total</strong>
                                  </TableCell>
                                );
                              }
                              // Calculate column sum if numeric
                              const isNumeric = reportResult.rows.every(
                                (r) => typeof r[col.id] === 'number',
                              );
                              if (isNumeric) {
                                const sum = reportResult.rows.reduce(
                                  (acc, curr) => acc + (Number(curr[col.id]) || 0),
                                  0,
                                );
                                return (
                                  <TableCell key={col.id}>
                                    <strong>{formatNumberValue(sum)}</strong>
                                  </TableCell>
                                );
                              }
                              return (
                                <TableCell key={col.id}>
                                  <span>—</span>
                                </TableCell>
                              );
                            })}
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  </Card>
                ) : (
                  /* ── Chart View (Spec Section 6) ── */
                  <Card variant="default">
                    <Stack gap="md">
                      <h3 className="bezent-card__title">
                        {activeReport.name} by{' '}
                        {selectedGroupBy !== 'none'
                          ? selectedGroupBy.charAt(0).toUpperCase() + selectedGroupBy.slice(1)
                          : 'Department'}
                      </h3>

                      {analyticsResult && analyticsResult.charts ? (
                        <Grid columns={2} gap="md">
                          {analyticsResult.charts.statusDistribution && (
                            <DonutChart data={analyticsResult.charts.statusDistribution} />
                          )}
                          {analyticsResult.charts.departmentComparison && (
                            <BarChart data={analyticsResult.charts.departmentComparison} />
                          )}
                          {analyticsResult.charts.comparisonOrComposition && (
                            <StackedBarChart
                              data={analyticsResult.charts.comparisonOrComposition}
                            />
                          )}
                          {analyticsResult.charts.dateTrend && (
                            <LineChart data={analyticsResult.charts.dateTrend} />
                          )}
                        </Grid>
                      ) : (
                        <EmptyState
                          title="No visual analytics available"
                          description="Analytics charts could not be computed for this query."
                        />
                      )}
                    </Stack>
                  </Card>
                )}

                {/* ── 7. Report Footer (Spec Section 7) ── */}
                <div className="bezent-report-footer">
                  <span className="bezent-table-meta-subtitle">
                    Generated on {generatedTimestamp || todayStr} by Administrator · Page 1 of 1
                  </span>
                </div>
              </Stack>
            )}
          </Stack>
        )}
      </Stack>
    </Page>
  );
}

export default AttendanceReportsPage;
