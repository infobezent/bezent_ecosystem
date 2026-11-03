import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { HolidaysTab } from '../HolidaysTab';
import { ApprovalWorkflowTab } from '../ApprovalWorkflowTab';
import { RestrictionsTab } from '../RestrictionsTab';
import { AccrualTab } from '../AccrualTab';
import { LeaveSettingsSection } from '../LeaveSettingsSection';
import { AuthProvider } from '../../../../../platform/auth';
import type {
  AccrualRuleRow,
  ApprovalWorkflowItem,
  HolidayCalendarItem,
  RestrictionRuleItem,
} from '../types/leaveAdmin.types';

const calendar: HolidayCalendarItem = {
  id: 'hcal_1',
  name: 'Company Holidays',
  year: 2026,
  status: 'published',
  isDefault: true,
  optionalHolidayQuota: 2,
  revision: 1,
  publishedAt: '2026-01-01T00:00:00Z',
  holidayCount: 6,
  locationIds: [],
  cycleStart: '2026-01-01',
  cycleEnd: '2026-12-31',
};

const workflow: ApprovalWorkflowItem = {
  id: 'lvwf_1',
  name: 'Standard Approval',
  description: 'Default single-level approval by the reporting manager.',
  isDefault: true,
  isActive: true,
  levels: [
    {
      approverType: 'reporting_manager',
      approverRef: null,
      slaHours: 48,
      onSlaBreach: 'notify_only',
    },
  ],
  autoApproveUpToDays: 0.5,
  skipIfApproverIsApplicant: true,
  fallbackApproverRoleId: null,
  cancellationRequiresApproval: false,
  allowSelfApprovalForHr: false,
  leaveTypeCount: 0,
};

const rule: RestrictionRuleItem = {
  id: 'lrr_1',
  ruleKey: 'lrk_1',
  version: 2,
  ruleType: 'blackout',
  name: 'Year-end freeze',
  config: {
    startDate: '2026-12-20',
    endDate: '2026-12-31',
    scope: 'company',
    scopeId: null,
    leaveTypeIds: [],
  },
  isActive: true,
  createdAt: '2026-10-01T00:00:00Z',
};

const accrualRow: AccrualRuleRow = {
  leaveType: {
    id: 'lvt_al',
    name: 'Annual Leave',
    code: 'AL',
    isTracked: true,
    category: 'paid',
    isActive: true,
  },
  current: {
    id: 'lacr_1',
    leaveTypeId: 'lvt_al',
    effectiveFrom: '2026-01-01',
    grantMethod: 'monthly',
    accrualTiming: 'period_start',
    proRataOnJoining: true,
    joiningCutoffDay: 15,
    proRataOnExit: true,
    accrueDuringProbation: true,
    backcreditAfterProbation: false,
    accrueDuringLop: true,
    carryForwardEnabled: true,
    maxCarryForwardDays: 5,
    maxAccumulationDays: null,
    carryForwardExpiryMonths: 3,
    lapseRemaining: true,
    encashmentEnabled: false,
    encashmentTrigger: 'cycle_end',
    minBalanceToRetain: 0,
    maxEncashableDays: null,
    encashmentBasis: 'basic',
    isDefault: false,
  },
  scheduled: [],
  history: [],
};

describe('Leave settings — Tabs 4 to 7', () => {
  it('section lists all seven tabs', () => {
    const html = renderToStaticMarkup(
      <AuthProvider>
        <LeaveSettingsSection />
      </AuthProvider>,
    );
    for (const label of [
      'General Settings',
      'Leave Types',
      'Leave Policies',
      'Accrual &amp; Carry Forward',
      'Restrictions',
      'Holidays',
      'Approval Workflow',
    ]) {
      expect(html).toContain(label);
    }
  });

  it('Holidays tab lists calendars with status, default badge and optional quota', () => {
    const html = renderToStaticMarkup(<HolidaysTab initialCalendars={[calendar]} />);
    expect(html).toContain('Company Holidays');
    expect(html).toContain('Published · rev 1');
    expect(html).toContain('Default');
    expect(html).toContain('2 optional allowed');
    expect(html).toContain('Create Calendar');
  });

  it('Holidays tab hides management actions for read-only users', () => {
    const html = renderToStaticMarkup(
      <HolidaysTab initialCalendars={[calendar]} canManage={false} />,
    );
    expect(html).not.toContain('Create Calendar');
    expect(html).toContain('>View<');
  });

  it('Approval Workflow tab shows levels, SLA and auto-approval', () => {
    const html = renderToStaticMarkup(<ApprovalWorkflowTab initialWorkflows={[workflow]} />);
    expect(html).toContain('Standard Approval');
    expect(html).toContain('Reporting manager · 48h');
    expect(html).toContain('Up to 0.5 day(s)');
    expect(html).toContain('Pending Approvals');
  });

  it('Restrictions tab summarises rules with their version', () => {
    const html = renderToStaticMarkup(<RestrictionsTab initialRules={[rule]} />);
    expect(html).toContain('Year-end freeze');
    expect(html).toContain('Version 2');
    expect(html).toContain('2026-12-20 to 2026-12-31');
    expect(html).toContain('all types');
  });

  it('Accrual tab shows grant method, carry forward cap and expiry, and year-end processing', () => {
    const html = renderToStaticMarkup(<AccrualTab initialRows={[accrualRow]} />);
    expect(html).toContain('Annual Leave');
    expect(html).toContain('Monthly');
    expect(html).toContain('Up to 5 day(s)');
    expect(html).toContain('Expires after 3 month(s)');
    expect(html).toContain('Year-End Processing');
  });
});
