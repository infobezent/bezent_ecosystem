import { useEffect, useState } from 'react';
import {
  Page,
  PageHeader,
  Section,
  Card,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeaderCell,
  TableCell,
  Badge,
  Stack,
  EmptyState,
} from '../../../design-system/components';
import { tenantAdminApi } from '../api/tenantAdminApi';
import type { TenantMemberSummary } from '../types/tenantAdmin.types';

export function TenantMembersPage() {
  const [members, setMembers] = useState<TenantMemberSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let mounted = true;
    tenantAdminApi
      .listMembers()
      .then((data) => {
        if (mounted) setMembers(data);
      })
      .catch(() => {
        if (mounted) setMembers([]);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <Page>
      <PageHeader
        title="Tenant Members"
        subtitle="Tenant-wide user directory, administrative authorities, and company access."
      />

      <Stack gap="lg">
        <Section title={`Members (${members.length})`}>
          {members.length === 0 && !loading ? (
            <EmptyState
              title="No Members Found"
              description="No tenant members found in the directory."
            />
          ) : (
            <Card>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>User</TableHeaderCell>
                    <TableHeaderCell>Email</TableHeaderCell>
                    <TableHeaderCell>Tenant Authority</TableHeaderCell>
                    <TableHeaderCell>Status</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {members.map((member) => (
                    <TableRow key={member.id || member.userId}>
                      <TableCell>
                        <strong>
                          {member.firstName} {member.lastName}
                        </strong>
                      </TableCell>
                      <TableCell>{member.email}</TableCell>
                      <TableCell>
                        <Badge
                          variant={member.tenantAuthority === 'tenant_admin' ? 'info' : 'neutral'}
                          size="sm"
                        >
                          {member.tenantAuthority === 'tenant_admin' ? 'TENANT ADMIN' : 'STANDARD'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={member.status === 'active' ? 'success' : 'neutral'} size="sm">
                          {member.status.toUpperCase()}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </Section>
      </Stack>
    </Page>
  );
}
