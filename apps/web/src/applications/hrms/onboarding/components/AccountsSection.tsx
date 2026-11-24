import { useState, useMemo } from 'react';
import {
  FormSection,
  FormGrid,
  Input,
  Select,
  Checkbox,
  Button,
  IconButton,
  Card,
  Inline,
  Stack,
} from '../../../../design-system/components';
import { BezentIcon } from '../../../../design-system/icons';

import { RegistrationField, useRegistrationConfig } from '../registration/registrationConfig';
import type { RegistrationFieldConfig } from '../../settings/api/registrationSettingsApi';
import type { ResolvedFormField } from '../../settings/api/formsApi';
import { getGroupsForSection } from '../../settings/administration/forms/types';
import type { Chapter06AccountsState } from '../types/registration.types';

interface BankInfo {
  bankName: string;
  branchName: string;
  location: string;
}

const IFSC_DATABASE: Record<string, BankInfo> = {
  HDFC0001234: {
    bankName: 'HDFC Bank Ltd',
    branchName: 'T. Nagar Branch',
    location: 'Chennai, Tamil Nadu',
  },
  SBIN0004321: {
    bankName: 'State Bank of India',
    branchName: 'Nungambakkam Branch',
    location: 'Chennai, Tamil Nadu',
  },
  ICIC0000011: {
    bankName: 'ICICI Bank',
    branchName: 'M.G. Road Branch',
    location: 'Bengaluru, Karnataka',
  },
  UTIB0000204: {
    bankName: 'Axis Bank',
    branchName: 'Anna Salai Branch',
    location: 'Chennai, Tamil Nadu',
  },
};

const SALARY_STRUCTURE_OPTIONS = [
  { value: 'Standard IT Professional Structure', label: 'Standard IT Professional Structure' },
  { value: 'Executive Management Structure', label: 'Executive Management Structure' },
  { value: 'Sales & Commission Structure', label: 'Sales & Commission Structure' },
  { value: 'Other', label: 'Other' },
];

const PAY_GRADE_OPTIONS = [
  { value: 'L1 - Entry Level', label: 'L1 - Entry Level' },
  { value: 'L2 - Mid Level', label: 'L2 - Mid Level' },
  { value: 'L3 - Senior Specialist', label: 'L3 - Senior Specialist' },
  { value: 'L4 - Lead / Manager', label: 'L4 - Lead / Manager' },
  { value: 'L5 - Executive', label: 'L5 - Executive' },
];

const PAYROLL_GROUP_OPTIONS = [
  { value: 'Core Engineering Payroll', label: 'Core Engineering Payroll' },
  { value: 'Executive Payroll', label: 'Executive Payroll' },
  { value: 'Contractor Payroll', label: 'Contractor Payroll' },
];

const PAYMENT_FREQUENCY_OPTIONS = [
  { value: 'Monthly', label: 'Monthly' },
  { value: 'Weekly', label: 'Weekly' },
  { value: 'Bi-weekly', label: 'Bi-weekly' },
];

const TAX_REGIME_OPTIONS = [
  { value: 'New Tax Regime', label: 'New Tax Regime (Default Sec 115BAC)' },
  { value: 'Old Tax Regime', label: 'Old Tax Regime (With Deductions)' },
];

type BankAccount = NonNullable<Chapter06AccountsState['bankAccount']>;
type SalaryDetails = NonNullable<Chapter06AccountsState['salaryDetails']>;
type StatutoryDetails = NonNullable<Chapter06AccountsState['statutoryDetails']>;

const EMPTY_BANK_ACCOUNT: BankAccount = {
  accountHolderName: '',
  accountNumber: '',
  reEnterAccountNumber: '',
  ifscCode: '',
  bankName: '',
  branchName: '',
  bankLocation: '',
};

export interface GradeOption {
  id: string;
  name: string;
}

const toGradeOptions = (items?: GradeOption[]) =>
  items && items.length > 0
    ? [...items.map((i) => ({ value: i.name, label: i.name })), { value: 'other', label: 'Other' }]
    : null;

export interface AccountsSectionProps {
  value?: Chapter06AccountsState;
  onChange?: (updated: Chapter06AccountsState) => void;
  /** Real Grade master data (from GET /hrms/workforce/grades); Pay Grade falls back to a static list when absent. */
  grades?: GradeOption[];
}

