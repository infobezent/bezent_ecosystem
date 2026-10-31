import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { CandidatesPage } from '../pages/CandidatesPage';
import { CandidatesTable } from '../components/CandidatesTable';
import { CandidateMetrics } from '../components/CandidateMetrics';
import { CandidateProfileDrawer } from '../components/CandidateProfileDrawer';
import { AddCandidateModal } from '../components/AddCandidateModal';
import { INITIAL_CANDIDATES } from '../data/mockCandidates';
import { INITIAL_JOB_OPENINGS } from '../data/mockJobOpenings';

describe('CandidatesPage', () => {
  it('renders the Candidates page header, metrics, tabs, and table', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <CandidatesPage />
      </MemoryRouter>,
    );

    expect(html).toContain('Candidate Directory');
    expect(html).toContain('Add Candidate');
    expect(html).toContain('Total Candidates');
    expect(html).toContain('In Pipeline');
    expect(html).toContain('Aditya Raman');
    expect(html).toContain('CND-2026-001');
    expect(html).toContain('Shreya Sengupta');
  });

  it('renders CandidateMetrics with valid counts', () => {
    const html = renderToStaticMarkup(
      <CandidateMetrics candidates={INITIAL_CANDIDATES} />,
    );

    expect(html).toContain('Total Candidates');
    expect(html).toContain('In Pipeline');
    expect(html).toContain('Completed &amp; Hired');
    expect(html).toContain('In Process');
  });

  it('renders CandidatesTable with candidate rows, flags, and actions', () => {
    const html = renderToStaticMarkup(
      <CandidatesTable
        candidates={INITIAL_CANDIDATES}
        onSelectCandidate={() => {}}
        onStageChange={() => {}}
      />,
    );

    expect(html).toContain('Aditya Raman');
    expect(html).toContain('Senior Frontend Architect');
    expect(html).toContain('8.5 yrs');
    expect(html).toContain('Chennai');
    expect(html).toContain('View Candidate Profile');
    expect(html).toContain('Shreya Sengupta');
  });

  it('renders CandidateProfileDrawer with profile details and tabs', () => {
    const cand = INITIAL_CANDIDATES[0]!;
    const html = renderToStaticMarkup(
      <CandidateProfileDrawer
        candidate={cand}
        isOpen={true}
        onClose={() => {}}
        onStageChange={() => {}}
        onHandoffToOnboarding={() => {}}
      />,
    );

    expect(html).toContain(cand.fullName);
    expect(html).toContain(cand.candidateNumber);
    expect(html).toContain('Freshworks Inc.');
    expect(html).toContain('JOB-2026-001');
    expect(html).toContain('8.5 yrs (8 yrs rel.)');
    expect(html).toContain('Profile &amp; Contact');
    expect(html).toContain('Contact Information');
    expect(html).toContain(cand.email);
    expect(html).toContain('Candidate Pitch &amp; Summary');
  });

  it('renders AddCandidateModal with required form controls', () => {
    const html = renderToStaticMarkup(
      <AddCandidateModal
        isOpen={true}
        onClose={() => {}}
        onAddCandidate={() => {}}
        jobs={INITIAL_JOB_OPENINGS}
        existingCount={7}
      />,
    );

    expect(html).toContain('Add New Candidate');
    expect(html).toContain('Full Name');
    expect(html).toContain('Email Address');
    expect(html).toContain('Target Job Opening');
    expect(html).toContain('Save Candidate Profile');
  });
});
