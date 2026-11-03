import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Card,
  CardDescription,
  CardTitle,
  Divider,
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
  Textarea,
} from '../../../../design-system/components';
import { LeaveSettingsHeader } from './LeaveSettingsHeader';
import { LeaveStatGrid } from './LeaveStatGrid';
import { workflowsApi } from './api/leaveAdminApi';
import { companyAdminApi } from '../../../company-admin/api/companyAdminApi';
import { fetchEmployees } from '../../employees/api/employeesApi';
import type {
  ApprovalLevel,
  ApprovalQueueItem,
  ApprovalWorkflowDto,
  ApprovalWorkflowItem,
  ApproverType,
  SlaAction,
} from './types/leaveAdmin.types';

export interface ApprovalWorkflowTabProps {
  canManage?: boolean;
  initialWorkflows?: ApprovalWorkflowItem[];
}

const APPROVER_LABELS: Record<ApproverType, string> = {
  reporting_manager: 'Reporting manager',
  department_head: 'Department head',
  hr_role: 'Anyone with a role',
  specific_employee: 'A specific employee',
};

const SLA_LABELS: Record<SlaAction, string> = {
  notify_only: 'Mark overdue only',
  escalate_to_next: 'Escalate to next level',
  auto_approve: 'Auto-approve',
};

type Option = { id: string; name: string };

const errorText = (err: unknown, fallback: string) =>
  err instanceof Error ? err.message : fallback;

const NEW_LEVEL: ApprovalLevel = {
  approverType: 'reporting_manager',
  approverRef: null,
  slaHours: 48,
  onSlaBreach: 'notify_only',
};

