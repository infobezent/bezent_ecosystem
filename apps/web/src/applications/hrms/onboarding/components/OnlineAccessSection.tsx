import { useState } from 'react';
import { BezentIcon } from '../../../../design-system/icons';

export interface ModulePermission {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
}

const DEFAULT_MODULES: ModulePermission[] = [
  {
    id: 'dashboard',
    name: 'Dashboard',
    description: 'Personal ESS dashboard & quick stats',
    enabled: true,
  },
  {
    id: 'attendance',
    name: 'Attendance',
    description: 'Clock in/out, shift roster & attendance logs',
    enabled: true,
  },
  { id: 'leave', name: 'Leave', description: 'Apply & view leave balances', enabled: true },
  {
    id: 'calendar',
    name: 'Calendar',
    description: 'Company & team events calendar',
    enabled: true,
  },
  { id: 'tasks', name: 'Tasks', description: 'Personal & assigned workspace tasks', enabled: true },
  {
    id: 'meetings',
    name: 'Meetings',
    description: 'Team meeting scheduling & notes',
    enabled: false,
  },
  {
    id: 'projects',
    name: 'Projects',
    description: 'Project management & task tracking',
    enabled: false,
  },
  {
    id: 'performance',
    name: 'Performance',
    description: 'Appraisals & 360 feedback reviews',
    enabled: false,
  },
  {
    id: 'documents',
    name: 'Documents',
    description: 'Employee document repository & vault',
    enabled: true,
  },
];

