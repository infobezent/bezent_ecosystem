import { useEffect, useState } from 'react';
import {
  Alert,
  Badge,
  Card,
  CardDescription,
  CardTitle,
  Grid,
  Inline,
  LoadingState,
  Modal,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '../../../../design-system/components';
import { leaveOperationsApi } from '../api/leaveOperationsApi';
import type { EmployeeLedger } from '../types/leaveOperations.types';
import { formatDate, formatDateTime } from './leaveDisplay';

const TXN_LABELS: Record<string, string> = {
  opening: 'Opening balance',
  accrual: 'Accrual',
  usage_reserve: 'Leave applied',
  usage_release: 'Leave released',
  usage_confirm: 'Leave approved',
  usage_reversal: 'Leave reversed',
  adjustment: 'Manual adjustment',
  carry_forward_in: 'Carry forward',
  lapse: 'Lapsed',
  encashment: 'Encashed',
};

export interface BalanceLedgerDrawerProps {
  employeeId: string | null;
  cycleStart?: string;
  onClose: () => void;
  /** Bumped by the parent after an adjustment so the drawer reloads. */
  refreshKey?: number;
  initialLedger?: EmployeeLedger;
}

export function BalanceLedgerDrawer({
  employeeId,
  cycleStart,
  onClose,
  refreshKey = 0,
  initialLedger,
}: BalanceLedgerDrawerProps) {
  const [ledger, setLedger] = useState<EmployeeLedger | null>(initialLedger ?? null);
  const [typeFilter, setTypeFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!employeeId || initialLedger) return;
    setLoading(true);
    setError(null);
    leaveOperationsApi
      .ledger(employeeId, { cycleStart, leaveTypeId: typeFilter || undefined })
      .then(setLedger)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load ledger'))
      .finally(() => setLoading(false));
  }, [employeeId, cycleStart, typeFilter, refreshKey, initialLedger]);

  useEffect(() => {
    if (!employeeId) setTypeFilter('');
  }, [employeeId]);

  return (
    <Modal
      isOpen={employeeId !== null}
      onClose={onClose}
      variant="drawer"
      size="drawer"
      title={ledger ? `${ledger.employee.name} · Leave ledger` : 'Leave ledger'}
      description={
        ledger
          ? `${ledger.employee.employeeNumber} · Leave year ${ledger.cycle.label} (${formatDate(ledger.cycle.start)} – ${formatDate(ledger.cycle.end)})`
          : undefined
      }
    >
      {loading && !ledger ? (
        <LoadingState label="Loading ledger..." />
      ) : error ? (
        <Alert variant="error">{error}</Alert>
      ) : !ledger ? null : (
        <Stack gap="lg">
          <Grid columns={2} gap="md">
            {ledger.balances.map((b) => (
              <Card key={b.leaveTypeId} variant="flat" padding="md">
                <Stack gap="xs">
                  <Inline justify="between" align="center">
                    <strong>{b.leaveTypeName}</strong>
                    <Badge variant={b.available < 0 ? 'danger' : 'success'}>
                      {b.available} available
                    </Badge>
                  </Inline>
                  <CardDescription>
                    Entitled {b.entitled} · Used {b.used} · Pending {b.pending}
                    {b.carriedForward > 0 ? ` · CF ${b.carriedForward}` : ''}
                  </CardDescription>
                </Stack>
              </Card>
            ))}
          </Grid>

          <Inline justify="between" align="center">
            <CardTitle>Transactions</CardTitle>
            <Select
              aria-label="Leave type"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              options={[
                { value: '', label: 'All leave types' },
                ...ledger.balances.map((b) => ({ value: b.leaveTypeId, label: b.leaveTypeName })),
              ]}
            />
          </Inline>

          {ledger.entries.length === 0 ? (
            <CardDescription>No balance movements in this leave year yet.</CardDescription>
          ) : (
            <Table compact>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>When</TableHeaderCell>
                  <TableHeaderCell>Movement</TableHeaderCell>
                  <TableHeaderCell>Days</TableHeaderCell>
                  <TableHeaderCell>Balance</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {ledger.entries.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell>
                      <Stack gap="none">
                        <span>{formatDateTime(e.createdAt)}</span>
                        {e.createdBy && <CardDescription>{e.createdBy}</CardDescription>}
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Stack gap="none">
                        <span>
                          {TXN_LABELS[e.txnType] ?? e.txnType} · {e.leaveTypeName}
                        </span>
                        {e.reason && <CardDescription>{e.reason}</CardDescription>}
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={e.effect > 0 ? 'success' : e.effect < 0 ? 'warning' : 'neutral'}
                      >
                        {e.effect > 0
                          ? `+${e.effect}`
                          : e.effect === 0
                            ? `${e.days} used`
                            : e.effect}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <strong>{e.runningAvailable}</strong>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Stack>
      )}
    </Modal>
  );
}

export default BalanceLedgerDrawer;
