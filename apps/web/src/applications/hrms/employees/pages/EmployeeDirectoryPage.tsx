import { useCallback, useEffect, useMemo, useState, useTransition } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Button,
  Card,
  CardBody,
  Grid,
  Inline,
  Modal,
  Page,
  PageHeader,
  Stack,
  Toolbar,
  Select,
  Label,
} from '../../../../design-system/components';
import { BezentIcon } from '../../../../design-system/icons';
import {
  fetchEmployees,
  type EmployeeRecord,
  type EmploymentType,
  type EmploymentStatus,
  type PaginationMetadata,
} from '../api/employeesApi';
import {
  EmployeeFilterPanel,
  type EmployeeFilterState,
  EMPTY_FILTER_STATE,
  countActiveFilters,
} from '../components/EmployeeFilterPanel';
import {
  fetchOrganizationMasters,
  type OrganizationMasters,
} from '../../api/organizationMastersApi';
import { usePreferences } from '../../../../shared/preferences/PreferencesContext';
import { useOptionalAuth } from '../../../../platform/auth';
import {
  EMPLOYMENT_STATUS_LABELS,
  employeeEditPath,
  employeeProfilePath,
} from '../model/employeeModel';
import {
  EmployeeDirectoryTable,
  type SortColumn,
  type SortDirection,
} from '../components/EmployeeDirectoryTable';

const PAGE_SIZE = 25;

interface DirectoryState {
  status: 'loading' | 'error' | 'ready';
  employees: EmployeeRecord[];
  pagination: PaginationMetadata | null;
  error: string | null;
}

interface WorkforceKpis {
  total: number | null;
  active: number | null;
  pendingActivation: number | null;
  newJoiners: number | null;
  inactive: number | null;
  loading: boolean;
  error: boolean;
}

function getPaginationItems(currentPage: number, totalPages: number): (number | 'ellipsis')[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const items: (number | 'ellipsis')[] = [];
  if (currentPage <= 4) {
    for (let i = 1; i <= 5; i++) items.push(i);
    items.push('ellipsis');
    items.push(totalPages);
  } else if (currentPage >= totalPages - 3) {
    items.push(1);
    items.push('ellipsis');
    for (let i = totalPages - 4; i <= totalPages; i++) items.push(i);
  } else {
    items.push(1);
    items.push('ellipsis');
    items.push(currentPage - 1);
    items.push(currentPage);
    items.push(currentPage + 1);
    items.push('ellipsis');
    items.push(totalPages);
  }
  return items;
}

export interface ComputeWorkforceKpiParams {
  totalItems: number | null;
  activeItems: number | null;
  probationItems?: number | null;
  pendingActivationItems?: number | null;
  terminatedItems: number | null;
  suspendedItems: number | null;
  resignedItems: number | null;
  employees?: EmployeeRecord[];
  companyTimezone?: string;
  referenceDate?: Date;
}

export function computeWorkforceKpiValues({
  totalItems,
  activeItems,
  probationItems,
  pendingActivationItems,
  terminatedItems,
  suspendedItems,
  resignedItems,
  employees = [],
  companyTimezone = 'Asia/Kolkata',
  referenceDate = new Date(),
}: ComputeWorkforceKpiParams): {
  total: number | null;
  active: number | null;
  pendingActivation: number | null;
  newJoiners: number | null;
  inactive: number | null;
} {
  const total = totalItems;
  // If probationItems is provided, active represents the full working workforce (active + probation)
  let active = activeItems;
  if (activeItems !== null && probationItems !== undefined && probationItems !== null) {
    active = activeItems + probationItems;
  }

  let pendingActivation: number | null = null;
  if (pendingActivationItems !== undefined && pendingActivationItems !== null) {
    pendingActivation = pendingActivationItems;
  }

  let inactive: number | null = null;
  if (terminatedItems !== null && suspendedItems !== null && resignedItems !== null) {
    inactive = terminatedItems + suspendedItems + resignedItems;
  }

  let newJoiners: number | null = null;
  if (totalItems !== null && employees.length > 0) {
    let todayInTz = '';
    try {
      const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: companyTimezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
      todayInTz = formatter.format(referenceDate);
    } catch {
      todayInTz = referenceDate.toISOString().slice(0, 10);
    }
    const currentMonthPrefix = todayInTz.slice(0, 7);

    newJoiners = employees.filter((emp) => {
      if (!emp.joiningDate) return false;
      // Do not count pending onboarding candidates who have not joined
      if (emp.employmentStatus === 'pending_activation') return false;
      // Month boundary in company timezone
      const isThisMonth = emp.joiningDate.startsWith(currentMonthPrefix);
      // Exclude future join dates
      const isJoinedOrPrior = emp.joiningDate <= todayInTz;
      return isThisMonth && isJoinedOrPrior;
    }).length;
  } else if (totalItems !== null) {
    newJoiners = 0;
  }

  return { total, active, pendingActivation, newJoiners, inactive };
}

