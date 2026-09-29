import { useState, useEffect, useCallback } from 'react';
import {
  Page,
  PageHeader,
  Section,
  Badge,
  Button,
  Alert,
  LoadingState,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeaderCell,
  TableCell,
  EmptyState,
} from '../../../design-system/components';
import { essApi, type EssRequest } from '../api/essApi';

export function EssRequestsPage() {
  const [requests, setRequests] = useState<EssRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await essApi.getRequests();
      setRequests(data.requests);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load requests');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCancel = async (id: string) => {
    setCancellingId(id);
    try {
      await essApi.cancelRequest(id);
      setSuccessMsg('Request cancelled successfully.');
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to cancel request');
    } finally {
      setCancellingId(null);
    }
  };

  if (loading) return <LoadingState label="Loading requests..." />;
  if (error) return <Alert variant="error" title="Error">{error}</Alert>;

  const typeLabel = (t: EssRequest['requestType']): string =>
    t.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  return (
    <Page>
      <PageHeader
        title="My Requests"
        subtitle="All HR service requests including profile changes, attendance regularizations and general requests"
      />

      {successMsg && <Alert variant="success" title="Done">{successMsg}</Alert>}

      <Section title="Request Ledger">
        {requests.length === 0 ? (
          <EmptyState
            title="No Requests"
            description="All your HR service requests will appear here. Use specific modules (Profile, Attendance) to raise requests."
          />
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Type</TableHeaderCell>
                <TableHeaderCell>Subject</TableHeaderCell>
                <TableHeaderCell>Status</TableHeaderCell>
                <TableHeaderCell>Submitted</TableHeaderCell>
                <TableHeaderCell>Actions</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {requests.map((req) => (
                <TableRow key={req.id}>
                  <TableCell>
                    <Badge variant="neutral">{typeLabel(req.requestType)}</Badge>
                  </TableCell>
                  <TableCell>{req.subject}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        req.status === 'approved' ? 'success' :
                        req.status === 'rejected' ? 'danger' :
                        req.status === 'cancelled' ? 'neutral' : 'warning'
                      }
                    >{req.status.charAt(0).toUpperCase() + req.status.slice(1)}</Badge>
                  </TableCell>
                  <TableCell>{new Date(req.createdAt).toLocaleDateString('en-IN')}</TableCell>
                  <TableCell>
                    {req.status === 'pending' && (
                      <Button
                        id={`cancel-req-${req.id}`}
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCancel(req.id)}
                        loading={cancellingId === req.id}
                      >Cancel</Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Section>
    </Page>
  );
}
