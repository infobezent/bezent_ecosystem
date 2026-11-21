import { useState } from 'react';
import {
  Alert,
  Button,
  FormGrid,
  Inline,
  Input,
  Select,
  Stack,
  Switch,
} from '../../../../design-system/components';
import type { EmployeeProfile } from '../api/employeesApi';
import { updateEmployee, updateEmployeeSection } from '../api/employeesApi';

export type EditableSectionType =
  | 'personal-details'
  | 'personal-contact'
  | 'emergency-contacts'
  | 'bank-account';

export interface InlineFormProps {
  profile: EmployeeProfile;
  onCancel: () => void;
  onSaved: () => void;
}

const GENDER_OPTIONS = [
  { value: '', label: 'Select Gender' },
  { value: 'Male', label: 'Male' },
  { value: 'Female', label: 'Female' },
  { value: 'Other', label: 'Other' },
];

const MARITAL_STATUS_OPTIONS = [
  { value: '', label: 'Select Marital Status' },
  { value: 'Single', label: 'Single' },
  { value: 'Married', label: 'Married' },
  { value: 'Divorced', label: 'Divorced' },
  { value: 'Widowed', label: 'Widowed' },
];

const BLOOD_GROUP_OPTIONS = [
  { value: '', label: 'Select Blood Group' },
  { value: 'A+', label: 'A+' },
  { value: 'A-', label: 'A-' },
  { value: 'B+', label: 'B+' },
  { value: 'B-', label: 'B-' },
  { value: 'AB+', label: 'AB+' },
  { value: 'AB-', label: 'AB-' },
  { value: 'O+', label: 'O+' },
  { value: 'O-', label: 'O-' },
];

const RELATIONSHIP_OPTIONS = [
  { value: 'Spouse', label: 'Spouse' },
  { value: 'Father', label: 'Father' },
  { value: 'Mother', label: 'Mother' },
  { value: 'Parent', label: 'Parent' },
  { value: 'Sibling', label: 'Sibling' },
  { value: 'Child', label: 'Child' },
  { value: 'Friend', label: 'Friend' },
  { value: 'Other', label: 'Other' },
];

// ---------------------------------------------------------------------------
// 1. Personal Details Inline Form
// ---------------------------------------------------------------------------
export function PersonalDetailsInlineForm({ profile, onCancel, onSaved }: InlineFormProps) {
  const { employee, personal } = profile;

  const [firstName, setFirstName] = useState(employee.firstName || '');
  const [lastName, setLastName] = useState(employee.lastName || '');
  const [middleName, setMiddleName] = useState(personal?.middleName || '');
  const [preferredName, setPreferredName] = useState(personal?.preferredName || '');
  const [gender, setGender] = useState(personal?.gender || '');
  const [dateOfBirth, setDateOfBirth] = useState(personal?.dateOfBirth || '');
  const [maritalStatus, setMaritalStatus] = useState(personal?.maritalStatus || '');
  const [bloodGroup, setBloodGroup] = useState(personal?.bloodGroup || '');
  const [nationality, setNationality] = useState(personal?.nationality || '');
  const [nativeLanguage, setNativeLanguage] = useState(personal?.nativeLanguage || '');
  const [fatherName, setFatherName] = useState(personal?.fatherName || '');
  const [guardianName, setGuardianName] = useState(personal?.guardianName || '');

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!employee.id) return;
    setIsSaving(true);
    setSaveError(null);

    try {
      if (
        firstName.trim() !== (employee.firstName || '') ||
        lastName.trim() !== (employee.lastName || '')
      ) {
        await updateEmployee(employee.id, {
          firstName: firstName.trim() || undefined,
          lastName: lastName.trim() || undefined,
        });
      }

      await updateEmployeeSection(employee.id, 'personal', {
        ...(personal || {}),
        middleName: middleName.trim() || null,
        preferredName: preferredName.trim() || null,
        gender: gender || null,
        dateOfBirth: dateOfBirth || null,
        maritalStatus: maritalStatus || null,
        bloodGroup: bloodGroup || null,
        nationality: nationality.trim() || null,
        nativeLanguage: nativeLanguage.trim() || null,
        fatherName: fatherName.trim() || null,
        guardianName: guardianName.trim() || null,
      });

      onSaved();
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save personal details.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Stack gap="md">
      {saveError && <Alert variant="error">{saveError}</Alert>}

      <FormGrid columns={2}>
        <Input
          label="First Name"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          placeholder="First Name"
          required
        />
        <Input
          label="Last Name"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          placeholder="Last Name"
        />
        <Input
          label="Middle Name"
          value={middleName}
          onChange={(e) => setMiddleName(e.target.value)}
          placeholder="Middle Name"
        />
        <Input
          label="Preferred Name"
          value={preferredName}
          onChange={(e) => setPreferredName(e.target.value)}
          placeholder="Preferred Name"
        />
        <Select
          label="Gender"
          value={gender}
          onChange={(e) => setGender(e.target.value)}
          options={GENDER_OPTIONS}
        />
        <Input
          label="Date of Birth"
          type="date"
          value={dateOfBirth}
          onChange={(e) => setDateOfBirth(e.target.value)}
        />
        <Select
          label="Marital Status"
          value={maritalStatus}
          onChange={(e) => setMaritalStatus(e.target.value)}
          options={MARITAL_STATUS_OPTIONS}
        />
        <Select
          label="Blood Group"
          value={bloodGroup}
          onChange={(e) => setBloodGroup(e.target.value)}
          options={BLOOD_GROUP_OPTIONS}
        />
        <Input
          label="Nationality"
          value={nationality}
          onChange={(e) => setNationality(e.target.value)}
        />
        <Input
          label="Native Language"
          value={nativeLanguage}
          onChange={(e) => setNativeLanguage(e.target.value)}
        />
        <Input
          label="Father's Name"
          value={fatherName}
          onChange={(e) => setFatherName(e.target.value)}
          placeholder="Father's full name"
        />
        <Input
          label="Guardian Name"
          value={guardianName}
          onChange={(e) => setGuardianName(e.target.value)}
          placeholder="Guardian's name (if applicable)"
        />
      </FormGrid>

      <Inline justify="end" gap="sm">
        <Button variant="outline" size="sm" onClick={onCancel} disabled={isSaving}>
          Cancel
        </Button>
        <Button variant="primary" size="sm" loading={isSaving} onClick={handleSave}>
          Save Changes
        </Button>
      </Inline>
    </Stack>
  );
}