/**
 * Workforce Employees Directory Page
 *
 * Implements the approved Employees Directory interface:
 * 1. Eyebrow "WORKFORCE / EMPLOYEES", Title "Employees", Subtitle
 * 2. Separate "Import" (outline, upload icon) & "Export" (primary, download icon) buttons
 * 3. 4 Workforce KPI Cards: Total Employees, Active Employees, New Joiners, Inactive Employees
 * 4. "Employee Directory" section container with search, filters drawer, reset, table, and pagination
 */
export function EmployeeDirectoryPage() {
  const navigate = useNavigate();
  const [, startTransition] = useTransition();
  const { companyPreferences } = usePreferences();
  const auth = useOptionalAuth();

  const canImport = auth ? auth.can('hrms.employees.create') : true;
  const canExport = auth ? auth.can('hrms.employees.view') : true;

  // Search & Filter state
  const [search, setSearch] = useState('');
  const [appliedFilters, setAppliedFilters] = useState<EmployeeFilterState>(EMPTY_FILTER_STATE);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [activeStatusTab, setActiveStatusTab] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(PAGE_SIZE);
  const [reloadKey, setReloadKey] = useState(0);

  // Status tabs matching recruitment candidate directory
  const statusTabs: Array<{ id: string; label: string }> = [
    { id: 'all', label: 'All Employees' },
    { id: 'active', label: 'Active' },
    { id: 'probation', label: 'Probation' },
    { id: 'pending_activation', label: 'Pending Activation' },
    { id: 'inactive', label: 'Separated' },
  ];

  const handleStatusTabChange = (tabId: string) => {
    setActiveStatusTab(tabId);
    let statusFilter = '';
    if (tabId === 'active') statusFilter = 'active';
    else if (tabId === 'probation') statusFilter = 'probation';
    else if (tabId === 'pending_activation') statusFilter = 'pending_activation';
    else if (tabId === 'inactive') statusFilter = 'terminated';

    setAppliedFilters((prev) => ({
      ...prev,
      employmentStatus: statusFilter,
    }));
    setPage(1);
  };

  // Masters
  const [masters, setMasters] = useState<OrganizationMasters | null>(null);

  // Directory records
  const [directory, setDirectory] = useState<DirectoryState>({
    status: 'loading',
    employees: [],
    pagination: null,
    error: null,
  });

  // KPI Metrics state
  const [kpis, setKpis] = useState<WorkforceKpis>({
    total: null,
    active: null,
    pendingActivation: null,
    newJoiners: null,
    inactive: null,
    loading: true,
    error: false,
  });

  // Import dialog state
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [activeActionMenuId, setActiveActionMenuId] = useState<string | null>(null);

  // Close contextual row action menu when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest?.('.bezent-table-action-menu')) {
        setActiveActionMenuId(null);
      }
    };
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  // Sorting state
  const [sortColumn, setSortColumn] = useState<SortColumn | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else {
        setSortColumn(null);
        setSortDirection('asc');
      }
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const sortedEmployees = useMemo(() => {
    if (!sortColumn) return directory.employees;

    return [...directory.employees].sort((a, b) => {
      let comparison = 0;
      switch (sortColumn) {
        case 'employee':
          comparison = (a.fullName || '').localeCompare(b.fullName || '', undefined, {
            sensitivity: 'base',
          });
          break;
        case 'department':
          comparison = (a.departmentName || '').localeCompare(b.departmentName || '', undefined, {
            sensitivity: 'base',
          });
          break;
        case 'employment':
          comparison = (a.employmentType || '').localeCompare(b.employmentType || '', undefined, {
            sensitivity: 'base',
          });
          break;
        case 'joinedDate':
          comparison = (a.joiningDate || '').localeCompare(b.joiningDate || '');
          break;
        case 'status':
          comparison = (a.employmentStatus || '').localeCompare(b.employmentStatus || '');
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [directory.employees, sortColumn, sortDirection]);

  const reload = useCallback(() => setReloadKey((key) => key + 1), []);

  // 1. Fetch Organization Masters for Department / Location filtering
  useEffect(() => {
    let active = true;
    fetchOrganizationMasters()
      .then((data) => active && setMasters(data))
      .catch(() => active && setMasters(null));
    return () => {
      active = false;
    };
  }, [reloadKey]);

  // 2. Fetch Workforce KPI Metrics from real, authorized backend APIs
  useEffect(() => {
    let active = true;

    async function loadWorkforceKpis() {
      try {
        const [
          totalRes,
          activeRes,
          probationRes,
          pendingActivationRes,
          terminatedRes,
          suspendedRes,
          resignedRes,
        ] = await Promise.allSettled([
          fetchEmployees({ pageSize: 1 }),
          fetchEmployees({ employmentStatus: 'active', pageSize: 1 }),
          fetchEmployees({ employmentStatus: 'probation', pageSize: 1 }),
          fetchEmployees({ employmentStatus: 'pending_activation', pageSize: 1 }),
          fetchEmployees({ employmentStatus: 'terminated', pageSize: 1 }),
          fetchEmployees({ employmentStatus: 'suspended', pageSize: 1 }),
          fetchEmployees({ employmentStatus: 'resigned', pageSize: 1 }),
        ]);

        if (!active) return;

        const computed = computeWorkforceKpiValues({
          totalItems: totalRes.status === 'fulfilled' ? totalRes.value.pagination.totalItems : null,
          activeItems:
            activeRes.status === 'fulfilled' ? activeRes.value.pagination.totalItems : null,
          probationItems:
            probationRes.status === 'fulfilled' ? probationRes.value.pagination.totalItems : null,
          pendingActivationItems:
            pendingActivationRes.status === 'fulfilled'
              ? pendingActivationRes.value.pagination.totalItems
              : null,
          terminatedItems:
            terminatedRes.status === 'fulfilled' ? terminatedRes.value.pagination.totalItems : null,
          suspendedItems:
            suspendedRes.status === 'fulfilled' ? suspendedRes.value.pagination.totalItems : null,
          resignedItems:
            resignedRes.status === 'fulfilled' ? resignedRes.value.pagination.totalItems : null,
          employees: [],
          companyTimezone: companyPreferences?.timezone,
        });

        setKpis({
          ...computed,
          loading: false,
          error: computed.total === null && computed.active === null,
        });
      } catch {
        if (!active) return;
        setKpis((prev) => ({ ...prev, loading: false, error: true }));
      }
    }

    loadWorkforceKpis();

    return () => {
      active = false;
    };
  }, [reloadKey, companyPreferences?.timezone]);

  // 3. Fetch directory employees (paginated + filtered)
  useEffect(() => {
    let active = true;
    setDirectory((prev) => ({ ...prev, status: 'loading', error: null }));

    const timer = setTimeout(() => {
      fetchEmployees({
        search: search.trim() || undefined,
        departmentIds:
          appliedFilters.departmentIds.length > 0 ? appliedFilters.departmentIds : undefined,
        locationIds: appliedFilters.locationIds.length > 0 ? appliedFilters.locationIds : undefined,
        employmentType: (appliedFilters.employmentType as EmploymentType) || undefined,
        employmentStatus: (appliedFilters.employmentStatus as EmploymentStatus) || undefined,
        joiningDateFrom: appliedFilters.joiningDateFrom || undefined,
        joiningDateTo: appliedFilters.joiningDateTo || undefined,
        page,
        pageSize,
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
  }, [search, appliedFilters, page, pageSize, reloadKey]);

  const withPageReset =
    <T,>(setter: (value: T) => void) =>
    (value: T) => {
      startTransition(() => {
        setter(value);
        setPage(1);
      });
    };

  const handleResetFilters = () => {
    setSearch('');
    setAppliedFilters(EMPTY_FILTER_STATE);
    setActiveStatusTab('all');
    setPage(1);
  };

  const appliedCount = countActiveFilters(appliedFilters);
  const hasActiveFilters = Boolean(search.trim() || appliedCount > 0);
  const pagination = directory.pagination;
  const totalCount = pagination ? pagination.totalItems : directory.employees.length;

  // 4. Authorized CSV Export honoring active filters and current tenant
  const handleExportCsv = async () => {
    try {
      // Export up to 500 records matching current search and filters
      const res = await fetchEmployees({
        search: search.trim() || undefined,
        departmentIds:
          appliedFilters.departmentIds.length > 0 ? appliedFilters.departmentIds : undefined,
        locationIds: appliedFilters.locationIds.length > 0 ? appliedFilters.locationIds : undefined,
        employmentType: (appliedFilters.employmentType as EmploymentType) || undefined,
        employmentStatus: (appliedFilters.employmentStatus as EmploymentStatus) || undefined,
        joiningDateFrom: appliedFilters.joiningDateFrom || undefined,
        joiningDateTo: appliedFilters.joiningDateTo || undefined,
        page: 1,
        pageSize: 500,
      });

      const records = res.data;
      if (records.length === 0) {
        alert('No employee records available to export.');
        return;
      }

      const headers = [
        'Employee ID',
        'Full Name',
        'Email',
        'Phone',
        'Department',
        'Designation',
        'Location',
        'Employment Type',
        'Status',
        'Joining Date',
      ];

      const csvRows = [
        headers.join(','),
        ...records.map((emp) =>
          [
            `"${emp.employeeNumber || ''}"`,
            `"${(emp.fullName || '').replace(/"/g, '""')}"`,
            `"${(emp.email || '').replace(/"/g, '""')}"`,
            `"${(emp.phone || '').replace(/"/g, '""')}"`,
            `"${(emp.departmentName || '').replace(/"/g, '""')}"`,
            `"${(emp.designationName || '').replace(/"/g, '""')}"`,
            `"${(emp.locationName || '').replace(/"/g, '""')}"`,
            `"${emp.employmentType || ''}"`,
            `"${emp.employmentStatus || ''}"`,
            `"${emp.joiningDate || ''}"`,
          ].join(','),
        ),
      ];

      const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute(
        'download',
        `employees_directory_${new Date().toISOString().slice(0, 10)}.csv`,
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to export employees directory');
    }
  };

  return (
    <Page maxWidth="default" gap="md" className="employees-directory-page">
      {/* 1. Page Header */}
      <PageHeader
        eyebrow="WORKFORCE / EMPLOYEES"
        title="Employees"
        subtitle="Manage and explore your workforce directory"
        actions={
          canImport || canExport ? (
            <Inline gap="sm" align="center">
              {canImport && (
                <Button
                  variant="outline"
                  size="md"
                  shape="rounded"
                  className="bezent-btn--import"
                  leftIcon={<BezentIcon name="upload" size={16} />}
                  onClick={() => {
                    setImportFile(null);
                    setImportStatus(null);
                    setIsImportModalOpen(true);
                  }}
                >
                  Import
                </Button>
              )}
              {canExport && (
                <Button
                  variant="secondary"
                  size="md"
                  shape="rounded"
                  className="bezent-btn--export"
                  leftIcon={<BezentIcon name="download" size={16} />}
                  onClick={handleExportCsv}
                >
                  Export
                </Button>
              )}
            </Inline>
          ) : null
        }
      />

      {/* 2. Workforce 3D Clay KPI Cards (Matching Recruitment Candidate Directory) */}
      <Grid columns={4} gap="md" role="region" aria-label="Workforce key metrics">
        {/* Total Employees */}
        <Card
          variant="default"
          padding="none"
          className="bezent-clay-card--compact bezent-kpi-card bezent-kpi-card--blue"
          aria-label={`Total Employees: ${kpis.total !== null ? kpis.total : 'Loading'}`}
        >
          <CardBody>
            <Inline justify="between" align="center">
              <Stack gap="xs">
                <Inline align="center" gap="xs">
                  <span
                    className="bezent-pulse-stat__dot bezent-pulse-stat__dot--purple"
                    aria-hidden="true"
                  />
                  <span className="bezent-clay-metric__label bezent-kpi-card__title">
                    Total Employees
                  </span>
                </Inline>
                <div className="bezent-clay-metric__value bezent-kpi-card__value">
                  {kpis.loading ? (
                    <span className="bezent-kpi-card__skeleton" aria-label="Loading metric" />
                  ) : kpis.total !== null ? (
                    kpis.total
                  ) : (
                    '—'
                  )}
                </div>
                <span className="bezent-clay-metric__caption bezent-kpi-card__caption">
                  Total recorded workforce
                </span>
              </Stack>
              <div
                className="bezent-clay-icon bezent-clay-icon--purple bezent-kpi-card__icon bezent-kpi-card__icon--blue"
                aria-hidden="true"
              >
                <BezentIcon name="employees" size={20} />
              </div>
            </Inline>
          </CardBody>
        </Card>

        {/* Active Employees */}
        <Card
          variant="default"
          padding="none"
          className="bezent-clay-card--compact bezent-kpi-card bezent-kpi-card--green"
          aria-label={`Active Employees: ${kpis.active !== null ? kpis.active : 'Loading'}`}
        >
          <CardBody>
            <Inline justify="between" align="center">
              <Stack gap="xs">
                <Inline align="center" gap="xs">
                  <span
                    className="bezent-pulse-stat__dot bezent-pulse-stat__dot--blue"
                    aria-hidden="true"
                  />
                  <span className="bezent-clay-metric__label bezent-kpi-card__title">
                    Active Employees
                  </span>
                </Inline>
                <div className="bezent-clay-metric__value bezent-kpi-card__value">
                  {kpis.loading ? (
                    <span className="bezent-kpi-card__skeleton" aria-label="Loading metric" />
                  ) : kpis.active !== null ? (
                    kpis.active
                  ) : (
                    '—'
                  )}
                </div>
                <span className="bezent-clay-metric__caption bezent-kpi-card__caption">
                  Confirmed active &amp; probation
                </span>
              </Stack>
              <div
                className="bezent-clay-icon bezent-clay-icon--blue bezent-kpi-card__icon bezent-kpi-card__icon--green"
                aria-hidden="true"
              >
                <BezentIcon name="userCheck" size={20} />
              </div>
            </Inline>
          </CardBody>
        </Card>

        {/* Pending Activation */}
        <Card
          variant="default"
          padding="none"
          className="bezent-clay-card--compact bezent-kpi-card bezent-kpi-card--amber"
          aria-label={`Pending Activation: ${kpis.pendingActivation !== null ? kpis.pendingActivation : 'Loading'}`}
        >
          <CardBody>
            <Inline justify="between" align="center">
              <Stack gap="xs">
                <Inline align="center" gap="xs">
                  <span
                    className="bezent-pulse-stat__dot bezent-pulse-stat__dot--amber"
                    aria-hidden="true"
                  />
                  <span className="bezent-clay-metric__label bezent-kpi-card__title">
                    Pending Activation
                  </span>
                </Inline>
                <div className="bezent-clay-metric__value bezent-kpi-card__value">
                  {kpis.loading ? (
                    <span className="bezent-kpi-card__skeleton" aria-label="Loading metric" />
                  ) : kpis.pendingActivation !== null ? (
                    kpis.pendingActivation
                  ) : (
                    '—'
                  )}
                </div>
                <span className="bezent-clay-metric__caption bezent-kpi-card__caption">
                  Pre-boarded awaiting login
                </span>
              </Stack>
              <div
                className="bezent-clay-icon bezent-clay-icon--amber bezent-kpi-card__icon bezent-kpi-card__icon--amber"
                aria-hidden="true"
              >
                <BezentIcon name="onboarding" size={20} />
              </div>
            </Inline>
          </CardBody>
        </Card>

        {/* Inactive Employees */}
        <Card
          variant="default"
          padding="none"
          className="bezent-clay-card--compact bezent-kpi-card bezent-kpi-card--red"
          aria-label={`Inactive Employees: ${kpis.inactive !== null ? kpis.inactive : 'Loading'}`}
        >
          <CardBody>
            <Inline justify="between" align="center">
              <Stack gap="xs">
                <Inline align="center" gap="xs">
                  <span
                    className="bezent-pulse-stat__dot bezent-pulse-stat__dot--red"
                    aria-hidden="true"
                  />
                  <span className="bezent-clay-metric__label bezent-kpi-card__title">
                    Inactive Employees
                  </span>
                </Inline>
                <div className="bezent-clay-metric__value bezent-kpi-card__value">
                  {kpis.loading ? (
                    <span className="bezent-kpi-card__skeleton" aria-label="Loading metric" />
                  ) : kpis.inactive !== null ? (
                    kpis.inactive
                  ) : (
                    '—'
                  )}
                </div>
                <span className="bezent-clay-metric__caption bezent-kpi-card__caption">
                  Terminated, suspended or resigned
                </span>
              </Stack>
              <div
                className="bezent-clay-icon bezent-clay-icon--red bezent-kpi-card__icon bezent-kpi-card__icon--red"
                aria-hidden="true"
              >
                <BezentIcon name="userX" size={20} />
              </div>
            </Inline>
          </CardBody>
        </Card>
      </Grid>

      {/* 3. Candidates-style Search & Action Toolbar with Status Filter Tabs */}
      <Toolbar
        left={
          <Inline align="center" gap="sm" wrap>
            {/* Compact Search Bar with Icon */}
            <div className="bezent-search-bar">
              <BezentIcon name="search" size={16} color="var(--text-secondary, #64748b)" />
              <input
                type="search"
                placeholder="Search by name, employee ID, email, department..."
                value={search}
                onChange={(e) => withPageReset(setSearch)(e.target.value)}
                className="bezent-search-bar__input"
                aria-label="Search by name, employee ID, email, department..."
              />
            </div>

            {/* Filter Toggle Button */}
            <div className="bezent-filter-anchor">
              <Button
                variant={appliedCount > 0 || isFilterPanelOpen ? 'secondary' : 'outline'}
                size="md"
                shape="rounded"
                className={appliedCount > 0 ? 'bezent-btn--filters-active' : ''}
                leftIcon={<BezentIcon name="filter" size={16} />}
                onClick={() => setIsFilterPanelOpen((prev) => !prev)}
                aria-expanded={isFilterPanelOpen}
                aria-label="Filters"
              >
                <span>Filters</span>
                {appliedCount > 0 && (
                  <span className="bezent-btn__filter-count">{appliedCount}</span>
                )}
              </Button>

              <EmployeeFilterPanel
                isOpen={isFilterPanelOpen}
                onClose={() => setIsFilterPanelOpen(false)}
                appliedFilters={appliedFilters}
                onApply={(newFilters) => {
                  setAppliedFilters(newFilters);
                  setPage(1);
                }}
                masters={masters}
              />
            </div>

            {/* Reset Button */}
            <Button
              variant="outline"
              size="md"
              shape="rounded"
              leftIcon={<BezentIcon name="reset" size={16} />}
              onClick={handleResetFilters}
              disabled={!hasActiveFilters}
            >
              Reset
            </Button>

            {/* View Mode Toggle: List vs Grid */}
            <div
              className="bezent-view-toggle"
              role="group"
              aria-label="Workforce view layout switcher"
            >
              <button
                type="button"
                className={`bezent-view-toggle__btn ${viewMode === 'list' ? 'is-active' : ''}`}
                onClick={() => setViewMode('list')}
                title="List View"
                aria-label="List View"
                aria-pressed={viewMode === 'list'}
              >
                <BezentIcon name="viewList" size={18} />
              </button>
              <button
                type="button"
                className={`bezent-view-toggle__btn ${viewMode === 'grid' ? 'is-active' : ''}`}
                onClick={() => setViewMode('grid')}
                title="Grid View"
                aria-label="Grid View"
                aria-pressed={viewMode === 'grid'}
              >
                <BezentIcon name="viewGrid" size={18} />
              </button>
            </div>

            {/* Horizontal Status Filter Tabs */}
            <div
              className="bezent-filter-tabs"
              role="tablist"
              aria-label="Filter employees by employment status"
            >
              {statusTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={activeStatusTab === tab.id}
                  className={`bezent-filter-tab ${activeStatusTab === tab.id ? 'is-active' : ''}`}
                  onClick={() => handleStatusTabChange(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </Inline>
        }
        right={
          <Inline align="center" gap="sm">
            <span className="bezent-records-text">{`${totalCount} Records`}</span>
            {canImport && (
              <Button
                variant="outline"
                size="md"
                shape="rounded"
                className="bezent-btn--import"
                leftIcon={<BezentIcon name="upload" size={16} />}
                onClick={() => {
                  setImportFile(null);
                  setImportStatus(null);
                  setIsImportModalOpen(true);
                }}
              >
                Import
              </Button>
            )}
            {canExport && (
              <Button
                variant="outline"
                size="md"
                shape="rounded"
                className="bezent-btn--export"
                leftIcon={<BezentIcon name="download" size={16} />}
                onClick={handleExportCsv}
              >
                Export
              </Button>
            )}
            <Button
              variant="dark"
              size="md"
              shape="rounded"
              leftIcon={<BezentIcon name="add" size="action" />}
              onClick={() => navigate('/hrms/workforce/onboarding')}
            >
              Add Employee
            </Button>
          </Inline>
        }
      />

      {/* Active Filter Chips (rendered below toolbar without pushing down table when empty) */}
      {appliedCount > 0 && (
        <div className="bezent-active-chips-strip">
          {appliedFilters.departmentIds.map((id) => {
            const dept = masters?.departments.find((d) => d.id === id);
            return (
              <span key={id} className="bezent-active-filter-chip">
                <span>{`Department: ${dept?.name ?? id}`}</span>
                <button
                  type="button"
                  className="bezent-active-filter-chip__remove"
                  aria-label={`Remove department filter ${dept?.name ?? id}`}
                  onClick={() => {
                    setAppliedFilters((prev) => ({
                      ...prev,
                      departmentId: '',
                      departmentIds: prev.departmentIds.filter((dId) => dId !== id),
                    }));
                    setPage(1);
                  }}
                >
                  ×
                </button>
              </span>
            );
          })}

          {appliedFilters.locationIds.map((id) => {
            const loc = masters?.locations.find((l) => l.id === id);
            return (
              <span key={id} className="bezent-active-filter-chip">
                <span>{`Location: ${loc?.name ?? id}`}</span>
                <button
                  type="button"
                  className="bezent-active-filter-chip__remove"
                  aria-label={`Remove location filter ${loc?.name ?? id}`}
                  onClick={() => {
                    setAppliedFilters((prev) => ({
                      ...prev,
                      locationId: '',
                      locationIds: prev.locationIds.filter((lId) => lId !== id),
                    }));
                    setPage(1);
                  }}
                >
                  ×
                </button>
              </span>
            );
          })}

          {appliedFilters.employmentType && (
            <span className="bezent-active-filter-chip">
              <span>{`Employment: ${appliedFilters.employmentType.replace('_', ' ')}`}</span>
              <button
                type="button"
                className="bezent-active-filter-chip__remove"
                aria-label="Remove employment type filter"
                onClick={() => {
                  setAppliedFilters((prev) => ({ ...prev, employmentType: '' }));
                  setPage(1);
                }}
              >
                ×
              </button>
            </span>
          )}

          {appliedFilters.employmentStatus && (
            <span className="bezent-active-filter-chip">
              <span>{`Status: ${EMPLOYMENT_STATUS_LABELS[appliedFilters.employmentStatus as EmploymentStatus] ?? appliedFilters.employmentStatus}`}</span>
              <button
                type="button"
                className="bezent-active-filter-chip__remove"
                aria-label="Remove status filter"
                onClick={() => {
                  setAppliedFilters((prev) => ({ ...prev, employmentStatus: '' }));
                  setPage(1);
                }}
              >
                ×
              </button>
            </span>
          )}

          {(appliedFilters.joiningDateFrom || appliedFilters.joiningDateTo) && (
            <span className="bezent-active-filter-chip">
              <span>{`Joined: ${appliedFilters.joiningDateFrom || 'Start'} to ${appliedFilters.joiningDateTo || 'Present'}`}</span>
              <button
                type="button"
                className="bezent-active-filter-chip__remove"
                aria-label="Remove join date filter"
                onClick={() => {
                  setAppliedFilters((prev) => ({
                    ...prev,
                    joiningDateFrom: '',
                    joiningDateTo: '',
                  }));
                  setPage(1);
                }}
              >
                ×
              </button>
            </span>
          )}

          <button
            type="button"
            className="bezent-active-chips__clear-all"
            onClick={() => {
              setAppliedFilters(EMPTY_FILTER_STATE);
              setPage(1);
            }}
          >
            Clear all
          </button>
        </div>
      )}

      {/* 4. Employee Table Card */}
      <div className="bezent-table-card">
        <EmployeeDirectoryTable
          status={directory.status}
          employees={sortedEmployees}
          error={directory.error}
          activeMenuId={activeActionMenuId}
          onToggleMenu={(id) => setActiveActionMenuId((prev) => (prev === id ? null : id))}
          filtered={hasActiveFilters}
          onRetry={reload}
          onOpenEmployee={(employeeId) => navigate(employeeProfilePath(employeeId))}
          onEditEmployee={(employeeId) => navigate(employeeEditPath(employeeId))}
          onClearFilters={handleResetFilters}
          sortColumn={sortColumn}
          sortDirection={sortDirection}
          onSort={handleSort}
          viewMode={viewMode}
        />
      </div>

      {/* 5. Pagination Toolbar */}
      {directory.status === 'ready' && pagination && pagination.totalItems > 0 && (
        <Toolbar
          align="center"
          left={
            <span className="bezent-pagination__info" aria-live="polite">
              {`Showing ${(pagination.page - 1) * pagination.pageSize + 1}–${Math.min(
                pagination.page * pagination.pageSize,
                pagination.totalItems,
              )} of ${pagination.totalItems} employees`}
            </span>
          }
          right={
            <Inline gap="lg" align="center">
              <Inline gap="xs" align="center">
                <Label htmlFor="employees-page-size" size="sm">
                  Rows per page:
                </Label>
                <Select
                  id="employees-page-size"
                  size="sm"
                  width="auto"
                  placement="top"
                  value={String(pageSize)}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                  options={[
                    { value: '25', label: '25' },
                    { value: '50', label: '50' },
                    { value: '100', label: '100' },
                  ]}
                  aria-label="Rows per page"
                />
              </Inline>
              <div className="bezent-pagination">
                <button
                  type="button"
                  className="bezent-pagination__btn"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  aria-label="Previous page"
                >
                  ‹
                </button>
                {getPaginationItems(page, pagination.totalPages).map((item, idx) =>
                  item === 'ellipsis' ? (
                    <span key={`ellipsis-${idx}`} className="bezent-pagination__ellipsis">
                      …
                    </span>
                  ) : (
                    <button
                      key={`page-${item}`}
                      type="button"
                      className={`bezent-pagination__btn ${item === page ? 'is-active' : ''}`}
                      onClick={() => setPage(item)}
                    >
                      {item}
                    </button>
                  ),
                )}
                <button
                  type="button"
                  className="bezent-pagination__btn"
                  disabled={page >= pagination.totalPages || pagination.totalPages === 0}
                  onClick={() => setPage((p) => p + 1)}
                  aria-label="Next page"
                >
                  ›
                </button>
              </div>
            </Inline>
          }
        />
      )}

      {/* Import Modal */}
      <Modal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        title="Import Employees"
        description="Upload a CSV file with workforce employee records for bulk import."
        footer={
          <Inline gap="sm" justify="end">
            <Button variant="outline" size="sm" onClick={() => setIsImportModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={!importFile}
              onClick={() => {
                if (!importFile) return;
                setImportStatus(
                  `File "${importFile.name}" selected (${(importFile.size / 1024).toFixed(1)} KB). Bulk employee import API endpoint will process these records with duplicate detection.`,
                );
              }}
            >
              Process Import
            </Button>
          </Inline>
        }
      >
        <Stack gap="md">
          <p className="bezent-dialog-hint">
            Ensure your CSV columns match the workforce format:{' '}
            <code>
              First Name, Last Name, Email, Joining Date, Department, Designation, Employment Type
            </code>
            .
          </p>

          <input
            type="file"
            accept=".csv"
            aria-label="Upload CSV file"
            onChange={(e) => {
              const file = e.target.files?.[0] || null;
              setImportFile(file);
              setImportStatus(null);
            }}
          />

          {importStatus && (
            <Alert variant="info" title="Import Status">
              {importStatus}
            </Alert>
          )}
        </Stack>
      </Modal>
    </Page>
  );
}
