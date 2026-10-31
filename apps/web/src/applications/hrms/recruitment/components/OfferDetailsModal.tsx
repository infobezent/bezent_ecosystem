import { useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  Divider,
  Grid,
  Inline,
  Modal,
  Stack,
  Tabs,
} from '../../../../design-system/components';
import { BezentIcon } from '../../../../design-system/icons';
import type { JobOffer } from '../types/offer';
import { formatCtc, formatOfferStatusPill } from './OffersTable';

export interface OfferDetailsModalProps {
  offer: JobOffer | null;
  isOpen: boolean;
  onClose: () => void;
  onApprove?: (offerId: string, comments: string) => void;
  onSendOffer?: (offerId: string) => void;
  onInitiateHandoff?: (offer: JobOffer) => void;
}

export function OfferDetailsModal({
  offer,
  isOpen,
  onClose,
  onApprove,
  onSendOffer,
  onInitiateHandoff,
}: OfferDetailsModalProps) {
  const [activeTab, setActiveTab] = useState<'compensation' | 'approval' | 'document' | 'handoff'>(
    'compensation',
  );

  if (!offer) return null;

  const tabItems = [
    { id: 'compensation', label: 'Compensation & Package' },
    {
      id: 'approval',
      label: `Approval Workflow (${offer.approvalChain.filter((s) => s.status === 'approved').length}/${offer.approvalChain.length})`,
    },
    { id: 'document', label: 'Offer Letter & Contracts' },
    { id: 'handoff', label: 'Onboarding Handoff' },
  ];

  const comp = offer.compensation;
  const isApprovedAll = offer.approvalChain.every((s) => s.status === 'approved');

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="xl"
      title={
        <Inline align="center" gap="sm">
          <BezentIcon name="offers" size="action" />
          <span>
            {offer.offerNumber} — {offer.candidateName}
          </span>
          {formatOfferStatusPill(offer.status)}
        </Inline>
      }
      description={
        <Inline align="center" gap="md" wrap>
          <span>
            Role: <strong>{offer.jobTitle}</strong> ({offer.jobCode})
          </span>
          <span>•</span>
          <span>{offer.department}</span>
          <span>•</span>
          <Badge variant="neutral" size="sm">
            {offer.designationLevel}
          </Badge>
        </Inline>
      }
      footer={
        <Inline justify="between" align="center">
          <span className="bezent-text-xs bezent-text-secondary">
            Offered CTC: <strong>{formatCtc(comp.totalCtc, offer.currency)}</strong> • Joining:{' '}
            {offer.targetJoiningDate}
          </span>
          <Inline gap="sm">
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
            {offer.status === 'pending_approval' && onApprove && (
              <Button
                variant="primary"
                onClick={() => {
                  onApprove(offer.id, 'Approved via Offer Review');
                  onClose();
                }}
              >
                Approve Offer
              </Button>
            )}
            {offer.status === 'approved' && onSendOffer && (
              <Button
                variant="primary"
                onClick={() => {
                  onSendOffer(offer.id);
                  onClose();
                }}
              >
                Send Formal Letter
              </Button>
            )}
            {offer.status === 'accepted' && onInitiateHandoff && (
              <Button
                variant="primary"
                onClick={() => {
                  onInitiateHandoff(offer);
                  onClose();
                }}
              >
                Convert to Onboarding
              </Button>
            )}
          </Inline>
        </Inline>
      }
    >
      <Stack gap="lg">
        {/* Navigation Tabs */}
        <Tabs
          items={tabItems}
          activeId={activeTab}
          onChange={(id) => setActiveTab(id as typeof activeTab)}
        />

        {/* Tab 1: Compensation Breakdown */}
        {activeTab === 'compensation' && (
          <Stack gap="md">
            <Grid columns={3} gap="md">
              <Card variant="flat" padding="md">
                <CardBody>
                  <Stack gap="xs">
                    <span className="bezent-text-secondary bezent-text-xs">Annual Gross CTC</span>
                    <span className="bezent-text-2xl bezent-font-bold text-primary-700">
                      {formatCtc(comp.totalCtc, offer.currency)}
                    </span>
                    <span className="bezent-text-xs bezent-text-secondary">
                      Monthly: {formatCtc(Math.round(comp.totalCtc / 12), offer.currency)}
                    </span>
                  </Stack>
                </CardBody>
              </Card>

              <Card variant="flat" padding="md">
                <CardBody>
                  <Stack gap="xs">
                    <span className="bezent-text-secondary bezent-text-xs">
                      Base Pay (Guaranteed)
                    </span>
                    <span className="bezent-text-2xl bezent-font-semibold">
                      {formatCtc(comp.basePay, offer.currency)}
                    </span>
                    <span className="bezent-text-xs bezent-text-secondary">
                      {Math.round((comp.basePay / comp.totalCtc) * 100)}% of total package
                    </span>
                  </Stack>
                </CardBody>
              </Card>

              <Card variant="flat" padding="md">
                <CardBody>
                  <Stack gap="xs">
                    <span className="bezent-text-secondary bezent-text-xs">
                      Variable / Performance
                    </span>
                    <span className="bezent-text-2xl bezent-font-semibold">
                      {formatCtc(comp.performanceBonus, offer.currency)}
                    </span>
                    <span className="bezent-text-xs bezent-text-secondary">
                      Annual review bonus
                    </span>
                  </Stack>
                </CardBody>
              </Card>
            </Grid>

            {/* Salary Components Breakdown Table */}
            <Card variant="flat" padding="md">
              <CardBody>
                <Stack gap="sm">
                  <span className="bezent-font-semibold bezent-text-sm">
                    Detailed Salary Breakdown
                  </span>
                  <Divider />
                  <Grid columns={2} gap="sm">
                    <Inline justify="between" align="center">
                      <span className="bezent-text-xs bezent-text-secondary">
                        Basic Salary (Monthly / Annual)
                      </span>
                      <span className="bezent-text-xs bezent-font-medium">
                        {formatCtc(comp.basePay, offer.currency)}
                      </span>
                    </Inline>
                    <Inline justify="between" align="center">
                      <span className="bezent-text-xs bezent-text-secondary">
                        House Rent Allowance (HRA)
                      </span>
                      <span className="bezent-text-xs bezent-font-medium">
                        {formatCtc(comp.houseRentAllowance, offer.currency)}
                      </span>
                    </Inline>
                    <Inline justify="between" align="center">
                      <span className="bezent-text-xs bezent-text-secondary">
                        Special Allowance
                      </span>
                      <span className="bezent-text-xs bezent-font-medium">
                        {formatCtc(comp.specialAllowance, offer.currency)}
                      </span>
                    </Inline>
                    <Inline justify="between" align="center">
                      <span className="bezent-text-xs bezent-text-secondary">Statutory Bonus</span>
                      <span className="bezent-text-xs bezent-font-medium">
                        {formatCtc(comp.statutoryBonus, offer.currency)}
                      </span>
                    </Inline>
                    <Inline justify="between" align="center">
                      <span className="bezent-text-xs bezent-text-secondary">
                        Employer Provident Fund (PF)
                      </span>
                      <span className="bezent-text-xs bezent-font-medium">
                        {formatCtc(comp.providentFundEmployer, offer.currency)}
                      </span>
                    </Inline>
                    {comp.stockOptionsValue && (
                      <Inline justify="between" align="center">
                        <span className="bezent-text-xs bezent-text-secondary">
                          ESOPs / Stock Units (Year 1)
                        </span>
                        <span className="bezent-text-xs bezent-font-medium text-primary-600">
                          {formatCtc(comp.stockOptionsValue, offer.currency)}
                        </span>
                      </Inline>
                    )}
                  </Grid>
                </Stack>
              </CardBody>
            </Card>

            {offer.notes && (
              <Alert variant="info">
                <strong>Internal Recruiter Notes:</strong> {offer.notes}
              </Alert>
            )}

            {offer.declineReason && (
              <Alert variant="danger">
                <strong>Candidate Decline Reason:</strong> {offer.declineReason}
              </Alert>
            )}
          </Stack>
        )}

        {/* Tab 2: Approval Chain */}
        {activeTab === 'approval' && (
          <Stack gap="md">
            <span className="bezent-font-semibold bezent-text-sm">
              Multi-Tier Offer Approval Chain
            </span>
            <div className="space-y-3">
              {offer.approvalChain.map((step, idx) => (
                <Card key={step.id} variant="flat" padding="sm">
                  <CardBody>
                    <Inline justify="between" align="center">
                      <Inline align="center" gap="sm">
                        <span className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center bezent-text-xs bezent-font-bold text-gray-700">
                          {idx + 1}
                        </span>
                        <Stack gap="none">
                          <span className="bezent-font-semibold bezent-text-sm">
                            {step.approverRole}: {step.approverName}
                          </span>
                          <span className="bezent-text-xs bezent-text-secondary">
                            {step.approverEmail}
                          </span>
                        </Stack>
                      </Inline>

                      <Inline align="center" gap="md">
                        {step.actionDate && (
                          <span className="bezent-text-xs bezent-text-secondary">
                            Signed on {step.actionDate}
                          </span>
                        )}
                        {step.status === 'approved' ? (
                          <Badge variant="success" size="sm">
                            Approved
                          </Badge>
                        ) : step.status === 'rejected' ? (
                          <Badge variant="danger" size="sm">
                            Rejected
                          </Badge>
                        ) : (
                          <Badge variant="warning" size="sm">
                            Pending Sign-Off
                          </Badge>
                        )}
                      </Inline>
                    </Inline>

                    {step.comments && (
                      <div className="mt-2 text-xs text-gray-600 bg-gray-50 p-2 rounded">
                        &quot;{step.comments}&quot;
                      </div>
                    )}
                  </CardBody>
                </Card>
              ))}
            </div>

            {isApprovedAll && (
              <Alert variant="success">
                All designated sign-off authorities have approved this compensation structure. The
                formal offer letter can be released.
              </Alert>
            )}
          </Stack>
        )}

        {/* Tab 3: Offer Letter & Documents */}
        {activeTab === 'document' && (
          <Stack gap="md">
            <Card variant="flat" padding="md">
              <CardBody>
                <Stack gap="sm">
                  <Inline justify="between" align="center">
                    <Inline align="center" gap="sm">
                      <BezentIcon name="documents" size="action" color="var(--color-primary-600)" />
                      <Stack gap="none">
                        <span className="bezent-font-semibold bezent-text-sm">
                          Standard Enterprise Offer Letter ({offer.offerNumber}.pdf)
                        </span>
                        <span className="bezent-text-xs bezent-text-secondary">
                          Includes Non-Disclosure, Non-Compete, and Compensation Annexure A
                        </span>
                      </Stack>
                    </Inline>
                    {offer.offerLetterUrl && (
                      <a
                        href={offer.offerLetterUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="bezent-btn bezent-btn--secondary bezent-btn--sm"
                      >
                        Preview Draft PDF
                      </a>
                    )}
                  </Inline>

                  <Divider />

                  <Inline justify="between" align="center">
                    <Inline align="center" gap="sm">
                      <BezentIcon name="check" size="action" color="var(--color-success-600)" />
                      <Stack gap="none">
                        <span className="bezent-font-semibold bezent-text-sm">
                          Digitally Signed Acceptance Copy
                        </span>
                        <span className="bezent-text-xs bezent-text-secondary">
                          {offer.signedDocumentUrl
                            ? 'Signed via DocuSign by candidate and HR Operations'
                            : 'Awaiting signature from candidate'}
                        </span>
                      </Stack>
                    </Inline>
                    {offer.signedDocumentUrl ? (
                      <a
                        href={offer.signedDocumentUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="bezent-btn bezent-btn--primary bezent-btn--sm"
                      >
                        Download Signed PDF
                      </a>
                    ) : (
                      <Badge variant="neutral" size="sm">
                        Unsigned
                      </Badge>
                    )}
                  </Inline>
                </Stack>
              </CardBody>
            </Card>
          </Stack>
        )}

        {/* Tab 4: Onboarding Handoff */}
        {activeTab === 'handoff' && (
          <Stack gap="md">
            <Card variant="tint-blue" padding="md">
              <CardBody>
                <Stack gap="sm">
                  <Inline align="center" gap="sm">
                    <BezentIcon name="onboarding" size="action" color="var(--color-primary-600)" />
                    <span className="bezent-font-semibold bezent-text-base">
                      Bridge to BEZENT Onboarding (`onboarding_cases`)
                    </span>
                  </Inline>
                  <p className="bezent-text-xs text-gray-700">
                    Per <strong>ADR-009 (Candidate ≠ Employee)</strong>, once a candidate accepts
                    their formal offer, they transition into pre-boarding and background
                    verification before employee record creation.
                  </p>
                  <Divider />
                  <Grid columns={2} gap="sm">
                    <Inline justify="between" align="center">
                      <span className="bezent-text-xs bezent-text-secondary">
                        Target Joining Date:
                      </span>
                      <span className="bezent-text-xs bezent-font-semibold">
                        {offer.targetJoiningDate}
                      </span>
                    </Inline>
                    <Inline justify="between" align="center">
                      <span className="bezent-text-xs bezent-text-secondary">
                        Designated Department:
                      </span>
                      <span className="bezent-text-xs bezent-font-semibold">
                        {offer.department}
                      </span>
                    </Inline>
                    <Inline justify="between" align="center">
                      <span className="bezent-text-xs bezent-text-secondary">Handoff Status:</span>
                      <span className="bezent-text-xs bezent-font-semibold text-primary-700">
                        {offer.status === 'accepted'
                          ? 'Ready for Handoff'
                          : 'Offer must be Accepted first'}
                      </span>
                    </Inline>
                  </Grid>

                  {offer.status === 'accepted' && (
                    <div className="pt-2">
                      <Button
                        variant="primary"
                        onClick={() => {
                          if (onInitiateHandoff) onInitiateHandoff(offer);
                          onClose();
                        }}
                      >
                        Convert &amp; Initialize Onboarding Case
                      </Button>
                    </div>
                  )}
                </Stack>
              </CardBody>
            </Card>
          </Stack>
        )}
      </Stack>
    </Modal>
  );
}
