import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  Inline,
  Label,
  Page,
  PageHeader,
  SearchInput,
  Select,
  Stack,
  Toolbar,
} from '../../../../design-system/components';
import {
  fetchEmployees,
  type EmployeeRecord,
  type EmploymentStatus,
  type PaginationMetadata,
} from '../api/employeesApi';
import {
  fetchOrganizationMasters,
  type OrganizationMasters,
} from '../../organization/api/organizationApi';
import { EMPLOYMENT_STATUS_LABELS, employeeProfilePath } from '../model/employeeModel';
import { EmployeeDirectoryTable } from '../components/EmployeeDirectoryTable';

const PAGE_SIZE = 25;

interface DirectoryState {
  status: 'loading' | 'error' | 'ready';
  employees: EmployeeRecord[];
  pagination: PaginationMetadata | null;
  error: string | null;
}

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  ...(Object.keys(EMPLOYMENT_STATUS_LABELS) as EmploymentStatus[]).map((status) => ({
    value: status,
    label: EMPLOYMENT_STATUS_LABELS[status],
  })),
];

/**
 * Employees — the canonical Employee Directory. Read-only listing of employee
 * records; employment actions live in Employee Administration.
 */
export function EmployeeDirectoryPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [locationId, setLocationId] = useState('');
  const [employmentStatus, setEmploymentStatus] = useState<EmploymentStatus | ''>('');
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);
  const [masters, setMasters] = useState<OrganizationMasters | null>(null);
  const [directory, setDirectory] = useState<DirectoryState>({
    status: 'loading',
    employees: [],
    pagination: null,
    error: null,
  });

  const reload = useCallback(() => setReloadKey((key) => key + 1), []);

  // Filter options come from the real organization masters. A failure here
  // only disables the filters; the directory itself still loads.
  useEffect(() => {
    let active = true;
    fetchOrganizationMasters()
      .then((data) => active && setMasters(data))
      .catch(() => active && setMasters(null));
    return () => {
      active = false;
    };
  }, [reloadKey]);

  useEffect(() => {
    let active = true;
    setDirectory((prev) => ({ ...prev, status: 'loading', error: null }));

    const timer = setTimeout(() => {
      fetchEmployees({
        search: search.trim() || undefined,
        departmentId: departmentId || undefined,
        locationId: locationId || undefined,
        employmentStatus: employmentStatus || undefined,
        page,
        pageSize: PAGE_SIZE,
      })
        .then((res) => {
          if (!active) return;
          setDirectory({
            status: 'ready',
            employees: res.data,
            pagination: res.pagination,
            error: null,
          });
        })
        .catch((err: unknown) => {
          if (!active) return;
          setDirectory((prev) => ({
            ...prev,
            status: 'error',
            error: err instanceof Error ? err.message : 'Failed to load employees',
          }));
        });
    }, 200);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [search, departmentId, locationId, employmentStatus, page, reloadKey]);

  const withPageReset =
    <T,>(setter: (value: T) => void) =>
    (value: T) => {
      setter(value);
      setPage(1);
    };

  const filtered = Boolean(search.trim() || departmentId || locationId || employmentStatus);
  const pagination = directory.pagination;

  return (
    <Page maxWidth="full" gap="lg">
      <PageHeader
        eyebrow="HRMS · Administration"
        title="Employees"
        subtitle="Find employees and view their employment information."
      />

      <Toolbar
        left={
          <SearchInput
            placeholder="Search employees..."
            value={search}
            onChange={(e) => withPageReset(setSearch)(e.target.value)}
            onClear={() => withPageReset(setSearch)('')}
            aria-label="Search employees"
          />
        }
        right={
          <Inline gap="sm" wrap>
            <Select
              aria-label="Department"
              width="auto"
              value={departmentId}
              disabled={!masters}
              onChange={(e) => withPageReset(setDepartmentId)(e.target.value)}
              options={[
                { value: '', label: 'All departments' },
                ...(masters?.departments ?? []).map((d) => ({ value: d.id, label: d.name })),
              ]}
            />
            <Select
              aria-label="Location"
              width="auto"
              value={locationId}
              disabled={!masters}
              onChange={(e) => withPageReset(setLocationId)(e.target.value)}
              options={[
                { value: '', label: 'All locations' },
                ...(masters?.locations ?? []).map((l) => ({ value: l.id, label: l.name })),
              ]}
            />
            <Select
              aria-label="Status"
              width="auto"
              value={employmentStatus}
              onChange={(e) =>
                withPageReset(setEmploymentStatus)(e.target.value as EmploymentStatus | '')
              }
              options={STATUS_OPTIONS}
            />
          </Inline>
        }
      />

      <Stack gap="md">
        <EmployeeDirectoryTable
          status={directory.status}
          employees={directory.employees}
          error={directory.error}
          filtered={filtered}
          onRetry={reload}
          onOpenEmployee={(employeeId) => navigate(employeeProfilePath(employeeId))}
        />

        {directory.status === 'ready' && pagination && pagination.totalPages > 1 && (
          <Toolbar
            align="center"
            left={
              <Label as="span" size="sm" aria-live="polite">
                {`Showing ${(pagination.page - 1) * pagination.pageSize + 1}–${Math.min(
                  pagination.page * pagination.pageSize,
                  pagination.totalItems,
                )} of ${pagination.totalItems}`}
              </Label>
            }
            right={
              <Inline gap="xs" align="center">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= pagination.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </Inline>
            }
          />
        )}
      </Stack>
    </Page>
  );
}
