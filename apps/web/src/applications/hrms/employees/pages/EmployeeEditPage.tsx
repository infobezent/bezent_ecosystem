import { useCallback, useEffect, useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  Button,
  EmptyState,
  LoadingState,
  Page,
  Stack,
} from '../../../../design-system/components';
import { useOptionalAuth } from '../../../../platform/auth';
import { EmployeesApiError, fetchEmployeeProfile, type EmployeeProfile } from '../api/employeesApi';
import { EmployeeRegistration } from '../../onboarding/components/EmployeeRegistration';
import { RegistrationConfigLoader } from '../../onboarding/registration/registrationConfig';
import type { RegistrationFormData } from '../../onboarding/types/registration.types';
import { profileToRegistrationData, saveEmployeeEdits } from '../model/employeeRegistrationAdapter';

type EditorState =
  | { status: 'loading' }
  | { status: 'ready'; profile: EmployeeProfile; initialFormData: RegistrationFormData }
  | { status: 'not-found' }
  | { status: 'error'; error: string };

/**
 * Route: /hrms/workforce/employees/:employeeId/edit
 * Rendered through StandaloneUtilityLayout (full-screen workspace outside main ShellLayout).
 * Reuses the ten-tab Employee Registration form architecture with existing employee data prefilled.
 */
export function EmployeeEditPage() {
  const { employeeId } = useParams<{ employeeId: string }>();
  const navigate = useNavigate();
  const auth = useOptionalAuth();
  const canEdit = auth ? auth.can('hrms.employees.update') : true;

  const [state, setState] = useState<EditorState>({ status: 'loading' });
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const profilePath = useMemo(() => {
    return employeeId
      ? `/hrms/workforce/employees/${encodeURIComponent(employeeId)}`
      : '/hrms/workforce/employees';
  }, [employeeId]);

  const loadProfile = useCallback(async () => {
    if (!employeeId) {
      setState({ status: 'not-found' });
      return;
    }
    setState({ status: 'loading' });
    setSaveError(null);
    try {
      const profile = await fetchEmployeeProfile(employeeId);
      const initialFormData = profileToRegistrationData(profile);
      setState({ status: 'ready', profile, initialFormData });
    } catch (err) {
      if (err instanceof EmployeesApiError && err.status === 404) {
        setState({ status: 'not-found' });
      } else {
        setState({
          status: 'error',
          error:
            err instanceof Error ? err.message : 'Failed to load employee profile for editing.',
        });
      }
    }
  }, [employeeId]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const handleCancel = useCallback(() => {
    navigate(profilePath);
  }, [navigate, profilePath]);

  const handleSaveEdit = useCallback(
    async (formData: RegistrationFormData) => {
      if (!employeeId || state.status !== 'ready') return;
      setIsSaving(true);
      setSaveError(null);

      try {
        await saveEmployeeEdits(employeeId, state.profile, formData);
        // On confirmed persistence, return to the Employee Profile view
        navigate(profilePath, { replace: true });
      } catch (err) {
        setIsSaving(false);
        setSaveError(
          err instanceof Error
            ? err.message
            : 'Could not save employee changes. Please check entered information and try again.',
        );
      }
    },
    [employeeId, state, navigate, profilePath],
  );

  // Permission check
  if (!canEdit) {
    return (
      <Page maxWidth="default">
        <EmptyState
          title="Access Restricted"
          description="You do not have permission to edit employee records (hrms.employees.update required)."
          primaryAction={{
            label: 'Back to Employee Profile',
            onClick: handleCancel,
          }}
        />
      </Page>
    );
  }

  if (state.status === 'loading') {
    return (
      <Page maxWidth="default">
        <LoadingState label="Loading employee workspace for editing..." />
      </Page>
    );
  }

  if (state.status === 'not-found') {
    return (
      <Page maxWidth="default">
        <EmptyState
          title="Employee Not Found"
          description={`No employee record exists for ID "${employeeId}".`}
          primaryAction={{
            label: 'Back to Employees',
            onClick: () => navigate('/hrms/workforce/employees'),
          }}
        />
      </Page>
    );
  }

  if (state.status === 'error') {
    return (
      <Page maxWidth="default">
        <Stack gap="lg">
          <Alert variant="danger">{state.error}</Alert>
          <Button variant="secondary" onClick={() => void loadProfile()}>
            Retry Loading
          </Button>
        </Stack>
      </Page>
    );
  }

  return (
    <RegistrationConfigLoader>
      <EmployeeRegistration
        mode="edit"
        employeeId={employeeId}
        employeeName={state.profile.employee.fullName}
        employeeNumber={state.profile.employee.employeeNumber}
        initialFormData={state.initialFormData}
        onCancel={handleCancel}
        onSaveEdit={handleSaveEdit}
        isSavingEdit={isSaving}
        saveEditError={saveError}
      />
    </RegistrationConfigLoader>
  );
}
