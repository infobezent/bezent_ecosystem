import { useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  EmptyState,
  Modal,
  Inline,
  Stack,
} from '../../../../../design-system/components';
import { BezentIcon } from '../../../../../design-system/icons';
import { useAuth } from '../../../../../platform/auth';
import type { EssFullProfile } from '../../api/essApi';

export interface EssPrivacyTabProps {
  profile: EssFullProfile;
  onNavigateToChangeRequests?: () => void;
  onRequestCorrection?: () => void;
}

export function EssPrivacyTab({
  profile,
  onNavigateToChangeRequests,
  onRequestCorrection,
}: EssPrivacyTabProps) {
  const { signOut } = useAuth();
  const [confirmSignOutOpen, setConfirmSignOutOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const emp = profile.employee;

  const handleConfirmSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
    } catch {
      // signOut redirects or cleans up local session
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <div className="ess-profile-sections-stack" data-testid="ess-privacy-tab">
      {/* ── Section 1: Account Security & Credentials ─────────────── */}
      <div className="ess-profile-section-panel" data-testid="privacy-section-account-security">
        <div className="ess-profile-section-header">
          <div className="ess-profile-section-title-wrap">
            <div className="ess-profile-section-icon-badge">
              <BezentIcon name="security" size={16} />
            </div>
            <div>
              <h3 className="ess-profile-section-heading">Account Security &amp; Credentials</h3>
              <p className="ess-profile-section-desc">
                Verified authentication methods, credential governance, and access integrity
              </p>
            </div>
          </div>
        </div>

        <div className="ess-profile-field-grid">
          <div className="ess-profile-field-item">
            <div className="ess-profile-field-label-row">
              <span className="ess-profile-field-label">Primary Account Email</span>
            </div>
            <span className="ess-profile-field-value">{emp.email}</span>
            <span className="ess-profile-field-helper">
              Official workforce identity used for sign-in and security notifications
            </span>
          </div>

          <div className="ess-profile-field-item">
            <div className="ess-profile-field-label-row">
              <span className="ess-profile-field-label">Authentication Method</span>
              <Badge variant="success" size="sm">
                Active
              </Badge>
            </div>
            <span className="ess-profile-field-value">Passwordless Email Verification</span>
            <span className="ess-profile-field-helper">
              One-time verification code dispatched to your official corporate inbox
            </span>
          </div>

          <div className="ess-profile-field-item">
            <div className="ess-profile-field-label-row">
              <span className="ess-profile-field-label">Sign-In Verification</span>
              <Badge variant="neutral" size="sm">
                Enforced
              </Badge>
            </div>
            <span className="ess-profile-field-value">6-Digit One-Time Code</span>
            <span className="ess-profile-field-helper">
              Single-use security code with 10-minute expiry and automated rate limiting
            </span>
          </div>

          <div className="ess-profile-field-item">
            <div className="ess-profile-field-label-row">
              <span className="ess-profile-field-label">Password Sign-In Policy</span>
              <Badge variant="neutral" size="sm">
                Disabled
              </Badge>
            </div>
            <span className="ess-profile-field-value">Disabled by Enterprise Policy</span>
            <span className="ess-profile-field-helper">
              Static password authentication is retired across corporate accounts for enhanced
              security
            </span>
          </div>

          <div className="ess-profile-field-item">
            <div className="ess-profile-field-label-row">
              <span className="ess-profile-field-label">Credential Secrets Protection</span>
              <Badge variant="success" size="sm">
                Protected
              </Badge>
            </div>
            <span className="ess-profile-field-value">Zero Plaintext Secrets Stored</span>
            <span className="ess-profile-field-helper">
              No passwords, security answers, or raw session tokens are persisted
            </span>
          </div>

          <div className="ess-profile-field-item">
            <div className="ess-profile-field-label-row">
              <span className="ess-profile-field-label">Account Verification Status</span>
              <Badge variant="success" size="sm">
                Verified
              </Badge>
            </div>
            <span className="ess-profile-field-value">Corporate Identity Confirmed</span>
            <span className="ess-profile-field-helper">
              Employment record linked to authenticated company membership
            </span>
          </div>
        </div>

        <div className="ess-profile-info-banner">
          <BezentIcon name="information" size={16} />
          <div>
            <strong>Passwordless Enterprise Security:</strong> User passwords are not stored or
            required for workforce sign-in. Access is authenticated through single-use, time-limited
            verification codes delivered to your official email.
          </div>
        </div>
      </div>

      {/* ── Section 2: Profile Visibility & Access Boundaries ────── */}
      <div className="ess-profile-section-panel" data-testid="privacy-section-profile-visibility">
        <div className="ess-profile-section-header">
          <div className="ess-profile-section-title-wrap">
            <div className="ess-profile-section-icon-badge">
              <BezentIcon name="hierarchy" size={16} />
            </div>
            <div>
              <h3 className="ess-profile-section-heading">
                Profile Visibility &amp; Access Boundaries
              </h3>
              <p className="ess-profile-section-desc">
                Role-based authorization rules, isolation boundaries, and employee record protection
              </p>
            </div>
          </div>
        </div>

        <div className="ess-privacy-grid-2">
          <div className="ess-privacy-card">
            <div className="ess-privacy-card-header">
              <span className="ess-privacy-card-title">
                <BezentIcon name="person" size={16} />
                Employee Self-Service (ESS)
              </span>
              <Badge variant="neutral" size="sm">
                Self-Service Only
              </Badge>
            </div>
            <p className="ess-privacy-card-desc">
              Your session is scoped strictly to your personal workforce file. You cannot inspect or
              access records, compensation data, or requests belonging to other workforce members.
            </p>
          </div>

          <div className="ess-privacy-card">
            <div className="ess-privacy-card-header">
              <span className="ess-privacy-card-title">
                <BezentIcon name="work" size={16} />
                HR &amp; Administrative Reviewers
              </span>
              <Badge variant="warning" size="sm">
                Permission-Gated
              </Badge>
            </div>
            <p className="ess-privacy-card-desc">
              HR Administration access is governed by fine-grained permissions (e.g.{' '}
              <code>hrms.employees.read</code>) granted only within your legal company. Arbitrary or
              cross-department unauthorized access is strictly denied.
            </p>
          </div>

          <div className="ess-privacy-card">
            <div className="ess-privacy-card-header">
              <span className="ess-privacy-card-title">
                <BezentIcon name="lock" size={16} />
                Statutory Data Masking
              </span>
              <Badge variant="success" size="sm">
                Masked at Source
              </Badge>
            </div>
            <p className="ess-privacy-card-desc">
              Salary bank accounts, PAN, Aadhaar, and national identity numbers are masked
              server-side (<code>••••••••1234</code>) before API transmission. Raw financial tokens
              are never exposed in client application storage.
            </p>
          </div>

          <div className="ess-privacy-card">
            <div className="ess-privacy-card-header">
              <span className="ess-privacy-card-title">
                <BezentIcon name="organization" size={16} />
                Organization &amp; Legal Isolation
              </span>
              <Badge variant="neutral" size="sm">
                Enforced Boundary
              </Badge>
            </div>
            <p className="ess-privacy-card-desc">
              All employee records and personnel data are strictly isolated by legal company.
              Cross-company access is restricted at the system architecture level.
            </p>
          </div>
        </div>
      </div>

      {/* ── Section 3: Account Activity & Active Sessions ─────────── */}
      <div className="ess-profile-section-panel" data-testid="privacy-section-account-activity">
        <div className="ess-profile-section-header">
          <div className="ess-profile-section-title-wrap">
            <div className="ess-profile-section-icon-badge">
              <BezentIcon name="calendar" size={16} />
            </div>
            <div>
              <h3 className="ess-profile-section-heading">Account Activity &amp; Session State</h3>
              <p className="ess-profile-section-desc">
                Current browser authentication state and enterprise session tracking
              </p>
            </div>
          </div>
        </div>

        {/* Current Active Session */}
        <div className="ess-privacy-session-box">
          <div className="ess-privacy-session-meta">
            <div className="ess-privacy-session-title">
              <Badge variant="success" size="sm">
                Active Session
              </Badge>
              <span>Current Browser Session</span>
            </div>
            <div className="ess-privacy-session-sub">
              <span>
                Authentication: <strong className="ess-privacy-tag">Encrypted Web Session</strong>
              </span>
              <span className="ess-profile-dot-separator">•</span>
              <span>
                Session Duration: <strong>Active (24-Hour Expiry)</strong>
              </span>
            </div>
          </div>

          <Button
            id="ess-privacy-signout-btn"
            variant="secondary"
            size="sm"
            onClick={() => setConfirmSignOutOpen(true)}
          >
            Sign Out Current Session
          </Button>
        </div>

        {/* Informational Multi-Session & Audit Note */}
        <EmptyState
          size="compact"
          title="Enterprise Session &amp; Security Oversight"
          description="Concurrent logins and security audit events are monitored centrally by organization administrators. Your current browser holds your verified sign-in session."
        />
      </div>

      {/* ── Section 4: Data Privacy & Statutory Requests ──────────── */}
      <div className="ess-profile-section-panel" data-testid="privacy-section-data-requests">
        <div className="ess-profile-section-header">
          <div className="ess-profile-section-title-wrap">
            <div className="ess-profile-section-icon-badge">
              <BezentIcon name="file" size={16} />
            </div>
            <div>
              <h3 className="ess-profile-section-heading">Data Privacy &amp; Statutory Requests</h3>
              <p className="ess-profile-section-desc">
                Workforce data compliance, statutory retention rules, and verified rectification
                workflows
              </p>
            </div>
          </div>
        </div>

        <Alert variant="info" title="Statutory Data Retention Notice">
          Under enterprise labor and tax regulations (e.g. Income Tax Act, Provident Fund
          regulations, and Companies Act), official employment files, payroll ledgers, and statutory
          tax filings are subject to mandatory statutory retention periods. Self-service automated
          deletion of active workforce records is legally prohibited.
        </Alert>

        <Stack gap="sm">
          <div className="ess-privacy-action-card">
            <div className="ess-privacy-action-content">
              <strong>Right to Rectification (Data Correction)</strong>
              <span className="ess-privacy-card-desc">
                Request formal corrections to verified personal identity, residential address, or
                emergency hierarchy records with HR verification.
              </span>
            </div>
            {onRequestCorrection && (
              <Button variant="secondary" size="sm" onClick={onRequestCorrection}>
                Request Correction
              </Button>
            )}
          </div>

          <div className="ess-privacy-action-card">
            <div className="ess-privacy-action-content">
              <strong>Review Profile Change History</strong>
              <span className="ess-privacy-card-desc">
                Track previous change submissions, verification notes, and approval outcomes logged
                with HR Administration.
              </span>
            </div>
            {onNavigateToChangeRequests && (
              <Button variant="secondary" size="sm" onClick={onNavigateToChangeRequests}>
                View Change Requests
              </Button>
            )}
          </div>

          <div className="ess-privacy-action-card">
            <div className="ess-privacy-action-content">
              <strong>Data Portability &amp; Exit Clearance</strong>
              <span className="ess-privacy-card-desc">
                Upon employment separation or transfer, certified experience documentation, tax
                forms (Form 16/tax receipts), and final settlement records are issued directly by HR
                Administration.
              </span>
            </div>
            <Badge variant="neutral" size="sm">
              HR Managed
            </Badge>
          </div>
        </Stack>
      </div>

      {/* ── Sign Out Confirmation Modal ───────────────────────────── */}
      {confirmSignOutOpen && (
        <Modal
          isOpen={true}
          title="Sign Out of BEZENT ESS"
          description="Terminate your active session and revoke the current authentication token"
          onClose={() => !signingOut && setConfirmSignOutOpen(false)}
          footer={
            <Inline gap="sm" justify="end">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setConfirmSignOutOpen(false)}
                disabled={signingOut}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleConfirmSignOut}
                loading={signingOut}
              >
                Sign Out
              </Button>
            </Inline>
          }
        >
          <Stack gap="sm">
            <span>
              Are you sure you want to end your current session? You will need to request a new
              verification code to sign back in.
            </span>
          </Stack>
        </Modal>
      )}
    </div>
  );
}

export default EssPrivacyTab;
