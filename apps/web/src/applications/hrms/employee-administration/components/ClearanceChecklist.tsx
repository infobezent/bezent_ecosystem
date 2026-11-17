import { useCallback, useEffect, useState } from 'react';
import { Alert, Button, LoadingState, Stack } from '../../../../design-system/components';
import {
  fetchClearance,
  updateClearanceItem,
  type ClearanceChecklist as ClearanceData,
  type ClearanceItem,
} from '../api/employeeAdministrationApi';

const DEPARTMENT_LABELS: Record<ClearanceItem['department'], string> = {
  it: 'IT',
  admin: 'Admin',
  finance: 'Finance',
  hr: 'HR',
};

const WAIVE_REASON_PROMPT = 'Reason for waiving this mandatory item';

export interface ClearanceChecklistProps {
  actionId: string;
  /** Called after an item changes so lists can refresh their progress. */
  onChanged?: () => void;
}

/** Offboarding clearance: the Settings checklist templates, cleared department by department. */
export function ClearanceChecklist({ actionId, onChanged }: ClearanceChecklistProps) {
  const [data, setData] = useState<ClearanceData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    fetchClearance(actionId)
      .then(setData)
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : 'Failed to load clearance checklist'),
      );
  }, [actionId]);

  useEffect(() => {
    setData(null);
    load();
  }, [load]);

  const change = async (item: ClearanceItem, status: ClearanceItem['status']) => {
    let remarks: string | undefined;
    if (status === 'waived' && item.isMandatory) {
      remarks = window.prompt(WAIVE_REASON_PROMPT)?.trim() || undefined;
      if (!remarks) return;
    }
    setBusyId(item.id);
    try {
      setData(await updateClearanceItem(actionId, item.id, status, remarks));
      onChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update clearance item');
    } finally {
      setBusyId(null);
    }
  };

  if (error && !data) {
    return (
      <Alert variant="error" title="Clearance checklist unavailable">
        {error}
      </Alert>
    );
  }
  if (!data) return <LoadingState label="Loading clearance…" minHeight="sm" />;
  if (data.total === 0) {
    return (
      <Alert variant="info" title="No clearance items">
        No clearance checklist items are configured in Workforce Settings.
      </Alert>
    );
  }

  const departments = (Object.keys(DEPARTMENT_LABELS) as ClearanceItem['department'][]).filter(
    (d) => data.items.some((i) => i.department === d),
  );

  return (
    <Stack gap="sm">
      <div className="bezent-rec-open__bar">
        <strong>Clearance checklist</strong>
        <span className="bezent-records-badge">
          {data.cleared} of {data.total} cleared
        </span>
      </div>
      {error && <Alert variant="error">{error}</Alert>}
      {departments.map((dept) => (
        <div key={dept} className="bezent-clearance-group">
          <div className="bezent-clearance-group__title">{DEPARTMENT_LABELS[dept]}</div>
          {data.items
            .filter((i) => i.department === dept)
            .map((item) => (
              <div key={item.id} className="bezent-clearance-item">
                <span className="bezent-clearance-item__text">
                  {item.itemTitle}
                  {item.isMandatory ? '' : ' (optional)'}
                  {item.remarks ? (
                    <span className="bezent-table-meta-subtitle"> · {item.remarks}</span>
                  ) : null}
                </span>
                <span
                  className={`bezent-status-pill bezent-status-pill--${item.status === 'pending' ? 'warning' : 'success'}`}
                >
                  <span className="bezent-status-pill__dot" aria-hidden="true" />
                  {item.status === 'pending'
                    ? 'Pending'
                    : item.status === 'waived'
                      ? 'Waived'
                      : 'Cleared'}
                </span>
                {item.status === 'pending' ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      loading={busyId === item.id}
                      onClick={() => change(item, 'cleared')}
                    >
                      Clear
                    </Button>
                    <Button
                      variant="text"
                      size="sm"
                      disabled={busyId === item.id}
                      onClick={() => change(item, 'waived')}
                    >
                      Waive
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="text"
                    size="sm"
                    disabled={busyId === item.id}
                    onClick={() => change(item, 'pending')}
                  >
                    Reopen
                  </Button>
                )}
              </div>
            ))}
        </div>
      ))}
    </Stack>
  );
}
