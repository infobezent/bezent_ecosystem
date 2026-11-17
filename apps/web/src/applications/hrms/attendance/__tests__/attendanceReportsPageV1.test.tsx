import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { AttendanceReportsPage } from '../pages/AttendanceReportsPage';

describe('HRMS Attendance — Reports V1.0 Frontend Tests', () => {
  it('renders Reports header, subtitle and breadcrumb', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <AttendanceReportsPage />
      </MemoryRouter>,
    );

    expect(html).toContain('Reports');
    expect(html).toContain(
      'Generate attendance reports and export them for payroll, audit and review.',
    );
    expect(html).toContain('Attendance › Reports');
  });

  it('renders Available Reports catalog with search and open report actions', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <AttendanceReportsPage />
      </MemoryRouter>,
    );

    expect(html).toContain('Available Reports');
    expect(html).toContain('Search reports');
    expect(html).toContain('Open Report');
  });

  it('renders all 7 canonical report templates and descriptions', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <AttendanceReportsPage />
      </MemoryRouter>,
    );

    expect(html).toContain('Daily Attendance');
    expect(html).toContain('Monthly Muster Roll');
    expect(html).toContain(
      'Status grid for the month with totals for present, absent, leave and payable days.',
    );
    expect(html).toContain('Attendance Summary');
    expect(html).toContain('Late, Early and Missed Punch');
    expect(html).toContain('Regularization');
    expect(html).toContain('Overtime and Comp-Off');
    expect(html).toContain('Absenteeism');
  });

  it('renders KpiSummaryGrid with report-specific KPI metrics and change indicators', async () => {
    const { KpiSummaryGrid } = await import('../components/analytics/AttendanceReportCharts');
    const html = renderToStaticMarkup(
      <KpiSummaryGrid
        kpis={[
          {
            id: 'total',
            label: 'Total Records',
            value: '150',
            subtext: '+5.2% vs previous period',
            variant: 'success',
          },
          { id: 'rate', label: 'Attendance Rate', value: '94.2%', subtext: 'Present / Scheduled' },
          { id: 'anomalies', label: 'Unresolved Anomalies', value: '3', variant: 'warning' },
        ]}
      />,
    );

    expect(html).toContain('Total Records');
    expect(html).toContain('150');
    expect(html).toContain('+5.2% vs previous period');
    expect(html).toContain('Attendance Rate');
    expect(html).toContain('94.2%');
    expect(html).toContain('Unresolved Anomalies');
    expect(html).toContain('3');
  });

  it('renders DonutChart with SVG arcs, center total and legend', async () => {
    const { DonutChart } = await import('../components/analytics/AttendanceReportCharts');
    const html = renderToStaticMarkup(
      <DonutChart
        data={{
          title: 'Status Distribution',
          subtitle: 'Workforce breakdown across current filtered scope',
          chartType: 'donut',
          slices: [
            {
              key: 'present',
              label: 'Present',
              value: 85,
              colorToken: 'var(--color-success, #16a34a)',
            },
            {
              key: 'absent',
              label: 'Absent',
              value: 10,
              colorToken: 'var(--color-danger, #dc2626)',
            },
            {
              key: 'on_leave',
              label: 'On Leave',
              value: 5,
              colorToken: 'var(--color-warning, #d97706)',
            },
          ],
        }}
      />,
    );

    expect(html).toContain('Status Distribution');
    expect(html).toContain('Total: 100');
    expect(html).toContain('Present');
    expect(html).toContain('85');
    expect(html).toContain('85%');
    expect(html).toContain('Absent');
    expect(html).toContain('10');
    expect(html).toContain('10%');
    expect(html).toContain('<svg');
  });

  it('handles empty DonutChart gracefully without throwing or NaN', async () => {
    const { DonutChart } = await import('../components/analytics/AttendanceReportCharts');
    const html = renderToStaticMarkup(
      <DonutChart
        data={{
          title: 'Empty Distribution',
          chartType: 'donut',
          slices: [],
        }}
      />,
    );

    expect(html).toContain('Empty Distribution');
    expect(html).toContain('No distribution data');
  });

  it('renders BarChart with grouped bars and legends', async () => {
    const { BarChart } = await import('../components/analytics/AttendanceReportCharts');
    const html = renderToStaticMarkup(
      <BarChart
        data={{
          title: 'Department Comparisons',
          chartType: 'bar',
          categories: ['Engineering', 'Human Resources'],
          series: [
            { name: 'Present', colorToken: '#16a34a', values: [45, 18] },
            { name: 'Absent', colorToken: '#dc2626', values: [2, 0] },
          ],
        }}
      />,
    );

    expect(html).toContain('Department Comparisons');
    expect(html).toContain('Engineering');
    expect(html).toContain('Human Resources');
    expect(html).toContain('<svg');
  });

  it('renders StackedBarChart with segment breakdowns', async () => {
    const { StackedBarChart } = await import('../components/analytics/AttendanceReportCharts');
    const html = renderToStaticMarkup(
      <StackedBarChart
        data={{
          title: 'Scheduled vs Worked Breakdown',
          chartType: 'stacked_bar',
          categories: ['Engineering'],
          series: [
            { name: 'Worked Hours', colorToken: '#2563eb', values: [360] },
            { name: 'Approved Overtime', colorToken: '#16a34a', values: [40] },
          ],
        }}
      />,
    );

    expect(html).toContain('Scheduled vs Worked Breakdown');
    expect(html).toContain('Engineering');
    expect(html).toContain('Worked Hours');
    expect(html).toContain('Approved Overtime');
    expect(html).toContain('<svg');
  });

  it('renders LineChart date trends correctly', async () => {
    const { LineChart } = await import('../components/analytics/AttendanceReportCharts');
    const html = renderToStaticMarkup(
      <LineChart
        data={{
          title: '14-Day Attendance Trend',
          chartType: 'line',
          series: [
            {
              name: 'Attendance Rate',
              colorToken: '#2563eb',
              points: [
                { label: '10-01', value: 92 },
                { label: '10-02', value: 96 },
                { label: '10-03', value: 94 },
              ],
            },
          ],
        }}
      />,
    );

    expect(html).toContain('14-Day Attendance Trend');
    expect(html).toContain('10-01');
    expect(html).toContain('10-03');
    expect(html).toContain('<path');
  });

  it('renders ActiveDrillDownBanner with active dimension and clear action', async () => {
    const { ActiveDrillDownBanner } =
      await import('../components/analytics/AttendanceReportCharts');
    const html = renderToStaticMarkup(
      <ActiveDrillDownBanner dimension="Status Distribution" value="Absent" onClear={() => {}} />,
    );

    expect(html).toContain('Active Chart Filter:');
    expect(html).toContain('Status Distribution');
    expect(html).toContain('Absent');
    expect(html).toContain('Clear Chart Filter');
  });

  // ── Redesign Batch 1 Tests ─────────────────────────────────────────────────

  it('fails if any canonical config ID is missing from canonical catalog definition', async () => {
    const { CANONICAL_REPORT_IDS } = await import('../pages/reports/reportsConfig');
    const { CANONICAL_REPORTS } = await import('../pages/AttendanceReportsPage');

    const canonicalIdsInPage = CANONICAL_REPORTS.map((r) => r.id);
    for (const configId of CANONICAL_REPORT_IDS) {
      expect(canonicalIdsInPage).toContain(configId);
    }
  });

  it('renders CategoryChips with All and dynamic categories', async () => {
    const { CategoryChips } = await import('../pages/reports/CategoryChips');
    const categories = ['Daily Operations', 'Monthly Registers', 'Payroll Handover'];
    const html = renderToStaticMarkup(
      <CategoryChips categories={categories} selectedCategory="all" onSelectCategory={() => {}} />,
    );

    expect(html).toContain('All');
    expect(html).toContain('Daily Operations');
    expect(html).toContain('Monthly Registers');
    expect(html).toContain('Payroll Handover');
  });

  it('renders ReportsToolbar with search input and live count badge', async () => {
    const { ReportsToolbar } = await import('../pages/reports/ReportsToolbar');
    const html = renderToStaticMarkup(
      <ReportsToolbar searchQuery="" onSearchChange={() => {}} totalCount={7} filteredCount={7} />,
    );

    expect(html).toContain('Search reports by name or category…');
    expect(html).toContain('7 Available Reports');
  });

  it('renders ReportsToolbar filtered count badge accurately', async () => {
    const { ReportsToolbar } = await import('../pages/reports/ReportsToolbar');
    const html = renderToStaticMarkup(
      <ReportsToolbar
        searchQuery="daily"
        onSearchChange={() => {}}
        totalCount={7}
        filteredCount={2}
      />,
    );

    expect(html).toContain('2 of 7 Available Reports');
  });

  it('renders ReportCard with effective period and Open Report button', async () => {
    const { ReportCard } = await import('../pages/reports/ReportCard');
    const { REPORT_UI_CONFIGS } = await import('../pages/reports/reportsConfig');
    const mockReport = {
      id: 'R01' as const,
      code: 'R01',
      name: 'Daily Attendance',
      category: 'daily_operations' as any,
      categoryLabel: 'Daily Operations',
      description: 'In/out times, hours worked, late and early minutes for each employee.',
      authoritativeSource: 'attendance_daily_log',
      columns: [],
      allowedFilters: [],
      defaultSorting: { column: 'date', direction: 'desc' as const },
      requiredPermission: 'hrms.attendance.view',
      sensitiveClassification: 'standard' as const,
      supportedExportFormats: ['csv' as const, 'xlsx' as const, 'pdf' as const],
      isPermitted: true,
    };

    const html = renderToStaticMarkup(
      <ReportCard report={mockReport} config={REPORT_UI_CONFIGS.R01} onOpen={() => {}} />,
    );

    expect(html).toContain('Daily Attendance');
    expect(html).toContain('Daily Operations');
    expect(html).toContain('In/out times, hours worked');
    expect(html).toContain('Period: <strong>Today (Single Date)</strong>');
    expect(html).toContain('Open Report');
  });

  it('renders ReportEmptyState when search or category filter matches zero reports', async () => {
    const { ReportEmptyState } = await import('../pages/reports/ReportEmptyState');
    const html = renderToStaticMarkup(
      <ReportEmptyState
        searchQuery="nonexistent"
        selectedCategory="all"
        onClearFilters={() => {}}
      />,
    );

    expect(html).toContain('No reports match your filters');
    expect(html).toContain('nonexistent');
    expect(html).toContain('Clear filters to see all reports.');
    expect(html).toContain('Clear filters');
  });
});
