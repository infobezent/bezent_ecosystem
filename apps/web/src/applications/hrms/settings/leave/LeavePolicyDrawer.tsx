import React, { useState, useEffect } from 'react';
import {
  Modal,
  Stack,
  Inline,
  Grid,
  Card,
  CardTitle,
  CardDescription,
  FormField,
  Input,
  Textarea,
  Select,
  Button,
  Badge,
  Alert,
  Spinner,
  Divider,
} from '../../../../design-system/components';
import { BezentIcon } from '../../../../design-system/icons';
import type {
  LeavePolicyItem,
  CreateLeavePolicyDto,
  EmploymentType,
  PolicyEntitlementInput,
  PolicyScope,
  PolicyScopeOptions,
  PolicyScopeV1,
  PolicyStatus,
} from './types/leavePolicies.types';
import type { LeaveTypeItem } from './types/leaveTypes.types';

export interface LeavePolicyDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  mode?: 'create' | 'edit' | 'view';
  initialData?: LeavePolicyItem | null;
  availableLeaveTypes?: LeaveTypeItem[];
  scopeOptions?: PolicyScopeOptions;
  onSaved: (savedItem: LeavePolicyItem) => void;
  saveFn: (dto: CreateLeavePolicyDto, id?: string) => Promise<LeavePolicyItem>;
  onSwitchToEdit?: () => void;
  canManage?: boolean;
}

const SCOPE_LABELS: Record<PolicyScope, string> = {
  company: 'Company-wide (All Workforce)',
  department: 'Specific Department',
  location: 'Work Location',
  employment_type: 'Employment Type',
  custom: 'Custom Scope (legacy)',
};

const EMPLOYMENT_TYPE_LABELS: Record<EmploymentType, string> = {
  full_time: 'Full-Time',
  part_time: 'Part-Time',
  contract: 'Contract',
  intern: 'Intern',
};

const STATUS_VARIANTS: Record<PolicyStatus, 'success' | 'warning' | 'info' | 'neutral'> = {
  active: 'success',
  draft: 'warning',
  scheduled: 'info',
  archived: 'neutral',
};

const EMPTY_SCOPE_OPTIONS: PolicyScopeOptions = { departments: [], locations: [] };

/** Quota inputs are kept as strings while editing; '' means "not set". */
type QuotaDraft = Record<string, string>;

const isHalfStep = (n: number) => Number.isInteger(n * 2);

const quotasFrom = (item?: LeavePolicyItem | null): QuotaDraft =>
  Object.fromEntries(
    (item?.entitlements ?? []).map((e) => [
      e.leaveTypeId,
      e.annualQuota === null ? '' : String(e.annualQuota),
    ]),
  );

