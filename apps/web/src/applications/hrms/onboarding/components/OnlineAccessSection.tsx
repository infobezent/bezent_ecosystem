import { useMemo, useState } from 'react';
import {
  FormSection,
  FormGrid,
  FormField,
  Input,
  Select,
  Checkbox,
  Switch,
  Card,
  Stack,
} from '../../../../design-system';

import { RegistrationField, useRegistrationConfig } from '../registration/registrationConfig';
import type { RegistrationFieldConfig } from '../../settings/api/registrationSettingsApi';
import type { ResolvedFormField } from '../../settings/api/formsApi';
import { getGroupsForSection } from '../../settings/administration/forms/types';
import type { Chapter07OnlineAccessState } from '../types/registration.types';

/**
 * `online_access.systemRole` and `online_access.ssoEnabled` are fixed Form Engine
 * fields with no slot yet in `Chapter07OnlineAccessState`; they round-trip through
 * `onChange` as extra properties on the same object until the canonical type grows them.
 */
interface OnlineAccessExtra {
  systemRole?: string;
  ssoEnabled?: boolean;
}
type OnlineAccessValue = Chapter07OnlineAccessState & OnlineAccessExtra;

const DEFAULT_VALUE: OnlineAccessValue = {
  username: '',
  officialEmail: '',
  mfaRequired: true,
  forcePasswordSetup: true,
  accountActive: true,
};

const SYSTEM_ROLE_OPTIONS = [
  { value: 'employee', label: 'Employee (Self-Service)' },
  { value: 'team_lead', label: 'Team Lead / Approver' },
  { value: 'hr_manager', label: 'HR Manager' },
];

export interface OnlineAccessSectionProps {
  value?: Chapter07OnlineAccessState;
  onChange?: (updated: Chapter07OnlineAccessState) => void;
}

export function OnlineAccessSection({ value, onChange }: OnlineAccessSectionProps = {}) {
  const current: OnlineAccessValue = (value as OnlineAccessValue | undefined) ?? DEFAULT_VALUE;

  const update = (patch: Partial<OnlineAccessValue>) => {
    onChange?.({ ...current, ...patch });
  };

  // Custom field values for any company-added fields appended to this section.
  const [customValues, setCustomValues] = useState<Record<string, unknown>>({});

  const config = useRegistrationConfig();

  const onlineAccessFields = useMemo(() => {
    const fields = config.fields.filter((f) => f.section === 'online_access' && f.enabled);
    return [...fields].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, [config.fields]);

  const groups = useMemo(() => {
    return getGroupsForSection(
      'online_access',
      onlineAccessFields as unknown as ResolvedFormField[],
      config.metadata,
    );
  }, [onlineAccessFields, config.metadata]);

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
    const span = width === 'full' ? 'full' : undefined;
    const configuredPlaceholder = (fConfig?.placeholder as string) || undefined;
    const configuredOptions = Array.isArray(fConfig?.options)
      ? (fConfig.options as Array<{ value: string; label: string }>)
      : undefined;

    switch (key) {
      case 'online_access.companyEmail':
        return (
          <RegistrationField
            key={key}
            fieldKey={key}
            value={current.officialEmail}
            htmlFor="reg-company-email"
            span={span}
            helperText={
              field.description ?? 'System-assigned work email (derived from employee details)'
            }
          >
            <Input
              id="reg-company-email"
              type="email"
              value={current.officialEmail}
              readOnly
              disabled
              placeholder={configuredPlaceholder || 'Generating...'}
            />
          </RegistrationField>
        );

      case 'online_access.username':
        return (
          <RegistrationField
            key={key}
            fieldKey={key}
            value={current.username}
            htmlFor="reg-username"
            span={span}
          >
            <Input
              id="reg-username"
              type="text"
              placeholder={configuredPlaceholder}
              value={current.username}
              onChange={(e) => update({ username: e.target.value })}
            />
          </RegistrationField>
        );

      case 'online_access.systemRole':
        return (
          <RegistrationField
            key={key}
            fieldKey={key}
            value={current.systemRole ?? ''}
            htmlFor="reg-system-role"
            span={span}
          >
            <Select
              id="reg-system-role"
              value={current.systemRole ?? ''}
              onChange={(e) => update({ systemRole: e.target.value })}
              options={configuredOptions || SYSTEM_ROLE_OPTIONS}
            />
          </RegistrationField>
        );

      case 'online_access.ssoEnabled':
        return (
          <RegistrationField
            key={key}
            fieldKey={key}
            value={current.ssoEnabled ?? false}
            htmlFor="reg-sso-enabled"
            hideLabel
            span={span}
          >
            <Checkbox
              id="reg-sso-enabled"
              label={field.label}
              checked={current.ssoEnabled ?? false}
              onChange={(e) => update({ ssoEnabled: e.target.checked })}
            />
          </RegistrationField>
        );

      default:
        // Custom or extended field added via the Form Builder
        return (
          <RegistrationField
            key={key}
            fieldKey={key}
            value={customValues[key] ?? ''}
            htmlFor={`field-${key}`}
            hideLabel={field.type === 'checkbox'}
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
          <Card key={group.key} padding="lg">
            <FormSection title={group.title}>
              <FormGrid columns={2} layout="horizontal" labelWidth="md">
                {group.fields.map((field) =>
                  renderField(field as unknown as RegistrationFieldConfig),
                )}
              </FormGrid>
            </FormSection>
          </Card>
        );
      })}

      <Card padding="lg">
        <FormSection title="Security & Authentication">
          <FormGrid columns={2} layout="horizontal" labelWidth="md">
            <FormField label="MFA Policy">
              <Switch
                checked={current.mfaRequired}
                onChange={(e) => update({ mfaRequired: e.target.checked })}
                label="Enforce Two-Factor Authentication"
              />
            </FormField>

            <FormField label="Password Setup">
              <Switch
                checked={current.forcePasswordSetup}
                onChange={(e) => update({ forcePasswordSetup: e.target.checked })}
                label="Force Password Setup on First Login"
              />
            </FormField>

            <FormField label="Account State">
              <Switch
                checked={current.accountActive}
                onChange={(e) => update({ accountActive: e.target.checked })}
                label="Account Active & Enabled"
              />
            </FormField>
          </FormGrid>
        </FormSection>
      </Card>
    </Stack>
  );
}
