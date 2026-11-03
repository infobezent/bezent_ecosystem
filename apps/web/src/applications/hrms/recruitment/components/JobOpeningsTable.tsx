import { useMemo, useState } from 'react';
import {
  Badge,
  Card,
  CardBody,
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
import type { JobOpening, JobStatus, WorkplaceType } from '../types/jobOpening';

export type JobSortField =
  | 'jobCode'
  | 'title'
  | 'department'
  | 'location'
  | 'positions'
  | 'applicants'
  | 'status';

export type JobSortDirection = 'asc' | 'desc';

export interface JobOpeningsTableProps {
  jobs: JobOpening[];
  onSelectJob: (job: JobOpening) => void;
  onStatusChange?: (jobId: string, newStatus: JobStatus) => void;
  viewMode?: 'list' | 'grid';
}

export function formatWorkplace(type: WorkplaceType): string {
  switch (type) {
    case 'remote':
      return 'Remote';
    case 'hybrid':
      return 'Hybrid';
    case 'on_site':
      return 'On-site';
    default:
      return type;
  }
}

export function formatStatusBadge(status: JobStatus) {
  switch (status) {
    case 'open':
      return (
        <Badge variant="success" showDot>
          Open
        </Badge>
      );
    case 'draft':
      return (
        <Badge variant="neutral" showDot>
          Draft
        </Badge>
      );
    case 'on_hold':
      return (
        <Badge variant="warning" showDot>
          On Hold
        </Badge>
      );
    case 'closed':
      return (
        <Badge variant="danger" showDot>
          Closed
        </Badge>
      );
    default:
      return (
        <Badge variant="neutral" showDot>
          {status}
        </Badge>
      );
  }
}

export function JobOpeningsTable({
  jobs,
  onSelectJob,
  onStatusChange,
  viewMode = 'list',
}: JobOpeningsTableProps) {
  const [sortField, setSortField] = useState<JobSortField>('jobCode');
  const [sortDirection, setSortDirection] = useState<JobSortDirection>('asc');

  const handleSort = (field: JobSortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedJobs = useMemo(() => {
    const list = [...jobs];
    list.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'jobCode':
          comparison = (a.jobCode || '').localeCompare(b.jobCode || '', undefined, {
            numeric: true,
          });
          break;
        case 'title':
          comparison = (a.title || '').localeCompare(b.title || '');
          break;
        case 'department':
          comparison = (a.department || '').localeCompare(b.department || '');
          break;
        case 'location':
          comparison = (a.location || '').localeCompare(b.location || '');
          break;
        case 'positions':
          comparison = (a.positionsCount ?? 0) - (b.positionsCount ?? 0);
          break;
        case 'applicants':
          comparison = (a.totalApplicants ?? 0) - (b.totalApplicants ?? 0);
          break;
        case 'status':
          comparison = (a.status || '').localeCompare(b.status || '');
          break;
        default:
          comparison = 0;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
    return list;
  }, [jobs, sortField, sortDirection]);

  if (jobs.length === 0) {
    return (
      <EmptyState
        title="No job openings found"
        description="Try adjusting your search query, status tab, or department filters."
        variant="recruitment"
      />
    );
  }

  // Grid Cards View
  if (viewMode === 'grid') {
    return (
      <Grid columns={3} gap="md">
        {sortedJobs.map((job) => {
          const isFilled = job.filledCount >= job.positionsCount && job.positionsCount > 0;
          return (
            <Card
              key={job.id}
              variant="default"
              padding="md"
              hoverable
              onClick={() => onSelectJob(job)}
            >
              <CardBody>
                <Stack gap="sm">
                  <Inline justify="between" align="start">
                    <Stack gap="none">
                      <span className="bezent-table-meta-title">{job.title}</span>
                      <span className="bezent-table-meta-subtitle">
                        {job.department} • {job.jobCode}
                      </span>
                    </Stack>
                    <button
                      type="button"
                      className="bezent-table-action-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectJob(job);
                      }}
                      title="View Details"
                      aria-label="View Details"
                    >
                      <BezentIcon name="more" size={16} />
                    </button>
                  </Inline>

                  <Inline align="center" gap="xs">
                    <Badge variant="neutral" size="sm">
                      {formatWorkplace(job.workplaceType)}
                    </Badge>
                    <span className="bezent-table-meta-dim">•</span>
                    <span className="bezent-table-meta-dim capitalize">
                      {job.experienceLevel} level
                    </span>
                    <span className="bezent-table-meta-dim">•</span>
                    <span className="bezent-table-meta-dim">{job.location}</span>
                  </Inline>

                  <Inline justify="between" align="center">
                    <Inline align="center" gap="xs">
                      <span className="bezent-font-semibold bezent-text-sm">
                        {job.filledCount} / {job.positionsCount}
                      </span>
                      <span className="bezent-table-meta-dim">filled</span>
                      {isFilled && (
                        <Badge variant="success" size="sm">
                          Filled
                        </Badge>
                      )}
                    </Inline>
                    <span className="bezent-table-meta-title">
                      {job.totalApplicants} applicants
                    </span>
                  </Inline>

                  <Inline justify="between" align="center">
                    {formatStatusBadge(job.status)}
                    <span className="bezent-table-meta-dim">Target: {job.targetCloseDate}</span>
                  </Inline>
                </Stack>
              </CardBody>
            </Card>
          );
        })}
      </Grid>
    );
  }

  // Standard Clean 1-Line Table View (matching Candidate Directory)
  return (
    <Table hoverable>
      <TableHead>
        <TableRow>
          <TableHeaderCell
            aria-sort={
              sortField === 'jobCode'
                ? sortDirection === 'asc'
                  ? 'ascending'
                  : 'descending'
                : 'none'
            }
          >
            <button
              type="button"
              className={`bezent-table-th-sortable ${
                sortField === 'jobCode' ? 'bezent-table-th-sortable--active' : ''
              }`}
              onClick={() => handleSort('jobCode')}
              aria-label={`Sort by Job Code ${
                sortField === 'jobCode' && sortDirection === 'asc' ? 'descending' : 'ascending'
              }`}
            >
              <span>Job Code</span>
              <span
                className={`bezent-table-sort-arrow ${
                  sortField === 'jobCode' ? 'bezent-table-sort-arrow--active' : ''
                }`}
                aria-hidden="true"
              >
                {sortField === 'jobCode' ? (sortDirection === 'asc' ? '▲' : '▼') : '⇅'}
              </span>
            </button>
          </TableHeaderCell>

          <TableHeaderCell
            aria-sort={
              sortField === 'title'
                ? sortDirection === 'asc'
                  ? 'ascending'
                  : 'descending'
                : 'none'
            }
          >
            <button
              type="button"
              className={`bezent-table-th-sortable ${
                sortField === 'title' ? 'bezent-table-th-sortable--active' : ''
              }`}
              onClick={() => handleSort('title')}
              aria-label={`Sort by Job Title ${
                sortField === 'title' && sortDirection === 'asc' ? 'descending' : 'ascending'
              }`}
            >
              <span>Job Title</span>
              <span
                className={`bezent-table-sort-arrow ${
                  sortField === 'title' ? 'bezent-table-sort-arrow--active' : ''
                }`}
                aria-hidden="true"
              >
                {sortField === 'title' ? (sortDirection === 'asc' ? '▲' : '▼') : '⇅'}
              </span>
            </button>
          </TableHeaderCell>

          <TableHeaderCell
            aria-sort={
              sortField === 'department'
                ? sortDirection === 'asc'
                  ? 'ascending'
                  : 'descending'
                : 'none'
            }
          >
            <button
              type="button"
              className={`bezent-table-th-sortable ${
                sortField === 'department' ? 'bezent-table-th-sortable--active' : ''
              }`}
              onClick={() => handleSort('department')}
              aria-label={`Sort by Department ${
                sortField === 'department' && sortDirection === 'asc' ? 'descending' : 'ascending'
              }`}
            >
              <span>Department</span>
              <span
                className={`bezent-table-sort-arrow ${
                  sortField === 'department' ? 'bezent-table-sort-arrow--active' : ''
                }`}
                aria-hidden="true"
              >
                {sortField === 'department' ? (sortDirection === 'asc' ? '▲' : '▼') : '⇅'}
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
              aria-label={`Sort by Location ${
                sortField === 'location' && sortDirection === 'asc' ? 'descending' : 'ascending'
              }`}
            >
              <span>Location</span>
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
              sortField === 'positions'
                ? sortDirection === 'asc'
                  ? 'ascending'
                  : 'descending'
                : 'none'
            }
          >
            <button
              type="button"
              className={`bezent-table-th-sortable ${
                sortField === 'positions' ? 'bezent-table-th-sortable--active' : ''
              }`}
              onClick={() => handleSort('positions')}
              aria-label={`Sort by Positions ${
                sortField === 'positions' && sortDirection === 'asc' ? 'descending' : 'ascending'
              }`}
            >
              <span>Positions</span>
              <span
                className={`bezent-table-sort-arrow ${
                  sortField === 'positions' ? 'bezent-table-sort-arrow--active' : ''
                }`}
                aria-hidden="true"
              >
                {sortField === 'positions' ? (sortDirection === 'asc' ? '▲' : '▼') : '⇅'}
              </span>
            </button>
          </TableHeaderCell>

          <TableHeaderCell
            aria-sort={
              sortField === 'applicants'
                ? sortDirection === 'asc'
                  ? 'ascending'
                  : 'descending'
                : 'none'
            }
          >
            <button
              type="button"
              className={`bezent-table-th-sortable ${
                sortField === 'applicants' ? 'bezent-table-th-sortable--active' : ''
              }`}
              onClick={() => handleSort('applicants')}
              aria-label={`Sort by Applicants ${
                sortField === 'applicants' && sortDirection === 'asc' ? 'descending' : 'ascending'
              }`}
            >
              <span>Applicants</span>
              <span
                className={`bezent-table-sort-arrow ${
                  sortField === 'applicants' ? 'bezent-table-sort-arrow--active' : ''
                }`}
                aria-hidden="true"
              >
                {sortField === 'applicants' ? (sortDirection === 'asc' ? '▲' : '▼') : '⇅'}
              </span>
            </button>
          </TableHeaderCell>

          <TableHeaderCell
            aria-sort={
              sortField === 'status'
                ? sortDirection === 'asc'
                  ? 'ascending'
                  : 'descending'
                : 'none'
            }
          >
            <button
              type="button"
              className={`bezent-table-th-sortable ${
                sortField === 'status' ? 'bezent-table-th-sortable--active' : ''
              }`}
              onClick={() => handleSort('status')}
              aria-label={`Sort by Status ${
                sortField === 'status' && sortDirection === 'asc' ? 'descending' : 'ascending'
              }`}
            >
              <span>Status</span>
              <span
                className={`bezent-table-sort-arrow ${
                  sortField === 'status' ? 'bezent-table-sort-arrow--active' : ''
                }`}
                aria-hidden="true"
              >
                {sortField === 'status' ? (sortDirection === 'asc' ? '▲' : '▼') : '⇅'}
              </span>
            </button>
          </TableHeaderCell>

          <TableHeaderCell>Actions</TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {sortedJobs.map((job) => (
          <TableRow key={job.id} onClick={() => onSelectJob(job)} className="cursor-pointer">
            {/* 1. Job Code */}
            <TableCell>
              <span className="bezent-table-meta-dim font-mono">#{job.jobCode}</span>
            </TableCell>

            {/* 2. Job Title */}
            <TableCell>
              <span className="bezent-table-meta-title">{job.title}</span>
            </TableCell>

            {/* 3. Department */}
            <TableCell>
              <span className="bezent-table-meta-title">{job.department}</span>
            </TableCell>

            {/* 4. Location */}
            <TableCell>
              <span className="bezent-table-meta-title">{job.location}</span>
            </TableCell>

            {/* 5. Positions */}
            <TableCell>
              <span className="bezent-table-meta-title">
                {job.filledCount} / {job.positionsCount} filled
              </span>
            </TableCell>

            {/* 6. Applicants */}
            <TableCell>
              <span className="bezent-table-meta-title">{job.totalApplicants} applicants</span>
            </TableCell>

            {/* 7. Status */}
            <TableCell>{formatStatusBadge(job.status)}</TableCell>

            {/* 8. Actions */}
            <TableCell onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                className="bezent-table-action-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectJob(job);
                }}
                title="View Details"
                aria-label="View Details"
              >
                <BezentIcon name="more" size={16} />
              </button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
