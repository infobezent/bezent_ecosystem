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
  Switch,
  Button,
  Badge,
  Alert,
  Spinner,
  Divider,
} from '../../../../design-system/components';
import { BezentIcon } from '../../../../design-system/icons';
import type {
  LeaveTypeItem,
  CreateLeaveTypeDto,
  LeaveTypeCategory,
  LeaveDocumentRequirement,
  PaidClassification,
  DayTreatment,
  GenderEligibility,
  TeamCalendarVisibility,
  LeaveTypeColorToken,
} from './types/leaveTypes.types';

export interface LeaveTypeDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  mode?: 'create' | 'edit' | 'view';
  initialData?: LeaveTypeItem | null;
  onSaved: (savedItem: LeaveTypeItem) => void;
  onSaveError?: (errorMsg: string) => void;
  saveFn: (dto: CreateLeaveTypeDto, id?: string) => Promise<LeaveTypeItem>;
  onSwitchToEdit?: () => void;
  canManage?: boolean;
}

const CATEGORY_LABELS: Record<LeaveTypeCategory, string> = {
  paid: 'Standard Paid',
  unpaid: 'Unpaid / Loss of Pay',
  statutory: 'Statutory Mandate',
  special_event: 'Special Event / Study',
  compensatory: 'Compensatory Off',
  optional_holiday: 'Optional / Floating Holiday',
  loss_of_pay: 'Loss of Pay (Deduction)',
};

const UNPAID_CATEGORIES: LeaveTypeCategory[] = ['unpaid', 'loss_of_pay'];

const PAYMENT_OPTIONS: Array<{ value: PaidClassification; title: string; description: string }> = [
  {
    value: 'paid',
    title: 'Paid Leave',
    description: 'Employee receives standard salary compensation during absence.',
  },
  {
    value: 'partly_paid',
    title: 'Partly Paid',
    description: 'A portion of salary is paid, as defined by payroll.',
  },
  {
    value: 'unpaid',
    title: 'Unpaid (LWP)',
    description: 'Deducted as Loss of Pay without base salary compensation.',
  },
];

const PAYMENT_LABELS: Record<PaidClassification, string> = {
  paid: 'Paid Leave',
  partly_paid: 'Partly Paid',
  unpaid: 'Unpaid (LWP)',
};

const TREATMENT_LABELS: Record<DayTreatment, string> = {
  inherit: 'Follow General Settings',
  count: 'Always count as leave',
  exclude: 'Never count as leave',
};

const GENDER_LABELS: Record<GenderEligibility, string> = {
  all: 'All employees',
  female: 'Female employees only',
  male: 'Male employees only',
};

const CALENDAR_LABELS: Record<TeamCalendarVisibility, string> = {
  leave_type: 'Show leave type name',
  generic_leave: 'Show as "On Leave"',
  none: 'Hide from team calendar',
};

const COLOR_TOKENS: LeaveTypeColorToken[] = ['warning', 'success', 'info', 'danger', 'neutral'];

interface FormState {
  name: string;
  code: string;
  category: LeaveTypeCategory;
  description: string;
  instructions: string;
  paidClassification: PaidClassification;
  colorToken: LeaveTypeColorToken;
  isTracked: boolean;
  visibleToEmployee: boolean;
  allowHalfDay: boolean;
  minPerRequest: string;
  maxPerRequest: string;
  maxConsecutiveDays: string;
  maxPerMonth: string;
  maxPerYear: string;
  weeklyOffTreatment: DayTreatment;
  holidayTreatment: DayTreatment;
  sandwichRuleEnabled: boolean;
  documentRequirement: LeaveDocumentRequirement;
  documentThresholdDays: string;
  certificateType: string;
  allowedInProbation: boolean;
  allowedInNoticePeriod: boolean;
  genderEligibility: GenderEligibility;
  negativeBalanceEnabled: boolean;
  negativeBalanceLimit: string;
  carryForwardEnabled: boolean;
  encashmentEnabled: boolean;
  countsAsPresent: boolean;
  countsTowardService: boolean;
  teamCalendarVisibility: TeamCalendarVisibility;
  effectiveFrom: string;
  effectiveTo: string;
  isActive: boolean;
}

const EMPTY_FORM: FormState = {
  name: '',
  code: '',
  category: 'paid',
  description: '',
  instructions: '',
  paidClassification: 'paid',
  colorToken: 'warning',
  isTracked: true,
  visibleToEmployee: true,
  allowHalfDay: true,
  minPerRequest: '0.5',
  maxPerRequest: '',
  maxConsecutiveDays: '',
  maxPerMonth: '',
  maxPerYear: '',
  weeklyOffTreatment: 'inherit',
  holidayTreatment: 'inherit',
  sandwichRuleEnabled: false,
  documentRequirement: 'none',
  documentThresholdDays: '2',
  certificateType: '',
  allowedInProbation: true,
  allowedInNoticePeriod: false,
  genderEligibility: 'all',
  negativeBalanceEnabled: false,
  negativeBalanceLimit: '',
  carryForwardEnabled: false,
  encashmentEnabled: false,
  countsAsPresent: false,
  countsTowardService: true,
  teamCalendarVisibility: 'generic_leave',
  effectiveFrom: '',
  effectiveTo: '',
  isActive: true,
};

