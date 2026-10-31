import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { HiringReportsPage } from '../pages/HiringReportsPage';
import { HiringKpiCards } from '../components/HiringKpiCards';
import { SourceEffectivenessCard } from '../components/SourceEffectivenessCard';
import { StageConversionFunnel } from '../components/StageConversionFunnel';
import { RecruiterWorkloadTable } from '../components/RecruiterWorkloadTable';
import {
  INITIAL_HIRING_KPIS,
  INITIAL_RECRUITER_WORKLOAD,
  INITIAL_SOURCE_EFFECTIVENESS,
  INITIAL_STAGE_FUNNEL,
} from '../data/mockReports';

describe('HiringReportsPage', () => {
  it('renders the Hiring Reports page header, KPIs, and analysis sections', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <HiringReportsPage />
      </MemoryRouter>,
    );

    expect(html).toContain('Hiring Analytics &amp; Reports');
    expect(html).toContain('Export Report (.CSV)');
    expect(html).toContain('Time to Hire');
    expect(html).toContain('Time to Fill');
    expect(html).toContain('Offer Acceptance Rate');
    expect(html).toContain('Quality of Hire');
  });

  it('renders HiringKpiCards with accurate metrics', () => {
    const html = renderToStaticMarkup(<HiringKpiCards kpis={INITIAL_HIRING_KPIS} />);

    expect(html).toContain('Time to Hire');
    expect(html).toContain('28');
    expect(html).toContain('Time to Fill');
    expect(html).toContain('36');
    expect(html).toContain('Offer Acceptance Rate');
    expect(html).toContain('84%');
  });

  it('renders SourceEffectivenessCard with talent channels and conversion yields', () => {
    const html = renderToStaticMarkup(
      <SourceEffectivenessCard sources={INITIAL_SOURCE_EFFECTIVENESS} />,
    );

    expect(html).toContain('Candidate Source Effectiveness &amp; Channel ROI');
    expect(html).toContain('Employee Referral');
    expect(html).toContain('LinkedIn Jobs &amp; Sourcing');
    expect(html).toContain('Talent Pool Rediscovery');
    expect(html).toContain('19%');
  });

  it('renders StageConversionFunnel with funnel stages and yield rates', () => {
    const html = renderToStaticMarkup(
      <StageConversionFunnel steps={INITIAL_STAGE_FUNNEL} />,
    );

    expect(html).toContain('Full Pipeline Stage Conversion &amp; Velocity Funnel');
    expect(html).toContain('Applications Received');
    expect(html).toContain('Resume Screening');
    expect(html).toContain('Technical &amp; System Interviews');
    expect(html).toContain('Offer Accepted &amp; Hired');
  });

  it('renders RecruiterWorkloadTable with team throughput metrics', () => {
    const html = renderToStaticMarkup(
      <RecruiterWorkloadTable workload={INITIAL_RECRUITER_WORKLOAD} />,
    );

    expect(html).toContain('Recruiter Throughput &amp; Talent Team Workload');
    expect(html).toContain('Priya Sundaram');
    expect(html).toContain('Arun Kumar');
    expect(html).toContain('Sabin Rahul');
  });
});
