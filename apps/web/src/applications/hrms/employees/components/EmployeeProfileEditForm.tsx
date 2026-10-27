import { useState } from 'react';
import {
  Alert,
  Button,
  FormField,
  FormGrid,
  Inline,
  Input,
  Select,
  Stack,
} from '../../../../design-system/components';
import type { EmployeeProfile } from '../api/employeesApi';

export interface ProfileEditFormData {
  // Core employee record
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  // Personal details
  middleName: string;
  preferredName: string;
  gender: string;
  dateOfBirth: string;
  maritalStatus: string;
  bloodGroup: string;
  nationality: string;
  nativeLanguage: string;
  fatherName: string;
  guardianName: string;
  personalEmail: string;
  homePhone: string;
  businessPhone: string;
  workPhone: string;
  addressStreet: string;
  addressLine2: string;
  addressCity: string;
  addressDistrict: string;
  addressState: string;
  addressPostalCode: string;
  addressCountry: string;
  // Bank Account
  accountHolderName: string;
  accountNumber: string;
  ifscCode: string;
  bankName: string;
  branchName: string;
  bankLocation: string;
}

export function buildInitialFormData(profile: EmployeeProfile): ProfileEditFormData {
  const { employee, personal, bankAccount } = profile;
  return {
    firstName: employee.firstName || '',
    lastName: employee.lastName || '',
    email: employee.email || '',
    phone: employee.phone || '',

    middleName: personal?.middleName || '',
    preferredName: personal?.preferredName || '',
    gender: personal?.gender || '',
    dateOfBirth: personal?.dateOfBirth || '',
    maritalStatus: personal?.maritalStatus || '',
    bloodGroup: personal?.bloodGroup || '',
    nationality: personal?.nationality || '',
    nativeLanguage: personal?.nativeLanguage || '',
    fatherName: personal?.fatherName || '',
    guardianName: personal?.guardianName || '',
    personalEmail: personal?.personalEmail || '',
    homePhone: personal?.homePhone || '',
    businessPhone: personal?.businessPhone || '',
    workPhone: personal?.workPhone || '',
    addressStreet: personal?.addressStreet || '',
    addressLine2: personal?.addressLine2 || '',
    addressCity: personal?.addressCity || '',
    addressDistrict: personal?.addressDistrict || '',
    addressState: personal?.addressState || '',
    addressPostalCode: personal?.addressPostalCode || '',
    addressCountry: personal?.addressCountry || '',

    accountHolderName: bankAccount?.accountHolderName || '',
    accountNumber: '', // Security: never pre-fill full account number
    ifscCode: bankAccount?.ifscCode || '',
    bankName: bankAccount?.bankName || '',
    branchName: bankAccount?.branchName || '',
    bankLocation: bankAccount?.bankLocation || '',
  };
}

export interface EmployeeProfileEditFormProps {
  initialData: ProfileEditFormData;
  activeSection: string;
  saving: boolean;
  saveError: string | null;
  onSave: (data: ProfileEditFormData) => void;
  onCancel: () => void;
  onChange: (data: ProfileEditFormData) => void;
}

