import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { HiringPipelinePage } from '../pages/HiringPipelinePage';
import { PipelineColumn } from '../components/PipelineColumn';
import { PipelineCandidateCard } from '../components/PipelineCandidateCard';
import { INITIAL_CANDIDATES } from '../data/mockCandidates';
import { ACTIVE_PIPELINE_STAGES } from '../types/pipeline';

describe('HiringPipelinePage', () => {
  it('renders the Hiring Pipeline page header, conversion metrics, and stage columns', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <HiringPipelinePage />
      </MemoryRouter>,
    );

    expect(html).toContain('Hiring Pipeline');
    expect(html).toContain('Active In Pipeline');
    expect(html).toContain('In Evaluation');
    expect(html).toContain('Offers &amp; Hires');
    expect(html).toContain('Conversion Rate');
    expect(html).toContain('Applied');
    expect(html).toContain('Screening');
    expect(html).toContain('Interview');
    expect(html).toContain('Offer');
    expect(html).toContain('Hired');
  });

  it('renders a PipelineColumn with candidates and stage badge', () => {
    const stage = ACTIVE_PIPELINE_STAGES[0]!;
    const candidatesInStage = INITIAL_CANDIDATES.filter((c) => c.currentStage === stage.id);
    const html = renderToStaticMarkup(
      <PipelineColumn
        stage={stage}
        candidates={candidatesInStage}
        onSelectCandidate={() => {}}
        onStageChange={() => {}}
      />,
    );

    expect(html).toContain(stage.label);
    expect(html).toContain(stage.description);
  });

  it('renders PipelineCandidateCard with candidate details and advance button', () => {
    const cand = INITIAL_CANDIDATES[0]!;
    const html = renderToStaticMarkup(
      <PipelineCandidateCard
        candidate={cand}
        onSelectCandidate={() => {}}
        onStageChange={() => {}}
      />,
    );

    expect(html).toContain(cand.fullName);
    expect(html).toContain(cand.candidateNumber);
    expect(html).toContain('Details');
    expect(html).toContain('Advance');
  });
});
