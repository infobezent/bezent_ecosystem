import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { EssChangeRequestsTab } from '../EssChangeRequestsTab';
import type { EssRequest } from '../../../api/essApi';

const mockChangeRequests: EssRequest[] = [
  {
    id: 'req-uuid-1111',
    requestType: 'profile_change',
    subject: 'Correction Request: Legal Full Name',
    details: {
      section: 'personal',
      reason: 'Updated name on legal government passport',
      changes: {
        field: 'name',
        fieldLabel: 'Legal Full Name',
        proposedValue: 'Johnathan Doe',
      },
    },
    status: 'pending',
    reviewerNotes: null,
    createdAt: '2026-03-01T10:00:00.000Z',
    updatedAt: '2026-03-01T10:00:00.000Z',
  },
  {
    id: 'req-uuid-2222',
    requestType: 'profile_change',
    subject: 'Correction Request: Residential Street Address',
    details: {
      section: 'address',
      reason: 'Relocated to new permanent residence',
      changes: {
        field: 'addressStreet',
        fieldLabel: 'Residential Street Address',
        proposedValue: '456 MG Road, Indiranagar',
      },
    },
    status: 'approved',
    reviewerNotes: 'Verified against electricity bill copy.',
    createdAt: '2026-02-15T09:30:00.000Z',
    updatedAt: '2026-02-16T14:20:00.000Z',
  },
  {
    id: 'req-uuid-3333',
    requestType: 'profile_change',
    subject: 'Correction Request: Date of Birth',
    details: {
      section: 'personal',
      reason: 'Typo in day of birth',
      changes: {
        field: 'dateOfBirth',
        fieldLabel: 'Date of Birth',
        proposedValue: '1992-05-15',
      },
    },
    status: 'rejected',
    reviewerNotes: 'Birth certificate photocopy not legible. Please resubmit clear copy.',
    createdAt: '2026-01-10T08:00:00.000Z',
    updatedAt: '2026-01-11T11:00:00.000Z',
  },
];

describe('EssChangeRequestsTab Component', () => {
  it('renders section header, new request button, and exact metric counts', () => {
    const html = renderToStaticMarkup(
      <EssChangeRequestsTab changeRequests={mockChangeRequests} onRequestNewChange={vi.fn()} />,
    );

    expect(html).toContain('Profile Change Requests');
    expect(html).toContain(
      'Track formal corrections to verified personal, identity, and statutory records',
    );
    expect(html).toContain('New Request');

    // Metrics
    expect(html).toContain('Total Requests');
    expect(html).toContain('Pending HR Review');
    expect(html).toContain('Approved');
    expect(html).toContain('Rejected');
    expect(html).toContain(
      '>3</span><span class="ess-change-req-metric-label">Total Requests</span>',
    );
    expect(html).toContain(
      '>1</span><span class="ess-change-req-metric-label">Pending HR Review</span>',
    );
    expect(html).toContain('>1</span><span class="ess-change-req-metric-label">Approved</span>');
    expect(html).toContain('>1</span><span class="ess-change-req-metric-label">Rejected</span>');
  });

  it('renders status filter tabs with count pills', () => {
    const html = renderToStaticMarkup(
      <EssChangeRequestsTab changeRequests={mockChangeRequests} onRequestNewChange={vi.fn()} />,
    );

    expect(html).toContain('All Requests');
    expect(html).toContain('Pending');
    expect(html).toContain('Approved');
    expect(html).toContain('Rejected');
    expect(html).toContain('Cancelled');
  });

  it('renders request list items with safe fields and badges', () => {
    const html = renderToStaticMarkup(
      <EssChangeRequestsTab changeRequests={mockChangeRequests} onRequestNewChange={vi.fn()} />,
    );

    // Items and Subjects
    expect(html).toContain('Correction Request: Legal Full Name');
    expect(html).toContain('Correction Request: Residential Street Address');
    expect(html).toContain('Correction Request: Date of Birth');

    // Section Labels
    expect(html).toContain('Personal Information');
    expect(html).toContain('Residential Address');

    // Proposed changes
    expect(html).toContain('Johnathan Doe');
    expect(html).toContain('456 MG Road, Indiranagar');
    expect(html).toContain('1992-05-15');

    // Reasons
    expect(html).toContain('Updated name on legal government passport');
    expect(html).toContain('Relocated to new permanent residence');

    // Reviewer Notes
    expect(html).toContain('Verified against electricity bill copy.');
    expect(html).toContain('Birth certificate photocopy not legible.');

    // Cancel action is present for pending item
    expect(html).toContain('Cancel Request');
    expect(html).toContain('View Details');
  });

  it('renders empty state when request list is empty', () => {
    const html = renderToStaticMarkup(
      <EssChangeRequestsTab changeRequests={[]} onRequestNewChange={vi.fn()} />,
    );

    expect(html).toContain('No Profile Change Requests');
    expect(html).toContain('Submit First Request');
    expect(html).toContain(
      '>0</span><span class="ess-change-req-metric-label">Total Requests</span>',
    );
  });

  it('renders loading state when loading prop is true', () => {
    const html = renderToStaticMarkup(
      <EssChangeRequestsTab changeRequests={[]} loading={true} onRequestNewChange={vi.fn()} />,
    );

    expect(html).toContain('Loading profile change requests...');
  });

  it('ensures no raw internal database secrets or routing metadata are exposed', () => {
    const html = renderToStaticMarkup(
      <EssChangeRequestsTab changeRequests={mockChangeRequests} onRequestNewChange={vi.fn()} />,
    );

    expect(html).not.toContain('tenantId');
    expect(html).not.toContain('companyId');
    expect(html).not.toContain('employeeId');
    expect(html).not.toContain('reviewedByUserId');
  });
});
