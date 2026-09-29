import { useState, useEffect, useCallback } from 'react';
import {
  Page,
  PageHeader,
  Card,
  Stack,
  Inline,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeaderCell,
  TableCell,
  Badge,
  Button,
  Alert,
  LoadingState,
  EmptyState,
} from '../../../design-system/components';
import { BezentIcon } from '../../../design-system/icons';
import { useCompanyAdmin } from '../context/CompanyAdminContext';
import { CompanyContextBar } from '../components/CompanyContextBar';
import {
  companyAdminApi,
  type InvitationItem,
} from '../api/companyAdminApi';

export function CompanyInvitationsPage() {
  const { activeCompanyId, activeCompany } = useCompanyAdmin();
  const [invitations, setInvitations] = useState<InvitationItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const fetchInvitations = useCallback(async () => {
    if (!activeCompanyId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await companyAdminApi.listInvitations(activeCompanyId);
      setInvitations(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load invitations');
    } finally {
      setLoading(false);
    }
  }, [activeCompanyId]);

  useEffect(() => {
    fetchInvitations();
  }, [fetchInvitations]);

  const handleResend = async (id: string, email: string) => {
    if (!activeCompanyId) return;
    setError(null);
    setSuccess(null);
    setActionNotice(null);

    try {
      const res = await companyAdminApi.resendInvitation(id, activeCompanyId);
      setSuccess(`Invitation token refreshed for ${email}.`);
      if (res.notice) {
        setActionNotice(`${res.notice} Updated Token: ${res.invitation.token}`);
      }
      fetchInvitations();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to resend invitation');
    }
  };

  const handleCancel = async (id: string, email: string) => {
    if (!activeCompanyId) return;
    if (!window.confirm(`Are you sure you want to cancel the pending invitation for ${email}?`)) {
      return;
    }

    setError(null);
    setSuccess(null);
    try {
      const res = await companyAdminApi.cancelInvitation(id, activeCompanyId);
      setSuccess(res.message);
      fetchInvitations();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to cancel invitation');
    }
  };

  return (
    <Page>
      <PageHeader
        title="Pending Invitations"
        subtitle={`Outstanding user invites and invitation tokens for ${activeCompany?.name || 'Company'}`}
        actions={
          <Button
            variant="secondary"
            onClick={fetchInvitations}
            leftIcon={<BezentIcon name="refresh" size={16} color="currentColor" />}
          >
            Refresh
          </Button>
        }
      />

      <CompanyContextBar onCompanyChange={() => fetchInvitations()} />

      {error && (
        <Alert variant="error" title="Error">
          {error}
        </Alert>
      )}

      {success && (
        <Alert variant="success" title="Success">
          {success}
        </Alert>
      )}

      {actionNotice && (
        <Alert variant="info" title="Dispatch Information">
          {actionNotice}
        </Alert>
      )}

      <Stack gap="md">
        {loading && invitations.length === 0 ? (
          <LoadingState label="Loading invitation ledger..." />
        ) : invitations.length === 0 ? (
          <Card>
            <EmptyState
              title="No Invitations Found"
              description="There are currently no active or pending invitations for this company."
            />
          </Card>
        ) : (
          <Card>
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Email</TableHeaderCell>
                  <TableHeaderCell>Role</TableHeaderCell>
                  <TableHeaderCell>Status</TableHeaderCell>
                  <TableHeaderCell>Expires At</TableHeaderCell>
                  <TableHeaderCell>Created</TableHeaderCell>
                  <TableHeaderCell>Secure Token</TableHeaderCell>
                  <TableHeaderCell>Actions</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {invitations.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell>
                      <strong>{inv.email}</strong>
                    </TableCell>
                    <TableCell>
                      <Badge variant="neutral">
                        {inv.role.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          inv.status === 'pending'
                            ? 'warning'
                            : inv.status === 'accepted'
                            ? 'success'
                            : 'neutral'
                        }
                      >
                        {inv.status.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(inv.expiresAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {new Date(inv.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <code>{inv.token.substring(0, 12)}...</code>
                    </TableCell>
                    <TableCell>
                      {inv.status === 'pending' ? (
                        <Inline gap="xs">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleResend(inv.id, inv.email)}
                          >
                            Resend
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCancel(inv.id, inv.email)}
                          >
                            Cancel
                          </Button>
                        </Inline>
                      ) : (
                        <span className="bezent-metric-label">Completed</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </Stack>
    </Page>
  );
}
