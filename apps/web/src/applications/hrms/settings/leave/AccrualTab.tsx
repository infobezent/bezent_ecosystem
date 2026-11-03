import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Card,
  CardDescription,
  CardTitle,
  EmptyState,
  FormField,
  Grid,
  Inline,
  Input,
  Modal,
  Select,
  Spinner,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '../../../../design-system/components';
import { LeaveSettingsHeader } from './LeaveSettingsHeader';
import { LeaveStatGrid } from './LeaveStatGrid';
import { accrualApi } from './api/leaveAdminApi';
import type {
  AccrualRule,
  AccrualRuleRow,
  AccrualTiming,
  GrantMethod,
  YearEndPreview,
  YearEndRun,
} from './types/leaveAdmin.types';

export interface AccrualTabProps {
  canManage?: boolean;
  initialRows?: AccrualRuleRow[];
}

const GRANT_LABELS: Record<GrantMethod, string> = {
  upfront_annual: 'Full year at cycle start',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  half_yearly: 'Half-yearly',
  manual_only: 'Manual only',
};

const TIMING_LABELS: Record<AccrualTiming, string> = {
  cycle_start: 'All at cycle start',
  period_start: 'Start of each period',
  period_end: 'End of each period',
};

const errorText = (err: unknown, fallback: string) =>
  err instanceof Error ? err.message : fallback;
const days = (n: number | null) => (n === null ? 'No limit' : `${n} day(s)`);

