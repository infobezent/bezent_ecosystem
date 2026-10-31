import {
  Avatar,
  Badge,
  Button,
  EmptyState,
  Inline,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '../../../../design-system/components';
import type { HandoffStatus, OnboardingHandoffItem } from '../types/handoff';

export interface HandoffTableProps {
  handoffs: OnboardingHandoffItem[];
  onSelectHandoff: (item: OnboardingHandoffItem) => void;
  onInitiateConversion: (item: OnboardingHandoffItem) => void;
  onOpenWorkforceOnboarding?: (item: OnboardingHandoffItem) => void;
}

export function formatHandoffStatusPill(status: HandoffStatus) {
  switch (status) {
    case 'ready_for_handoff':
      return <Badge variant="info">Ready to Convert</Badge>;
    case 'handoff_in_progress':
      return <Badge variant="warning">Pre-Boarding</Badge>;
    case 'handoff_completed':
      return <Badge variant="success">Handoff Complete</Badge>;
    case 'on_hold':
      return <Badge variant="neutral">On Hold</Badge>;
    default:
      return <Badge variant="neutral">{status}</Badge>;
  }
}

export function HandoffTable({
  handoffs,
  onSelectHandoff,
  onInitiateConversion,
  onOpenWorkforceOnboarding,
}: HandoffTableProps) {
  if (handoffs.length === 0) {
    return (
      <EmptyState
        title="No Handoff Items"
        description="No hired candidates currently match your filter criteria."
        variant="recruitment"
      />
    );
  }

  return (
    <Table hoverable>
      <TableHead>
        <TableRow>
          <TableHeaderCell>Candidate</TableHeaderCell>
          <TableHeaderCell>Role &amp; Department</TableHeaderCell>
          <TableHeaderCell>Target Joining</TableHeaderCell>
          <TableHeaderCell>Prerequisites</TableHeaderCell>
          <TableHeaderCell>Duplicate Guard</TableHeaderCell>
          <TableHeaderCell>Handoff Status</TableHeaderCell>
          <TableHeaderCell>Actions</TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {handoffs.map((item) => {
          const initials = item.candidateName
            .split(' ')
            .map((n) => n[0])
            .join('')
            .slice(0, 2);

          return (
            <TableRow key={item.id}>
              {/* Candidate */}
              <TableCell>
                <Inline align="center" gap="sm">
                  <Avatar
                    initials={initials}
                    color={item.candidateAvatarColor}
                    size="md"
                  />
                  <Stack gap="none">
                    <span className="bezent-font-semibold bezent-text-sm">
                      {item.candidateName}
                    </span>
                    <span className="bezent-text-xs bezent-text-secondary">
                      {item.candidateNumber} • {item.candidateEmail}
                    </span>
                  </Stack>
                </Inline>
              </TableCell>

              {/* Role & Dept */}
              <TableCell>
                <Stack gap="none">
                  <span className="bezent-font-medium bezent-text-sm">
                    {item.jobTitle}
                  </span>
                  <span className="bezent-text-xs bezent-text-secondary">
                    {item.department} • {item.designationLevel}
                  </span>
                </Stack>
              </TableCell>

              {/* Target Joining */}
              <TableCell>
                <Stack gap="none">
                  <span className="bezent-font-semibold bezent-text-sm text-primary-700">
                    {item.targetJoiningDate}
                  </span>
                  <span className="bezent-text-xs bezent-text-secondary">
                    Partner: {item.assignedPartner}
                  </span>
                </Stack>
              </TableCell>

              {/* Prerequisites */}
              <TableCell>
                <Stack gap="xs">
                  <Inline align="center" gap="xs">
                    {item.signedOfferReceived ? (
                      <Badge variant="success" size="sm">Offer Signed</Badge>
                    ) : (
                      <Badge variant="warning" size="sm">Offer Unsigned</Badge>
                    )}
                    {item.bgvStatus === 'cleared' ? (
                      <Badge variant="success" size="sm">BGV Cleared</Badge>
                    ) : item.bgvStatus === 'in_progress' ? (
                      <Badge variant="info" size="sm">BGV In Progress</Badge>
                    ) : (
                      <Badge variant="neutral" size="sm">BGV Pending</Badge>
                    )}
                  </Inline>
                </Stack>
              </TableCell>

              {/* Duplicate Guard */}
              <TableCell>
                {item.duplicateCheck.hasDuplicate ? (
                  <Stack gap="none">
                    <Badge variant="warning" size="sm">Match Detected</Badge>
                    <span className="bezent-text-xs text-amber-700 font-medium">
                      Matches {item.duplicateCheck.existingEmployeeCode}
                    </span>
                  </Stack>
                ) : (
                  <Badge variant="neutral" size="sm">Clean Record</Badge>
                )}
              </TableCell>

              {/* Handoff Status */}
              <TableCell>
                <Stack gap="none">
                  {formatHandoffStatusPill(item.status)}
                  {item.onboardingCaseCode && (
                    <span className="bezent-text-xs bezent-text-secondary font-mono mt-0.5">
                      {item.onboardingCaseCode} • {item.employeeCode}
                    </span>
                  )}
                </Stack>
              </TableCell>

              {/* Actions */}
              <TableCell>
                <Inline align="center" gap="xs">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => onSelectHandoff(item)}
                  >
                    View Details
                  </Button>

                  {item.status === 'ready_for_handoff' && (
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => onInitiateConversion(item)}
                    >
                      Convert to Case
                    </Button>
                  )}

                  {item.status === 'handoff_completed' && onOpenWorkforceOnboarding && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => onOpenWorkforceOnboarding(item)}
                    >
                      Open in Onboarding
                    </Button>
                  )}
                </Inline>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
