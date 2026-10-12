import { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  Grid,
  Select,
  Stack,
  Inline,
  Button,
  Badge,
  Alert,
  LoadingState,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeaderCell,
  TableCell,
  Modal,
} from '../../../../../design-system/components';
import { fetchSettingsAuditLogs } from '../../../attendance/api/attendanceApi';
import type { AttendanceSettingsAuditLog } from '../../../attendance/types/attendance.types';

export function AuditHistoryTab() {
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<AttendanceSettingsAuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [selectedLog, setSelectedLog] = useState<AttendanceSettingsAuditLog | null>(null);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchSettingsAuditLogs({
        category: categoryFilter === 'all' ? undefined : categoryFilter,
        limit: 50,
      });
      setLogs(res.items);
      setTotal(res.total);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load audit history');
    } finally {
      setLoading(false);
    }
  }, [categoryFilter]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const handleExportJson = () => {
    const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_settings_audit_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  };

  if (loading && logs.length === 0) {
    return <LoadingState label="Loading Attendance Settings Audit Trail..." />;
  }

  return (
    <Stack gap="lg">
      {error && <Alert variant="error">{error}</Alert>}

      <Card variant="flat">
        <CardHeader>
          <Inline justify="between" align="center">
            <CardTitle>Configuration Audit Trail</CardTitle>
            <Inline gap="sm">
              <Button variant="outline" size="sm" onClick={handleExportJson}>
                Export JSON
              </Button>
              <Button variant="ghost" size="sm" onClick={loadLogs}>
                Refresh
              </Button>
            </Inline>
          </Inline>
        </CardHeader>
        <Stack gap="md">
          <Inline justify="between" align="center">
            <div>
              <Select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                options={[
                  { value: 'all', label: 'All Settings Domains' },
                  { value: 'general', label: 'General Configuration' },
                  { value: 'policy', label: 'Attendance Policies' },
                  { value: 'regularization', label: 'Regularization Settings' },
                  { value: 'capture_device', label: 'Devices & Imports' },
                  { value: 'location_security', label: 'Location & Security' },
                  { value: 'payroll_locking', label: 'Payroll & Locking' },
                ]}
              />
            </div>
            <span className="bezent-text-secondary">{total} total changes recorded</span>
          </Inline>

          <Table hoverable>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Timestamp</TableHeaderCell>
                <TableHeaderCell>Domain</TableHeaderCell>
                <TableHeaderCell>Action</TableHeaderCell>
                <TableHeaderCell>Attribution</TableHeaderCell>
                <TableHeaderCell>Details</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5}>
                    <div className="bezent-text-center bezent-text-secondary">
                      No audit events recorded matching criteria.
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>{new Date(log.createdAt).toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          log.category === 'policy'
                            ? 'info'
                            : log.category === 'payroll_locking'
                              ? 'warning'
                              : 'neutral'
                        }
                        size="sm"
                      >
                        {log.category.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <strong>{log.action.replace('_', ' ')}</strong>
                      {log.entityType && <div className="bezent-text-hint">{log.entityType}</div>}
                    </TableCell>
                    <TableCell>
                      <div>User: {log.changedByUserId || 'system'}</div>
                      {log.clientIp && <div className="bezent-text-hint">IP: {log.clientIp}</div>}
                    </TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm" onClick={() => setSelectedLog(log)}>
                        View Diff
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Stack>
      </Card>

      {/* Snapshot Diff Modal */}
      <Modal
        isOpen={Boolean(selectedLog)}
        onClose={() => setSelectedLog(null)}
        title={`Audit Event Inspection — ${selectedLog?.action}`}
        size="lg"
        footer={
          <Inline justify="end">
            <Button variant="outline" onClick={() => setSelectedLog(null)}>
              Close
            </Button>
          </Inline>
        }
      >
        <Stack gap="md">
          {selectedLog && (
            <>
              <Grid columns={2} gap="md">
                <div>
                  <strong>Category:</strong> {selectedLog.category}
                </div>
                <div>
                  <strong>Recorded:</strong> {new Date(selectedLog.createdAt).toLocaleString()}
                </div>
                <div>
                  <strong>Changed By:</strong> {selectedLog.changedByUserId || 'System Actor'}
                </div>
                <div>
                  <strong>Network IP:</strong> {selectedLog.clientIp || 'Internal Gateway'}
                </div>
              </Grid>

              <Grid columns={2} gap="md">
                <Card variant="flat">
                  <CardHeader>
                    <CardTitle>Previous State</CardTitle>
                  </CardHeader>
                  <pre className="bezent-pre">
                    {selectedLog.previousValues
                      ? JSON.stringify(selectedLog.previousValues, null, 2)
                      : '(No previous state / Initial creation)'}
                  </pre>
                </Card>

                <Card variant="flat">
                  <CardHeader>
                    <CardTitle>New Modified State</CardTitle>
                  </CardHeader>
                  <pre className="bezent-pre">
                    {selectedLog.newValues
                      ? JSON.stringify(selectedLog.newValues, null, 2)
                      : '(Snapshot recorded)'}
                  </pre>
                </Card>
              </Grid>
            </>
          )}
        </Stack>
      </Modal>
    </Stack>
  );
}
