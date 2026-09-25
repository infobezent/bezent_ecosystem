import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Button,
  Inline,
  Label,
  Page,
  PageHeader,
  SearchInput,
  Section,
  Stack,
  Tabs,
  Toolbar,
} from '../../../../design-system/components';
import { BezentIcon } from '../../../../design-system/icons';
import {
  fetchEmployeeActions,
  fetchEmployees,
  type ActionCategoryCounts,
  type EmployeeActionDetail,
  type EmployeeActionListItem,
  type EmployeeRecord,
  type PaginationMetadata,
} from '../api/employeeAdministrationApi';
import { ACTION_TABS, type ActionTabId } from '../model/actionCatalog';
import { ActionQueue, type LoadStatus } from '../components/ActionQueue';
import { ProbationQueue } from '../components/ProbationQueue';
import {
  NewEmployeeActionModal,
  type NewEmployeeActionPreset,
} from '../components/NewEmployeeActionModal';
import { EmployeeActionDetailModal } from '../components/EmployeeActionDetailModal';
import { employeeProfilePath } from '../../employees/model/employeeModel';

const PAGE_SIZE = 25;
const PROBATION_PAGE_SIZE = 100;

function todayIsoDate(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

interface QueueState {
  status: LoadStatus;
  items: EmployeeActionListItem[];
  counts: ActionCategoryCounts | null;
  pagination: PaginationMetadata | null;
  error: string | null;
}

interface ProbationState {
  status: LoadStatus;
  employees: EmployeeRecord[];
  error: string | null;
}

/**
 * Employee Administration — the HR operational queue of employment actions
 * (job changes, probation decisions, transfers, status changes, separations)
 * performed on existing employees.
 */
export function EmployeeAdministrationPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<ActionTabId>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);
  const [queue, setQueue] = useState<QueueState>({
    status: 'loading',
    items: [],
    counts: null,
    pagination: null,
    error: null,
  });
  const [probation, setProbation] = useState<ProbationState>({
    status: 'loading',
    employees: [],
    error: null,
  });
  const [newActionPreset, setNewActionPreset] = useState<NewEmployeeActionPreset | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const today = todayIsoDate();

  const reload = useCallback(() => setReloadKey((key) => key + 1), []);

  // Action queue (server-side filtering by tab and search).
  useEffect(() => {
    let active = true;
    setQueue((prev) => ({ ...prev, status: 'loading', error: null }));

    const timer = setTimeout(() => {
      fetchEmployeeActions({
        category: activeTab === 'all' ? undefined : activeTab,
        search: search.trim() || undefined,
        page,
        pageSize: PAGE_SIZE,
      })
        .then((res) => {
          if (!active) return;
          setQueue({
            status: 'ready',
            items: res.data,
            counts: res.counts,
            pagination: res.pagination,
            error: null,
          });
        })
        .catch((err: unknown) => {
          if (!active) return;
          setQueue((prev) => ({
            ...prev,
            status: 'error',
            error: err instanceof Error ? err.message : 'Failed to load employee actions',
          }));
        });
    }, 200);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [activeTab, search, page, reloadKey]);

  // Probation operational view: employees currently on probation.
  useEffect(() => {
    if (activeTab !== 'probation') return;
    let active = true;
    setProbation((prev) => ({ ...prev, status: 'loading', error: null }));

    fetchEmployees({ employmentStatus: 'probation', pageSize: PROBATION_PAGE_SIZE })
      .then((res) => {
        if (active) setProbation({ status: 'ready', employees: res.data, error: null });
      })
      .catch((err: unknown) => {
        if (!active) return;
        setProbation({
          status: 'error',
          employees: [],
          error: err instanceof Error ? err.message : 'Failed to load employees on probation',
        });
      });

    return () => {
      active = false;
    };
  }, [activeTab, reloadKey]);

  const changeTab = (id: string) => {
    setActiveTab(id as ActionTabId);
    setPage(1);
  };

  const changeSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const openNewAction = (preset: NewEmployeeActionPreset = {}) => setNewActionPreset(preset);

  const handleCreated = (action: EmployeeActionDetail) => {
    setNewActionPreset(null);
    setSuccessMessage(`Employee action created for ${action.employeeName}.`);
    reload();
    setDetailId(action.id);
  };

  const handleChanged = (_action: EmployeeActionDetail, message: string) => {
    setSuccessMessage(message);
    reload();
  };

  const counts = queue.counts;
  const pagination = queue.pagination;
  const activeTabLabel = ACTION_TABS.find((tab) => tab.id === activeTab)?.label ?? 'All Actions';

  return (
    <Page maxWidth="full" gap="lg">
      <PageHeader
        eyebrow="HRMS · Administration"
        title="Employee Administration"
        subtitle="Manage employee changes, confirmations, transfers and employment actions."
        actions={
          <Button
            variant="primary"
            leftIcon={<BezentIcon name="plusSign" size={16} />}
            onClick={() =>
              openNewAction(activeTab === 'probation' ? { category: 'probation' } : {})
            }
          >
            New Employee Action
          </Button>
        }
      />

      {successMessage && (
        <Alert variant="success" dismissible onDismiss={() => setSuccessMessage(null)}>
          {successMessage}
        </Alert>
      )}

      <Toolbar
        left={
          <Tabs
            activeId={activeTab}
            onChange={changeTab}
            items={ACTION_TABS.map((tab) => ({
              id: tab.id,
              label: tab.label,
              count: counts ? counts[tab.id] : undefined,
            }))}
          />
        }
        right={
          <SearchInput
            placeholder="Search by employee name or ID"
            value={search}
            onChange={(e) => changeSearch(e.target.value)}
            onClear={() => changeSearch('')}
            aria-label="Search employee actions"
          />
        }
      />

      {activeTab === 'probation' && (
        <Section
          title="Confirmations Due"
          subtitle="Employees currently on probation. Confirm them or extend their probation."
        >
          <ProbationQueue
            status={probation.status}
            employees={probation.employees}
            error={probation.error}
            onRetry={reload}
            onConfirm={(employee) =>
              openNewAction({ employee, actionType: 'confirm_employee', category: 'probation' })
            }
            onOpenEmployee={(employeeId) => navigate(employeeProfilePath(employeeId))}
            onExtend={(employee) =>
              openNewAction({ employee, actionType: 'extend_probation', category: 'probation' })
            }
          />
        </Section>
      )}

      <Section title={activeTab === 'probation' ? 'Probation Actions' : activeTabLabel}>
        <Stack gap="md">
          <ActionQueue
            status={queue.status}
            items={queue.items}
            error={queue.error}
            filtered={activeTab !== 'all' || search.trim() !== ''}
            onRetry={reload}
            onOpen={setDetailId}
            onOpenEmployee={(employeeId) => navigate(employeeProfilePath(employeeId))}
            onCreate={() => openNewAction()}
          />

          {queue.status === 'ready' && pagination && pagination.totalPages > 1 && (
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
      </Section>

      <NewEmployeeActionModal
        isOpen={newActionPreset !== null}
        preset={newActionPreset ?? undefined}
        onClose={() => setNewActionPreset(null)}
        onCreated={handleCreated}
      />

      <EmployeeActionDetailModal
        actionId={detailId}
        today={today}
        onClose={() => setDetailId(null)}
        onChanged={handleChanged}
        onOpenEmployee={(employeeId) => navigate(employeeProfilePath(employeeId))}
      />
    </Page>
  );
}
