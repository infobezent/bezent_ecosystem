import { useMemo, useState } from 'react';
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

export type CandidateSortField =
  | 'candidateNumber'
  | 'fullName'
  | 'appliedJobTitle'
  | 'totalExperienceYears'
  | 'location'
  | 'currentStage'
  | 'appliedDate';

export type SortDirection = 'asc' | 'desc';

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
  const [sortField, setSortField] = useState<CandidateSortField>('candidateNumber');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const handleSort = (field: CandidateSortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedCandidates = useMemo(() => {
    const list = [...candidates];
    list.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'candidateNumber':
          comparison = (a.candidateNumber || '').localeCompare(b.candidateNumber || '', undefined, {
            numeric: true,
          });
          break;
        case 'fullName':
          comparison = a.fullName.localeCompare(b.fullName);
          break;
        case 'appliedJobTitle':
          comparison = (a.appliedJobTitle || '').localeCompare(b.appliedJobTitle || '');
          break;
        case 'totalExperienceYears':
          comparison = (a.totalExperienceYears ?? 0) - (b.totalExperienceYears ?? 0);
          break;
        case 'location': {
          const locA = (a.location?.split(',')[0] ?? a.location ?? '').trim();
          const locB = (b.location?.split(',')[0] ?? b.location ?? '').trim();
          comparison = locA.localeCompare(locB);
          break;
        }
        case 'currentStage':
          comparison = (a.currentStage || '').localeCompare(b.currentStage || '');
          break;
        case 'appliedDate': {
          const timeA = a.appliedDate ? new Date(a.appliedDate).getTime() : 0;
          const timeB = b.appliedDate ? new Date(b.appliedDate).getTime() : 0;
          comparison = timeA - timeB;
          break;
        }
        default:
          comparison = 0;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
    return list;
  }, [candidates, sortField, sortDirection]);

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
        {sortedCandidates.map((cand) => {
          const initials = cand.fullName
            .split(' ')
            .map((n) => n[0])
            .join('')
            .slice(0, 2);

          return (
            <Card
              key={cand.id}
              variant="default"
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
          <TableHeaderCell
            aria-sort={
              sortField === 'candidateNumber'
                ? sortDirection === 'asc'
                  ? 'ascending'
                  : 'descending'
                : 'none'
            }
          >
            <button
              type="button"
              className={`bezent-table-th-sortable ${
                sortField === 'candidateNumber' ? 'bezent-table-th-sortable--active' : ''
              }`}
              onClick={() => handleSort('candidateNumber')}
              aria-label={`Sort by Candidate ID ${
                sortField === 'candidateNumber' && sortDirection === 'asc'
                  ? 'descending'
                  : 'ascending'
              }`}
            >
              <span>Candidate ID</span>
              <span
                className={`bezent-table-sort-arrow ${
                  sortField === 'candidateNumber' ? 'bezent-table-sort-arrow--active' : ''
                }`}
                aria-hidden="true"
              >
                {sortField === 'candidateNumber' ? (sortDirection === 'asc' ? '▲' : '▼') : '⇅'}
              </span>
            </button>
          </TableHeaderCell>

          <TableHeaderCell
            aria-sort={
              sortField === 'fullName'
                ? sortDirection === 'asc'
                  ? 'ascending'
                  : 'descending'
                : 'none'
            }
          >
            <button
              type="button"
              className={`bezent-table-th-sortable ${
                sortField === 'fullName' ? 'bezent-table-th-sortable--active' : ''
              }`}
              onClick={() => handleSort('fullName')}
              aria-label={`Sort by Candidate ${
                sortField === 'fullName' && sortDirection === 'asc' ? 'descending' : 'ascending'
              }`}
            >
              <span>Candidate</span>
              <span
                className={`bezent-table-sort-arrow ${
                  sortField === 'fullName' ? 'bezent-table-sort-arrow--active' : ''
                }`}
                aria-hidden="true"
              >
                {sortField === 'fullName' ? (sortDirection === 'asc' ? '▲' : '▼') : '⇅'}
              </span>
            </button>
          </TableHeaderCell>

          <TableHeaderCell
            aria-sort={
              sortField === 'appliedJobTitle'
                ? sortDirection === 'asc'
                  ? 'ascending'
                  : 'descending'
                : 'none'
            }
          >
            <button
              type="button"
              className={`bezent-table-th-sortable ${
                sortField === 'appliedJobTitle' ? 'bezent-table-th-sortable--active' : ''
              }`}
              onClick={() => handleSort('appliedJobTitle')}
              aria-label={`Sort by Applied Role ${
                sortField === 'appliedJobTitle' && sortDirection === 'asc'
                  ? 'descending'
                  : 'ascending'
              }`}
            >
              <span>Applied Role</span>
              <span
                className={`bezent-table-sort-arrow ${
                  sortField === 'appliedJobTitle' ? 'bezent-table-sort-arrow--active' : ''
                }`}
                aria-hidden="true"
              >
                {sortField === 'appliedJobTitle' ? (sortDirection === 'asc' ? '▲' : '▼') : '⇅'}
              </span>
            </button>
          </TableHeaderCell>

          <TableHeaderCell
            aria-sort={
              sortField === 'totalExperienceYears'
                ? sortDirection === 'asc'
                  ? 'ascending'
                  : 'descending'
                : 'none'
            }
          >
            <button
              type="button"
              className={`bezent-table-th-sortable ${
                sortField === 'totalExperienceYears' ? 'bezent-table-th-sortable--active' : ''
              }`}
              onClick={() => handleSort('totalExperienceYears')}
              aria-label={`Sort by Experience ${
                sortField === 'totalExperienceYears' && sortDirection === 'asc'
                  ? 'descending'
                  : 'ascending'
              }`}
            >
              <span>Experience</span>
              <span
                className={`bezent-table-sort-arrow ${
                  sortField === 'totalExperienceYears' ? 'bezent-table-sort-arrow--active' : ''
                }`}
                aria-hidden="true"
              >
                {sortField === 'totalExperienceYears' ? (sortDirection === 'asc' ? '▲' : '▼') : '⇅'}
              </span>
            </button>
          </TableHeaderCell>

          <TableHeaderCell
            aria-sort={
              sortField === 'location'
                ? sortDirection === 'asc'
                  ? 'ascending'
                  : 'descending'
                : 'none'
            }
          >
            <button
              type="button"
              className={`bezent-table-th-sortable ${
                sortField === 'location' ? 'bezent-table-th-sortable--active' : ''
              }`}
              onClick={() => handleSort('location')}
              aria-label={`Sort by Current Location ${
                sortField === 'location' && sortDirection === 'asc' ? 'descending' : 'ascending'
              }`}
            >
              <span>Current Location</span>
              <span
                className={`bezent-table-sort-arrow ${
                  sortField === 'location' ? 'bezent-table-sort-arrow--active' : ''
                }`}
                aria-hidden="true"
              >
                {sortField === 'location' ? (sortDirection === 'asc' ? '▲' : '▼') : '⇅'}
              </span>
            </button>
          </TableHeaderCell>

          <TableHeaderCell
            aria-sort={
              sortField === 'currentStage'
                ? sortDirection === 'asc'
                  ? 'ascending'
                  : 'descending'
                : 'none'
            }
          >
            <button
              type="button"
              className={`bezent-table-th-sortable ${
                sortField === 'currentStage' ? 'bezent-table-th-sortable--active' : ''
              }`}
              onClick={() => handleSort('currentStage')}
              aria-label={`Sort by Stage ${
                sortField === 'currentStage' && sortDirection === 'asc' ? 'descending' : 'ascending'
              }`}
            >
              <span>Stage</span>
              <span
                className={`bezent-table-sort-arrow ${
                  sortField === 'currentStage' ? 'bezent-table-sort-arrow--active' : ''
                }`}
                aria-hidden="true"
              >
                {sortField === 'currentStage' ? (sortDirection === 'asc' ? '▲' : '▼') : '⇅'}
              </span>
            </button>
          </TableHeaderCell>

          <TableHeaderCell
            aria-sort={
              sortField === 'appliedDate'
                ? sortDirection === 'asc'
                  ? 'ascending'
                  : 'descending'
                : 'none'
            }
          >
            <button
              type="button"
              className={`bezent-table-th-sortable ${
                sortField === 'appliedDate' ? 'bezent-table-th-sortable--active' : ''
              }`}
              onClick={() => handleSort('appliedDate')}
              aria-label={`Sort by Applied Date ${
                sortField === 'appliedDate' && sortDirection === 'asc' ? 'descending' : 'ascending'
              }`}
            >
              <span>Applied Date</span>
              <span
                className={`bezent-table-sort-arrow ${
                  sortField === 'appliedDate' ? 'bezent-table-sort-arrow--active' : ''
                }`}
                aria-hidden="true"
              >
                {sortField === 'appliedDate' ? (sortDirection === 'asc' ? '▲' : '▼') : '⇅'}
              </span>
            </button>
          </TableHeaderCell>

          <TableHeaderCell>Actions</TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {sortedCandidates.map((cand) => {
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
