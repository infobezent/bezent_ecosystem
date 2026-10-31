import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { TalentPoolPage } from '../pages/TalentPoolPage';
import { TalentMetrics } from '../components/TalentMetrics';
import { TalentTable } from '../components/TalentTable';
import { TalentProfileModal } from '../components/TalentProfileModal';
import { ReEngageModal } from '../components/ReEngageModal';
import { INITIAL_TALENT_PROFILES } from '../data/mockTalentPool';
import { INITIAL_JOB_OPENINGS } from '../data/mockJobOpenings';

describe('TalentPoolPage', () => {
  it('renders the Talent Pool page header, metrics, toolbar, and table', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <TalentPoolPage />
      </MemoryRouter>,
    );

    expect(html).toContain('Talent Pool &amp; Network');
    expect(html).toContain('Total Talent Network');
    expect(html).toContain('Silver Medalists');
    expect(html).toContain('Ready to Re-Engage');
    expect(html).toContain('Consent Action Due');
    expect(html).toContain('Rajesh Kannan');
    expect(html).toContain('Divya Natesan');
  });

  it('renders TalentMetrics correctly', () => {
    const html = renderToStaticMarkup(<TalentMetrics talent={INITIAL_TALENT_PROFILES} />);

    expect(html).toContain('Total Talent Network');
    expect(html).toContain('Silver Medalists');
    expect(html).toContain('Ready to Re-Engage');
    expect(html).toContain('Consent Action Due');
  });

  it('renders TalentTable with candidate profiles, tags, and consent badges', () => {
    const html = renderToStaticMarkup(
      <TalentTable
        talent={INITIAL_TALENT_PROFILES}
        onSelectTalent={() => {}}
        onReEngage={() => {}}
      />,
    );

    expect(html).toContain('Rajesh Kannan');
    expect(html).toContain('Divya Natesan');
    expect(html).toContain('Silver Medalist');
    expect(html).toContain('Infosys FinTech Labs');
    expect(html).toContain('Re-Engage');
  });

  it('renders TalentProfileModal with overview, touchpoints, and privacy details', () => {
    const profile = INITIAL_TALENT_PROFILES[0]!;
    const html = renderToStaticMarkup(
      <TalentProfileModal
        profile={profile}
        isOpen={true}
        onClose={() => {}}
        onReEngage={() => {}}
      />,
    );

    expect(html).toContain('Rajesh Kannan');
    expect(html).toContain('Silver Medalist');
    expect(html).toContain('Talent Summary &amp; Skills');
    expect(html).toContain('Previous Application Context');
    expect(html).toContain('Re-Engage &amp; Fast-Track');
  });

  it('renders ReEngageModal with requisition options and outreach template', () => {
    const profile = INITIAL_TALENT_PROFILES[0]!;
    const html = renderToStaticMarkup(
      <ReEngageModal
        profile={profile}
        isOpen={true}
        onClose={() => {}}
        onConfirmReEngage={() => {}}
        jobOpenings={INITIAL_JOB_OPENINGS}
      />,
    );

    expect(html).toContain('Re-Engage Talent — Rajesh Kannan');
    expect(html).toContain('Target Active Requisition');
    expect(html).toContain('Fast-Track Pipeline Stage');
    expect(html).toContain('Outreach Message / Email Body');
    expect(html).toContain('Fast-Track &amp; Send Outreach');
  });
});
