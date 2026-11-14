import React, { useState } from 'react';
import {
  Card,
  Button,
  Stack,
  Inline,
  Grid,
  Badge,
  BezentIcon,
  Alert,
} from '../../../../../design-system';
import type { ProcessImportResult } from '../../api/employeeImportApi';
import { downloadErrorReport } from '../../api/employeeImportApi';

interface ImportStepResultsProps {
  result: ProcessImportResult;
  onReset: () => void;
  onNavigateDirectory: () => void;
  onNavigateHistory: () => void;
}

export const ImportStepResults: React.FC<ImportStepResultsProps> = ({
  result,
  onReset,
  onNavigateDirectory,
  onNavigateHistory,
}) => {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownloadErrors = async () => {
    try {
      setIsDownloading(true);
      const blob = await downloadErrorReport(result.importId);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `error-report-${result.importId}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download error report:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  const hasIssues = result.errorRecords > 0 || result.skippedRecords > 0;

  return (
    <Stack gap="xl">
      {result.status === 'completed' && !hasIssues ? (
        <Alert variant="success" title="Import Completed Successfully">
          All {result.importedRecords} employee records were created and are now active in the
          Workforce Directory!
        </Alert>
      ) : (
        <Alert variant="warning" title="Import Completed with Warnings">
          {result.importedRecords} employee records created. {result.skippedRecords} duplicate
          records were skipped. {result.errorRecords} records failed.
        </Alert>
      )}

      {/* Metrics Grid */}
      <Grid columns={4} gap="md">
        <Card variant="flat" padding="lg">
          <Stack gap="xs">
            <span className="bezent-text-secondary bezent-font-semibold">Total Records</span>
            <span className="bezent-heading-lg">{result.totalRecords}</span>
            <span className="bezent-text-muted bezent-text-sm">Processed file rows</span>
          </Stack>
        </Card>

        <Card variant="default" padding="lg">
          <Stack gap="xs">
            <Inline justify="between" align="center">
              <span className="bezent-font-semibold">Successfully Created</span>
              <Badge variant="success">Imported</Badge>
            </Inline>
            <span className="bezent-heading-lg bezent-text-success">{result.importedRecords}</span>
            <span className="bezent-text-muted bezent-text-sm">New employee profiles in DB</span>
          </Stack>
        </Card>

        <Card variant="default" padding="lg">
          <Stack gap="xs">
            <Inline justify="between" align="center">
              <span className="bezent-font-semibold">Duplicates Skipped</span>
              <Badge variant="warning">Skipped</Badge>
            </Inline>
            <span className="bezent-heading-lg bezent-text-warning">{result.skippedRecords}</span>
            <span className="bezent-text-muted bezent-text-sm">Pre-existing employees</span>
          </Stack>
        </Card>

        <Card variant="default" padding="lg">
          <Stack gap="xs">
            <Inline justify="between" align="center">
              <span className="bezent-font-semibold">Failed Records</span>
              <Badge variant="danger">Errors</Badge>
            </Inline>
            <span className="bezent-heading-lg bezent-text-danger">{result.errorRecords}</span>
            <span className="bezent-text-muted bezent-text-sm">Unresolved format/data errors</span>
          </Stack>
        </Card>
      </Grid>

      {/* Actions */}
      <Card variant="default" padding="lg">
        <Stack align="center" gap="lg">
          <Inline gap="md" wrap>
            <Button variant="primary" size="lg" onClick={onNavigateDirectory}>
              <BezentIcon name="users" size={18} />
              View Employee Directory
            </Button>

            {hasIssues && (
              <Button
                variant="outline"
                size="lg"
                loading={isDownloading}
                onClick={handleDownloadErrors}
              >
                <BezentIcon name="download" size={18} />
                Download Error Report (CSV)
              </Button>
            )}

            <Button variant="secondary" size="lg" onClick={onReset}>
              <BezentIcon name="add" size={18} />
              Import Another File
            </Button>

            <Button variant="ghost" size="lg" onClick={onNavigateHistory}>
              <BezentIcon name="history" size={18} />
              View Import History
            </Button>
          </Inline>
        </Stack>
      </Card>
    </Stack>
  );
};
