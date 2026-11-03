import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { OnboardingHandoffPage } from '../pages/OnboardingHandoffPage';
import { HandoffMetrics } from '../components/HandoffMetrics';
import { HandoffTable } from '../components/HandoffTable';
import { ConvertHandoffModal } from '../components/ConvertHandoffModal';
import { HandoffDetailDrawer } from '../components/HandoffDetailDrawer';
import { INITIAL_HANDOFFS } from '../data/mockHandoffs';

describe('OnboardingHandoffPage', () => {
  it('renders the Onboarding Handoff page header, metrics, toolbar, and table', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <OnboardingHandoffPage />
      </MemoryRouter>,
    );

    expect(html).toContain('Onboarding Handoff');
    expect(html).toContain('Ready for Handoff');
    expect(html).toContain('Pending Verification');
    expect(html).toContain('Handoffs Completed');
    expect(html).toContain('Duplicate Check Alerts');
    expect(html).toContain('Shreya Sengupta');
    expect(html).toContain('Rohan Nair');
  });

  it('renders HandoffMetrics correctly', () => {
    const html = renderToStaticMarkup(<HandoffMetrics handoffs={INITIAL_HANDOFFS} />);

    expect(html).toContain('Ready for Handoff');
    expect(html).toContain('Pending Verification');
    expect(html).toContain('Handoffs Completed');
    expect(html).toContain('Duplicate Check Alerts');
  });

  it('renders HandoffTable with candidate handoff items and duplicate warnings', () => {
    const html = renderToStaticMarkup(
      <HandoffTable
        handoffs={INITIAL_HANDOFFS}
        onSelectHandoff={() => {}}
        onInitiateConversion={() => {}}
        onOpenWorkforceOnboarding={() => {}}
      />,
    );

    expect(html).toContain('Shreya Sengupta');
    expect(html).toContain('Arvind Krishnan');
    expect(html).toContain('Rohan Nair');
    expect(html).toContain('Match Detected');
    expect(html).toContain('Convert to Case');
  });

  it('renders ConvertHandoffModal with duplicate warning and template selector', () => {
    const item = INITIAL_HANDOFFS[4]!; // Rohan Nair (hasDuplicate: true)
    const html = renderToStaticMarkup(
      <ConvertHandoffModal
        item={item}
        isOpen={true}
        onClose={() => {}}
        onConfirmHandoff={() => {}}
      />,
    );

    expect(html).toContain('Convert Hired Candidate to Onboarding Case');
    expect(html).toContain('Rohan Nair');
    expect(html).toContain('Duplicate Identity Warning');
    expect(html).toContain('EMP-2024-055');
    expect(html).toContain('Onboarding Workflow Template');
    expect(html).toContain('Initialize Onboarding Case');
  });

  it('renders HandoffDetailDrawer with passport and checklist', () => {
    const item = INITIAL_HANDOFFS[0]!;
    const html = renderToStaticMarkup(
      <HandoffDetailDrawer
        item={item}
        isOpen={true}
        onClose={() => {}}
        onInitiateConversion={() => {}}
        onOpenWorkforceOnboarding={() => {}}
      />,
    );

    expect(html).toContain('Handoff Passport — Shreya Sengupta');
    expect(html).toContain('Pre-Handoff Verification Checklist');
    expect(html).toContain('SpringVerify Cleared');
    expect(html).toContain('Target Joining Date:');
  });
});
