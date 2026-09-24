import { useState, useMemo } from 'react';
import {
  FormSection,
  FormGrid,
  FormField,
  Input,
  Select,
  Button,
  Badge,
  Card,
  CardTitle,
  Label,
  Switch,
  Stack,
  Inline,
  Grid,
} from '../../../../design-system';

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
  { value: 'Other', label: 'Other / Add New' },
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
  { value: 'Other', label: 'Other / Add New' },
];

const PAYMENT_FREQUENCY_OPTIONS = [
  { value: 'Monthly', label: 'Monthly' },
  { value: 'Weekly', label: 'Weekly' },
  { value: 'Bi-weekly', label: 'Bi-weekly' },
  { value: 'Other', label: 'Other' },
];

const TAX_REGIME_OPTIONS = [
  { value: 'New Tax Regime', label: 'New Tax Regime (Default Sec 115BAC)' },
  { value: 'Old Tax Regime', label: 'Old Tax Regime (With Deductions)' },
  { value: 'Not Applicable', label: 'Not Applicable' },
];

const BENEFIT_ITEMS = [
  { id: 'medical', label: 'Medical Insurance' },
  { id: 'life', label: 'Life Insurance' },
  { id: 'accident', label: 'Accident Coverage' },
  { id: 'gratuityEligible', label: 'Gratuity Eligible' },
  { id: 'bonusEligible', label: 'Bonus Eligible' },
  { id: 'incentiveEligible', label: 'Incentive Eligible' },
  { id: 'travel', label: 'Travel Allowance' },
  { id: 'mobile', label: 'Mobile Reimbursement' },
  { id: 'internet', label: 'Internet Allowance' },
  { id: 'meal', label: 'Meal Vouchers' },
  { id: 'wfh', label: 'WFH Allowance' },
  { id: 'vehicle', label: 'Company Vehicle' },
];

