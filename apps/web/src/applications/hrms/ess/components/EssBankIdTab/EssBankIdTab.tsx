import { useState, type ReactNode } from 'react';
import {
  Alert,
  Badge,
  Button,
  Modal,
  Inline,
  Stack,
  type BadgeVariant,
} from '../../../../../design-system/components';
import { BezentIcon } from '../../../../../design-system/icons';
import type { EssFullProfile, EssDocument } from '../../api/essApi';

export interface EssBankIdTabProps {
  profile: EssFullProfile;
  documents?: EssDocument[];
  onNavigateToDocuments?: () => void;
}

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr.includes('T') ? dateStr : `${dateStr}T00:00:00Z`);
    if (Number.isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC',
    });
  } catch {
    return dateStr;
  }
}

function formatLabel(s?: string | null): string {
  if (!s) return '—';
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function getDocStatusVariant(status?: string | null): BadgeVariant {
  switch (status) {
    case 'verified':
      return 'success';
    case 'under_review':
    case 'pending':
      return 'info';
    case 'resubmission_required':
      return 'warning';
    case 'rejected':
    case 'expired':
      return 'danger';
    default:
      return 'neutral';
  }
}

interface SectionPanelProps {
  id: string;
  iconName: string;
  title: string;
  description: string;
  action?: ReactNode;
  children: ReactNode;
}

function SectionPanel({ id, iconName, title, description, action, children }: SectionPanelProps) {
  return (
    <div id={id} className="ess-profile-section-panel">
      <div className="ess-profile-section-header">
        <div className="ess-profile-section-title-wrap">
          <div className="ess-profile-section-icon-badge">
            <BezentIcon name={iconName} size={16} />
          </div>
          <div>
            <h3 className="ess-profile-section-heading">{title}</h3>
            <p className="ess-profile-section-desc">{description}</p>
          </div>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

interface FieldItemProps {
  label: string;
  value: ReactNode;
  badge?: ReactNode;
  empty?: boolean;
}

function FieldItem({ label, value, badge, empty }: FieldItemProps) {
  return (
    <div className="ess-profile-field-item">
      <div className="ess-profile-field-label-row">
        <span className="ess-profile-field-label">{label}</span>
        {badge}
      </div>
      <span className={`ess-profile-field-value${empty ? ' is-empty' : ''}`}>{value ?? '—'}</span>
    </div>
  );
}

interface CompactEmptyInlineProps {
  iconName: string;
  title: string;
  description: string;
}

function CompactEmptyInline({ iconName, title, description }: CompactEmptyInlineProps) {
  return (
    <div className="ess-profile-empty-inline">
      <div className="ess-profile-empty-inline-icon">
        <BezentIcon name={iconName} size={16} />
      </div>
      <div className="ess-profile-empty-inline-content">
        <span className="ess-profile-empty-inline-title">{title}</span>
        <span className="ess-profile-empty-inline-desc">{description}</span>
      </div>
    </div>
  );
}

export function EssBankIdTab({
  profile,
  documents = [],
  onNavigateToDocuments,
}: EssBankIdTabProps) {
  const { bankAccount } = profile;
  const [bankModalOpen, setBankModalOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<EssDocument | null>(null);

  // Section 2: Filter government identity records
  const govDocs = documents.filter((d) => {
    if (d.category === 'personal_identity') return true;
    const nameLower = d.documentName.toLowerCase();
    return d.category === 'tax_other' && nameLower.includes('pan');
  });

  // Section 3: Filter social security / retirement benefits records
  const socialSecurityDocs = documents.filter((d) => {
    const nameLower = d.documentName.toLowerCase();
    const isSocialSecurityName =
      nameLower.includes('uan') ||
      nameLower.includes('pf') ||
      nameLower.includes('provident') ||
      nameLower.includes('esi') ||
      nameLower.includes('social security');
    return isSocialSecurityName;
  });

  // Section 4: Filter all compliance & verification proofs
  const verificationDocs = documents.filter((d) =>
    ['personal_identity', 'bank_payroll', 'tax_other'].includes(d.category),
  );

  return (
    <div className="ess-profile-sections-stack" data-testid="ess-bank-id-tab">
      {/* ── 1. Salary Bank Account ─────────────────────────────────── */}
      <SectionPanel
        id="ess-section-bank-account"
        iconName="bank"
        title="Salary Bank Account"
        description="Verified corporate bank account for monthly payroll and expense reimbursement disbursements"
        action={
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setBankModalOpen(true)}
            data-testid="request-bank-update-btn"
          >
            Request Account Update
          </Button>
        }
      >
        {bankAccount ? (
          <div className="ess-profile-field-grid" data-testid="bank-details-grid">
            <FieldItem label="Bank Name" value={bankAccount.bankName} />
            <FieldItem label="Account Holder Name" value={bankAccount.accountHolderName} />
            <FieldItem
              label="Account Number"
              value={bankAccount.maskedAccountNumber}
              badge={
                <Badge variant="neutral" size="sm">
                  Masked
                </Badge>
              }
            />
            <FieldItem label="IFSC Code" value={bankAccount.ifscCode} />
            <FieldItem
              label="Branch Name"
              value={bankAccount.branchName || '—'}
              empty={!bankAccount.branchName}
            />
            <FieldItem
              label="Bank Location"
              value={bankAccount.bankLocation || '—'}
              empty={!bankAccount.bankLocation}
            />
          </div>
        ) : (
          <CompactEmptyInline
            iconName="bank"
            title="No bank account registered"
            description="Corporate salary disbursement account details will appear here once registered."
          />
        )}
      </SectionPanel>

      {/* ── 2. Tax & Government Identifiers ────────────────────────── */}
      <SectionPanel
        id="ess-section-government-ids"
        iconName="badge-check"
        title="Tax & Government Identifiers"
        description="Statutory tax identifiers and government-issued personal identification records"
      >
        {govDocs.length > 0 ? (
          <div className="ess-profile-doc-list" data-testid="government-ids-list">
            {govDocs.map((doc) => (
              <div key={doc.id} className="ess-profile-doc-card">
                <div className="ess-profile-doc-meta">
                  <span className="ess-profile-doc-name">{doc.documentName}</span>
                  <span className="ess-profile-doc-sub">
                    {doc.documentNumber ? `ID: ${doc.documentNumber}` : 'Verified Copy'}
                    {doc.expiryDate ? ` · Expires: ${formatDate(doc.expiryDate)}` : ''}
                    {` · Added: ${formatDate(doc.createdAt)}`}
                  </span>
                </div>
                <div className="ess-profile-doc-badge">
                  <Badge variant={getDocStatusVariant(doc.status)} size="sm">
                    {formatLabel(doc.status)}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <CompactEmptyInline
            iconName="badge-check"
            title="No government identifiers on file"
            description="Statutory tax and personal identity records will appear here when verified."
          />
        )}
      </SectionPanel>

      {/* ── 3. Social Security & Benefits ───────────────────────────── */}
      <SectionPanel
        id="ess-section-social-security"
        iconName="shield-check"
        title="Social Security & Benefits"
        description="Universal retirement, provident fund, and statutory social security enrollment"
      >
        {socialSecurityDocs.length > 0 ? (
          <div className="ess-profile-doc-list" data-testid="social-security-list">
            {socialSecurityDocs.map((doc) => (
              <div key={doc.id} className="ess-profile-doc-card">
                <div className="ess-profile-doc-meta">
                  <span className="ess-profile-doc-name">{doc.documentName}</span>
                  <span className="ess-profile-doc-sub">
                    {doc.documentNumber ? `ID: ${doc.documentNumber}` : 'Record Active'}
                    {doc.expiryDate ? ` · Expires: ${formatDate(doc.expiryDate)}` : ''}
                    {` · Added: ${formatDate(doc.createdAt)}`}
                  </span>
                </div>
                <div className="ess-profile-doc-badge">
                  <Badge variant={getDocStatusVariant(doc.status)} size="sm">
                    {formatLabel(doc.status)}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <CompactEmptyInline
            iconName="shield-check"
            title="No social security records available"
            description="Provident Fund (UAN) and Employee State Insurance (ESI) details will appear here once verified by HR."
          />
        )}
      </SectionPanel>

      {/* ── 4. Verification Documents & Proofs ─────────────────────── */}
      <SectionPanel
        id="ess-section-verification-docs"
        iconName="documents"
        title="Verification Documents & Proofs"
        description="Official proofs uploaded for banking, statutory compliance, and identity verification"
      >
        {verificationDocs.length > 0 ? (
          <div className="ess-profile-doc-list" data-testid="verification-docs-list">
            {verificationDocs.map((doc) => (
              <div key={doc.id} className="ess-profile-doc-card">
                <div className="ess-profile-doc-meta">
                  <span className="ess-profile-doc-name">{doc.documentName}</span>
                  <span className="ess-profile-doc-sub">
                    {formatLabel(doc.category)}
                    {doc.documentNumber ? ` · ID: ${doc.documentNumber}` : ''}
                    {doc.expiryDate ? ` · Expires: ${formatDate(doc.expiryDate)}` : ''}
                    {` · Added: ${formatDate(doc.createdAt)}`}
                  </span>
                </div>
                <div className="ess-profile-doc-badge">
                  <Badge variant={getDocStatusVariant(doc.status)} size="sm">
                    {formatLabel(doc.status)}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedDoc(doc)}
                    data-testid={`view-doc-${doc.id}`}
                  >
                    View Details
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <CompactEmptyInline
            iconName="documents"
            title="No verification documents uploaded"
            description="Official documents submitted for banking, tax, and identity compliance will appear here."
          />
        )}
      </SectionPanel>

      {/* ── Salary Account Update Informational Modal ───────────────── */}
      <Modal
        isOpen={bankModalOpen}
        title="Salary Bank Account Update"
        description="Payroll security and statutory compliance instructions"
        onClose={() => setBankModalOpen(false)}
        footer={
          <Inline gap="sm" justify="end">
            <Button variant="secondary" onClick={() => setBankModalOpen(false)}>
              Cancel
            </Button>
            {onNavigateToDocuments && (
              <Button
                variant="primary"
                onClick={() => {
                  setBankModalOpen(false);
                  onNavigateToDocuments();
                }}
              >
                Go to Documents Portal
              </Button>
            )}
          </Inline>
        }
      >
        <Stack gap="md">
          <Alert variant="info" title="Verification Policy Notice">
            For payroll fraud prevention and banking regulation compliance, salary account changes
            require formal HR & Payroll verification. Direct online modification of bank account
            numbers is restricted.
          </Alert>

          <div className="ess-bank-id-steps">
            <div className="ess-bank-id-step-item">
              <span className="ess-bank-id-step-num">1</span>
              <span>
                Obtain a signed cancelled cheque or official bank statement showing your legal name,
                account number, and IFSC code.
              </span>
            </div>
            <div className="ess-bank-id-step-item">
              <span className="ess-bank-id-step-num">2</span>
              <span>
                Upload the document under <strong>Bank & Payroll</strong> in the ESS Documents
                portal for administrative review.
              </span>
            </div>
            <div className="ess-bank-id-step-item">
              <span className="ess-bank-id-step-num">3</span>
              <span>
                HR & Payroll Administration will verify your bank mandate before the upcoming
                monthly payroll cutoff.
              </span>
            </div>
          </div>
        </Stack>
      </Modal>

      {/* ── Document Details Modal ─────────────────────────────────── */}
      {selectedDoc && (
        <Modal
          isOpen={Boolean(selectedDoc)}
          title={selectedDoc.documentName}
          description="Verification document details and compliance status"
          onClose={() => setSelectedDoc(null)}
          footer={
            <Inline gap="sm" justify="end">
              <Button variant="secondary" onClick={() => setSelectedDoc(null)}>
                Close
              </Button>
            </Inline>
          }
        >
          <Stack gap="md">
            <div className="ess-profile-field-grid">
              <FieldItem label="Document Name" value={selectedDoc.documentName} />
              <FieldItem label="Category" value={formatLabel(selectedDoc.category)} />
              <FieldItem
                label="Identifier Number"
                value={selectedDoc.documentNumber || '—'}
                badge={
                  selectedDoc.documentNumber ? (
                    <Badge variant="neutral" size="sm">
                      Masked
                    </Badge>
                  ) : undefined
                }
                empty={!selectedDoc.documentNumber}
              />
              <FieldItem
                label="Verification Status"
                value={
                  <Badge variant={getDocStatusVariant(selectedDoc.status)} size="sm">
                    {formatLabel(selectedDoc.status)}
                  </Badge>
                }
              />
              <FieldItem
                label="Expiry Date"
                value={formatDate(selectedDoc.expiryDate)}
                empty={!selectedDoc.expiryDate}
              />
              <FieldItem label="Upload Date" value={formatDate(selectedDoc.createdAt)} />
            </div>

            {selectedDoc.verificationRemarks && (
              <Alert variant="warning" title="Action Required / Verification Remarks">
                {selectedDoc.verificationRemarks}
              </Alert>
            )}
          </Stack>
        </Modal>
      )}
    </div>
  );
}
