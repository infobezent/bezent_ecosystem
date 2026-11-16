import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { AttendanceCalendarCard } from '../components/AttendanceCalendarCard';
import type { AttendanceOverviewKpis } from '../types/attendance.types';

const mockOverviewData: AttendanceOverviewKpis = {
  date: '2026-11-16',
  expectedCount: 100,
  presentCount: 88,
  absentCount: 12,
  lateCount: 5,
  onLeaveCount: 4,
  missingPunchCount: 2,
  halfDayCount: 1,
  pendingRegularizationCount: 3,
  attendanceRate: 88,
  departmentBreakdown: [],
  recentTrends: [
    {
      date: '2026-11-16',
      present: 88,
      absent: 12,
      late: 5,
    },
  ],
};

describe('AttendanceCalendarCard Component', () => {
  it('renders calendar title and navigation structure', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <AttendanceCalendarCard overviewData={mockOverviewData} />
      </MemoryRouter>,
    );

    expect(html).toContain('Attendance Calendar');
    expect(html).toContain('Monthly workforce presence density');
    expect(html).toContain('role="grid"');
  });

  it('renders the small pastel graph and shows present/absent percent on hovering', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <AttendanceCalendarCard overviewData={mockOverviewData} />
      </MemoryRouter>,
    );

    // Confirms presence of the small pastel bar graph in each date box
    expect(html).toContain('bezent-att-cal-day-graph');
    expect(html).toContain('bezent-att-cal-day-bar-svg');
    expect(html).toContain('bezent-att-cal-day-bar-present');
    expect(html).toContain('bezent-att-cal-day-bar-absent');

    // Confirms presence of the hover tooltip displaying percentages on hover
    expect(html).toContain('bezent-att-cal-day-hover-tooltip');
    expect(html).toContain('bezent-att-cal-hover-present');
    expect(html).toContain('bezent-att-cal-hover-absent');
    expect(html).toContain('88% Present');
    expect(html).toContain('12% Absent');

    // Confirms no raw metric clutter at rest
    expect(html).not.toContain('bezent-att-cal-day-metrics');
  });

  it('renders loading skeleton cleanly', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <AttendanceCalendarCard loading />
      </MemoryRouter>,
    );

    expect(html).toContain('bezent-att-cal-skeleton');
  });
});
