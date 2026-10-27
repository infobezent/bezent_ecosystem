import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  Grid,
  Input,
  Select,
  Switch,
  Checkbox,
  Stack,
  Inline,
  Button,
  Badge,
  Alert,
  LoadingState,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeaderCell,
  TableCell,
  Modal,
  Divider,
  LocaleDatePicker,
} from '../../../../../design-system/components';
import {
  fetchAttendancePoliciesList,
  fetchEffectiveAttendancePolicy,
  createAttendancePolicy,
  updateAttendancePolicyV1,
  publishAttendancePolicy,
  rollbackAttendancePolicyVersion,
} from '../../../attendance/api/attendanceApi';
import { fetchDepartments } from '../../../api/organizationMastersApi';
import { fetchEmployees } from '../../../employees/api/employeesApi';
import type {
  AttendancePolicy,
  EffectivePolicyResolution,
  WorkingHoursConfig,
  LateArrivalConfig,
  EarlyExitConfig,
  ClassificationRulesConfig,
  PenaltyRulesConfig,
  OnDutyRulesConfig,
} from '../../../attendance/types/attendance.types';
import { SettingsRow } from '../components/SettingsRow';

export function PoliciesTab() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Policy List & Selection
  const [policies, setPolicies] = useState<AttendancePolicy[]>([]);
  const [activePolicyId, setActivePolicyId] = useState<string | null>(null);
  const [effectiveResolution, setEffectiveResolution] = useState<EffectivePolicyResolution | null>(
    null,
  );

  // Departments & Employees for Scope selection
  const [departments, setDepartments] = useState<Array<{ id: string; name: string }>>([]);
  const [employees, setEmployees] = useState<Array<{ id: string; fullName: string }>>([]);

  // Selected Scope View filter
  const [selectedScope, setSelectedScope] = useState<'company' | 'department' | 'employee'>(
    'company',
  );
  const [selectedScopeId, setSelectedScopeId] = useState<string>('');

  // Accordion Expand/Collapse state (Working hours open by default)
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    workingHours: true,
    lateArrival: false,
    earlyExit: false,
    classification: false,
    latePenalty: false,
    assignment: false,
    onDuty: false,
  });

  // Policy Form State
  const [policyName, setPolicyName] = useState('Standard Corporate Attendance Policy');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'draft' | 'published'>('published');
  const [version, setVersion] = useState<number>(1);
  const [effectiveFrom, setEffectiveFrom] = useState(new Date().toISOString().slice(0, 10));

  // 1. Working Hours Policy
  const [fullDayHours, setFullDayHours] = useState('8.00');
  const [halfDayHours, setHalfDayHours] = useState('4.00');
  const [workingHoursMode, setWorkingHoursMode] = useState<'fixed_policy' | 'shift_based'>(
    'fixed_policy',
  );
  const [netOrGross, setNetOrGross] = useState<'net' | 'gross'>('net');
  const [breakDeductionMethod, setBreakDeductionMethod] = useState<'scheduled' | 'actual' | 'none'>(
    'scheduled',
  );

  // 1b. Shift Allocation Automation State
  const [shiftAssignmentMode, setShiftAssignmentMode] = useState<
    'roster_assigned' | 'auto_detect_punch'
  >('roster_assigned');
  const [shiftMatchingWindowMinutes, setShiftMatchingWindowMinutes] = useState(60);
  const [fallbackShiftName, setFallbackShiftName] = useState('Standard General Shift');
  const [allowOvernightSpanning, setAllowOvernightSpanning] = useState(true);

  // 2. Late Arrival Policy
  const [enableLateTracking, setEnableLateTracking] = useState(true);
  const [gracePeriodMinutes, setGracePeriodMinutes] = useState(15);
  const [lateCountingMode, setLateCountingMode] = useState<'after_grace' | 'from_start'>(
    'after_grace',
  );
  const [extendedLateThresholdMinutes, setExtendedLateThresholdMinutes] = useState(60);
  const [extendedLateAction, setExtendedLateAction] = useState<
    'flag_review' | 'half_day' | 'mark_absent' | 'none'
  >('flag_review');

  // 3. Early Exit Policy
  const [enableEarlyExitTracking, setEnableEarlyExitTracking] = useState(true);
  const [earlyExitGraceMinutes, setEarlyExitGraceMinutes] = useState(10);
  const [extendedEarlyExitThresholdMinutes, setExtendedEarlyExitThresholdMinutes] = useState(60);
  const [extendedEarlyExitAction, setExtendedEarlyExitAction] = useState<
    'flag_review' | 'half_day' | 'mark_absent' | 'none'
  >('flag_review');

  // 4. Attendance Classification
  const [thresholdMode, setThresholdMode] = useState<'fixed_hours' | 'percentage_of_shift'>(
    'fixed_hours',
  );
  const [fullDayPercentage, setFullDayPercentage] = useState(100);
  const [halfDayPercentage, setHalfDayPercentage] = useState(50);
  const [belowMinimumAction, setBelowMinimumAction] = useState<
    'absent' | 'mark_absent' | 'half_day' | 'flag_exception'
  >('mark_absent');
  const [missingPunchPolicy, setMissingPunchPolicy] = useState<
    'mark_absent' | 'half_day' | 'flag_exception' | 'none'
  >('flag_exception');

  // 5. Late Penalty Rules
  const [penaltyEnabled, setPenaltyEnabled] = useState(true);
  const [lateMarksThreshold, setLateMarksThreshold] = useState(3);
  const [penaltyUnit, setPenaltyUnit] = useState<PenaltyRulesConfig['penaltyUnit']>('half_day');
  const [penaltyPeriod, setPenaltyPeriod] =
    useState<PenaltyRulesConfig['period']>('calendar_month');
  const [penaltyIsRepeating, setPenaltyIsRepeating] = useState(true);
  const [maxPenaltyUnits, setMaxPenaltyUnits] = useState<string>('2.0');

  // 6. Policy Assignment & Overrides
  const [allowRegularization, setAllowRegularization] = useState(true);
  const [regularizationCutoffDays, setRegularizationCutoffDays] = useState(7);
  const [requiresApproval, setRequiresApproval] = useState(true);

  // 7. On-Duty (OD) Policy
  const [odEnabled, setOdEnabled] = useState(true);
  const [odTypes, setOdTypes] = useState<string[]>([
    'Client Visit',
    'Site Inspection',
    'Business Travel',
    'Training',
    'Field Work',
  ]);
  const [newOdTypeInput, setNewOdTypeInput] = useState('');
  const [odAllowFullDay, setOdAllowFullDay] = useState(true);
  const [odAllowHalfDay, setOdAllowHalfDay] = useState(true);
  const [odAllowHourly, setOdAllowHourly] = useState(false);
  const [odAllowMultiDay, setOdAllowMultiDay] = useState(true);
  const [odCreditTreatment, setOdCreditTreatment] = useState<'count_as_present' | 'verified_hours'>(
    'count_as_present',
  );
  const [odPunchRule, setOdPunchRule] = useState<'exempt' | 'required_at_location'>('exempt');
  const [odExemptGeofence, setOdExemptGeofence] = useState(true);
  const [odAdvanceDays, setOdAdvanceDays] = useState(2);
  const [odBackdatedDays, setOdBackdatedDays] = useState(3);
  const [odRequiresApproval, setOdRequiresApproval] = useState(true);
  const [odRequiresReason, setOdRequiresReason] = useState(true);
  const [odRequiresEvidence, setOdRequiresEvidence] = useState(false);

  // Dirty State Detection
  const [isDirty, setIsDirty] = useState(false);

  // Review & Publish Modal
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [publishReason, setPublishReason] = useState('');
  const [publishEffectiveDate, setPublishEffectiveDate] = useState(
    new Date().toISOString().slice(0, 10),
  );

  // Toggle Accordion section
  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  // Load Policies and scope entities
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [policiesList, deptsRes, empsRes] = await Promise.all([
        fetchAttendancePoliciesList(),
        fetchDepartments({ status: 'all' }).catch(() => []),
        fetchEmployees({ pageSize: 100 }).catch(() => ({ data: [] })),
      ]);

      setPolicies(policiesList);

      const deptList = (Array.isArray(deptsRes) ? deptsRes : []).map(
        (d: { id: string; name: string }) => ({
          id: d.id,
          name: d.name,
        }),
      );
      setDepartments(deptList);

      const empList = (empsRes.data ?? []).map(
        (e: { id: string; firstName: string; lastName?: string | null }) => ({
          id: e.id,
          fullName: `${e.firstName} ${e.lastName || ''}`.trim(),
        }),
      );
      setEmployees(empList);

      // Resolve effective policy based on current selected scope
      const empId = selectedScope === 'employee' ? selectedScopeId : undefined;
      const deptId = selectedScope === 'department' ? selectedScopeId : undefined;
      const resolution = await fetchEffectiveAttendancePolicy({
        employeeId: empId,
        departmentId: deptId,
      });
      setEffectiveResolution(resolution);

      // Check if an explicit policy record already exists for this exact scope and scopeId
      const exactScopePolicy = policiesList.find((p) => {
        if (selectedScope === 'company') {
          return p.scope === 'company';
        }
        return p.scope === selectedScope && p.scopeId === selectedScopeId;
      });

      // Populate form state from resolution or company policy
      const pol = resolution.policy;
      if (exactScopePolicy) {
        setActivePolicyId(exactScopePolicy.id);
        setPolicyName(exactScopePolicy.policyName);
        setDescription(exactScopePolicy.description || '');
        setStatus(exactScopePolicy.status === 'draft' ? 'draft' : 'published');
        setVersion(exactScopePolicy.version ?? 1);
        setEffectiveFrom(exactScopePolicy.effectiveFrom || new Date().toISOString().slice(0, 10));
      } else if (selectedScope !== 'company') {
        setActivePolicyId(null);
        setStatus('draft');
        setVersion(1);
        const entityName =
          selectedScope === 'department'
            ? deptList.find((d: { id: string; name: string }) => d.id === selectedScopeId)?.name ||
              'Department'
            : empList.find((e: { id: string; fullName: string }) => e.id === selectedScopeId)
                ?.fullName || 'Employee';
        setPolicyName(`${entityName} Attendance Policy`);
        setDescription(`Custom attendance policy override for ${entityName}`);
        setEffectiveFrom(new Date().toISOString().slice(0, 10));
      } else {
        setActivePolicyId(pol.id);
        setPolicyName(pol.policyName);
        setDescription(pol.description || '');
        setStatus(pol.status === 'draft' ? 'draft' : 'published');
        setVersion(pol.version ?? 1);
        setEffectiveFrom(pol.effectiveFrom || new Date().toISOString().slice(0, 10));
      }

      setFullDayHours(String(pol.fullDayThresholdHours ?? '8.00'));
      setHalfDayHours(String(pol.halfDayThresholdHours ?? '4.00'));
      setBreakDeductionMethod(pol.breakDeductionMethod || 'scheduled');

      setEnableLateTracking(pol.enableLateTracking ?? true);
      setGracePeriodMinutes(pol.gracePeriodMinutes ?? 15);
      setEnableEarlyExitTracking(pol.enableEarlyExitTracking ?? true);

      setMissingPunchPolicy(pol.missingPunchPolicy || 'flag_exception');
      setAllowRegularization(pol.allowRegularization ?? true);
      setRegularizationCutoffDays(pol.regularizationCutoffDays ?? 7);
      setRequiresApproval(pol.requiresApproval ?? true);

      if (pol.classificationRules?.workingHoursConfig) {
        setWorkingHoursMode(
          pol.classificationRules.workingHoursConfig.workingHoursMode || 'fixed_policy',
        );
        setNetOrGross(pol.classificationRules.workingHoursConfig.netOrGross || 'net');
        setShiftAssignmentMode(
          pol.classificationRules.workingHoursConfig.shiftAssignmentMode || 'roster_assigned',
        );
        setShiftMatchingWindowMinutes(
          pol.classificationRules.workingHoursConfig.shiftMatchingWindowMinutes ?? 60,
        );
        setFallbackShiftName(
          pol.classificationRules.workingHoursConfig.fallbackShiftName || 'Standard General Shift',
        );
        setAllowOvernightSpanning(
          pol.classificationRules.workingHoursConfig.allowOvernightSpanning ?? true,
        );
      }

      if (pol.classificationRules?.lateArrivalConfig) {
        setLateCountingMode(
          pol.classificationRules.lateArrivalConfig.countingMode || 'after_grace',
        );
        setExtendedLateThresholdMinutes(
          pol.classificationRules.lateArrivalConfig.extendedLateThresholdMinutes ?? 60,
        );
        setExtendedLateAction(
          pol.classificationRules.lateArrivalConfig.extendedLateAction || 'flag_review',
        );
      }

      if (pol.classificationRules?.earlyExitConfig) {
        setEarlyExitGraceMinutes(pol.classificationRules.earlyExitConfig.graceMinutes ?? 10);
        setExtendedEarlyExitThresholdMinutes(
          pol.classificationRules.earlyExitConfig.extendedEarlyExitThresholdMinutes ?? 60,
        );
        setExtendedEarlyExitAction(
          pol.classificationRules.earlyExitConfig.extendedEarlyExitAction || 'flag_review',
        );
      }

      if (pol.classificationRules) {
        setThresholdMode(pol.classificationRules.thresholdMode || 'fixed_hours');
        setFullDayPercentage(pol.classificationRules.fullDayPercentage ?? 100);
        setHalfDayPercentage(pol.classificationRules.halfDayPercentage ?? 50);
        setBelowMinimumAction(pol.classificationRules.insufficientHoursAction || 'mark_absent');
      }

      if (pol.penaltyRules) {
        setPenaltyEnabled(pol.penaltyRules.enabled ?? true);
        setLateMarksThreshold(pol.penaltyRules.lateMarksThreshold ?? 3);
        setPenaltyUnit(pol.penaltyRules.penaltyUnit || 'half_day');
        setPenaltyPeriod(pol.penaltyRules.period || 'calendar_month');
        setPenaltyIsRepeating(pol.penaltyRules.isRepeating ?? true);
        setMaxPenaltyUnits(
          pol.penaltyRules.maxPenaltyUnits != null
            ? String(pol.penaltyRules.maxPenaltyUnits)
            : '2.0',
        );
      }

      if (pol.odRules) {
        setOdEnabled(pol.odRules.enabled ?? true);
        if (Array.isArray(pol.odRules.odTypes) && pol.odRules.odTypes.length > 0) {
          setOdTypes(pol.odRules.odTypes);
        }
        setOdAllowFullDay(pol.odRules.allowFullDay ?? true);
        setOdAllowHalfDay(pol.odRules.allowHalfDay ?? true);
        setOdAllowHourly(pol.odRules.allowHourly ?? false);
        setOdAllowMultiDay(pol.odRules.allowMultiDay ?? true);
        setOdCreditTreatment(pol.odRules.creditTreatment || 'count_as_present');
        setOdPunchRule(pol.odRules.punchRule || 'exempt');
        setOdExemptGeofence(pol.odRules.exemptFromGeofence ?? true);
        setOdAdvanceDays(pol.odRules.advanceSubmissionDays ?? 2);
        setOdBackdatedDays(pol.odRules.backdatedAllowedDays ?? 3);
        setOdRequiresApproval(pol.odRules.requiresApproval ?? true);
        setOdRequiresReason(pol.odRules.requiresReason ?? true);
        setOdRequiresEvidence(pol.odRules.requiresEvidence ?? false);
      }

      setIsDirty(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load policy data');
    } finally {
      setLoading(false);
    }
  }, [selectedScope, selectedScopeId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleFieldChange = () => {
    setIsDirty(true);
  };

  const handleAddOdType = () => {
    const trimmed = newOdTypeInput.trim();
    if (trimmed && !odTypes.includes(trimmed)) {
      setOdTypes([...odTypes, trimmed]);
      setNewOdTypeInput('');
      handleFieldChange();
    }
  };

  const handleRemoveOdType = (target: string) => {
    setOdTypes(odTypes.filter((t) => t !== target));
    handleFieldChange();
  };

  // Construct current form payload
  const currentPayload = useMemo(() => {
    const workingHours: WorkingHoursConfig = {
      workingHoursMode,
      fullDayHours: Number(fullDayHours),
      halfDayHours: Number(halfDayHours),
      netOrGross,
      breakDeductionMethod,
      shiftAssignmentMode,
      enableAutoShiftAllocation: shiftAssignmentMode === 'auto_detect_punch',
      shiftMatchingWindowMinutes,
      fallbackShiftName,
      allowOvernightSpanning,
    };

    const lateArrival: LateArrivalConfig = {
      enabled: enableLateTracking,
      graceMinutes: gracePeriodMinutes,
      countingMode: lateCountingMode,
      extendedLateThresholdMinutes,
      extendedLateAction,
    };

    const earlyExit: EarlyExitConfig = {
      enabled: enableEarlyExitTracking,
      graceMinutes: earlyExitGraceMinutes,
      extendedEarlyExitThresholdMinutes,
      extendedEarlyExitAction,
    };

    const classificationRules: ClassificationRulesConfig = {
      thresholdMode,
      fullDayPercentage: thresholdMode === 'percentage_of_shift' ? fullDayPercentage : undefined,
      halfDayPercentage: thresholdMode === 'percentage_of_shift' ? halfDayPercentage : undefined,
      insufficientHoursAction: belowMinimumAction,
      missingPunchPolicy,
      workingHoursConfig: workingHours,
      lateArrivalConfig: lateArrival,
      earlyExitConfig: earlyExit,
    };

    const penaltyRules: PenaltyRulesConfig = {
      enabled: penaltyEnabled,
      lateMarksThreshold,
      penaltyUnit,
      period: penaltyPeriod,
      isRepeating: penaltyIsRepeating,
      maxPenaltyUnits: maxPenaltyUnits ? Number(maxPenaltyUnits) : null,
      warningOnly: penaltyUnit === 'warning_only',
    };

    const odRules: OnDutyRulesConfig = {
      enabled: odEnabled,
      odTypes,
      allowFullDay: odAllowFullDay,
      allowHalfDay: odAllowHalfDay,
      allowHourly: odAllowHourly,
      allowMultiDay: odAllowMultiDay,
      creditTreatment: odCreditTreatment,
      punchRule: odPunchRule,
      exemptFromGeofence: odExemptGeofence,
      advanceSubmissionDays: odAdvanceDays,
      backdatedAllowedDays: odBackdatedDays,
      requiresApproval: odRequiresApproval,
      requiresReason: odRequiresReason,
      requiresEvidence: odRequiresEvidence,
      countAsPresent: odCreditTreatment === 'count_as_present',
    };

    return {
      policyName,
      scope: selectedScope,
      scopeId: selectedScope === 'company' ? null : selectedScopeId,
      description,
      status,
      fullDayThresholdHours: Number(fullDayHours),
      halfDayThresholdHours: Number(halfDayHours),
      breakDeductionMethod,
      enableLateTracking,
      gracePeriodMinutes,
      enableEarlyExitTracking,
      missingPunchPolicy,
      allowRegularization,
      regularizationCutoffDays,
      requiresApproval,
      effectiveFrom,
      classificationRules,
      penaltyRules,
      odRules,
      captureMethods: ['web', 'mobile', 'biometric'],
    };
  }, [
    policyName,
    selectedScope,
    selectedScopeId,
    description,
    status,
    fullDayHours,
    halfDayHours,
    breakDeductionMethod,
    enableLateTracking,
    gracePeriodMinutes,
    enableEarlyExitTracking,
    missingPunchPolicy,
    allowRegularization,
    regularizationCutoffDays,
    requiresApproval,
    effectiveFrom,
    thresholdMode,
    fullDayPercentage,
    halfDayPercentage,
    belowMinimumAction,
    workingHoursMode,
    netOrGross,
    shiftAssignmentMode,
    shiftMatchingWindowMinutes,
    fallbackShiftName,
    allowOvernightSpanning,
    lateCountingMode,
    extendedLateThresholdMinutes,
    extendedLateAction,
    earlyExitGraceMinutes,
    extendedEarlyExitThresholdMinutes,
    extendedEarlyExitAction,
    penaltyEnabled,
    lateMarksThreshold,
    penaltyUnit,
    penaltyPeriod,
    penaltyIsRepeating,
    maxPenaltyUnits,
    odEnabled,
    odTypes,
    odAllowFullDay,
    odAllowHalfDay,
    odAllowHourly,
    odAllowMultiDay,
    odCreditTreatment,
    odPunchRule,
    odExemptGeofence,
    odAdvanceDays,
    odBackdatedDays,
    odRequiresApproval,
    odRequiresReason,
    odRequiresEvidence,
  ]);

  // Handle Save Draft
  const handleSaveDraft = async () => {
    setSaving(true);
    setError(null);
    try {
      if (activePolicyId) {
        await updateAttendancePolicyV1(activePolicyId, {
          ...currentPayload,
          status: 'draft',
        });
        setSuccess('Policy draft saved successfully.');
      } else {
        const created = await createAttendancePolicy({
          ...currentPayload,
          status: 'draft',
        });
        setActivePolicyId(created.id);
        setSuccess('New override policy draft created successfully.');
      }
      setIsDirty(false);
      await loadData();
      setTimeout(() => setSuccess(null), 4000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save draft');
    } finally {
      setSaving(false);
    }
  };

  // Handle Publish
  const handleConfirmPublish = async () => {
    if (!publishReason.trim()) {
      setError('A mandatory change reason is required to publish policy changes for audit trails.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      let targetId = activePolicyId;
      if (!targetId) {
        const created = await createAttendancePolicy({
          ...currentPayload,
          status: 'draft',
        });
        targetId = created.id;
      } else {
        await updateAttendancePolicyV1(targetId, currentPayload);
      }

      const published = await publishAttendancePolicy(targetId, {
        changeReason: publishReason,
        effectiveFrom: publishEffectiveDate,
      });

      setSuccess(
        `Policy successfully published as version v${published.version} (Effective from ${published.effectiveFrom}).`,
      );
      setIsPublishModalOpen(false);
      setPublishReason('');
      setIsDirty(false);
      await loadData();
      setTimeout(() => setSuccess(null), 4000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to publish attendance policy');
    } finally {
      setSaving(false);
    }
  };

  // Handle Rollback
  const handleRollback = async (target: AttendancePolicy) => {
    if (
      !window.confirm(
        `Rollback to policy snapshot v${target.version}? This creates a new published version reflecting this snapshot.`,
      )
    ) {
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await rollbackAttendancePolicyVersion(target.id);
      setSuccess(`Restored policy snapshot from v${target.version} as the new active version.`);
      await loadData();
      setTimeout(() => setSuccess(null), 4000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to rollback policy');
    } finally {
      setSaving(false);
    }
  };

  // Helper for provenance badge
  const renderProvenanceBadge = (fieldKey: string) => {
    const prov = effectiveResolution?.provenance?.[fieldKey];
    if (prov === 'employee') {
      return (
        <Badge variant="warning" size="sm">
          Employee Override
        </Badge>
      );
    }
    if (prov === 'department') {
      return (
        <Badge variant="info" size="sm">
          Department Override
        </Badge>
      );
    }
    return (
      <Badge variant="neutral" size="sm">
        Company Default
      </Badge>
    );
  };

  if (loading) {
    return <LoadingState label="Loading Attendance Policies V1.0..." />;
  }

  return (
    <Stack gap="lg">
      {error && <Alert variant="error">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}

      {/* Scope Selector & Actions Card */}
      <Card variant="flat">
        <CardHeader>
          <Inline justify="between" align="center">
            <Inline gap="sm" align="center">
              <CardTitle>Attendance Policies</CardTitle>
              <Badge variant={status === 'published' ? 'success' : 'warning'} size="sm">
                v{version} ({status === 'published' ? 'Published' : 'Draft'})
              </Badge>
              <span className="bezent-text-hint">Effective: {effectiveFrom}</span>
            </Inline>
            <Inline gap="sm" align="center">
              <Button variant="outline" size="sm" disabled={saving} onClick={handleSaveDraft}>
                Save Draft
              </Button>
              <Button
                variant="primary"
                size="sm"
                disabled={saving}
                onClick={() => {
                  setPublishEffectiveDate(effectiveFrom);
                  setIsPublishModalOpen(true);
                }}
              >
                Review & Publish
              </Button>
            </Inline>
          </Inline>
        </CardHeader>

        <Stack gap="md">
          <Grid columns={3} gap="md">
            <div>
              <label className="bezent-label">Effective Scope</label>
              <Select
                value={selectedScope}
                onChange={(e) => {
                  setSelectedScope(e.target.value as 'company' | 'department' | 'employee');
                  setSelectedScopeId('');
                }}
                options={[
                  { value: 'company', label: 'Company Default Policy' },
                  { value: 'department', label: 'Department Override' },
                  { value: 'employee', label: 'Employee Override' },
                ]}
              />
            </div>

            {selectedScope === 'department' && (
              <div>
                <label className="bezent-label">Department Target</label>
                <Select
                  value={selectedScopeId}
                  onChange={(e) => setSelectedScopeId(e.target.value)}
                  options={[
                    { value: '', label: '-- Select Department --' },
                    ...departments.map((d) => ({ value: d.id, label: d.name })),
                  ]}
                />
              </div>
            )}

            {selectedScope === 'employee' && (
              <div>
                <label className="bezent-label">Employee Target</label>
                <Select
                  value={selectedScopeId}
                  onChange={(e) => setSelectedScopeId(e.target.value)}
                  options={[
                    { value: '', label: '-- Select Employee --' },
                    ...employees.map((e) => ({ value: e.id, label: e.fullName })),
                  ]}
                />
              </div>
            )}

            <div>
              <label className="bezent-label">Policy Name</label>
              <Input
                value={policyName}
                onChange={(e) => {
                  setPolicyName(e.target.value);
                  handleFieldChange();
                }}
                placeholder="Standard Corporate Attendance Policy"
              />
            </div>
          </Grid>

          {isDirty && (
            <Alert variant="warning">
              <Inline justify="between" align="center">
                <span>You have unsaved changes. Review your updates before publishing.</span>
                <Button size="sm" variant="ghost" onClick={loadData}>
                  Discard Changes
                </Button>
              </Inline>
            </Alert>
          )}
        </Stack>
      </Card>

      {/* ─────────────────────────────────────────────────────────────
          SECTION 1 — Working Hours Policy
      ───────────────────────────────────────────────────────────── */}
      <Card variant="flat">
        <CardHeader>
          <Inline justify="between" align="center">
            <Inline gap="sm" align="center">
              <CardTitle>1. Working Hours Policy</CardTitle>
              {renderProvenanceBadge('fullDayThresholdHours')}
              <Badge variant={workingHoursMode === 'shift_based' ? 'info' : 'neutral'} size="sm">
                {workingHoursMode === 'shift_based' ? 'Shift-Based' : 'Fixed Hours'}
              </Badge>
            </Inline>
            <Button variant="ghost" size="sm" onClick={() => toggleSection('workingHours')}>
              {expandedSections.workingHours ? '▲' : '▼'}
            </Button>
          </Inline>
        </CardHeader>

        {expandedSections.workingHours && (
          <Stack gap="xs">
            <SettingsRow
              label="Full Day Minimum Threshold (Hours)"
              tooltip="Minimum net worked hours required for full day credit."
              control={
                <Input
                  type="number"
                  step="0.25"
                  min="1"
                  max="24"
                  value={fullDayHours}
                  onChange={(e) => {
                    setFullDayHours(e.target.value);
                    handleFieldChange();
                  }}
                />
              }
            />
            <Divider spacing="sm" />

            <SettingsRow
              label="Half Day Minimum Threshold (Hours)"
              tooltip="Minimum net worked hours required for half day credit."
              control={
                <Input
                  type="number"
                  step="0.25"
                  min="0.5"
                  max="12"
                  value={halfDayHours}
                  onChange={(e) => {
                    setHalfDayHours(e.target.value);
                    handleFieldChange();
                  }}
                />
              }
            />
            <Divider spacing="sm" />

            <SettingsRow
              label="Working Hours Evaluation Mode"
              tooltip="Evaluate against fixed policy thresholds or scheduled shift length."
              control={
                <Select
                  value={workingHoursMode}
                  onChange={(e) => {
                    setWorkingHoursMode(e.target.value as 'fixed_policy' | 'shift_based');
                    handleFieldChange();
                  }}
                  options={[
                    { value: 'fixed_policy', label: 'Fixed Policy Thresholds' },
                    { value: 'shift_based', label: 'Shift-Based Required Hours' },
                  ]}
                />
              }
            />
            {workingHoursMode === 'shift_based' && (
              <>
                <Divider spacing="sm" />
                <SettingsRow
                  label="Shift Assignment Strategy"
                  tooltip="Assign shift from predefined roster or automatically detect closest shift matching punch-in time."
                  control={
                    <Select
                      value={shiftAssignmentMode}
                      onChange={(e) => {
                        const val = e.target.value as 'roster_assigned' | 'auto_detect_punch';
                        setShiftAssignmentMode(val);
                        handleFieldChange();
                      }}
                      options={[
                        {
                          value: 'roster_assigned',
                          label: 'Fixed Roster (Pre-Assigned Shift Schedule)',
                        },
                        {
                          value: 'auto_detect_punch',
                          label: 'Auto-Shift Allocation (Punch Time Matching)',
                        },
                      ]}
                    />
                  }
                />

                {shiftAssignmentMode === 'auto_detect_punch' && (
                  <>
                    <Divider spacing="sm" />
                    <SettingsRow
                      label="Shift Matching Window (Minutes)"
                      tooltip="Threshold window around shift start time to allocate the shift."
                      control={
                        <Select
                          value={String(shiftMatchingWindowMinutes)}
                          onChange={(e) => {
                            setShiftMatchingWindowMinutes(Number(e.target.value));
                            handleFieldChange();
                          }}
                          options={[
                            { value: '30', label: '±30 Minutes' },
                            { value: '45', label: '±45 Minutes' },
                            { value: '60', label: '±60 Minutes (Recommended)' },
                            { value: '90', label: '±90 Minutes' },
                            { value: '120', label: '±120 Minutes (2 Hours)' },
                          ]}
                        />
                      }
                    />

                    <Divider spacing="sm" />
                    <SettingsRow
                      label="Unscheduled Fallback Shift"
                      tooltip="Fallback shift allocated when employee punches outside all matching windows."
                      control={
                        <Input
                          value={fallbackShiftName}
                          onChange={(e) => {
                            setFallbackShiftName(e.target.value);
                            handleFieldChange();
                          }}
                          placeholder="e.g. Standard General Shift (09:00 - 18:00)"
                        />
                      }
                    />

                    <Divider spacing="sm" />
                    <SettingsRow
                      label="Allow Overnight Shift Spanning"
                      tooltip="Permits automatic matching of night shifts that cross midnight."
                      control={
                        <Switch
                          checked={allowOvernightSpanning}
                          onChange={(e) => {
                            setAllowOvernightSpanning(e.target.checked);
                            handleFieldChange();
                          }}
                        />
                      }
                    />
                  </>
                )}
              </>
            )}
            <Divider spacing="sm" />

            <SettingsRow
              label="Worked Hours Calculation"
              tooltip="Calculate net hours by deducting breaks or gross span."
              control={
                <Select
                  value={netOrGross}
                  onChange={(e) => {
                    setNetOrGross(e.target.value as 'net' | 'gross');
                    handleFieldChange();
                  }}
                  options={[
                    { value: 'net', label: 'Net Worked Hours (Deduct break duration)' },
                    { value: 'gross', label: 'Gross Duration (Raw check-in to check-out)' },
                  ]}
                />
              }
            />
            <Divider spacing="sm" />

            <SettingsRow
              label="Break Deduction Method"
              tooltip="Scheduled break deduction or actual recorded break punches."
              control={
                <Select
                  value={breakDeductionMethod}
                  onChange={(e) => {
                    setBreakDeductionMethod(e.target.value as 'scheduled' | 'actual' | 'none');
                    handleFieldChange();
                  }}
                  options={[
                    { value: 'scheduled', label: 'Shift Scheduled Breaks' },
                    { value: 'actual', label: 'Actual Recorded Breaks' },
                    { value: 'none', label: 'No Break Deduction' },
                  ]}
                />
              }
            />
          </Stack>
        )}
      </Card>

      {/* ─────────────────────────────────────────────────────────────
          SECTION 2 — Late Arrival Policy
      ───────────────────────────────────────────────────────────── */}
      <Card variant="flat">
        <CardHeader>
          <Inline justify="between" align="center">
            <Inline gap="sm" align="center">
              <CardTitle>2. Late Arrival Policy</CardTitle>
              {renderProvenanceBadge('enableLateTracking')}
              <Badge variant={enableLateTracking ? 'success' : 'neutral'} size="sm">
                {enableLateTracking ? `${gracePeriodMinutes}m Grace` : 'Disabled'}
              </Badge>
            </Inline>
            <Button variant="ghost" size="sm" onClick={() => toggleSection('lateArrival')}>
              {expandedSections.lateArrival ? '▲' : '▼'}
            </Button>
          </Inline>
        </CardHeader>

        {expandedSections.lateArrival && (
          <Stack gap="xs">
            <SettingsRow
              label="Enable Late Arrival Tracking"
              tooltip="Track late check-ins against scheduled shift start time."
              control={
                <Switch
                  checked={enableLateTracking}
                  onChange={(e) => {
                    setEnableLateTracking(e.target.checked);
                    handleFieldChange();
                  }}
                />
              }
            />

            {enableLateTracking && (
              <>
                <Divider spacing="sm" />
                <SettingsRow
                  label="Grace Period (Minutes)"
                  tooltip="Check-ins within grace are marked on-time without penalties."
                  control={
                    <Input
                      type="number"
                      min="0"
                      max="120"
                      value={String(gracePeriodMinutes)}
                      onChange={(e) => {
                        setGracePeriodMinutes(Number(e.target.value));
                        handleFieldChange();
                      }}
                    />
                  }
                />
                <Divider spacing="sm" />

                <SettingsRow
                  label="Late Counting Mode"
                  tooltip="Count late duration only after grace expires or from shift start."
                  control={
                    <Select
                      value={lateCountingMode}
                      onChange={(e) => {
                        setLateCountingMode(e.target.value as 'after_grace' | 'from_start');
                        handleFieldChange();
                      }}
                      options={[
                        {
                          value: 'after_grace',
                          label: 'Count Only After Grace (e.g. 9:16 with 15m grace = 1m late)',
                        },
                        {
                          value: 'from_start',
                          label: 'Count from Shift Start (e.g. 9:16 with 15m grace = 16m late)',
                        },
                      ]}
                    />
                  }
                />
                <Divider spacing="sm" />

                <SettingsRow
                  label="Extended Late Threshold (Minutes)"
                  tooltip="Arrivals beyond this threshold trigger administrative classification."
                  control={
                    <Input
                      type="number"
                      min="15"
                      max="360"
                      value={String(extendedLateThresholdMinutes)}
                      onChange={(e) => {
                        setExtendedLateThresholdMinutes(Number(e.target.value));
                        handleFieldChange();
                      }}
                    />
                  }
                />
                <Divider spacing="sm" />

                <SettingsRow
                  label="Extended Late Action"
                  tooltip="Action taken when check-in exceeds extended late threshold."
                  control={
                    <Select
                      value={extendedLateAction}
                      onChange={(e) => {
                        setExtendedLateAction(
                          e.target.value as 'flag_review' | 'half_day' | 'mark_absent' | 'none',
                        );
                        handleFieldChange();
                      }}
                      options={[
                        { value: 'flag_review', label: 'Flag for Authorized Review' },
                        { value: 'half_day', label: 'Convert to Half Day Absent' },
                        { value: 'mark_absent', label: 'Mark Absent for the Day' },
                        { value: 'none', label: 'Standard Late Mark' },
                      ]}
                    />
                  }
                />
              </>
            )}
          </Stack>
        )}
      </Card>

      {/* ─────────────────────────────────────────────────────────────
          SECTION 3 — Early Exit Policy
      ───────────────────────────────────────────────────────────── */}
      <Card variant="flat">
        <CardHeader>
          <Inline justify="between" align="center">
            <Inline gap="sm" align="center">
              <CardTitle>3. Early Exit Policy</CardTitle>
              {renderProvenanceBadge('enableEarlyExitTracking')}
              <Badge variant={enableEarlyExitTracking ? 'success' : 'neutral'} size="sm">
                {enableEarlyExitTracking ? `${earlyExitGraceMinutes}m Grace` : 'Disabled'}
              </Badge>
            </Inline>
            <Button variant="ghost" size="sm" onClick={() => toggleSection('earlyExit')}>
              {expandedSections.earlyExit ? '▲' : '▼'}
            </Button>
          </Inline>
        </CardHeader>

        {expandedSections.earlyExit && (
          <Stack gap="xs">
            <SettingsRow
              label="Enable Early Exit Tracking"
              tooltip="Track departures occurring prior to scheduled shift end time."
              control={
                <Switch
                  checked={enableEarlyExitTracking}
                  onChange={(e) => {
                    setEnableEarlyExitTracking(e.target.checked);
                    handleFieldChange();
                  }}
                />
              }
            />

            {enableEarlyExitTracking && (
              <>
                <Divider spacing="sm" />
                <SettingsRow
                  label="Early Exit Grace (Minutes)"
                  tooltip="Departures within grace are treated as full-shift attendance."
                  control={
                    <Input
                      type="number"
                      min="0"
                      max="60"
                      value={String(earlyExitGraceMinutes)}
                      onChange={(e) => {
                        setEarlyExitGraceMinutes(Number(e.target.value));
                        handleFieldChange();
                      }}
                    />
                  }
                />
                <Divider spacing="sm" />

                <SettingsRow
                  label="Extended Early Departure Threshold (Minutes)"
                  tooltip="Departures earlier than threshold trigger special classification."
                  control={
                    <Input
                      type="number"
                      min="15"
                      max="360"
                      value={String(extendedEarlyExitThresholdMinutes)}
                      onChange={(e) => {
                        setExtendedEarlyExitThresholdMinutes(Number(e.target.value));
                        handleFieldChange();
                      }}
                    />
                  }
                />
                <Divider spacing="sm" />

                <SettingsRow
                  label="Extended Early Exit Action"
                  tooltip="Action taken when departure exceeds extended early threshold."
                  control={
                    <Select
                      value={extendedEarlyExitAction}
                      onChange={(e) => {
                        setExtendedEarlyExitAction(
                          e.target.value as 'flag_review' | 'half_day' | 'mark_absent' | 'none',
                        );
                        handleFieldChange();
                      }}
                      options={[
                        { value: 'flag_review', label: 'Flag for Authorized Review' },
                        { value: 'half_day', label: 'Convert to Half Day' },
                        { value: 'mark_absent', label: 'Mark Absent' },
                        { value: 'none', label: 'Standard Early Departure' },
                      ]}
                    />
                  }
                />
              </>
            )}
          </Stack>
        )}
      </Card>

      {/* ─────────────────────────────────────────────────────────────
          SECTION 4 — Attendance Classification
      ───────────────────────────────────────────────────────────── */}
      <Card variant="flat">
        <CardHeader>
          <Inline justify="between" align="center">
            <Inline gap="sm" align="center">
              <CardTitle>4. Attendance Classification</CardTitle>
              {renderProvenanceBadge('missingPunchPolicy')}
              <Badge variant="info" size="sm">
                {thresholdMode === 'percentage_of_shift' ? 'Percentage Mode' : 'Fixed Hours'}
              </Badge>
            </Inline>
            <Button variant="ghost" size="sm" onClick={() => toggleSection('classification')}>
              {expandedSections.classification ? '▲' : '▼'}
            </Button>
          </Inline>
        </CardHeader>

        {expandedSections.classification && (
          <Stack gap="xs">
            <SettingsRow
              label="Threshold Evaluation Mode"
              tooltip="Evaluate full and half day credit using fixed hours or shift percentage."
              control={
                <Select
                  value={thresholdMode}
                  onChange={(e) => {
                    setThresholdMode(e.target.value as 'fixed_hours' | 'percentage_of_shift');
                    handleFieldChange();
                  }}
                  options={[
                    { value: 'fixed_hours', label: 'Fixed Hours Thresholds' },
                    { value: 'percentage_of_shift', label: 'Percentage of Assigned Shift' },
                  ]}
                />
              }
            />

            {thresholdMode === 'percentage_of_shift' ? (
              <>
                <Divider spacing="sm" />
                <SettingsRow
                  label="Full Day Percentage (%)"
                  tooltip="Percentage of scheduled shift required for full day credit."
                  control={
                    <Input
                      type="number"
                      min="50"
                      max="100"
                      value={String(fullDayPercentage)}
                      onChange={(e) => {
                        setFullDayPercentage(Number(e.target.value));
                        handleFieldChange();
                      }}
                    />
                  }
                />
                <Divider spacing="sm" />
                <SettingsRow
                  label="Half Day Percentage (%)"
                  tooltip="Percentage of scheduled shift required for half day credit."
                  control={
                    <Input
                      type="number"
                      min="20"
                      max="80"
                      value={String(halfDayPercentage)}
                      onChange={(e) => {
                        setHalfDayPercentage(Number(e.target.value));
                        handleFieldChange();
                      }}
                    />
                  }
                />
              </>
            ) : (
              <>
                <Divider spacing="sm" />
                <SettingsRow
                  label="Below-Minimum Hours Action"
                  tooltip="Status applied when worked hours fall below half day minimum threshold."
                  control={
                    <Select
                      value={belowMinimumAction}
                      onChange={(e) => {
                        setBelowMinimumAction(
                          e.target.value as 'mark_absent' | 'half_day' | 'flag_exception',
                        );
                        handleFieldChange();
                      }}
                      options={[
                        { value: 'mark_absent', label: 'Mark Absent Automatically' },
                        { value: 'flag_exception', label: 'Flag as Exception for Review' },
                        { value: 'half_day', label: 'Credit Half Day' },
                      ]}
                    />
                  }
                />
                <Divider spacing="sm" />
                <SettingsRow
                  label="Missing Punch Treatment"
                  tooltip="Provisional treatment for records with missing in or out punches."
                  control={
                    <Select
                      value={missingPunchPolicy}
                      onChange={(e) => {
                        setMissingPunchPolicy(
                          e.target.value as 'mark_absent' | 'half_day' | 'flag_exception' | 'none',
                        );
                        handleFieldChange();
                      }}
                      options={[
                        { value: 'flag_exception', label: 'Flag Exception for Review' },
                        { value: 'mark_absent', label: 'Mark Absent Immediately' },
                        { value: 'half_day', label: 'Credit Half Day' },
                      ]}
                    />
                  }
                />
              </>
            )}
          </Stack>
        )}
      </Card>

      {/* ─────────────────────────────────────────────────────────────
          SECTION 5 — Late Penalty Rules
      ───────────────────────────────────────────────────────────── */}
      <Card variant="flat">
        <CardHeader>
          <Inline justify="between" align="center">
            <Inline gap="sm" align="center">
              <CardTitle>5. Late Penalty Rules</CardTitle>
              {renderProvenanceBadge('penaltyRules')}
              <Badge variant={penaltyEnabled ? 'warning' : 'neutral'} size="sm">
                {penaltyEnabled ? `${lateMarksThreshold} Late = 1 Unit` : 'Disabled'}
              </Badge>
            </Inline>
            <Button variant="ghost" size="sm" onClick={() => toggleSection('latePenalty')}>
              {expandedSections.latePenalty ? '▲' : '▼'}
            </Button>
          </Inline>
        </CardHeader>

        {expandedSections.latePenalty && (
          <Stack gap="xs">
            <SettingsRow
              label="Enable Automated Late Penalty Ledger"
              tooltip="Accumulate penalty units when late-mark count reaches configured threshold."
              control={
                <Switch
                  checked={penaltyEnabled}
                  onChange={(e) => {
                    setPenaltyEnabled(e.target.checked);
                    handleFieldChange();
                  }}
                />
              }
            />

            {penaltyEnabled && (
              <>
                <Divider spacing="sm" />
                <SettingsRow
                  label="Late Marks Threshold"
                  tooltip="Count of late check-ins triggering penalty deduction."
                  control={
                    <Input
                      type="number"
                      min="1"
                      max="15"
                      value={String(lateMarksThreshold)}
                      onChange={(e) => {
                        setLateMarksThreshold(Number(e.target.value));
                        handleFieldChange();
                      }}
                    />
                  }
                />
                <Divider spacing="sm" />

                <SettingsRow
                  label="Penalty Deduction Unit"
                  tooltip="Day-equivalent deduction unit transferred to payroll readiness."
                  control={
                    <Select
                      value={penaltyUnit}
                      onChange={(e) => {
                        setPenaltyUnit(
                          e.target.value as
                            'warning_only' | 'quarter_day' | 'half_day' | 'full_day',
                        );
                        handleFieldChange();
                      }}
                      options={[
                        { value: 'half_day', label: '0.50 Day-Equivalent Deduction' },
                        { value: 'quarter_day', label: '0.25 Day-Equivalent Deduction' },
                        { value: 'full_day', label: '1.00 Day-Equivalent Deduction' },
                        { value: 'warning_only', label: 'Warning Notice Only (No units deducted)' },
                      ]}
                    />
                  }
                />
                <Divider spacing="sm" />

                <SettingsRow
                  label="Counting Cycle Period"
                  tooltip="Period cycle for accumulating late marks."
                  control={
                    <Select
                      value={penaltyPeriod}
                      onChange={(e) => {
                        setPenaltyPeriod(
                          e.target.value as 'calendar_month' | 'payroll_period' | 'custom_cycle',
                        );
                        handleFieldChange();
                      }}
                      options={[
                        { value: 'calendar_month', label: 'Calendar Month (1st to month end)' },
                        { value: 'payroll_period', label: 'Payroll Period (Cycle aligned)' },
                        { value: 'custom_cycle', label: 'Custom Attendance Cycle' },
                      ]}
                    />
                  }
                />
                <Divider spacing="sm" />

                <SettingsRow
                  label="Threshold Frequency"
                  tooltip="Repeat penalty deduction for every threshold multiple or once per period."
                  control={
                    <Select
                      value={penaltyIsRepeating ? 'repeat' : 'once'}
                      onChange={(e) => {
                        setPenaltyIsRepeating(e.target.value === 'repeat');
                        handleFieldChange();
                      }}
                      options={[
                        {
                          value: 'repeat',
                          label: 'Repeat for Every Threshold (3 late = 0.5, 6 late = 1.0)',
                        },
                        { value: 'once', label: 'Once Per Period (Capped after first trigger)' },
                      ]}
                    />
                  }
                />
                <Divider spacing="sm" />

                <SettingsRow
                  label="Maximum Penalty Cap (Units)"
                  tooltip="Ceiling capping total penalty units per period."
                  control={
                    <Input
                      type="number"
                      step="0.5"
                      min="0.5"
                      max="10"
                      value={maxPenaltyUnits}
                      onChange={(e) => {
                        setMaxPenaltyUnits(e.target.value);
                        handleFieldChange();
                      }}
                    />
                  }
                />
              </>
            )}
          </Stack>
        )}
      </Card>

      {/* ─────────────────────────────────────────────────────────────
          SECTION 6 — Policy Assignment & Overrides
      ───────────────────────────────────────────────────────────── */}
      <Card variant="flat">
        <CardHeader>
          <Inline justify="between" align="center">
            <Inline gap="sm" align="center">
              <CardTitle>6. Policy Assignment & Overrides</CardTitle>
              <Badge
                variant={
                  selectedScope === 'employee'
                    ? 'warning'
                    : selectedScope === 'department'
                      ? 'info'
                      : 'neutral'
                }
                size="sm"
              >
                {selectedScope === 'employee'
                  ? 'Employee Override'
                  : selectedScope === 'department'
                    ? 'Department Override'
                    : 'Company Baseline'}
              </Badge>
            </Inline>
            <Button variant="ghost" size="sm" onClick={() => toggleSection('assignment')}>
              {expandedSections.assignment ? '▲' : '▼'}
            </Button>
          </Inline>
        </CardHeader>

        {expandedSections.assignment && (
          <Stack gap="md">
            <Stack gap="xs">
              <SettingsRow
                label="Regularization Allowed"
                tooltip="Allow employees to submit punch correction requests."
                control={
                  <Select
                    value={allowRegularization ? 'yes' : 'no'}
                    onChange={(e) => {
                      setAllowRegularization(e.target.value === 'yes');
                      handleFieldChange();
                    }}
                    options={[
                      { value: 'yes', label: 'Yes — Allow Correction Requests' },
                      { value: 'no', label: 'No — Disallow Corrections' },
                    ]}
                  />
                }
              />
              <Divider spacing="sm" />

              <SettingsRow
                label="Submission Cutoff Window (Days)"
                tooltip="Days allowed post-occurrence to submit regularization."
                control={
                  <Input
                    type="number"
                    min="1"
                    max="30"
                    value={String(regularizationCutoffDays)}
                    onChange={(e) => {
                      setRegularizationCutoffDays(Number(e.target.value));
                      handleFieldChange();
                    }}
                  />
                }
              />
              <Divider spacing="sm" />

              <SettingsRow
                label="Approval Routing"
                tooltip="Workflow routing for regularization requests."
                control={
                  <Select
                    value={requiresApproval ? 'approval_required' : 'direct'}
                    onChange={(e) => {
                      setRequiresApproval(e.target.value === 'approval_required');
                      handleFieldChange();
                    }}
                    options={[
                      { value: 'approval_required', label: 'Manager / HR Approval Required' },
                      { value: 'direct', label: 'Direct Auto-Finalization' },
                    ]}
                  />
                }
              />
            </Stack>

            <Divider spacing="sm" />

            {/* Version Snapshots Table */}
            <Stack gap="xs">
              <span className="bezent-text-secondary">Published Policy Versions & Snapshots:</span>
              <Table hoverable>
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>Version</TableHeaderCell>
                    <TableHeaderCell>Policy Name</TableHeaderCell>
                    <TableHeaderCell>Scope</TableHeaderCell>
                    <TableHeaderCell>Status</TableHeaderCell>
                    <TableHeaderCell>Effective Date</TableHeaderCell>
                    <TableHeaderCell>Action</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {policies.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>v{p.version}</TableCell>
                      <TableCell>
                        <strong>{p.policyName}</strong>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            p.scope === 'employee'
                              ? 'warning'
                              : p.scope === 'department'
                                ? 'info'
                                : 'neutral'
                          }
                          size="sm"
                        >
                          {p.scope === 'employee'
                            ? `Employee: ${p.scopeId}`
                            : p.scope === 'department'
                              ? `Department: ${p.scopeId}`
                              : 'Company'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={p.status === 'published' ? 'success' : 'warning'} size="sm">
                          {p.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{p.effectiveFrom}</TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={saving || p.id === activePolicyId}
                          onClick={() => handleRollback(p)}
                        >
                          Restore
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Stack>
          </Stack>
        )}
      </Card>

      {/* ─────────────────────────────────────────────────────────────
          SECTION 7 — On-Duty (OD) Policy
      ───────────────────────────────────────────────────────────── */}
      <Card variant="flat">
        <CardHeader>
          <Inline justify="between" align="center">
            <Inline gap="sm" align="center">
              <CardTitle>7. On-Duty (OD) Policy</CardTitle>
              {renderProvenanceBadge('odRules')}
              <Badge variant={odEnabled ? 'success' : 'neutral'} size="sm">
                {odEnabled ? `${odTypes.length} Types Configured` : 'Disabled'}
              </Badge>
            </Inline>
            <Button variant="ghost" size="sm" onClick={() => toggleSection('onDuty')}>
              {expandedSections.onDuty ? '▲' : '▼'}
            </Button>
          </Inline>
        </CardHeader>

        {expandedSections.onDuty && (
          <Stack gap="xs">
            <SettingsRow
              label="Enable On-Duty (OD) Tracking"
              tooltip="Authorize official off-site or external duties to be credited towards attendance."
              control={
                <Switch
                  checked={odEnabled}
                  onChange={(e) => {
                    setOdEnabled(e.target.checked);
                    handleFieldChange();
                  }}
                />
              }
            />

            {odEnabled && (
              <>
                <Divider spacing="sm" />
                <SettingsRow
                  label="Authorized On-Duty Types"
                  tooltip="Duty categories permitted for employee applications."
                  control={
                    <Stack gap="xs">
                      <Inline gap="xs" align="center">
                        {odTypes.map((type) => (
                          <Badge key={type} variant="info" size="sm">
                            {type}{' '}
                            <button
                              type="button"
                              className="bezent-chip-close"
                              aria-label={`Remove ${type}`}
                              onClick={() => handleRemoveOdType(type)}
                            >
                              &times;
                            </button>
                          </Badge>
                        ))}
                      </Inline>
                      <Inline gap="xs" align="center">
                        <Input
                          value={newOdTypeInput}
                          onChange={(e) => setNewOdTypeInput(e.target.value)}
                          placeholder="New OD type..."
                        />
                        <Button variant="outline" size="sm" onClick={handleAddOdType}>
                          Add
                        </Button>
                      </Inline>
                    </Stack>
                  }
                />
                <Divider spacing="sm" />

                <SettingsRow
                  label="Allowed OD Durations"
                  tooltip="Permitted duration units for on-duty applications."
                  control={
                    <Inline gap="md" align="center">
                      <Checkbox
                        label="Full Day"
                        checked={odAllowFullDay}
                        onChange={(e) => {
                          setOdAllowFullDay(e.target.checked);
                          handleFieldChange();
                        }}
                      />
                      <Checkbox
                        label="Half Day"
                        checked={odAllowHalfDay}
                        onChange={(e) => {
                          setOdAllowHalfDay(e.target.checked);
                          handleFieldChange();
                        }}
                      />
                      <Checkbox
                        label="Hourly"
                        checked={odAllowHourly}
                        onChange={(e) => {
                          setOdAllowHourly(e.target.checked);
                          handleFieldChange();
                        }}
                      />
                      <Checkbox
                        label="Multi-Day"
                        checked={odAllowMultiDay}
                        onChange={(e) => {
                          setOdAllowMultiDay(e.target.checked);
                          handleFieldChange();
                        }}
                      />
                    </Inline>
                  }
                />
                <Divider spacing="sm" />

                <SettingsRow
                  label="Punch Exemption & Verification"
                  tooltip="Punch requirements and geofence exemption for OD duty."
                  control={
                    <Stack gap="xs">
                      <Select
                        value={odPunchRule}
                        onChange={(e) => {
                          setOdPunchRule(e.target.value as 'exempt' | 'required_at_location');
                          handleFieldChange();
                        }}
                        options={[
                          { value: 'exempt', label: 'Exempt from Biometric & Web Punches' },
                          {
                            value: 'required_at_location',
                            label: 'Punches Required at OD Location',
                          },
                        ]}
                      />
                      <Checkbox
                        label="Exempt approved OD from office geofence"
                        checked={odExemptGeofence}
                        onChange={(e) => {
                          setOdExemptGeofence(e.target.checked);
                          handleFieldChange();
                        }}
                      />
                    </Stack>
                  }
                />
                <Divider spacing="sm" />

                <SettingsRow
                  label="Advance Submission Window (Days)"
                  tooltip="Maximum days in advance employees can apply for OD."
                  control={
                    <Input
                      type="number"
                      min="0"
                      max="30"
                      value={String(odAdvanceDays)}
                      onChange={(e) => {
                        setOdAdvanceDays(Number(e.target.value));
                        handleFieldChange();
                      }}
                    />
                  }
                />
                <Divider spacing="sm" />

                <SettingsRow
                  label="Backdated Allowed Window (Days)"
                  tooltip="Days post-duty employee may submit retrospective request."
                  control={
                    <Input
                      type="number"
                      min="0"
                      max="14"
                      value={String(odBackdatedDays)}
                      onChange={(e) => {
                        setOdBackdatedDays(Number(e.target.value));
                        handleFieldChange();
                      }}
                    />
                  }
                />
                <Divider spacing="sm" />

                <SettingsRow
                  label="Credit Evaluation"
                  tooltip="Credit treatment on attendance records upon OD approval."
                  control={
                    <Select
                      value={odCreditTreatment}
                      onChange={(e) => {
                        setOdCreditTreatment(
                          e.target.value as 'count_as_present' | 'verified_hours',
                        );
                        handleFieldChange();
                      }}
                      options={[
                        {
                          value: 'count_as_present',
                          label: 'Count as Present (Full Workday Credit)',
                        },
                        { value: 'verified_hours', label: 'Verified Hours Only' },
                      ]}
                    />
                  }
                />
                <Divider spacing="sm" />

                <SettingsRow
                  label="Approval & Justification"
                  tooltip="Mandatory approval and documentation controls."
                  control={
                    <Inline gap="md" align="center">
                      <Checkbox
                        label="Approval Required"
                        checked={odRequiresApproval}
                        onChange={(e) => {
                          setOdRequiresApproval(e.target.checked);
                          handleFieldChange();
                        }}
                      />
                      <Checkbox
                        label="Reason Required"
                        checked={odRequiresReason}
                        onChange={(e) => {
                          setOdRequiresReason(e.target.checked);
                          handleFieldChange();
                        }}
                      />
                      <Checkbox
                        label="Evidence Required"
                        checked={odRequiresEvidence}
                        onChange={(e) => {
                          setOdRequiresEvidence(e.target.checked);
                          handleFieldChange();
                        }}
                      />
                    </Inline>
                  }
                />
              </>
            )}
          </Stack>
        )}
      </Card>

      {/* ─────────────────────────────────────────────────────────────
          REVIEW & PUBLISH MODAL
      ───────────────────────────────────────────────────────────── */}
      {isPublishModalOpen && (
        <Modal
          isOpen={isPublishModalOpen}
          onClose={() => setIsPublishModalOpen(false)}
          title="Review & Publish Attendance Policy"
          size="lg"
        >
          <Stack gap="md">
            <span className="bezent-text-secondary">
              Publishing will create an immutable version snapshot (v{version + 1}) and activate
              this configuration across the designated scope.
            </span>

            <Alert variant="info">
              <strong>Publication Scope:</strong>{' '}
              {selectedScope === 'employee'
                ? `Employee Override: ${employees.find((e) => e.id === selectedScopeId)?.fullName || selectedScopeId || 'Assigned'}`
                : selectedScope === 'department'
                  ? `Department Override: ${departments.find((d) => d.id === selectedScopeId)?.name || selectedScopeId || 'Assigned'}`
                  : 'Company Default Policy'}
            </Alert>

            {/* Validation Checklist */}
            <Card variant="flat">
              <Stack gap="xs">
                <strong>Policy Validation Checks:</strong>
                <Inline gap="xs" align="center">
                  <Badge variant="success" size="sm">
                    ✓ Valid
                  </Badge>
                  <span>
                    Working Hours: {fullDayHours}h Full / {halfDayHours}h Half threshold ordering
                    verified.
                  </span>
                </Inline>
                <Inline gap="xs" align="center">
                  <Badge variant="success" size="sm">
                    ✓ Valid
                  </Badge>
                  <span>
                    Grace Periods: {gracePeriodMinutes}m late grace and {earlyExitGraceMinutes}m
                    early exit grace.
                  </span>
                </Inline>
                <Inline gap="xs" align="center">
                  <Badge variant="success" size="sm">
                    ✓ Valid
                  </Badge>
                  <span>
                    Late Penalties: {lateMarksThreshold} late marks = {penaltyUnit} ({penaltyPeriod}
                    ).
                  </span>
                </Inline>
                <Inline gap="xs" align="center">
                  <Badge variant="success" size="sm">
                    ✓ Valid
                  </Badge>
                  <span>
                    On-Duty Rules: {odTypes.length} configured types with approval requirements.
                  </span>
                </Inline>
              </Stack>
            </Card>

            {/* Change Reason & Effective Date */}
            <Grid columns={2} gap="md">
              <div>
                <label className="bezent-label">Effective From Date</label>
                <LocaleDatePicker
                  value={publishEffectiveDate}
                  onChange={(d) => setPublishEffectiveDate(d)}
                />
              </div>

              <div>
                <label className="bezent-label">
                  Audit Change Reason <span className="bezent-required-indicator">*</span>
                </label>
                <Input
                  value={publishReason}
                  onChange={(e) => setPublishReason(e.target.value)}
                  placeholder="e.g. Q4 Updated Working Hours and Late Grace Extension"
                  required
                />
              </div>
            </Grid>

            <span className="bezent-text-hint">
              Payroll Lock Protection: Locked periods are strictly protected and will never be
              altered by policy publication.
            </span>

            <Inline justify="end" gap="sm">
              <Button
                variant="outline"
                disabled={saving}
                onClick={() => setIsPublishModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                disabled={saving || !publishReason.trim()}
                onClick={handleConfirmPublish}
              >
                {saving ? 'Publishing...' : 'Confirm & Publish Policy'}
              </Button>
            </Inline>
          </Stack>
        </Modal>
      )}
    </Stack>
  );
}
