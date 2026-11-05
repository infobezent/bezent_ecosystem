import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
  Grid,
  LoadingState,
  LocaleDatePicker,
  Page,
  PageHeader,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  Tabs,
} from '../../../../design-system/components';
import { BezentIcon } from '../../../../design-system/icons';
import { fetchOrganizationMasters } from '../../api/organizationMastersApi';
import { fetchLeaveTypes } from '../../settings/leave/api/leaveTypesApi';
import { LeaveStatGrid, type LeaveStatTone } from '../../settings/leave/LeaveStatGrid';
import { leaveOperationsApi } from '../api/leaveOperationsApi';
import type { LeaveReport, LeaveReportId, LeaveReportQuery } from '../types/leaveOperations.types';

type Option = { id: string; name: string };

const REPORT_TABS: Array<{ id: LeaveReportId; label: string }> = [
  { id: 'utilisation', label: 'Utilisation' },
  { id: 'lop', label: 'LOP for Payroll' },
  { id: 'liability', label: 'Balance Liability' },
  { id: 'absenteeism', label: 'Absenteeism Trend' },
  { id: 'approval_sla', label: 'Approval SLA' },
  { id: 'audit', label: 'Audit Trail' },
];

const SUMMARY_TONES: LeaveStatTone[] = ['blue', 'green', 'purple', 'red'];

const formatCell = (value: string | number | null, numeric: boolean) => {
  if (value === null || value === '') return '—';
  return numeric && typeof value === 'number' ? value.toLocaleString('en-IN') : String(value);
};

export interface LeaveReportsPageProps {
  initialReport?: LeaveReport;
}

export function LeaveReportsPage({ initialReport }: LeaveReportsPageProps = {}) {
  const [reportId, setReportId] = useState<LeaveReportId>(initialReport?.reportId ?? 'utilisation');
  const [query, setQuery] = useState<LeaveReportQuery>({});
  const [report, setReport] = useState<LeaveReport | null>(initialReport ?? null);
  const [loading, setLoading] = useState(!initialReport);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [departments, setDepartments] = useState<Option[]>([]);
  const [locations, setLocations] = useState<Option[]>([]);
  const [types, setTypes] = useState<Option[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setReport(await leaveOperationsApi.report(reportId, query));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load the report');
    } finally {
      setLoading(false);
    }
  }, [reportId, query]);

  useEffect(() => {
    if (!initialReport) void load();
  }, [initialReport, load]);

  useEffect(() => {
    fetchOrganizationMasters()
      .then((m) => {
        setDepartments(m.departments);
        setLocations(m.locations);
      })
      .catch(() => undefined);
    // Managers without settings access simply get no leave-type filter.
    fetchLeaveTypes({ limit: 100 })
      .then((res) => setTypes(res.items.map((t) => ({ id: t.id, name: t.name }))))
      .catch(() => setTypes([]));
  }, []);

  const update = (patch: Partial<LeaveReportQuery>) => setQuery((q) => ({ ...q, ...patch }));
  const usesLeaveType = reportId !== 'approval_sla' && reportId !== 'audit';

  const exportCsv = async () => {
    setExporting(true);
    setError(null);
    try {
      await leaveOperationsApi.downloadReportCsv(reportId, query);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export the report');
    } finally {
      setExporting(false);
    }
  };

  return (
    <Page>
      <PageHeader
        eyebrow="HRMS · Leave"
        title="Leave Reports"
        subtitle="Utilisation, payroll LOP, liability, absenteeism, approval SLA and the audit trail"
        actions={
          <Button
            variant="primary"
            leftIcon={<BezentIcon name="download" size={16} />}
            disabled={exporting || !report}
            onClick={() => void exportCsv()}
          >
            {exporting ? 'Exporting...' : 'Export CSV'}
          </Button>
        }
      />

      <Stack gap="lg">
        <Tabs
          variant="pills"
          items={REPORT_TABS}
          activeId={reportId}
          onChange={(id) => setReportId(id as LeaveReportId)}
        />

        <Card variant="flat" padding="md">
          <Grid columns={usesLeaveType ? 5 : 4} gap="md">
            <LocaleDatePicker
              label="From"
              value={query.from ?? report?.range.from ?? ''}
              onChange={(d) => update({ from: d || undefined })}
            />
            <LocaleDatePicker
              label="To"
              value={query.to ?? report?.range.to ?? ''}
              minDate={query.from ?? report?.range.from}
              onChange={(d) => update({ to: d || undefined })}
            />
            <Select
              label="Department"
              value={query.departmentId ?? ''}
              onChange={(e) => update({ departmentId: e.target.value || undefined })}
              options={[
                { value: '', label: 'All departments' },
                ...departments.map((d) => ({ value: d.id, label: d.name })),
              ]}
            />
            <Select
              label="Location"
              value={query.locationId ?? ''}
              onChange={(e) => update({ locationId: e.target.value || undefined })}
              options={[
                { value: '', label: 'All locations' },
                ...locations.map((l) => ({ value: l.id, label: l.name })),
              ]}
            />
            {usesLeaveType && (
              <Select
                label="Leave type"
                value={query.leaveTypeId ?? ''}
                onChange={(e) => update({ leaveTypeId: e.target.value || undefined })}
                options={[
                  { value: '', label: 'All leave types' },
                  ...types.map((t) => ({ value: t.id, label: t.name })),
                ]}
              />
            )}
          </Grid>
        </Card>

        {error && (
          <Alert variant="error" title="Report error" dismissible onDismiss={() => setError(null)}>
            {error}
          </Alert>
        )}

        {loading && !report ? (
          <LoadingState label="Running report..." />
        ) : !report ? null : (
          <>
            <LeaveStatGrid
              stats={report.summary.map((s, i) => ({
                label: s.label,
                value: s.value,
                caption: `${report.range.from} → ${report.range.to}`,
                tone: SUMMARY_TONES[i % SUMMARY_TONES.length],
              }))}
            />

            {report.truncated && (
              <Alert variant="warning">
                Showing the latest {report.rows.length} events. Narrow the date range or export to
                see a smaller window in full.
              </Alert>
            )}

            <Card padding="none">
              <Stack gap="none">
                <Card variant="flat" padding="md">
                  <CardHeader>
                    <Stack gap="none">
                      <CardTitle>{report.title}</CardTitle>
                      <CardDescription>{report.description}</CardDescription>
                    </Stack>
                  </CardHeader>
                </Card>
                {report.rows.length === 0 ? (
                  <EmptyState
                    title="No data for this range"
                    description="Widen the date range or clear the filters."
                  />
                ) : (
                  <Table compact>
                    <TableHead>
                      <TableRow>
                        {report.columns.map((c) => (
                          <TableHeaderCell key={c.key}>{c.label}</TableHeaderCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {report.rows.map((row, i) => (
                        <TableRow key={i}>
                          {report.columns.map((c) => (
                            <TableCell key={c.key}>
                              {c.key === report.columns[0]!.key ? (
                                <strong>{formatCell(row[c.key] ?? null, c.numeric)}</strong>
                              ) : (
                                formatCell(row[c.key] ?? null, c.numeric)
                              )}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </Stack>
            </Card>
          </>
        )}
      </Stack>
    </Page>
  );
}

export default LeaveReportsPage;
