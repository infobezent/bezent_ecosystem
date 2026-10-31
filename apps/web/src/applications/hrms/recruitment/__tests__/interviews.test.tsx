import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { InterviewsPage } from '../pages/InterviewsPage';
import { InterviewMetrics } from '../components/InterviewMetrics';
import { InterviewScheduleTable } from '../components/InterviewScheduleTable';
import { InterviewCalendarView } from '../components/InterviewCalendarView';
import { ScorecardModal } from '../components/ScorecardModal';
import { ScheduleInterviewModal } from '../components/ScheduleInterviewModal';
import { RescheduleCancelModal } from '../components/RescheduleCancelModal';
import { INITIAL_INTERVIEWS } from '../data/mockInterviews';
import { INITIAL_CANDIDATES } from '../data/mockCandidates';

describe('InterviewsPage', () => {
  it('renders the Interviews page header, metrics, tabs, and table', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <InterviewsPage />
      </MemoryRouter>,
    );

    expect(html).toContain('Interviews');
    expect(html).toContain('Schedule Interview');
    expect(html).toContain('Interviews Today');
    expect(html).toContain('Upcoming Pipeline');
    expect(html).toContain('Completed &amp; Evaluated');
    expect(html).toContain('Shreya Sengupta');
    expect(html).toContain('Round 2: Architecture &amp; System Design');
  });

  it('renders InterviewMetrics with counts', () => {
    const html = renderToStaticMarkup(
      <InterviewMetrics interviews={INITIAL_INTERVIEWS} todayDate="2026-10-30" />,
    );

    expect(html).toContain('Interviews Today');
    expect(html).toContain('Upcoming Pipeline');
    expect(html).toContain('Completed &amp; Evaluated');
  });

  it('renders InterviewScheduleTable with candidate and panel details', () => {
    const html = renderToStaticMarkup(
      <InterviewScheduleTable
        interviews={INITIAL_INTERVIEWS}
        todayDate="2026-10-30"
        onViewScorecard={() => {}}
        onLogScorecard={() => {}}
        onReschedule={() => {}}
        onCancel={() => {}}
      />,
    );

    expect(html).toContain('Shreya Sengupta');
    expect(html).toContain('Mukesh Murugesan');
    expect(html).toContain('Scheduled');
    expect(html).toContain('View Scorecard');
  });

  it('renders InterviewCalendarView grouped by date', () => {
    const html = renderToStaticMarkup(
      <InterviewCalendarView
        interviews={INITIAL_INTERVIEWS}
        todayDate="2026-10-30"
        onViewScorecard={() => {}}
        onLogScorecard={() => {}}
      />,
    );

    expect(html).toContain('2026-10-30');
    expect(html).toContain("Today&#x27;s Schedule");
    expect(html).toContain('Join Google Meet');
  });

  it('renders ScorecardModal with evaluation scores', () => {
    const interview = INITIAL_INTERVIEWS[2]!; // Completed with scorecard
    const html = renderToStaticMarkup(
      <ScorecardModal
        interview={interview}
        isOpen={true}
        onClose={() => {}}
      />,
    );

    expect(html).toContain('Evaluation Scorecard');
    expect(html).toContain('Vignesh Balaji');
    expect(html).toContain('Design Critique &amp; Portfolio Presentation');
    expect(html).toContain('Strong Hire');
    expect(html).toContain('Design Craft &amp; Polish');
  });

  it('renders ScheduleInterviewModal with required fields', () => {
    const html = renderToStaticMarkup(
      <ScheduleInterviewModal
        isOpen={true}
        onClose={() => {}}
        onSchedule={() => {}}
        candidates={INITIAL_CANDIDATES}
      />,
    );

    expect(html).toContain('Schedule Interview Round');
    expect(html).toContain('Candidate');
    expect(html).toContain('Interview Category');
    expect(html).toContain('Confirm &amp; Schedule');
  });

  it('renders RescheduleCancelModal in reschedule and cancel modes', () => {
    const interview = INITIAL_INTERVIEWS[0]!;
    const rescheduleHtml = renderToStaticMarkup(
      <RescheduleCancelModal
        interview={interview}
        mode="reschedule"
        isOpen={true}
        onClose={() => {}}
        onConfirmReschedule={() => {}}
        onConfirmCancel={() => {}}
      />,
    );

    expect(rescheduleHtml).toContain('Reschedule Interview Round');
    expect(rescheduleHtml).toContain('Confirm Reschedule');

    const cancelHtml = renderToStaticMarkup(
      <RescheduleCancelModal
        interview={interview}
        mode="cancel"
        isOpen={true}
        onClose={() => {}}
        onConfirmReschedule={() => {}}
        onConfirmCancel={() => {}}
      />,
    );

    expect(cancelHtml).toContain('Cancel Interview');
    expect(cancelHtml).toContain('Confirm Cancellation');
  });
});
