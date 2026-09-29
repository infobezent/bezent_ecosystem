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
  Toolbar,
  Select,
} from '../../../design-system/components';
import { BezentIcon } from '../../../design-system/icons';
import { useCompanyAdmin } from '../context/CompanyAdminContext';
import { CompanyContextBar } from '../components/CompanyContextBar';
import {
  companyAdminApi,
  type CompanyAuditLogItem,
} from '../api/companyAdminApi';

export function CompanyAuditLogsPage() {
  const { activeCompanyId, activeCompany } = useCompanyAdmin();
  const [logs, setLogs] = useState<CompanyAuditLogItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [targetTypeFilter, setTargetTypeFilter] = useState<string>('all');

  const fetchLogs = useCallback(async () => {
    if (!activeCompanyId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await companyAdminApi.listAuditLogs(
        {
          action: actionFilter !== 'all' ? actionFilter : undefined,
          targetType: targetTypeFilter !== 'all' ? targetTypeFilter : undefined,
          limit: 100,
        },
        activeCompanyId,
      );
      setLogs(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load company audit logs');
    } finally {
      setLoading(false);
    }
  }, [activeCompanyId, actionFilter, targetTypeFilter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return (
    <Page>
      <PageHeader
        title="Company Audit Ledger"
        subtitle={`Immutable ledger of administrative actions strictly scoped to ${activeCompany?.name || 'Company'}`}
        actions={
          <Button
            variant="secondary"
            onClick={fetchLogs}
            leftIcon={<BezentIcon name="refresh" size={16} color="currentColor" />}
          >
            Refresh
          </Button>
        }
      />

      <CompanyContextBar onCompanyChange={() => fetchLogs()} />

      {error && (
        <Alert variant="error" title="Error">
          {error}
        </Alert>
      )}

      <Stack gap="md">
        {/* Filter Toolbar */}
        <Card>
          <Toolbar
            left={
              <Inline gap="sm" wrap align="center">
                <Select
                  id="filter-audit-action"
                  value={actionFilter}
                  onChange={(e) => setActionFilter(e.target.value)}
                  options={[
                    { value: 'all', label: 'All Actions' },
                    { value: 'COMPANY_PROFILE_UPDATED', label: 'Profile Updated' },
                    { value: 'USER_INVITED', label: 'User Invited' },
                    { value: 'INVITATION_RESENT', label: 'Invitation Resent' },
                    { value: 'INVITATION_CANCELLED', label: 'Invitation Cancelled' },
                    { value: 'USER_ROLE_UPDATED', label: 'Role Updated' },
                    { value: 'USER_MEMBERSHIP_STATUS_UPDATED', label: 'Status Updated' },
                    { value: 'USER_MEMBERSHIP_REVOKED', label: 'Membership Revoked' },
                    { value: 'COMPANY_MODULE_STATUS_UPDATED', label: 'Module Toggled' },
                  ]}
                />

                <Select
                  id="filter-audit-target"
                  value={targetTypeFilter}
                  onChange={(e) => setTargetTypeFilter(e.target.value)}
                  options={[
                    { value: 'all', label: 'All Target Types' },
                    { value: 'company', label: 'Company' },
                    { value: 'invitation', label: 'Invitation' },
                    { value: 'user_membership', label: 'User Membership' },
                    { value: 'company_module', label: 'Company Module' },
                  ]}
                />
              </Inline>
            }
            right={
              <Badge variant="neutral">
                Records Displayed: {logs.length}
              </Badge>
            }
          />
        </Card>

        {loading && logs.length === 0 ? (
          <LoadingState label="Loading company audit ledger..." />
        ) : logs.length === 0 ? (
          <Card>
            <EmptyState
              title="No Audit Records"
              description="No administrative activities have been logged matching your selected filters."
            />
          </Card>
        ) : (
          <Card>
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Action</TableHeaderCell>
                  <TableHeaderCell>Target</TableHeaderCell>
                  <TableHeaderCell>Actor</TableHeaderCell>
                  <TableHeaderCell>IP Address</TableHeaderCell>
                  <TableHeaderCell>Metadata</TableHeaderCell>
                  <TableHeaderCell>Timestamp</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <Badge variant="info">{log.action}</Badge>
                    </TableCell>
                    <TableCell>
                      <Stack gap="none">
                        <strong>{log.targetType}</strong>
                        <span className="bezent-metric-label">{log.targetId}</span>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Stack gap="none">
                        <span>{log.actorEmail || 'System Actor'}</span>
                        {log.actorRole && (
                          <span className="bezent-metric-label">Role: {log.actorRole}</span>
                        )}
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <code>{log.ipAddress || '—'}</code>
                    </TableCell>
                    <TableCell>
                      {log.metadata ? (
                        <code>{JSON.stringify(log.metadata)}</code>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell>
                      {new Date(log.createdAt).toLocaleString()}
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
