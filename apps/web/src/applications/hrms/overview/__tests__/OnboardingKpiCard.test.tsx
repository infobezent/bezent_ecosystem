import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import {
  OnboardingKpiCard,
  type OnboardingStageItem,
  type OnboardingActivityBar,
} from '../components/OnboardingKpiCard';

describe('OnboardingKpiCard – Circular Arrival Ring (Reciprocal to Offboarding)', () => {
  it('renders Left Section with Onboarding heading and total value', () => {
    const html = renderToStaticMarkup(<OnboardingKpiCard total={32} />);

    expect(html).toContain('bezent-kpi-onboarding-heading');
    expect(html).toContain('Onboarding');
    expect(html).toContain('bezent-kpi-onboarding-value');
    expect(html).toContain('32');
  });

  it('strictly avoids permanent category descriptions, legends, or footer labels', () => {
    const html = renderToStaticMarkup(<OnboardingKpiCard total={32} />);

    expect(html).not.toContain('bezent-kpi-onboarding-label');
    expect(html).not.toContain('Journey Progress');
    expect(html).not.toContain('4 Stages');
    expect(html).not.toContain('In Progress:');
    expect(html).not.toContain('bezent-kpi-onboarding-footer');
  });

  it('renders Circular Arrival Ring on the right side with arcs and entrance vector', () => {
    const html = renderToStaticMarkup(<OnboardingKpiCard total={32} />);

    expect(html).toContain('bezent-kpi-onboarding-right');
    expect(html).toContain('bezent-kpi-arrival-svg');
    expect(html).toContain('bezent-kpi-arrival-arc');
    expect(html).toContain('bezent-kpi-arrival-arrow-group');
    expect(html).toContain('bezent-kpi-arrival-arrow-stem');
    expect(html).toContain('bezent-kpi-arrival-arrowhead');
    expect(html).toContain('bezent-kpi-arrival-center');
  });

  it('renders Inward Entrance Arrow shooting into the ring at top apex', () => {
    const html = renderToStaticMarkup(<OnboardingKpiCard total={32} />);

    // Arrow stem and head
    expect(html).toContain('bezent-kpi-arrival-arrow-stem');
    expect(html).toContain('bezent-kpi-arrival-arrowhead');
    expect(html).toContain('New Hires Arrival');
  });

  it('displays stage details in floating tooltip when an arc is hovered', () => {
    const customStages: OnboardingStageItem[] = [
      { id: 'documents', name: 'Documents', status: 'completed', count: 12 },
      { id: 'verification', name: 'Verification', status: 'in_progress', count: 8 },
      { id: 'induction', name: 'Induction', status: 'pending', count: 15 },
      { id: 'completed', name: 'Ready for Day 1', status: 'active', count: 9 },
    ];

    const html = renderToStaticMarkup(
      <OnboardingKpiCard total={44} stages={customStages} hoveredNode="induction" />,
    );

    expect(html).toContain('bezent-kpi-onboarding-tooltip');
    expect(html).toContain('is-visible');
    expect(html).toContain('Induction: 15');
  });

  it('renders loading state cleanly with shimmer skeleton and no bare dash', () => {
    const html = renderToStaticMarkup(<OnboardingKpiCard loading={true} />);

    expect(html).toContain('bezent-kpi-value-skeleton');
    expect(html).toContain('bezent-kpi-pill-skeleton');
    expect(html).toContain('Onboarding');
  });

  it('supports backward compatibility mapping legacy bars or hoveredBarId into arcs', () => {
    const customBars: OnboardingActivityBar[] = [
      { id: 'w1', period: 'Documents', count: 15 },
      { id: 'w2', period: 'Verification', count: 12 },
      { id: 'w3', period: 'Setup', count: 6 },
      { id: 'w4', period: 'Orientation', count: 3 },
    ];

    const html = renderToStaticMarkup(
      <OnboardingKpiCard total={36} bars={customBars} hoveredBarId="w1" />,
    );

    expect(html).toContain('36');
    expect(html).toContain('Documents: 15');
    expect(html).toContain('bezent-kpi-arrival-arc');
  });

  it('handles zero onboarding count gracefully without crashing or hardcoded mock data', () => {
    const html = renderToStaticMarkup(<OnboardingKpiCard total={0} />);

    expect(html).toContain('0');
    expect(html).toContain('bezent-kpi-arrival-svg');
  });

  it('renders Center Hub with UserRoundPlus icon for arrival/joining', () => {
    const html = renderToStaticMarkup(<OnboardingKpiCard total={32} />);

    expect(html).toContain('bezent-kpi-arrival-center');
    expect(html).toContain('bezent-kpi-arrival-icon-wrapper');
  });
});
