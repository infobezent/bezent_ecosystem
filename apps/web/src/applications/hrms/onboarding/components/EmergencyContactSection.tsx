import { useState } from 'react';
import {
  FormSection,
  FormGrid,
  FormField,
  Input,
  Select,
  Textarea,
  Switch,
  Stack,
  Inline,
} from '../../../../design-system';

const RELATIONSHIP_OPTIONS = [
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

const COUNTRY_CODE_OPTIONS = [
  { value: '+91', label: '+91 (IND)' },
  { value: '+1', label: '+1 (USA)' },
  { value: '+44', label: '+44 (UK)' },
  { value: '+65', label: '+65 (SGP)' },
  { value: '+971', label: '+971 (UAE)' },
];

export function EmergencyContactSection() {
  // PRIMARY CONTACT STATE
  const [primaryName, setPrimaryName] = useState('Ramesh Kumar');
  const [primaryRelationship, setPrimaryRelationship] = useState('Father');
  const [customPrimaryRelationship, setCustomPrimaryRelationship] = useState('');
  const [primaryCountryCode, setPrimaryCountryCode] = useState('+91');
  const [primaryPhone, setPrimaryPhone] = useState('9876543210');
  const [primaryEmail, setPrimaryEmail] = useState('ramesh.kumar@example.com');
  const [primaryAddress, setPrimaryAddress] = useState(
    'No. 42, Green Park Avenue, T. Nagar, Chennai - 600017, Tamil Nadu',
  );
  const [isPrimaryPrivate, setIsPrimaryPrivate] = useState(true);

  // SECONDARY CONTACT STATE
  const [secondaryName, setSecondaryName] = useState('Lakshmi Kumar');
  const [secondaryRelationship, setSecondaryRelationship] = useState('Mother');
  const [customSecondaryRelationship, setCustomSecondaryRelationship] = useState('');
  const [secondaryCountryCode, setSecondaryCountryCode] = useState('+91');
  const [secondaryMobile, setSecondaryMobile] = useState('9876543211');
  const [secondaryEmail, setSecondaryEmail] = useState('lakshmi.k@example.com');

  // Validation States
  const [primaryPhoneError, setPrimaryPhoneError] = useState('');
  const [primaryEmailError, setPrimaryEmailError] = useState('');
  const [secondaryMobileError, setSecondaryMobileError] = useState('');
  const [secondaryEmailError, setSecondaryEmailError] = useState('');

  const validatePhone = (value: string): boolean => {
    const cleanNum = value.replace(/\D/g, '');
    return cleanNum.length >= 7 && cleanNum.length <= 15;
  };

  const validateEmail = (value: string): boolean => {
    if (!value) return true; // Optional field or checked upon blur
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
  };

  const handlePrimaryPhoneChange = (val: string) => {
    setPrimaryPhone(val);
    if (val && !validatePhone(val)) {
      setPrimaryPhoneError('Please enter a valid phone number (7-15 digits).');
    } else {
      setPrimaryPhoneError('');
    }
  };

  const handlePrimaryEmailChange = (val: string) => {
    setPrimaryEmail(val);
    if (val && !validateEmail(val)) {
      setPrimaryEmailError('Please enter a valid email address.');
    } else {
      setPrimaryEmailError('');
    }
  };

  const handleSecondaryMobileChange = (val: string) => {
    setSecondaryMobile(val);
    if (val && !validatePhone(val)) {
      setSecondaryMobileError('Please enter a valid mobile number (7-15 digits).');
    } else {
      setSecondaryMobileError('');
    }
  };

  const handleSecondaryEmailChange = (val: string) => {
    setSecondaryEmail(val);
    if (val && !validateEmail(val)) {
      setSecondaryEmailError('Please enter a valid email address.');
    } else {
      setSecondaryEmailError('');
    }
  };

  return (
    <Stack gap="xl">
      {/* 1. PRIMARY CONTACT AREA */}
      <FormSection
        title="Primary Emergency Contact"
        description="Primary emergency contact and private record preferences."
      >
        <FormGrid columns={2} layout="horizontal" labelWidth="md">
          {/* 1. Contact Name */}
          <FormField label="Contact Name" required>
            <Input
              type="text"
              placeholder="Enter Primary Contact Name"
              value={primaryName}
              onChange={(e) => setPrimaryName(e.target.value)}
            />
          </FormField>

          {/* 2. Relationship / Role */}
          <FormField label="Relationship / Role" required>
            <Stack gap="xs">
              <Select
                options={RELATIONSHIP_OPTIONS}
                value={primaryRelationship}
                onChange={(e) => setPrimaryRelationship(e.target.value)}
              />
              {primaryRelationship === 'Other' && (
                <Input
                  type="text"
                  placeholder="Enter Relationship / Role"
                  value={customPrimaryRelationship}
                  onChange={(e) => setCustomPrimaryRelationship(e.target.value)}
                />
              )}
            </Stack>
          </FormField>

          {/* 3. Phone */}
          <FormField label="Phone" required error={primaryPhoneError}>
            <Inline gap="xs">
              <Select
                options={COUNTRY_CODE_OPTIONS}
                value={primaryCountryCode}
                onChange={(e) => setPrimaryCountryCode(e.target.value)}
              />
              <Input
                type="tel"
                placeholder="98765 43210"
                value={primaryPhone}
                onChange={(e) => handlePrimaryPhoneChange(e.target.value)}
              />
            </Inline>
          </FormField>

          {/* 4. Email */}
          <FormField label="Email" required error={primaryEmailError}>
            <Input
              type="email"
              placeholder="contact@example.com"
              value={primaryEmail}
              onChange={(e) => handlePrimaryEmailChange(e.target.value)}
            />
          </FormField>

          {/* 5. Address / Contact Details */}
          <FormField label="Address Details" required span="full">
            <Textarea
              rows={3}
              placeholder="Enter complete address or relevant contact details..."
              value={primaryAddress}
              onChange={(e) => setPrimaryAddress(e.target.value)}
            />
          </FormField>

          {/* 6. Primary / Private Contact Indicator */}
          <FormField label="Privacy Record" span="full">
            <Switch
              checked={isPrimaryPrivate}
              onChange={(e) => setIsPrimaryPrivate(e.target.checked)}
              label={
                isPrimaryPrivate
                  ? 'Primary Emergency Contact (Private Record)'
                  : 'Standard Emergency Contact (Public HR Record)'
              }
            />
          </FormField>
        </FormGrid>
      </FormSection>

      {/* 2. SECONDARY CONTACT AREA */}
      <FormSection
        title="Secondary Emergency Contact"
        description="Secondary alternate contact details for emergencies."
      >
        <FormGrid columns={2} layout="horizontal" labelWidth="md">
          {/* 1. Secondary Contact Name */}
          <FormField label="Secondary Contact Name">
            <Input
              type="text"
              placeholder="Enter Secondary Contact Name"
              value={secondaryName}
              onChange={(e) => setSecondaryName(e.target.value)}
            />
          </FormField>

          {/* 2. Secondary Relationship */}
          <FormField label="Secondary Relationship">
            <Stack gap="xs">
              <Select
                options={RELATIONSHIP_OPTIONS}
                value={secondaryRelationship}
                onChange={(e) => setSecondaryRelationship(e.target.value)}
              />
              {secondaryRelationship === 'Other' && (
                <Input
                  type="text"
                  placeholder="Enter Secondary Relationship"
                  value={customSecondaryRelationship}
                  onChange={(e) => setCustomSecondaryRelationship(e.target.value)}
                />
              )}
            </Stack>
          </FormField>

          {/* 3. Secondary Mobile */}
          <FormField label="Secondary Mobile" error={secondaryMobileError}>
            <Inline gap="xs">
              <Select
                options={COUNTRY_CODE_OPTIONS}
                value={secondaryCountryCode}
                onChange={(e) => setSecondaryCountryCode(e.target.value)}
              />
              <Input
                type="tel"
                placeholder="98765 43211"
                value={secondaryMobile}
                onChange={(e) => handleSecondaryMobileChange(e.target.value)}
              />
            </Inline>
          </FormField>

          {/* 4. Secondary Email */}
          <FormField label="Secondary Email" error={secondaryEmailError}>
            <Input
              type="email"
              placeholder="secondary@example.com"
              value={secondaryEmail}
              onChange={(e) => handleSecondaryEmailChange(e.target.value)}
            />
          </FormField>
        </FormGrid>
      </FormSection>
    </Stack>
  );
}
