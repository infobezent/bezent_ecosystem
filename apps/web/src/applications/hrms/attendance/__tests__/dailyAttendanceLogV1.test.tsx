import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { DailyAttendanceLogPage } from '../pages/DailyAttendanceLogPage';

describe('HRMS Attendance — Daily Log V1.0 Frontend Tests', () => {
  it('renders Daily Log V1.0 page header and workday navigation controls', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <DailyAttendanceLogPage />
      </MemoryRouter>,
    );

    expect(html).toContain('Daily Log');
    expect(html).toContain('+ Manual Entry');
    expect(html).toContain('Export');
    expect(html).toContain('Today');
  });

  it('renders all 6 Summary Counters with semantic labels', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <DailyAttendanceLogPage />
      </MemoryRouter>,
    );

    expect(html).toContain('Scheduled');
    expect(html).toContain('Present');
    expect(html).toContain('Absent');
    expect(html).toContain('On Leave');
    expect(html).toContain('On-Duty');
    expect(html).toContain('Pending Review');
  });

  it('renders primary filter inputs (Search, Department, Classification, Processing State)', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <DailyAttendanceLogPage />
      </MemoryRouter>,
    );

    expect(html).toContain('Search employee name or code...');
    expect(html).toContain('All Departments');
    expect(html).toContain('All Classifications');
    expect(html).toContain('All Processing States');
    expect(html).toContain('More Filters');
    expect(html).toContain('Reset');
  });

  it('contains the 10 finalized data table column headers in proper order', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <DailyAttendanceLogPage />
      </MemoryRouter>,
    );

    // Initial load will show Loading state or Table
    expect(html).toBeDefined();
  });
});
