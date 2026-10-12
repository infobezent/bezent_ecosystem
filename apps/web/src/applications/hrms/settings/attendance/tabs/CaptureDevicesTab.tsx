import { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  Grid,
  Input,
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
import {
  fetchAttendanceDevices,
  registerAttendanceDevice,
  testAttendanceDeviceConnection,
  fetchImportBatches,
  submitBulkImport,
  rollbackImportBatch,
} from '../../../attendance/api/attendanceApi';
import type {
  AttendanceDevice,
  AttendanceImportBatch,
  DeviceInput,
  DeviceTestResult,
} from '../../../attendance/types/attendance.types';

export function CaptureDevicesTab() {
  const [loading, setLoading] = useState(true);
  const [devices, setDevices] = useState<AttendanceDevice[]>([]);
  const [importBatches, setImportBatches] = useState<AttendanceImportBatch[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Device Modal
  const [isDeviceModalOpen, setIsDeviceModalOpen] = useState(false);
  const [deviceName, setDeviceName] = useState('');
  const [deviceCode, setDeviceCode] = useState('');
  const [deviceType, setDeviceType] = useState<DeviceInput['deviceType']>('biometric_fingerprint');
  const [ipAddress, setIpAddress] = useState('');
  const [port, setPort] = useState(4370);
  const [serialNumber, setSerialNumber] = useState('');
  const [registering, setRegistering] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ id: string; res: DeviceTestResult } | null>(null);

  // Import Modal
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [batchType, setBatchType] = useState<'raw_punches' | 'historical_summary'>('raw_punches');
  const [csvContent, setCsvContent] = useState('');
  const [fileName, setFileName] = useState('attendance_import.csv');
  const [importing, setImporting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [devList, batches] = await Promise.all([
        fetchAttendanceDevices(),
        fetchImportBatches(),
      ]);
      setDevices(devList);
      setImportBatches(batches);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load capture & devices data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRegisterDevice = async () => {
    if (!deviceName || !deviceCode) {
      setError('Device name and code are required');
      return;
    }
    setRegistering(true);
    setError(null);
    try {
      await registerAttendanceDevice({
        deviceName,
        deviceCode,
        deviceType,
        ipAddress: ipAddress || null,
        port: port || null,
        serialNumber: serialNumber || null,
      });
      setSuccess(`Device "${deviceName}" registered successfully.`);
      setIsDeviceModalOpen(false);
      setDeviceName('');
      setDeviceCode('');
      setIpAddress('');
      await loadData();
      setTimeout(() => setSuccess(null), 4000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to register device');
    } finally {
      setRegistering(false);
    }
  };

  const handleTestDevice = async (deviceId: string) => {
    setTestingId(deviceId);
    setError(null);
    try {
      const res = await testAttendanceDeviceConnection(deviceId);
      setTestResult({ id: deviceId, res });
      await loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to test device connectivity');
    } finally {
      setTestingId(null);
    }
  };

  const handleProcessImport = async () => {
    if (!csvContent.trim()) {
      setError('Please provide CSV data rows to import');
      return;
    }
    setImporting(true);
    setError(null);
    try {
      const lines = csvContent.trim().split('\n');
      const headers = lines[0]?.split(',').map((h) => h.trim()) || [];
      const rows: Array<Record<string, unknown>> = [];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i]?.trim();
        if (!line) continue;
        const values = line.split(',').map((v) => v.trim());
        const rowObj: Record<string, unknown> = {};
        headers.forEach((h, idx) => {
          rowObj[h] = values[idx] || '';
        });
        rows.push(rowObj);
      }

      await submitBulkImport({
        batchType,
        fileName,
        rows,
      });
      setSuccess(`Import batch processed (${rows.length} rows evaluated).`);
      setIsImportModalOpen(false);
      setCsvContent('');
      await loadData();
      setTimeout(() => setSuccess(null), 4000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  const handleRollbackBatch = async (batchId: string) => {
    if (!window.confirm('Are you sure you want to rollback and reverse this import batch?')) return;
    setError(null);
    try {
      await rollbackImportBatch(batchId);
      setSuccess('Import batch successfully reversed.');
      await loadData();
      setTimeout(() => setSuccess(null), 4000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to rollback batch');
    }
  };

  if (loading) {
    return <LoadingState label="Loading Attendance Hardware & Capture Devices..." />;
  }

  return (
    <Stack gap="lg">
      {error && <Alert variant="error">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}

      {/* Hardware Terminals */}
      <Card variant="flat">
        <CardHeader>
          <Inline justify="between" align="center">
            <CardTitle>Hardware Terminals & Biometric Devices</CardTitle>
            <Button variant="primary" size="sm" onClick={() => setIsDeviceModalOpen(true)}>
              Register Terminal
            </Button>
          </Inline>
        </CardHeader>
        <Table hoverable>
          <TableHead>
            <TableRow>
              <TableHeaderCell>Terminal</TableHeaderCell>
              <TableHeaderCell>Type</TableHeaderCell>
              <TableHeaderCell>Host (IP:Port)</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
              <TableHeaderCell>Heartbeat</TableHeaderCell>
              <TableHeaderCell>Action</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {devices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6}>
                  <div className="bezent-text-center bezent-text-secondary">
                    No hardware terminals registered yet.
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              devices.map((d) => (
                <TableRow key={d.id}>
                  <TableCell>
                    <div>
                      <strong>{d.deviceName}</strong>
                      <div>
                        <code>{d.deviceCode}</code>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="neutral" size="sm">
                      {d.deviceType.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {d.ipAddress ? `${d.ipAddress}:${d.port || 4370}` : 'Cloud Push'}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        d.status === 'online'
                          ? 'success'
                          : d.status === 'testing'
                            ? 'info'
                            : 'danger'
                      }
                      size="sm"
                    >
                      {d.status.toUpperCase()}
                    </Badge>
                    {testResult?.id === d.id && (
                      <div className="bezent-text-hint">
                        {testResult.res.latencyMs}ms — {testResult.res.message}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {d.lastHeartbeatAt ? new Date(d.lastHeartbeatAt).toLocaleTimeString() : 'Never'}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleTestDevice(d.id)}
                      disabled={testingId === d.id}
                    >
                      {testingId === d.id ? 'Testing...' : 'Test Ping'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Migration & Ingestion Batches */}
      <Card variant="flat">
        <CardHeader>
          <Inline justify="between" align="center">
            <CardTitle>Attendance Ingestion & Import Batches</CardTitle>
            <Button variant="outline" size="sm" onClick={() => setIsImportModalOpen(true)}>
              Import CSV Data
            </Button>
          </Inline>
        </CardHeader>
        <Table hoverable>
          <TableHead>
            <TableRow>
              <TableHeaderCell>File & Type</TableHeaderCell>
              <TableHeaderCell>Total</TableHeaderCell>
              <TableHeaderCell>Success</TableHeaderCell>
              <TableHeaderCell>Failed</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
              <TableHeaderCell>Date</TableHeaderCell>
              <TableHeaderCell>Action</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {importBatches.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7}>
                  <div className="bezent-text-center bezent-text-secondary">
                    No bulk import batches processed yet.
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              importBatches.map((b) => (
                <TableRow key={b.id}>
                  <TableCell>
                    <div>
                      <strong>{b.fileName}</strong>
                      <div>
                        <Badge variant="neutral" size="sm">
                          {b.batchType.replace('_', ' ')}
                        </Badge>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{b.totalRows}</TableCell>
                  <TableCell>
                    <span className="bezent-text-success">{b.successRows}</span>
                  </TableCell>
                  <TableCell>
                    {b.failedRows > 0 ? (
                      <span className="bezent-text-danger">{b.failedRows}</span>
                    ) : (
                      0
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        b.status === 'completed'
                          ? 'success'
                          : b.status === 'reversed'
                            ? 'warning'
                            : 'danger'
                      }
                      size="sm"
                    >
                      {b.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{new Date(b.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell>
                    {b.status === 'completed' && (
                      <Button variant="ghost" size="sm" onClick={() => handleRollbackBatch(b.id)}>
                        Revert Batch
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Register Device Modal */}
      <Modal
        isOpen={isDeviceModalOpen}
        onClose={() => setIsDeviceModalOpen(false)}
        title="Register Attendance Terminal"
        size="md"
        footer={
          <Inline justify="end" gap="sm">
            <Button variant="outline" onClick={() => setIsDeviceModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleRegisterDevice} disabled={registering}>
              {registering ? 'Registering...' : 'Register Device'}
            </Button>
          </Inline>
        }
      >
        <Stack gap="md">
          <Grid columns={2} gap="md">
            <div>
              <label className="bezent-label">Device Name</label>
              <Input
                value={deviceName}
                onChange={(e) => setDeviceName(e.target.value)}
                placeholder="e.g. HQ Reception Biometric"
              />
            </div>
            <div>
              <label className="bezent-label">Device Code</label>
              <Input
                value={deviceCode}
                onChange={(e) => setDeviceCode(e.target.value)}
                placeholder="e.g. BIO-HQ-01"
              />
            </div>
          </Grid>

          <Grid columns={2} gap="md">
            <div>
              <label className="bezent-label">Device Type</label>
              <Select
                value={deviceType}
                onChange={(e) => setDeviceType(e.target.value as DeviceInput['deviceType'])}
                options={[
                  { value: 'biometric_fingerprint', label: 'Biometric Fingerprint Scanner' },
                  { value: 'biometric_facial', label: 'Biometric Facial Recognition Terminal' },
                  { value: 'rfid_card', label: 'RFID Proximity Card Reader' },
                  { value: 'mobile_kiosk', label: 'Mobile Android/iOS Kiosk' },
                  { value: 'web_terminal', label: 'Fixed Web Terminal' },
                ]}
              />
            </div>
            <div>
              <label className="bezent-label">Serial Number</label>
              <Input
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value)}
                placeholder="e.g. SN-8823901"
              />
            </div>
          </Grid>

          <Grid columns={2} gap="md">
            <div>
              <label className="bezent-label">IP Address / Gateway Host</label>
              <Input
                value={ipAddress}
                onChange={(e) => setIpAddress(e.target.value)}
                placeholder="e.g. 192.168.1.100"
              />
            </div>
            <div>
              <label className="bezent-label">TCP / UDP Port</label>
              <Input
                type="number"
                value={port}
                onChange={(e) => setPort(Number(e.target.value))}
                placeholder="4370"
              />
            </div>
          </Grid>
        </Stack>
      </Modal>

      {/* Bulk Import Modal */}
      <Modal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        title="Import Attendance Records"
        size="lg"
        footer={
          <Inline justify="end" gap="sm">
            <Button variant="outline" onClick={() => setIsImportModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleProcessImport} disabled={importing}>
              {importing ? 'Processing Import...' : 'Execute Ingestion'}
            </Button>
          </Inline>
        }
      >
        <Stack gap="md">
          <Grid columns={2} gap="md">
            <div>
              <label className="bezent-label">Ingestion Mode</label>
              <Select
                value={batchType}
                onChange={(e) =>
                  setBatchType(e.target.value as 'raw_punches' | 'historical_summary')
                }
                options={[
                  { value: 'raw_punches', label: 'Raw Punches (Timestamp events)' },
                  { value: 'historical_summary', label: 'Historical Daily Summary Records' },
                ]}
              />
            </div>
            <div>
              <label className="bezent-label">File Name Reference</label>
              <Input
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                placeholder="e.g. biometric_oct2026.csv"
              />
            </div>
          </Grid>

          <div>
            <label className="bezent-label">CSV Data Input (Header row required)</label>
            <textarea
              className="bezent-input"
              rows={8}
              value={csvContent}
              onChange={(e) => setCsvContent(e.target.value)}
              placeholder={`employeeId,timestamp,punchType\nEMP-1001,2026-10-01 09:00:00,in\nEMP-1001,2026-10-01 18:00:00,out`}
            />
            <span className="bezent-text-hint">
              Columns supported: employeeId, date/timestamp, punchType, status
            </span>
          </div>
        </Stack>
      </Modal>
    </Stack>
  );
}