export function ApprovalWorkflowTab({
  canManage = true,
  initialWorkflows,
}: ApprovalWorkflowTabProps = {}) {
  const [workflows, setWorkflows] = useState<ApprovalWorkflowItem[]>(initialWorkflows ?? []);
  const [loading, setLoading] = useState(!initialWorkflows);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editing, setEditing] = useState<ApprovalWorkflowItem | 'new' | null>(null);
  const [roles, setRoles] = useState<Option[]>([]);
  const [employees, setEmployees] = useState<Option[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setWorkflows(await workflowsApi.list());
    } catch (err) {
      setError(errorText(err, 'Failed to load approval workflows'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!initialWorkflows) void load();
  }, [initialWorkflows, load]);

  useEffect(() => {
    if (!canManage) return;
    // Pickers degrade to empty lists when the user cannot read roles or employees.
    companyAdminApi
      .getRoles()
      .then((r) =>
        setRoles(r.filter((x) => x.status !== 'inactive').map((x) => ({ id: x.id, name: x.name }))),
      )
      .catch(() => undefined);
    fetchEmployees({ pageSize: 200 })
      .then((res) =>
        setEmployees(
          res.data.map((e) => ({
            id: e.id,
            name:
              `${e.firstName} ${e.lastName ?? ''}`.trim() +
              (e.employeeNumber ? ` (${e.employeeNumber})` : ''),
          })),
        ),
      )
      .catch(() => undefined);
  }, [canManage]);

  const describeLevel = (level: ApprovalLevel) => {
    if (level.approverType === 'hr_role') {
      return `Role: ${roles.find((r) => r.id === level.approverRef)?.name ?? 'selected role'}`;
    }
    if (level.approverType === 'specific_employee') {
      return employees.find((e) => e.id === level.approverRef)?.name ?? 'Selected employee';
    }
    return APPROVER_LABELS[level.approverType];
  };

  return (
    <Stack gap="lg">
      <LeaveSettingsHeader
        icon="approvals"
        title="Approval Workflow"
        subtitle="Who approves leave, in what order, and what happens when an approval is overdue."
        actions={
          canManage ? (
            <Button variant="primary" type="button" onClick={() => setEditing('new')}>
              Create Workflow
            </Button>
          ) : undefined
        }
      />

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

      {!loading && workflows.length > 0 && (
        <LeaveStatGrid
          stats={[
            {
              label: 'Workflows',
              value: workflows.filter((w) => w.isActive).length,
              caption: `${workflows.length} Total`,
              icon: 'approvals',
              tone: 'green',
            },
            {
              label: 'Multi-level',
              value: workflows.filter((w) => w.isActive && w.levels.length > 1).length,
              caption: 'Two+ Approvers',
              icon: 'groups',
              tone: 'blue',
            },
            {
              label: 'Auto-approve',
              value: workflows.filter((w) => w.isActive && w.autoApproveUpToDays).length,
              caption: 'Skips Approval',
              icon: 'sparkles',
            },
            {
              label: 'Type Overrides',
              value: workflows.reduce((n, w) => n + w.leaveTypeCount, 0),
              caption: 'Own Flow',
              icon: 'leave',
              tone: 'purple',
            },
          ]}
        />
      )}

      <Card padding="none">
        {loading ? (
          <Card padding="lg">
            <Inline justify="center" gap="sm">
              <Spinner size="md" />
              <span>Loading workflows...</span>
            </Inline>
          </Card>
        ) : workflows.length === 0 ? (
          <EmptyState
            title="No Workflows"
            description="The default workflow is created automatically."
          />
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Workflow</TableHeaderCell>
                <TableHeaderCell>Levels</TableHeaderCell>
                <TableHeaderCell>Auto-approve</TableHeaderCell>
                <TableHeaderCell>Leave Types</TableHeaderCell>
                <TableHeaderCell>Status</TableHeaderCell>
                <TableHeaderCell>Actions</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {workflows.map((wf) => (
                <TableRow key={wf.id}>
                  <TableCell>
                    <Inline gap="xs" align="center">
                      <strong>{wf.name}</strong>
                      {wf.isDefault && <Badge variant="info">Default</Badge>}
                    </Inline>
                    {wf.description && <CardDescription>{wf.description}</CardDescription>}
                  </TableCell>
                  <TableCell>
                    <Stack gap="none">
                      {wf.levels.map((l, i) => (
                        <span key={i}>
                          {i + 1}. {describeLevel(l)} · {l.slaHours}h
                        </span>
                      ))}
                    </Stack>
                  </TableCell>
                  <TableCell>
                    {wf.autoApproveUpToDays !== null
                      ? `Up to ${wf.autoApproveUpToDays} day(s)`
                      : 'Off'}
                  </TableCell>
                  <TableCell>
                    {wf.isDefault ? 'All without an override' : wf.leaveTypeCount}
                  </TableCell>
                  <TableCell>
                    <Badge variant={wf.isActive ? 'success' : 'neutral'}>
                      {wf.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {canManage && (
                      <Button
                        variant="secondary"
                        size="sm"
                        type="button"
                        onClick={() => setEditing(wf)}
                      >
                        Edit
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <ApprovalQueue canManage={canManage} />

      {editing && (
        <WorkflowDrawer
          workflow={editing === 'new' ? null : editing}
          roles={roles}
          employees={employees}
          onClose={() => setEditing(null)}
          onSaved={(wf) => {
            setEditing(null);
            setSuccess(`Workflow "${wf.name}" saved.`);
            void load();
          }}
        />
      )}
    </Stack>
  );
}

function WorkflowDrawer({
  workflow,
  roles,
  employees,
  onClose,
  onSaved,
}: {
  workflow: ApprovalWorkflowItem | null;
  roles: Option[];
  employees: Option[];
  onClose: () => void;
  onSaved: (wf: ApprovalWorkflowItem) => void;
}) {
  const [form, setForm] = useState<ApprovalWorkflowDto>(
    workflow
      ? {
          name: workflow.name,
          description: workflow.description,
          isDefault: workflow.isDefault,
          isActive: workflow.isActive,
          levels: workflow.levels,
          autoApproveUpToDays: workflow.autoApproveUpToDays,
          skipIfApproverIsApplicant: workflow.skipIfApproverIsApplicant,
          fallbackApproverRoleId: workflow.fallbackApproverRoleId,
          cancellationRequiresApproval: workflow.cancellationRequiresApproval,
          allowSelfApprovalForHr: workflow.allowSelfApprovalForHr,
        }
      : {
          name: '',
          description: null,
          isDefault: false,
          isActive: true,
          levels: [NEW_LEVEL],
          autoApproveUpToDays: null,
          skipIfApproverIsApplicant: true,
          fallbackApproverRoleId: null,
          cancellationRequiresApproval: false,
          allowSelfApprovalForHr: false,
        },
  );
  const [autoApprove, setAutoApprove] = useState(
    form.autoApproveUpToDays === null ? '' : String(form.autoApproveUpToDays),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof ApprovalWorkflowDto>(key: K, value: ApprovalWorkflowDto[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));
  const setLevel = (i: number, patch: Partial<ApprovalLevel>) =>
    set(
      'levels',
      form.levels.map((l, idx) => (idx === i ? { ...l, ...patch } : l)),
    );

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const dto = { ...form, autoApproveUpToDays: autoApprove.trim() ? Number(autoApprove) : null };
      onSaved(
        workflow ? await workflowsApi.update(workflow.id, dto) : await workflowsApi.create(dto),
      );
    } catch (err) {
      setError(errorText(err, 'Failed to save workflow'));
    } finally {
      setSaving(false);
    }
  };

  const toggle = (
    key: keyof ApprovalWorkflowDto,
    title: string,
    description: string,
    disabled = false,
  ) => (
    <Inline justify="between" align="center">
      <div>
        <strong>{title}</strong>
        <CardDescription>{description}</CardDescription>
      </div>
      <Switch
        checked={Boolean(form[key])}
        disabled={disabled}
        onChange={(e) => set(key, e.target.checked as never)}
        aria-label={title}
      />
    </Inline>
  );

  return (
    <Modal
      isOpen
      onClose={onClose}
      variant="drawer"
      size="drawer"
      title={workflow ? 'Edit Approval Workflow' : 'Create Approval Workflow'}
      description="One or two approval levels, each with an SLA and an action when it is overdue."
      footer={
        <Inline justify="between" align="center">
          <Button variant="secondary" type="button" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button variant="primary" type="button" onClick={() => void save()} disabled={saving}>
            {saving ? 'Saving...' : 'Save Workflow'}
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
            <FormField label="Workflow Name" htmlFor="wfName" required>
              <Input id="wfName" value={form.name} onChange={(e) => set('name', e.target.value)} />
            </FormField>
            <FormField label="Description" htmlFor="wfDesc">
              <Textarea
                id="wfDesc"
                rows={2}
                value={form.description ?? ''}
                onChange={(e) => set('description', e.target.value)}
              />
            </FormField>
            {toggle(
              'isDefault',
              'Default Workflow',
              'Used by every leave type without its own workflow.',
              workflow?.isDefault,
            )}
            {toggle(
              'isActive',
              'Active',
              'Inactive workflows are not used for new requests.',
              form.isDefault,
            )}
          </Stack>
        </Card>

        <Card padding="lg">
          <Stack gap="md">
            <Inline justify="between" align="center">
              <CardTitle>Approval Levels</CardTitle>
              {form.levels.length < 2 ? (
                <Button
                  variant="secondary"
                  size="sm"
                  type="button"
                  onClick={() => set('levels', [...form.levels, NEW_LEVEL])}
                >
                  Add Level
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  type="button"
                  onClick={() => set('levels', form.levels.slice(0, 1))}
                >
                  Remove Level 2
                </Button>
              )}
            </Inline>
            {form.levels.map((level, i) => (
              <Stack key={i} gap="sm">
                {i > 0 && <Divider />}
                <strong>Level {i + 1}</strong>
                <Grid columns={2} gap="md">
                  <FormField label="Approver" htmlFor={`wfType${i}`}>
                    <Select
                      id={`wfType${i}`}
                      value={level.approverType}
                      onChange={(e) =>
                        setLevel(i, {
                          approverType: e.target.value as ApproverType,
                          approverRef: null,
                        })
                      }
                    >
                      {(Object.keys(APPROVER_LABELS) as ApproverType[]).map((t) => (
                        <option key={t} value={t}>
                          {APPROVER_LABELS[t]}
                        </option>
                      ))}
                    </Select>
                  </FormField>
                  {(level.approverType === 'hr_role' ||
                    level.approverType === 'specific_employee') && (
                    <FormField
                      label={level.approverType === 'hr_role' ? 'Role' : 'Employee'}
                      htmlFor={`wfRef${i}`}
                      required
                    >
                      <Select
                        id={`wfRef${i}`}
                        value={level.approverRef ?? ''}
                        onChange={(e) => setLevel(i, { approverRef: e.target.value || null })}
                      >
                        <option value="">Select…</option>
                        {(level.approverType === 'hr_role' ? roles : employees).map((o) => (
                          <option key={o.id} value={o.id}>
                            {o.name}
                          </option>
                        ))}
                      </Select>
                    </FormField>
                  )}
                  <FormField label="SLA (hours)" htmlFor={`wfSla${i}`}>
                    <Input
                      id={`wfSla${i}`}
                      type="number"
                      min="1"
                      max="168"
                      value={String(level.slaHours)}
                      onChange={(e) => setLevel(i, { slaHours: Number(e.target.value) })}
                    />
                  </FormField>
                  <FormField label="When Overdue" htmlFor={`wfBreach${i}`}>
                    <Select
                      id={`wfBreach${i}`}
                      value={level.onSlaBreach}
                      onChange={(e) => setLevel(i, { onSlaBreach: e.target.value as SlaAction })}
                    >
                      {(Object.keys(SLA_LABELS) as SlaAction[]).map((a) => (
                        <option key={a} value={a}>
                          {SLA_LABELS[a]}
                        </option>
                      ))}
                    </Select>
                  </FormField>
                </Grid>
              </Stack>
            ))}
          </Stack>
        </Card>

        <Card padding="lg">
          <Stack gap="md">
            <CardTitle>Options</CardTitle>
            <Grid columns={2} gap="md">
              <FormField
                label="Auto-approve up to (days)"
                htmlFor="wfAuto"
                helperText="Requests this short are approved on submission. Empty = off."
              >
                <Input
                  id="wfAuto"
                  type="number"
                  step="0.5"
                  min="0.5"
                  value={autoApprove}
                  onChange={(e) => setAutoApprove(e.target.value)}
                />
              </FormField>
              <FormField
                label="Fallback Approver Role"
                htmlFor="wfFallback"
                helperText="Used when a level's approver is missing or inactive."
              >
                <Select
                  id="wfFallback"
                  value={form.fallbackApproverRoleId ?? ''}
                  onChange={(e) => set('fallbackApproverRoleId', e.target.value || null)}
                >
                  <option value="">None (HR handles)</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </Select>
              </FormField>
            </Grid>
            {toggle(
              'skipIfApproverIsApplicant',
              'Skip Self-Approval Levels',
              'If the approver is the applicant, the level is skipped.',
            )}
            {toggle(
              'cancellationRequiresApproval',
              'Approval Needed to Cancel Approved Leave',
              'Cancelling approved future leave goes back to the approver.',
            )}
            {toggle(
              'allowSelfApprovalForHr',
              'HR May Approve Their Own Leave',
              'Allows HR administrators to decide their own requests.',
            )}
          </Stack>
        </Card>
      </Stack>
    </Modal>
  );
}

function ApprovalQueue({ canManage }: { canManage: boolean }) {
  const [scope, setScope] = useState<'mine' | 'all'>(canManage ? 'all' : 'mine');
  const [items, setItems] = useState<ApprovalQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<ApprovalQueueItem | null>(null);
  const [comment, setComment] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setItems(await workflowsApi.queue(scope));
    } catch (err) {
      setError(errorText(err, 'Failed to load approval queue'));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [scope]);

  useEffect(() => {
    void load();
  }, [load]);

  const decide = async (item: ApprovalQueueItem, decision: 'approve' | 'reject') => {
    setBusyId(item.approvalId);
    setError(null);
    try {
      if (decision === 'approve') await workflowsApi.approve(item.approvalId);
      else await workflowsApi.reject(item.approvalId, comment);
      setRejecting(null);
      setComment('');
      await load();
    } catch (err) {
      setError(errorText(err, 'Failed to record decision'));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Card padding="lg">
      <Stack gap="md">
        <Inline justify="between" align="center">
          <Stack gap="none">
            <CardTitle>Pending Approvals</CardTitle>
            <CardDescription>Leave requests and cancellations awaiting a decision.</CardDescription>
          </Stack>
          {canManage && (
            <Select
              aria-label="Queue scope"
              value={scope}
              onChange={(e) => setScope(e.target.value as 'mine' | 'all')}
            >
              <option value="all">All pending</option>
              <option value="mine">Assigned to me</option>
            </Select>
          )}
        </Inline>
        {error && (
          <Alert variant="error" title="Error" dismissible onDismiss={() => setError(null)}>
            {error}
          </Alert>
        )}
        {loading ? (
          <Inline gap="sm">
            <Spinner size="sm" />
            <span>Loading...</span>
          </Inline>
        ) : items.length === 0 ? (
          <CardDescription>Nothing is waiting for approval.</CardDescription>
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Employee</TableHeaderCell>
                <TableHeaderCell>Leave</TableHeaderCell>
                <TableHeaderCell>Dates</TableHeaderCell>
                <TableHeaderCell>Step</TableHeaderCell>
                <TableHeaderCell>Due</TableHeaderCell>
                <TableHeaderCell>Actions</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((item) => {
                const overdue = item.slaDueAt !== null && new Date(item.slaDueAt) < new Date();
                return (
                  <TableRow key={item.approvalId}>
                    <TableCell>
                      <strong>{item.employeeName}</strong>
                      <CardDescription>{item.employeeNumber}</CardDescription>
                    </TableCell>
                    <TableCell>
                      <Badge variant="neutral">{item.leaveTypeCode}</Badge> {item.totalDays} day(s)
                      <CardDescription>{item.reason}</CardDescription>
                    </TableCell>
                    <TableCell>
                      {item.startDate} to {item.endDate}
                    </TableCell>
                    <TableCell>
                      {item.purpose === 'cancellation' ? 'Cancellation' : `Level ${item.level}`}
                    </TableCell>
                    <TableCell>
                      {item.slaDueAt ? (
                        <Badge variant={overdue ? 'danger' : 'neutral'}>
                          {new Date(item.slaDueAt).toLocaleString()}
                        </Badge>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell>
                      <Inline gap="xs">
                        <Button
                          variant="primary"
                          size="sm"
                          type="button"
                          disabled={busyId === item.approvalId}
                          onClick={() => void decide(item, 'approve')}
                        >
                          Approve
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          type="button"
                          disabled={busyId === item.approvalId}
                          onClick={() => setRejecting(item)}
                        >
                          Reject
                        </Button>
                      </Inline>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Stack>
      {rejecting && (
        <Modal
          isOpen
          onClose={() => setRejecting(null)}
          title="Reject leave request"
          description={`${rejecting.employeeName} · ${rejecting.startDate} to ${rejecting.endDate}`}
          footer={
            <Inline justify="between">
              <Button variant="secondary" type="button" onClick={() => setRejecting(null)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                type="button"
                disabled={comment.trim().length < 3 || busyId !== null}
                onClick={() => void decide(rejecting, 'reject')}
              >
                Reject
              </Button>
            </Inline>
          }
        >
          <FormField label="Reason" htmlFor="rejectComment" required>
            <Textarea
              id="rejectComment"
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </FormField>
        </Modal>
      )}
    </Card>
  );
}

export default ApprovalWorkflowTab;