// ---------------------------------------------------------------------------
// 2. Contact & Addresses Inline Form
// ---------------------------------------------------------------------------
export function ContactDetailsInlineForm({ profile, onCancel, onSaved }: InlineFormProps) {
  const { employee, personal } = profile;

  const [workPhone, setWorkPhone] = useState(employee.phone || personal?.workPhone || '');
  const [personalEmail, setPersonalEmail] = useState(personal?.personalEmail || '');
  const [homePhone, setHomePhone] = useState(personal?.homePhone || '');
  const [businessPhone, setBusinessPhone] = useState(personal?.businessPhone || '');

  const [addressStreet, setAddressStreet] = useState(personal?.addressStreet || '');
  const [addressLine2, setAddressLine2] = useState(personal?.addressLine2 || '');
  const [addressCity, setAddressCity] = useState(personal?.addressCity || '');
  const [addressDistrict, setAddressDistrict] = useState(personal?.addressDistrict || '');
  const [addressState, setAddressState] = useState(personal?.addressState || '');
  const [addressPostalCode, setAddressPostalCode] = useState(personal?.addressPostalCode || '');
  const [addressCountry, setAddressCountry] = useState(personal?.addressCountry || 'India');

  const [isPermanentSame, setIsPermanentSame] = useState(
    personal?.isPermanentSameAsCurrent ?? true,
  );
  const [permStreet, setPermStreet] = useState(personal?.permanentAddressStreet || '');
  const [permLine2, setPermLine2] = useState(personal?.permanentAddressLine2 || '');
  const [permCity, setPermCity] = useState(personal?.permanentAddressCity || '');
  const [permDistrict, setPermDistrict] = useState(personal?.permanentAddressDistrict || '');
  const [permState, setPermState] = useState(personal?.permanentAddressState || '');
  const [permPostalCode, setPermPostalCode] = useState(personal?.permanentAddressPostalCode || '');
  const [permCountry, setPermCountry] = useState(personal?.permanentAddressCountry || 'India');

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!employee.id) return;
    setIsSaving(true);
    setSaveError(null);

    try {
      if (workPhone.trim() !== (employee.phone || '')) {
        await updateEmployee(employee.id, {
          phone: workPhone.trim() || null,
        });
      }

      await updateEmployeeSection(employee.id, 'personal', {
        ...(personal || {}),
        workPhone: workPhone.trim() || null,
        personalEmail: personalEmail.trim() || null,
        homePhone: homePhone.trim() || null,
        businessPhone: businessPhone.trim() || null,
        addressStreet: addressStreet.trim() || null,
        addressLine2: addressLine2.trim() || null,
        addressCity: addressCity.trim() || null,
        addressDistrict: addressDistrict.trim() || null,
        addressState: addressState.trim() || null,
        addressPostalCode: addressPostalCode.trim() || null,
        addressCountry: addressCountry.trim() || 'India',
        isPermanentSameAsCurrent: isPermanentSame,
        permanentAddressStreet: isPermanentSame
          ? addressStreet.trim() || null
          : permStreet.trim() || null,
        permanentAddressLine2: isPermanentSame
          ? addressLine2.trim() || null
          : permLine2.trim() || null,
        permanentAddressCity: isPermanentSame
          ? addressCity.trim() || null
          : permCity.trim() || null,
        permanentAddressDistrict: isPermanentSame
          ? addressDistrict.trim() || null
          : permDistrict.trim() || null,
        permanentAddressState: isPermanentSame
          ? addressState.trim() || null
          : permState.trim() || null,
        permanentAddressPostalCode: isPermanentSame
          ? addressPostalCode.trim() || null
          : permPostalCode.trim() || null,
        permanentAddressCountry: isPermanentSame
          ? addressCountry.trim() || 'India'
          : permCountry.trim() || 'India',
      });

      onSaved();
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save contact and address.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Stack gap="md">
      {saveError && <Alert variant="error">{saveError}</Alert>}

      <FormGrid columns={2}>
        <Input
          label="Work Phone / Mobile"
          value={workPhone}
          onChange={(e) => setWorkPhone(e.target.value)}
          placeholder="+91 98765 43210"
        />
        <Input
          label="Personal Email"
          type="email"
          value={personalEmail}
          onChange={(e) => setPersonalEmail(e.target.value)}
          placeholder="name@personal.example"
        />
        <Input
          label="Home Phone"
          value={homePhone}
          onChange={(e) => setHomePhone(e.target.value)}
          placeholder="Optional home landline/phone"
        />
        <Input
          label="Business Phone"
          value={businessPhone}
          onChange={(e) => setBusinessPhone(e.target.value)}
          placeholder="Optional direct extension"
        />
      </FormGrid>

      <div className="font-semibold text-sm pt-2">Current Address</div>
      <FormGrid columns={2}>
        <Input
          label="Street Address"
          value={addressStreet}
          onChange={(e) => setAddressStreet(e.target.value)}
          placeholder="House/flat no, street name"
        />
        <Input
          label="Address Line 2"
          value={addressLine2}
          onChange={(e) => setAddressLine2(e.target.value)}
          placeholder="Apartment, suite, landmark"
        />
        <Input
          label="City"
          value={addressCity}
          onChange={(e) => setAddressCity(e.target.value)}
          placeholder="City"
        />
        <Input
          label="District"
          value={addressDistrict}
          onChange={(e) => setAddressDistrict(e.target.value)}
          placeholder="District"
        />
        <Input
          label="State"
          value={addressState}
          onChange={(e) => setAddressState(e.target.value)}
          placeholder="State"
        />
        <Input
          label="Postal Code"
          value={addressPostalCode}
          onChange={(e) => setAddressPostalCode(e.target.value)}
          placeholder="PIN / ZIP code"
        />
        <Input
          label="Country"
          value={addressCountry}
          onChange={(e) => setAddressCountry(e.target.value)}
          placeholder="Country"
        />
      </FormGrid>

      <Inline align="center" gap="sm">
        <Switch
          checked={isPermanentSame}
          onChange={(e) => setIsPermanentSame(e.target.checked)}
          label="Permanent address is identical to current address"
        />
      </Inline>

      {!isPermanentSame && (
        <Stack gap="sm">
          <div className="font-semibold text-sm">Permanent Address</div>
          <FormGrid columns={2}>
            <Input
              label="Street Address"
              value={permStreet}
              onChange={(e) => setPermStreet(e.target.value)}
              placeholder="House/flat no, street name"
            />
            <Input
              label="Address Line 2"
              value={permLine2}
              onChange={(e) => setPermLine2(e.target.value)}
              placeholder="Apartment, landmark"
            />
            <Input
              label="City"
              value={permCity}
              onChange={(e) => setPermCity(e.target.value)}
              placeholder="City"
            />
            <Input
              label="District"
              value={permDistrict}
              onChange={(e) => setPermDistrict(e.target.value)}
              placeholder="District"
            />
            <Input
              label="State"
              value={permState}
              onChange={(e) => setPermState(e.target.value)}
              placeholder="State"
            />
            <Input
              label="Postal Code"
              value={permPostalCode}
              onChange={(e) => setPermPostalCode(e.target.value)}
              placeholder="PIN / ZIP code"
            />
            <Input
              label="Country"
              value={permCountry}
              onChange={(e) => setPermCountry(e.target.value)}
              placeholder="Country"
            />
          </FormGrid>
        </Stack>
      )}

      <Inline justify="end" gap="sm">
        <Button variant="outline" size="sm" onClick={onCancel} disabled={isSaving}>
          Cancel
        </Button>
        <Button variant="primary" size="sm" loading={isSaving} onClick={handleSave}>
          Save Changes
        </Button>
      </Inline>
    </Stack>
  );
}

