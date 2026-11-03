import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { LeavePoliciesTab } from '../LeavePoliciesTab';
import { DEFAULT_LEAVE_POLICIES_RESPONSE } from './fixtures/leavePolicies.fixture';
import { LeavePolicyDrawer } from '../LeavePolicyDrawer';
import { DEFAULT_LEAVE_TYPES_RESPONSE } from './fixtures/leaveTypes.fixture';
import type { LeavePolicyItem } from '../types/leavePolicies.types';

describe('LeavePoliciesTab UI Component — Unit & Render Tests', () => {
  it('renders header, subtitle, and primary action button', () => {
    const html = renderToStaticMarkup(
      <LeavePoliciesTab initialData={DEFAULT_LEAVE_POLICIES_RESPONSE} />,
    );

    expect(html).toContain('Leave Policies');
    expect(html).toContain('Define and manage leave rules for your workforce.');
    expect(html).toContain('Create Policy');
  });

  it('renders dynamic summary indicator cards', () => {
    const html = renderToStaticMarkup(
      <LeavePoliciesTab initialData={DEFAULT_LEAVE_POLICIES_RESPONSE} />,
    );

    expect(html).toContain('Total Policies');
    expect(html).toContain('Active Policies');
    expect(html).toContain('Draft Policies');
    expect(html).toContain('Scheduled Policies');
    expect(html).toContain('2');
  });

  it('renders search bar and status/scope filter dropdowns', () => {
    const html = renderToStaticMarkup(
      <LeavePoliciesTab initialData={DEFAULT_LEAVE_POLICIES_RESPONSE} />,
    );

    expect(html).toContain('Search by policy name or code...');
    expect(html).toContain('All Statuses');
    expect(html).toContain('All Scopes');
  });

  it('renders leave policies table with code badges, scopes, effective periods, and status', () => {
    const html = renderToStaticMarkup(
      <LeavePoliciesTab initialData={DEFAULT_LEAVE_POLICIES_RESPONSE} />,
    );

    expect(html).toContain('Standard Corporate Leave Policy');
    expect(html).toContain('POL_CORP');
    expect(html).toContain('Engineering On-Site Policy');
    expect(html).toContain('POL_ENG');
    expect(html).toContain('Company-wide');
    expect(html).toContain('Engineering');
    expect(html).toContain('2026-01-01');
    expect(html).toContain('ACTIVE');
  });

  it('renders row actions (View, Edit, Archive)', () => {
    const html = renderToStaticMarkup(
      <LeavePoliciesTab initialData={DEFAULT_LEAVE_POLICIES_RESPONSE} />,
    );

    expect(html).toContain('View');
    expect(html).toContain('Edit');
    expect(html).toContain('Archive');
  });

  it('respects canManage=false by omitting management actions while preserving View', () => {
    const html = renderToStaticMarkup(
      <LeavePoliciesTab initialData={DEFAULT_LEAVE_POLICIES_RESPONSE} canManage={false} />,
    );

    expect(html).toContain('View');
    expect(html).not.toContain('>Edit<');
    expect(html).not.toContain('>Archive<');
    expect(html).not.toContain('>Create Policy<');
  });

  it('renders empty state when items list is empty and no active filters', () => {
    const emptyResponse = {
      items: [],
      total: 0,
      page: 1,
      limit: 10,
      totalPages: 1,
      summary: {
        total: 0,
        active: 0,
        draft: 0,
        scheduled: 0,
        archived: 0,
        employeesWithoutPolicy: 0,
      },
    };

    const html = renderToStaticMarkup(<LeavePoliciesTab initialData={emptyResponse} />);
    expect(html).toContain('No Leave Policies Configured');
    expect(html).toContain('Create Policy');
  });
});