export function LeavePolicyDrawer({
  isOpen,
  onClose,
  mode = 'create',
  initialData,
  availableLeaveTypes = [],
  scopeOptions = EMPTY_SCOPE_OPTIONS,
  onSaved,
  saveFn,
  onSwitchToEdit,
  canManage = true,
}: LeavePolicyDrawerProps) {
  const isViewing = mode === 'view';
  const isEditing = mode === 'edit';

  // Compensatory types draw on earned comp-off, so they cannot carry a policy quota.
  const linkableTypes = availableLeaveTypes.filter(
    (lt) => lt.isActive && lt.category !== 'compensatory',
  );

  const [name, setName] = useState(initialData?.name || '');
  const [code, setCode] = useState(initialData?.code || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [activateNow, setActivateNow] = useState(false);
  const [scope, setScope] = useState<PolicyScopeV1>(
    initialData && initialData.scope !== 'custom' ? initialData.scope : 'company',
  );
  const [scopeId, setScopeId] = useState(initialData?.scopeId || '');
  const [effectiveFrom, setEffectiveFrom] = useState(initialData?.effectiveFrom || '');
  const [effectiveTo, setEffectiveTo] = useState(initialData?.effectiveTo || '');
  const [quotas, setQuotas] = useState<QuotaDraft>(quotasFrom(initialData));
  const [priority, setPriority] = useState(String(initialData?.priority ?? 0));

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setCode(initialData.code);
      setDescription(initialData.description || '');
      setScope(initialData.scope !== 'custom' ? initialData.scope : 'company');
      setScopeId(initialData.scopeId || '');
      setEffectiveFrom(initialData.effectiveFrom);
      setEffectiveTo(initialData.effectiveTo || '');
      setQuotas(quotasFrom(initialData));
      setPriority(String(initialData.priority ?? 0));
    } else {
      setName('');
      setCode('');
      setDescription('');
      setScope('company');
      setScopeId('');
      setEffectiveFrom(new Date().toISOString().slice(0, 10));
      setEffectiveTo('');
      setQuotas({});
      setPriority('0');
    }
    setActivateNow(false);
    setFormError(null);
    setFieldErrors({});
  }, [initialData, isOpen, mode]);

  const suggestCode = (text: string): string => {
    const words = text.trim().split(/\s+/).filter(Boolean);
    if (words.length >= 2) {
      return `POL_${words
        .map((w) => w[0]?.toUpperCase() || '')
        .join('')
        .slice(0, 8)}`;
    }
    return `POL_${text
      .replace(/[^a-zA-Z0-9]/g, '')
      .slice(0, 6)
      .toUpperCase()}`;
  };

  // Auto-suggest code when typing name on creation if code is untouched
  const handleNameChange = (val: string) => {
    setName(val);
    if (!isEditing && !isViewing && (!code || code === suggestCode(name))) {
      setCode(suggestCode(val));
    }
  };

  const toggleLeaveType = (lt: LeaveTypeItem) => {
    setQuotas((prev) => {
      if (lt.id in prev) {
        const next = { ...prev };
        delete next[lt.id];
        return next;
      }
      // Pre-fill with the type's yearly ceiling as a sensible starting quota.
      return {
        ...prev,
        [lt.id]: lt.isTracked && lt.maxPerYear ? String(Number(lt.maxPerYear)) : '',
      };
    });
  };

  const scopeTargets: Array<{ id: string; name: string }> =
    scope === 'department'
      ? scopeOptions.departments
      : scope === 'location'
        ? scopeOptions.locations
        : scope === 'employment_type'
          ? (Object.keys(EMPLOYMENT_TYPE_LABELS) as EmploymentType[]).map((id) => ({
              id,
              name: EMPLOYMENT_TYPE_LABELS[id],
            }))
          : [];

  const validate = (): PolicyEntitlementInput[] | null => {
    const errs: Record<string, string> = {};

    const trimmedName = name.trim();
    if (trimmedName.length < 2 || trimmedName.length > 100) {
      errs.name = 'Policy name is required (2–100 characters).';
    }
    if (!/^[A-Z0-9_]{1,20}$/.test(code.trim().toUpperCase())) {
      errs.code = 'Policy code is required (1–20 uppercase alphanumeric characters).';
    }
    if (!effectiveFrom || !/^\d{4}-\d{2}-\d{2}$/.test(effectiveFrom)) {
      errs.effectiveFrom = 'Valid effective from date is required (YYYY-MM-DD).';
    }
    if (effectiveTo && effectiveFrom && effectiveTo < effectiveFrom) {
      errs.effectiveTo = 'Effective until date cannot be earlier than effective from date.';
    }
    if (scope !== 'company' && !scopeId) {
      errs.scopeId = `Select the ${scope === 'employment_type' ? 'employment type' : scope} this policy covers.`;
    }
    const priorityNum = Number(priority);
    if (!Number.isInteger(priorityNum) || priorityNum < 0 || priorityNum > 100) {
      errs.priority = 'Priority must be a whole number between 0 and 100.';
    }

    const entitlements: PolicyEntitlementInput[] = [];
    for (const [leaveTypeId, raw] of Object.entries(quotas)) {
      const lt = availableLeaveTypes.find((t) => t.id === leaveTypeId);
      if (!raw.trim()) {
        if (lt?.isTracked !== false) {
          errs[`quota_${leaveTypeId}`] = 'Annual quota is required.';
        }
        entitlements.push({ leaveTypeId, annualQuota: null });
        continue;
      }
      const n = Number(raw);
      const ceiling = lt?.maxPerYear ? Number(lt.maxPerYear) : null;
      if (isNaN(n) || n < 0 || !isHalfStep(n)) {
        errs[`quota_${leaveTypeId}`] = 'Use 0 or more days, in steps of 0.5.';
      } else if (ceiling !== null && n > ceiling) {
        errs[`quota_${leaveTypeId}`] =
          `Cannot exceed the type's yearly ceiling of ${ceiling} days.`;
      }
      entitlements.push({ leaveTypeId, annualQuota: n });
    }
    if (activateNow && entitlements.length === 0) {
      errs.entitlements = 'Link at least one leave type before activating.';
    }

    setFieldErrors(errs);
    return Object.keys(errs).length === 0 ? entitlements : null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const entitlements = validate();
    if (!entitlements) return;

    setSubmitting(true);
    try {
      const dto: CreateLeavePolicyDto = {
        name: name.trim(),
        code: code.trim().toUpperCase(),
        description: description.trim() || undefined,
        scope,
        scopeId: scope === 'company' ? null : scopeId,
        effectiveFrom,
        effectiveTo: effectiveTo.trim() || null,
        entitlements,
        priority: Number(priority),
        // Lifecycle on edit is changed from the list actions; create can start as active.
        ...(isEditing ? {} : { status: activateNow ? 'active' : 'draft' }),
      };

      const saved = await saveFn(dto, initialData?.id);
      onSaved(saved);
      onClose();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Failed to save leave policy.');
    } finally {
      setSubmitting(false);
    }
  };

  // View Mode UI — read-only layout
  if (isViewing && initialData) {
    const entitlements = initialData.entitlements ?? [];
    return (
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        variant="drawer"
        size="drawer"
        title={initialData.name}
        description={`Policy Code: ${initialData.code} • ${SCOPE_LABELS[initialData.scope] || initialData.scope}`}
        footer={
          <Inline justify="between" align="center">
            <Button variant="secondary" type="button" onClick={onClose}>
              Close
            </Button>
            {canManage && initialData.status !== 'archived' && (
              <Button variant="primary" type="button" onClick={onSwitchToEdit}>
                Edit Policy
              </Button>
            )}
          </Inline>
        }
      >
        <Card padding="lg">
          <Stack gap="xl">
            <Stack gap="md">
              <Inline justify="between" align="center">
                <CardTitle>Basic Information</CardTitle>
                <Badge variant={STATUS_VARIANTS[initialData.status] || 'neutral'}>
                  {initialData.status.toUpperCase()}
                </Badge>
              </Inline>

              <Grid columns={2} gap="lg">
                <Stack gap="xs">
                  <CardDescription>Policy Name</CardDescription>
                  <strong>{initialData.name}</strong>
                </Stack>
                <Stack gap="xs">
                  <CardDescription>Policy Code</CardDescription>
                  <Inline gap="xs" align="center">
                    <Badge variant="neutral">{initialData.code}</Badge>
                  </Inline>
                </Stack>
                <Stack gap="xs">
                  <CardDescription>Effective Period</CardDescription>
                  <strong>
                    {initialData.effectiveFrom}{' '}
                    {initialData.effectiveTo ? `to ${initialData.effectiveTo}` : '(Ongoing)'}
                  </strong>
                </Stack>
                <Stack gap="xs">
                  <CardDescription>Applies To</CardDescription>
                  <span>{initialData.scopeName || SCOPE_LABELS[initialData.scope]}</span>
                </Stack>
                <Stack gap="xs">
                  <CardDescription>Priority</CardDescription>
                  <span>{initialData.priority}</span>
                </Stack>
                <Stack gap="xs">
                  <CardDescription>Last Updated</CardDescription>
                  <span>{new Date(initialData.updatedAt).toLocaleDateString()}</span>
                </Stack>
              </Grid>

              {initialData.description && (
                <Stack gap="xs">
                  <CardDescription>Description</CardDescription>
                  <p className="bezent-card__desc">{initialData.description}</p>
                </Stack>
              )}
            </Stack>

            <Divider />

            <Stack gap="md">
              <CardTitle>Entitlements ({entitlements.length})</CardTitle>
              <CardDescription>
                Annual quota granted for each leave type under this policy.
              </CardDescription>

              {entitlements.length === 0 ? (
                <CardDescription>No leave types linked yet.</CardDescription>
              ) : (
                <Grid columns={2} gap="sm">
                  {entitlements.map((ent) => (
                    <Card key={ent.leaveTypeId} padding="sm">
                      <Stack gap="none">
                        <Inline justify="between" align="center">
                          <strong>{ent.leaveTypeName}</strong>
                          <Badge variant="neutral">{ent.leaveTypeCode}</Badge>
                        </Inline>
                        <CardDescription>
                          {ent.annualQuota === null
                            ? 'Unlimited (not tracked)'
                            : `${ent.annualQuota} day(s) per year`}
                        </CardDescription>
                      </Stack>
                    </Card>
                  ))}
                </Grid>
              )}
            </Stack>
          </Stack>
        </Card>
      </Modal>
    );
  }

  const selectedCount = Object.keys(quotas).length;

  // Create / Edit Form UI
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      variant="drawer"
      size="drawer"
      title={isEditing ? 'Edit Leave Policy' : 'Create Leave Policy'}
      description="Define who the policy covers, when it applies, and the annual quota per leave type."
      footer={
        <Inline justify="between" align="center">
          <Button variant="secondary" type="button" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" form="leave-policy-form" disabled={submitting}>
            {submitting ? (
              <Inline gap="xs" align="center">
                <Spinner size="sm" />
                <span>Saving...</span>
              </Inline>
            ) : isEditing ? (
              'Save Changes'
            ) : activateNow ? (
              'Create & Activate'
            ) : (
              'Save as Draft'
            )}
          </Button>
        </Inline>
      }
    >
      <form id="leave-policy-form" onSubmit={handleSubmit}>
        <Stack gap="lg">
          {formError && (
            <Alert variant="error" title="Submission Error">
              {formError}
            </Alert>
          )}

          <Card padding="lg">
            <Stack gap="xl">
              {/* Section 1: Basic Information */}
              <Stack gap="md">
                <Stack gap="none">
                  <CardTitle>Basic Information</CardTitle>
                  <CardDescription>
                    Policy identity, unique code, and effective period.
                  </CardDescription>
                </Stack>

                <FormField label="Policy Name" htmlFor="polName" required error={fieldErrors.name}>
                  <Input
                    id="polName"
                    value={name}
                    placeholder="e.g. Standard Corporate Policy, Engineering Policy"
                    onChange={(e) => handleNameChange(e.target.value)}
                  />
                </FormField>

                <Grid columns={2} gap="md">
                  <FormField
                    label="Policy Code"
                    htmlFor="polCode"
                    required
                    error={fieldErrors.code}
                  >
                    <Input
                      id="polCode"
                      value={code}
                      placeholder="e.g. POL_CORP, POL_ENG"
                      onChange={(e) => setCode(e.target.value.toUpperCase())}
                    />
                  </FormField>

                  {isEditing ? (
                    <Stack gap="xs">
                      <CardDescription>Status</CardDescription>
                      <Inline gap="xs" align="center">
                        <Badge variant={STATUS_VARIANTS[initialData?.status ?? 'draft']}>
                          {(initialData?.status ?? 'draft').toUpperCase()}
                        </Badge>
                      </Inline>
                    </Stack>
                  ) : (
                    <FormField
                      label="On Save"
                      htmlFor="polActivate"
                      helperText="A future start date is saved as Scheduled."
                    >
                      <Select
                        id="polActivate"
                        value={activateNow ? 'active' : 'draft'}
                        onChange={(e) => setActivateNow(e.target.value === 'active')}
                      >
                        <option value="draft">Keep as Draft</option>
                        <option value="active">Activate</option>
                      </Select>
                    </FormField>
                  )}
                </Grid>

                <Grid columns={2} gap="md">
                  <FormField
                    label="Effective From"
                    htmlFor="polEffectiveFrom"
                    required
                    error={fieldErrors.effectiveFrom}
                  >
                    <Input
                      id="polEffectiveFrom"
                      type="date"
                      value={effectiveFrom}
                      onChange={(e) => setEffectiveFrom(e.target.value)}
                    />
                  </FormField>

                  <FormField
                    label="Effective Until (Optional)"
                    htmlFor="polEffectiveTo"
                    error={fieldErrors.effectiveTo}
                  >
                    <Input
                      id="polEffectiveTo"
                      type="date"
                      value={effectiveTo}
                      onChange={(e) => setEffectiveTo(e.target.value)}
                    />
                  </FormField>
                </Grid>

                <FormField label="Description" htmlFor="polDescription">
                  <Textarea
                    id="polDescription"
                    value={description}
                    rows={2}
                    maxLength={500}
                    placeholder="Provide operational rationale for this leave policy..."
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </FormField>
              </Stack>

              <Divider />

              {/* Section 2: Applicability */}
              <Stack gap="md">
                <Stack gap="none">
                  <CardTitle>Applicability</CardTitle>
                  <CardDescription>
                    The most specific matching policy applies: employment type, then location, then
                    department, then company-wide. Priority breaks ties.
                  </CardDescription>
                </Stack>

                <Grid columns={2} gap="md">
                  <FormField label="Organizational Scope" htmlFor="polScope" required>
                    <Select
                      id="polScope"
                      value={scope}
                      onChange={(e) => {
                        setScope(e.target.value as PolicyScopeV1);
                        setScopeId('');
                      }}
                    >
                      <option value="company">Company-wide</option>
                      <option value="department">Specific Department</option>
                      <option value="location">Work Location</option>
                      <option value="employment_type">Employment Type</option>
                    </Select>
                  </FormField>

                  {scope !== 'company' && (
                    <FormField
                      label={
                        scope === 'department'
                          ? 'Department'
                          : scope === 'location'
                            ? 'Work Location'
                            : 'Employment Type'
                      }
                      htmlFor="polScopeId"
                      required
                      error={fieldErrors.scopeId}
                      helperText={
                        scopeTargets.length === 0 ? 'No active options are available.' : undefined
                      }
                    >
                      <Select
                        id="polScopeId"
                        value={scopeId}
                        onChange={(e) => setScopeId(e.target.value)}
                      >
                        <option value="">Select…</option>
                        {scopeTargets.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </Select>
                    </FormField>
                  )}

                  <FormField
                    label="Priority"
                    htmlFor="polPriority"
                    error={fieldErrors.priority}
                    helperText="0–100. Higher wins when two policies are equally specific."
                  >
                    <Input
                      id="polPriority"
                      type="number"
                      min="0"
                      max="100"
                      value={priority}
                      onChange={(e) => setPriority(e.target.value)}
                    />
                  </FormField>
                </Grid>
              </Stack>

              <Divider />

              {/* Section 3: Entitlements */}
              <Stack gap="md">
                <Stack gap="none">
                  <CardTitle>Entitlements</CardTitle>
                  <CardDescription>
                    Select leave types and set the annual quota employees under this policy receive.
                  </CardDescription>
                </Stack>

                {fieldErrors.entitlements && (
                  <Alert variant="warning" title="Leave types required">
                    {fieldErrors.entitlements}
                  </Alert>
                )}

                {linkableTypes.length === 0 ? (
                  <Card padding="md">
                    <CardDescription>
                      No active leave types configured yet. Please configure leave types first.
                    </CardDescription>
                  </Card>
                ) : (
                  <Grid columns={2} gap="sm">
                    {linkableTypes.map((lt) => {
                      const isSelected = lt.id in quotas;
                      const quotaError = fieldErrors[`quota_${lt.id}`];
                      return (
                        <Card
                          key={lt.id}
                          variant={isSelected ? 'tint-blue' : 'interactive'}
                          className={isSelected ? 'bezent-card--interactive' : ''}
                          padding="sm"
                        >
                          <Stack gap="sm">
                            <div
                              role="checkbox"
                              aria-checked={isSelected}
                              aria-label={`Include ${lt.name}`}
                              tabIndex={0}
                              onClick={() => toggleLeaveType(lt)}
                              onKeyDown={(e) => {
                                if (e.key === ' ' || e.key === 'Enter') {
                                  e.preventDefault();
                                  toggleLeaveType(lt);
                                }
                              }}
                            >
                              <Stack gap="xs">
                                <Inline justify="between" align="center">
                                  <strong>{lt.name}</strong>
                                  {isSelected ? (
                                    <Badge variant="info">
                                      <Inline gap="xs" align="center">
                                        <BezentIcon name="check" size={12} />
                                        <span>Included</span>
                                      </Inline>
                                    </Badge>
                                  ) : (
                                    <Badge variant="neutral">{lt.code}</Badge>
                                  )}
                                </Inline>
                                <CardDescription>
                                  {lt.category.replace(/_/g, ' ')} •{' '}
                                  {lt.isTracked ? 'Tracked' : 'Not tracked'}
                                  {lt.maxPerYear ? ` • Ceiling ${Number(lt.maxPerYear)} days` : ''}
                                </CardDescription>
                              </Stack>
                            </div>

                            {isSelected && (
                              <FormField
                                label="Annual Quota (Days)"
                                htmlFor={`quota_${lt.id}`}
                                required={lt.isTracked}
                                error={quotaError}
                                helperText={lt.isTracked ? undefined : 'Leave empty for unlimited.'}
                              >
                                <Input
                                  id={`quota_${lt.id}`}
                                  type="number"
                                  step="0.5"
                                  min="0"
                                  value={quotas[lt.id] ?? ''}
                                  onChange={(e) =>
                                    setQuotas((prev) => ({ ...prev, [lt.id]: e.target.value }))
                                  }
                                />
                              </FormField>
                            )}
                          </Stack>
                        </Card>
                      );
                    })}
                  </Grid>
                )}
              </Stack>

              <Divider />

              {/* Section 4: Live Policy Summary */}
              <Stack gap="md">
                <CardTitle>Policy Summary</CardTitle>
                <Card padding="md" variant="tint-blue">
                  <Stack gap="xs">
                    <Inline justify="between" align="center">
                      <strong>{name.trim() || 'Untitled Policy'}</strong>
                      <Badge variant="neutral">{code.trim() || 'NO_CODE'}</Badge>
                    </Inline>
                    <CardDescription>
                      Applies to:{' '}
                      {scope === 'company'
                        ? 'Company-wide'
                        : scopeTargets.find((t) => t.id === scopeId)?.name || 'Not selected'}{' '}
                      • Effective: {effectiveFrom || 'Not set'}{' '}
                      {effectiveTo ? `to ${effectiveTo}` : '(Ongoing)'}
                    </CardDescription>
                    <CardDescription>
                      Entitlements: {selectedCount} leave type(s) selected.
                    </CardDescription>
                  </Stack>
                </Card>
              </Stack>
            </Stack>
          </Card>
        </Stack>
      </form>
    </Modal>
  );
}

export default LeavePolicyDrawer;