// ---------------------------------------------------------------------------
// 3. Emergency Contacts Inline Form
// ---------------------------------------------------------------------------
export function EmergencyContactsInlineForm({ profile, onCancel, onSaved }: InlineFormProps) {
  const { employee, emergencyContacts } = profile;

  const primary = emergencyContacts?.[0];
  const secondary = emergencyContacts?.[1];

  const [primaryName, setPrimaryName] = useState(primary?.name || '');
  const [primaryRel, setPrimaryRel] = useState(primary?.relationship || 'Spouse');
  const [primaryPhone, setPrimaryPhone] = useState(primary?.phone || '');
  const [primaryEmail, setPrimaryEmail] = useState(primary?.email || '');
  const [primaryAddr, setPrimaryAddr] = useState(primary?.address || '');

  const [hasSecondary, setHasSecondary] = useState(Boolean(secondary));
  const [secName, setSecName] = useState(secondary?.name || '');
  const [secRel, setSecRel] = useState(secondary?.relationship || 'Parent');
  const [secPhone, setSecPhone] = useState(secondary?.phone || '');
  const [secEmail, setSecEmail] = useState(secondary?.email || '');
  const [secAddr, setSecAddr] = useState(secondary?.address || '');

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!employee.id) return;
    if (!primaryName.trim() || !primaryPhone.trim()) {
      setSaveError('Primary contact name and phone number are required.');
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      const payload: Array<{
        priority: 'primary' | 'secondary';
        name: string;
        relationship: string;
        phone: string;
        email: string | null;
        address: string | null;
        isPrivate: boolean;
      }> = [
        {
          priority: 'primary',
          name: primaryName.trim(),
          relationship: primaryRel,
          phone: primaryPhone.trim(),
          email: primaryEmail.trim() || null,
          address: primaryAddr.trim() || null,
          isPrivate: primary?.isPrivate ?? false,
        },
      ];

      if (hasSecondary && secName.trim() && secPhone.trim()) {
        payload.push({
          priority: 'secondary',
          name: secName.trim(),
          relationship: secRel,
          phone: secPhone.trim(),
          email: secEmail.trim() || null,
          address: secAddr.trim() || null,
          isPrivate: secondary?.isPrivate ?? false,
        });
      }

      await updateEmployeeSection(employee.id, 'emergency-contacts', payload);
      onSaved();
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save emergency contacts.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Stack gap="md">
      {saveError && <Alert variant="error">{saveError}</Alert>}

      <div className="font-semibold text-sm">Primary Contact (Required)</div>
      <FormGrid columns={2}>
        <Input
          label="Full Name"
          value={primaryName}
          onChange={(e) => setPrimaryName(e.target.value)}
          placeholder="Contact name"
          required
        />
        <Select
          label="Relationship"
          value={primaryRel}
          onChange={(e) => setPrimaryRel(e.target.value)}
          options={RELATIONSHIP_OPTIONS}
        />
        <Input
          label="Phone Number"
          value={primaryPhone}
          onChange={(e) => setPrimaryPhone(e.target.value)}
          placeholder="+91 98765 43210"
          required
        />
        <Input
          label="Email Address"
          type="email"
          value={primaryEmail}
          onChange={(e) => setPrimaryEmail(e.target.value)}
          placeholder="name@example.com"
        />
        <Input
          label="Residential Address"
          value={primaryAddr}
          onChange={(e) => setPrimaryAddr(e.target.value)}
          placeholder="Address (optional)"
        />
      </FormGrid>

      <Inline align="center" gap="sm">
        <Switch
          checked={hasSecondary}
          onChange={(e) => setHasSecondary(e.target.checked)}
          label="Add a secondary emergency contact"
        />
      </Inline>

      {hasSecondary && (
        <Stack gap="sm">
          <div className="font-semibold text-sm">Secondary Contact</div>
          <FormGrid columns={2}>
            <Input
              label="Full Name"
              value={secName}
              onChange={(e) => setSecName(e.target.value)}
              placeholder="Secondary contact name"
            />
            <Select
              label="Relationship"
              value={secRel}
              onChange={(e) => setSecRel(e.target.value)}
              options={RELATIONSHIP_OPTIONS}
            />
            <Input
              label="Phone Number"
              value={secPhone}
              onChange={(e) => setSecPhone(e.target.value)}
              placeholder="+91 98765 43210"
            />
            <Input
              label="Email Address"
              type="email"
              value={secEmail}
              onChange={(e) => setSecEmail(e.target.value)}
              placeholder="name@example.com"
            />
            <Input
              label="Residential Address"
              value={secAddr}
              onChange={(e) => setSecAddr(e.target.value)}
              placeholder="Address (optional)"
            />
          </FormGrid>
        </Stack>
      )}

      <Inline justify="end" gap="sm">
        <Button variant="outline" size="sm" onClick={onCancel} disabled={isSaving}>
          Cancel
        </Button>
        <Button variant="primary" size="sm" loading={isSaving} onClick={handleSave}>
          Save Changes
        </Button>
      </Inline>
    </Stack>
  );
}

