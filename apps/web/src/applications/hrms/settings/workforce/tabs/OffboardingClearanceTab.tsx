import React, { useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  FormGrid,
  FormSection,
  Grid,
  Inline,
  Input,
  Modal,
  Select,
  Stack,
  Switch,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeaderCell,
  TableCell,
  Tabs,
  Textarea,
  Toolbar,
} from '../../../../../design-system/components';
import { BezentIcon } from '../../../../../design-system/icons';
import type {
  WorkforceOffboardingPolicy,
  WorkforceClearanceChecklistTemplate,
  CreateClearanceTemplateDto,
} from '../types/workforceSettings.types';
import {
  updateOffboardingPolicy,
  createClearanceTemplate,
  deleteClearanceTemplate,
} from '../api/workforceSettingsApi';

export interface OffboardingClearanceTabProps {
  initialPolicy: WorkforceOffboardingPolicy;
  initialClearanceTemplates: WorkforceClearanceChecklistTemplate[];
  onReload: () => void;
}

export function OffboardingClearanceTab({
  initialPolicy,
  initialClearanceTemplates,
  onReload,
}: OffboardingClearanceTabProps) {
  // Notice period state
  const [probationNoticeDays, setProbationNoticeDays] = useState(initialPolicy.probationNoticeDays);
  const [confirmedNoticeDays, setConfirmedNoticeDays] = useState(initialPolicy.confirmedNoticeDays);
  const [leadershipNoticeDays, setLeadershipNoticeDays] = useState(
    initialPolicy.leadershipNoticeDays,
  );
  const [allowNoticeBuyout, setAllowNoticeBuyout] = useState(initialPolicy.allowNoticeBuyout);
  const [allowLeaveOffset, setAllowLeaveOffset] = useState(initialPolicy.allowLeaveOffset);
  const [resignationWithdrawalWindowDays, setResignationWithdrawalWindowDays] = useState(
    initialPolicy.resignationWithdrawalWindowDays,
  );

  const [savingPolicy, setSavingPolicy] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Clearance templates state
  const [deptFilter, setDeptFilter] = useState<'all' | 'it' | 'admin' | 'finance' | 'hr'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newItemDept, setNewItemDept] = useState<'it' | 'admin' | 'finance' | 'hr'>('it');
  const [newItemTitle, setNewItemTitle] = useState('');
  const [newItemDesc, setNewItemDesc] = useState('');
  const [newItemMandatory, setNewItemMandatory] = useState(true);
  const [newItemOrder, setNewItemOrder] = useState('1');
  const [savingItem, setSavingItem] = useState(false);
  const [itemError, setItemError] = useState<string | null>(null);

  const handleSavePolicy = async () => {
    try {
      setSavingPolicy(true);
      setStatusMessage(null);
      await updateOffboardingPolicy({
        probationNoticeDays,
        confirmedNoticeDays,
        leadershipNoticeDays,
        allowNoticeBuyout,
        allowLeaveOffset,
        resignationWithdrawalWindowDays,
      });
      setStatusMessage({
        type: 'success',
        text: 'Offboarding & notice policy updated successfully.',
      });
      onReload();
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to save offboarding policy',
      });
    } finally {
      setSavingPolicy(false);
    }
  };

  const handleCreateClearanceItem = async () => {
    try {
      setSavingItem(true);
      setItemError(null);
      const dto: CreateClearanceTemplateDto = {
        department: newItemDept,
        itemTitle: newItemTitle.trim(),
        description: newItemDesc.trim() ? newItemDesc.trim() : null,
        isMandatory: newItemMandatory,
        displayOrder: parseInt(newItemOrder, 10) || 1,
      };
      await createClearanceTemplate(dto);
      setShowAddModal(false);
      setNewItemTitle('');
      setNewItemDesc('');
      onReload();
    } catch (err) {
      setItemError(err instanceof Error ? err.message : 'Failed to create checklist item');
    } finally {
      setSavingItem(false);
    }
  };

  const handleDeleteClearanceItem = async (id: string, title: string) => {
    if (!window.confirm(`Are you sure you want to remove clearance item "${title}"?`)) return;
    try {
      await deleteClearanceTemplate(id);
      onReload();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete clearance item');
    }
  };

  const filteredTemplates =
    deptFilter === 'all'
      ? initialClearanceTemplates
      : initialClearanceTemplates.filter((t) => t.department === deptFilter);

  const deptTabs = [
    { id: 'all', label: 'All Departments' },
    { id: 'it', label: 'IT & Security' },
    { id: 'admin', label: 'Admin & Facilities' },
    { id: 'finance', label: 'Finance & Payroll' },
    { id: 'hr', label: 'HR & People Ops' },
  ];

  return (
    <div className="bezent-lifecycle-feed">
      {statusMessage && (
        <Alert variant={statusMessage.type === 'success' ? 'success' : 'error'}>
          {statusMessage.text}
        </Alert>
      )}

      {/* Card 1: Notice Period Governance Matrix */}
      <div className="bezent-lifecycle-card">
        <div className="bezent-lifecycle-card__header">
          <div className="bezent-lifecycle-card__header-left">
            <div className="bezent-lifecycle-card__icon-bubble">
              <BezentIcon name="logOut" size={20} />
            </div>
            <div className="bezent-lifecycle-card__title-group">
              <h3 className="bezent-lifecycle-card__title">Notice Period Governance Matrix</h3>
              <p className="bezent-lifecycle-card__desc">
                Define mandatory notice periods by employment status and resignation withdrawal terms.
              </p>
            </div>
          </div>
          <div className="bezent-lifecycle-card__header-right">
            <Badge variant="success" size="sm">● Active</Badge>
            <Button variant="primary" size="sm" onClick={handleSavePolicy} disabled={savingPolicy}>
              <BezentIcon name="check" size={14} />
              {savingPolicy ? 'Saving...' : 'Save Notice Policy'}
            </Button>
          </div>
        </div>

        <div className="bezent-lifecycle-card__body">
          {/* Option B: Metrics Summary Strip */}
          <div className="bezent-lifecycle-metrics-strip">
            <div className="bezent-lifecycle-metric-item">
              <span className="bezent-lifecycle-metric-label">Probation Notice</span>
              <span className="bezent-lifecycle-metric-value">{probationNoticeDays} Days</span>
            </div>
            <div className="bezent-lifecycle-metric-item">
              <span className="bezent-lifecycle-metric-label">Confirmed Notice</span>
              <span className="bezent-lifecycle-metric-value bezent-lifecycle-metric-value--active">
                {confirmedNoticeDays} Days
              </span>
            </div>
            <div className="bezent-lifecycle-metric-item">
              <span className="bezent-lifecycle-metric-label">Leadership Notice</span>
              <span className="bezent-lifecycle-metric-value">{leadershipNoticeDays} Days</span>
            </div>
            <div className="bezent-lifecycle-metric-item">
              <span className="bezent-lifecycle-metric-label">Buyout &amp; Leave Offset</span>
              <span className={`bezent-lifecycle-metric-value ${allowNoticeBuyout && allowLeaveOffset ? 'bezent-lifecycle-metric-value--success' : ''}`}>
                {allowNoticeBuyout && allowLeaveOffset ? 'Fully Permitted' : allowNoticeBuyout || allowLeaveOffset ? 'Partial' : 'Restricted'}
              </span>
            </div>
          </div>

          <FormSection title="Notice Durations (Days)">
            <FormGrid columns={3}>
              <Input
                label="Probationary Notice"
                type="number"
                min={0}
                max={365}
                value={probationNoticeDays}
                onChange={(e) => setProbationNoticeDays(parseInt(e.target.value, 10) || 15)}
              />
              <Input
                label="Confirmed Employee Notice"
                type="number"
                min={0}
                max={365}
                value={confirmedNoticeDays}
                onChange={(e) => setConfirmedNoticeDays(parseInt(e.target.value, 10) || 60)}
              />
              <Input
                label="Leadership / Executive Notice"
                type="number"
                min={0}
                max={365}
                value={leadershipNoticeDays}
                onChange={(e) => setLeadershipNoticeDays(parseInt(e.target.value, 10) || 90)}
              />
            </FormGrid>
          </FormSection>

          <FormSection title="Settlement Rules & Windows">
            <FormGrid columns={2}>
              <Input
                label="Resignation Withdrawal Window (Days)"
                type="number"
                min={0}
                max={90}
                value={resignationWithdrawalWindowDays}
                onChange={(e) =>
                  setResignationWithdrawalWindowDays(parseInt(e.target.value, 10) || 7)
                }
              />
            </FormGrid>
            <div className="bezent-lifecycle-switch-box">
              <Grid columns={2} gap="md">
                <Switch
                  label="Allow Notice Buyout (Pay or deduct salary in lieu of shortfall days)"
                  checked={allowNoticeBuyout}
                  onChange={(e) => setAllowNoticeBuyout(e.target.checked)}
                />
                <Switch
                  label="Allow Unused Leave Offset (Offset accrued leaves against remaining notice)"
                  checked={allowLeaveOffset}
                  onChange={(e) => setAllowLeaveOffset(e.target.checked)}
                />
              </Grid>
            </div>
          </FormSection>
        </div>
      </div>

      {/* Card 2: Clearance Checklist Templates Card */}
      <div className="bezent-lifecycle-card">
        <div className="bezent-lifecycle-card__header">
          <div className="bezent-lifecycle-card__header-left">
            <div className="bezent-lifecycle-card__icon-bubble">
              <BezentIcon name="checklist" size={20} />
            </div>
            <div className="bezent-lifecycle-card__title-group">
              <h3 className="bezent-lifecycle-card__title">Department Clearance Checklist Templates</h3>
              <p className="bezent-lifecycle-card__desc">
                Define mandatory handover tasks across IT, Administration, Finance, and HR before
                Full & Final (F&F) settlement.
              </p>
            </div>
          </div>
          <div className="bezent-lifecycle-card__header-right">
            <Button variant="secondary" size="sm" onClick={() => setShowAddModal(true)}>
              <BezentIcon name="plus" size={14} />
              Add Checklist Item
            </Button>
          </div>
        </div>

        <div className="bezent-lifecycle-card__body">
          <Tabs
            items={deptTabs}
            activeId={deptFilter}
            onChange={(id) => setDeptFilter(id as typeof deptFilter)}
            variant="underline"
          />

          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Department</TableHeaderCell>
                <TableHeaderCell>Task Title</TableHeaderCell>
                <TableHeaderCell>Description</TableHeaderCell>
                <TableHeaderCell>Type</TableHeaderCell>
                <TableHeaderCell>Display Order</TableHeaderCell>
                <TableHeaderCell>Actions</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredTemplates.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <Badge variant="info">{item.department.toUpperCase()}</Badge>
                  </TableCell>
                  <TableCell>
                    <strong>{item.itemTitle}</strong>
                  </TableCell>
                  <TableCell>{item.description || '—'}</TableCell>
                  <TableCell>
                    {item.isMandatory ? (
                      <Badge variant="danger">Mandatory (Blocks F&F)</Badge>
                    ) : (
                      <Badge variant="neutral">Optional</Badge>
                    )}
                  </TableCell>
                  <TableCell>{item.displayOrder}</TableCell>
                  <TableCell>
                    <Inline gap="xs">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteClearanceItem(item.id, item.itemTitle)}
                      >
                        <BezentIcon name="trash" size={14} />
                        Delete
                      </Button>
                    </Inline>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Add Clearance Checklist Modal */}
      {showAddModal && (
        <Modal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          title="Add Clearance Checklist Item"
          footer={
            <Inline gap="sm" justify="end">
              <Button variant="secondary" onClick={() => setShowAddModal(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleCreateClearanceItem}
                disabled={savingItem || !newItemTitle.trim()}
              >
                {savingItem ? 'Saving...' : 'Add Item'}
              </Button>
            </Inline>
          }
        >
          <Stack gap="md">
            {itemError && <Alert variant="error">{itemError}</Alert>}
            <Select
              label="Department"
              value={newItemDept}
              onChange={(e) => setNewItemDept(e.target.value as 'it' | 'admin' | 'finance' | 'hr')}
              options={[
                { label: 'IT & Security', value: 'it' },
                { label: 'Admin & Facilities', value: 'admin' },
                { label: 'Finance & Payroll', value: 'finance' },
                { label: 'HR & People Ops', value: 'hr' },
              ]}
            />
            <Input
              label="Checklist Item Title"
              value={newItemTitle}
              onChange={(e) => setNewItemTitle(e.target.value)}
              placeholder="e.g. Collect Laptop, Revoke GitHub Access"
            />
            <Textarea
              label="Instructions / Description"
              value={newItemDesc}
              onChange={(e) => setNewItemDesc(e.target.value)}
              placeholder="Detailed instructions for the department clearance officer..."
            />
            <Input
              label="Display Order"
              type="number"
              value={newItemOrder}
              onChange={(e) => setNewItemOrder(e.target.value)}
            />
            <Switch
              label="Mandatory Clearance Item (Must be completed and approved before Full & Final payout)"
              checked={newItemMandatory}
              onChange={(e) => setNewItemMandatory(e.target.checked)}
            />
          </Stack>
        </Modal>
      )}
    </div>
  );
}
