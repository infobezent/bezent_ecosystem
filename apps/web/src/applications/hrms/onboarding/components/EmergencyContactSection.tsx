import { useMemo } from 'react';
import {
  FormSection,
  FormGrid,
  Input,
  InternationalPhoneInput,
  Select,
  Textarea,
  Switch,
  Card,
  Stack,
} from '../../../../design-system';
import { RegistrationField, useRegistrationConfig } from '../registration/registrationConfig';
import type { RegistrationFieldConfig } from '../../settings/api/registrationSettingsApi';
import type { ResolvedFormField } from '../../settings/api/formsApi';
import { getGroupsForSection } from '../../settings/administration/forms/types';
import type { Chapter05EmergencyState } from '../types/registration.types';

const FALLBACK_RELATIONSHIP_OPTIONS = [
  { value: 'Father', label: 'Father' },
  { value: 'Mother', label: 'Mother' },
  { value: 'Spouse', label: 'Spouse' },
  { value: 'Brother', label: 'Brother' },
  { value: 'Sister', label: 'Sister' },
  { value: 'Son', label: 'Son' },
  { value: 'Daughter', label: 'Daughter' },
  { value: 'Guardian', label: 'Guardian' },
  { value: 'Relative', label: 'Relative' },
  { value: 'Friend', label: 'Friend' },
  { value: 'Other', label: 'Other' },
];

const EMPTY_PRIMARY: NonNullable<Chapter05EmergencyState['primaryContact']> = {
  name: '',
  relationship: '',
  phone: '',
  email: '',
  address: '',
  isPrivate: true,
};

const EMPTY_SECONDARY: NonNullable<Chapter05EmergencyState['secondaryContact']> = {
  name: '',
  relationship: '',
  phone: '',
  email: '',
};

export interface EmergencyContactSectionProps {
  value?: Chapter05EmergencyState;
  onChange?: (updated: Chapter05EmergencyState) => void;
}

function validatePhone(value: string): boolean {
  const cleanNum = value.replace(/\D/g, '');
  return cleanNum.length >= 7 && cleanNum.length <= 15;
}

