import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import {
  PromotionsKpiCard,
  type PromotionTypeItem,
  type CareerProgressionItem,
} from '../components/PromotionsKpiCard';

describe('PromotionsKpiCard – Ascending Career Steps Design', () => {
  it('renders Left Section with Promotions heading and total value', () => {
    const html = renderToStaticMarkup(<PromotionsKpiCard total={12} />);

    expect(html).toContain('bezent-kpi-promotions-heading');
    expect(html).toContain('Promotions');
    expect(html).toContain('bezent-kpi-promotions-value');
    expect(html).toContain('12');
  });

  it('strictly avoids permanent category descriptions, legends, or footer labels', () => {
    const html = renderToStaticMarkup(<PromotionsKpiCard total={12} pendingApproval={4} />);

    expect(html).not.toContain('bezent-kpi-promotions-footer');
    expect(html).not.toContain('bezent-kpi-promotions-meta-row');
    expect(html).not.toContain('bezent-kpi-promotions-label');
  });

  it('renders right section with ascending steps visual and upward arrow', () => {
    const html = renderToStaticMarkup(<PromotionsKpiCard total={12} />);

    expect(html).toContain('bezent-kpi-promotions-right');
    expect(html).toContain('bezent-kpi-promotions-svg');
    expect(html).toContain('bezent-kpi-promotion-step');
    expect(html).toContain('bezent-kpi-promotions-arrow-group');
    expect(html).toContain('bezent-kpi-promotions-baseline');
  });

  it('renders all four promotion steps with accessible labels', () => {
    const html = renderToStaticMarkup(<PromotionsKpiCard total={12} />);

    expect(html).toContain('bezent-kpi-promotion-step--designation');
    expect(html).toContain('Designation Change: 4 promotions');

    expect(html).toContain('bezent-kpi-promotion-step--grade');
    expect(html).toContain('Salary Grade Change: 3 promotions');

    expect(html).toContain('bezent-kpi-promotion-step--level');
    expect(html).toContain('Job Level Change: 3 promotions');

    expect(html).toContain('bezent-kpi-promotion-step--department');
    expect(html).toContain('Department-based Promotion: 2 promotions');
  });

  it('displays promotion details in floating tooltip when a step is hovered', () => {
    const html = renderToStaticMarkup(<PromotionsKpiCard total={12} hoveredNode="designation" />);

    expect(html).toContain('bezent-kpi-promotion-tooltip is-visible');
    expect(html).toContain('Designation Change: 4 promotions');
    expect(html).toContain('bezent-kpi-promotion-step--designation');
    expect(html).toContain('is-hovered');
  });

  it('displays career progression in floating tooltip when upward arrow is hovered', () => {
    const progression: CareerProgressionItem = {
      fromRole: 'Product Designer',
      toRole: 'Lead Designer',
    };

    const html = renderToStaticMarkup(
      <PromotionsKpiCard total={15} progression={progression} hoveredNode="arrow" />,
    );

    expect(html).toContain('bezent-kpi-promotion-tooltip is-visible');
    expect(html).toContain('Career Progression: Product Designer → Lead Designer');
    expect(html).toContain('bezent-kpi-promotions-arrow-group is-hovered');
  });

  it('renders loading state cleanly when loading is true', () => {
    const html = renderToStaticMarkup(<PromotionsKpiCard loading={true} />);

    expect(html).toContain('bezent-kpi-value-skeleton');
    expect(html).toContain('bezent-kpi-pill-skeleton');
    expect(html).toContain('Promotions');
  });

  it('handles custom promotion categories and counts dynamically', () => {
    const customTypes: PromotionTypeItem[] = [
      { id: 'designation', label: 'Principal Architect', count: 5, colorClass: 'designation' },
      { id: 'grade', label: 'Executive Band', count: 3, colorClass: 'grade' },
    ];

    const html = renderToStaticMarkup(
      <PromotionsKpiCard total={8} promotionTypes={customTypes} hoveredNode="designation" />,
    );

    expect(html).toContain('8');
    expect(html).toContain('Principal Architect: 5 promotions');
  });

  it('handles zero total gracefully without crashing or invalid geometry', () => {
    const html = renderToStaticMarkup(<PromotionsKpiCard total={0} />);

    expect(html).toContain('0');
  });
});
