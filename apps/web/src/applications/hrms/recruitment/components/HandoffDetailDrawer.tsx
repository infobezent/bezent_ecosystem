import {
  Alert,
  Avatar,
  Badge,
  Button,
  Card,
  CardBody,
  Divider,
  Grid,
  Inline,
  Modal,
  Stack,
} from '../../../../design-system/components';
import { BezentIcon } from '../../../../design-system/icons';
import type { OnboardingHandoffItem } from '../types/handoff';
import { formatHandoffStatusPill } from './HandoffTable';

export interface HandoffDetailDrawerProps {
  item: OnboardingHandoffItem | null;
  isOpen: boolean;
  onClose: () => void;
  onInitiateConversion?: (item: OnboardingHandoffItem) => void;
  onOpenWorkforceOnboarding?: (item: OnboardingHandoffItem) => void;
}

export function HandoffDetailDrawer({
  item,
  isOpen,
  onClose,
  onInitiateConversion,
  onOpenWorkforceOnboarding,
}: HandoffDetailDrawerProps) {
  if (!item) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      title={
        <Inline align="center" gap="sm">
          <BezentIcon name="onboarding" size="action" />
          <span>Handoff Passport — {item.candidateName}</span>
          {formatHandoffStatusPill(item.status)}
        </Inline>
      }
      description={`${item.jobTitle} (${item.jobCode}) • ${item.department}`}
      footer={
        <Inline justify="between" align="center">
          <span className="bezent-text-xs bezent-text-secondary">
            Candidate ID: {item.candidateNumber} • Offer: {item.offerNumber}
          </span>
          <Inline gap="sm">
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
            {item.status === 'ready_for_handoff' && onInitiateConversion && (
              <Button
                variant="primary"
                onClick={() => {
                  onInitiateConversion(item);
                  onClose();
                }}
              >
                Convert to Onboarding Case
              </Button>
            )}
            {item.status === 'handoff_completed' && onOpenWorkforceOnboarding && (
              <Button
                variant="primary"
                onClick={() => {
                  onOpenWorkforceOnboarding(item);
                  onClose();
                }}
              >
                Open in Workforce Onboarding
              </Button>
            )}
          </Inline>
        </Inline>
      }
    >
      <Stack gap="lg">
        {/* Candidate Profile summary */}
        <Card variant="flat" padding="md">
          <CardBody>
            <Inline align="center" gap="md">
              <Avatar
                initials={item.candidateName
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .slice(0, 2)}
                color={item.candidateAvatarColor}
                size="lg"
              />
              <Stack gap="none">
                <span className="bezent-text-base bezent-font-semibold">{item.candidateName}</span>
                <span className="bezent-text-xs bezent-text-secondary">
                  {item.candidateEmail} • {item.candidatePhone}
                </span>
                <span className="bezent-text-xs text-primary-700 font-medium">
                  {item.designationLevel} ({item.location})
                </span>
              </Stack>
            </Inline>
          </CardBody>
        </Card>

        {/* Status Verification Matrix */}
        <Card variant="flat" padding="md">
          <CardBody>
            <Stack gap="sm">
              <span className="bezent-font-semibold bezent-text-sm">
                Pre-Handoff Verification Checklist
              </span>
              <Divider />
              <Grid columns={2} gap="sm">
                <Inline justify="between" align="center">
                  <span className="bezent-text-xs bezent-text-secondary">
                    Digital Offer Letter:
                  </span>
                  {item.signedOfferReceived ? (
                    <Badge variant="success" size="sm">
                      Signed &amp; Stored
                    </Badge>
                  ) : (
                    <Badge variant="warning" size="sm">
                      Awaiting Signature
                    </Badge>
                  )}
                </Inline>

                <Inline justify="between" align="center">
                  <span className="bezent-text-xs bezent-text-secondary">
                    Background Verification:
                  </span>
                  {item.bgvStatus === 'cleared' ? (
                    <Badge variant="success" size="sm">
                      SpringVerify Cleared
                    </Badge>
                  ) : (
                    <Badge variant="info" size="sm">
                      {item.bgvStatus}
                    </Badge>
                  )}
                </Inline>

                <Inline justify="between" align="center">
                  <span className="bezent-text-xs bezent-text-secondary">Target Joining Date:</span>
                  <span className="bezent-text-xs bezent-font-bold text-primary-700">
                    {item.targetJoiningDate}
                  </span>
                </Inline>

                <Inline justify="between" align="center">
                  <span className="bezent-text-xs bezent-text-secondary">
                    Assigned People Partner:
                  </span>
                  <span className="bezent-text-xs bezent-font-medium">{item.assignedPartner}</span>
                </Inline>
              </Grid>
            </Stack>
          </CardBody>
        </Card>

        {/* Duplicate Prevention Guard */}
        {item.duplicateCheck.hasDuplicate ? (
          <Alert variant="warning">
            <strong>Duplicate Guard Alert:</strong> Matched former employee record{' '}
            <strong>{item.duplicateCheck.existingEmployeeCode}</strong> (
            {item.duplicateCheck.existingEmployeeName}). Will be handled as a Re-hire to preserve
            historic continuity.
          </Alert>
        ) : (
          <Alert variant="success">
            <strong>Duplicate Guard Clear:</strong> Candidate does not collide with any active or
            inactive employee record in BEZENT.
          </Alert>
        )}

        {/* If converted, show Case Info */}
        {item.onboardingCaseCode && (
          <Card variant="tint-blue" padding="md">
            <CardBody>
              <Stack gap="xs">
                <span className="bezent-font-semibold bezent-text-sm">Active Onboarding Case</span>
                <Inline align="center" gap="md">
                  <span className="bezent-text-xs text-blue-900 font-mono">
                    Case Code: <strong>{item.onboardingCaseCode}</strong>
                  </span>
                  <span className="bezent-text-xs text-blue-900 font-mono">
                    Assigned Employee Code: <strong>{item.employeeCode}</strong>
                  </span>
                  <span className="bezent-text-xs text-blue-900">
                    Handoff Date: <strong>{item.handoffDate}</strong>
                  </span>
                </Inline>
              </Stack>
            </CardBody>
          </Card>
        )}

        {item.notes && (
          <div className="text-xs text-gray-600 bg-gray-50 p-2.5 rounded">
            <strong>Audit Notes:</strong> {item.notes}
          </div>
        )}
      </Stack>
    </Modal>
  );
}
