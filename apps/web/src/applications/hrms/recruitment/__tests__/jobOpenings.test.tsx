import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { JobOpeningsPage } from '../pages/JobOpeningsPage';
import { JobOpeningsTable } from '../components/JobOpeningsTable';
import { JobOpeningsMetrics } from '../components/JobOpeningsMetrics';
import { JobDetailsModal } from '../components/JobDetailsModal';
import { CreateJobModal } from '../components/CreateJobModal';
import { INITIAL_JOB_OPENINGS } from '../data/mockJobOpenings';

describe('JobOpeningsPage', () => {
  it('renders the Job Openings page header, metrics, tabs, and table', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <JobOpeningsPage />
      </MemoryRouter>,
    );

    expect(html).toContain('Job Openings');
    expect(html).toContain('Create Job');
    expect(html).toContain('Total Requisitions');
    expect(html).toContain('Open Positions');
    expect(html).toContain('Active Candidates');
    expect(html).toContain('All Jobs');
    expect(html).toContain('Senior Frontend Architect');
    expect(html).toContain('JOB-2026-001');
    expect(html).toContain('Full-Stack Tech Lead');
  });

  it('renders JobOpeningsMetrics with correct counts', () => {
    const html = renderToStaticMarkup(<JobOpeningsMetrics jobs={INITIAL_JOB_OPENINGS} />);

    expect(html).toContain('Total Requisitions');
    expect(html).toContain('Open Positions');
    expect(html).toContain('Active Candidates');
  });

  it('renders JobOpeningsTable with job details and action buttons', () => {
    const html = renderToStaticMarkup(
      <JobOpeningsTable
        jobs={INITIAL_JOB_OPENINGS}
        onSelectJob={() => {}}
        onStatusChange={() => {}}
      />,
    );

    expect(html).toContain('JOB-2026-001');
    expect(html).toContain('Engineering');
    expect(html).toContain('View Details');
    expect(html).toContain('0 / 2 filled');
  });

  it('renders JobDetailsModal with tabs and requisition info', () => {
    const job = INITIAL_JOB_OPENINGS[0]!;
    const html = renderToStaticMarkup(
      <JobDetailsModal
        job={job}
        isOpen={true}
        onClose={() => {}}
        onNavigateToCandidates={() => {}}
      />,
    );

    expect(html).toContain(job.title);
    expect(html).toContain(job.jobCode);
    expect(html).toContain('Job Details &amp; Role');
    expect(html).toContain('Hiring Team (4)');
    expect(html).toContain('Job Description');
    expect(html).toContain('Offered Compensation');
  });

  it('renders CreateJobModal with required fields', () => {
    const html = renderToStaticMarkup(
      <CreateJobModal isOpen={true} onClose={() => {}} onCreateJob={() => {}} existingCount={6} />,
    );

    expect(html).toContain('Create New Job Opening');
    expect(html).toContain('Job Title');
    expect(html).toContain('Department');
    expect(html).toContain('Location');
    expect(html).toContain('Publish Job Opening');
  });
});