export function EmployeeProfileEditForm({
  initialData,
  activeSection,
  saving,
  saveError,
  onSave,
  onCancel,
  onChange,
}: EmployeeProfileEditFormProps) {
  const [formData, setFormData] = useState<ProfileEditFormData>(initialData);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const updateField = (field: keyof ProfileEditFormData, value: string) => {
    const next = { ...formData, [field]: value };
    setFormData(next);
    onChange(next);
    if (validationErrors[field]) {
      setValidationErrors((prev) => {
        const copy = { ...prev };
        delete copy[field];
        return copy;
      });
    }
  };

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.firstName.trim()) {
      errors.firstName = 'First name is required';
    }
    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      errors.email = 'Invalid email address';
    }
    if (
      formData.personalEmail &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.personalEmail.trim())
    ) {
      errors.personalEmail = 'Invalid personal email address';
    }
    if (
      formData.ifscCode &&
      !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(formData.ifscCode.trim().toUpperCase())
    ) {
      errors.ifscCode = 'IFSC must be 11 characters (e.g. HDFC0001234)';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onSave(formData);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Stack gap="lg">
        {saveError && (
          <Alert variant="error" title="Failed to save profile changes">
            {saveError}
          </Alert>
        )}

        {/* Section 1: Personal */}
        {(activeSection === 'personal' || activeSection === 'all') && (
          <div className="bezent-profile-section-card">
            <div className="bezent-profile-section-header">
              <h3 className="bezent-profile-section-title">Personal Details & Identity</h3>
            </div>
            <FormGrid columns={3}>
              <FormField label="First Name" required error={validationErrors.firstName}>
                <Input
                  value={formData.firstName}
                  onChange={(e) => updateField('firstName', e.target.value)}
                  placeholder="First name"
                />
              </FormField>

              <FormField label="Middle Name">
                <Input
                  value={formData.middleName}
                  onChange={(e) => updateField('middleName', e.target.value)}
                  placeholder="Middle name"
                />
              </FormField>

              <FormField label="Last Name">
                <Input
                  value={formData.lastName}
                  onChange={(e) => updateField('lastName', e.target.value)}
                  placeholder="Last name"
                />
              </FormField>

              <FormField label="Preferred Name">
                <Input
                  value={formData.preferredName}
                  onChange={(e) => updateField('preferredName', e.target.value)}
                  placeholder="Preferred / display name"
                />
              </FormField>

              <FormField label="Gender">
                <Select
                  value={formData.gender}
                  onChange={(e) => updateField('gender', e.target.value)}
                  options={[
                    { value: '', label: 'Select Gender' },
                    { value: 'Male', label: 'Male' },
                    { value: 'Female', label: 'Female' },
                    { value: 'Non-Binary', label: 'Non-Binary' },
                    { value: 'Prefer not to say', label: 'Prefer not to say' },
                  ]}
                />
              </FormField>

              <FormField label="Date of Birth">
                <Input
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) => updateField('dateOfBirth', e.target.value)}
                />
              </FormField>

              <FormField label="Marital Status">
                <Select
                  value={formData.maritalStatus}
                  onChange={(e) => updateField('maritalStatus', e.target.value)}
                  options={[
                    { value: '', label: 'Select Status' },
                    { value: 'Single', label: 'Single' },
                    { value: 'Married', label: 'Married' },
                    { value: 'Divorced', label: 'Divorced' },
                    { value: 'Widowed', label: 'Widowed' },
                  ]}
                />
              </FormField>

              <FormField label="Blood Group">
                <Input
                  value={formData.bloodGroup}
                  onChange={(e) => updateField('bloodGroup', e.target.value)}
                  placeholder="e.g. O+, A+, B+"
                />
              </FormField>

              <FormField label="Nationality">
                <Input
                  value={formData.nationality}
                  onChange={(e) => updateField('nationality', e.target.value)}
                  placeholder="e.g. Indian"
                />
              </FormField>

              <FormField label="Native Language">
                <Input
                  value={formData.nativeLanguage}
                  onChange={(e) => updateField('nativeLanguage', e.target.value)}
                  placeholder="e.g. English, Tamil, Hindi"
                />
              </FormField>

              <FormField label="Father's Name">
                <Input
                  value={formData.fatherName}
                  onChange={(e) => updateField('fatherName', e.target.value)}
                  placeholder="Father's full name"
                />
              </FormField>

              <FormField label="Guardian Name">
                <Input
                  value={formData.guardianName}
                  onChange={(e) => updateField('guardianName', e.target.value)}
                  placeholder="Guardian's name (if applicable)"
                />
              </FormField>
            </FormGrid>
          </div>
        )}

        {/* Section 2: Contact */}
        {(activeSection === 'contact' || activeSection === 'all') && (
          <div className="bezent-profile-section-card">
            <div className="bezent-profile-section-header">
              <h3 className="bezent-profile-section-title">Contact & Address Information</h3>
            </div>
            <FormGrid columns={3}>
              <FormField label="Work Email" required error={validationErrors.email}>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => updateField('email', e.target.value)}
                  placeholder="work.email@company.com"
                />
              </FormField>

              <FormField label="Work Phone">
                <Input
                  value={formData.phone}
                  onChange={(e) => updateField('phone', e.target.value)}
                  placeholder="+91 98765 43210"
                />
              </FormField>

              <FormField label="Personal Email" error={validationErrors.personalEmail}>
                <Input
                  type="email"
                  value={formData.personalEmail}
                  onChange={(e) => updateField('personalEmail', e.target.value)}
                  placeholder="personal@example.com"
                />
              </FormField>

              <FormField label="Home Phone">
                <Input
                  value={formData.homePhone}
                  onChange={(e) => updateField('homePhone', e.target.value)}
                  placeholder="Home landline / mobile"
                />
              </FormField>

              <FormField label="Current Street Address">
                <Input
                  value={formData.addressStreet}
                  onChange={(e) => updateField('addressStreet', e.target.value)}
                  placeholder="Street / Flat / Door No"
                />
              </FormField>

              <FormField label="Address Line 2">
                <Input
                  value={formData.addressLine2}
                  onChange={(e) => updateField('addressLine2', e.target.value)}
                  placeholder="Area / Landmark"
                />
              </FormField>

              <FormField label="City">
                <Input
                  value={formData.addressCity}
                  onChange={(e) => updateField('addressCity', e.target.value)}
                  placeholder="City"
                />
              </FormField>

              <FormField label="District">
                <Input
                  value={formData.addressDistrict}
                  onChange={(e) => updateField('addressDistrict', e.target.value)}
                  placeholder="District"
                />
              </FormField>

              <FormField label="State / Province">
                <Input
                  value={formData.addressState}
                  onChange={(e) => updateField('addressState', e.target.value)}
                  placeholder="State"
                />
              </FormField>

              <FormField label="Postal Code">
                <Input
                  value={formData.addressPostalCode}
                  onChange={(e) => updateField('addressPostalCode', e.target.value)}
                  placeholder="PIN / Postal Code"
                />
              </FormField>

              <FormField label="Country">
                <Input
                  value={formData.addressCountry}
                  onChange={(e) => updateField('addressCountry', e.target.value)}
                  placeholder="Country"
                />
              </FormField>
            </FormGrid>
          </div>
        )}

        {/* Section 3: Payroll */}
        {(activeSection === 'payroll' || activeSection === 'all') && (
          <div className="bezent-profile-section-card">
            <div className="bezent-profile-section-header">
              <h3 className="bezent-profile-section-title">Payroll & Bank Account</h3>
            </div>
            <FormGrid columns={3}>
              <FormField label="Account Holder Name">
                <Input
                  value={formData.accountHolderName}
                  onChange={(e) => updateField('accountHolderName', e.target.value)}
                  placeholder="Name as per bank records"
                />
              </FormField>

              <FormField
                label="New Account Number"
                helperText="Leave empty to keep existing account"
              >
                <Input
                  type="password"
                  value={formData.accountNumber}
                  onChange={(e) => updateField('accountNumber', e.target.value)}
                  placeholder="Enter full account number to update"
                />
              </FormField>

              <FormField label="IFSC Code" error={validationErrors.ifscCode}>
                <Input
                  value={formData.ifscCode}
                  onChange={(e) => updateField('ifscCode', e.target.value.toUpperCase())}
                  placeholder="11-character IFSC code"
                />
              </FormField>

              <FormField label="Bank Name">
                <Input
                  value={formData.bankName}
                  onChange={(e) => updateField('bankName', e.target.value)}
                  placeholder="Bank name"
                />
              </FormField>

              <FormField label="Branch Name">
                <Input
                  value={formData.branchName}
                  onChange={(e) => updateField('branchName', e.target.value)}
                  placeholder="Branch location"
                />
              </FormField>

              <FormField label="Bank City / Location">
                <Input
                  value={formData.bankLocation}
                  onChange={(e) => updateField('bankLocation', e.target.value)}
                  placeholder="City / Region"
                />
              </FormField>
            </FormGrid>
          </div>
        )}

        {/* Bottom Form Actions */}
        <Inline gap="md" justify="end">
          <Button variant="outline" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" loading={saving}>
            Save Changes
          </Button>
        </Inline>
      </Stack>
    </form>
  );
}
