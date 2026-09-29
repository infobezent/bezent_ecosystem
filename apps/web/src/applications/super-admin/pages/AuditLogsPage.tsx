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
  Button,
  Input,
  Select,
  Alert,
  LoadingState,
  EmptyState,
  Modal,
  Toolbar,
} from '../../../design-system/components';
import { BezentIcon } from '../../../design-system/icons';
import { superAdminApi, type AuditLogEntry, type TenantRecord } from '../api/superAdminApi';

export function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [tenants, setTenants] = useState<TenantRecord[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedTenantId, setSelectedTenantId] = useState<string>('all');
  const [actionFilter, setActionFilter] = useState<string>('');

  // Metadata Inspection Modal
  const [activeMetadata, setActiveMetadata] = useState<Record<string, unknown> | null>(null);
  const [metadataTitle, setMetadataTitle] = useState<string>('');

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [logsRes, tenantsRes] = await Promise.all([
        superAdminApi.listAuditLogs({
          tenantId: selectedTenantId !== 'all' ? selectedTenantId : undefined,
          action: actionFilter.trim() || undefined,
          limit: 50,
        }),
        superAdminApi.listTenants({ limit: 100 }),
      ]);
      setLogs(logsRes.items);
      setTotal(logsRes.total);
      setTenants(tenantsRes.items);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  }, [selectedTenantId, actionFilter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return (
    <Page>
      <PageHeader
        title="Administrative Audit Logs"
        subtitle="Immutable ledger of administrative platform actions, lifecycle changes and entitlements"
      />

      {error && (
        <Alert variant="error" title="Error" onDismiss={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Card>
        <Stack gap="md">
          {/* Toolbar */}
          <Toolbar
            left={
              <Inline gap="md" align="center">
                <Select
                  value={selectedTenantId}
                  onChange={(e) => setSelectedTenantId(e.target.value)}
                  options={[
                    { value: 'all', label: 'All Customer Tenants' },
                    ...tenants.map((t) => ({ value: t.id, label: `${t.name} (${t.code})` })),
                  ]}
                />
                <Input
                  placeholder="Filter by action (e.g. tenant_created)..."
                  value={actionFilter}
                  onChange={(e) => setActionFilter(e.target.value)}
                />
              </Inline>
            }
            right={
              <Button
                variant="secondary"
                size="sm"
                onClick={fetchLogs}
                leftIcon={<BezentIcon name="refresh" size={14} color="currentColor" />}
              >
                Refresh
              </Button>
            }
          />

          {loading && <LoadingState label="Loading audit logs..." />}

          {!loading && logs.length === 0 && (
            <EmptyState
              title="No audit events found"
              description="No administrative activities have been recorded matching this filter."
            />
          )}

          {!loading && logs.length > 0 && (
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Action</TableHeaderCell>
                  <TableHeaderCell>Target</TableHeaderCell>
                  <TableHeaderCell>Tenant Context</TableHeaderCell>
                  <TableHeaderCell>Actor</TableHeaderCell>
                  <TableHeaderCell>Timestamp</TableHeaderCell>
                  <TableHeaderCell>Metadata</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <code>{log.action}</code>
                    </TableCell>
                    <TableCell>
                      <Stack gap="xs">
                        <span className="bezent-caption">{log.targetType}</span>
                        <strong>{log.targetId}</strong>
                      </Stack>
                    </TableCell>
                    <TableCell>{log.tenantId || 'Platform-wide'}</TableCell>
                    <TableCell>
                      <Stack gap="xs">
                        <span>{log.actorEmail || 'System Process'}</span>
                        {log.actorUserId && (
                          <span className="bezent-caption">{log.actorUserId}</span>
                        )}
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Stack gap="xs">
                        <span>{new Date(log.createdAt).toLocaleDateString()}</span>
                        <span className="bezent-caption">
                          {new Date(log.createdAt).toLocaleTimeString()}
                        </span>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      {log.metadata && Object.keys(log.metadata).length > 0 ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setActiveMetadata(log.metadata);
                            setMetadataTitle(`${log.action} (${log.targetType}:${log.targetId})`);
                          }}
                        >
                          View Details
                        </Button>
                      ) : (
                        <span className="bezent-caption">None</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {!loading && total > 0 && (
            <span className="bezent-caption">
              Showing {logs.length} of {total} audit records
            </span>
          )}
        </Stack>
      </Card>

      {/* Metadata View Modal */}
      <Modal
        isOpen={Boolean(activeMetadata)}
        onClose={() => setActiveMetadata(null)}
        title={metadataTitle}
        description="Sanitized event parameters and audit context"
        footer={
          <Button variant="secondary" onClick={() => setActiveMetadata(null)}>
            Close
          </Button>
        }
      >
        {activeMetadata && (
          <pre className="bezent-code-block">{JSON.stringify(activeMetadata, null, 2)}</pre>
        )}
      </Modal>
    </Page>
  );
}