function validateEmail(value: string): boolean {
  if (!value) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function EmergencyContactSection({ value, onChange }: EmergencyContactSectionProps = {}) {
  const primary = value?.primaryContact ?? EMPTY_PRIMARY;
  const secondary = value?.secondaryContact ?? EMPTY_SECONDARY;

  const updatePrimary = (
    patch: Partial<NonNullable<Chapter05EmergencyState['primaryContact']>>,
  ) => {
    onChange?.({
      primaryContact: { ...primary, ...patch },
      secondaryContact: value?.secondaryContact ?? null,
    });
  };

  const updateSecondary = (
    patch: Partial<NonNullable<Chapter05EmergencyState['secondaryContact']>>,
  ) => {
    onChange?.({
      primaryContact: value?.primaryContact ?? null,
      secondaryContact: { ...secondary, ...patch },
    });
  };

  const config = useRegistrationConfig();

  const emergencyFields = useMemo(() => {
    const fields = config.fields.filter((f) => f.section === 'emergency' && f.enabled);
    return [...fields].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, [config.fields]);

  const groups = useMemo(
    () =>
      getGroupsForSection(
        'emergency',
        emergencyFields as unknown as ResolvedFormField[],
        config.metadata,
      ),
    [emergencyFields, config.metadata],
  );

  const primaryPhoneError =
    primary.phone && !validatePhone(primary.phone)
      ? 'Please enter a valid phone number (7-15 digits).'
      : undefined;
  const primaryEmailError =
    primary.email && !validateEmail(primary.email)
      ? 'Please enter a valid email address.'
      : undefined;
  const secondaryPhoneError =
    secondary.phone && !validatePhone(secondary.phone)
      ? 'Please enter a valid mobile number (7-15 digits).'
      : undefined;
  const secondaryEmailError =
    secondary.email && !validateEmail(secondary.email)
      ? 'Please enter a valid email address.'
      : undefined;

  const renderField = (field: RegistrationFieldConfig) => {
    const { key, config: fConfig } = field;
    const options = Array.isArray(fConfig?.options)
      ? (fConfig.options as Array<{ value: string; label: string }>)
      : FALLBACK_RELATIONSHIP_OPTIONS;
    const isKnownOption = (val: string) => options.some((o) => o.value === val);

    switch (key) {
      case 'emergency.contactName':
        return (
          <RegistrationField key={key} fieldKey={key} value={primary.name}>
            <Input
              type="text"
              placeholder="Enter Primary Contact Name"
              value={primary.name}
              onChange={(e) => updatePrimary({ name: e.target.value })}
            />
          </RegistrationField>
        );
      case 'emergency.relationship': {
        const selectValue =
          primary.relationship && !isKnownOption(primary.relationship)
            ? 'Other'
            : primary.relationship;
        return (
          <RegistrationField key={key} fieldKey={key} value={primary.relationship}>
            <Stack gap="xs">
              <Select
                options={options}
                value={selectValue}
                onChange={(e) =>
                  updatePrimary({ relationship: e.target.value === 'Other' ? '' : e.target.value })
                }
              />
              {selectValue === 'Other' && (
                <Input
                  type="text"
                  placeholder="Enter Relationship / Role"
                  value={isKnownOption(primary.relationship) ? '' : primary.relationship}
                  onChange={(e) => updatePrimary({ relationship: e.target.value })}
                />
              )}
            </Stack>
          </RegistrationField>
        );
      }
      case 'emergency.phone':
        return (
          <RegistrationField
            key={key}
            fieldKey={key}
            value={primary.phone}
            error={primaryPhoneError}
          >
            <InternationalPhoneInput
              id="emergency-primary-phone"
              defaultCountry="IN"
              placeholder="98765 43210"
              value={primary.phone}
              onChange={(val, parsed) => updatePrimary({ phone: parsed.nationalNumber || val })}
            />
          </RegistrationField>
        );
      case 'emergency.email':
        return (
          <RegistrationField
            key={key}
            fieldKey={key}
            value={primary.email}
            error={primaryEmailError}
          >
            <Input
              type="email"
              placeholder="contact@example.com"
              value={primary.email ?? ''}
              onChange={(e) => updatePrimary({ email: e.target.value })}
            />
          </RegistrationField>
        );
      case 'emergency.address':
        return (
          <RegistrationField key={key} fieldKey={key} value={primary.address} span="full">
            <Textarea
              rows={3}
              placeholder="Enter complete address or relevant contact details..."
              value={primary.address ?? ''}
              onChange={(e) => updatePrimary({ address: e.target.value })}
            />
          </RegistrationField>
        );
      case 'emergency.isPrimaryPrivate':
        return (
          <RegistrationField
            key={key}
            fieldKey={key}
            value={primary.isPrivate}
            span="full"
            hideLabel
          >
            <Switch
              checked={primary.isPrivate ?? true}
              onChange={(e) => updatePrimary({ isPrivate: e.target.checked })}
              label={
                primary.isPrivate
                  ? 'Primary Emergency Contact (Private Record)'
                  : 'Standard Emergency Contact (Public HR Record)'
              }
            />
          </RegistrationField>
        );
      case 'emergency.secondaryContactName':
        return (
          <RegistrationField key={key} fieldKey={key} value={secondary.name}>
            <Input
              type="text"
              placeholder="Enter Secondary Contact Name"
              value={secondary.name}
              onChange={(e) => updateSecondary({ name: e.target.value })}
            />
          </RegistrationField>
        );
      case 'emergency.secondaryRelationship': {
        const selectValue =
          secondary.relationship && !isKnownOption(secondary.relationship)
            ? 'Other'
            : secondary.relationship;
        return (
          <RegistrationField key={key} fieldKey={key} value={secondary.relationship}>
            <Stack gap="xs">
              <Select
                options={options}
                value={selectValue}
                onChange={(e) =>
                  updateSecondary({
                    relationship: e.target.value === 'Other' ? '' : e.target.value,
                  })
                }
              />
              {selectValue === 'Other' && (
                <Input
                  type="text"
                  placeholder="Enter Secondary Relationship"
                  value={isKnownOption(secondary.relationship) ? '' : secondary.relationship}
                  onChange={(e) => updateSecondary({ relationship: e.target.value })}
                />
              )}
            </Stack>
          </RegistrationField>
        );
      }
      case 'emergency.secondaryMobile':
        return (
          <RegistrationField
            key={key}
            fieldKey={key}
            value={secondary.phone}
            error={secondaryPhoneError}
          >
            <InternationalPhoneInput
              id="emergency-secondary-phone"
              defaultCountry="IN"
              placeholder="98765 43211"
              value={secondary.phone}
              onChange={(val, parsed) => updateSecondary({ phone: parsed.nationalNumber || val })}
            />
          </RegistrationField>
        );
      case 'emergency.secondaryEmail':
        return (
          <RegistrationField
            key={key}
            fieldKey={key}
            value={secondary.email}
            error={secondaryEmailError}
          >
            <Input
              type="email"
              placeholder="secondary@example.com"
              value={secondary.email ?? ''}
              onChange={(e) => updateSecondary({ email: e.target.value })}
            />
          </RegistrationField>
        );
      default:
        return null;
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
    </Stack>
  );
}
