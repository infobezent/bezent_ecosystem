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
      return <Badge variant="success" showDot>Open</Badge>;
    case 'draft':
      return <Badge variant="neutral" showDot>Draft</Badge>;
    case 'on_hold':
      return <Badge variant="warning" showDot>On Hold</Badge>;
    case 'closed':
      return <Badge variant="danger" showDot>Closed</Badge>;
    default:
      return <Badge variant="neutral" showDot>{status}</Badge>;
  }
}

export function JobOpeningsTable({
  jobs,
  onSelectJob,
  onStatusChange,
  viewMode = 'list',
}: JobOpeningsTableProps) {
  if (jobs.length === 0) {
    return (
      <EmptyState
        title="No job openings found"
        description="Try adjusting your search query, status tab, or department filters."
        variant="recruitment"
      />
    );
  }

  // 3D Grid Cards View
  if (viewMode === 'grid') {
    return (
      <Grid columns={3} gap="md">
        {jobs.map((job) => {
          const isFilled = job.filledCount >= job.positionsCount && job.positionsCount > 0;
          return (
            <Card
              key={job.id}
              variant="clay"
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
                    <span className="bezent-table-meta-dim capitalize">{job.experienceLevel} level</span>
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
                    <span className="bezent-table-meta-title">{job.totalApplicants} applicants</span>
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
          <TableHeaderCell>Job Code ⇅</TableHeaderCell>
          <TableHeaderCell>Job Title ⇅</TableHeaderCell>
          <TableHeaderCell>Department ⇅</TableHeaderCell>
          <TableHeaderCell>Location ⇅</TableHeaderCell>
          <TableHeaderCell>Positions ⇅</TableHeaderCell>
          <TableHeaderCell>Applicants ⇅</TableHeaderCell>
          <TableHeaderCell>Status ⇅</TableHeaderCell>
          <TableHeaderCell>Actions</TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {jobs.map((job) => (
          <TableRow key={job.id} onClick={() => onSelectJob(job)} className="cursor-pointer">
            {/* 1. Job Code */}
            <TableCell>
              <span className="bezent-table-meta-dim font-mono">
                #{job.jobCode}
              </span>
            </TableCell>

            {/* 2. Job Title */}
            <TableCell>
              <span className="bezent-table-meta-title">
                {job.title}
              </span>
            </TableCell>

            {/* 3. Department */}
            <TableCell>
              <span className="bezent-table-meta-title">
                {job.department}
              </span>
            </TableCell>

            {/* 4. Location */}
            <TableCell>
              <span className="bezent-table-meta-title">
                {job.location}
              </span>
            </TableCell>

            {/* 5. Positions */}
            <TableCell>
              <span className="bezent-table-meta-title">
                {job.filledCount} / {job.positionsCount} filled
              </span>
            </TableCell>

            {/* 6. Applicants */}
            <TableCell>
              <span className="bezent-table-meta-title">
                {job.totalApplicants} applicants
              </span>
            </TableCell>

            {/* 7. Status */}
            <TableCell>
              {formatStatusBadge(job.status)}
            </TableCell>

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
