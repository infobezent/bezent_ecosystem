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
import { BezentIcon } from '../../../../design-system/icons';
import type { JobOffer, OfferStatus } from '../types/offer';

export interface OffersTableProps {
  offers: JobOffer[];
  onSelectOffer: (offer: JobOffer) => void;
  onApproveOffer?: (offer: JobOffer) => void;
  onSendOffer?: (offer: JobOffer) => void;
  onInitiateHandoff?: (offer: JobOffer) => void;
}

export function formatOfferStatusPill(status: OfferStatus) {
  switch (status) {
    case 'accepted':
      return <Badge variant="success">Accepted</Badge>;
    case 'sent':
      return <Badge variant="info">Sent</Badge>;
    case 'approved':
      return <Badge variant="info">Approved</Badge>;
    case 'pending_approval':
      return <Badge variant="warning">Pending Sign-Off</Badge>;
    case 'draft':
      return <Badge variant="neutral">Draft</Badge>;
    case 'declined':
      return <Badge variant="danger">Declined</Badge>;
    case 'expired':
      return <Badge variant="neutral">Expired</Badge>;
    case 'revoked':
      return <Badge variant="danger">Revoked</Badge>;
    default:
      return <Badge variant="neutral">{status}</Badge>;
  }
}

export function formatCtc(amount: number, currency: string = 'INR'): string {
  if (currency === 'INR') {
    const lpa = (amount / 100000).toFixed(2);
    return `₹${lpa} LPA`;
  }
  return `$${amount.toLocaleString()}`;
}

export function OffersTable({
  offers,
  onSelectOffer,
  onApproveOffer,
  onSendOffer,
  onInitiateHandoff,
}: OffersTableProps) {
  if (offers.length === 0) {
    return (
      <EmptyState
        title="No Offers Found"
        description="No job offers match the current filters. Adjust your search criteria or create a new offer."
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
          <TableHeaderCell>Annual CTC</TableHeaderCell>
          <TableHeaderCell>Status</TableHeaderCell>
          <TableHeaderCell>Approvals</TableHeaderCell>
          <TableHeaderCell>Joining / Expiry</TableHeaderCell>
          <TableHeaderCell>Actions</TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {offers.map((offer) => {
          const approvedSteps = offer.approvalChain.filter((s) => s.status === 'approved').length;
          const totalSteps = offer.approvalChain.length;
          const initials = offer.candidateName
            .split(' ')
            .map((n) => n[0])
            .join('')
            .slice(0, 2);

          return (
            <TableRow key={offer.id}>
              {/* Candidate */}
              <TableCell>
                <Inline align="center" gap="sm">
                  <Avatar
                    initials={initials}
                    color={offer.candidateAvatarColor}
                    size="md"
                  />
                  <Stack gap="none">
                    <span className="bezent-font-semibold bezent-text-sm">
                      {offer.candidateName}
                    </span>
                    <span className="bezent-text-xs bezent-text-secondary">
                      {offer.offerNumber} • {offer.candidateEmail}
                    </span>
                  </Stack>
                </Inline>
              </TableCell>

              {/* Role & Dept */}
              <TableCell>
                <Stack gap="none">
                  <span className="bezent-font-medium bezent-text-sm">
                    {offer.jobTitle}
                  </span>
                  <span className="bezent-text-xs bezent-text-secondary">
                    {offer.department} • {offer.designationLevel}
                  </span>
                </Stack>
              </TableCell>

              {/* Compensation */}
              <TableCell>
                <Stack gap="none">
                  <span className="bezent-font-bold bezent-text-sm text-primary-700">
                    {formatCtc(offer.compensation.totalCtc, offer.currency)}
                  </span>
                  <span className="bezent-text-xs bezent-text-secondary">
                    Base: {formatCtc(offer.compensation.basePay, offer.currency)}
                  </span>
                </Stack>
              </TableCell>

              {/* Status */}
              <TableCell>
                {formatOfferStatusPill(offer.status)}
              </TableCell>

              {/* Approvals */}
              <TableCell>
                <Stack gap="none">
                  <Inline align="center" gap="xs">
                    <span className="bezent-font-semibold bezent-text-xs">
                      {approvedSteps} of {totalSteps} signed
                    </span>
                    {approvedSteps === totalSteps && (
                      <BezentIcon name="check" size="action" color="var(--color-success-600)" />
                    )}
                  </Inline>
                  <span className="bezent-text-xs bezent-text-secondary">
                    {offer.approvalChain.find((s) => s.status === 'pending')?.approverRole
                      ? `Waiting: ${offer.approvalChain.find((s) => s.status === 'pending')?.approverRole}`
                      : 'All Approved'}
                  </span>
                </Stack>
              </TableCell>

              {/* Joining & Expiry */}
              <TableCell>
                <Stack gap="none">
                  <Inline align="center" gap="xs">
                    <span className="bezent-text-xs bezent-text-secondary">Join:</span>
                    <span className="bezent-text-xs bezent-font-semibold text-success-700">
                      {offer.targetJoiningDate}
                    </span>
                  </Inline>
                  <span className="bezent-text-xs bezent-text-secondary">
                    Valid till: {offer.expiryDate}
                  </span>
                </Stack>
              </TableCell>

              {/* Actions */}
              <TableCell>
                <Inline align="center" gap="xs">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => onSelectOffer(offer)}
                  >
                    View Offer
                  </Button>

                  {offer.status === 'pending_approval' && onApproveOffer && (
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => onApproveOffer(offer)}
                    >
                      Review
                    </Button>
                  )}

                  {offer.status === 'approved' && onSendOffer && (
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => onSendOffer(offer)}
                    >
                      Send Letter
                    </Button>
                  )}

                  {offer.status === 'accepted' && onInitiateHandoff && (
                    <Badge variant="success" size="sm">
                      Ready for Handoff
                    </Badge>
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
