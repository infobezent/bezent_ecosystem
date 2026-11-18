import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { PunchLogsPage } from '../pages/PunchLogsPage';
import {
  computeWorkdayTrendSegments,
  extractPunchHour,
  AllPunchesLineChart,
  TotalPunchesLineChart,
  FirstInBarChart,
  FirstInLineChart,
  LastOutAreaChart,
  LastOutLineChart,
  LatePunchHistogram,
  LatePunchLineChart,
  ExceptionsDonutChart,
  ExceptionsLineChart,
  AcceptedCircularProgress,
  FlaggedMiniBarChart,
  RejectedMiniBarChart,
  FailedToProcessLineChart,
  WORKDAY_SEGMENTS,
} from '../components/PunchLogMiniGraphs';
import { generateSamplePunchLogs } from '../data/samplePunchLogs';
import type { PunchLogItem } from '../types/attendance.types';

describe('BEZENT HRMS Attendance — Punch Log Summary Cards & Workable Mini Graphs', () => {
  describe('Punch Trend Segment Engine', () => {
    it('defines 5 standard workday segments covering morning entry to evening checkout', () => {
      expect(WORKDAY_SEGMENTS.length).toBe(5);
      expect(WORKDAY_SEGMENTS[0]?.label).toContain('Morning Rush (08:00–10:00)');
      expect(WORKDAY_SEGMENTS[1]?.label).toContain('Mid-Morning (10:00–12:00)');
      expect(WORKDAY_SEGMENTS[2]?.label).toContain('Midday / Lunch (12:00–15:00)');
      expect(WORKDAY_SEGMENTS[3]?.label).toContain('Afternoon (15:00–18:00)');
      expect(WORKDAY_SEGMENTS[4]?.label).toContain('Evening Checkout (18:00+)');
    });

    it('correctly extracts hour from timestamps and time strings', () => {
      const punch1 = { punchTime: '2026-11-17T09:15:30Z' } as PunchLogItem;
      const punch2 = { punchTime: '2026-11-17T18:45:00' } as PunchLogItem;
      const punch3 = { punchTime: '14:20:00' } as PunchLogItem;

      expect(extractPunchHour(punch1)).toBe(new Date('2026-11-17T09:15:30Z').getHours());
      expect(extractPunchHour(punch2)).toBe(new Date('2026-11-17T18:45:00').getHours());
      expect(extractPunchHour(punch3)).toBe(14);
    });

    it('computes trend segments accurately from actual sample punch records', () => {
      const sample = generateSamplePunchLogs('2026-11-17');
      const segments = computeWorkdayTrendSegments(sample);

      expect(segments.length).toBe(5);
      const totalCount = segments.reduce((acc, s) => acc + s.count, 0);
      expect(totalCount).toBe(sample.length);

      // Morning rush and evening checkout have clear peaks
      expect(segments[0]?.count).toBeGreaterThan(0);
      expect(segments[4]?.count).toBeGreaterThan(0);
    });
  });

  describe('Workable Mini Graph Visualizations Rendering', () => {
    const mockData = [
      { label: 'Morning Rush (08:00–10:00)', shortLabel: '08–10', count: 10 },
      { label: 'Mid-Morning (10:00–12:00)', shortLabel: '10–12', count: 1 },
      { label: 'Midday / Lunch (12:00–15:00)', shortLabel: '12–15', count: 2 },
      { label: 'Afternoon (15:00–18:00)', shortLabel: '15–18', count: 2 },
      { label: 'Evening Checkout (18:00+)', shortLabel: '18+', count: 8 },
    ];

    it('renders Total Punches mini line chart with connected line, nodes, and tooltips', () => {
      const html = renderToStaticMarkup(<TotalPunchesLineChart data={mockData} total={23} />);

      expect(html).toContain('bezent-kpi-graph-svg');
      expect(html).toContain('Punch activity trend: 23 total punches');
      expect(html).toContain('stroke="#2563eb"');
      expect(html).toContain('bezent-kpi-chart-node');
    });

    it('renders Accepted green circular progress gauge with percentage and tooltip', () => {
      const html = renderToStaticMarkup(<AcceptedCircularProgress valid={14} total={23} />);

      expect(html).toContain('bezent-kpi-graph-svg--circular');
      expect(html).toContain('Accepted: 14 of 23 punches (61%)');
      expect(html).toContain('61%');
      expect(html).toContain('stroke="#10b981"');
      expect(html).toContain('bezent-kpi-graph-progress');
    });

    it('renders Flagged orange structured mini bar chart with background tracks and active columns', () => {
      const flaggedData = [
        { label: 'Morning Rush (08:00–10:00)', shortLabel: '08–10', count: 2 },
        { label: 'Mid-Morning (10:00–12:00)', shortLabel: '10–12', count: 1 },
        { label: 'Midday / Lunch (12:00–15:00)', shortLabel: '12–15', count: 0 },
        { label: 'Afternoon (15:00–18:00)', shortLabel: '15–18', count: 1 },
        { label: 'Evening Checkout (18:00+)', shortLabel: '18+', count: 1 },
      ];
      const html = renderToStaticMarkup(<FlaggedMiniBarChart data={flaggedData} total={5} />);

      expect(html).toContain('bezent-kpi-graph-svg');
      expect(html).toContain('Flagged punch trends: 5 flagged punches');
      expect(html).toContain('fill="#f59e0b"');
      expect(html).toContain('bezent-kpi-graph-bar');
      expect(html).toContain('rgba(245, 158, 11, 0.15)');
    });

    it('renders Rejected red structured mini bar chart with background tracks and active columns', () => {
      const rejectedData = [
        { label: 'Morning Rush (08:00–10:00)', shortLabel: '08–10', count: 1 },
        { label: 'Mid-Morning (10:00–12:00)', shortLabel: '10–12', count: 0 },
        { label: 'Midday / Lunch (12:00–15:00)', shortLabel: '12–15', count: 2 },
        { label: 'Afternoon (15:00–18:00)', shortLabel: '15–18', count: 0 },
        { label: 'Evening Checkout (18:00+)', shortLabel: '18+', count: 0 },
      ];
      const html = renderToStaticMarkup(<RejectedMiniBarChart data={rejectedData} total={3} />);

      expect(html).toContain('bezent-kpi-graph-svg');
      expect(html).toContain('Rejected punch trends: 3 rejected punches');
      expect(html).toContain('fill="#ef4444"');
      expect(html).toContain('bezent-kpi-graph-bar');
      expect(html).toContain('rgba(239, 68, 68, 0.15)');
    });

    it('renders Failed to Process violet telemetry line chart with incident beacon', () => {
      const failedData = [
        { label: 'Morning Rush (08:00–10:00)', shortLabel: '08–10', count: 1 },
        { label: 'Mid-Morning (10:00–12:00)', shortLabel: '10–12', count: 0 },
        { label: 'Midday / Lunch (12:00–15:00)', shortLabel: '12–15', count: 0 },
        { label: 'Afternoon (15:00–18:00)', shortLabel: '15–18', count: 0 },
        { label: 'Evening Checkout (18:00+)', shortLabel: '18+', count: 0 },
      ];
      const html = renderToStaticMarkup(<FailedToProcessLineChart data={failedData} total={1} />);

      expect(html).toContain('bezent-kpi-graph-svg');
      expect(html).toContain('Processing failures: 1 total failures');
      expect(html).toContain('stroke="#8b5cf6"');
      expect(html).toContain('bezent-kpi-graph-beacon');
      expect(html).toContain('Incident Window:');
    });

    it('renders all five distinct interactive graph types with their unique visual structures and tooltips', () => {
      const sampleData = [
        { label: 'Morning Rush (08:00–10:00)', shortLabel: '08:00–10:00', count: 12 },
        { label: 'Mid-Morning (10:00–12:00)', shortLabel: '10:00–12:00', count: 4 },
        { label: 'Midday / Lunch (12:00–15:00)', shortLabel: '12:00–15:00', count: 3 },
        { label: 'Afternoon (15:00–18:00)', shortLabel: '15:00–18:00', count: 5 },
        { label: 'Evening Checkout (18:00+)', shortLabel: '18:00+', count: 10 },
      ];

      // 1. All Punches - Line Graph (Blue #2563eb)
      const allPunchesHtml = renderToStaticMarkup(
        <AllPunchesLineChart data={sampleData} total={34} />,
      );
      expect(allPunchesHtml).toContain('stroke="#2563eb"');
      expect(allPunchesHtml).toContain('bezent-kpi-graph-wrapper');
      expect(allPunchesHtml).toContain('bezent-kpi-graph-tooltip');
      expect(allPunchesHtml).toContain('bezent-kpi-chart-node');

      // 2. First In - Bar Graph (Green #10b981)
      const firstInHtml = renderToStaticMarkup(
        <FirstInBarChart data={sampleData} total={12} />,
      );
      expect(firstInHtml).toContain('fill="#10b981"');
      expect(firstInHtml).toContain('bezent-kpi-chart-bar');
      expect(firstInHtml).toContain('bezent-kpi-graph-wrapper');
      expect(firstInHtml).toContain('bezent-kpi-graph-tooltip');

      // 3. Last Out - Area Graph (Violet #8b5cf6)
      const lastOutHtml = renderToStaticMarkup(
        <LastOutAreaChart data={sampleData} total={10} />,
      );
      expect(lastOutHtml).toContain('stroke="#8b5cf6"');
      expect(lastOutHtml).toContain('url(#last-out-rich-grad)');
      expect(lastOutHtml).toContain('bezent-kpi-graph-wrapper');
      expect(lastOutHtml).toContain('bezent-kpi-graph-tooltip');

      // 4. Late Punch - Histogram (Orange #f59e0b)
      const latePunchHtml = renderToStaticMarkup(
        <LatePunchHistogram data={sampleData} total={5} />,
      );
      expect(latePunchHtml).toContain('fill="#f59e0b"');
      expect(latePunchHtml).toContain('bezent-kpi-chart-histogram-bin');
      expect(latePunchHtml).toContain('bezent-kpi-graph-wrapper');
      expect(latePunchHtml).toContain('bezent-kpi-graph-tooltip--hist');

      // 5. Exceptions - Donut Chart (Red #ef4444)
      const exceptionsHtml = renderToStaticMarkup(
        <ExceptionsDonutChart data={sampleData} total={2} />,
      );
      expect(exceptionsHtml).toContain('bezent-kpi-graph-svg--donut');
      expect(exceptionsHtml).toContain('bezent-kpi-chart-donut-segment');
      expect(exceptionsHtml).toContain('stroke="#ef4444"');
      expect(exceptionsHtml).toContain('bezent-kpi-graph-wrapper');
      expect(exceptionsHtml).toContain('bezent-kpi-graph-tooltip--donut');
    });
  });

  describe('PunchLogsPage Summary Cards Integration & Integrity', () => {
    it('renders all five category summary cards with clean borderless styling and mini data graphs', () => {
      const html = renderToStaticMarkup(
        <MemoryRouter>
          <PunchLogsPage />
        </MemoryRouter>,
      );

      // Verify new category card titles
      expect(html).toContain('All Punches');
      expect(html).toContain('First In');
      expect(html).toContain('Last Out');
      expect(html).toContain('Late Punch');
      expect(html).toContain('Exceptions');

      // Verify all 5 category mini graphs are present
      expect(html).toContain('Punch activity trend');
      expect(html).toContain('First In arrival trend');
      expect(html).toContain('Last Out departure trend');
      expect(html).toContain('Late punch trends');
      expect(html).toContain('Exception trends');

      // Verify all 5 bottom status badges are present
      expect(html).toContain('Total Activity');
      expect(html).toContain('First Inbound');
      expect(html).toContain('Last Outbound');
      expect(html).toContain('Late Arrivals');
      expect(html).toContain('Requires Review');
      expect(html).toContain('bezent-kpi-sub-pill');
      expect(html).toContain('bezent-kpi-sub-pill-dot');

      // Verify that the separate category view mode toggle bar is completely removed
      expect(html).not.toContain('aria-label="Punch logs view mode"');

      // Verify that the old card categories and badges are completely removed
      expect(html).not.toContain('<span class="bezent-kpi-card__title">Total Punches</span>');
      expect(html).not.toContain('<span class="bezent-kpi-card__title">Accepted</span>');
      expect(html).not.toContain('<span class="bezent-kpi-card__title">Flagged</span>');
      expect(html).not.toContain('<span class="bezent-kpi-card__title">Failed to Process</span>');
      expect(html).not.toContain('Successfully Processed');
      expect(html).not.toContain('Processing Errors');

      // Verify that old graphics/icons are completely removed
      expect(html).not.toContain('bezent-kpi-card__illustration');
      expect(html).not.toContain('FingerprintGraphic');
      expect(html).not.toContain('AcceptedGraphic');
      expect(html).not.toContain('FlaggedGraphic');
      expect(html).not.toContain('RejectedGraphic');
      expect(html).not.toContain('FailedToProcessGraphic');
    });
  });
});