export function OnlineAccessSection() {
  // A. ACCOUNT INFORMATION STATE
  const [username, setUsername] = useState('arun.kumar');
  const [companyEmail, setCompanyEmail] = useState('arun.kumar@bezent.com');
  const [invitationStatus, setInvitationStatus] = useState<
    'Not Sent' | 'Pending' | 'Sent' | 'Accepted' | 'Expired'
  >('Not Sent');
  const [invitationSentDate, setInvitationSentDate] = useState<string>('—');

  // B. SECURITY STATE
  const [mfaRequired, setMfaRequired] = useState(true);
  const [forcePasswordSetup, setForcePasswordSetup] = useState(true);
  const [accountActive, setAccountActive] = useState(true);
  const [invitationSuccessMsg, setInvitationSuccessMsg] = useState('');

  // C. ROLE & ACCESS STATE
  const [employeeRole, setEmployeeRole] = useState('Employee');
  const [portalRoleScope, setPortalRoleScope] = useState('Employee');
  const [customScopeText, setCustomScopeText] = useState('');

  // D. MODULE ACCESS STATE
  const [modules, setModules] = useState<ModulePermission[]>(DEFAULT_MODULES);

  // AUTOMATION: Handle Send Welcome Invitation
  const handleSendInvitation = () => {
    const currentDateStr = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    setInvitationStatus('Sent');
    setInvitationSentDate(currentDateStr);
    setInvitationSuccessMsg(`✅ Welcome invitation sent to ${companyEmail} on ${currentDateStr}`);
    setTimeout(() => setInvitationSuccessMsg(''), 6000);
  };

  // AUTOMATION: Role Selection -> Auto-set Module Access Defaults
  const handleRoleChange = (role: string) => {
    setEmployeeRole(role);
    if (role === 'HR Admin' || role === 'System Admin') {
      setPortalRoleScope('Organization');
      setModules((prev) => prev.map((m) => ({ ...m, enabled: true })));
    } else if (role === 'Department Manager' || role === 'Team Lead') {
      setPortalRoleScope('Department');
      setModules((prev) =>
        prev.map((m) => ({
          ...m,
          enabled: [
            'dashboard',
            'attendance',
            'leave',
            'calendar',
            'tasks',
            'meetings',
            'performance',
            'documents',
          ].includes(m.id),
        })),
      );
    } else {
      setPortalRoleScope('Employee');
      setModules((prev) =>
        prev.map((m) => ({
          ...m,
          enabled: ['dashboard', 'attendance', 'leave', 'calendar', 'tasks', 'documents'].includes(
            m.id,
          ),
        })),
      );
    }
  };

  const toggleModule = (id: string) => {
    setModules((prev) => prev.map((m) => (m.id === id ? { ...m, enabled: !m.enabled } : m)));
  };

  return (
    <div className="online-access-section">
      {/* Banner Header */}
      <div className="employee-registration__section-header">
        <div className="employee-registration__section-icon-badge">
          <BezentIcon name="tasks" size={22} />
        </div>
        <div className="employee-registration__section-title-group">
          <h2 className="employee-registration__section-title">
            Online Access &amp; User Credentials
          </h2>
          <p className="employee-registration__section-subtitle">
            Manage single sign-on credentials, security policies, portal roles and module access
            permissions.
          </p>
        </div>
      </div>

      <div className="online-access-section__container">
        {/* ================================================== */}
        {/* A. ACCOUNT INFORMATION */}
        {/* ================================================== */}
        <div className="online-access-section__card">
          <div className="online-access-section__card-header">
            <span className="online-access-section__sub-badge">SUBSECTION A</span>
            <h3 className="online-access-section__card-title">Account Credentials</h3>
          </div>

          <form className="online-access-section__grid" onSubmit={(e) => e.preventDefault()}>
            {/* 1. Employee Username */}
            <div className="employee-registration__field">
              <label className="employee-registration__label">
                Employee Username <span className="employee-registration__required">*</span>
              </label>
              <input
                type="text"
                className="employee-registration__input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>

            {/* 2. Official Company Email */}
            <div className="employee-registration__field">
              <label className="employee-registration__label">
                Official Company Email <span className="employee-registration__required">*</span>
              </label>
              <input
                type="email"
                className="employee-registration__input"
                value={companyEmail}
                onChange={(e) => setCompanyEmail(e.target.value)}
              />
            </div>

            {/* 3. Invitation Status */}
            <div className="employee-registration__field">
              <label className="employee-registration__label">Invitation Status</label>
              <div className="online-access-section__status-row">
                <span
                  className={`online-access-section__status-pill online-access-section__status-pill--${invitationStatus.toLowerCase().replace(' ', '-')}`}
                >
                  ● {invitationStatus}
                </span>
                <select
                  className="online-access-section__status-select"
                  value={invitationStatus}
                  onChange={(e) =>
                    setInvitationStatus(
                      e.target.value as 'Not Sent' | 'Pending' | 'Sent' | 'Accepted' | 'Expired',
                    )
                  }
                >
                  <option value="Not Sent">Not Sent</option>
                  <option value="Pending">Pending</option>
                  <option value="Sent">Sent</option>
                  <option value="Accepted">Accepted</option>
                  <option value="Expired">Expired</option>
                </select>
              </div>
            </div>

            {/* 4. Invitation Sent Date */}
            <div className="employee-registration__field">
              <label className="employee-registration__label">Invitation Sent Date</label>
              <input
                type="text"
                className="employee-registration__input"
                value={invitationSentDate}
                readOnly
              />
            </div>
          </form>
        </div>

        {/* ================================================== */}
        {/* B. SECURITY */}
        {/* ================================================== */}
        <div className="online-access-section__card">
          <div className="online-access-section__card-header">
            <span className="online-access-section__sub-badge">SUBSECTION B</span>
            <h3 className="online-access-section__card-title">Security &amp; Invitation Action</h3>
          </div>

          <div className="online-access-section__security-row">
            <div className="accounts-section__toggle-item">
              <div>
                <span className="accounts-section__toggle-title">MFA Required</span>
                <span className="accounts-section__toggle-desc">
                  Enforce 2-Factor Authentication
                </span>
              </div>
              <button
                type="button"
                className={`emergency-contact-section__toggle-switch ${
                  mfaRequired ? 'emergency-contact-section__toggle-switch--active' : ''
                }`}
                onClick={() => setMfaRequired(!mfaRequired)}
              >
                <span className="emergency-contact-section__toggle-handle" />
              </button>
            </div>

            <div className="accounts-section__toggle-item">
              <div>
                <span className="accounts-section__toggle-title">
                  Force Password Setup First Login
                </span>
                <span className="accounts-section__toggle-desc">
                  Require immediate password change
                </span>
              </div>
              <button
                type="button"
                className={`emergency-contact-section__toggle-switch ${
                  forcePasswordSetup ? 'emergency-contact-section__toggle-switch--active' : ''
                }`}
                onClick={() => setForcePasswordSetup(!forcePasswordSetup)}
              >
                <span className="emergency-contact-section__toggle-handle" />
              </button>
            </div>

            <div className="accounts-section__toggle-item">
              <div>
                <span className="accounts-section__toggle-title">Account Active &amp; Enabled</span>
                <span className="accounts-section__toggle-desc">Enable single sign-on access</span>
              </div>
              <button
                type="button"
                className={`emergency-contact-section__toggle-switch ${
                  accountActive ? 'emergency-contact-section__toggle-switch--active' : ''
                }`}
                onClick={() => setAccountActive(!accountActive)}
              >
                <span className="emergency-contact-section__toggle-handle" />
              </button>
            </div>
          </div>

          <div className="online-access-section__invite-banner">
            <button
              type="button"
              className="online-access-section__invite-btn"
              onClick={handleSendInvitation}
            >
              ✉️ SEND WELCOME INVITATION
            </button>
            {invitationSuccessMsg && (
              <span className="online-access-section__invite-msg">{invitationSuccessMsg}</span>
            )}
          </div>
        </div>

        {/* ================================================== */}
        {/* C. ROLE & ACCESS */}
        {/* ================================================== */}
        <div className="online-access-section__card">
          <div className="online-access-section__card-header">
            <span className="online-access-section__sub-badge">SUBSECTION C</span>
            <h3 className="online-access-section__card-title">Role &amp; Scope Assignment</h3>
          </div>

          <form className="online-access-section__grid" onSubmit={(e) => e.preventDefault()}>
            {/* 1. Employee Role */}
            <div className="employee-registration__field">
              <label className="employee-registration__label">
                Employee Role <span className="employee-registration__required">*</span>
              </label>
              <div className="employee-registration__select-wrapper">
                <select
                  className="employee-registration__select"
                  value={employeeRole}
                  onChange={(e) => handleRoleChange(e.target.value)}
                >
                  <option value="Employee">Employee (Standard ESS)</option>
                  <option value="Team Lead">Team Lead</option>
                  <option value="Department Manager">Department Manager</option>
                  <option value="HR Admin">HR Administrator</option>
                  <option value="Finance Manager">Finance Manager</option>
                  <option value="System Admin">System Administrator</option>
                </select>
                <span className="employee-registration__select-icon">▼</span>
              </div>
            </div>

            {/* 2. Portal Role Scope */}
            <div className="employee-registration__field">
              <label className="employee-registration__label">
                Portal Role Scope <span className="employee-registration__required">*</span>
              </label>
              <div className="employee-registration__select-wrapper">
                <select
                  className="employee-registration__select"
                  value={portalRoleScope}
                  onChange={(e) => setPortalRoleScope(e.target.value)}
                >
                  <option value="Employee">Employee Scope (Self-Service)</option>
                  <option value="Team">Team Scope</option>
                  <option value="Department">Department Scope</option>
                  <option value="Organization">Organization Scope (All Entities)</option>
                  <option value="Custom">Custom Scope Configuration</option>
                </select>
                <span className="employee-registration__select-icon">▼</span>
              </div>
              {portalRoleScope === 'Custom' && (
                <div className="employee-registration__other-container">
                  <input
                    type="text"
                    className="employee-registration__input"
                    placeholder="Describe custom scope boundaries..."
                    value={customScopeText}
                    onChange={(e) => setCustomScopeText(e.target.value)}
                  />
                </div>
              )}
            </div>
          </form>
        </div>

        {/* ================================================== */}
        {/* D. MODULE ACCESS */}
        {/* ================================================== */}
        <div className="online-access-section__card">
          <div className="online-access-section__card-header">
            <span className="online-access-section__sub-badge">SUBSECTION D</span>
            <h3 className="online-access-section__card-title">Module Access Permissions</h3>
          </div>

          <p className="online-access-section__card-desc">
            Module permissions are automatically assigned based on the selected Employee Role. HR
            can toggle individual checkboxes below to customize access.
          </p>

          <div className="online-access-section__modules-grid">
            {modules.map((m) => (
              <div
                key={m.id}
                className={`online-access-section__module-card ${
                  m.enabled ? 'online-access-section__module-card--active' : ''
                }`}
                onClick={() => toggleModule(m.id)}
              >
                <input
                  type="checkbox"
                  className="online-access-section__checkbox"
                  checked={m.enabled}
                  onChange={() => {}} // Handled by div click
                />
                <div className="online-access-section__module-info">
                  <span className="online-access-section__module-name">{m.name}</span>
                  <span className="online-access-section__module-desc">{m.description}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