export function AccountsSection({ value, onChange, grades }: AccountsSectionProps = {}) {
  const bankAccount = value?.bankAccount ?? null;
  const salaryDetails = value?.salaryDetails ?? null;
  const statutoryDetails = value?.statutoryDetails ?? null;

  const ifscCode = bankAccount?.ifscCode ?? '';
  const bankName = bankAccount?.bankName ?? '';
  const branchName = bankAccount?.branchName ?? '';
  const bankLocation = bankAccount?.bankLocation ?? '';
  const accountHolderName = bankAccount?.accountHolderName ?? '';
  const accountNumber = bankAccount?.accountNumber ?? '';
  const reAccountNumber = bankAccount?.reEnterAccountNumber ?? '';

  const salaryStructure = salaryDetails?.salaryStructure ?? '';
  const payGrade = salaryDetails?.payGrade ?? '';
  const annualCtc = salaryDetails?.annualCtc;
  const payrollGroup = salaryDetails?.payrollGroup ?? '';
  const salaryEffectiveDate = salaryDetails?.salaryEffectiveDate ?? '';
  const paymentFrequency = salaryDetails?.paymentFrequency ?? '';

  const isPfApplicable = statutoryDetails?.pfApplicable ?? false;
  const isEsiApplicable = statutoryDetails?.esiApplicable ?? false;
  const isPtApplicable = statutoryDetails?.ptApplicable ?? false;
  const taxRegime = statutoryDetails?.taxRegime ?? '';

  // Local-only UI state (never part of the persisted record).
  const [isBankNameEditable, setIsBankNameEditable] = useState(false);
  const [showAccountNumber, setShowAccountNumber] = useState(false);
  const [showReAccountNumber, setShowReAccountNumber] = useState(false);

  const updateBankAccount = (patch: Partial<BankAccount>) => {
    onChange?.({
      bankAccount: { ...EMPTY_BANK_ACCOUNT, ...bankAccount, ...patch },
      salaryDetails,
      statutoryDetails,
    });
  };

  const updateSalaryDetails = (patch: Partial<SalaryDetails>) => {
    onChange?.({
      bankAccount,
      salaryDetails: { ...salaryDetails, ...patch },
      statutoryDetails,
    });
  };

  const updateStatutoryDetails = (patch: Partial<StatutoryDetails>) => {
    onChange?.({
      bankAccount,
      salaryDetails,
      statutoryDetails: { ...statutoryDetails, ...patch },
    });
  };

  // IFSC Automation
  const handleIfscChange = (code: string) => {
    const cleanCode = code.toUpperCase().trim();

    if (cleanCode.length === 11) {
      const info = IFSC_DATABASE[cleanCode];
      if (info) {
        updateBankAccount({
          ifscCode: cleanCode,
          bankName: info.bankName,
          branchName: info.branchName,
          bankLocation: info.location,
        });
        return;
      }
      updateBankAccount({
        ifscCode: cleanCode,
        bankName: 'HDFC Bank Ltd',
        branchName: 'Main Corporate Branch',
        bankLocation: 'Metro Area',
      });
      return;
    }
    updateBankAccount({ ifscCode: cleanCode });
  };

  const ifscLookupMessage = useMemo(() => {
    if (ifscCode.length !== 11) {
      return 'Enter 11-digit IFSC code (e.g. HDFC0001234, SBIN0004321)';
    }
    const info = IFSC_DATABASE[ifscCode];
    return info
      ? `✅ ${info.bankName} - ${info.branchName} (${info.location}) verified.`
      : 'ℹ️ Custom/Valid IFSC format detected.';
  }, [ifscCode]);

  const accountMismatchError = useMemo(() => {
    if (!reAccountNumber) return '';
    return accountNumber !== reAccountNumber ? '⚠️ Account numbers do not match.' : '';
  }, [accountNumber, reAccountNumber]);

  const config = useRegistrationConfig();

  const accountsFields = useMemo(() => {
    const fields = config.fields.filter((f) => f.section === 'accounts' && f.enabled);
    return [...fields].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, [config.fields]);

  const groups = useMemo(() => {
    return getGroupsForSection(
      'accounts',
      accountsFields as unknown as ResolvedFormField[],
      config.metadata,
    );
  }, [accountsFields, config.metadata]);

  const renderField = (field: RegistrationFieldConfig) => {
    const { key, width, config: fConfig } = field;
    const span = width === 'full' ? 'full' : undefined;
    const configuredOptions = Array.isArray(fConfig?.options)
      ? (fConfig.options as Array<{ value: string; label: string }>)
      : undefined;

    switch (key) {
      case 'accounts.ifscCode':
        return (
          <RegistrationField
            key={key}
            fieldKey={key}
            value={ifscCode}
            htmlFor="acc-ifsc-code"
            span={span}
            helperText={ifscLookupMessage}
          >
            <Input
              id="acc-ifsc-code"
              type="text"
              maxLength={11}
              value={ifscCode}
              onChange={(e) => handleIfscChange(e.target.value)}
            />
          </RegistrationField>
        );

      case 'accounts.bankName':
        return (
          <RegistrationField
            key={key}
            fieldKey={key}
            value={bankName}
            htmlFor="acc-bank-name"
            span={span}
          >
            <Inline gap="xs" align="center">
              <Input
                id="acc-bank-name"
                type="text"
                value={bankName}
                readOnly={!isBankNameEditable}
                onChange={(e) => updateBankAccount({ bankName: e.target.value })}
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setIsBankNameEditable((editable) => !editable)}
              >
                {isBankNameEditable ? 'Lock' : 'Edit'}
              </Button>
            </Inline>
          </RegistrationField>
        );

      case 'accounts.branchName':
        return (
          <RegistrationField
            key={key}
            fieldKey={key}
            value={branchName}
            htmlFor="acc-branch-name"
            span={span}
            helperText={bankLocation || undefined}
          >
            <Input id="acc-branch-name" type="text" value={branchName} readOnly />
          </RegistrationField>
        );

      case 'accounts.accountHolder':
        return (
          <RegistrationField
            key={key}
            fieldKey={key}
            value={accountHolderName}
            htmlFor="acc-account-holder"
            span={span}
          >
            <Input
              id="acc-account-holder"
              type="text"
              value={accountHolderName}
              onChange={(e) => updateBankAccount({ accountHolderName: e.target.value })}
            />
          </RegistrationField>
        );

      case 'accounts.accountNumber':
        return (
          <RegistrationField
            key={key}
            fieldKey={key}
            value={accountNumber}
            htmlFor="acc-account-number"
            span={span}
            helperText="Confidential · Stored securely and masked in API outputs"
          >
            <Inline gap="xs" align="center">
              <Input
                id="acc-account-number"
                type={showAccountNumber ? 'text' : 'password'}
                placeholder="Enter bank account number"
                value={accountNumber}
                onChange={(e) => updateBankAccount({ accountNumber: e.target.value })}
              />
              <IconButton
                type="button"
                label={showAccountNumber ? 'Hide account number' : 'Show account number'}
                onClick={() => setShowAccountNumber((prev) => !prev)}
              >
                <BezentIcon name={showAccountNumber ? 'eye' : 'lock'} size={16} />
              </IconButton>
            </Inline>
          </RegistrationField>
        );

      case 'accounts.reAccountNumber':
        return (
          <RegistrationField
            key={key}
            fieldKey={key}
            value={reAccountNumber}
            htmlFor="acc-re-account-number"
            span={span}
            error={accountMismatchError || undefined}
            helperText={
              accountMismatchError
                ? undefined
                : 'Confidential · Manual re-entry required for verification'
            }
          >
            <Inline gap="xs" align="center">
              <Input
                id="acc-re-account-number"
                type={showReAccountNumber ? 'text' : 'password'}
                placeholder="Re-enter bank account number"
                value={reAccountNumber}
                onPaste={(e) => {
                  e.preventDefault();
                }}
                onChange={(e) => updateBankAccount({ reEnterAccountNumber: e.target.value })}
              />
              <IconButton
                type="button"
                label={
                  showReAccountNumber
                    ? 'Hide re-entered account number'
                    : 'Show re-entered account number'
                }
                onClick={() => setShowReAccountNumber((prev) => !prev)}
              >
                <BezentIcon name={showReAccountNumber ? 'eye' : 'lock'} size={16} />
              </IconButton>
            </Inline>
          </RegistrationField>
        );

      case 'accounts.salaryStructure':
        return (
          <RegistrationField
            key={key}
            fieldKey={key}
            value={salaryStructure}
            htmlFor="acc-salary-structure"
            span={span}
          >
            <Select
              id="acc-salary-structure"
              value={salaryStructure}
              onChange={(e) => updateSalaryDetails({ salaryStructure: e.target.value })}
              options={configuredOptions || SALARY_STRUCTURE_OPTIONS}
            />
          </RegistrationField>
        );

      case 'accounts.payGrade':
        return (
          <RegistrationField
            key={key}
            fieldKey={key}
            value={payGrade}
            htmlFor="acc-pay-grade"
            span={span}
          >
            <Select
              id="acc-pay-grade"
              value={payGrade}
              onChange={(e) => updateSalaryDetails({ payGrade: e.target.value })}
              options={(() => {
                const baseOptions =
                  configuredOptions || toGradeOptions(grades) || PAY_GRADE_OPTIONS;
                if (payGrade && !baseOptions.some((o) => o.value === payGrade)) {
                  return [{ value: payGrade, label: payGrade }, ...baseOptions];
                }
                return baseOptions;
              })()}
            />
          </RegistrationField>
        );

      case 'accounts.annualCtc':
        return (
          <RegistrationField
            key={key}
            fieldKey={key}
            value={annualCtc ?? ''}
            htmlFor="acc-annual-ctc"
            span={span}
          >
            <Input
              id="acc-annual-ctc"
              type="number"
              min="0"
              value={annualCtc !== undefined ? String(annualCtc) : ''}
              onChange={(e) =>
                updateSalaryDetails({
                  annualCtc: e.target.value === '' ? undefined : Number(e.target.value),
                })
              }
            />
          </RegistrationField>
        );

      case 'accounts.payrollGroup':
        return (
          <RegistrationField
            key={key}
            fieldKey={key}
            value={payrollGroup}
            htmlFor="acc-payroll-group"
            span={span}
          >
            <Select
              id="acc-payroll-group"
              value={payrollGroup}
              onChange={(e) => updateSalaryDetails({ payrollGroup: e.target.value })}
              options={configuredOptions || PAYROLL_GROUP_OPTIONS}
            />
          </RegistrationField>
        );

      case 'accounts.salaryEffectiveDate':
        return (
          <RegistrationField
            key={key}
            fieldKey={key}
            value={salaryEffectiveDate}
            htmlFor="acc-salary-effective-date"
            span={span}
          >
            <Input
              id="acc-salary-effective-date"
              type="date"
              value={salaryEffectiveDate}
              onChange={(e) => updateSalaryDetails({ salaryEffectiveDate: e.target.value })}
            />
          </RegistrationField>
        );

      case 'accounts.paymentFrequency':
        return (
          <RegistrationField
            key={key}
            fieldKey={key}
            value={paymentFrequency}
            htmlFor="acc-payment-frequency"
            span={span}
          >
            <Select
              id="acc-payment-frequency"
              value={paymentFrequency}
              onChange={(e) => updateSalaryDetails({ paymentFrequency: e.target.value })}
              options={configuredOptions || PAYMENT_FREQUENCY_OPTIONS}
            />
          </RegistrationField>
        );

      case 'accounts.isPfApplicable':
        return (
          <RegistrationField
            key={key}
            fieldKey={key}
            value={isPfApplicable}
            hideLabel
            orientation="vertical"
            span="full"
          >
            <Checkbox
              id="acc-pf-applicable"
              label={field.label}
              checked={isPfApplicable}
              onChange={(e) => updateStatutoryDetails({ pfApplicable: e.target.checked })}
            />
          </RegistrationField>
        );

      case 'accounts.isEsiApplicable':
        return (
          <RegistrationField
            key={key}
            fieldKey={key}
            value={isEsiApplicable}
            hideLabel
            orientation="vertical"
            span="full"
          >
            <Checkbox
              id="acc-esi-applicable"
              label={field.label}
              checked={isEsiApplicable}
              onChange={(e) => updateStatutoryDetails({ esiApplicable: e.target.checked })}
            />
          </RegistrationField>
        );

      case 'accounts.isPtApplicable':
        return (
          <RegistrationField
            key={key}
            fieldKey={key}
            value={isPtApplicable}
            hideLabel
            orientation="vertical"
            span="full"
          >
            <Checkbox
              id="acc-pt-applicable"
              label={field.label}
              checked={isPtApplicable}
              onChange={(e) => updateStatutoryDetails({ ptApplicable: e.target.checked })}
            />
          </RegistrationField>
        );

      case 'accounts.taxRegime':
        return (
          <RegistrationField
            key={key}
            fieldKey={key}
            value={taxRegime}
            htmlFor="acc-tax-regime"
            span={span}
          >
            <Select
              id="acc-tax-regime"
              value={taxRegime}
              onChange={(e) => updateStatutoryDetails({ taxRegime: e.target.value })}
              options={configuredOptions || TAX_REGIME_OPTIONS}
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
