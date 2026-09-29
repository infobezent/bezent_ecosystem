import { useState, useEffect, useCallback } from 'react';
import {
  Page,
  PageHeader,
  Section,
  Card,
  Stack,
  Inline,
  Badge,
  Button,
  Alert,
  LoadingState,
  Toolbar,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeaderCell,
  TableCell,
  Modal,
  FormSection,
  FormGrid,
} from '../../../design-system/components';
import { BezentIcon } from '../../../design-system/icons';
import { essApi, type EssAttendanceRecord, type EssTodayAttendance } from '../api/essApi';

type AttendanceWorkspace = {
  today: EssTodayAttendance & { notes?: string | null };
  history: EssAttendanceRecord[];
};

export function EssAttendancePage() {
  const [workspace, setWorkspace] = useState<AttendanceWorkspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [punchLoading, setPunchLoading] = useState(false);
  const [punchError, setPunchError] = useState<string | null>(null);
  const [punchSuccess, setPunchSuccess] = useState<string | null>(null);
  const [regularizeOpen, setRegularizeOpen] = useState(false);
  const [regDate, setRegDate] = useState('');
  const [regCheckIn, setRegCheckIn] = useState('');
  const [regCheckOut, setRegCheckOut] = useState('');
  const [regReason, setRegReason] = useState('');
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);
  const [regSuccess, setRegSuccess] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await essApi.getAttendance();
      setWorkspace(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load attendance');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCheckIn = async () => {
    setPunchLoading(true);
    setPunchError(null);
    setPunchSuccess(null);
    try {
      await essApi.checkIn({ workLocation: 'office' });
      setPunchSuccess('Checked in successfully!');
      await load();
    } catch (err: unknown) {
      setPunchError(err instanceof Error ? err.message : 'Check-in failed');
    } finally {
      setPunchLoading(false);
    }
  };

  const handleCheckOut = async () => {
    setPunchLoading(true);
    setPunchError(null);
    setPunchSuccess(null);
    try {
      await essApi.checkOut();
      setPunchSuccess('Checked out successfully!');
      await load();
    } catch (err: unknown) {
      setPunchError(err instanceof Error ? err.message : 'Check-out failed');
    } finally {
      setPunchLoading(false);
    }
  };

  const handleRegularize = async () => {
    setRegLoading(true);
    setRegError(null);
    try {
      await essApi.regularizeAttendance({ date: regDate, checkInTime: regCheckIn, checkOutTime: regCheckOut, reason: regReason });
      setRegSuccess(true);
      setRegularizeOpen(false);
    } catch (err: unknown) {
      setRegError(err instanceof Error ? err.message : 'Regularization failed');
    } finally {
      setRegLoading(false);
    }
  };

  if (loading) return <LoadingState label="Loading attendance..." />;
  if (error) return <Alert variant="error" title="Error">{error}</Alert>;
  if (!workspace) return null;

  const today = workspace.today;
  const hasPunchedIn = !!today.checkInTime;
  const hasPunchedOut = !!today.checkOutTime;

  return (
    <Page>
      <PageHeader
        title="Attendance"
        subtitle="Daily check-in, attendance history and regularization requests"
        actions={
          <Button
            id="ess-attendance-regularize-btn"
            variant="secondary"
            leftIcon={<BezentIcon name="edit" size={16} />}
            onClick={() => setRegularizeOpen(true)}
          >Regularize Attendance</Button>
        }
      />

      {punchError && <Alert variant="error" title="Error">{punchError}</Alert>}
      {punchSuccess && <Alert variant="success" title="Success">{punchSuccess}</Alert>}
      {regSuccess && <Alert variant="success" title="Request Submitted">Your attendance regularization request has been submitted.</Alert>}

      {/* Today's Status */}
      <Section title="Today's Status" subtitle={today.date}>
        <Card>
          <Inline gap="lg" align="center" justify="between">
            <Stack gap="sm">
              <Inline gap="sm" align="center">
                <BezentIcon name="attendance" size={20} />
                <Stack gap="xs">
                  {hasPunchedIn ? (
                    <span>Checked in at <strong>{today.checkInTime}</strong></span>
                  ) : (
                    <span>Not checked in today</span>
                  )}
                  {hasPunchedOut && (
                    <span>Checked out at <strong>{today.checkOutTime}</strong></span>
                  )}
                </Stack>
              </Inline>
              <Badge
                variant={today.status === 'present' ? 'success' : today.status === 'not_checked_in' ? 'neutral' : 'warning'}
              >{today.status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</Badge>
            </Stack>
            <Inline gap="sm">
              {!hasPunchedIn && (
                <Button id="att-check-in" variant="primary" onClick={handleCheckIn} loading={punchLoading}>Check In</Button>
              )}
              {hasPunchedIn && !hasPunchedOut && (
                <Button id="att-check-out" variant="secondary" onClick={handleCheckOut} loading={punchLoading}>Check Out</Button>
              )}
              {hasPunchedIn && hasPunchedOut && (
                <Badge variant="success">Complete</Badge>
              )}
            </Inline>
          </Inline>
        </Card>
      </Section>

      {/* Attendance History */}
      <Section title="Attendance History">
        <Toolbar
          left={<span>Last 60 days</span>}
        />
        {workspace.history.length === 0 ? (
          <Alert variant="info" title="No Records">No attendance records found for the past 60 days.</Alert>
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Date</TableHeaderCell>
                <TableHeaderCell>Check In</TableHeaderCell>
                <TableHeaderCell>Check Out</TableHeaderCell>
                <TableHeaderCell>Location</TableHeaderCell>
                <TableHeaderCell>Status</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {workspace.history.map((rec) => (
                <TableRow key={rec.id}>
                  <TableCell>{rec.date}</TableCell>
                  <TableCell>{rec.checkInTime ?? '—'}</TableCell>
                  <TableCell>{rec.checkOutTime ?? '—'}</TableCell>
                  <TableCell>{rec.workLocation}</TableCell>
                  <TableCell>
                    <Badge
                      variant={rec.status === 'present' ? 'success' : rec.status === 'absent' ? 'danger' : 'warning'}
                    >{rec.status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Section>

      {/* Regularization Modal */}
      <Modal
        isOpen={regularizeOpen}
        title="Attendance Regularization Request"
        onClose={() => setRegularizeOpen(false)}
        footer={
          <Inline gap="sm">
            <Button id="reg-cancel" variant="secondary" onClick={() => setRegularizeOpen(false)}>Cancel</Button>
            <Button id="reg-submit" variant="primary" onClick={handleRegularize} loading={regLoading}>Submit Request</Button>
          </Inline>
        }
      >
        <Stack gap="md">
          {regError && <Alert variant="error" title="Error">{regError}</Alert>}
          <FormSection title="Regularization Details">
            <FormGrid columns={1}>
              <label>Date<input type="date" value={regDate} onChange={e => setRegDate(e.target.value)} /></label>
              <label>Check-In Time<input type="time" value={regCheckIn} onChange={e => setRegCheckIn(e.target.value)} /></label>
              <label>Check-Out Time<input type="time" value={regCheckOut} onChange={e => setRegCheckOut(e.target.value)} /></label>
              <label>Reason<textarea value={regReason} onChange={e => setRegReason(e.target.value)} rows={3} placeholder="Reason for regularization" /></label>
            </FormGrid>
          </FormSection>
        </Stack>
      </Modal>
    </Page>
  );
}
