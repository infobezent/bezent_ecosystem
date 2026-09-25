import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  Alert,
  Button,
  EmptyState,
  LoadingState,
  Page,
  Stack,
} from '../../../../design-system/components';
import { EmployeesApiError, fetchEmployeeProfile, type EmployeeProfile } from '../api/employeesApi';
import {
  fetchEmployeeActions,
  type EmployeeActionListItem,
} from '../../employee-administration/api/employeeAdministrationApi';
import { EmployeeActionDetailModal } from '../../employee-administration/components/EmployeeActionDetailModal';
import { EMPLOYEES_PATH, employeeProfilePath } from '../model/employeeModel';
import {
  EmployeeProfileView,
  isProfileTab,
  type ProfileTabId,
} from '../components/EmployeeProfileView';
import { EmploymentHistory } from '../components/EmploymentHistory';

const HISTORY_PAGE_SIZE = 50;

type ProfileState =
  | { status: 'loading' }
  | { status: 'ready'; profile: EmployeeProfile }
  | { status: 'not-found' }
  | { status: 'error'; error: string };

interface HistoryState {
  status: 'loading' | 'error' | 'ready';
  actions: EmployeeActionListItem[];
  error: string | null;
}

function todayIsoDate(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

/** Route: /hrms/administration/employees/:employeeId — the canonical Employee Profile. */
export function EmployeeProfilePage() {
  const { employeeId } = useParams<{ employeeId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get('tab');
  const activeTab: ProfileTabId = isProfileTab(requestedTab) ? requestedTab : 'overview';

  const [state, setState] = useState<ProfileState>({ status: 'loading' });
  const [history, setHistory] = useState<HistoryState>({
    status: 'loading',
    actions: [],
    error: null,
  });
  const [openActionId, setOpenActionId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const reload = useCallback(() => setReloadKey((key) => key + 1), []);

  useEffect(() => {
    if (!employeeId) return;
    let active = true;
    setState({ status: 'loading' });

    fetchEmployeeProfile(employeeId)
      .then((profile) => active && setState({ status: 'ready', profile }))
      .catch((err: unknown) => {
        if (!active) return;
        if (err instanceof EmployeesApiError && err.status === 404) {
          setState({ status: 'not-found' });
        } else {
          setState({
            status: 'error',
            error: err instanceof Error ? err.message : 'Failed to load employee',
          });
        }
      });

    return () => {
      active = false;
    };
  }, [employeeId, reloadKey]);

  // Employment history is loaded when its tab is shown.
  useEffect(() => {
    if (!employeeId || activeTab !== 'history') return;
    let active = true;
    setHistory((prev) => ({ ...prev, status: 'loading', error: null }));

    fetchEmployeeActions({ employeeId, pageSize: HISTORY_PAGE_SIZE })
      .then((res) => active && setHistory({ status: 'ready', actions: res.data, error: null }))
      .catch((err: unknown) => {
        if (!active) return;
        setHistory({
          status: 'error',
          actions: [],
          error: err instanceof Error ? err.message : 'Failed to load employment history',
        });
      });

    return () => {
      active = false;
    };
  }, [employeeId, activeTab, reloadKey]);

  const backToDirectory = () => navigate(EMPLOYEES_PATH);
  const openEmployee = (id: string) => navigate(employeeProfilePath(id));
  const changeTab = (tab: ProfileTabId) =>
    setSearchParams(tab === 'overview' ? {} : { tab }, { replace: true });

  return (
    <Page maxWidth="full" gap="lg">
      {state.status === 'loading' && <LoadingState label="Loading employee…" minHeight="md" />}

      {state.status === 'error' && (
        <Stack gap="sm" align="start">
          <Alert variant="error" title="The employee could not be loaded">
            {state.error}
          </Alert>
          <Button variant="outline" size="sm" onClick={reload}>
            Retry
          </Button>
        </Stack>
      )}

      {state.status === 'not-found' && (
        <EmptyState
          size="compact"
          variant="employees"
          title="Employee not found"
          description="This employee does not exist or belongs to another company."
          primaryAction={{ label: 'Back to Employees', onClick: backToDirectory }}
        />
      )}

      {state.status === 'ready' && (
        <EmployeeProfileView
          profile={state.profile}
          activeTab={activeTab}
          onTabChange={changeTab}
          onBack={backToDirectory}
          onOpenEmployee={openEmployee}
          history={
            <EmploymentHistory
              status={history.status}
              actions={history.actions}
              error={history.error}
              onRetry={reload}
              onOpenAction={setOpenActionId}
            />
          }
        />
      )}

      <EmployeeActionDetailModal
        actionId={openActionId}
        today={todayIsoDate()}
        onClose={() => setOpenActionId(null)}
        // Applying/cancelling from here changes the current record — reload it.
        onChanged={() => reload()}
        onOpenEmployee={(id) => {
          setOpenActionId(null);
          if (id !== employeeId) openEmployee(id);
        }}
      />
    </Page>
  );
}
