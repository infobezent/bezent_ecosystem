import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { LeaveTypesTab } from '../LeaveTypesTab';
import { DEFAULT_LEAVE_TYPES_RESPONSE } from './fixtures/leaveTypes.fixture';
import { LeaveTypeDrawer } from '../LeaveTypeDrawer';

describe('LeaveTypesTab UI Component — Unit & Render Tests', () => {
  it('renders header, description, and primary action button', () => {
    const html = renderToStaticMarkup(<LeaveTypesTab initialData={DEFAULT_LEAVE_TYPES_RESPONSE} />);

    expect(html).toContain('Leave Types');
    expect(html).toContain('Manage the types of leave available to employees.');
    expect(html).toContain('Create Leave Type');
  });

  it('renders dynamic summary indicator cards', () => {
    const html = renderToStaticMarkup(<LeaveTypesTab initialData={DEFAULT_LEAVE_TYPES_RESPONSE} />);

    expect(html).toContain('Total Leave Types');
    expect(html).toContain('Active Leave Types');
    expect(html).toContain('Inactive Leave Types');
    expect(html).toContain('3');
  });

  it('renders search bar and status/payment filters', () => {
    const html = renderToStaticMarkup(<LeaveTypesTab initialData={DEFAULT_LEAVE_TYPES_RESPONSE} />);

    expect(html).toContain('Search by name or code...');
    expect(html).toContain('All Statuses');
    expect(html).toContain('All Payment Types');
  });

  it('renders leave types table with code badges, units, and status', () => {
    const html = renderToStaticMarkup(<LeaveTypesTab initialData={DEFAULT_LEAVE_TYPES_RESPONSE} />);

    expect(html).toContain('Annual Leave');
    expect(html).toContain('AL');
    expect(html).toContain('Sick Leave');
    expect(html).toContain('SL');
    expect(html).toContain('Casual Leave');
    expect(html).toContain('CL');
    expect(html).toContain('Paid');
    expect(html).toContain('Full Day');
    expect(html).toContain('Active');
  });

  it('renders row actions (View, Edit, Deactivate)', () => {
    const html = renderToStaticMarkup(<LeaveTypesTab initialData={DEFAULT_LEAVE_TYPES_RESPONSE} />);

    expect(html).toContain('View');
    expect(html).toContain('Edit');
    expect(html).toContain('Deactivate');
  });

  it('respects canManage=false by omitting management actions while preserving View', () => {
    const html = renderToStaticMarkup(
      <LeaveTypesTab initialData={DEFAULT_LEAVE_TYPES_RESPONSE} canManage={false} />,
    );

    expect(html).toContain('View');
    expect(html).not.toContain('>Edit<');
    expect(html).not.toContain('>Deactivate<');
    expect(html).not.toContain('>Create Leave Type<');
  });

  it('renders empty state when items list is empty and no active filters', () => {
    const emptyResponse = {
      items: [],
      total: 0,
      page: 1,
      limit: 10,
      totalPages: 1,
      summary: { total: 0, active: 0, inactive: 0, paid: 0, unpaid: 0, partlyPaid: 0 },
    };

    const html = renderToStaticMarkup(<LeaveTypesTab initialData={emptyResponse} />);
    expect(html).toContain('No Leave Types Configured');
    expect(html).toContain('Create Leave Type');
  });
});

describe('LeaveTypeDrawer Component — Render Tests', () => {
  it('renders drawer in create mode with all sections and fields', () => {
    const html = renderToStaticMarkup(
      <LeaveTypeDrawer
        isOpen={true}
        mode="create"
        onClose={() => {}}
        onSaved={() => {}}
        saveFn={() => Promise.resolve({} as never)}
      />,
    );

    expect(html).toContain('Create Leave Type');
    expect(html).toContain('Basic Information');
    expect(html).toContain('Leave Type Name');
    expect(html).toContain('Short Code');
    expect(html).toContain('Payment Classification');
    expect(html).toContain('Paid Leave');
    expect(html).toContain('Unpaid (LWP)');
    expect(html).toContain('Partly Paid');
    expect(html).toContain('Request Limits');
    expect(html).toContain('Maximum per Request (Days)');
    expect(html).toContain('Maximum per Month (Days)');
    expect(html).toContain('Yearly Ceiling (Days)');
    expect(html).toContain('Track Balance');
    expect(html).toContain('Eligible Employees');
    expect(html).toContain('Instructions for Employees');
    expect(html).toContain('Allow Half-Day Requests');
    expect(html).toContain('Documentation &amp; Eligibility');
    expect(html).toContain('Supporting Document');
    expect(html).toContain('Advanced Rules');
    expect(html).toContain('Cancel');
  });

  it('renders drawer in edit mode with existing item', () => {
    const sampleItem = DEFAULT_LEAVE_TYPES_RESPONSE.items[0]!;
    const html = renderToStaticMarkup(
      <LeaveTypeDrawer
        isOpen={true}
        mode="edit"
        initialData={sampleItem}
        onClose={() => {}}
        onSaved={() => {}}
        saveFn={() => Promise.resolve({} as never)}
      />,
    );

    expect(html).toContain('Edit Leave Type');
    expect(html).toContain('Annual Leave');
    expect(html).toContain('AL');
    expect(html).toContain('Save Changes');
  });

  it('renders drawer in view mode with read-only details and Edit button', () => {
    const sampleItem = DEFAULT_LEAVE_TYPES_RESPONSE.items[0]!;
    const html = renderToStaticMarkup(
      <LeaveTypeDrawer
        isOpen={true}
        mode="view"
        initialData={sampleItem}
        onClose={() => {}}
        onSaved={() => {}}
        saveFn={() => Promise.resolve({} as never)}
        onSwitchToEdit={() => {}}
        canManage={true}
      />,
    );

    expect(html).toContain('Annual Leave');
    expect(html).toContain('Leave Code: AL');
    expect(html).toContain('Close');
    expect(html).toContain('Edit Leave Type');
    expect(html).toContain('Basic Information');
    expect(html).toContain('Request Limits');
    expect(html).toContain('Advanced Rules');
    expect(html).toContain('Yearly Ceiling');
    expect(html).toContain('Sandwich Rule');
    expect(html).toContain('Documentation &amp; Eligibility');
  });

  it('renders nothing when isOpen is false', () => {
    const html = renderToStaticMarkup(
      <LeaveTypeDrawer
        isOpen={false}
        onClose={() => {}}
        onSaved={() => {}}
        saveFn={() => Promise.resolve({} as never)}
      />,
    );

    expect(html).toBe('');
  });
});
