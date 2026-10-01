import { useState, useEffect, useRef, useMemo } from 'react';
import {
  FormSection,
  FormGrid,
  Input,
  Select,
  Checkbox,
  Stack,
} from '../../../../design-system/components';

import { RegistrationField, useRegistrationConfig } from '../registration/registrationConfig';
import type { RegistrationFieldConfig } from '../../settings/api/registrationSettingsApi';
import type { ResolvedFormField } from '../../settings/api/formsApi';
import { getGroupsForSection } from '../../settings/administration/forms/types';
import type { Chapter01GeneralState } from '../types/registration.types';
import { authorizedFetch } from '../../../../platform/auth';

export interface GeneralInformationProps {
  employeeId?: string;
  data?: Partial<Chapter01GeneralState>;
  onChange?: (data: Partial<Chapter01GeneralState>) => void;
}

export function GeneralInformation({
  employeeId: employeeIdProp,
  data,
  onChange,
}: GeneralInformationProps) {
  // State for all canonical general fields
  const [employeeId, setEmployeeId] = useState(data?.employeeId ?? employeeIdProp ?? '');
  const [employmentType, setEmploymentType] = useState(data?.employmentType ?? 'full_time');
  const [employmentStatus] = useState(data?.employmentStatus ?? 'pending_activation');
  const [department, setDepartment] = useState(data?.department ?? 'Engineering');
  const [team, setTeam] = useState(data?.team ?? 'Product Development');
  const [designation, setDesignation] = useState(data?.designation ?? 'Software Engineer');
  const [gradeLevel, setGradeLevel] = useState(data?.gradeLevel ?? 'L2 - Mid Level');
  const [reportingManager] = useState<string | null>(data?.reportingManager ?? 'Rakesh Kumar');
  const [organisationUnit, setOrganisationUnit] = useState(data?.organisationUnit ?? 'Technology');
  const [officeLocation, setOfficeLocation] = useState(data?.officeLocation ?? 'Chennai - Main Office');
  const [joiningDate, setJoiningDate] = useState(data?.joiningDate ?? '2026-04-01');
  const [confirmedJoiningDate, setConfirmedJoiningDate] = useState(
    data?.confirmedJoiningDate ?? '2026-07-01',
  );
  const [endDate, setEndDate] = useState(data?.endDate ?? '');
  const [sourceOfHire, setSourceOfHire] = useState(data?.sourceOfHire ?? 'direct_applicant');
  const [referralId, setReferralId] = useState(data?.referralId ?? '');
  const [referredByEmployeeId, setReferredByEmployeeId] = useState<string | null>(
    data?.referredByEmployeeId ?? null,
  );
  const [probationPeriod, setProbationPeriod] = useState(data?.probationPeriod ?? '6_months');
  const [noticePeriod, setNoticePeriod] = useState(data?.noticePeriod ?? '30_days');

  // Custom field values state for dynamic custom fields
  const [customValues, setCustomValues] = useState<Record<string, unknown>>({});

  // Sync incoming employeeIdProp if provided
  useEffect(() => {
    if (employeeIdProp && employeeIdProp !== employeeId) {
      setEmployeeId(employeeIdProp);
    }
  }, [employeeIdProp]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fixed-term type check
  const isFixedTerm = employmentType === 'contract' || employmentType === 'intern';

  const handleEmploymentTypeChange = (newType: string) => {
    setEmploymentType(newType);
    if (newType !== 'contract' && newType !== 'intern') {
      setEndDate('');
    }
  };

  const DEPARTMENT_TEAMS: Record<string, string[]> = {
    Engineering: ['Product Development', 'Frontend', 'Backend', 'QA'],
    'Human Resources': ['Talent Acquisition', 'HR Operations', 'Employee Relations'],
    Finance: ['Accounting', 'Payroll & Compliance', 'Financial Planning'],
    Operations: ['Facilities', 'IT Systems', 'Procurement'],
  };

  const handleDepartmentChange = (newDept: string) => {
    setDepartment(newDept);
    const availableTeams = DEPARTMENT_TEAMS[newDept] || ['General'];
    if (!availableTeams.includes(team)) {
      setTeam(availableTeams[0] || 'General');
    }
  };

  // Referral state
  const [resolvedReferrer, setResolvedReferrer] = useState<{
    id: string;
    name: string;
    designation?: string | null;
    department?: string | null;
  } | null>(null);
  const [referralError, setReferralError] = useState<string | null>(null);
  const [referralLoading, setReferralLoading] = useState(false);

  useEffect(() => {
    const code = referralId.trim();
    if (sourceOfHire === 'referral' && code.length >= 3) {
      setReferralLoading(true);
      setReferralError(null);
      const timer = setTimeout(() => {
        authorizedFetch(`/api/v1/hrms/employees/resolve-referral/${encodeURIComponent(code)}`)
          .then((res) => {
            if (!res.ok) throw new Error('Not found');
            return res.json();
          })
          .then((body) => {
            if (body?.data?.name) {
              setResolvedReferrer({
                id: body.data.id,
                name: body.data.name,
                designation: body.data.designationName,
                department: body.data.departmentName,
              });
              setReferredByEmployeeId(body.data.id);
              setReferralError(null);
            } else {
              setResolvedReferrer(null);
              setReferredByEmployeeId(null);
              setReferralError('Referral ID not found');
            }
          })
          .catch(() => {
            setResolvedReferrer(null);
            setReferredByEmployeeId(null);
            setReferralError('Invalid or unrecognised Referral ID');
          })
          .finally(() => {
            setReferralLoading(false);
          });
      }, 400);
      return () => clearTimeout(timer);
    } else {
      setResolvedReferrer(null);
      setReferredByEmployeeId(null);
      setReferralError(null);
      setReferralLoading(false);
    }
  }, [referralId, sourceOfHire]);

  const calculatedProbationEndDate = useMemo(() => {
    if (!joiningDate || probationPeriod === 'no_probation') return null;
    const d = new Date(joiningDate);
    if (isNaN(d.getTime())) return null;
    if (probationPeriod === '3_months') d.setMonth(d.getMonth() + 3);
    else if (probationPeriod === '6_months') d.setMonth(d.getMonth() + 6);
    else if (probationPeriod === '12_months') d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().slice(0, 10);
  }, [joiningDate, probationPeriod]);

  // Sync state back to centralized store
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    onChange?.({
      employeeId: employeeIdProp || employeeId,
      employmentType,
      employmentStatus,
      department,
      team,
      designation,
      gradeLevel,
      reportingManager,
      organisationUnit,
      officeLocation,
      joiningDate,
      confirmedJoiningDate,
      endDate,
      sourceOfHire,
      referralId,
      referredByEmployeeId,
      probationPeriod,
      noticePeriod,
    });
  }, [
    employeeIdProp,
    employeeId,
    employmentType,
    employmentStatus,
    department,
    team,
    designation,
    gradeLevel,
    reportingManager,
    organisationUnit,
    officeLocation,
    joiningDate,
    confirmedJoiningDate,
    endDate,
    sourceOfHire,
    referralId,
    referredByEmployeeId,
    probationPeriod,
    noticePeriod,
    onChange,
  ]);

  const config = useRegistrationConfig();

  // Sort and filter enabled fields for the general section
  const generalFields = useMemo(() => {
    const fields = config.fields.filter((f) => f.section === 'general' && f.enabled);
    return [...fields].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, [config.fields]);

  // Group fields using canonical Form Editor definition + company metadata
  const groups = useMemo(() => {
    return getGroupsForSection(
      'general',
      generalFields as unknown as ResolvedFormField[],
      config.metadata,
    );
  }, [generalFields, config.metadata]);

  const renderDynamicFieldInput = (field: RegistrationFieldConfig) => {
    const fType = field.type;
    const fKey = field.key;
    const val = (customValues[fKey] as string) ?? '';
    const setVal = (newVal: string) => {
      setCustomValues((prev) => ({ ...prev, [fKey]: newVal }));
    };

    switch (fType) {
      case 'dropdown':
      case 'select': {
        const opts = (field.config?.options as Array<{ value: string; label: string }>) || [];
        return (
          <Select
            id={`field-${fKey}`}
            value={val}
            onChange={(e) => setVal(e.target.value)}
            options={[{ value: '', label: `Select ${field.label}` }, ...opts]}
          />
        );
      }
      case 'checkbox':
        return (
          <Checkbox
            id={`field-${fKey}`}
            label={field.label}
            checked={Boolean(val)}
            onChange={(e) => setVal(e.target.checked ? 'true' : '')}
          />
        );
      case 'date':
        return (
          <Input
            id={`field-${fKey}`}
            type="date"
            value={val}
            onChange={(e) => setVal(e.target.value)}
          />
        );
      case 'number':
      case 'decimal':
        return (
          <Input
            id={`field-${fKey}`}
            type="number"
            placeholder={(field.config?.placeholder as string) || `Enter ${field.label}`}
            value={val}
            onChange={(e) => setVal(e.target.value)}
          />
        );
      default:
        return (
          <Input
            id={`field-${fKey}`}
            type={fType === 'email' ? 'email' : fType === 'phone' ? 'tel' : 'text'}
            placeholder={(field.config?.placeholder as string) || `Enter ${field.label}`}
            value={val}
            onChange={(e) => setVal(e.target.value)}
          />
        );
    }
  };

  const renderField = (field: RegistrationFieldConfig) => {
    const { key, width, config: fConfig } = field;
    const isFullWidth = width === 'full';
    const span = isFullWidth ? 'full' : undefined;
    const configuredPlaceholder = (fConfig?.placeholder as string) || undefined;
    const configuredOptions = Array.isArray(fConfig?.options)
      ? (fConfig.options as Array<{ value: string; label: string }>)
      : undefined;

    switch (key) {
      case 'general.employeeId':
        return (
          <RegistrationField
            key={key}
            fieldKey={key}
            value={employeeId}
            htmlFor="reg-employee-id"
            span={span}
            helperText={field.description ?? 'System-assigned unique ID (auto-generated by backend)'}
          >
            <Input
              id="reg-employee-id"
              value={employeeId}
              readOnly
              disabled
              placeholder={configuredPlaceholder || 'Generating...'}
            />
          </RegistrationField>
        );

      case 'general.employmentType':
        return (
          <RegistrationField
            key={key}
            fieldKey={key}
            value={employmentType}
            htmlFor="reg-employment-type"
            span={span}
          >
            <Select
              id="reg-employment-type"
              value={employmentType}
              onChange={(e) => handleEmploymentTypeChange(e.target.value)}
              options={
                configuredOptions || [
                  { value: 'full_time', label: 'Full Time' },
                  { value: 'part_time', label: 'Part Time' },
                  { value: 'contract', label: 'Contract (Fixed Term)' },
                  { value: 'intern', label: 'Intern (Fixed Term)' },
                  { value: 'other', label: 'Other' },
                ]
              }
            />
          </RegistrationField>
        );

      case 'general.employmentStatus':
        return (
          <RegistrationField
            key={key}
            fieldKey={key}
            value={employmentStatus}
            htmlFor="reg-employment-status"
            span={span}
            helperText={field.description ?? 'System-controlled: Pending Activation'}
          >
            <Input
              id="reg-employment-status"
              value="Pending Activation"
              readOnly
              disabled
              placeholder={configuredPlaceholder}
            />
          </RegistrationField>
        );

      case 'general.department':
        return (
          <RegistrationField
            key={key}
            fieldKey={key}
            value={department}
            htmlFor="reg-department"
            span={span}
          >
            <Select
              id="reg-department"
              value={department}
              onChange={(e) => handleDepartmentChange(e.target.value)}
              options={
                configuredOptions || [
                  { value: 'Engineering', label: 'Engineering' },
                  { value: 'Human Resources', label: 'Human Resources' },
                  { value: 'Finance', label: 'Finance' },
                  { value: 'Operations', label: 'Operations' },
                  { value: 'other', label: 'Other' },
                ]
              }
            />
          </RegistrationField>
        );

      case 'general.team':
        return (
          <RegistrationField
            key={key}
            fieldKey={key}
            value={team}
            htmlFor="reg-team"
            span={span}
          >
            <Select
              id="reg-team"
              value={team}
              onChange={(e) => setTeam(e.target.value)}
              options={
                configuredOptions ||
                (DEPARTMENT_TEAMS[department] || ['General', 'other']).map((t) => ({
                  value: t,
                  label: t,
                }))
              }
            />
          </RegistrationField>
        );

      case 'general.designation':
        return (
          <RegistrationField
            key={key}
            fieldKey={key}
            value={designation}
            htmlFor="reg-designation"
            span={span}
          >
            <Select
              id="reg-designation"
              value={designation}
              onChange={(e) => setDesignation(e.target.value)}
              options={
                configuredOptions || [
                  { value: 'Software Engineer', label: 'Software Engineer' },
                  { value: 'Financial Analyst', label: 'Financial Analyst' },
                  { value: 'Senior HR Specialist', label: 'Senior HR Specialist' },
                  { value: 'Product Manager', label: 'Product Manager' },
                  { value: 'other', label: 'Other' },
                ]
              }
            />
          </RegistrationField>
        );

      case 'general.gradeLevel':
        return (
          <RegistrationField
            key={key}
            fieldKey={key}
            value={gradeLevel}
            htmlFor="reg-grade-level"
            span={span}
          >
            <Select
              id="reg-grade-level"
              value={gradeLevel}
              onChange={(e) => setGradeLevel(e.target.value)}
              options={
                configuredOptions || [
                  { value: 'L1 - Entry Level', label: 'L1 - Entry Level' },
                  { value: 'L2 - Mid Level', label: 'L2 - Mid Level' },
                  { value: 'L3 - Senior Level', label: 'L3 - Senior Level' },
                  { value: 'L4 - Lead', label: 'L4 - Lead' },
                  { value: 'L5 - Executive', label: 'L5 - Executive' },
                  { value: 'other', label: 'Other' },
                ]
              }
            />
          </RegistrationField>
        );

      case 'general.reportingManager':
        return (
          <RegistrationField
            key={key}
            fieldKey={key}
            value={reportingManager}
            htmlFor="reg-reporting-manager"
            span={span}
            disabled
          >
            <Input
              id="reg-reporting-manager"
              value={reportingManager || ''}
              placeholder={configuredPlaceholder || 'Select Manager...'}
              disabled
            />
          </RegistrationField>
        );

      case 'general.organisationUnit':
        return (
          <RegistrationField
            key={key}
            fieldKey={key}
            value={organisationUnit}
            htmlFor="reg-org-unit"
            span={span}
          >
            <Select
              id="reg-org-unit"
              value={organisationUnit}
              onChange={(e) => setOrganisationUnit(e.target.value)}
              options={
                configuredOptions || [
                  { value: 'Technology', label: 'Technology' },
                  { value: 'Operations', label: 'Operations' },
                  { value: 'Corporate', label: 'Corporate' },
                  { value: 'other', label: 'Other' },
                ]
              }
            />
          </RegistrationField>
        );

      case 'general.officeLocation':
        return (
          <RegistrationField
            key={key}
            fieldKey={key}
            value={officeLocation}
            htmlFor="reg-office-location"
            span={span}
          >
            <Select
              id="reg-office-location"
              value={officeLocation}
              onChange={(e) => setOfficeLocation(e.target.value)}
              options={
                configuredOptions || [
                  { value: 'Chennai - Main Office', label: 'Chennai - Main Office' },
                  { value: 'Bengaluru', label: 'Bengaluru' },
                  { value: 'Hyderabad', label: 'Hyderabad' },
                  { value: 'other', label: 'Other' },
                ]
              }
            />
          </RegistrationField>
        );

      case 'general.joiningDate':
        return (
          <RegistrationField
            key={key}
            fieldKey={key}
            value={joiningDate}
            htmlFor="reg-joining-date"
            span={span}
          >
            <Input
              id="reg-joining-date"
              type="date"
              value={joiningDate}
              onChange={(e) => setJoiningDate(e.target.value)}
              placeholder={configuredPlaceholder}
            />
          </RegistrationField>
        );

      case 'general.confirmedJoiningDate':
        return (
          <RegistrationField
            key={key}
            fieldKey={key}
            value={confirmedJoiningDate}
            htmlFor="reg-confirmed-joining-date"
            span={span}
            helperText={
              field.description ??
              'Agreed candidate joining date (distinct from probation confirmation)'
            }
          >
            <Input
              id="reg-confirmed-joining-date"
              type="date"
              value={confirmedJoiningDate}
              onChange={(e) => setConfirmedJoiningDate(e.target.value)}
              placeholder={configuredPlaceholder}
            />
          </RegistrationField>
        );

      case 'general.endDate':
        if (!isFixedTerm && !field.required) {
          return null;
        }
        return (
          <RegistrationField
            key={key}
            fieldKey={key}
            value={endDate}
            htmlFor="reg-end-date"
            span={span}
            helperText={field.description ?? 'Contract or internship termination date'}
          >
            <Input
              id="reg-end-date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              placeholder={configuredPlaceholder}
            />
          </RegistrationField>
        );

      case 'general.sourceOfHire':
        return (
          <RegistrationField
            key={key}
            fieldKey={key}
            value={sourceOfHire}
            htmlFor="reg-source-of-hire"
            span={span}
          >
            <Select
              id="reg-source-of-hire"
              value={sourceOfHire}
              onChange={(e) => setSourceOfHire(e.target.value)}
              options={
                configuredOptions || [
                  { value: 'direct_applicant', label: 'Direct Applicant' },
                  { value: 'referral', label: 'Employee Referral' },
                  { value: 'agency', label: 'Agency' },
                  { value: 'campus', label: 'Campus' },
                  { value: 'linkedin', label: 'LinkedIn' },
                  { value: 'other', label: 'Other' },
                ]
              }
            />
          </RegistrationField>
        );

      case 'general.referralId':
        if (sourceOfHire !== 'referral' && !field.required) {
          return null;
        }
        return (
          <RegistrationField
            key={key}
            fieldKey={key}
            value={referralId}
            htmlFor="reg-referral-id"
            span={span}
            helperText={
              referralLoading
                ? 'Resolving referral code...'
                : resolvedReferrer
                  ? `✓ Referred by: ${resolvedReferrer.name}${resolvedReferrer.designation ? ` (${resolvedReferrer.designation})` : ''}`
                  : referralError || field.description || "Enter the referring employee's unique Referral ID"
            }
            error={referralError || undefined}
          >
            <Input
              id="reg-referral-id"
              type="text"
              placeholder={configuredPlaceholder || 'e.g. REF-EMP0001'}
              value={referralId}
              onChange={(e) => setReferralId(e.target.value)}
              error={referralError || undefined}
            />
          </RegistrationField>
        );

      case 'general.probationPeriod':
        return (
          <RegistrationField
            key={key}
            fieldKey={key}
            value={probationPeriod}
            htmlFor="reg-probation-period"
            span={span}
            helperText={
              calculatedProbationEndDate
                ? `Probation ends on: ${calculatedProbationEndDate}`
                : probationPeriod === 'no_probation'
                  ? 'No probation period applicable'
                  : (field.description ?? undefined)
            }
          >
            <Select
              id="reg-probation-period"
              value={probationPeriod}
              onChange={(e) => setProbationPeriod(e.target.value)}
              options={
                configuredOptions || [
                  { value: '3_months', label: '3 Months' },
                  { value: '6_months', label: '6 Months' },
                  { value: '12_months', label: '12 Months' },
                  { value: 'no_probation', label: 'No Probation' },
                  { value: 'custom', label: 'Custom' },
                  { value: 'other', label: 'Other' },
                ]
              }
            />
          </RegistrationField>
        );

      case 'general.noticePeriod':
        return (
          <RegistrationField
            key={key}
            fieldKey={key}
            value={noticePeriod}
            htmlFor="reg-notice-period"
            span={span}
          >
            <Select
              id="reg-notice-period"
              value={noticePeriod}
              onChange={(e) => setNoticePeriod(e.target.value)}
              options={
                configuredOptions || [
                  { value: '15_days', label: '15 Days' },
                  { value: '30_days', label: '30 Days' },
                  { value: '60_days', label: '60 Days' },
                  { value: '90_days', label: '90 Days' },
                  { value: 'no_notice', label: 'No Notice Period' },
                  { value: 'custom', label: 'Custom' },
                  { value: 'other', label: 'Other' },
                ]
              }
            />
          </RegistrationField>
        );

      default:
        // Custom or extended field
        return (
          <RegistrationField
            key={key}
            fieldKey={key}
            value={customValues[key] ?? ''}
            htmlFor={`field-${key}`}
            span={span}
          >
            {renderDynamicFieldInput(field)}
          </RegistrationField>
        );
    }
  };

  return (
    <Stack gap="xl">
      {groups.map((group) => {
        if (group.fields.length === 0) return null;

        return (
          <FormSection key={group.key} title={group.title} description={group.description}>
            <FormGrid columns={2} layout="horizontal" labelWidth="md">
              {group.fields.map((field) => renderField(field as unknown as RegistrationFieldConfig))}
            </FormGrid>
          </FormSection>
        );
      })}
    </Stack>
  );
}
