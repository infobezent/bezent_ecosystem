import { useCallback, useEffect, useState } from 'react';
import {
  Actions,
  Alert,
  Button,
  FormField,
  LoadingState,
  Modal,
  Stack,
  Textarea,
} from '../../../../design-system/components';
import {
  applyEmployeeAction,
  cancelEmployeeAction,
  fetchEmployeeAction,
  type EmployeeActionDetail as EmployeeActionDetailData,
} from '../api/employeeAdministrationApi';
import { actionTypeLabel } from '../model/actionCatalog';
import { EmployeeActionDetail } from './EmployeeActionDetail';

export interface EmployeeActionDetailModalProps {
  actionId: string | null;
  today: string;
  onClose: () => void;
  /** Called after the action was applied or cancelled on the server. */
  onChanged: (action: EmployeeActionDetailData, message: string) => void;
  /** Navigates to the canonical Employee Profile. */
  onOpenEmployee: (employeeId: string) => void;
}

export function EmployeeActionDetailModal({
  actionId,
  today,
  onClose,
  onChanged,
  onOpenEmployee,
}: EmployeeActionDetailModalProps) {
  const [action, setAction] = useState<EmployeeActionDetailData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [commandError, setCommandError] = useState<string | null>(null);
  const [busy, setBusy] = useState<'apply' | 'cancel' | null>(null);
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!actionId) return;
    let active = true;
    setAction(null);
    setLoadError(null);
    setCommandError(null);
    setConfirmingCancel(false);
    setCancelReason('');

    fetchEmployeeAction(actionId)
      .then((data) => active && setAction(data))
      .catch((err: unknown) => {
        if (active) setLoadError(err instanceof Error ? err.message : 'Failed to load action');
      });

    return () => {
      active = false;
    };
  }, [actionId, reloadKey]);

  const retry = useCallback(() => setReloadKey((key) => key + 1), []);

  const handleApply = async () => {
    if (!action) return;
    setBusy('apply');
    setCommandError(null);
    try {
      const applied = await applyEmployeeAction(action.id, action.version);
      setAction(applied);
      onChanged(
        applied,
        `${actionTypeLabel(applied.actionType)} applied to ${applied.employeeName}.`,
      );
    } catch (err) {
      setCommandError(err instanceof Error ? err.message : 'Failed to apply action');
    } finally {
      setBusy(null);
    }
  };

  const handleCancel = async () => {
    if (!action) return;
    setBusy('cancel');
    setCommandError(null);
    try {
      const cancelled = await cancelEmployeeAction(action.id, action.version, cancelReason.trim());
      setAction(cancelled);
      setConfirmingCancel(false);
      onChanged(
        cancelled,
        `${actionTypeLabel(cancelled.actionType)} for ${cancelled.employeeName} was cancelled.`,
      );
    } catch (err) {
      setCommandError(err instanceof Error ? err.message : 'Failed to cancel action');
    } finally {
      setBusy(null);
    }
  };

  const isPending = action?.status === 'pending';
  const notYetEffective = Boolean(action && action.effectiveDate > today);

  const footer = isPending ? (
    confirmingCancel ? (
      <Actions align="end" gap="sm">
        <Button
          variant="secondary"
          onClick={() => setConfirmingCancel(false)}
          disabled={busy !== null}
        >
          Keep Action
        </Button>
        <Button variant="danger" onClick={handleCancel} loading={busy === 'cancel'}>
          Confirm Cancellation
        </Button>
      </Actions>
    ) : (
      <Actions align="end" gap="sm">
        <Button
          variant="outline"
          onClick={() => setConfirmingCancel(true)}
          disabled={busy !== null}
        >
          Cancel Action
        </Button>
        <Button
          variant="primary"
          onClick={handleApply}
          loading={busy === 'apply'}
          disabled={notYetEffective || busy !== null}
        >
          Apply Action
        </Button>
      </Actions>
    )
  ) : (
    <Actions align="end">
      <Button variant="secondary" onClick={onClose}>
        Close
      </Button>
    </Actions>
  );

  return (
    <Modal
      isOpen={actionId !== null}
      onClose={onClose}
      size="xl"
      title={
        action
          ? `${actionTypeLabel(action.actionType)} · ${action.employeeName}`
          : 'Employee Action'
      }
      footer={action ? footer : undefined}
    >
      {loadError ? (
        <Stack gap="sm" align="start">
          <Alert variant="error" title="The action could not be loaded">
            {loadError}
          </Alert>
          <Button variant="outline" size="sm" onClick={retry}>
            Retry
          </Button>
        </Stack>
      ) : !action ? (
        <LoadingState label="Loading action…" minHeight="sm" />
      ) : (
        <Stack gap="md">
          {commandError && (
            <Alert variant="error" title="The request was not completed">
              {commandError}
            </Alert>
          )}
          {confirmingCancel && (
            <FormField label="Cancellation Reason" htmlFor="employee-action-cancel-reason">
              <Textarea
                id="employee-action-cancel-reason"
                rows={2}
                maxLength={1000}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
              />
            </FormField>
          )}
          <EmployeeActionDetail action={action} today={today} onOpenEmployee={onOpenEmployee} />
        </Stack>
      )}
    </Modal>
  );
}
