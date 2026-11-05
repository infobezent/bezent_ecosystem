import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { OffersPage } from '../pages/OffersPage';
import { OfferMetrics } from '../components/OfferMetrics';
import { OffersTable } from '../components/OffersTable';
import { OfferDetailsModal } from '../components/OfferDetailsModal';
import { CreateOfferModal } from '../components/CreateOfferModal';
import { ApproveOfferModal } from '../components/ApproveOfferModal';
import { INITIAL_OFFERS } from '../data/mockOffers';
import { INITIAL_CANDIDATES } from '../data/mockCandidates';

describe('OffersPage', () => {
  it('renders the Job Offers page header, metrics, toolbar, and table', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <OffersPage />
      </MemoryRouter>,
    );

    expect(html).toContain('Job Offers');
    expect(html).toContain('Draft New Offer');
    expect(html).toContain('Total Offers');
    expect(html).toContain('Pending Sign-Off');
    expect(html).toContain('Awaiting Candidate');
    expect(html).toContain('Accepted &amp; Joined');
    expect(html).toContain('Shreya Sengupta');
    expect(html).toContain('OFF-2026-001');
  });

  it('renders OfferMetrics correctly', () => {
    const html = renderToStaticMarkup(<OfferMetrics offers={INITIAL_OFFERS} />);

    expect(html).toContain('Total Offers');
    expect(html).toContain('Pending Sign-Off');
    expect(html).toContain('Awaiting Candidate');
    expect(html).toContain('Accepted &amp; Joined');
  });

  it('renders OffersTable with candidate offers and actions', () => {
    const html = renderToStaticMarkup(
      <OffersTable
        offers={INITIAL_OFFERS}
        onSelectOffer={() => {}}
        onApproveOffer={() => {}}
        onSendOffer={() => {}}
        onInitiateHandoff={() => {}}
      />,
    );

    expect(html).toContain('Shreya Sengupta');
    expect(html).toContain('Vignesh Balaji');
    expect(html).toContain('OFF-2026-001');
    expect(html).toContain('₹32.00 LPA');
    expect(html).toContain('View Offer');
  });

  it('renders OfferDetailsModal with compensation breakdown and approval workflow', () => {
    const offer = INITIAL_OFFERS[0]!;
    const html = renderToStaticMarkup(
      <OfferDetailsModal
        offer={offer}
        isOpen={true}
        onClose={() => {}}
        onApprove={() => {}}
        onSendOffer={() => {}}
        onInitiateHandoff={() => {}}
      />,
    );

    expect(html).toContain('OFF-2026-001');
    expect(html).toContain('Shreya Sengupta');
    expect(html).toContain('Compensation &amp; Package');
    expect(html).toContain('Annual Gross CTC');
    expect(html).toContain('Basic Salary');
  });

  it('renders CreateOfferModal with candidate select and package inputs', () => {
    const html = renderToStaticMarkup(
      <CreateOfferModal
        isOpen={true}
        onClose={() => {}}
        onCreateOffer={() => {}}
        candidates={INITIAL_CANDIDATES}
      />,
    );

    expect(html).toContain('Draft New Job Offer');
    expect(html).toContain('Select Candidate');
    expect(html).toContain('Total CTC');
    expect(html).toContain('Base Pay');
    expect(html).toContain('Create &amp; Route for Approval');
  });

  it('renders ApproveOfferModal with review details', () => {
    const offer = INITIAL_OFFERS[2]!;
    const html = renderToStaticMarkup(
      <ApproveOfferModal
        offer={offer}
        isOpen={true}
        onClose={() => {}}
        onConfirmApproval={() => {}}
      />,
    );

    expect(html).toContain('Review Offer Approval — OFF-2026-003');
    expect(html).toContain('Deepak Sundaram');
    expect(html).toContain('Sign-off Decision');
    expect(html).toContain('Confirm Approval');
  });
});
