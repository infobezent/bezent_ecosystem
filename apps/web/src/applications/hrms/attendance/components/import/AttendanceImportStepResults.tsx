import React, { useState } from 'react';
import { Card, Button, Stack, Inline, Grid, Alert, BezentIcon } from '../../../../../design-system';
import type { ProcessPunchImportResult } from '../../api/attendanceImportApi';

interface AttendanceImportStepResultsProps {
  result: ProcessPunchImportResult;
  onReset: () => void;
  onNavigateDaily: () => void;
  onNavigatePunchLogs: () => void;
}

export const AttendanceImportStepResults: React.FC<AttendanceImportStepResultsProps> = ({
  result,
  onReset,
  onNavigateDaily,
  onNavigatePunchLogs,
}) => {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownloadErrors = () => {
    if (!result.errorLog || result.errorLog.length === 0) return;
    try {
      setIsDownloading(true);
      const header = 'Row,Reason\n';
      const csv =
        header +
        result.errorLog.map((e) => `${e.row},"${e.reason.replace(/"/g, '""')}"`).join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `import-errors-${result.batchId}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download error log:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  const hasIssues = result.errorRecords > 0 || result.skippedRecords > 0;

  return (
    <Stack gap="xl">
      {result.status === 'completed' && !hasIssues ? (
        <Alert variant="success" title="Punches Imported Successfully">
          All {result.importedRecords} punches were successfully ingested! Daily attendance and
          reconciliation have been updated automatically.
        </Alert>
      ) : (
        <Alert variant="warning" title="Import Completed with Warnings">
          {result.importedRecords} punches imported successfully. {result.skippedRecords} duplicate
          records were skipped. {result.errorRecords} records failed.
        </Alert>
      )}

      {/* Metrics Grid */}
      <Grid columns={4} gap="md">
        <Card variant="flat" padding="lg">
          <Stack gap="xs">
            <span className="bezent-text-secondary bezent-font-semibold bezent-text-xs">
              Total Records
            </span>
            <span className="bezent-heading-lg">{result.totalRecords}</span>
          </Stack>
        </Card>

        <Card variant="flat" padding="lg">
          <Stack gap="xs">
            <span className="bezent-text-success bezent-font-semibold bezent-text-xs">
              Imported Punches
            </span>
            <span className="bezent-heading-lg bezent-text-success">{result.importedRecords}</span>
          </Stack>
        </Card>

        <Card variant="flat" padding="lg">
          <Stack gap="xs">
            <span className="bezent-text-warning bezent-font-semibold bezent-text-xs">
              Duplicates Skipped
            </span>
            <span className="bezent-heading-lg bezent-text-warning">{result.skippedRecords}</span>
          </Stack>
        </Card>

        <Card variant="flat" padding="lg">
          <Stack gap="xs">
            <span className="bezent-text-danger bezent-font-semibold bezent-text-xs">
              Failed Rows
            </span>
            <span className="bezent-heading-lg bezent-text-danger">{result.errorRecords}</span>
          </Stack>
        </Card>
      </Grid>

      {/* Error Action Strip if errors exist */}
      {result.errorLog && result.errorLog.length > 0 && (
        <Card variant="default" padding="md">
          <Inline justify="between" align="center" wrap>
            <Stack gap="xs">
              <span className="bezent-font-semibold bezent-text-sm bezent-text-primary">
                Download Failed Rows Report
              </span>
              <span className="bezent-text-secondary bezent-text-xs">
                Contains {result.errorLog.length} rows that could not be processed with failure
                reasons.
              </span>
            </Stack>
            <Button
              variant="outline"
              size="sm"
              shape="rounded"
              leftIcon={<BezentIcon name="download" size={14} />}
              onClick={handleDownloadErrors}
              disabled={isDownloading}
            >
              Download Error Log (.csv)
            </Button>
          </Inline>
        </Card>
      )}

      {/* Footer Navigation Actions */}
      <Inline justify="between" align="center" wrap>
        <Button variant="ghost" size="md" onClick={onReset}>
          Import Another File
        </Button>

        <Inline gap="sm">
          <Button variant="secondary" size="md" shape="rounded" onClick={onNavigateDaily}>
            View Daily Attendance
          </Button>
          <Button variant="primary" size="md" shape="rounded" onClick={onNavigatePunchLogs}>
            View Punch Logs →
          </Button>
        </Inline>
      </Inline>
    </Stack>
  );
};
