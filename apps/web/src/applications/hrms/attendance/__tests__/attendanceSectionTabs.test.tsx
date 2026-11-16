import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import {
  AttendanceSectionTabs,
  RECORDS_TABS,
  REQUESTS_TABS,
} from '../components/AttendanceSectionTabs';

describe('AttendanceSectionTabs', () => {
  it('links every "records" tab to its existing route', () => {
    expect(RECORDS_TABS).toEqual([
      { id: 'daily-log', label: 'Daily', path: '/hrms/attendance/daily-log' },
      { id: 'monthly-summary', label: 'Monthly', path: '/hrms/attendance/monthly-summary' },
      { id: 'punch-logs', label: 'Punch Logs', path: '/hrms/attendance/punch-logs' },
    ]);
  });

  it('links every "requests" tab to its existing route', () => {
    expect(REQUESTS_TABS).toEqual([
      { id: 'regularization', label: 'Regularization', path: '/hrms/attendance/regularization' },
      { id: 'on-duty', label: 'On-Duty', path: '/hrms/attendance/on-duty' },
      { id: 'overtime', label: 'Overtime', path: '/hrms/attendance/overtime' },
      { id: 'comp-off', label: 'Comp-Off', path: '/hrms/attendance/comp-off' },
    ]);
  });

  const cases: Array<{ group: 'records' | 'requests'; path: string; activeTabId: string }> = [
    { group: 'records', path: '/hrms/attendance/daily-log', activeTabId: 'daily-log' },
    { group: 'records', path: '/hrms/attendance/monthly-summary', activeTabId: 'monthly-summary' },
    { group: 'records', path: '/hrms/attendance/punch-logs', activeTabId: 'punch-logs' },
    { group: 'requests', path: '/hrms/attendance/regularization', activeTabId: 'regularization' },
    { group: 'requests', path: '/hrms/attendance/on-duty', activeTabId: 'on-duty' },
    { group: 'requests', path: '/hrms/attendance/overtime', activeTabId: 'overtime' },
    { group: 'requests', path: '/hrms/attendance/comp-off', activeTabId: 'comp-off' },
  ];

  for (const { group, path, activeTabId } of cases) {
    it(`marks "${activeTabId}" active on ${path}`, () => {
      const html = renderToStaticMarkup(
        <MemoryRouter initialEntries={[path]}>
          <AttendanceSectionTabs group={group} />
        </MemoryRouter>,
      );

      expect(html).toContain(`id="tab-${activeTabId}"`);
      // The active tab carries aria-selected="true"; every other tab in the
      // same strip must be aria-selected="false".
      const activeTabMarkup = html.match(
        new RegExp(`<button[^>]*id="tab-${activeTabId}"[^>]*>`),
      )?.[0];
      expect(activeTabMarkup).toContain('aria-selected="true"');

      const otherTabIds = TABS_BY_GROUP_FOR_TEST[group]
        .map((t) => t.id)
        .filter((id) => id !== activeTabId);
      for (const otherId of otherTabIds) {
        const otherTabMarkup = html.match(new RegExp(`<button[^>]*id="tab-${otherId}"[^>]*>`))?.[0];
        expect(otherTabMarkup).toContain('aria-selected="false"');
      }
    });
  }
});

const TABS_BY_GROUP_FOR_TEST = { records: RECORDS_TABS, requests: REQUESTS_TABS };
