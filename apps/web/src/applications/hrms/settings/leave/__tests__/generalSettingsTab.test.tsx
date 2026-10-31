import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { GeneralSettingsTab } from '../GeneralSettingsTab';
import type {
  LeaveGeneralSettingsResponse,
  LeaveGeneralSettingsVersion,
} from '../types/settings.types';

describe('GeneralSettingsTab UI Component — Unit & Render Tests', () => {
  const mockResponse: LeaveGeneralSettingsResponse = {
    settings: {
      id: 'lvgs_1',
      tenantId: 'tenant_1',
      companyId: 'comp_1',
      leaveYearCycle: 'calendar_year',
      customYearStartDate: null,
      goLiveDate: '2026-11-01',
      dayCountingMethod: 'working_days',
      balancePrecision: 'two_decimals',
      balanceRoundingRule: 'nearest',
      maxBackdatedDays: 7,
      maxAdvanceBookingDays: 180,
      currentVersionNumber: 1,
      status: 'pre_activation',
      createdAt: '2026-10-01T00:00:00Z',
      updatedAt: '2026-10-01T00:00:00Z',
    },
    activeVersion: {
      id: 'lvgv_1',
      versionNumber: 1,
      effectiveFrom: '2026-10-01T00:00:00Z',
      changeReason: 'Initial setup',
      settingsPayload: {
        leaveYearCycle: 'calendar_year',
        customYearStartDate: null,
        goLiveDate: '2026-11-01',
        dayCountingMethod: 'working_days',
        balancePrecision: 'two_decimals',
        balanceRoundingRule: 'nearest',
        maxBackdatedDays: 7,
        maxAdvanceBookingDays: 180,
      },
      createdByUserId: 'usr_admin',
      createdAt: '2026-10-01T00:00:00Z',
    },
    latestPublishedVersion: null,
    hasScheduledFutureVersion: false,
  };

  const mockVersions: LeaveGeneralSettingsVersion[] = [mockResponse.activeVersion!];

  it('renders loading spinner when no initialData is passed', () => {
    const html = renderToStaticMarkup(<GeneralSettingsTab />);
    expect(html).toContain('Loading Leave General Settings...');
  });

  it('renders all 5 cards when provided with initial settings data', () => {
    const html = renderToStaticMarkup(
      <GeneralSettingsTab initialData={mockResponse} initialVersions={mockVersions} />,
    );

    expect(html).toContain('1. Operational Calendar Boundaries');
    expect(html).toContain('2. Schedule Deductions &amp; Day Counting');
    expect(html).toContain('3. Display Precision &amp; Accrual Rounding');
    expect(html).toContain('4. Application Windows &amp; Operational Boundaries');
    expect(html).toContain('5. Version History &amp; Audit Trail');
  });

  it('displays pre-activation badge in draft mode', () => {
    const html = renderToStaticMarkup(
      <GeneralSettingsTab initialData={mockResponse} initialVersions={mockVersions} />,
    );

    expect(html).toContain('Pre-Activation (Draft Mode)');
    expect(html).toContain('Active Version: v1');
  });

  it('displays locked badges when company status is activated', () => {
    const activatedResponse: LeaveGeneralSettingsResponse = {
      ...mockResponse,
      settings: {
        ...mockResponse.settings,
        status: 'activated',
      },
    };

    const html = renderToStaticMarkup(
      <GeneralSettingsTab initialData={activatedResponse} initialVersions={mockVersions} />,
    );

    expect(html).toContain('Company Activated (Locked Cycle)');
    expect(html).toContain('disabled=""');
  });

  it('renders version history table with snapshot payload data', () => {
    const html = renderToStaticMarkup(
      <GeneralSettingsTab initialData={mockResponse} initialVersions={mockVersions} />,
    );

    expect(html).toContain('Initial setup');
    expect(html).toContain('usr_admin');
    expect(html).toContain('Calendar Year');
    expect(html).toContain('Working Days');
  });

  it('renders Day Counting Method as 2 selectable cards with active state indicator', () => {
    const html = renderToStaticMarkup(
      <GeneralSettingsTab initialData={mockResponse} initialVersions={mockVersions} />,
    );

    expect(html).toContain('role="radiogroup"');
    expect(html).toContain('Working Days');
    expect(html).toContain('Excludes scheduled Weekly Offs and declared Public Holidays.');
    expect(html).toContain('Calendar Days');
    expect(html).toContain('Deducts every calendar day in range regardless of schedule.');
    expect(html).toContain('aria-checked="true"');
    expect(html).toContain('Selected');
  });
});
