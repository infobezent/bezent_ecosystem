import { useState } from 'react';
import { Button } from '../../../../design-system/components/Button';
import { BezentIcon } from '../../../../design-system/icons';
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
    <div className="settings-section">
      <div className="settings-section__header">
        <div>
          <h2 className="settings-section__title">Leave Settings</h2>
          <p className="settings-section__subtitle">
            Configure leave types, paid/unpaid status, annual balances, eligibility criteria,
            half-day options, and approval workflows.
          </p>
        </div>
        <div className="settings-action-row">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="btn-light-blue-action"
            onClick={handleAddLeaveType}
          >
            + Add Leave Type
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            className="btn-primary-blue"
            onClick={handleSave}
          >
            Save Leave Policies
          </Button>
        </div>
      </div>

      {statusMsg && (
        <div className="settings-alert settings-alert--success">
          <BezentIcon name="checkMark" size={16} />
          <span>{statusMsg}</span>
        </div>
      )}

      <div className="settings-card">
        <h3 className="settings-card__title">Configured Leave Types ({leaves.length})</h3>
        <table className="settings-table">
          <thead>
            <tr>
              <th>Leave Name</th>
              <th>Paid / Unpaid</th>
              <th>Annual Balance</th>
              <th>Eligibility</th>
              <th>Half-Day Allowed</th>
              <th>Doc Required</th>
              <th>Approval Settings</th>
            </tr>
          </thead>
          <tbody>
            {leaves.map((l) => (
              <tr key={l.id}>
                <td>
                  <strong>{l.name}</strong>
                </td>
                <td>
                  <button
                    type="button"
                    className={`settings-badge ${l.isPaid ? 'settings-badge--req' : 'settings-badge--muted'}`}
                    onClick={() => handleTogglePaid(l.id)}
                  >
                    {l.isPaid ? 'Paid' : 'Unpaid'}
                  </button>
                </td>
                <td>
                  <input
                    type="number"
                    className="settings-input settings-input--sm"
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
                </td>
                <td>{l.eligibility}</td>
                <td>
                  <input
                    type="checkbox"
                    checked={l.halfDayAllowed}
                    onChange={() => handleToggleHalfDay(l.id)}
                  />
                </td>
                <td>
                  <input
                    type="checkbox"
                    checked={l.docRequired}
                    onChange={() => handleToggleDocRequired(l.id)}
                  />
                </td>
                <td>{l.approvalFlow}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
