import { useState } from 'react';
import { BezentIcon } from '../../../../design-system/icons';
import './EmergencyContactSection.css';

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
    <div className="emergency-contact-section">
      {/* Banner Header */}
      <div className="employee-registration__section-header">
        <div className="employee-registration__section-icon-badge">
          <BezentIcon name="notes" size={22} />
        </div>
        <div className="employee-registration__section-title-group">
          <h2 className="employee-registration__section-title">Emergency Contact</h2>
          <p className="employee-registration__section-subtitle">
            Emergency and alternate contact information for the employee.
          </p>
        </div>
      </div>

      <div className="emergency-contact-section__container">
        {/* ================================================== */}
        {/* 1. PRIMARY CONTACT AREA */}
        {/* ================================================== */}
        <div className="emergency-contact-section__card">
          <div className="emergency-contact-section__card-header">
            <div className="emergency-contact-section__header-title-group">
              <span className="emergency-contact-section__badge emergency-contact-section__badge--primary">
                PRIMARY CONTACT
              </span>
              <h3 className="emergency-contact-section__card-title">Primary Emergency Contact</h3>
            </div>
          </div>

          <form className="emergency-contact-section__grid" onSubmit={(e) => e.preventDefault()}>
            {/* 1. Contact Name */}
            <div className="employee-registration__field">
              <label className="employee-registration__label">
                Contact Name <span className="employee-registration__required">*</span>
              </label>
              <input
                type="text"
                className="employee-registration__input"
                placeholder="Enter Primary Contact Name"
                value={primaryName}
                onChange={(e) => setPrimaryName(e.target.value)}
              />
            </div>

            {/* 2. Relationship / Role */}
            <div className="employee-registration__field">
              <label className="employee-registration__label">
                Relationship / Role <span className="employee-registration__required">*</span>
              </label>
              <div className="employee-registration__select-wrapper">
                <select
                  className="employee-registration__select"
                  value={primaryRelationship}
                  onChange={(e) => setPrimaryRelationship(e.target.value)}
                >
                  <option value="Father">Father</option>
                  <option value="Mother">Mother</option>
                  <option value="Spouse">Spouse</option>
                  <option value="Brother">Brother</option>
                  <option value="Sister">Sister</option>
                  <option value="Son">Son</option>
                  <option value="Daughter">Daughter</option>
                  <option value="Guardian">Guardian</option>
                  <option value="Relative">Relative</option>
                  <option value="Friend">Friend</option>
                  <option value="Other">Other</option>
                </select>
                <span className="employee-registration__select-icon">▼</span>
              </div>
              {primaryRelationship === 'Other' && (
                <div className="employee-registration__other-container">
                  <input
                    type="text"
                    className="employee-registration__input"
                    placeholder="Enter Relationship / Role"
                    value={customPrimaryRelationship}
                    onChange={(e) => setCustomPrimaryRelationship(e.target.value)}
                  />
                </div>
              )}
            </div>

            {/* 3. Phone */}
            <div className="employee-registration__field">
              <label className="employee-registration__label">
                Phone <span className="employee-registration__required">*</span>
              </label>
              <div className="emergency-contact-section__phone-group">
                <select
                  className="emergency-contact-section__country-code"
                  value={primaryCountryCode}
                  onChange={(e) => setPrimaryCountryCode(e.target.value)}
                >
                  <option value="+91">+91 (IND)</option>
                  <option value="+1">+1 (USA)</option>
                  <option value="+44">+44 (UK)</option>
                  <option value="+65">+65 (SGP)</option>
                  <option value="+971">+971 (UAE)</option>
                </select>
                <input
                  type="tel"
                  className={`employee-registration__input ${
                    primaryPhoneError ? 'emergency-contact-section__input--error' : ''
                  }`}
                  placeholder="98765 43210"
                  value={primaryPhone}
                  onChange={(e) => handlePrimaryPhoneChange(e.target.value)}
                />
              </div>
              {primaryPhoneError && (
                <span className="emergency-contact-section__error-msg">{primaryPhoneError}</span>
              )}
            </div>

            {/* 4. Email */}
            <div className="employee-registration__field">
              <label className="employee-registration__label">
                Email <span className="employee-registration__required">*</span>
              </label>
              <input
                type="email"
                className={`employee-registration__input ${
                  primaryEmailError ? 'emergency-contact-section__input--error' : ''
                }`}
                placeholder="contact@example.com"
                value={primaryEmail}
                onChange={(e) => handlePrimaryEmailChange(e.target.value)}
              />
              {primaryEmailError && (
                <span className="emergency-contact-section__error-msg font-sm">
                  {primaryEmailError}
                </span>
              )}
            </div>

            {/* 5. Address / Contact Details */}
            <div className="employee-registration__field emergency-contact-section__field--span-2">
              <label className="employee-registration__label">
                Address / Contact Details <span className="employee-registration__required">*</span>
              </label>
              <textarea
                className="emergency-contact-section__textarea"
                rows={3}
                placeholder="Enter complete address or relevant contact details..."
                value={primaryAddress}
                onChange={(e) => setPrimaryAddress(e.target.value)}
              />
            </div>

            {/* 6. Primary / Private Contact Indicator */}
            <div className="employee-registration__field emergency-contact-section__field--span-full">
              <label className="employee-registration__label">
                Primary / Private Contact Indicator
              </label>
              <div className="emergency-contact-section__toggle-row">
                <button
                  type="button"
                  className={`emergency-contact-section__toggle-switch ${
                    isPrimaryPrivate ? 'emergency-contact-section__toggle-switch--active' : ''
                  }`}
                  onClick={() => setIsPrimaryPrivate(!isPrimaryPrivate)}
                  role="switch"
                  aria-checked={isPrimaryPrivate}
                >
                  <span className="emergency-contact-section__toggle-handle" />
                </button>
                <span className="emergency-contact-section__toggle-label">
                  {isPrimaryPrivate
                    ? 'Primary Emergency Contact (Private Record)'
                    : 'Standard Emergency Contact (Public HR Record)'}
                </span>
              </div>
            </div>
          </form>
        </div>

        {/* ================================================== */}
        {/* 2. SECONDARY CONTACT AREA */}
        {/* ================================================== */}
        <div className="emergency-contact-section__card">
          <div className="emergency-contact-section__card-header">
            <div className="emergency-contact-section__header-title-group">
              <span className="emergency-contact-section__badge emergency-contact-section__badge--secondary">
                SECONDARY CONTACT
              </span>
              <h3 className="emergency-contact-section__card-title">Secondary Emergency Contact</h3>
            </div>
          </div>

          <form className="emergency-contact-section__grid" onSubmit={(e) => e.preventDefault()}>
            {/* 1. Secondary Contact Name */}
            <div className="employee-registration__field">
              <label className="employee-registration__label">Secondary Contact Name</label>
              <input
                type="text"
                className="employee-registration__input"
                placeholder="Enter Secondary Contact Name"
                value={secondaryName}
                onChange={(e) => setSecondaryName(e.target.value)}
              />
            </div>

            {/* 2. Secondary Relationship */}
            <div className="employee-registration__field">
              <label className="employee-registration__label">Secondary Relationship</label>
              <div className="employee-registration__select-wrapper">
                <select
                  className="employee-registration__select"
                  value={secondaryRelationship}
                  onChange={(e) => setSecondaryRelationship(e.target.value)}
                >
                  <option value="Father">Father</option>
                  <option value="Mother">Mother</option>
                  <option value="Spouse">Spouse</option>
                  <option value="Brother">Brother</option>
                  <option value="Sister">Sister</option>
                  <option value="Son">Son</option>
                  <option value="Daughter">Daughter</option>
                  <option value="Guardian">Guardian</option>
                  <option value="Relative">Relative</option>
                  <option value="Friend">Friend</option>
                  <option value="Other">Other</option>
                </select>
                <span className="employee-registration__select-icon">▼</span>
              </div>
              {secondaryRelationship === 'Other' && (
                <div className="employee-registration__other-container">
                  <input
                    type="text"
                    className="employee-registration__input"
                    placeholder="Enter Secondary Relationship"
                    value={customSecondaryRelationship}
                    onChange={(e) => setCustomSecondaryRelationship(e.target.value)}
                  />
                </div>
              )}
            </div>

            {/* 3. Secondary Mobile */}
            <div className="employee-registration__field">
              <label className="employee-registration__label">Secondary Mobile</label>
              <div className="emergency-contact-section__phone-group">
                <select
                  className="emergency-contact-section__country-code"
                  value={secondaryCountryCode}
                  onChange={(e) => setSecondaryCountryCode(e.target.value)}
                >
                  <option value="+91">+91 (IND)</option>
                  <option value="+1">+1 (USA)</option>
                  <option value="+44">+44 (UK)</option>
                  <option value="+65">+65 (SGP)</option>
                  <option value="+971">+971 (UAE)</option>
                </select>
                <input
                  type="tel"
                  className={`employee-registration__input ${
                    secondaryMobileError ? 'emergency-contact-section__input--error' : ''
                  }`}
                  placeholder="98765 43211"
                  value={secondaryMobile}
                  onChange={(e) => handleSecondaryMobileChange(e.target.value)}
                />
              </div>
              {secondaryMobileError && (
                <span className="emergency-contact-section__error-msg">{secondaryMobileError}</span>
              )}
            </div>

            {/* 4. Secondary Email */}
            <div className="employee-registration__field">
              <label className="employee-registration__label">Secondary Email</label>
              <input
                type="email"
                className={`employee-registration__input ${
                  secondaryEmailError ? 'emergency-contact-section__input--error' : ''
                }`}
                placeholder="secondary@example.com"
                value={secondaryEmail}
                onChange={(e) => handleSecondaryEmailChange(e.target.value)}
              />
              {secondaryEmailError && (
                <span className="emergency-contact-section__error-msg font-sm">
                  {secondaryEmailError}
                </span>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
