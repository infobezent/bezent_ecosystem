import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  Alert,
  AvatarPicker,
  Button,
  EmptyState,
  LoadingState,
  Page,
  Stack,
} from '../../../../design-system/components';
import { useOptionalAuth } from '../../../../platform/auth';
import { EmployeesApiError, fetchEmployeeProfile, type EmployeeProfile } from '../api/employeesApi';
import {
  fetchEmployeeActions,
  type EmployeeActionListItem,
} from '../../employee-administration/api/employeeAdministrationApi';
import { EmployeeActionDetailModal } from '../../employee-administration/components/EmployeeActionDetailModal';
import { fetchDocuments, type EmployeeDocument } from '../../documents/api/documentsApi';
import { DocumentDetailModal } from '../../documents/components/DocumentDetail';
import { EMPLOYEES_PATH, employeeProfilePath, getEmployeeAvatarId } from '../model/employeeModel';
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

interface DocumentsState {
  status: 'loading' | 'error' | 'ready';
  documents: EmployeeDocument[];
  error: string | null;
}

function todayIsoDate(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

/**
 * Route: /hrms/workforce/employees/:employeeId (and legacy /hrms/administration/employees/:employeeId)
 * Canonical Employee Profile Workspace View.
 */
export function EmployeeProfilePage() {
  const { employeeId } = useParams<{ employeeId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const auth = useOptionalAuth();
  const canEdit = auth ? auth.can('hrms.employees.update') : true;

  const requestedTab = searchParams.get('tab');
  const activeTab: ProfileTabId = isProfileTab(requestedTab) ? requestedTab : 'personal';

  const [state, setState] = useState<ProfileState>({ status: 'loading' });

  // History state
  const [history, setHistory] = useState<HistoryState>({
    status: 'loading',
    actions: [],
    error: null,
  });
  const [openActionId, setOpenActionId] = useState<string | null>(null);

  // Documents state
  const [documentsState, setDocumentsState] = useState<DocumentsState>({
    status: 'loading',
    documents: [],
    error: null,
  });
  const [openDocId, setOpenDocId] = useState<string | null>(null);

  // Avatar picker state
  const [selectedAvatarId, setSelectedAvatarId] = useState<string | null>(null);
  const [isAvatarPickerOpen, setIsAvatarPickerOpen] = useState(false);

  const [reloadKey, setReloadKey] = useState(0);
  const reload = useCallback(() => setReloadKey((key) => key + 1), []);

  // Fetch Core Profile
  useEffect(() => {
    if (!employeeId) return;
    let active = true;
    setState({ status: 'loading' });

    fetchEmployeeProfile(employeeId)
      .then((profile) => {
        if (!active) return;
        setState({ status: 'ready', profile });
      })
      .catch((err: unknown) => {
        if (!active) return;
        if (err instanceof EmployeesApiError && err.status === 404) {
          setState({ status: 'not-found' });
        } else {
          setState({
            status: 'error',
            error: err instanceof Error ? err.message : 'Failed to load employee profile',
          });
        }
      });

    return () => {
      active = false;
    };
  }, [employeeId, reloadKey]);

  // Fetch Employment history when tab is 'history'
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

  // Fetch Documents when tab is 'documents'
  useEffect(() => {
    if (!employeeId || activeTab !== 'documents') return;
    let active = true;
    setDocumentsState((prev) => ({ ...prev, status: 'loading', error: null }));

    fetchDocuments({ employeeId, pageSize: 50 })
      .then(
        (res) => active && setDocumentsState({ status: 'ready', documents: res.data, error: null }),
      )
      .catch((err: unknown) => {
        if (!active) return;
        setDocumentsState({
          status: 'error',
          documents: [],
          error: err instanceof Error ? err.message : 'Failed to load employee documents',
        });
      });

    return () => {
      active = false;
    };
  }, [employeeId, activeTab, reloadKey]);

  const backToDirectory = () => {
    navigate(EMPLOYEES_PATH);
  };

  const openEmployee = (id: string) => navigate(employeeProfilePath(id));

  const changeTab = (tab: ProfileTabId) => {
    setSearchParams(tab === 'personal' ? {} : { tab }, { replace: true });
  };

  const handleStartEdit = () => {
    if (!canEdit || !employeeId) return;
    navigate(`/hrms/workforce/employees/${encodeURIComponent(employeeId)}/edit`);
  };

  return (
    <Page maxWidth="full" gap="lg">
      {state.status === 'loading' && (
        <LoadingState label="Loading employee profile…" minHeight="md" />
      )}

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
          onNavigateWorkflow={(path) => navigate(path)}
          onEditProfile={handleStartEdit}
          canEdit={canEdit}
          avatarId={
            selectedAvatarId ??
            getEmployeeAvatarId(state.profile.employee.id || state.profile.employee.employeeNumber)
          }
          onOpenAvatarPicker={() => setIsAvatarPickerOpen(true)}
          documents={documentsState.documents}
          documentsLoading={documentsState.status === 'loading'}
          documentsError={documentsState.error}
          onViewDocument={(docId) => setOpenDocId(docId)}
          onRetryDocuments={reload}
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

      {/* Avatar Selection Dialog */}
      {state.status === 'ready' && (
        <AvatarPicker
          isOpen={isAvatarPickerOpen}
          onClose={() => setIsAvatarPickerOpen(false)}
          selectedAvatarId={
            selectedAvatarId ??
            getEmployeeAvatarId(state.profile.employee.id || state.profile.employee.employeeNumber)
          }
          onSelectAvatar={(avatarId) => {
            setSelectedAvatarId(avatarId);
            setIsAvatarPickerOpen(false);
          }}
          title={`Choose Avatar for ${state.profile.employee.fullName}`}
          description="Select an enterprise-verified 3D avatar identity for this employee profile."
        />
      )}

      {/* Workflow Action Detail Modal */}
      <EmployeeActionDetailModal
        actionId={openActionId}
        today={todayIsoDate()}
        onClose={() => setOpenActionId(null)}
        onChanged={() => reload()}
        onOpenEmployee={(id) => {
          setOpenActionId(null);
          if (id !== employeeId) openEmployee(id);
        }}
      />

      {/* Document View Modal */}
      <DocumentDetailModal documentId={openDocId} onClose={() => setOpenDocId(null)} />
    </Page>
  );
}