// ---------------------------------------------------------------------------
// 4. Salary Bank Account Inline Form
// ---------------------------------------------------------------------------
export function BankAccountInlineForm({ profile, onCancel, onSaved }: InlineFormProps) {
  const { employee, bankAccount } = profile;

  const [accountHolderName, setAccountHolderName] = useState(
    bankAccount?.accountHolderName || employee.fullName || '',
  );
  const [bankName, setBankName] = useState(bankAccount?.bankName || '');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState(bankAccount?.ifscCode || '');
  const [branchName, setBranchName] = useState(bankAccount?.branchName || '');
  const [bankLocation, setBankLocation] = useState(bankAccount?.bankLocation || '');

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!employee.id) return;
    if (!accountHolderName.trim() || !bankName.trim() || !ifscCode.trim()) {
      setSaveError('Account holder name, bank name, and IFSC code are required.');
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      await updateEmployeeSection(employee.id, 'bank-account', {
        accountHolderName: accountHolderName.trim(),
        bankName: bankName.trim(),
        accountNumber: accountNumber.trim() || undefined,
        ifscCode: ifscCode.trim().toUpperCase(),
        branchName: branchName.trim() || null,
        bankLocation: bankLocation.trim() || null,
      });

      onSaved();
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save bank account details.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Stack gap="md">
      {saveError && <Alert variant="error">{saveError}</Alert>}

      <FormGrid columns={2}>
        <Input
          label="Account Holder Name"
          value={accountHolderName}
          onChange={(e) => setAccountHolderName(e.target.value)}
          placeholder="Name as in bank records"
          required
        />
        <Input
          label="Bank Name"
          value={bankName}
          onChange={(e) => setBankName(e.target.value)}
          placeholder="e.g. HDFC Bank, ICICI Bank, SBI"
          required
        />
        <Input
          label="Account Number"
          type="password"
          value={accountNumber}
          onChange={(e) => setAccountNumber(e.target.value)}
          placeholder={bankAccount?.accountNumberMasked || 'Enter full bank account number'}
          helperText={
            bankAccount
              ? 'Leave blank to retain current bank account number'
              : 'Full account number'
          }
        />
        <Input
          label="IFSC / Branch Code"
          value={ifscCode}
          onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
          placeholder="e.g. HDFC0001234"
          required
        />
        <Input
          label="Branch Name"
          value={branchName}
          onChange={(e) => setBranchName(e.target.value)}
          placeholder="Branch name (optional)"
        />
        <Input
          label="Bank Location"
          value={bankLocation}
          onChange={(e) => setBankLocation(e.target.value)}
          placeholder="City / location (optional)"
        />
      </FormGrid>

      <Inline justify="end" gap="sm">
        <Button variant="outline" size="sm" onClick={onCancel} disabled={isSaving}>
          Cancel
        </Button>
        <Button variant="primary" size="sm" loading={isSaving} onClick={handleSave}>
          Save Changes
        </Button>
      </Inline>
    </Stack>
  );
}
