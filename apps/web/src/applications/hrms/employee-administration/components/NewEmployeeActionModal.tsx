import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Actions,
  Alert,
  Button,
  LoadingState,
  Modal,
  Stack,
} from '../../../../design-system/components';
import {
  EmployeeAdministrationApiError,
  createEmployeeAction,
  fetchEmployees,
  fetchOrganizationMasters,
  type EmployeeActionDetail,
  type EmployeeActionType,
  type EmployeeRecord,
  type OrganizationMasters,
} from '../api/employeeAdministrationApi';
import {
  ACTION_TYPES,
  EMPTY_ACTION_FORM,
  buildCreatePayload,
  isSeparatedEmployee,
  validateActionForm,
  type ActionFormErrors,
  type ActionFormState,
} from '../model/actionCatalog';
import { EmployeeActionForm } from './EmployeeActionForm';
import type { EmployeeActionCategory } from '../api/employeeAdministrationApi';

export interface NewEmployeeActionPreset {
  employee?: EmployeeRecord;
  actionType?: EmployeeActionType;
  /** Restricts offered action types, e.g. the probation view offers only probation decisions. */
  category?: EmployeeActionCategory;
}

export interface NewEmployeeActionModalProps {
  isOpen: boolean;
  preset?: NewEmployeeActionPreset;
  onClose: () => void;
  onCreated: (action: EmployeeActionDetail) => void;
}

const EMPLOYEE_PAGE_SIZE = 100;

export function NewEmployeeActionModal({
  isOpen,
  preset,
  onClose,
  onCreated,
}: NewEmployeeActionModalProps) {
  const [form, setForm] = useState<ActionFormState>(EMPTY_ACTION_FORM);
  const [errors, setErrors] = useState<ActionFormErrors>({});
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [masters, setMasters] = useState<OrganizationMasters | null>(null);
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [employeesLoaded, setEmployeesLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  // Reset the form whenever the modal opens.
  useEffect(() => {
    if (!isOpen) return;
    setForm({
      ...EMPTY_ACTION_FORM,
      employeeId: preset?.employee?.id ?? '',
      actionType: preset?.actionType ?? '',
    });
    setErrors({});
    setSubmitError(null);
    setEmployeeSearch('');
  }, [isOpen, preset]);

  // Masters load once per open.
  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    fetchOrganizationMasters()
      .then((data) => active && setMasters(data))
      .catch((err: unknown) => {
        if (!active) return;
        setLoadError(err instanceof Error ? err.message : 'Failed to load organization masters');
      });
    return () => {
      active = false;
    };
  }, [isOpen, reloadKey]);

  // Employee options follow the search box (server-side search).
  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    const timer = setTimeout(() => {
      fetchEmployees({ search: employeeSearch || undefined, pageSize: EMPLOYEE_PAGE_SIZE })
        .then((res) => {
          if (!active) return;
          setEmployees(res.data.filter((employee) => !isSeparatedEmployee(employee)));
          setEmployeesLoaded(true);
        })
        .catch((err: unknown) => {
          if (!active) return;
          setLoadError(err instanceof Error ? err.message : 'Failed to load employees');
        });
    }, 250);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [isOpen, employeeSearch, reloadKey]);

  // Keep the selected (or preset) employee available even when a search hides it.
  const selectedEmployee =
    employees.find((employee) => employee.id === form.employeeId) ??
    (preset?.employee?.id === form.employeeId ? preset.employee : undefined);
  const employeeOptions = useMemo(
    () =>
      selectedEmployee && !employees.some((employee) => employee.id === selectedEmployee.id)
        ? [selectedEmployee, ...employees]
        : employees,
    [employees, selectedEmployee],
  );

  const actionTypes = preset?.category
    ? ACTION_TYPES.filter((type) => type.category === preset.category)
    : ACTION_TYPES;

  const loadState: 'loading' | 'error' | 'ready' = loadError
    ? 'error'
    : employeesLoaded && masters
      ? 'ready'
      : 'loading';

  const handleRetry = useCallback(() => {
    setLoadError(null);
    setReloadKey((key) => key + 1);
  }, []);

  const handleSubmit = async () => {
    const validation = validateActionForm(form);
    setErrors(validation);
    setSubmitError(null);
    if (Object.keys(validation).length > 0) return;

    setSubmitting(true);
    try {
      const created = await createEmployeeAction(buildCreatePayload(form));
      onCreated(created);
    } catch (err) {
      if (err instanceof EmployeeAdministrationApiError && err.details) {
        setErrors(err.details);
      }
      setSubmitError(err instanceof Error ? err.message : 'Failed to create employee action');
    } finally {
      setSubmitting(false);
    }
  };

  const isProbation = preset?.category === 'probation';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      title="New Employee Action"
      description="Request an employment change for an existing employee. The employee record changes only when the action is applied."
      footer={
        <Actions align="end" gap="sm">
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            loading={submitting}
            disabled={loadState !== 'ready'}
          >
            Submit
          </Button>
        </Actions>
      }
    >
      {loadState === 'error' ? (
        <Stack gap="sm" align="start">
          <Alert variant="error" title="Could not load employees or organization masters">
            {loadError}
          </Alert>
          <Button variant="outline" size="sm" onClick={handleRetry}>
            Retry
          </Button>
        </Stack>
      ) : loadState === 'loading' ? (
        <LoadingState label="Loading employees…" minHeight="sm" />
      ) : (
        <>
          {submitError && (
            <Alert variant="error" title="The action was not created">
              {submitError}
            </Alert>
          )}
          <EmployeeActionForm
            form={form}
            errors={errors}
            employees={employeeOptions}
            masters={masters}
            actionTypes={actionTypes}
            actionTypeLabel={isProbation ? 'Decision' : 'Action Type'}
            employeeSearch={employeeSearch}
            onEmployeeSearchChange={setEmployeeSearch}
            onChange={setForm}
          />
        </>
      )}
    </Modal>
  );
}
