import { useState, useEffect, useCallback, useMemo } from 'react';
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
  Select,
  Alert,
  LoadingState,
  EmptyState,
  Modal,
  Toolbar,
  Badge,
  Divider,
} from '../../../design-system/components';
import { BezentIcon } from '../../../design-system/icons';
import { superAdminApi, type AuditLogEntry, type TenantRecord } from '../api/superAdminApi';
import {
  formatAuditAction,
  getAuditActionBadgeVariant,
  resolveAuditTarget,
  resolveAuditContext,
  formatAuditTimestamp,
  CANONICAL_AUDIT_FILTER_OPTIONS,
} from '../utils/auditFormatters';

const PAGE_SIZE = 20;

export function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [tenants, setTenants] = useState<TenantRecord[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedTenantId, setSelectedTenantId] = useState<string>('all');
  const [selectedAction, setSelectedAction] = useState<string>('all');
  const [page, setPage] = useState<number>(1);

  // Active Audit Detail Modal
  const [activeLog, setActiveLog] = useState<AuditLogEntry | null>(null);

  // Fast tenant lookup map for target & context enrichment
  const tenantMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const t of tenants) {
      map.set(t.id, t.name);
    }
    return map;
  }, [tenants]);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [logsRes, tenantsRes] = await Promise.all([
        superAdminApi.listAuditLogs({
          tenantId: selectedTenantId !== 'all' ? selectedTenantId : undefined,
          action: selectedAction !== 'all' ? selectedAction : undefined,
          page,
          limit: PAGE_SIZE,
        }),
        tenants.length === 0
          ? superAdminApi.listTenants({ limit: 100 })
          : Promise.resolve({ items: tenants, total: tenants.length }),
      ]);
      setLogs(logsRes.items);
      setTotal(logsRes.total);
      if (tenants.length === 0 && tenantsRes.items) {
        setTenants(tenantsRes.items);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  }, [selectedTenantId, selectedAction, page, tenants]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Handle filter changes (resets page to 1)
  const handleTenantChange = (tenantId: string) => {
    setSelectedTenantId(tenantId);
    setPage(1);
  };

  const handleActionChange = (action: string) => {
    setSelectedAction(action);
    setPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <Page>
      <PageHeader
        title="Administrative Audit Logs"
        subtitle="Review administrative actions, access changes, customer lifecycle events, and application entitlement activity across BEZENT."
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
                  onChange={(e) => handleTenantChange(e.target.value)}
                  options={[
                    { value: 'all', label: 'All Customers' },
                    ...tenants.map((t) => ({ value: t.id, label: `${t.name} (${t.code})` })),
                  ]}
                />
                <Select
                  value={selectedAction}
                  onChange={(e) => handleActionChange(e.target.value)}
                  options={CANONICAL_AUDIT_FILTER_OPTIONS}
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
                  <TableHeaderCell>Event</TableHeaderCell>
                  <TableHeaderCell>Target</TableHeaderCell>
                  <TableHeaderCell>Customer / Scope</TableHeaderCell>
                  <TableHeaderCell>Actor</TableHeaderCell>
                  <TableHeaderCell>Timestamp</TableHeaderCell>
                  <TableHeaderCell>Details</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {logs.map((log) => {
                  const target = resolveAuditTarget(log, tenantMap);
                  const context = resolveAuditContext(log, tenantMap);
                  const timestamp = formatAuditTimestamp(log.createdAt);

                  return (
                    <TableRow key={log.id}>
                      {/* EVENT */}
                      <TableCell>
                        <Stack gap="xs">
                          <Inline gap="xs" align="center">
                            <Badge variant={getAuditActionBadgeVariant(log.action)}>
                              {formatAuditAction(log.action)}
                            </Badge>
                          </Inline>
                        </Stack>
                      </TableCell>

                      {/* TARGET */}
                      <TableCell>
                        <Stack gap="xs">
                          <strong>{target.label}</strong>
                          <span className="bezent-caption">{target.type}</span>
                        </Stack>
                      </TableCell>

                      {/* CUSTOMER / SCOPE */}
                      <TableCell>
                        <Stack gap="xs">
                          <span>{context.customer}</span>
                          {context.company && (
                            <span className="bezent-caption">{context.company}</span>
                          )}
                        </Stack>
                      </TableCell>

                      {/* ACTOR */}
                      <TableCell>
                        <Stack gap="xs">
                          <span>{log.actorEmail || 'System'}</span>
                          {log.actorUserId && (
                            <span className="bezent-caption">{log.actorUserId}</span>
                          )}
                        </Stack>
                      </TableCell>

                      {/* TIMESTAMP */}
                      <TableCell>
                        <Stack gap="xs">
                          <span>{timestamp.date}</span>
                          <span className="bezent-caption">{timestamp.time}</span>
                        </Stack>
                      </TableCell>

                      {/* DETAILS */}
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => setActiveLog(log)}>
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}

          {/* Server-Side Pagination */}
          {!loading && total > 0 && (
            <Toolbar
              left={
                <span className="bezent-caption">
                  Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of{' '}
                  {total} records
                </span>
              }
              right={
                <Inline gap="sm" align="center">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </Button>
                  <span className="bezent-caption">
                    Page {page} of {totalPages}
                  </span>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </Inline>
              }
            />
          )}
        </Stack>
      </Card>

      {/* Structured Details Modal */}
      {activeLog && (
        <Modal
          isOpen={Boolean(activeLog)}
          onClose={() => setActiveLog(null)}
          title="Audit Event Details"
          description="Sanitized administrative event parameters and operational context"
          footer={
            <Button variant="secondary" onClick={() => setActiveLog(null)}>
              Close
            </Button>
          }
        >
          <Stack gap="md">
            {/* Event Summary */}
            <Inline gap="sm" align="center">
              <Badge variant={getAuditActionBadgeVariant(activeLog.action)}>
                {formatAuditAction(activeLog.action)}
              </Badge>
              <code>{activeLog.action}</code>
            </Inline>

            <Divider />

            {/* Context Fields */}
            <Stack gap="sm">
              <Inline gap="sm" justify="between">
                <span className="bezent-caption">Timestamp:</span>
                <strong>{formatAuditTimestamp(activeLog.createdAt).full}</strong>
              </Inline>

              <Inline gap="sm" justify="between">
                <span className="bezent-caption">Actor:</span>
                <span>
                  {activeLog.actorEmail || 'System Process'}{' '}
                  {activeLog.actorUserId ? `(${activeLog.actorUserId})` : ''}
                </span>
              </Inline>

              <Inline gap="sm" justify="between">
                <span className="bezent-caption">Customer Scope:</span>
                <span>{resolveAuditContext(activeLog, tenantMap).customer}</span>
              </Inline>

              {resolveAuditContext(activeLog, tenantMap).company && (
                <Inline gap="sm" justify="between">
                  <span className="bezent-caption">Company Scope:</span>
                  <span>{resolveAuditContext(activeLog, tenantMap).company}</span>
                </Inline>
              )}

              <Inline gap="sm" justify="between">
                <span className="bezent-caption">Target:</span>
                <span>
                  <strong>{resolveAuditTarget(activeLog, tenantMap).label}</strong>{' '}
                  <span className="bezent-caption">
                    ({resolveAuditTarget(activeLog, tenantMap).type}: {activeLog.targetId})
                  </span>
                </span>
              </Inline>

              <Inline gap="sm" justify="between">
                <span className="bezent-caption">Event ID:</span>
                <code>{activeLog.id}</code>
              </Inline>
            </Stack>

            <Divider />

            {/* Safe Structured Metadata */}
            <Stack gap="xs">
              <strong>Event Parameters & Metadata</strong>
              {activeLog.metadata && Object.keys(activeLog.metadata).length > 0 ? (
                <Stack gap="xs">
                  {Object.entries(activeLog.metadata).map(([key, val]) => (
                    <Inline key={key} gap="sm" justify="between" align="center">
                      <code className="bezent-caption">{key}</code>
                      {val === '[REDACTED]' ? (
                        <Badge variant="warning">Redacted</Badge>
                      ) : typeof val === 'object' && val !== null ? (
                        <code className="bezent-caption">{JSON.stringify(val)}</code>
                      ) : (
                        <span>{String(val)}</span>
                      )}
                    </Inline>
                  ))}
                </Stack>
              ) : (
                <span className="bezent-caption">No additional metadata recorded</span>
              )}
            </Stack>
          </Stack>
        </Modal>
      )}
    </Page>
  );
}
