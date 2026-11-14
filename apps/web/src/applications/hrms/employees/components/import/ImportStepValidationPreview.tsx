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
import type { ValidationSummary, ImportRowItem } from '../../api/employeeImportApi';
import { downloadErrorReport } from '../../api/employeeImportApi';

interface ImportStepValidationPreviewProps {
  summary: ValidationSummary;
  onReplaceFile: () => void;
  onConfirmImport: () => void;
  isProcessing: boolean;
}

export const ImportStepValidationPreview: React.FC<ImportStepValidationPreviewProps> = ({
  summary,
  onReplaceFile,
  onConfirmImport,
  isProcessing,
}) => {
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

  const filteredRows = summary.rows.filter((row: ImportRowItem) => {
    if (activeTab === 'all') return true;
    return row.status === activeTab;
  });

  const handleDownloadErrors = async () => {
    try {
      setIsDownloadingReport(true);
      const blob = await downloadErrorReport(summary.id);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `error-report-${summary.id}.csv`;
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

  const hasIssues = summary.errorRecords > 0 || summary.duplicateRecords > 0;

  return (
    <Stack gap="xl">
      <Stack gap="xs">
        <h3 className="bezent-heading-md">Step 03 – Employee Data Validation & Preview</h3>
        <p className="bezent-text-secondary">
          Review your employee records and automated validation results before creating employee
          profiles.
        </p>
      </Stack>

      {/* Metric Summary Cards */}
      <Grid columns={4} gap="md">
        <Card variant="flat" padding="lg">
          <Stack gap="xs">
            <span className="bezent-text-secondary bezent-font-semibold">Total Records</span>
            <span className="bezent-heading-lg">{summary.totalRecords}</span>
            <span className="bezent-text-muted bezent-text-sm">Total uploaded rows</span>
          </Stack>
        </Card>

        <Card variant="default" padding="lg">
          <Stack gap="xs">
            <Inline justify="between" align="center">
              <span className="bezent-font-semibold">Ready to Import</span>
              <Badge variant="success">Eligible</Badge>
            </Inline>
            <span className="bezent-heading-lg bezent-text-success">{summary.validRecords}</span>
            <span className="bezent-text-muted bezent-text-sm">Valid new employee records</span>
          </Stack>
        </Card>

        <Card variant="default" padding="lg">
          <Stack gap="xs">
            <Inline justify="between" align="center">
              <span className="bezent-font-semibold">Invalid Records</span>
              <Badge variant="danger">Errors</Badge>
            </Inline>
            <span className="bezent-heading-lg bezent-text-danger">{summary.errorRecords}</span>
            <span className="bezent-text-muted bezent-text-sm">
              Records with format/missing errors
            </span>
          </Stack>
        </Card>

        <Card variant="default" padding="lg">
          <Stack gap="xs">
            <Inline justify="between" align="center">
              <span className="bezent-font-semibold">Duplicate Records</span>
              <Badge variant="warning">Duplicates</Badge>
            </Inline>
            <span className="bezent-heading-lg bezent-text-warning">
              {summary.duplicateRecords}
            </span>
            <span className="bezent-text-muted bezent-text-sm">Existing or repeated employees</span>
          </Stack>
        </Card>
      </Grid>

      {/* Validation Notices */}
      {hasIssues ? (
        <Alert variant="warning" title="Validation Issues Detected">
          {summary.errorRecords > 0
            ? `${summary.errorRecords} record(s) contain validation errors and will NOT be imported. `
            : ''}
          {summary.duplicateRecords > 0
            ? `${summary.duplicateRecords} record(s) are duplicates and will be skipped per configuration. `
            : ''}
          You can download the Error Report to view and correct them, or continue importing the{' '}
          {summary.validRecords} valid records.
        </Alert>
      ) : (
        <Alert variant="success" title="Validation Successful">
          All {summary.validRecords} employee records passed structural, mandatory, duplicate, and
          reference checks with 0 errors!
        </Alert>
      )}

      {/* Table with Filter Tabs */}
      <Card variant="default" padding="lg">
        <Stack gap="md">
          <Tabs
            items={filterTabs}
            activeId={activeTab}
            onChange={(id: string) => setActiveTab(id)}
          />

          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Row</TableHeaderCell>
                <TableHeaderCell>Employee Name</TableHeaderCell>
                <TableHeaderCell>Employee ID</TableHeaderCell>
                <TableHeaderCell>Work Email</TableHeaderCell>
                <TableHeaderCell>Department / Location</TableHeaderCell>
                <TableHeaderCell>Status</TableHeaderCell>
                <TableHeaderCell>Issues & Remarks</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredRows.map((row: ImportRowItem) => (
                <TableRow key={`${row.rowNumber}-${row.employeeNumber || row.workEmail}`}>
                  <TableCell>
                    <span>#{row.rowNumber}</span>
                  </TableCell>
                  <TableCell>
                    <strong>{row.employeeName || '—'}</strong>
                  </TableCell>
                  <TableCell>
                    <span>{row.employeeNumber || 'Auto-generated'}</span>
                  </TableCell>
                  <TableCell>
                    <span>{row.workEmail || '—'}</span>
                  </TableCell>
                  <TableCell>
                    <span>
                      {row.department || '—'}
                      {row.workLocation ? ` (${row.workLocation})` : ''}
                    </span>
                  </TableCell>
                  <TableCell>
                    {row.status === 'valid' && <Badge variant="success">Valid</Badge>}
                    {row.status === 'duplicate' && <Badge variant="warning">Duplicate</Badge>}
                    {row.status === 'error' && <Badge variant="danger">Error</Badge>}
                  </TableCell>
                  <TableCell>
                    {!row.issues || row.issues.length === 0 ? (
                      <span className="bezent-text-secondary">Ready for import</span>
                    ) : (
                      <Stack gap="xs">
                        {row.issues.map((issue, idx: number) => (
                          <Inline key={idx} gap="xs" align="center">
                            <Badge
                              variant={
                                issue.category === 'required'
                                  ? 'danger'
                                  : issue.category === 'duplicate'
                                    ? 'warning'
                                    : 'neutral'
                              }
                            >
                              {issue.category.toUpperCase()}
                            </Badge>
                            <span className="bezent-text-sm">
                              <strong>{issue.field}:</strong> {issue.message}
                            </span>
                          </Inline>
                        ))}
                      </Stack>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Stack>
      </Card>

      {/* Actions Toolbar */}
      <Inline justify="between" align="center">
        <Inline gap="sm">
          <Button variant="secondary" onClick={onReplaceFile} disabled={isProcessing}>
            <BezentIcon name="refresh" size={16} />
            Replace File
          </Button>

          {hasIssues && (
            <Button
              variant="outline"
              onClick={handleDownloadErrors}
              loading={isDownloadingReport}
              disabled={isProcessing}
            >
              <BezentIcon name="download" size={16} />
              Download Error Report (CSV)
            </Button>
          )}
        </Inline>

        <Inline gap="md">
          <Button
            variant="primary"
            size="lg"
            disabled={summary.validRecords === 0 || isProcessing}
            loading={isProcessing}
            onClick={onConfirmImport}
          >
            <BezentIcon name="check" size={18} />
            Continue with Valid Records ({summary.validRecords})
          </Button>
        </Inline>
      </Inline>
    </Stack>
  );
};
