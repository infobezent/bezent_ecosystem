import { useState, useMemo } from 'react';
import { BezentIcon } from '../../../../design-system/icons';

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
    <div className="accounts-section">
      {/* Banner Header */}
      <div className="employee-registration__section-header">
        <div className="employee-registration__section-icon-badge">
          <BezentIcon name="documents" size={22} />
        </div>
        <div className="employee-registration__section-title-group">
          <h2 className="employee-registration__section-title">Accounts &amp; Payroll</h2>
          <p className="employee-registration__section-subtitle">
            Bank details, automated salary structure, statutory compliance and benefits.
          </p>
        </div>
      </div>

      <div className="accounts-section__container">
        {/* ================================================== */}
        {/* A. BANK DETAILS */}
        {/* ================================================== */}
        <div className="accounts-section__card">
          <div className="accounts-section__card-header">
            <span className="accounts-section__sub-badge">SUBSECTION A</span>
            <h3 className="accounts-section__card-title">Bank Details</h3>
          </div>

          <form className="accounts-section__grid" onSubmit={(e) => e.preventDefault()}>
            {/* 1. IFSC Code */}
            <div className="employee-registration__field">
              <label className="employee-registration__label">
                IFSC Code <span className="employee-registration__required">*</span>
              </label>
              <input
                type="text"
                className="employee-registration__input uppercase"
                placeholder="e.g. HDFC0001234"
                maxLength={11}
                value={ifscCode}
                onChange={(e) => handleIfscChange(e.target.value)}
              />
              <span className="accounts-section__helper-text">{ifscStatusMsg}</span>
            </div>

            {/* 2. Bank Name */}
            <div className="employee-registration__field">
              <div className="accounts-section__label-row">
                <label className="employee-registration__label">
                  Bank Name <span className="employee-registration__required">*</span>
                </label>
                <button
                  type="button"
                  className="accounts-section__inline-btn"
                  onClick={() => setIsBankNameEditable(!isBankNameEditable)}
                >
                  {isBankNameEditable ? 'Lock' : 'Edit'}
                </button>
              </div>
              <input
                type="text"
                className="employee-registration__input"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                readOnly={!isBankNameEditable}
              />
            </div>

            {/* 3. Branch Name */}
            <div className="employee-registration__field">
              <label className="employee-registration__label">Branch Name</label>
              <input
                type="text"
                className="employee-registration__input"
                value={branchName}
                readOnly
              />
              <span className="accounts-section__helper-text">{bankLocation}</span>
            </div>

            {/* 4. Account Holder Name */}
            <div className="employee-registration__field">
              <label className="employee-registration__label">
                Account Holder Name <span className="employee-registration__required">*</span>
              </label>
              <input
                type="text"
                className="employee-registration__input"
                value={accountHolderName}
                onChange={(e) => setAccountHolderName(e.target.value)}
              />
            </div>

            {/* 5. Account Number */}
            <div className="employee-registration__field">
              <label className="employee-registration__label">
                Account Number <span className="employee-registration__required">*</span>
              </label>
              <input
                type="text"
                className="employee-registration__input"
                placeholder="Enter bank account number"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
              />
            </div>

            {/* 6. Re-enter Account Number */}
            <div className="employee-registration__field">
              <label className="employee-registration__label">
                Re-enter Account Number <span className="employee-registration__required">*</span>
              </label>
              <input
                type="text"
                className={`employee-registration__input ${
                  accountMismatchError ? 'accounts-section__input--error' : ''
                }`}
                placeholder="Re-enter bank account number"
                value={reAccountNumber}
                onChange={(e) => setReAccountNumber(e.target.value)}
              />
              {accountMismatchError && (
                <span className="accounts-section__error-msg">{accountMismatchError}</span>
              )}
            </div>
          </form>
        </div>

        {/* ================================================== */}
        {/* B. SALARY STRUCTURE */}
        {/* ================================================== */}
        <div className="accounts-section__card">
          <div className="accounts-section__card-header">
            <span className="accounts-section__sub-badge">SUBSECTION B</span>
            <h3 className="accounts-section__card-title">Salary Structure &amp; Breakdown</h3>
          </div>

          <form className="accounts-section__grid" onSubmit={(e) => e.preventDefault()}>
            {/* 1. Salary Structure */}
            <div className="employee-registration__field">
              <label className="employee-registration__label">
                Salary Structure <span className="employee-registration__required">*</span>
              </label>
              <div className="employee-registration__select-wrapper">
                <select
                  className="employee-registration__select"
                  value={salaryStructure}
                  onChange={(e) => setSalaryStructure(e.target.value)}
                >
                  <option value="Standard IT Professional Structure">
                    Standard IT Professional Structure
                  </option>
                  <option value="Executive Management Structure">
                    Executive Management Structure
                  </option>
                  <option value="Sales & Commission Structure">
                    Sales &amp; Commission Structure
                  </option>
                  <option value="Other">Other / Add New</option>
                </select>
                <span className="employee-registration__select-icon">▼</span>
              </div>
              {salaryStructure === 'Other' && (
                <div className="employee-registration__other-container">
                  <input
                    type="text"
                    className="employee-registration__input"
                    placeholder="Enter Custom Salary Structure"
                    value={customSalaryStructure}
                    onChange={(e) => setCustomSalaryStructure(e.target.value)}
                  />
                </div>
              )}
            </div>

            {/* 2. Pay Grade */}
            <div className="employee-registration__field">
              <label className="employee-registration__label">
                Pay Grade <span className="employee-registration__required">*</span>
              </label>
              <div className="employee-registration__select-wrapper">
                <select
                  className="employee-registration__select"
                  value={payGrade}
                  onChange={(e) => setPayGrade(e.target.value)}
                >
                  <option value="L1 - Entry Level">L1 - Entry Level</option>
                  <option value="L2 - Mid Level">L2 - Mid Level</option>
                  <option value="L3 - Senior Specialist">L3 - Senior Specialist</option>
                  <option value="L4 - Lead / Manager">L4 - Lead / Manager</option>
                  <option value="L5 - Executive">L5 - Executive</option>
                </select>
                <span className="employee-registration__select-icon">▼</span>
              </div>
            </div>

            {/* 3. Annual CTC */}
            <div className="employee-registration__field">
              <label className="employee-registration__label">
                Annual CTC (₹) <span className="employee-registration__required">*</span>
              </label>
              <input
                type="number"
                min="0"
                className="employee-registration__input"
                placeholder="e.g. 1200000"
                value={annualCtc}
                onChange={(e) => setAnnualCtc(e.target.value)}
              />
              <span className="accounts-section__helper-text">
                Monthly CTC: ₹{salaryCalculations.monthlyCtc.toLocaleString('en-IN')}
              </span>
            </div>
          </form>

          {/* AUTOMATED CALCULATED BREAKDOWN */}
          <div className="accounts-section__calc-banner">
            <span className="accounts-section__calc-icon">⚡</span>
            <span>
              Component values are automatically calculated from Annual CTC &amp; Salary Structure.
            </span>
          </div>

          <div className="accounts-section__salary-grid">
            <div className="accounts-section__calc-box">
              <span className="accounts-section__calc-label">Basic Salary (Monthly)</span>
              <span className="accounts-section__calc-val">
                ₹{salaryCalculations.basicMonthly.toLocaleString('en-IN')}
              </span>
            </div>
            <div className="accounts-section__calc-box">
              <span className="accounts-section__calc-label">HRA (Monthly)</span>
              <span className="accounts-section__calc-val">
                ₹{salaryCalculations.hraMonthly.toLocaleString('en-IN')}
              </span>
            </div>
            <div className="accounts-section__calc-box">
              <span className="accounts-section__calc-label">Special Allowance</span>
              <span className="accounts-section__calc-val">
                ₹{salaryCalculations.specialAllowanceMonthly.toLocaleString('en-IN')}
              </span>
            </div>
            <div className="accounts-section__calc-box">
              <span className="accounts-section__calc-label">Other Allowances</span>
              <span className="accounts-section__calc-val">
                ₹{salaryCalculations.otherAllowancesMonthly.toLocaleString('en-IN')}
              </span>
            </div>
            <div className="accounts-section__calc-box">
              <span className="accounts-section__calc-label">Variable Pay / Bonus</span>
              <div className="accounts-section__var-row">
                <input
                  type="number"
                  className="accounts-section__var-input"
                  value={variablePayVal}
                  onChange={(e) => setVariablePayVal(e.target.value)}
                />
                <select
                  className="accounts-section__var-select"
                  value={variablePayType}
                  onChange={(e) => setVariablePayType(e.target.value as 'amount' | 'percentage')}
                >
                  <option value="percentage">%</option>
                  <option value="amount">₹/Yr</option>
                </select>
              </div>
            </div>
            <div className="accounts-section__calc-box accounts-section__calc-box--highlight">
              <span className="accounts-section__calc-label">Gross Salary (Monthly)</span>
              <span className="accounts-section__calc-val accounts-section__calc-val--primary">
                ₹{salaryCalculations.grossMonthly.toLocaleString('en-IN')}
              </span>
            </div>
            <div className="accounts-section__calc-box">
              <span className="accounts-section__calc-label">Employer PF Contribution</span>
              <span className="accounts-section__calc-val">
                ₹{salaryCalculations.pfMonthly.toLocaleString('en-IN')}
              </span>
            </div>
            <div className="accounts-section__calc-box">
              <span className="accounts-section__calc-label">Gratuity Provision</span>
              <span className="accounts-section__calc-val">
                ₹{salaryCalculations.gratuityMonthly.toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        </div>

        {/* ================================================== */}
        {/* C. PAYROLL SETUP & D. STATUTORY */}
        {/* ================================================== */}
        <div className="accounts-section__row-2">
          {/* C. PAYROLL SETUP */}
          <div className="accounts-section__card">
            <div className="accounts-section__card-header">
              <span className="accounts-section__sub-badge">SUBSECTION C</span>
              <h3 className="accounts-section__card-title">Payroll Setup</h3>
            </div>
            <form className="accounts-section__grid-stack" onSubmit={(e) => e.preventDefault()}>
              {/* 1. Payroll Group */}
              <div className="employee-registration__field">
                <label className="employee-registration__label">Payroll Group</label>
                <div className="employee-registration__select-wrapper">
                  <select
                    className="employee-registration__select"
                    value={payrollGroup}
                    onChange={(e) => setPayrollGroup(e.target.value)}
                  >
                    <option value="Core Engineering Payroll">Core Engineering Payroll</option>
                    <option value="Executive Payroll">Executive Payroll</option>
                    <option value="Contractor Payroll">Contractor Payroll</option>
                    <option value="Other">Other / Add New</option>
                  </select>
                  <span className="employee-registration__select-icon">▼</span>
                </div>
                {payrollGroup === 'Other' && (
                  <div className="employee-registration__other-container">
                    <input
                      type="text"
                      className="employee-registration__input"
                      placeholder="Enter Payroll Group"
                      value={customPayrollGroup}
                      onChange={(e) => setCustomPayrollGroup(e.target.value)}
                    />
                  </div>
                )}
              </div>

              {/* 2. Salary Effective Date */}
              <div className="employee-registration__field">
                <label className="employee-registration__label">Salary Effective Date</label>
                <input
                  type="date"
                  className="employee-registration__input"
                  value={salaryEffectiveDate}
                  onChange={(e) => setSalaryEffectiveDate(e.target.value)}
                />
              </div>

              {/* 3. Payment Frequency */}
              <div className="employee-registration__field">
                <label className="employee-registration__label">Payment Frequency</label>
                <div className="employee-registration__select-wrapper">
                  <select
                    className="employee-registration__select"
                    value={paymentFrequency}
                    onChange={(e) => setPaymentFrequency(e.target.value)}
                  >
                    <option value="Monthly">Monthly</option>
                    <option value="Weekly">Weekly</option>
                    <option value="Bi-weekly">Bi-weekly</option>
                    <option value="Other">Other</option>
                  </select>
                  <span className="employee-registration__select-icon">▼</span>
                </div>
                {paymentFrequency === 'Other' && (
                  <div className="employee-registration__other-container">
                    <input
                      type="text"
                      className="employee-registration__input"
                      placeholder="Enter Payment Frequency"
                      value={customPaymentFrequency}
                      onChange={(e) => setCustomPaymentFrequency(e.target.value)}
                    />
                  </div>
                )}
              </div>
            </form>
          </div>

          {/* D. STATUTORY */}
          <div className="accounts-section__card">
            <div className="accounts-section__card-header">
              <span className="accounts-section__sub-badge">SUBSECTION D</span>
              <h3 className="accounts-section__card-title">Statutory Compliance</h3>
            </div>
            <div className="accounts-section__toggle-grid">
              <div className="accounts-section__toggle-item">
                <div>
                  <span className="accounts-section__toggle-title">PF Applicable?</span>
                  <span className="accounts-section__toggle-desc">
                    Provident Fund 12% contribution
                  </span>
                </div>
                <button
                  type="button"
                  className={`emergency-contact-section__toggle-switch ${
                    isPfApplicable ? 'emergency-contact-section__toggle-switch--active' : ''
                  }`}
                  onClick={() => setIsPfApplicable(!isPfApplicable)}
                >
                  <span className="emergency-contact-section__toggle-handle" />
                </button>
              </div>

              <div className="accounts-section__toggle-item">
                <div>
                  <span className="accounts-section__toggle-title">ESI Applicable?</span>
                  <span className="accounts-section__toggle-desc">Employees State Insurance</span>
                </div>
                <button
                  type="button"
                  className={`emergency-contact-section__toggle-switch ${
                    isEsiApplicable ? 'emergency-contact-section__toggle-switch--active' : ''
                  }`}
                  onClick={() => setIsEsiApplicable(!isEsiApplicable)}
                >
                  <span className="emergency-contact-section__toggle-handle" />
                </button>
              </div>

              <div className="accounts-section__toggle-item">
                <div>
                  <span className="accounts-section__toggle-title">PT Applicable?</span>
                  <span className="accounts-section__toggle-desc">
                    Professional Tax state deduction
                  </span>
                </div>
                <button
                  type="button"
                  className={`emergency-contact-section__toggle-switch ${
                    isPtApplicable ? 'emergency-contact-section__toggle-switch--active' : ''
                  }`}
                  onClick={() => setIsPtApplicable(!isPtApplicable)}
                >
                  <span className="emergency-contact-section__toggle-handle" />
                </button>
              </div>

              <div className="employee-registration__field">
                <label className="employee-registration__label">TDS &amp; Tax Regime</label>
                <div className="employee-registration__select-wrapper">
                  <select
                    className="employee-registration__select"
                    value={taxRegime}
                    onChange={(e) => setTaxRegime(e.target.value)}
                  >
                    <option value="New Tax Regime">New Tax Regime (Default Sec 115BAC)</option>
                    <option value="Old Tax Regime">Old Tax Regime (With Deductions)</option>
                    <option value="Not Applicable">Not Applicable</option>
                  </select>
                  <span className="employee-registration__select-icon">▼</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ================================================== */}
        {/* E. BENEFITS */}
        {/* ================================================== */}
        <div className="accounts-section__card">
          <div className="accounts-section__card-header">
            <span className="accounts-section__sub-badge">SUBSECTION E</span>
            <h3 className="accounts-section__card-title">Employee Benefits Checklist</h3>
          </div>

          <div className="accounts-section__benefits-grid">
            {[
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
            ].map((b) => {
              const key = b.id as keyof typeof benefits;
              return (
                <div key={b.id} className="accounts-section__benefit-chip">
                  <button
                    type="button"
                    className={`emergency-contact-section__toggle-switch ${
                      benefits[key] ? 'emergency-contact-section__toggle-switch--active' : ''
                    }`}
                    onClick={() => toggleBenefit(key)}
                  >
                    <span className="emergency-contact-section__toggle-handle" />
                  </button>
                  <span className="accounts-section__benefit-name">{b.label}</span>
                </div>
              );
            })}
          </div>

          {/* CONDITIONAL MEDICAL INSURANCE DETAILS */}
          {benefits.medical && (
            <div className="accounts-section__medical-box">
              <h4 className="accounts-section__sub-heading">Medical Insurance Policy Details</h4>
              <div className="accounts-section__grid">
                <div className="employee-registration__field">
                  <label className="employee-registration__label">Insurance Provider</label>
                  <input
                    type="text"
                    className="employee-registration__input"
                    value={insuranceProvider}
                    onChange={(e) => setInsuranceProvider(e.target.value)}
                  />
                </div>
                <div className="employee-registration__field">
                  <label className="employee-registration__label">Policy Name / Number</label>
                  <input
                    type="text"
                    className="employee-registration__input"
                    value={policyNumber}
                    onChange={(e) => setPolicyNumber(e.target.value)}
                  />
                </div>
                <div className="employee-registration__field">
                  <label className="employee-registration__label">Coverage Amount</label>
                  <input
                    type="text"
                    className="employee-registration__input"
                    value={coverageAmount}
                    onChange={(e) => setCoverageAmount(e.target.value)}
                  />
                </div>
                <div className="employee-registration__field">
                  <label className="employee-registration__label">Effective Date</label>
                  <input
                    type="date"
                    className="employee-registration__input"
                    value={medicalEffectiveDate}
                    onChange={(e) => setMedicalEffectiveDate(e.target.value)}
                  />
                </div>
                <div className="employee-registration__field">
                  <label className="employee-registration__label">Expiry Date</label>
                  <input
                    type="date"
                    className="employee-registration__input"
                    value={medicalExpiryDate}
                    onChange={(e) => setMedicalExpiryDate(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
