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
import type { ConsentStatus, TalentProfile, TalentStatus } from '../types/talentPool';

export interface TalentTableProps {
  talent: TalentProfile[];
  onSelectTalent: (profile: TalentProfile) => void;
  onReEngage: (profile: TalentProfile) => void;
}

export function formatConsentBadge(status: ConsentStatus, expiryDate: string) {
  switch (status) {
    case 'active_consent':
      return (
        <Badge variant="success" size="sm">
          Active (till {expiryDate.slice(0, 7)})
        </Badge>
      );
    case 'consent_expiring_soon':
      return (
        <Badge variant="warning" size="sm">
          Expires {expiryDate}
        </Badge>
      );
    case 'consent_expired':
      return (
        <Badge variant="danger" size="sm">
          Consent Expired
        </Badge>
      );
    case 'revoked':
      return (
        <Badge variant="danger" size="sm">
          Consent Revoked
        </Badge>
      );
    default:
      return (
        <Badge variant="neutral" size="sm">
          {status}
        </Badge>
      );
  }
}

export function formatTalentStatusPill(status: TalentStatus) {
  switch (status) {
    case 'available':
      return <Badge variant="success">Available</Badge>;
    case 'passive':
      return <Badge variant="neutral">Passive</Badge>;
    case 're_engaged':
      return <Badge variant="info">In Pipeline</Badge>;
    case 'do_not_contact':
      return <Badge variant="danger">DNC</Badge>;
    default:
      return <Badge variant="neutral">{status}</Badge>;
  }
}

export function TalentTable({ talent, onSelectTalent, onReEngage }: TalentTableProps) {
  if (talent.length === 0) {
    return (
      <EmptyState
        title="No Talent Profiles Found"
        description="No talent records match your current filters or tag selections."
        variant="recruitment"
      />
    );
  }

  return (
    <Table hoverable>
      <TableHead>
        <TableRow>
          <TableHeaderCell>Talent Profile</TableHeaderCell>
          <TableHeaderCell>Current Role &amp; Company</TableHeaderCell>
          <TableHeaderCell>Primary Skills &amp; Tags</TableHeaderCell>
          <TableHeaderCell>Previous Requisition</TableHeaderCell>
          <TableHeaderCell>Consent &amp; Privacy</TableHeaderCell>
          <TableHeaderCell>Status</TableHeaderCell>
          <TableHeaderCell>Actions</TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {talent.map((profile) => {
          const initials = profile.fullName
            .split(' ')
            .map((n) => n[0])
            .join('')
            .slice(0, 2);

          return (
            <TableRow key={profile.id}>
              {/* Profile */}
              <TableCell>
                <Inline align="center" gap="sm">
                  <Avatar initials={initials} color={profile.avatarColor} size="md" />
                  <Stack gap="none">
                    <Inline align="center" gap="xs">
                      <span className="bezent-font-semibold bezent-text-sm">
                        {profile.fullName}
                      </span>
                      {profile.source === 'silver_medalist' && (
                        <Badge variant="info" size="sm">
                          ★ Silver Medalist
                        </Badge>
                      )}
                    </Inline>
                    <span className="bezent-text-xs bezent-text-secondary">
                      {profile.talentNumber} • {profile.email}
                    </span>
                  </Stack>
                </Inline>
              </TableCell>

              {/* Current Role & Exp */}
              <TableCell>
                <Stack gap="none">
                  <span className="bezent-font-medium bezent-text-sm">{profile.currentTitle}</span>
                  <span className="bezent-text-xs bezent-text-secondary">
                    {profile.currentCompany} • {profile.experienceYears} yrs exp
                  </span>
                </Stack>
              </TableCell>

              {/* Skills & Tags */}
              <TableCell>
                <div className="flex flex-wrap gap-1 max-w-xs">
                  {profile.tags.slice(0, 2).map((tag) => (
                    <Badge key={tag} variant="neutral" size="sm">
                      {tag}
                    </Badge>
                  ))}
                  {profile.skills.slice(0, 2).map((skill) => (
                    <span
                      key={skill}
                      className="bezent-text-xs bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </TableCell>

              {/* Previous Requisition */}
              <TableCell>
                <Stack gap="none">
                  <span className="bezent-font-medium bezent-text-sm">
                    {profile.previousApplication.jobTitle}
                  </span>
                  <span className="bezent-text-xs bezent-text-secondary">
                    Reached: {profile.previousApplication.lastStageReached}
                  </span>
                </Stack>
              </TableCell>

              {/* Consent & Privacy */}
              <TableCell>
                <Stack gap="none">
                  {formatConsentBadge(profile.consentStatus, profile.consentExpiryDate)}
                  <span className="bezent-text-xs bezent-text-secondary mt-0.5">
                    DPDP 12-Mo Compliant
                  </span>
                </Stack>
              </TableCell>

              {/* Status */}
              <TableCell>{formatTalentStatusPill(profile.status)}</TableCell>

              {/* Actions */}
              <TableCell>
                <Inline align="center" gap="xs">
                  <Button size="sm" variant="secondary" onClick={() => onSelectTalent(profile)}>
                    View
                  </Button>

                  <Button size="sm" variant="primary" onClick={() => onReEngage(profile)}>
                    Re-Engage
                  </Button>
                </Inline>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