const asText = (v: string | number | null | undefined) =>
  v === null || v === undefined ? '' : String(Number(v));

function formFromItem(item: LeaveTypeItem): FormState {
  return {
    name: item.name,
    code: item.code,
    category: item.category,
    description: item.description ?? '',
    instructions: item.instructions ?? '',
    paidClassification: item.payrollImpact,
    colorToken: (COLOR_TOKENS as string[]).includes(item.colorToken)
      ? (item.colorToken as LeaveTypeColorToken)
      : 'warning',
    isTracked: item.isTracked,
    visibleToEmployee: item.visibleToEmployee,
    allowHalfDay: item.allowHalfDay,
    minPerRequest: asText(item.minPerRequest) || '1',
    maxPerRequest: asText(item.maxPerRequest),
    maxConsecutiveDays: asText(item.maxConsecutiveDays),
    maxPerMonth: asText(item.maxPerMonth),
    maxPerYear: asText(item.maxPerYear),
    weeklyOffTreatment: item.weeklyOffTreatment ?? 'inherit',
    holidayTreatment: item.holidayTreatment ?? 'inherit',
    sandwichRuleEnabled: item.sandwichRuleEnabled,
    documentRequirement: item.documentRequirement,
    documentThresholdDays: item.documentThresholdDays ? String(item.documentThresholdDays) : '2',
    certificateType: item.certificateType ?? '',
    allowedInProbation: item.allowedInProbation,
    allowedInNoticePeriod: item.allowedInNoticePeriod,
    genderEligibility: item.genderEligibility ?? 'all',
    negativeBalanceEnabled: item.negativeBalanceEnabled,
    negativeBalanceLimit: asText(item.negativeBalanceLimit),
    carryForwardEnabled: item.carryForwardEnabled,
    encashmentEnabled: item.encashmentEnabled,
    countsAsPresent: item.countsAsPresent,
    countsTowardService: item.countsTowardService,
    teamCalendarVisibility: item.teamCalendarVisibility ?? 'generic_leave',
    effectiveFrom: item.effectiveFrom,
    effectiveTo: item.effectiveTo ?? '',
    isActive: item.isActive,
  };
}

const isHalfStep = (n: number) => Number.isInteger(n * 2);
const optionalNumber = (v: string): number | null => (v.trim() ? Number(v) : null);

function ToggleRow({
  title,
  description,
  checked,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <Inline justify="between" align="center">
      <div>
        <strong>{title}</strong>
        <CardDescription>{description}</CardDescription>
      </div>
      <Switch checked={checked} onChange={(e) => onChange(e.target.checked)} aria-label={title} />
    </Inline>
  );
}

function ViewField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Stack gap="xs">
      <CardDescription>{label}</CardDescription>
      <span>{children}</span>
    </Stack>
  );
}

function YesNo({ value, yes = 'Yes', no = 'No' }: { value: boolean; yes?: string; no?: string }) {
  return (
    <Inline gap="xs" align="center">
      <Badge variant={value ? 'success' : 'neutral'}>{value ? yes : no}</Badge>
    </Inline>
  );
}

const days = (v: string | number | null | undefined, empty: string) =>
  v === null || v === undefined || v === '' ? empty : `${Number(v)} day(s)`;

