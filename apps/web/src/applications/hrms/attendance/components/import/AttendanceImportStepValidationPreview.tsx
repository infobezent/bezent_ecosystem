import React, { useState } from 'react';
import {
  Card,
  Button,
  Stack,
  Inline,
  Grid,
  Badge,
  BezentIcon,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeaderCell,
  TableCell,
  Tabs,
  type TabItem,
  Alert,
} from '../../../../../design-system';
import type { PunchValidationSummary, PunchImportRowItem } from '../../api/attendanceImportApi';
import { downloadPunchErrorReport } from '../../api/attendanceImportApi';

interface AttendanceImportStepValidationPreviewProps {
  summary: PunchValidationSummary;
  onReplaceFile: () => void;
  onConfirmImport: () => void;
  isProcessing: boolean;
}

export const AttendanceImportStepValidationPreview: React.FC<
  AttendanceImportStepValidationPreviewProps
> = ({ summary, onReplaceFile, onConfirmImport, isProcessing }) => {
  const [activeTab, setActiveTab] = useState<string>('all');
  const [isDownloadingReport, setIsDownloadingReport] = useState(false);

  const filterTabs: TabItem[] = [
    {
      id: 'all',
      label: `All Records (${summary.totalRecords})`,
    },
    {
      id: 'valid',
      label: `Valid Records (${summary.validRecords})`,
    },
    {
      id: 'error',
      label: `Errors (${summary.errorRecords})`,
    },
    {
      id: 'duplicate',
      label: `Duplicates (${summary.duplicateRecords})`,
    },
  ];

  const filteredRows = summary.rows.filter((row: PunchImportRowItem) => {
    if (activeTab === 'all') return true;
    return row.status === activeTab;
  });

  const handleDownloadErrors = () => {
    try {
      setIsDownloadingReport(true);
      const invalidRows = summary.rows.filter(
        (r) => r.status === 'error' || r.status === 'duplicate',
      );
      const blob = downloadPunchErrorReport(invalidRows);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `punch-import-errors-${summary.fileName}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download error report error:', err);
    } finally {
      setIsDownloadingReport(false);
    }
  };

  const hasErrors = summary.errorRecords > 0;
  const canProceed = summary.validRecords > 0;

  return (
    <Stack gap="lg">
      {/* Overview Stat Cards */}
      <Grid columns={4} gap="md">
        <Card variant="flat" padding="md">
          <Stack gap="xs">
            <span className="bezent-text-secondary bezent-font-semibold bezent-text-xs">
              Total Rows
            </span>
            <span className="bezent-heading-md">{summary.totalRecords}</span>
          </Stack>
        </Card>

        <Card variant="flat" padding="md">
          <Stack gap="xs">
            <span className="bezent-text-success bezent-font-semibold bezent-text-xs">
              Valid Punches
            </span>
            <span className="bezent-heading-md bezent-text-success">{summary.validRecords}</span>
          </Stack>
        </Card>

        <Card variant="flat" padding="md">
          <Stack gap="xs">
            <span className="bezent-text-danger bezent-font-semibold bezent-text-xs">
              Error Rows
            </span>
            <span className="bezent-heading-md bezent-text-danger">{summary.errorRecords}</span>
          </Stack>
        </Card>

        <Card variant="flat" padding="md">
          <Stack gap="xs">
            <span className="bezent-text-warning bezent-font-semibold bezent-text-xs">
              Duplicates
            </span>
            <span className="bezent-heading-md bezent-text-warning">
              {summary.duplicateRecords}
            </span>
          </Stack>
        </Card>
      </Grid>

      {/* Warning/Alert Banner */}
      {hasErrors && (
        <Alert variant="warning" title="Some rows require correction">
          {summary.errorRecords} rows have invalid format or missing values. You can either import
          only the {summary.validRecords} valid records now, or download the error report, correct
          the file, and re-upload.
        </Alert>
      )}

      {/* Tabs & Table Header Actions */}
      <Inline justify="between" align="center" wrap>
        <Tabs items={filterTabs} activeId={activeTab} onChange={setActiveTab} variant="pills" />
        {hasErrors && (
          <Button
            variant="outline"
            size="sm"
            shape="rounded"
            leftIcon={<BezentIcon name="download" size={14} />}
            onClick={handleDownloadErrors}
            disabled={isDownloadingReport}
          >
            Download Error Report
          </Button>
        )}
      </Inline>

      {/* Preview Table */}
      <Card variant="default" padding="none">
        <div className="bezent-table-scroll-container">
          <Table hoverable>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Row</TableHeaderCell>
                <TableHeaderCell>Employee ID</TableHeaderCell>
                <TableHeaderCell>Punch Time</TableHeaderCell>
                <TableHeaderCell>Direction</TableHeaderCell>
                <TableHeaderCell>Validation Status</TableHeaderCell>
                <TableHeaderCell>Issues / Reason</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6}>
                    <div className="bezent-table-empty-row">
                      <span className="bezent-text-secondary">
                        No records match this view filter.
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredRows.slice(0, 50).map((row) => (
                  <TableRow key={`row-${row.rowNumber}`}>
                    <TableCell>
                      <span className="bezent-text-muted">#{row.rowNumber}</span>
                    </TableCell>
                    <TableCell>
                      <span className="bezent-font-medium">{row.employeeId || '—'}</span>
                    </TableCell>
                    <TableCell>
                      <span className="bezent-text-mono bezent-text-xs">
                        {row.punchTime || '—'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={row.punchType === 'in' ? 'success' : 'neutral'} size="sm">
                        {row.punchType.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {row.status === 'valid' && (
                        <Badge variant="success" size="sm">
                          Valid
                        </Badge>
                      )}
                      {row.status === 'error' && (
                        <Badge variant="danger" size="sm">
                          Error
                        </Badge>
                      )}
                      {row.status === 'duplicate' && (
                        <Badge variant="warning" size="sm">
                          Duplicate
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {row.issues.length > 0 ? (
                        <span className="bezent-text-danger bezent-text-xs">
                          {row.issues.join(', ')}
                        </span>
                      ) : (
                        <span className="bezent-text-success bezent-text-xs">
                          Ready for ingestion
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        {filteredRows.length > 50 && (
          <div className="bezent-table-pagination-strip">
            <span className="bezent-text-xs bezent-text-muted">
              Showing first 50 of {filteredRows.length} records in preview.
            </span>
          </div>
        )}
      </Card>

      {/* Footer Actions */}
      <Inline justify="between" align="center">
        <Button variant="ghost" size="md" onClick={onReplaceFile} disabled={isProcessing}>
          ← Choose Different File
        </Button>
        <Button
          variant="primary"
          size="md"
          shape="rounded"
          disabled={!canProceed || isProcessing}
          onClick={onConfirmImport}
        >
          {isProcessing ? 'Importing Records...' : `Import ${summary.validRecords} Valid Punches`}
        </Button>
      </Inline>
    </Stack>
  );
};
