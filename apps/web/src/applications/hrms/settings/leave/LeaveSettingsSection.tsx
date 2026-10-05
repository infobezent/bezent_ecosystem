import { useState } from 'react';
import {
  Button,
  Card,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeaderCell,
  TableCell,
  Badge,
  Switch,
  Input,
  Alert,
  Toolbar,
  Actions,
  Stack,
} from '../../../../design-system/components';
import type { LeaveTypeConfig } from '../types/settingsCenter';

const DEFAULT_LEAVE_TYPES: LeaveTypeConfig[] = [
  {
    id: 'l1',
    name: 'Annual Leave',
    isPaid: true,
    annualBalance: 18,
    eligibility: 'All Employees after probation',
    halfDayAllowed: true,
    docRequired: false,
    approvalFlow: 'Manager Approval',
  },
  {
    id: 'l2',
    name: 'Sick Leave',
    isPaid: true,
    annualBalance: 12,
    eligibility: 'All Full-Time Staff',
    halfDayAllowed: true,
    docRequired: true,
    approvalFlow: 'HR Notification',
  },
  {
    id: 'l3',
    name: 'Casual Leave',
    isPaid: true,
    annualBalance: 6,
    eligibility: 'Confirmed Employees',
    halfDayAllowed: true,
    docRequired: false,
    approvalFlow: 'Manager Approval',
  },
  {
    id: 'l4',
    name: 'Maternity / Paternity Leave',
    isPaid: true,
    annualBalance: 90,
    eligibility: 'Eligible Staff (>1 Year service)',
    halfDayAllowed: false,
    docRequired: true,
    approvalFlow: 'HR & Management Approval',
  },
  {
    id: 'l5',
    name: 'Unpaid Leave (LWP)',
    isPaid: false,
    annualBalance: 0,
    eligibility: 'All Staff',
    halfDayAllowed: true,
    docRequired: false,
    approvalFlow: 'Manager & HR Approval',
  },
];

export function LeaveSettingsSection() {
  const [leaves, setLeaves] = useState<LeaveTypeConfig[]>(DEFAULT_LEAVE_TYPES);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const handleTogglePaid = (id: string) => {
    setLeaves((prev) => prev.map((l) => (l.id === id ? { ...l, isPaid: !l.isPaid } : l)));
  };

  const handleToggleHalfDay = (id: string) => {
    setLeaves((prev) =>
      prev.map((l) => (l.id === id ? { ...l, halfDayAllowed: !l.halfDayAllowed } : l)),
    );
  };

  const handleToggleDocRequired = (id: string) => {
    setLeaves((prev) => prev.map((l) => (l.id === id ? { ...l, docRequired: !l.docRequired } : l)));
  };

  const handleAddLeaveType = () => {
    const name = prompt('Enter new leave type name:');
    if (!name) return;
    const newL: LeaveTypeConfig = {
      id: `l_${Date.now()}`,
      name: name.trim(),
      isPaid: true,
      annualBalance: 10,
      eligibility: 'All Employees',
      halfDayAllowed: true,
      docRequired: false,
      approvalFlow: 'Manager Approval',
    };
    setLeaves((prev) => [...prev, newL]);
  };

  const handleSave = () => {
    setStatusMsg('Leave settings saved successfully!');
    setTimeout(() => setStatusMsg(null), 3000);
  };

  return (
    <Stack gap="lg">
      <Toolbar
        left={
          <div>
            <h2 className="bezent-card__title">Leave Settings</h2>
            <p className="bezent-card__desc">
              Configure leave types, paid/unpaid status, annual balances, eligibility criteria,
              half-day options, and approval workflows.
            </p>
          </div>
        }
        right={
          <Actions align="end" gap="sm">
            <Button variant="secondary" type="button" onClick={handleAddLeaveType}>
              + Add Leave Type
            </Button>
            <Button variant="primary" type="button" onClick={handleSave}>
              Save Leave Policies
            </Button>
          </Actions>
        }
      />

      {statusMsg && <Alert variant="success">{statusMsg}</Alert>}

      <Card padding="lg">
        <Stack gap="md">
          <h3 className="bezent-card__title">Configured Leave Types ({leaves.length})</h3>

          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Leave Name</TableHeaderCell>
                <TableHeaderCell>Paid / Unpaid</TableHeaderCell>
                <TableHeaderCell>Annual Balance</TableHeaderCell>
                <TableHeaderCell>Eligibility</TableHeaderCell>
                <TableHeaderCell>Half-Day Allowed</TableHeaderCell>
                <TableHeaderCell>Doc Required</TableHeaderCell>
                <TableHeaderCell>Approval Settings</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {leaves.map((l) => (
                <TableRow key={l.id}>
                  <TableCell>
                    <strong>{l.name}</strong>
                  </TableCell>
                  <TableCell>
                    <button
                      type="button"
                      onClick={() => handleTogglePaid(l.id)}
                      aria-label={`Toggle paid status for ${l.name}`}
                    >
                      <Badge variant={l.isPaid ? 'success' : 'neutral'}>
                        {l.isPaid ? 'Paid' : 'Unpaid'}
                      </Badge>
                    </button>
                  </TableCell>
                  <TableCell>
                    <Input
                      size="sm"
                      type="number"
                      value={l.annualBalance}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setLeaves((prev) =>
                          prev.map((item) =>
                            item.id === l.id ? { ...item, annualBalance: val } : item,
                          ),
                        );
                      }}
                    />
                  </TableCell>
                  <TableCell>{l.eligibility}</TableCell>
                  <TableCell>
                    <Switch
                      checked={l.halfDayAllowed}
                      onChange={() => handleToggleHalfDay(l.id)}
                      aria-label={`Half-day allowed for ${l.name}`}
                    />
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={l.docRequired}
                      onChange={() => handleToggleDocRequired(l.id)}
                      aria-label={`Document required for ${l.name}`}
                    />
                  </TableCell>
                  <TableCell>{l.approvalFlow}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Stack>
      </Card>
    </Stack>
  );
}

export default LeaveSettingsSection;