export function AccrualTab({ canManage = true, initialRows }: AccrualTabProps = {}) {
  const [rows, setRows] = useState<AccrualRuleRow[]>(initialRows ?? []);
  const [loading, setLoading] = useState(!initialRows);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editing, setEditing] = useState<AccrualRuleRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRows(await accrualApi.rules());
    } catch (err) {
      setError(errorText(err, 'Failed to load accrual rules'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!initialRows) void load();
  }, [initialRows, load]);

  const tracked = rows.filter(
    (r) => r.leaveType.isTracked && r.leaveType.category !== 'optional_holiday',
  );

  return (
    <Stack gap="lg">
      <LeaveSettingsHeader
        icon="analytics"
        title="Accrual & Carry Forward"
        subtitle="How policy quotas become balance, and what happens to unused days at year end."
      />
      {!loading && tracked.length > 0 && (
        <LeaveStatGrid
          stats={[
            {
              label: 'Tracked Types',
              value: tracked.length,
              caption: 'Tracked Balances',
              icon: 'leave',
            },
            {
              label: 'Monthly Accrual',
              value: tracked.filter((r) => r.current.grantMethod === 'monthly').length,
              caption: 'Monthly Credit',
              icon: 'calendar',
              tone: 'blue',
            },
            {
              label: 'Carry Forward',
              value: tracked.filter((r) => r.current.carryForwardEnabled).length,
              caption: 'Rolls Over',
              icon: 'arrowright',
              tone: 'green',
            },
            {
              label: 'Encashment',
              value: tracked.filter((r) => r.current.encashmentEnabled).length,
              caption: 'Year-End Payout',
              icon: 'payroll',
              tone: 'purple',
            },
          ]}
        />
      )}
      {success && (
        <Alert variant="success" title="Success" dismissible onDismiss={() => setSuccess(null)}>
          {success}
        </Alert>
      )}
      {error && (
        <Alert variant="error" title="Error" dismissible onDismiss={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Card padding="none">
        {loading ? (
          <Card padding="lg">
            <Inline justify="center" gap="sm">
              <Spinner size="md" />
              <span>Loading accrual rules...</span>
            </Inline>
          </Card>
        ) : tracked.length === 0 ? (
          <EmptyState
            title="No Tracked Leave Types"
            description="Accrual applies to leave types that track a balance."
          />
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Leave Type</TableHeaderCell>
                <TableHeaderCell>Accrual</TableHeaderCell>
                <TableHeaderCell>Carry Forward</TableHeaderCell>
                <TableHeaderCell>Encashment</TableHeaderCell>
                <TableHeaderCell>Actions</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {tracked.map((row) => {
                const r = row.current;
                return (
                  <TableRow key={row.leaveType.id}>
                    <TableCell>
                      <Inline gap="xs" align="center">
                        <strong>{row.leaveType.name}</strong>
                        <Badge variant="neutral">{row.leaveType.code}</Badge>
                      </Inline>
                      <CardDescription>
                        {r.isDefault ? 'Default rule' : `Effective ${r.effectiveFrom}`}
                        {row.scheduled.length > 0 &&
                          ` · change scheduled ${row.scheduled[0]!.effectiveFrom}`}
                      </CardDescription>
                    </TableCell>
                    <TableCell>
                      {GRANT_LABELS[r.grantMethod]}
                      {r.grantMethod !== 'upfront_annual' && r.grantMethod !== 'manual_only' && (
                        <CardDescription>{TIMING_LABELS[r.accrualTiming]}</CardDescription>
                      )}
                    </TableCell>
                    <TableCell>
                      {r.carryForwardEnabled ? (
                        <>
                          Up to {days(r.maxCarryForwardDays)}
                          {r.carryForwardExpiryMonths && (
                            <CardDescription>
                              Expires after {r.carryForwardExpiryMonths} month(s)
                            </CardDescription>
                          )}
                        </>
                      ) : (
                        <Badge variant="neutral">Off</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {r.encashmentEnabled ? (
                        `Max ${days(r.maxEncashableDays)}, keep ${r.minBalanceToRetain}`
                      ) : (
                        <Badge variant="neutral">Off</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {canManage && (
                        <Button
                          variant="secondary"
                          size="sm"
                          type="button"
                          onClick={() => setEditing(row)}
                        >
                          Edit
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>

      <YearEndPanel canManage={canManage} />

      {editing && (
        <RuleDrawer
          row={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            setSuccess(`Accrual rule for ${editing.leaveType.name} saved.`);
            void load();
          }}
        />
      )}
    </Stack>
  );
}

function RuleDrawer({
  row,
  onClose,
  onSaved,
}: {
  row: AccrualRuleRow;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [rule, setRule] = useState<AccrualRule>(row.current);
  const [effectiveFrom, setEffectiveFrom] = useState(new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof AccrualRule>(key: K, value: AccrualRule[K]) =>
    setRule((p) => ({ ...p, [key]: value }));
  const optNum = (v: string) => (v.trim() === '' ? null : Number(v));
  const toggle = (key: keyof AccrualRule, title: string, description: string) => (
    <Inline justify="between" align="center">
      <div>
        <strong>{title}</strong>
        <CardDescription>{description}</CardDescription>
      </div>
      <Switch
        checked={Boolean(rule[key])}
        onChange={(e) => set(key, e.target.checked as never)}
        aria-label={title}
      />
    </Inline>
  );

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const { id: _id, leaveTypeId: _t, isDefault: _d, ...dto } = rule;
      await accrualApi.saveRule(row.leaveType.id, { ...dto, effectiveFrom });
      onSaved();
    } catch (err) {
      setError(errorText(err, 'Failed to save accrual rule'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      variant="drawer"
      size="drawer"
      title={`Accrual — ${row.leaveType.name}`}
      description="Rules are versioned by effective date; past balances are never recalculated."
      footer={
        <Inline justify="between">
          <Button variant="secondary" type="button" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button variant="primary" type="button" onClick={() => void save()} disabled={saving}>
            {saving ? 'Saving...' : 'Save Rule'}
          </Button>
        </Inline>
      }
    >
      <Stack gap="lg">
        {error && (
          <Alert variant="error" title="Could not save">
            {error}
          </Alert>
        )}
        <Card padding="lg">
          <Stack gap="md">
            <CardTitle>Accrual</CardTitle>
            <Grid columns={2} gap="md">
              <FormField label="Grant Method" htmlFor="acGrant">
                <Select
                  id="acGrant"
                  value={rule.grantMethod}
                  onChange={(e) => set('grantMethod', e.target.value as GrantMethod)}
                >
                  {(Object.keys(GRANT_LABELS) as GrantMethod[]).map((g) => (
                    <option key={g} value={g}>
                      {GRANT_LABELS[g]}
                    </option>
                  ))}
                </Select>
              </FormField>
              <FormField label="Credit Timing" htmlFor="acTiming">
                <Select
                  id="acTiming"
                  value={rule.accrualTiming}
                  disabled={
                    rule.grantMethod === 'upfront_annual' || rule.grantMethod === 'manual_only'
                  }
                  onChange={(e) => set('accrualTiming', e.target.value as AccrualTiming)}
                >
                  {(Object.keys(TIMING_LABELS) as AccrualTiming[]).map((t) => (
                    <option key={t} value={t}>
                      {TIMING_LABELS[t]}
                    </option>
                  ))}
                </Select>
              </FormField>
              <FormField
                label="Joining Cut-off Day"
                htmlFor="acCutoff"
                helperText="Joined after this day: that month is not credited."
              >
                <Input
                  id="acCutoff"
                  type="number"
                  min="1"
                  max="28"
                  value={String(rule.joiningCutoffDay)}
                  onChange={(e) => set('joiningCutoffDay', Number(e.target.value))}
                />
              </FormField>
              <FormField label="Effective From" htmlFor="acFrom" required>
                <Input
                  id="acFrom"
                  type="date"
                  value={effectiveFrom}
                  onChange={(e) => setEffectiveFrom(e.target.value)}
                />
              </FormField>
            </Grid>
            {toggle(
              'proRataOnJoining',
              'Pro-rata on Joining',
              'Joiners earn only for the months they are employed.',
            )}
            {toggle(
              'proRataOnExit',
              'Pro-rata on Exit',
              'Leavers lose entitlement for months after their last working day.',
            )}
            {toggle(
              'accrueDuringProbation',
              'Accrue During Probation',
              'Earn entitlement while on probation.',
            )}
            {!rule.accrueDuringProbation &&
              toggle(
                'backcreditAfterProbation',
                'Back-credit After Probation',
                'Credit the probation months once probation ends.',
              )}
            {toggle(
              'accrueDuringLop',
              'Accrue During Loss of Pay',
              'If off, monthly credit is reduced by days on loss of pay.',
            )}
          </Stack>
        </Card>

        <Card padding="lg">
          <Stack gap="md">
            <CardTitle>Carry Forward & Lapse</CardTitle>
            {toggle(
              'carryForwardEnabled',
              'Carry Forward',
              'Unused days roll into the next leave year.',
            )}
            {rule.carryForwardEnabled && (
              <Grid columns={3} gap="md">
                <FormField
                  label="Max Carry Forward"
                  htmlFor="acMaxCf"
                  helperText="Empty = no limit"
                >
                  <Input
                    id="acMaxCf"
                    type="number"
                    step="0.5"
                    min="0"
                    value={rule.maxCarryForwardDays ?? ''}
                    onChange={(e) => set('maxCarryForwardDays', optNum(e.target.value))}
                  />
                </FormField>
                <FormField
                  label="Max Accumulation"
                  htmlFor="acMaxAcc"
                  helperText="Cap on the new balance"
                >
                  <Input
                    id="acMaxAcc"
                    type="number"
                    step="0.5"
                    min="0"
                    value={rule.maxAccumulationDays ?? ''}
                    onChange={(e) => set('maxAccumulationDays', optNum(e.target.value))}
                  />
                </FormField>
                <FormField
                  label="Expires After (months)"
                  htmlFor="acExpiry"
                  helperText="1–12; empty = never"
                >
                  <Input
                    id="acExpiry"
                    type="number"
                    min="1"
                    max="12"
                    value={rule.carryForwardExpiryMonths ?? ''}
                    onChange={(e) => set('carryForwardExpiryMonths', optNum(e.target.value))}
                  />
                </FormField>
              </Grid>
            )}
            {toggle(
              'lapseRemaining',
              'Lapse Remaining Days',
              'Days not carried forward or encashed lapse at year end.',
            )}
          </Stack>
        </Card>

        <Card padding="lg">
          <Stack gap="md">
            <CardTitle>Encashment</CardTitle>
            {toggle(
              'encashmentEnabled',
              'Encashment',
              'Produces a payroll handover record; amounts are calculated by payroll.',
            )}
            {rule.encashmentEnabled && (
              <Grid columns={2} gap="md">
                <FormField label="Trigger" htmlFor="acTrigger">
                  <Select
                    id="acTrigger"
                    value={rule.encashmentTrigger}
                    onChange={(e) =>
                      set('encashmentTrigger', e.target.value as AccrualRule['encashmentTrigger'])
                    }
                  >
                    <option value="cycle_end">At year end</option>
                    <option value="exit">On exit</option>
                    <option value="both">Both</option>
                  </Select>
                </FormField>
                <FormField label="Basis" htmlFor="acBasis">
                  <Select
                    id="acBasis"
                    value={rule.encashmentBasis}
                    onChange={(e) =>
                      set('encashmentBasis', e.target.value as AccrualRule['encashmentBasis'])
                    }
                  >
                    <option value="basic">Basic pay</option>
                    <option value="gross">Gross pay</option>
                  </Select>
                </FormField>
                <FormField label="Minimum Balance to Retain" htmlFor="acRetain">
                  <Input
                    id="acRetain"
                    type="number"
                    step="0.5"
                    min="0"
                    value={String(rule.minBalanceToRetain)}
                    onChange={(e) => set('minBalanceToRetain', Number(e.target.value))}
                  />
                </FormField>
                <FormField
                  label="Max Encashable Days"
                  htmlFor="acMaxEnc"
                  helperText="Empty = no limit"
                >
                  <Input
                    id="acMaxEnc"
                    type="number"
                    step="0.5"
                    min="0"
                    value={rule.maxEncashableDays ?? ''}
                    onChange={(e) => set('maxEncashableDays', optNum(e.target.value))}
                  />
                </FormField>
              </Grid>
            )}
          </Stack>
        </Card>
      </Stack>
    </Modal>
  );
}

function YearEndPanel({ canManage }: { canManage: boolean }) {
  const lastYearStart = `${new Date().getFullYear() - 1}-01-01`;
  const [cycleStart, setCycleStart] = useState(lastYearStart);
  const [preview, setPreview] = useState<YearEndPreview | null>(null);
  const [runs, setRuns] = useState<YearEndRun[]>([]);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadRuns = useCallback(async () => {
    try {
      setRuns(await accrualApi.runs());
    } catch {
      setRuns([]);
    }
  }, []);

  useEffect(() => {
    void loadRuns();
  }, [loadRuns]);

  const runPreview = async () => {
    setBusy(true);
    setError(null);
    try {
      setPreview(await accrualApi.preview(cycleStart));
    } catch (err) {
      setError(errorText(err, 'Failed to preview'));
      setPreview(null);
    } finally {
      setBusy(false);
    }
  };

  const commit = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await accrualApi.commit(cycleStart);
      setMessage(
        `Closed: ${res.balances} balance(s), ${res.encashed} encashed, ${res.carriedForward} carried forward, ${res.lapsed} lapsed.`,
      );
      setConfirming(false);
      setPreview(null);
      await loadRuns();
    } catch (err) {
      setError(errorText(err, 'Failed to close the leave year'));
      setConfirming(false);
    } finally {
      setBusy(false);
    }
  };

  const total = (key: 'encash' | 'carryForward' | 'lapse') =>
    preview?.rows.reduce((s, r) => s + r[key], 0) ?? 0;

  return (
    <Card padding="lg">
      <Stack gap="md">
        <Stack gap="none">
          <CardTitle>Year-End Processing</CardTitle>
          <CardDescription>
            Each leave year closes automatically after it ends. Preview it any time; closing early
            by hand needs the year-end permission.
          </CardDescription>
        </Stack>
        {message && (
          <Alert
            variant="success"
            title="Leave year closed"
            dismissible
            onDismiss={() => setMessage(null)}
          >
            {message}
          </Alert>
        )}
        {error && (
          <Alert variant="error" title="Error" dismissible onDismiss={() => setError(null)}>
            {error}
          </Alert>
        )}
        <Inline gap="sm" align="end">
          <FormField label="Leave Year Starting" htmlFor="yeStart">
            <Input
              id="yeStart"
              type="date"
              value={cycleStart}
              onChange={(e) => setCycleStart(e.target.value)}
            />
          </FormField>
          <Button
            variant="secondary"
            type="button"
            disabled={busy || !cycleStart}
            onClick={() => void runPreview()}
          >
            Preview (Dry Run)
          </Button>
        </Inline>

        {preview && (
          <Stack gap="sm">
            <Inline gap="sm" align="center">
              <strong>Leave year {preview.cycle.label}</strong>
              {preview.alreadyClosed && <Badge variant="info">Already closed</Badge>}
            </Inline>
            <CardDescription>
              {preview.rows.length} balance(s): {total('encash')} day(s) encashed,{' '}
              {total('carryForward')} carried into {preview.nextCycle.label}, {total('lapse')}{' '}
              lapsed.
            </CardDescription>
            {preview.rows.length > 0 && (
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>Employee</TableHeaderCell>
                    <TableHeaderCell>Leave Type</TableHeaderCell>
                    <TableHeaderCell>Available</TableHeaderCell>
                    <TableHeaderCell>Encash</TableHeaderCell>
                    <TableHeaderCell>Carry Forward</TableHeaderCell>
                    <TableHeaderCell>Lapse</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {preview.rows.slice(0, 100).map((r) => (
                    <TableRow key={`${r.employeeId}-${r.leaveTypeId}`}>
                      <TableCell>{r.employeeId}</TableCell>
                      <TableCell>{r.leaveTypeName}</TableCell>
                      <TableCell>{r.available}</TableCell>
                      <TableCell>{r.encash}</TableCell>
                      <TableCell>{r.carryForward}</TableCell>
                      <TableCell>{r.lapse}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            {canManage && !preview.alreadyClosed && (
              <Inline justify="end">
                <Button
                  variant="danger"
                  type="button"
                  disabled={busy}
                  onClick={() => setConfirming(true)}
                >
                  Close Leave Year
                </Button>
              </Inline>
            )}
          </Stack>
        )}

        {runs.length > 0 && (
          <Stack gap="xs">
            <strong>Closed Leave Years</strong>
            {runs.map((run) => (
              <CardDescription key={run.id}>
                {run.cycleStartDate} to {run.cycleEndDate} · {run.summary.balances ?? 0} balance(s)
                · {run.summary.carriedForward ?? 0} carried · {run.summary.lapsed ?? 0} lapsed ·{' '}
                {run.summary.encashed ?? 0} encashed ·{' '}
                {run.createdByUserId === 'system' ? 'automatic' : 'manual'}
              </CardDescription>
            ))}
          </Stack>
        )}
      </Stack>
      {confirming && preview && (
        <Modal
          isOpen
          onClose={() => setConfirming(false)}
          title={`Close leave year ${preview.cycle.label}?`}
          description="This posts encashment, carry forward and lapse entries. It cannot be undone."
          footer={
            <Inline justify="between">
              <Button variant="secondary" type="button" onClick={() => setConfirming(false)}>
                Cancel
              </Button>
              <Button variant="danger" type="button" disabled={busy} onClick={() => void commit()}>
                Confirm Close
              </Button>
            </Inline>
          }
        >
          <CardDescription>
            {total('encash')} day(s) encashed, {total('carryForward')} carried forward,{' '}
            {total('lapse')} lapsed across {preview.rows.length} balance(s).
          </CardDescription>
        </Modal>
      )}
    </Card>
  );
}

export default AccrualTab;