export function LeaveTypeDrawer({
  isOpen,
  onClose,
  mode = 'create',
  initialData,
  onSaved,
  saveFn,
  onSwitchToEdit,
  canManage = true,
}: LeaveTypeDrawerProps) {
  const isViewing = mode === 'view';
  const isEditing = mode === 'edit';

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  useEffect(() => {
    setForm(initialData ? formFromItem(initialData) : EMPTY_FORM);
    setFormError(null);
    setFieldErrors({});
    setShowAdvanced(false);
  }, [initialData, isOpen, mode]);

  const suggestCode = (text: string): string => {
    const words = text.trim().split(/\s+/).filter(Boolean);
    if (words.length >= 2) {
      return words
        .map((w) => w[0]?.toUpperCase() || '')
        .join('')
        .slice(0, 6);
    }
    return text
      .replace(/[^a-zA-Z0-9]/g, '')
      .slice(0, 4)
      .toUpperCase();
  };

  // Auto-suggest code when typing name on creation if code is untouched
  const handleNameChange = (val: string) => {
    setForm((prev) => ({
      ...prev,
      name: val,
      code:
        !isEditing && !isViewing && (!prev.code || prev.code === suggestCode(prev.name))
          ? suggestCode(val)
          : prev.code,
    }));
  };

  const handleCategoryChange = (category: LeaveTypeCategory) => {
    setForm((prev) => ({
      ...prev,
      category,
      // Unpaid categories are always unpaid for payroll (server enforces the same rule).
      paidClassification: UNPAID_CATEGORIES.includes(category) ? 'unpaid' : prev.paidClassification,
      isTracked: category === 'loss_of_pay' ? false : prev.isTracked,
    }));
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};

    const trimmedName = form.name.trim();
    if (trimmedName.length < 2 || trimmedName.length > 100) {
      errs.name = 'Name is required (2–100 characters).';
    }
    if (!/^[A-Z0-9_]{1,20}$/.test(form.code.trim().toUpperCase())) {
      errs.code = 'Short code is required (1–20 uppercase alphanumeric characters).';
    }

    const minNum = Number(form.minPerRequest);
    if (!form.minPerRequest.trim() || isNaN(minNum) || minNum <= 0 || !isHalfStep(minNum)) {
      errs.minPerRequest = 'Minimum request must be greater than 0, in steps of 0.5 days.';
    } else if (!form.allowHalfDay && minNum < 1) {
      errs.minPerRequest = 'Minimum request must be at least 1 day when half-day is disabled.';
    }

    const checkLimit = (key: keyof FormState, label: string) => {
      const raw = String(form[key]);
      if (!raw.trim()) return null;
      const n = Number(raw);
      if (isNaN(n) || n <= 0 || !isHalfStep(n)) {
        errs[key] = `${label} must be greater than 0, in steps of 0.5 days.`;
        return null;
      }
      return n;
    };
    const maxReq = checkLimit('maxPerRequest', 'Maximum per request');
    const maxMonth = checkLimit('maxPerMonth', 'Maximum per month');
    const maxYear = checkLimit('maxPerYear', 'Maximum per year');

    if (maxReq !== null && !errs.minPerRequest && maxReq < minNum) {
      errs.maxPerRequest = 'Maximum per request cannot be less than the minimum.';
    }
    if (maxMonth !== null && maxYear !== null && maxMonth > maxYear) {
      errs.maxPerMonth = 'Monthly limit cannot exceed the yearly limit.';
    }

    if (form.maxConsecutiveDays.trim()) {
      const maxNum = Number(form.maxConsecutiveDays);
      if (!Number.isInteger(maxNum) || maxNum <= 0) {
        errs.maxConsecutiveDays = 'Maximum consecutive days must be a whole number above 0.';
      } else if (!isNaN(minNum) && maxNum < minNum) {
        errs.maxConsecutiveDays = 'Maximum days cannot be less than minimum per request.';
      }
    }

    if (form.documentRequirement === 'mandatory_after_n_days') {
      const threshNum = Number(form.documentThresholdDays);
      if (!Number.isInteger(threshNum) || threshNum < 1) {
        errs.documentThresholdDays = 'Threshold must be at least 1 day.';
      }
    }

    if (form.negativeBalanceEnabled) {
      const limit = Number(form.negativeBalanceLimit);
      if (!form.negativeBalanceLimit.trim() || isNaN(limit) || limit < 0.5 || !isHalfStep(limit)) {
        errs.negativeBalanceLimit = 'Enter a limit of at least 0.5 days, in steps of 0.5.';
      }
    }

    if (form.effectiveTo && form.effectiveFrom && form.effectiveTo < form.effectiveFrom) {
      errs.effectiveTo = 'Effective until cannot be earlier than effective from.';
    }

    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!validate()) return;

    setSubmitting(true);
    try {
      const needsDocs = form.documentRequirement !== 'none';
      const dto: CreateLeaveTypeDto = {
        name: form.name.trim(),
        code: form.code.trim().toUpperCase(),
        shortLabel: form.name.trim().slice(0, 50),
        colorToken: form.colorToken,
        category: form.category,
        description: form.description.trim() || null,
        instructions: form.instructions.trim() || null,
        paidClassification: form.paidClassification,
        isTracked: form.isTracked,
        visibleToEmployee: form.visibleToEmployee,
        allowHalfDay: form.allowHalfDay,
        minPerRequest: Number(form.minPerRequest),
        maxPerRequest: optionalNumber(form.maxPerRequest),
        maxConsecutiveDays: optionalNumber(form.maxConsecutiveDays),
        maxPerMonth: optionalNumber(form.maxPerMonth),
        maxPerYear: optionalNumber(form.maxPerYear),
        weeklyOffTreatment: form.weeklyOffTreatment,
        holidayTreatment: form.holidayTreatment,
        sandwichRuleEnabled: form.sandwichRuleEnabled,
        documentRequirement: form.documentRequirement,
        documentThresholdDays:
          form.documentRequirement === 'mandatory_after_n_days'
            ? Number(form.documentThresholdDays)
            : null,
        certificateType: needsDocs ? form.certificateType.trim() || null : null,
        allowedInProbation: form.allowedInProbation,
        allowedInNoticePeriod: form.allowedInNoticePeriod,
        genderEligibility: form.genderEligibility,
        negativeBalanceEnabled: form.negativeBalanceEnabled,
        negativeBalanceLimit: form.negativeBalanceEnabled
          ? optionalNumber(form.negativeBalanceLimit)
          : null,
        carryForwardEnabled: form.carryForwardEnabled,
        encashmentEnabled: form.encashmentEnabled,
        countsAsPresent: form.countsAsPresent,
        countsTowardService: form.countsTowardService,
        teamCalendarVisibility: form.teamCalendarVisibility,
        effectiveFrom: form.effectiveFrom || undefined,
        effectiveTo: form.effectiveTo || null,
        isActive: form.isActive,
      };

      const saved = await saveFn(dto, initialData?.id);
      onSaved(saved);
      onClose();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Failed to save leave type.');
    } finally {
      setSubmitting(false);
    }
  };

  // View Mode UI — read-only layout
  if (isViewing && initialData) {
    let docDesc = 'None';
    if (initialData.documentRequirement === 'optional') docDesc = 'Optional';
    else if (initialData.documentRequirement === 'mandatory')
      docDesc = 'Mandatory for all requests';
    else if (initialData.documentRequirement === 'mandatory_after_n_days') {
      docDesc = `Mandatory after ${initialData.documentThresholdDays || 1} day(s)`;
    }

    return (
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        variant="drawer"
        size="drawer"
        title={initialData.name}
        description={`Leave Code: ${initialData.code} • ${CATEGORY_LABELS[initialData.category] || initialData.category}`}
        footer={
          <Inline justify="between" align="center">
            <Button variant="secondary" type="button" onClick={onClose}>
              Close
            </Button>
            {canManage && (
              <Button variant="primary" type="button" onClick={onSwitchToEdit}>
                Edit Leave Type
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
                <Badge variant={initialData.isActive ? 'success' : 'neutral'}>
                  {initialData.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </Inline>

              <Grid columns={2} gap="lg">
                <ViewField label="Leave Type Name">
                  <strong>{initialData.name}</strong>
                </ViewField>
                <ViewField label="Leave Code">
                  <Badge variant="neutral">{initialData.code}</Badge>
                </ViewField>
                <ViewField label="Category">
                  {CATEGORY_LABELS[initialData.category] || initialData.category}
                </ViewField>
                <ViewField label="Payment Classification">
                  <Badge variant={initialData.payrollImpact === 'paid' ? 'success' : 'neutral'}>
                    {PAYMENT_LABELS[initialData.payrollImpact]}
                  </Badge>
                </ViewField>
                <ViewField label="Balance Tracking">
                  <YesNo value={initialData.isTracked} yes="Tracked" no="Not tracked" />
                </ViewField>
                <ViewField label="Effective">
                  {initialData.effectiveFrom}
                  {initialData.effectiveTo ? ` to ${initialData.effectiveTo}` : ' (Ongoing)'}
                </ViewField>
              </Grid>

              {initialData.description && (
                <ViewField label="Description">{initialData.description}</ViewField>
              )}
              {initialData.instructions && (
                <ViewField label="Instructions for Employees">{initialData.instructions}</ViewField>
              )}
            </Stack>

            <Divider />

            <Stack gap="md">
              <CardTitle>Request Limits</CardTitle>
              <Grid columns={2} gap="lg">
                <ViewField label="Permitted Units">
                  <strong>
                    {initialData.allowHalfDay ? 'Full Day & Half Day' : 'Full Day Only'}
                  </strong>
                </ViewField>
                <ViewField label="Minimum per Request">
                  {days(initialData.minPerRequest, '1 day')}
                </ViewField>
                <ViewField label="Maximum per Request">
                  {days(initialData.maxPerRequest, 'No limit')}
                </ViewField>
                <ViewField label="Maximum Consecutive Days">
                  {days(initialData.maxConsecutiveDays, 'No limit')}
                </ViewField>
                <ViewField label="Maximum per Month">
                  {days(initialData.maxPerMonth, 'No limit')}
                </ViewField>
                <ViewField label="Yearly Ceiling">
                  {days(initialData.maxPerYear, 'Policy defined')}
                </ViewField>
              </Grid>
            </Stack>

            <Divider />

            <Stack gap="md">
              <CardTitle>Documentation &amp; Eligibility</CardTitle>
              <Grid columns={2} gap="lg">
                <ViewField label="Supporting Document">{docDesc}</ViewField>
                {initialData.certificateType && (
                  <ViewField label="Certificate Type">{initialData.certificateType}</ViewField>
                )}
                <ViewField label="Eligible Employees">
                  {GENDER_LABELS[initialData.genderEligibility ?? 'all']}
                </ViewField>
                <ViewField label="Allowed in Probation">
                  <YesNo value={initialData.allowedInProbation} />
                </ViewField>
                <ViewField label="Allowed in Notice Period">
                  <YesNo value={initialData.allowedInNoticePeriod} />
                </ViewField>
              </Grid>
            </Stack>

            <Divider />

            <Stack gap="md">
              <CardTitle>Advanced Rules</CardTitle>
              <Grid columns={2} gap="lg">
                <ViewField label="Weekly Offs">
                  {TREATMENT_LABELS[initialData.weeklyOffTreatment ?? 'inherit']}
                </ViewField>
                <ViewField label="Holidays">
                  {TREATMENT_LABELS[initialData.holidayTreatment ?? 'inherit']}
                </ViewField>
                <ViewField label="Sandwich Rule">
                  <YesNo value={initialData.sandwichRuleEnabled} yes="Enabled" no="Disabled" />
                </ViewField>
                <ViewField label="Negative Balance">
                  {initialData.negativeBalanceEnabled
                    ? `Up to ${Number(initialData.negativeBalanceLimit)} day(s)`
                    : 'Not allowed'}
                </ViewField>
                <ViewField label="Carry Forward Supported">
                  <YesNo value={initialData.carryForwardEnabled} yes="Enabled" no="Disabled" />
                </ViewField>
                <ViewField label="Encashment Supported">
                  <YesNo value={initialData.encashmentEnabled} yes="Enabled" no="Disabled" />
                </ViewField>
                <ViewField label="Team Calendar">
                  {CALENDAR_LABELS[initialData.teamCalendarVisibility ?? 'generic_leave']}
                </ViewField>
                <ViewField label="Attendance Status Code">
                  <Badge variant="neutral">{initialData.attendanceStatusCode}</Badge>
                </ViewField>
              </Grid>
            </Stack>
          </Stack>
        </Card>
      </Modal>
    );
  }

  const isUnpaidCategory = UNPAID_CATEGORIES.includes(form.category);

  // Create / Edit Form UI
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      variant="drawer"
      size="drawer"
      title={isEditing ? 'Edit Leave Type' : 'Create Leave Type'}
      description="Define category, payment classification, request limits, and eligibility rules."
      footer={
        <Inline justify="between" align="center">
          <Button variant="secondary" type="button" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" form="leave-type-form" disabled={submitting}>
            {submitting ? (
              <Inline gap="xs" align="center">
                <Spinner size="sm" />
                <span>Saving...</span>
              </Inline>
            ) : isEditing ? (
              'Save Changes'
            ) : (
              'Create Leave Type'
            )}
          </Button>
        </Inline>
      }
    >
      <form id="leave-type-form" onSubmit={handleSubmit}>
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
                    Core identification and category classification for employee requests.
                  </CardDescription>
                </Stack>

                <FormField
                  label="Leave Type Name"
                  htmlFor="ltName"
                  required
                  error={fieldErrors.name}
                >
                  <Input
                    id="ltName"
                    value={form.name}
                    placeholder="e.g. Annual Leave, Casual Leave"
                    onChange={(e) => handleNameChange(e.target.value)}
                  />
                </FormField>

                <Grid columns={2} gap="md">
                  <FormField
                    label="Short Code"
                    htmlFor="ltCode"
                    required
                    error={fieldErrors.code}
                    helperText={
                      isEditing ? 'Locked once the leave type has requests or balances.' : undefined
                    }
                  >
                    <Input
                      id="ltCode"
                      value={form.code}
                      placeholder="e.g. AL, CL, SL"
                      onChange={(e) => set('code', e.target.value.toUpperCase())}
                    />
                  </FormField>

                  <FormField label="Category" htmlFor="ltCategory" required>
                    <Select
                      id="ltCategory"
                      value={form.category}
                      onChange={(e) => handleCategoryChange(e.target.value as LeaveTypeCategory)}
                    >
                      {(Object.keys(CATEGORY_LABELS) as LeaveTypeCategory[]).map((c) => (
                        <option key={c} value={c}>
                          {CATEGORY_LABELS[c]}
                        </option>
                      ))}
                    </Select>
                  </FormField>
                </Grid>

                <Grid columns={2} gap="md">
                  <FormField label="Badge Color" htmlFor="ltColor">
                    <Select
                      id="ltColor"
                      value={form.colorToken}
                      onChange={(e) => set('colorToken', e.target.value as LeaveTypeColorToken)}
                    >
                      {COLOR_TOKENS.map((t) => (
                        <option key={t} value={t}>
                          {t.charAt(0).toUpperCase() + t.slice(1)}
                        </option>
                      ))}
                    </Select>
                  </FormField>
                  <Stack gap="xs">
                    <CardDescription>Preview</CardDescription>
                    <Inline gap="xs" align="center">
                      <Badge variant={form.colorToken}>{form.code || 'CODE'}</Badge>
                    </Inline>
                  </Stack>
                </Grid>

                {isEditing && (
                  <ToggleRow
                    title="Active"
                    description="Active leave types are available for employee applications."
                    checked={form.isActive}
                    onChange={(v) => set('isActive', v)}
                  />
                )}

                <FormField label="Description" htmlFor="ltDescription">
                  <Textarea
                    id="ltDescription"
                    value={form.description}
                    rows={2}
                    maxLength={500}
                    placeholder="Provide policy context for employees..."
                    onChange={(e) => set('description', e.target.value)}
                  />
                </FormField>

                <FormField
                  label="Instructions for Employees"
                  htmlFor="ltInstructions"
                  helperText="Shown on the Apply Leave screen."
                >
                  <Textarea
                    id="ltInstructions"
                    value={form.instructions}
                    rows={2}
                    maxLength={500}
                    placeholder="e.g. Apply at least 3 days in advance."
                    onChange={(e) => set('instructions', e.target.value)}
                  />
                </FormField>

                <Grid columns={2} gap="md">
                  <FormField label="Effective From" htmlFor="ltEffectiveFrom">
                    <Input
                      id="ltEffectiveFrom"
                      type="date"
                      value={form.effectiveFrom}
                      onChange={(e) => set('effectiveFrom', e.target.value)}
                    />
                  </FormField>
                  <FormField
                    label="Effective Until"
                    htmlFor="ltEffectiveTo"
                    error={fieldErrors.effectiveTo}
                  >
                    <Input
                      id="ltEffectiveTo"
                      type="date"
                      value={form.effectiveTo}
                      onChange={(e) => set('effectiveTo', e.target.value)}
                    />
                  </FormField>
                </Grid>
              </Stack>

              <Divider />

              {/* Section 2: Payment Classification */}
              <Stack gap="md">
                <Stack gap="none">
                  <CardTitle>Payment Classification</CardTitle>
                  <CardDescription>
                    Determines whether leave days are compensated with salary or deducted as Loss of
                    Pay.
                  </CardDescription>
                </Stack>

                <div role="radiogroup" aria-label="Payment Classification">
                  <Grid columns={3} gap="md">
                    {PAYMENT_OPTIONS.map((opt) => {
                      const selected = form.paidClassification === opt.value;
                      const disabled = isUnpaidCategory && opt.value !== 'unpaid';
                      const choose = () => !disabled && set('paidClassification', opt.value);
                      return (
                        <Card
                          key={opt.value}
                          variant={selected ? 'tint-blue' : 'interactive'}
                          className={selected ? 'bezent-card--interactive' : ''}
                          padding="sm"
                          role="radio"
                          aria-checked={selected}
                          aria-disabled={disabled}
                          tabIndex={disabled ? -1 : 0}
                          onClick={choose}
                          onKeyDown={(e) => {
                            if (e.key === ' ' || e.key === 'Enter') {
                              e.preventDefault();
                              choose();
                            }
                          }}
                        >
                          <Stack gap="xs">
                            <Inline justify="between" align="center">
                              <strong>{opt.title}</strong>
                              {selected && (
                                <Badge variant="info">
                                  <Inline gap="xs" align="center">
                                    <BezentIcon name="check" size={12} />
                                    <span>Selected</span>
                                  </Inline>
                                </Badge>
                              )}
                            </Inline>
                            <CardDescription>{opt.description}</CardDescription>
                          </Stack>
                        </Card>
                      );
                    })}
                  </Grid>
                </div>
                {isUnpaidCategory && (
                  <CardDescription>
                    Unpaid categories are always unpaid for payroll.
                  </CardDescription>
                )}

                <ToggleRow
                  title="Track Balance"
                  description="Requests are checked against an entitlement. Turn off for unlimited types such as Loss of Pay."
                  checked={form.isTracked}
                  onChange={(v) => set('isTracked', v)}
                />
                <ToggleRow
                  title="Visible to Employees"
                  description="Hidden types can only be applied by HR on an employee's behalf."
                  checked={form.visibleToEmployee}
                  onChange={(v) => set('visibleToEmployee', v)}
                />
              </Stack>

              <Divider />

              {/* Section 3: Request Limits */}
              <Stack gap="md">
                <Stack gap="none">
                  <CardTitle>Request Limits</CardTitle>
                  <CardDescription>
                    Leave is requested in days. Configure half-day support and duration limits.
                  </CardDescription>
                </Stack>

                <ToggleRow
                  title="Allow Half-Day Requests"
                  description="Employees can apply for First Half or Second Half sessions."
                  checked={form.allowHalfDay}
                  onChange={(v) => set('allowHalfDay', v)}
                />

                <Grid columns={2} gap="md">
                  <FormField
                    label="Minimum per Request (Days)"
                    htmlFor="minPerRequest"
                    required
                    error={fieldErrors.minPerRequest}
                  >
                    <Input
                      id="minPerRequest"
                      type="number"
                      step="0.5"
                      min={form.allowHalfDay ? '0.5' : '1'}
                      value={form.minPerRequest}
                      onChange={(e) => set('minPerRequest', e.target.value)}
                    />
                  </FormField>

                  <FormField
                    label="Maximum per Request (Days)"
                    htmlFor="maxPerRequest"
                    error={fieldErrors.maxPerRequest}
                  >
                    <Input
                      id="maxPerRequest"
                      type="number"
                      step="0.5"
                      min="0.5"
                      placeholder="No limit if empty"
                      value={form.maxPerRequest}
                      onChange={(e) => set('maxPerRequest', e.target.value)}
                    />
                  </FormField>

                  <FormField
                    label="Max Consecutive Days"
                    htmlFor="maxConsecutiveDays"
                    error={fieldErrors.maxConsecutiveDays}
                  >
                    <Input
                      id="maxConsecutiveDays"
                      type="number"
                      min="1"
                      placeholder="No limit if empty"
                      value={form.maxConsecutiveDays}
                      onChange={(e) => set('maxConsecutiveDays', e.target.value)}
                    />
                  </FormField>

                  <FormField
                    label="Maximum per Month (Days)"
                    htmlFor="maxPerMonth"
                    error={fieldErrors.maxPerMonth}
                  >
                    <Input
                      id="maxPerMonth"
                      type="number"
                      step="0.5"
                      min="0.5"
                      placeholder="No limit if empty"
                      value={form.maxPerMonth}
                      onChange={(e) => set('maxPerMonth', e.target.value)}
                    />
                  </FormField>

                  <FormField
                    label="Yearly Ceiling (Days)"
                    htmlFor="maxPerYear"
                    error={fieldErrors.maxPerYear}
                    helperText="Hard cap; policy quotas cannot exceed it."
                  >
                    <Input
                      id="maxPerYear"
                      type="number"
                      step="0.5"
                      min="0.5"
                      placeholder="No ceiling if empty"
                      value={form.maxPerYear}
                      onChange={(e) => set('maxPerYear', e.target.value)}
                    />
                  </FormField>
                </Grid>
              </Stack>

              <Divider />

              {/* Section 4: Documentation & Eligibility */}
              <Stack gap="md">
                <Stack gap="none">
                  <CardTitle>Documentation &amp; Eligibility</CardTitle>
                  <CardDescription>
                    Define certificate verification rules and employee stage restrictions.
                  </CardDescription>
                </Stack>

                <FormField label="Supporting Document" htmlFor="docRequirement">
                  <Select
                    id="docRequirement"
                    value={form.documentRequirement}
                    onChange={(e) =>
                      set('documentRequirement', e.target.value as LeaveDocumentRequirement)
                    }
                  >
                    <option value="none">No Document Required</option>
                    <option value="optional">Document Optional</option>
                    <option value="mandatory">Mandatory For Every Request</option>
                    <option value="mandatory_after_n_days">
                      Mandatory If Duration Exceeds Days
                    </option>
                  </Select>
                </FormField>

                {form.documentRequirement === 'mandatory_after_n_days' && (
                  <FormField
                    label="Mandatory Threshold (Days)"
                    htmlFor="docThreshold"
                    required
                    error={fieldErrors.documentThresholdDays}
                  >
                    <Input
                      id="docThreshold"
                      type="number"
                      min="1"
                      value={form.documentThresholdDays}
                      onChange={(e) => set('documentThresholdDays', e.target.value)}
                    />
                  </FormField>
                )}

                {form.documentRequirement !== 'none' && (
                  <FormField label="Certificate Type" htmlFor="certificateType">
                    <Input
                      id="certificateType"
                      placeholder="e.g. Medical Certificate, Event Notice"
                      value={form.certificateType}
                      onChange={(e) => set('certificateType', e.target.value)}
                    />
                  </FormField>
                )}

                <FormField label="Eligible Employees" htmlFor="genderEligibility">
                  <Select
                    id="genderEligibility"
                    value={form.genderEligibility}
                    onChange={(e) => set('genderEligibility', e.target.value as GenderEligibility)}
                  >
                    {(Object.keys(GENDER_LABELS) as GenderEligibility[]).map((g) => (
                      <option key={g} value={g}>
                        {GENDER_LABELS[g]}
                      </option>
                    ))}
                  </Select>
                </FormField>

                <ToggleRow
                  title="Allowed in Probation"
                  description="New hires in probation can apply for this leave category."
                  checked={form.allowedInProbation}
                  onChange={(v) => set('allowedInProbation', v)}
                />
                <ToggleRow
                  title="Allowed in Notice Period"
                  description="Resigned staff serving notice period can apply for this leave."
                  checked={form.allowedInNoticePeriod}
                  onChange={(v) => set('allowedInNoticePeriod', v)}
                />
              </Stack>

              <Divider />

              {/* Section 5: Advanced Rules (Collapsible) */}
              <Stack gap="md">
                <Inline justify="between" align="center">
                  <Stack gap="none">
                    <CardTitle>Advanced Rules</CardTitle>
                    <CardDescription>
                      Day treatment, balances, year-end options, attendance and visibility.
                    </CardDescription>
                  </Stack>
                  <Button
                    variant="secondary"
                    size="sm"
                    type="button"
                    onClick={() => setShowAdvanced((prev) => !prev)}
                  >
                    {showAdvanced ? 'Hide Options' : 'Show Options'}
                  </Button>
                </Inline>

                {showAdvanced && (
                  <Stack gap="md">
                    <Grid columns={2} gap="md">
                      <FormField label="Weekly Offs Inside Leave" htmlFor="weeklyOffTreatment">
                        <Select
                          id="weeklyOffTreatment"
                          value={form.weeklyOffTreatment}
                          onChange={(e) =>
                            set('weeklyOffTreatment', e.target.value as DayTreatment)
                          }
                        >
                          {(Object.keys(TREATMENT_LABELS) as DayTreatment[]).map((t) => (
                            <option key={t} value={t}>
                              {TREATMENT_LABELS[t]}
                            </option>
                          ))}
                        </Select>
                      </FormField>
                      <FormField label="Holidays Inside Leave" htmlFor="holidayTreatment">
                        <Select
                          id="holidayTreatment"
                          value={form.holidayTreatment}
                          onChange={(e) => set('holidayTreatment', e.target.value as DayTreatment)}
                        >
                          {(Object.keys(TREATMENT_LABELS) as DayTreatment[]).map((t) => (
                            <option key={t} value={t}>
                              {TREATMENT_LABELS[t]}
                            </option>
                          ))}
                        </Select>
                      </FormField>
                    </Grid>

                    <ToggleRow
                      title="Sandwich Rule"
                      description="Weekly offs and holidays between two leave days are charged as leave."
                      checked={form.sandwichRuleEnabled}
                      onChange={(v) => set('sandwichRuleEnabled', v)}
                    />

                    <ToggleRow
                      title="Allow Negative Balance"
                      description="Employees may borrow against future entitlement up to a limit."
                      checked={form.negativeBalanceEnabled}
                      onChange={(v) => set('negativeBalanceEnabled', v)}
                    />
                    {form.negativeBalanceEnabled && (
                      <FormField
                        label="Negative Balance Limit (Days)"
                        htmlFor="negativeBalanceLimit"
                        required
                        error={fieldErrors.negativeBalanceLimit}
                      >
                        <Input
                          id="negativeBalanceLimit"
                          type="number"
                          step="0.5"
                          min="0.5"
                          value={form.negativeBalanceLimit}
                          onChange={(e) => set('negativeBalanceLimit', e.target.value)}
                        />
                      </FormField>
                    )}

                    <ToggleRow
                      title="Carry Forward Supported"
                      description="Permits unutilized balances to roll over to next leave year."
                      checked={form.carryForwardEnabled}
                      onChange={(v) => set('carryForwardEnabled', v)}
                    />
                    <ToggleRow
                      title="Encashment Supported"
                      description="Permits balance encashment as per company payroll policy."
                      checked={form.encashmentEnabled}
                      onChange={(v) => set('encashmentEnabled', v)}
                    />
                    <ToggleRow
                      title="Counts as Present"
                      description="Attendance treats this leave as a present day (e.g. on-duty style leave)."
                      checked={form.countsAsPresent}
                      onChange={(v) => set('countsAsPresent', v)}
                    />
                    <ToggleRow
                      title="Counts Toward Service"
                      description="Leave days count toward length of service."
                      checked={form.countsTowardService}
                      onChange={(v) => set('countsTowardService', v)}
                    />

                    <FormField label="Team Calendar" htmlFor="teamCalendarVisibility">
                      <Select
                        id="teamCalendarVisibility"
                        value={form.teamCalendarVisibility}
                        onChange={(e) =>
                          set('teamCalendarVisibility', e.target.value as TeamCalendarVisibility)
                        }
                      >
                        {(Object.keys(CALENDAR_LABELS) as TeamCalendarVisibility[]).map((v) => (
                          <option key={v} value={v}>
                            {CALENDAR_LABELS[v]}
                          </option>
                        ))}
                      </Select>
                    </FormField>
                  </Stack>
                )}
              </Stack>
            </Stack>
          </Card>
        </Stack>
      </form>
    </Modal>
  );
}

export default LeaveTypeDrawer;
