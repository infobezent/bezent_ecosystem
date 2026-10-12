import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { GeneralTab } from '../attendance/tabs/GeneralTab';
import type { AttendanceGeneralSettings } from '../../attendance/types/attendance.types';

const mockSettings: Partial<AttendanceGeneralSettings> = {
  timezone: 'UTC',
  dayBoundaryMode: 'shift_workday_based',
  unscheduledFallbackCutoff: '04:00:00',
  trackingStartDate: '2026-01-01',
  processingMode: 'automatic',
  employeeVisibility: 'daily_and_monthly',
  defaultHistoryView: 'current_month',
  defaultHistoryViewDays: 30,
  manualEntryAllowed: true,
  manualEntryConfig: {
    allowedRoles: ['hr', 'reporting_manager'],
    allowedMethods: ['actual_times', 'full_day_admin'],
    approvalMode: 'approval_required',
    requireReason: true,
    requireAttachment: false,
  },
  alertSettings: {
    events: {},
    timing: { digestFrequency: 'daily' },
    escalation: { enabled: false },
  },
};

describe('Manual Attendance Entry UI/UX Refinement', () => {
  it('1. Header row renders edit icon, label, info tooltip, and enable switch', () => {
    const html = renderToStaticMarkup(<GeneralTab initialSettings={mockSettings} />);

    // Header label
    expect(html).toContain('Manual Attendance Entry');

    // Tooltip info text
    expect(html).toContain(
      'Permits authorized administrative actors to record manual attendance entries subject to RBAC and audit logging.',
    );

    // Enabled switch
    expect(html).toContain('role="switch"');
    expect(html).toContain('aria-checked="true"');
  });

  it('2. Nested uppercase container and header are completely removed', () => {
    const html = renderToStaticMarkup(<GeneralTab initialSettings={mockSettings} />);

    // Uppercase header removed
    expect(html).not.toContain('MANUAL ENTRY PERMISSIONS');
    expect(html).not.toContain('Manual Entry Permissions');
  });

  it('3. First Configuration Row renders balanced 2-column layout with Authorized Roles and Allowed Entry Methods', () => {
    const html = renderToStaticMarkup(<GeneralTab initialSettings={mockSettings} />);

    // Titles
    expect(html).toContain('Authorized Roles');
    expect(html).toContain('Allowed Entry Methods');

    // Tooltips on group titles
    expect(html).toContain('User roles authorized to record manual attendance entries');
    expect(html).toContain('Permitted methods for manual attendance entries and credits');

    // Authorized Roles checkboxes
    expect(html).toContain('HR Operations');
    expect(html).toContain('Reporting Manager');
    expect(html).toContain('Company Admin');

    // Allowed Entry Methods checkboxes
    expect(html).toContain('Actual Times (In/Out Punches)');
    expect(html).toContain('Full Day Present Credit');
    expect(html).toContain('Half Day Credit');

    // Grid layout primitive
    expect(html).toContain('bezent-grid--cols-2');
  });

  it('4. Second Configuration Row renders 3-column layout with Approval Mode, Justification, and Attachment toggles', () => {
    const html = renderToStaticMarkup(<GeneralTab initialSettings={mockSettings} />);

    // Group titles
    expect(html).toContain('Approval Mode');
    expect(html).toContain('Require Justification Reason');
    expect(html).toContain('Require Supporting Attachment');

    // Approval Mode dropdown options
    expect(html).toContain('Approval Required');
    expect(html).toContain('Direct Finalization');

    // Grid layout primitive with 3 columns
    expect(html).toContain('bezent-grid--cols-3');
  });

  it('5. Collapses configuration section when manualEntryAllowed is false', () => {
    const disabledSettings: Partial<AttendanceGeneralSettings> = {
      ...mockSettings,
      manualEntryAllowed: false,
    };
    const html = renderToStaticMarkup(<GeneralTab initialSettings={disabledSettings} />);

    // Parent header row is still visible
    expect(html).toContain('Manual Attendance Entry');

    // Configuration fields are collapsed
    expect(html).not.toContain('Authorized Roles');
    expect(html).not.toContain('Allowed Entry Methods');
    expect(html).not.toContain('Approval Mode');
    expect(html).not.toContain('Require Justification Reason');
    expect(html).not.toContain('Require Supporting Attachment');
  });

  it('6. Subtle Dividers separate rows with minimal visual weight', () => {
    const html = renderToStaticMarkup(<GeneralTab initialSettings={mockSettings} />);

    // Dividers are present between the header and config rows
    expect(html).toContain('bezent-divider');
  });
});
