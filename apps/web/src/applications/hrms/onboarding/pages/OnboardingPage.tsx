import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  Avatar,
  EmptyState,
  Page,
  PageHeader,
  Section,
  Toolbar,
  Tabs,
  LoadingState,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeaderCell,
  TableCell,
  Inline,
  Stack,
  Grid,
  Card,
  CardTitle,
  CardDescription,
  SearchInput,
  Select,
  Label,
  Alert,
  Badge,
  type BadgeVariant,
} from '../../../../design-system/components';
import { BezentIcon } from '../../../../design-system/icons';
import {
  fetchOrganizationMasters,
  fetchNewHiresPaginated,
  type OrganizationMasters,
  type OnboardingCaseItem,
  type StageCounts,
  type OnboardingStage,
} from '../api/onboardingApi';

interface OnboardingPageProps {
  title?: string;
  onAddNewHire?: () => void;
}

export function OnboardingPage({ title = 'Onboarding', onAddNewHire }: OnboardingPageProps) {
  const navigate = useNavigate();
  const [, setMasters] = useState<OrganizationMasters | null>(null);
  const [cases, setCases] = useState<OnboardingCaseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filters & Search
  const [activeTab, setActiveTab] = useState<'all' | 'preboarding' | 'documents' | 'completed'>(
    'all',
  );
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination State
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);
  const [totalItems, setTotalItems] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [counts, setCounts] = useState<StageCounts>({
    all: 0,
    preboarding: 0,
    documents: 0,
    completed: 0,
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [mastersData, res] = await Promise.all([
        fetchOrganizationMasters().catch(() => null),
        fetchNewHiresPaginated({
          page,
          pageSize,
          stage: activeTab,
          search: searchQuery,
        }),
      ]);
      if (mastersData) {
        setMasters(mastersData);
      }
      setCases(res.data);
      setTotalItems(res.pagination.totalItems);
      setTotalPages(res.pagination.totalPages);
      setCounts(res.counts);

      if (res.pagination.totalPages > 0 && page > res.pagination.totalPages) {
        setPage(res.pagination.totalPages);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load onboarding data');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, activeTab, searchQuery]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleTabChange = (newTabId: string) => {
    setActiveTab(newTabId as 'all' | 'preboarding' | 'documents' | 'completed');
    setPage(1);
  };

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    setPage(1);
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setPage(1);
  };

  // Navigate directly to standalone Employee Registration wizard
  const handleAddNewHire = () => {
    if (onAddNewHire) {
      onAddNewHire();
    } else {
      navigate('/hrms/administration/onboarding/registration');
    }
  };

  const handleRowAction = (item: OnboardingCaseItem) => {
    navigate(`/hrms/administration/onboarding/registration/${item.id}`, {
      state: { caseId: item.id, newHire: item },
    });
  };

  const getInitials = (name: string): string => {
    const parts = name.trim().split(/\s+/);
    const first = parts[0];
    const second = parts[1];
    if (parts.length >= 2 && first && second && first[0] && second[0]) {
      return `${first[0]}${second[0]}`.toUpperCase();
    }
    return (parts[0]?.[0] || 'U').toUpperCase();
  };

  const formatDate = (dateStr: string): string => {
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const getStageBadgeProps = (
    stage: OnboardingStage,
    status: string,
  ): { label: string; variant: BadgeVariant } => {
    if (status === 'withdrawn') {
      return { label: 'Withdrawn', variant: 'danger' };
    }
    switch (stage) {
      case 'preboarding':
        return { label: 'Preboarding', variant: 'info' };
      case 'documents':
        return { label: 'Documents', variant: 'warning' };
      case 'induction':
        return { label: 'Induction', variant: 'neutral' };
      case 'completed':
        return { label: 'Completed', variant: 'success' };
      default:
        return { label: stage, variant: 'neutral' };
    }
  };

  const pageNumbers = useMemo(() => {
    if (totalPages <= 1) return [1];
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (page <= 4) {
      return [1, 2, 3, 4, 5, '...', totalPages];
    }
    if (page >= totalPages - 3) {
      return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }
    return [1, '...', page - 1, page, page + 1, '...', totalPages];
  }, [page, totalPages]);

  const resultRangeText = useMemo(() => {
    if (totalItems === 0) return 'Showing 0 of 0';
    const start = (page - 1) * pageSize + 1;
    const end = Math.min(page * pageSize, totalItems);
    return `Showing ${start}–${end} of ${totalItems}`;
  }, [page, pageSize, totalItems]);

  const inProgressCount = (counts.preboarding ?? 0) + (counts.documents ?? 0);

  return (
    <Page maxWidth="full" gap="lg">
      {/* Page Header */}
      <PageHeader
        title={title}
        subtitle="Manage new hires from pre-joining through employee creation."
        actions={
          <Button
            variant="primary"
            leftIcon={<BezentIcon name="plusSign" size={16} />}
            onClick={handleAddNewHire}
          >
            Add New Hire
          </Button>
        }
      />

      {/* Success feedback */}
      {successMessage && (
        <Alert variant="success" dismissible onDismiss={() => setSuccessMessage(null)}>
          {successMessage}
        </Alert>
      )}

      {/* Error feedback */}
      {error && (
        <Alert variant="danger" dismissible onDismiss={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Real Summary Metrics (strictly calculated from actual counts; omitting unverifiable metrics) */}
      <Grid columns={3} gap="md">
        <Card variant="flat" padding="md">
          <Stack gap="xs">
            <Label size="sm">Total New Hires</Label>
            <CardTitle>{counts.all}</CardTitle>
            <CardDescription>All tracked onboarding cases</CardDescription>
          </Stack>
        </Card>

        <Card variant="flat" padding="md">
          <Stack gap="xs">
            <Label size="sm">In Progress</Label>
            <CardTitle>{inProgressCount}</CardTitle>
            <CardDescription>Preboarding & document verification</CardDescription>
          </Stack>
        </Card>

        <Card variant="flat" padding="md">
          <Stack gap="xs">
            <Label size="sm">Completed</Label>
            <CardTitle>{counts.completed}</CardTitle>
            <CardDescription>Successfully completed onboarding</CardDescription>
          </Stack>
        </Card>
      </Grid>

      {/* Main Workspace Section: New Hires */}
      <Section title="New Hires">
        <Stack gap="md">
          {/* Toolbar: Filters and Search */}
          <Toolbar
            left={
              <Tabs
                activeId={activeTab}
                onChange={handleTabChange}
                items={[
                  { id: 'all', label: 'All', count: counts.all },
                  { id: 'preboarding', label: 'Preboarding', count: counts.preboarding },
                  { id: 'documents', label: 'Documents', count: counts.documents },
                  { id: 'completed', label: 'Completed', count: counts.completed },
                ]}
              />
            }
            right={
              <SearchInput
                placeholder="Search by name, email, department..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                onClear={() => handleSearchChange('')}
                aria-label="Search new hires"
              />
            }
          />

          {/* Table / Content States */}
          {loading ? (
            <LoadingState label="Loading new hire records…" fill />
          ) : cases.length === 0 ? (
            <EmptyState
              variant="onboarding"
              title={
                searchQuery || activeTab !== 'all' ? 'No matching new hires' : 'No New Hires Found'
              }
              description={
                searchQuery || activeTab !== 'all'
                  ? 'No candidate records match your current filter criteria. Try adjusting your search or tab filter.'
                  : 'Get started by creating your first onboarding case for a new hire.'
              }
              primaryAction={
                !searchQuery && activeTab === 'all'
                  ? {
                      label: 'Add New Hire',
                      onClick: handleAddNewHire,
                    }
                  : undefined
              }
            />
          ) : (
            <>
              <Table hoverable>
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>New Hire</TableHeaderCell>
                    <TableHeaderCell>Job / Department</TableHeaderCell>
                    <TableHeaderCell>Location</TableHeaderCell>
                    <TableHeaderCell>Joining Date</TableHeaderCell>
                    <TableHeaderCell>Current Stage</TableHeaderCell>
                    <TableHeaderCell align="right">Actions</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {cases.map((item) => {
                    const badgeInfo = getStageBadgeProps(item.stage, item.status);
                    const isCompleted = item.stage === 'completed';

                    return (
                      <TableRow key={item.id}>
                        <TableCell>
                          <Inline gap="sm" align="center">
                            <Avatar initials={getInitials(item.fullName)} alt={item.fullName} />
                            <Stack gap="xs">
                              <Label as="span" size="sm">
                                {item.fullName}
                              </Label>
                              {item.email && (
                                <Label as="span" size="sm">
                                  {item.email}
                                </Label>
                              )}
                            </Stack>
                          </Inline>
                        </TableCell>
                        <TableCell>
                          <Stack gap="xs">
                            <Label as="span" size="sm">
                              {item.designationName || '—'}
                            </Label>
                            {item.departmentName && (
                              <Label as="span" size="sm">
                                {item.departmentName}
                              </Label>
                            )}
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Label as="span" size="sm">
                            {item.locationName || '—'}
                          </Label>
                        </TableCell>
                        <TableCell>
                          <Label as="span" size="sm">
                            {formatDate(item.joiningDate)}
                          </Label>
                        </TableCell>
                        <TableCell>
                          <Badge variant={badgeInfo.variant}>{badgeInfo.label}</Badge>
                        </TableCell>
                        <TableCell align="right">
                          <Button
                            variant={isCompleted ? 'ghost' : 'outline'}
                            size="sm"
                            onClick={() => handleRowAction(item)}
                          >
                            {isCompleted
                              ? 'View'
                              : item.stage === 'preboarding'
                                ? 'Start Registration'
                                : 'Continue Registration'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {/* Pagination Controls */}
              <Toolbar
                align="center"
                left={
                  <Label as="span" size="sm" aria-live="polite">
                    {resultRangeText}
                  </Label>
                }
                right={
                  <Inline gap="lg" align="center">
                    <Inline gap="xs" align="center">
                      <Label htmlFor="onboarding-page-size" size="sm">
                        Rows per page:
                      </Label>
                      <Select
                        id="onboarding-page-size"
                        size="sm"
                        width="auto"
                        value={String(pageSize)}
                        onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                        options={[
                          { value: '25', label: '25' },
                          { value: '50', label: '50' },
                          { value: '100', label: '100' },
                        ]}
                        aria-label="Rows per page"
                      />
                    </Inline>
                    <Inline gap="xs" align="center">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page <= 1}
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        aria-label="Previous page"
                      >
                        ‹
                      </Button>
                      {pageNumbers.map((p, idx) =>
                        typeof p === 'number' ? (
                          <Button
                            key={p}
                            variant={p === page ? 'primary' : 'outline'}
                            size="sm"
                            onClick={() => setPage(p)}
                            aria-current={p === page ? 'page' : undefined}
                          >
                            {p}
                          </Button>
                        ) : (
                          <Label key={`ellipsis-${idx}`} as="span" size="sm" aria-hidden="true">
                            …
                          </Label>
                        ),
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page >= totalPages || totalPages === 0}
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        aria-label="Next page"
                      >
                        ›
                      </Button>
                    </Inline>
                  </Inline>
                }
              />
            </>
          )}
        </Stack>
      </Section>
    </Page>
  );
}

export default OnboardingPage;
