import {
  Avatar,
  Badge,
  Card,
  CardBody,
  CountryFlag,
  EmptyState,
  Grid,
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
import type { Candidate, CandidateSource, CandidateStage } from '../types/candidate';

export interface CandidatesTableProps {
  candidates: Candidate[];
  onSelectCandidate: (candidate: Candidate) => void;
  onStageChange?: (candidateId: string, stage: CandidateStage) => void;
  viewMode?: 'list' | 'grid';
}

export function formatSourceLabel(source: CandidateSource): string {
  switch (source) {
    case 'linkedin':
      return 'LinkedIn';
    case 'career_page':
      return 'Career Portal';
    case 'referral':
      return 'Employee Referral';
    case 'agency':
      return 'Staffing Agency';
    case 'naukri':
      return 'Naukri.com';
    case 'campus':
      return 'Campus Drive';
    case 'direct':
    default:
      return 'Direct Sourced';
  }
}

export function formatCandidateStatusPill(stage: CandidateStage) {
  switch (stage) {
    case 'interview':
      return (
        <Badge variant="warning" showDot>
          Interview
        </Badge>
      );
    case 'screening':
    case 'applied':
      return (
        <Badge variant="info" showDot>
          Screening
        </Badge>
      );
    case 'assessment':
      return (
        <Badge variant="warning" showDot>
          Assessment
        </Badge>
      );
    case 'shortlisted':
      return (
        <Badge variant="info" showDot>
          Shortlisted
        </Badge>
      );
    case 'offer':
      return (
        <Badge variant="info" showDot>
          Offer Extended
        </Badge>
      );
    case 'hired':
    case 'selected':
      return (
        <Badge variant="success" showDot>
          Hired
        </Badge>
      );
    case 'rejected':
    case 'withdrawn':
      return (
        <Badge variant="danger" showDot>
          Rejected
        </Badge>
      );
    default:
      return (
        <Badge variant="neutral" showDot>
          {stage}
        </Badge>
      );
  }
}

export const formatStageBadge = formatCandidateStatusPill;

export function CandidatesTable({
  candidates,
  onSelectCandidate,
  viewMode = 'list',
}: CandidatesTableProps) {
  if (candidates.length === 0) {
    return (
      <EmptyState
        title="No candidates found"
        description="Try adjusting your search terms, stage tab, or role filters."
        variant="recruitment"
      />
    );
  }

  // Grid View Option
  if (viewMode === 'grid') {
    return (
      <Grid columns={3} gap="md">
        {candidates.map((cand) => {
          const initials = cand.fullName
            .split(' ')
            .map((n) => n[0])
            .join('')
            .slice(0, 2);

          return (
            <Card
              key={cand.id}
              variant="clay"
              padding="md"
              hoverable
              onClick={() => onSelectCandidate(cand)}
            >
              <CardBody>
                <Stack gap="sm">
                  <Inline justify="between" align="start">
                    <Inline align="center" gap="sm">
                      <Avatar initials={initials} size="md" color="blue" />
                      <Stack gap="none">
                        <span className="bezent-table-meta-title">{cand.fullName}</span>
                        <span className="bezent-table-meta-subtitle">
                          {cand.currentCompany ? cand.currentCompany : cand.email}
                        </span>
                      </Stack>
                    </Inline>
                    <button
                      type="button"
                      className="bezent-table-action-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectCandidate(cand);
                      }}
                      title="View Candidate Profile"
                      aria-label="View Candidate Profile"
                    >
                      <BezentIcon name="more" size={16} />
                    </button>
                  </Inline>

                  <Stack gap="none">
                    <span className="bezent-table-meta-title">{cand.appliedJobTitle}</span>
                    <span className="bezent-table-meta-subtitle">{cand.appliedJobCode}</span>
                  </Stack>

                  <Inline justify="between" align="center">
                    <Inline align="center" gap="xs">
                      <CountryFlag countryCode={cand.locationCountryCode || 'IN'} size="sm" />
                      <span className="bezent-table-meta-subtitle">{cand.location}</span>
                    </Inline>
                    <span className="bezent-table-meta-title">
                      {cand.totalExperienceYears} yrs exp
                    </span>
                  </Inline>

                  <Inline justify="between" align="center">
                    {formatCandidateStatusPill(cand.currentStage)}
                    <span className="bezent-table-meta-dim">{cand.appliedDate}</span>
                  </Inline>
                </Stack>
              </CardBody>
            </Card>
          );
        })}
      </Grid>
    );
  }

  // Standard Tech Recruitment Table View (with Current Location)
  return (
    <Table hoverable>
      <TableHead>
        <TableRow>
          <TableHeaderCell>Candidate ID ⇅</TableHeaderCell>
          <TableHeaderCell>Candidate ⇅</TableHeaderCell>
          <TableHeaderCell>Applied Role ⇅</TableHeaderCell>
          <TableHeaderCell>Experience ⇅</TableHeaderCell>
          <TableHeaderCell>Current Location ⇅</TableHeaderCell>
          <TableHeaderCell>Stage ⇅</TableHeaderCell>
          <TableHeaderCell>Applied Date ⇅</TableHeaderCell>
          <TableHeaderCell>Actions</TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {candidates.map((cand) => {
          const initials = cand.fullName
            .split(' ')
            .map((n) => n[0])
            .join('')
            .slice(0, 2);

          return (
            <TableRow key={cand.id} onClick={() => onSelectCandidate(cand)}>
              {/* 1. Candidate ID */}
              <TableCell>
                <span className="bezent-table-meta-dim font-mono">#{cand.candidateNumber}</span>
              </TableCell>

              {/* 2. Candidate: Avatar + Full Name */}
              <TableCell>
                <Inline align="center" gap="sm">
                  <Avatar initials={initials} size="sm" color="blue" />
                  <span className="bezent-table-meta-title">{cand.fullName}</span>
                </Inline>
              </TableCell>

              {/* 3. Applied Role: Title */}
              <TableCell>
                <span className="bezent-table-meta-title">{cand.appliedJobTitle}</span>
              </TableCell>

              {/* 4. Experience: Total */}
              <TableCell>
                <span className="bezent-table-meta-title">{cand.totalExperienceYears} yrs</span>
              </TableCell>

              {/* 5. Current Location: City only */}
              <TableCell>
                <span className="bezent-table-meta-title">
                  {(cand.location.split(',')[0] ?? cand.location).trim()}
                </span>
              </TableCell>

              {/* 6. Stage: Soft Colored Status Pill */}
              <TableCell>{formatCandidateStatusPill(cand.currentStage)}</TableCell>

              {/* 7. Applied Date */}
              <TableCell>
                <span className="bezent-table-meta-dim">{cand.appliedDate}</span>
              </TableCell>

              {/* 8. Actions: Ellipsis Action Button */}
              <TableCell>
                <button
                  type="button"
                  className="bezent-table-action-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectCandidate(cand);
                  }}
                  title="View Candidate Profile"
                  aria-label="View Candidate Profile"
                >
                  <BezentIcon name="more" size={16} />
                </button>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

export default CandidatesTable;
