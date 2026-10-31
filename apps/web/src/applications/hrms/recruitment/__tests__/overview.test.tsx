import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { HiringOverviewPage } from '../pages/HiringOverviewPage';
import { OverviewMetrics } from '../components/OverviewMetrics';
import { ActiveJobsSpotlight } from '../components/ActiveJobsSpotlight';
import { TodayInterviewsWidget } from '../components/TodayInterviewsWidget';
import { RecentActivityWidget } from '../components/RecentActivityWidget';
import { INITIAL_JOB_OPENINGS } from '../data/mockJobOpenings';
import { INITIAL_INTERVIEWS } from '../data/mockInterviews';

describe('HiringOverviewPage', () => {
  it('renders the Hiring Overview command center, KPIs, spotlight, and activity', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <HiringOverviewPage />
      </MemoryRouter>,
    );

    expect(html).toContain('Hiring Overview');
    expect(html).toContain('Post Job Opening');
    expect(html).toContain('View Kanban Pipeline');
    expect(html).toContain('Open Positions');
    expect(html).toContain('Active Candidates');
    expect(html).toContain('Interviews Today');
    expect(html).toContain('Offers &amp; Handoff');
    expect(html).toContain('Active Requisitions Spotlight');
    expect(html).toContain('Senior Frontend Architect');
    expect(html).toContain('Recent Hiring Activity');
  });

  it('renders OverviewMetrics correctly with counts', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <OverviewMetrics
          openJobsCount={5}
          totalVacancies={8}
          activeCandidatesCount={7}
          interviewsTodayCount={3}
          offersPendingCount={2}
          handoffsReadyCount={2}
        />
      </MemoryRouter>,
    );

    expect(html).toContain('Open Positions');
    expect(html).toContain('5');
    expect(html).toContain('8 vacancies');
    expect(html).toContain('Active Candidates');
    expect(html).toContain('Interviews Today');
    expect(html).toContain('Offers &amp; Handoff');
  });

  it('renders ActiveJobsSpotlight with active positions and pipeline links', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <ActiveJobsSpotlight jobs={INITIAL_JOB_OPENINGS} />
      </MemoryRouter>,
    );

    expect(html).toContain('Active Requisitions Spotlight');
    expect(html).toContain('Senior Frontend Architect');
    expect(html).toContain('Full-Stack Tech Lead');
    expect(html).toContain('Kanban Board →');
  });

  it('renders TodayInterviewsWidget with panel members and meeting links', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <TodayInterviewsWidget interviews={INITIAL_INTERVIEWS} todayDate="2026-10-30" />
      </MemoryRouter>,
    );

    expect(html).toContain('Today&#x27;s Interviews');
    expect(html).toContain('Shreya Sengupta');
    expect(html).toContain('Join Google Meet');
  });

  it('renders RecentActivityWidget with real-time events and badges', () => {
    const html = renderToStaticMarkup(<RecentActivityWidget />);

    expect(html).toContain('Recent Hiring Activity');
    expect(html).toContain('Offer Accepted: Shreya Sengupta');
    expect(html).toContain('Assessment Cleared: Vignesh Balaji');
    expect(html).toContain('Scorecard Submitted: Deepak Sundaram');
    expect(html).toContain('Onboarding Case Initialized: Arvind Krishnan');
  });
});
