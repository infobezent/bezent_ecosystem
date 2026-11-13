import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import {
  OffboardingKpiCard,
  type ExitProcessStageItem,
} from '../components/OffboardingKpiCard';

describe('OffboardingKpiCard – Circular Departure Ring Design (Option A)', () => {
  it('renders Left Section with Offboarding heading and total value', () => {
    const html = renderToStaticMarkup(<OffboardingKpiCard total={15} />);

    expect(html).toContain('bezent-kpi-offboarding-heading');
    expect(html).toContain('Offboarding');
    expect(html).toContain('bezent-kpi-offboarding-value');
    expect(html).toContain('15');
  });

  it('strictly avoids permanent category descriptions, legends, or footer labels', () => {
    const html = renderToStaticMarkup(<OffboardingKpiCard total={15} pendingClearance={3} />);

    expect(html).not.toContain('bezent-kpi-offboarding-footer');
    expect(html).not.toContain('bezent-kpi-offboarding-meta-row');
    expect(html).not.toContain('bezent-kpi-offboarding-label');
  });

  it('renders right section with Circular Departure Ring, departure arrow, and dynamic center icon', () => {
    const html = renderToStaticMarkup(<OffboardingKpiCard total={15} />);

    expect(html).toContain('bezent-kpi-offboarding-right');
    expect(html).toContain('bezent-kpi-departure-svg');
    expect(html).toContain('bezent-kpi-departure-arc');
    expect(html).toContain('bezent-kpi-departure-arrow-group');
    expect(html).toContain('bezent-kpi-departure-center');
  });

  it('renders all four exit process stages with accessible labels', () => {
    const html = renderToStaticMarkup(<OffboardingKpiCard total={15} />);

    expect(html).toContain('Notice Period: Active, 5 employees');
    expect(html).toContain('Handover: Completed, 4 employees');
    expect(html).toContain('Clearance: In Progress, 3 employees');
    expect(html).toContain('Final Settlement: Pending, 3 employees');
  });

  it('displays stage details in floating tooltip when an arc is hovered', () => {
    const html = renderToStaticMarkup(
      <OffboardingKpiCard total={15} hoveredNode="clearance" />,
    );

    expect(html).toContain('bezent-kpi-offboarding-tooltip is-visible');
    expect(html).toContain('Clearance: In Progress, 3 employees');
    expect(html).toContain('bezent-kpi-offboarding-node--clearance');
    expect(html).toContain('is-hovered');
  });

  it('displays pending exit clearance in floating tooltip when departure arrow is hovered', () => {
    const html = renderToStaticMarkup(
      <OffboardingKpiCard total={15} pendingClearance={3} hoveredNode="arrow" />,
    );

    expect(html).toContain('bezent-kpi-offboarding-tooltip is-visible');
    expect(html).toContain('Pending Exit Clearance: 3');
    expect(html).toContain('bezent-kpi-departure-arrow-group');
    expect(html).toContain('is-hovered');
  });

  it('renders loading state cleanly when loading is true', () => {
    const html = renderToStaticMarkup(<OffboardingKpiCard loading={true} />);

    expect(html).toContain('bezent-kpi-value-skeleton');
    expect(html).toContain('bezent-kpi-pill-skeleton');
    expect(html).toContain('Offboarding');
  });

  it('supports custom exit process stages and calculates total dynamically', () => {
    const customStages: ExitProcessStageItem[] = [
      { id: 'notice_period', name: 'Notice Period', status: 'completed', count: 8 },
      { id: 'handover', name: 'Handover', status: 'completed', count: 6 },
      { id: 'clearance', name: 'Clearance', status: 'in_progress', count: 4 },
      { id: 'final_settlement', name: 'Final Settlement', status: 'pending', count: 2 },
    ];

    const html = renderToStaticMarkup(
      <OffboardingKpiCard stages={customStages} pendingClearance={4} hoveredNode="notice_period" />,
    );

    expect(html).toContain('20');
    expect(html).toContain('Notice Period: Completed, 8 employees');
  });

  it('handles zero total gracefully without crashing or invalid geometry', () => {
    const html = renderToStaticMarkup(<OffboardingKpiCard total={0} />);

    expect(html).toContain('0');
  });
});