describe('LeavePolicyDrawer Component — Render Tests', () => {
  it('renders drawer in create mode with all sections and fields', () => {
    const html = renderToStaticMarkup(
      <LeavePolicyDrawer
        isOpen={true}
        mode="create"
        onClose={() => {}}
        onSaved={() => {}}
        saveFn={() => Promise.resolve({} as never)}
      />,
    );

    expect(html).toContain('Create Leave Policy');
    expect(html).toContain('Basic Information');
    expect(html).toContain('Policy Name');
    expect(html).toContain('Policy Code');
    expect(html).toContain('Applicability');
    expect(html).toContain('Organizational Scope');
    expect(html).toContain('Entitlements');
    expect(html).toContain('Priority');
    expect(html).not.toContain('Custom Eligibility');
    expect(html).not.toContain('Scope Identifier / Group Name');
    expect(html).toContain('Policy Summary');
    expect(html).toContain('Cancel');
  });

  it('renders drawer in edit mode with existing item', () => {
    const sampleItem = DEFAULT_LEAVE_POLICIES_RESPONSE.items[0]!;
    const html = renderToStaticMarkup(
      <LeavePolicyDrawer
        isOpen={true}
        mode="edit"
        initialData={sampleItem}
        onClose={() => {}}
        onSaved={() => {}}
        saveFn={() => Promise.resolve({} as never)}
      />,
    );

    expect(html).toContain('Edit Leave Policy');
    expect(html).toContain('Standard Corporate Leave Policy');
    expect(html).toContain('POL_CORP');
    expect(html).toContain('Save Changes');
  });

  it('renders drawer in view mode with read-only details and Edit button', () => {
    const sampleItem = DEFAULT_LEAVE_POLICIES_RESPONSE.items[0]!;
    const html = renderToStaticMarkup(
      <LeavePolicyDrawer
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

    expect(html).toContain('Standard Corporate Leave Policy');
    expect(html).toContain('Policy Code: POL_CORP');
    expect(html).toContain('Close');
    expect(html).toContain('Edit Policy');
    expect(html).toContain('Basic Information');
    expect(html).toContain('Entitlements (');
    expect(html).toContain('day(s) per year');
  });

  it('renders nothing when isOpen is false', () => {
    const html = renderToStaticMarkup(
      <LeavePolicyDrawer
        isOpen={false}
        onClose={() => {}}
        onSaved={() => {}}
        saveFn={() => Promise.resolve({} as never)}
      />,
    );

    expect(html).toBe('');
  });
});

describe('LeavePoliciesTab — P1 lifecycle & entitlements', () => {
  const base = DEFAULT_LEAVE_POLICIES_RESPONSE;
  const leaveType = {
    ...DEFAULT_LEAVE_TYPES_RESPONSE.items[0]!,
    id: 'lvt_1',
    name: 'Annual Leave',
    isActive: true,
    isTracked: true,
  };

  it('warns when active employees have no policy in force', () => {
    const html = renderToStaticMarkup(
      <LeavePoliciesTab
        initialData={{ ...base, summary: { ...base.summary, employeesWithoutPolicy: 3 } }}
        initialLeaveTypes={[]}
        initialScopeOptions={{ departments: [], locations: [] }}
      />,
    );
    expect(html).toContain('Employees without a leave policy');
    expect(html).toContain('3 active employees have no leave policy');
  });

  it('offers no edit or lifecycle action for archived policies, and Activate for drafts', () => {
    const [first, second] = base.items as [LeavePolicyItem, LeavePolicyItem];
    const html = renderToStaticMarkup(
      <LeavePoliciesTab
        initialData={{
          ...base,
          items: [
            { ...first, status: 'archived' },
            { ...second, status: 'draft' },
          ],
        }}
        initialLeaveTypes={[]}
        initialScopeOptions={{ departments: [], locations: [] }}
      />,
    );
    expect(html).toContain('>Activate<');
    expect(html).not.toContain('>Archive<');
    // Only the draft row can be edited.
    expect(html.match(/>Edit</g)).toHaveLength(1);
  });

  it('shows an annual quota input for each linked leave type in edit mode', () => {
    const policy: LeavePolicyItem = {
      ...base.items[0]!,
      entitlements: [
        {
          leaveTypeId: 'lvt_1',
          leaveTypeName: 'Annual Leave',
          leaveTypeCode: 'AL',
          isTracked: true,
          annualQuota: 18,
          maxPerYearOverride: null,
        },
      ],
    };
    const html = renderToStaticMarkup(
      <LeavePolicyDrawer
        isOpen={true}
        mode="edit"
        initialData={policy}
        availableLeaveTypes={[leaveType]}
        scopeOptions={{ departments: [{ id: 'd1', name: 'Engineering' }], locations: [] }}
        onClose={() => {}}
        onSaved={() => {}}
        saveFn={() => Promise.resolve({} as never)}
      />,
    );
    expect(html).toContain('Annual Quota (Days)');
    expect(html).toContain('value="18"');
  });

  it('offers department choices from scope options instead of free text', () => {
    const policy: LeavePolicyItem = { ...base.items[1]!, scope: 'department', scopeId: 'd1' };
    const html = renderToStaticMarkup(
      <LeavePolicyDrawer
        isOpen={true}
        mode="edit"
        initialData={policy}
        availableLeaveTypes={[]}
        scopeOptions={{ departments: [{ id: 'd1', name: 'Engineering' }], locations: [] }}
        onClose={() => {}}
        onSaved={() => {}}
        saveFn={() => Promise.resolve({} as never)}
      />,
    );
    expect(html).toContain('<option value="d1" selected="">Engineering</option>');
  });
});