export function AccountsSection() {
  // A. BANK DETAILS STATE
  const [ifscCode, setIfscCode] = useState('HDFC0001234');
  const [bankName, setBankName] = useState('HDFC Bank Ltd');
  const [branchName, setBranchName] = useState('T. Nagar Branch');
  const [bankLocation, setBankLocation] = useState('Chennai, Tamil Nadu');
  const [isBankNameEditable, setIsBankNameEditable] = useState(false);
  const [accountHolderName, setAccountHolderName] = useState('Arun Kumar');
  const [accountNumber, setAccountNumber] = useState('50100234567891');
  const [reAccountNumber, setReAccountNumber] = useState('50100234567891');
  const [ifscStatusMsg, setIfscStatusMsg] = useState('Bank details auto-populated from IFSC code.');

  // IFSC Automation
  const handleIfscChange = (code: string) => {
    const cleanCode = code.toUpperCase().trim();
    setIfscCode(cleanCode);

    if (cleanCode.length === 11) {
      const info = IFSC_DATABASE[cleanCode];
      if (info) {
        setBankName(info.bankName);
        setBranchName(info.branchName);
        setBankLocation(info.location);
        setIfscStatusMsg(`✅ ${info.bankName} - ${info.branchName} (${info.location}) verified.`);
      } else {
        setBankName('HDFC Bank Ltd');
        setBranchName('Main Corporate Branch');
        setBankLocation('Metro Area');
        setIfscStatusMsg('ℹ️ Custom/Valid IFSC format detected.');
      }
    } else {
      setIfscStatusMsg('Enter 11-digit IFSC code (e.g. HDFC0001234, SBIN0004321)');
    }
  };

  const accountMismatchError = useMemo(() => {
    if (!reAccountNumber) return '';
    return accountNumber !== reAccountNumber ? '⚠️ Account numbers do not match.' : '';
  }, [accountNumber, reAccountNumber]);

  // B. SALARY STRUCTURE STATE
  const [salaryStructure, setSalaryStructure] = useState('Standard IT Professional Structure');
  const [customSalaryStructure, setCustomSalaryStructure] = useState('');
  const [payGrade, setPayGrade] = useState('L2 - Mid Level');
  const [annualCtc, setAnnualCtc] = useState('1200000');
  const [variablePayType, setVariablePayType] = useState<'amount' | 'percentage'>('percentage');
  const [variablePayVal, setVariablePayVal] = useState('10'); // 10%

  // AUTOMATED SALARY COMPONENTS CALCULATION
  const salaryCalculations = useMemo(() => {
    const ctc = parseFloat(annualCtc) || 0;
    const monthlyCtc = ctc / 12;

    const basicMonthly = Math.round(monthlyCtc * 0.5); // 50% Basic
    const hraMonthly = Math.round(basicMonthly * 0.4); // 40% HRA
    const pfMonthly = Math.round(Math.min(basicMonthly, 15000) * 0.12); // PF 12%
    const gratuityMonthly = Math.round(basicMonthly * 0.0481); // Gratuity 4.81%

    let variableMonthly = 0;
    if (variablePayType === 'percentage') {
      variableMonthly = Math.round((monthlyCtc * (parseFloat(variablePayVal) || 0)) / 100);
    } else {
      variableMonthly = Math.round((parseFloat(variablePayVal) || 0) / 12);
    }

    const otherAllowancesMonthly = 2500; // Fixed Conveyance / Medical allowance
    const specialAllowanceMonthly = Math.max(
      0,
      Math.round(
        monthlyCtc -
          (basicMonthly +
            hraMonthly +
            otherAllowancesMonthly +
            variableMonthly +
            pfMonthly +
            gratuityMonthly),
      ),
    );

    const grossMonthly =
      basicMonthly +
      hraMonthly +
      specialAllowanceMonthly +
      otherAllowancesMonthly +
      variableMonthly;

    return {
      monthlyCtc: Math.round(monthlyCtc),
      basicMonthly,
      hraMonthly,
      specialAllowanceMonthly,
      otherAllowancesMonthly,
      variableMonthly,
      grossMonthly,
      pfMonthly,
      gratuityMonthly,
    };
  }, [annualCtc, variablePayType, variablePayVal]);

  // C. PAYROLL SETUP STATE
  const [payrollGroup, setPayrollGroup] = useState('Core Engineering Payroll');
  const [customPayrollGroup, setCustomPayrollGroup] = useState('');
  const [salaryEffectiveDate, setSalaryEffectiveDate] = useState('2026-04-01');
  const [paymentFrequency, setPaymentFrequency] = useState('Monthly');
  const [customPaymentFrequency, setCustomPaymentFrequency] = useState('');

  // D. STATUTORY STATE
  const [isPfApplicable, setIsPfApplicable] = useState(true);
  const [isEsiApplicable, setIsEsiApplicable] = useState(false);
  const [isPtApplicable, setIsPtApplicable] = useState(true);
  const [taxRegime, setTaxRegime] = useState('New Tax Regime');

  // E. BENEFITS STATE
  const [benefits, setBenefits] = useState({
    medical: true,
    life: true,
    accident: true,
    gratuityEligible: true,
    bonusEligible: true,
    incentiveEligible: true,
    travel: false,
    mobile: true,
    internet: true,
    meal: false,
    wfh: true,
    vehicle: false,
  });

  // Medical Details (Shown ONLY when Medical = true)
  const [insuranceProvider, setInsuranceProvider] = useState('Star Health & Allied Insurance');
  const [policyNumber, setPolicyNumber] = useState('BEZENT-MED-2026-0891');
  const [coverageAmount, setCoverageAmount] = useState('₹500,000');
  const [medicalEffectiveDate, setMedicalEffectiveDate] = useState('2026-04-01');
  const [medicalExpiryDate, setMedicalExpiryDate] = useState('2027-03-31');

  const toggleBenefit = (key: keyof typeof benefits) => {
    setBenefits((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <Stack gap="xl">
      {/* A. BANK DETAILS */}
      <FormSection
        title="Bank Details"
        description="Bank account information and IFSC verification."
      >
        <FormGrid columns={2} layout="horizontal" labelWidth="md">
          {/* 1. IFSC Code */}
          <FormField label="IFSC Code" required helperText={ifscStatusMsg}>
            <Input
              type="text"
              placeholder="e.g. HDFC0001234"
              maxLength={11}
              value={ifscCode}
              onChange={(e) => handleIfscChange(e.target.value)}
            />
          </FormField>

          {/* 2. Bank Name */}
          <FormField label="Bank Name" required>
            <Inline gap="xs" align="center">
              <Input
                type="text"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                readOnly={!isBankNameEditable}
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setIsBankNameEditable(!isBankNameEditable)}
              >
                {isBankNameEditable ? 'Lock' : 'Edit'}
              </Button>
            </Inline>
          </FormField>

          {/* 3. Branch Name */}
          <FormField label="Branch Name" helperText={bankLocation}>
            <Input type="text" value={branchName} readOnly />
          </FormField>

          {/* 4. Account Holder Name */}
          <FormField label="Account Holder" required>
            <Input
              type="text"
              value={accountHolderName}
              onChange={(e) => setAccountHolderName(e.target.value)}
            />
          </FormField>

          {/* 5. Account Number */}
          <FormField label="Account Number" required>
            <Input
              type="text"
              placeholder="Enter bank account number"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
            />
          </FormField>

          {/* 6. Re-enter Account Number */}
          <FormField label="Re-enter Account" required error={accountMismatchError}>
            <Input
              type="text"
              placeholder="Re-enter bank account number"
              value={reAccountNumber}
              onChange={(e) => setReAccountNumber(e.target.value)}
            />
          </FormField>
        </FormGrid>
      </FormSection>

      {/* B. SALARY STRUCTURE & BREAKDOWN */}
      <FormSection
        title="Salary Structure & Breakdown"
        description="Annual CTC, pay grade, and automated monthly salary component breakdown."
      >
        <Stack gap="md">
          <FormGrid columns={2} layout="horizontal" labelWidth="md">
            {/* 1. Salary Structure */}
            <FormField label="Salary Structure" required>
              <Stack gap="xs">
                <Select
                  options={SALARY_STRUCTURE_OPTIONS}
                  value={salaryStructure}
                  onChange={(e) => setSalaryStructure(e.target.value)}
                />
                {salaryStructure === 'Other' && (
                  <Input
                    type="text"
                    placeholder="Enter Custom Salary Structure"
                    value={customSalaryStructure}
                    onChange={(e) => setCustomSalaryStructure(e.target.value)}
                  />
                )}
              </Stack>
            </FormField>

            {/* 2. Pay Grade */}
            <FormField label="Pay Grade" required>
              <Select
                options={PAY_GRADE_OPTIONS}
                value={payGrade}
                onChange={(e) => setPayGrade(e.target.value)}
              />
            </FormField>

            {/* 3. Annual CTC */}
            <FormField
              label="Annual CTC (₹)"
              required
              helperText={`Monthly CTC: ₹${salaryCalculations.monthlyCtc.toLocaleString('en-IN')}`}
            >
              <Input
                type="number"
                min="0"
                placeholder="e.g. 1200000"
                value={annualCtc}
                onChange={(e) => setAnnualCtc(e.target.value)}
              />
            </FormField>

            {/* 4. Variable Pay */}
            <FormField label="Variable Pay">
              <Inline gap="xs" align="center">
                <Input
                  type="number"
                  value={variablePayVal}
                  onChange={(e) => setVariablePayVal(e.target.value)}
                />
                <Select
                  options={[
                    { value: 'percentage', label: '%' },
                    { value: 'amount', label: '₹/Yr' },
                  ]}
                  value={variablePayType}
                  onChange={(e) => setVariablePayType(e.target.value as 'amount' | 'percentage')}
                />
              </Inline>
            </FormField>
          </FormGrid>

          {/* CALCULATED BREAKDOWN */}
          <Card variant="flat">
            <Stack gap="md">
              <Inline justify="between" align="center">
                <CardTitle>Monthly Salary Components Breakdown</CardTitle>
                <Badge variant="neutral" size="sm">
                  Auto-calculated
                </Badge>
              </Inline>

              <Grid columns={4} gap="md">
                <Card variant="flat" padding="sm">
                  <Stack gap="xs">
                    <Label size="sm">Basic Salary (Monthly)</Label>
                    <CardTitle>
                      ₹{salaryCalculations.basicMonthly.toLocaleString('en-IN')}
                    </CardTitle>
                  </Stack>
                </Card>
                <Card variant="flat" padding="sm">
                  <Stack gap="xs">
                    <Label size="sm">HRA (Monthly)</Label>
                    <CardTitle>₹{salaryCalculations.hraMonthly.toLocaleString('en-IN')}</CardTitle>
                  </Stack>
                </Card>
                <Card variant="flat" padding="sm">
                  <Stack gap="xs">
                    <Label size="sm">Special Allowance</Label>
                    <CardTitle>
                      ₹{salaryCalculations.specialAllowanceMonthly.toLocaleString('en-IN')}
                    </CardTitle>
                  </Stack>
                </Card>
                <Card variant="flat" padding="sm">
                  <Stack gap="xs">
                    <Label size="sm">Other Allowances</Label>
                    <CardTitle>
                      ₹{salaryCalculations.otherAllowancesMonthly.toLocaleString('en-IN')}
                    </CardTitle>
                  </Stack>
                </Card>
                <Card variant="flat" padding="sm">
                  <Stack gap="xs">
                    <Label size="sm">Gross Salary (Monthly)</Label>
                    <CardTitle>
                      ₹{salaryCalculations.grossMonthly.toLocaleString('en-IN')}
                    </CardTitle>
                  </Stack>
                </Card>
                <Card variant="flat" padding="sm">
                  <Stack gap="xs">
                    <Label size="sm">Employer PF Contribution</Label>
                    <CardTitle>₹{salaryCalculations.pfMonthly.toLocaleString('en-IN')}</CardTitle>
                  </Stack>
                </Card>
                <Card variant="flat" padding="sm">
                  <Stack gap="xs">
                    <Label size="sm">Gratuity Provision</Label>
                    <CardTitle>
                      ₹{salaryCalculations.gratuityMonthly.toLocaleString('en-IN')}
                    </CardTitle>
                  </Stack>
                </Card>
                <Card variant="flat" padding="sm">
                  <Stack gap="xs">
                    <Label size="sm">Variable Component</Label>
                    <CardTitle>
                      ₹{salaryCalculations.variableMonthly.toLocaleString('en-IN')}
                    </CardTitle>
                  </Stack>
                </Card>
              </Grid>
            </Stack>
          </Card>
        </Stack>
      </FormSection>

      {/* C. PAYROLL SETUP & D. STATUTORY */}
      <FormSection
        title="Payroll Setup & Statutory Compliance"
        description="Payroll disbursement frequency, tax regime, and statutory requirements."
      >
        <FormGrid columns={2} layout="horizontal" labelWidth="md">
          {/* 1. Payroll Group */}
          <FormField label="Payroll Group">
            <Stack gap="xs">
              <Select
                options={PAYROLL_GROUP_OPTIONS}
                value={payrollGroup}
                onChange={(e) => setPayrollGroup(e.target.value)}
              />
              {payrollGroup === 'Other' && (
                <Input
                  type="text"
                  placeholder="Enter Payroll Group"
                  value={customPayrollGroup}
                  onChange={(e) => setCustomPayrollGroup(e.target.value)}
                />
              )}
            </Stack>
          </FormField>

          {/* 2. Salary Effective Date */}
          <FormField label="Effective Date">
            <Input
              type="date"
              value={salaryEffectiveDate}
              onChange={(e) => setSalaryEffectiveDate(e.target.value)}
            />
          </FormField>

          {/* 3. Payment Frequency */}
          <FormField label="Payment Frequency">
            <Stack gap="xs">
              <Select
                options={PAYMENT_FREQUENCY_OPTIONS}
                value={paymentFrequency}
                onChange={(e) => setPaymentFrequency(e.target.value)}
              />
              {paymentFrequency === 'Other' && (
                <Input
                  type="text"
                  placeholder="Enter Payment Frequency"
                  value={customPaymentFrequency}
                  onChange={(e) => setCustomPaymentFrequency(e.target.value)}
                />
              )}
            </Stack>
          </FormField>

          {/* 4. TDS & Tax Regime */}
          <FormField label="TDS Tax Regime">
            <Select
              options={TAX_REGIME_OPTIONS}
              value={taxRegime}
              onChange={(e) => setTaxRegime(e.target.value)}
            />
          </FormField>

          {/* 5. PF Applicable */}
          <FormField label="Provident Fund (PF)">
            <Switch
              checked={isPfApplicable}
              onChange={(e) => setIsPfApplicable(e.target.checked)}
              label="12% Contribution Applicable"
            />
          </FormField>

          {/* 6. ESI Applicable */}
          <FormField label="ESI Applicable">
            <Switch
              checked={isEsiApplicable}
              onChange={(e) => setIsEsiApplicable(e.target.checked)}
              label="Employees State Insurance"
            />
          </FormField>

          {/* 7. PT Applicable */}
          <FormField label="Professional Tax (PT)">
            <Switch
              checked={isPtApplicable}
              onChange={(e) => setIsPtApplicable(e.target.checked)}
              label="State PT Deduction"
            />
          </FormField>
        </FormGrid>
      </FormSection>

      {/* E. BENEFITS */}
      <FormSection
        title="Employee Benefits Checklist"
        description="Select applicable employee allowances, insurances, and corporate benefits."
      >
        <Stack gap="md">
          <Grid columns={3} gap="md">
            {BENEFIT_ITEMS.map((b) => {
              const key = b.id as keyof typeof benefits;
              return (
                <Card key={b.id} variant="flat">
                  <Switch
                    checked={benefits[key]}
                    onChange={() => toggleBenefit(key)}
                    label={b.label}
                  />
                </Card>
              );
            })}
          </Grid>

          {/* CONDITIONAL MEDICAL INSURANCE DETAILS */}
          {benefits.medical && (
            <Card variant="flat">
              <Stack gap="md">
                <CardTitle>Medical Insurance Policy Details</CardTitle>
                <FormGrid columns={2} layout="horizontal" labelWidth="md">
                  <FormField label="Provider">
                    <Input
                      type="text"
                      value={insuranceProvider}
                      onChange={(e) => setInsuranceProvider(e.target.value)}
                    />
                  </FormField>
                  <FormField label="Policy Number">
                    <Input
                      type="text"
                      value={policyNumber}
                      onChange={(e) => setPolicyNumber(e.target.value)}
                    />
                  </FormField>
                  <FormField label="Coverage Amount">
                    <Input
                      type="text"
                      value={coverageAmount}
                      onChange={(e) => setCoverageAmount(e.target.value)}
                    />
                  </FormField>
                  <FormField label="Effective Date">
                    <Input
                      type="date"
                      value={medicalEffectiveDate}
                      onChange={(e) => setMedicalEffectiveDate(e.target.value)}
                    />
                  </FormField>
                  <FormField label="Expiry Date">
                    <Input
                      type="date"
                      value={medicalExpiryDate}
                      onChange={(e) => setMedicalExpiryDate(e.target.value)}
                    />
                  </FormField>
                </FormGrid>
              </Stack>
            </Card>
          )}
        </Stack>
      </FormSection>
    </Stack>
  );
}
