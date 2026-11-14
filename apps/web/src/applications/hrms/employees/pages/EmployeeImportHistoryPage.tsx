import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Page,
  PageHeader,
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
  EmptyState,
  LoadingState,
} from '../../../../design-system';
import {
  fetchImportHistory,
  downloadErrorReport,
  type EmployeeImportRecord,
} from '../api/employeeImportApi';

export const EmployeeImportHistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const [history, setHistory] = useState<EmployeeImportRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchImportHistory();
      setHistory(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch import history.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadErrors = async (importId: string) => {
    try {
      setDownloadingId(importId);
      const blob = await downloadErrorReport(importId);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `error-report-${importId}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download error report error:', err);
    } finally {
      setDownloadingId(null);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const completedCount = history.filter((h) => h.status === 'completed').length;
  const withErrorsCount = history.filter((h) => h.status === 'completed_with_errors').length;
  const failedCount = history.filter((h) => h.status === 'failed').length;

  return (
    <Page>
      <PageHeader
        title="Import History"
        subtitle="Audit log of employee bulk import batches, record counts, and error reports."
        actions={
          <Inline gap="sm">
            <Button variant="primary" onClick={() => navigate('/hrms/workforce/employees/import')}>
              <BezentIcon name="upload" size={16} />
              New Import
            </Button>
            <Button variant="outline" onClick={() => navigate('/hrms/workforce/employees')}>
              <BezentIcon name="users" size={16} />
              Employee Directory
            </Button>
          </Inline>
        }
      />

      <Stack gap="lg">
        {/* Metric Summary Cards */}
        <Grid columns={4} gap="md">
          <Card variant="flat" padding="lg">
            <Stack gap="xs">
              <span className="bezent-text-secondary bezent-font-semibold">Total Imports</span>
              <span className="bezent-heading-lg">{history.length}</span>
              <span className="bezent-text-muted bezent-text-sm">Recorded bulk batches</span>
            </Stack>
          </Card>

          <Card variant="default" padding="lg">
            <Stack gap="xs">
              <Inline justify="between" align="center">
                <span className="bezent-font-semibold">Completed</span>
                <Badge variant="success">Clean</Badge>
              </Inline>
              <span className="bezent-heading-lg bezent-text-success">{completedCount}</span>
              <span className="bezent-text-muted bezent-text-sm">Zero errors during creation</span>
            </Stack>
          </Card>

          <Card variant="default" padding="lg">
            <Stack gap="xs">
              <Inline justify="between" align="center">
                <span className="bezent-font-semibold">With Errors</span>
                <Badge variant="warning">Partial</Badge>
              </Inline>
              <span className="bezent-heading-lg bezent-text-warning">{withErrorsCount}</span>
              <span className="bezent-text-muted bezent-text-sm">
                Valid rows imported, errors skipped
              </span>
            </Stack>
          </Card>

          <Card variant="default" padding="lg">
            <Stack gap="xs">
              <Inline justify="between" align="center">
                <span className="bezent-font-semibold">Failed</span>
                <Badge variant="danger">Failed</Badge>
              </Inline>
              <span className="bezent-heading-lg bezent-text-danger">{failedCount}</span>
              <span className="bezent-text-muted bezent-text-sm">Batches not processed</span>
            </Stack>
          </Card>
        </Grid>

        {/* History Table */}
        <Card variant="default" padding="lg">
          {loading ? (
            <LoadingState label="Loading import history..." />
          ) : error ? (
            <EmptyState
              title="Failed to Load History"
              description={error}
              primaryAction={{
                label: 'Retry',
                onClick: loadHistory,
              }}
            />
          ) : history.length === 0 ? (
            <EmptyState
              title="No Import History Found"
              description="You have not uploaded any bulk employee import files yet. Download the official template to get started."
              primaryAction={{
                label: 'Start First Import',
                onClick: () => navigate('/hrms/workforce/employees/import'),
              }}
            />
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Import Date & Time</TableHeaderCell>
                  <TableHeaderCell>File Name</TableHeaderCell>
                  <TableHeaderCell>Format & Size</TableHeaderCell>
                  <TableHeaderCell>Status</TableHeaderCell>
                  <TableHeaderCell>Records (Total / OK / Errors)</TableHeaderCell>
                  <TableHeaderCell>Actions</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {history.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <Stack gap="xs">
                        <strong>{new Date(row.createdAt).toLocaleDateString()}</strong>
                        <span className="bezent-text-secondary bezent-text-sm">
                          {new Date(row.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <strong>{row.fileName}</strong>
                    </TableCell>
                    <TableCell>
                      <span>
                        {row.fileFormat.toUpperCase()} ({formatFileSize(row.fileSize)})
                      </span>
                    </TableCell>
                    <TableCell>
                      {row.status === 'completed' && <Badge variant="success">Completed</Badge>}
                      {row.status === 'completed_with_errors' && (
                        <Badge variant="warning">With Errors</Badge>
                      )}
                      {row.status === 'failed' && <Badge variant="danger">Failed</Badge>}
                      {row.status === 'validated' && <Badge variant="info">Validated</Badge>}
                      {row.status !== 'completed' &&
                        row.status !== 'completed_with_errors' &&
                        row.status !== 'failed' &&
                        row.status !== 'validated' && <Badge variant="neutral">{row.status}</Badge>}
                    </TableCell>
                    <TableCell>
                      <span>
                        {row.totalRecords} /{' '}
                        <strong className="bezent-text-success">{row.importedRecords}</strong> /{' '}
                        <span className="bezent-text-danger">{row.errorRecords}</span>
                      </span>
                    </TableCell>
                    <TableCell>
                      {row.errorRecords > 0 || row.duplicateRecords > 0 ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          loading={downloadingId === row.id}
                          onClick={() => handleDownloadErrors(row.id)}
                        >
                          <BezentIcon name="download" size={14} />
                          Error Report
                        </Button>
                      ) : (
                        <span className="bezent-text-muted">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </Stack>
    </Page>
  );
};
