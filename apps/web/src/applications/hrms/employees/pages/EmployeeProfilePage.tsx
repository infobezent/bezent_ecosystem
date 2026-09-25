import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  Button,
  EmptyState,
  LoadingState,
  Page,
  Stack,
} from '../../../../design-system/components';
import { EmployeesApiError, fetchEmployee, type EmployeeRecord } from '../api/employeesApi';
import { EMPLOYEES_PATH, employeeProfilePath } from '../model/employeeModel';
import { EmployeeProfileView } from '../components/EmployeeProfileView';

type ProfileState =
  | { status: 'loading' }
  | { status: 'ready'; employee: EmployeeRecord }
  | { status: 'not-found' }
  | { status: 'error'; error: string };

/** Route: /hrms/administration/employees/:employeeId — the canonical Employee Profile. */
export function EmployeeProfilePage() {
  const { employeeId } = useParams<{ employeeId: string }>();
  const navigate = useNavigate();
  const [state, setState] = useState<ProfileState>({ status: 'loading' });
  const [reloadKey, setReloadKey] = useState(0);

  const reload = useCallback(() => setReloadKey((key) => key + 1), []);

  useEffect(() => {
    if (!employeeId) return;
    let active = true;
    setState({ status: 'loading' });

    fetchEmployee(employeeId)
      .then((employee) => active && setState({ status: 'ready', employee }))
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

  const backToDirectory = () => navigate(EMPLOYEES_PATH);

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
          employee={state.employee}
          onBack={backToDirectory}
          onOpenEmployee={(id) => navigate(employeeProfilePath(id))}
        />
      )}
    </Page>
  );
}
