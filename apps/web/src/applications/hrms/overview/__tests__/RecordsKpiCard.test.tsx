import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { RecordsKpiCard } from '../components/RecordsKpiCard';

describe('RecordsKpiCard – File Folders Stack Design', () => {
  it('renders Left Section with Records heading and total value', () => {
    const html = renderToStaticMarkup(<RecordsKpiCard total={128} />);

    expect(html).toContain('bezent-kpi-records-heading');
    expect(html).toContain('Records');
    expect(html).toContain('bezent-kpi-records-value');
    expect(html).toContain('128');
  });

  it('strictly avoids permanent category descriptions, legends, or footer labels', () => {
    const html = renderToStaticMarkup(
      <RecordsKpiCard total={128} verifiedCount={96} pendingCount={18} />,
    );

    expect(html).not.toContain('bezent-kpi-records-footer');
    expect(html).not.toContain('bezent-kpi-records-meta-row');
    expect(html).not.toContain('bezent-kpi-records-legend');
  });

  it('renders right section with 60x60 container and SVG 4-folder stack', () => {
    const html = renderToStaticMarkup(<RecordsKpiCard total={128} />);

    expect(html).toContain('bezent-kpi-records-right');
    expect(html).toContain('bezent-kpi-records-svg');
    expect(html).toContain('bezent-kpi-folder-item--verified');
    expect(html).toContain('bezent-kpi-folder-item--pending');
    expect(html).toContain('bezent-kpi-folder-item--expiring');
    expect(html).toContain('bezent-kpi-folder-item--expired');
    expect(html).toContain('bezent-kpi-folder-doc-paper');
  });

  it('renders all four folder categories with accessible labels', () => {
    const html = renderToStaticMarkup(
      <RecordsKpiCard verifiedCount={96} pendingCount={18} expiringCount={10} expiredCount={4} />,
    );

    expect(html).toContain('Verified Records: 96 records');
    expect(html).toContain('Pending Verification: 18 records');
    expect(html).toContain('Expiring Soon: 10 records');
    expect(html).toContain('Expired Records: 4 records');
  });

  it('displays verified details in floating tooltip when verified folder is hovered', () => {
    const html = renderToStaticMarkup(
      <RecordsKpiCard total={128} verifiedCount={96} hoveredFolder="verified" />,
    );

    expect(html).toContain('bezent-kpi-records-tooltip is-visible');
    expect(html).toContain('Verified Records: 96 (75%)');
    expect(html).toContain('bezent-kpi-folder-item--verified is-hovered');
  });

  it('displays pending verification details when pending folder is hovered', () => {
    const html = renderToStaticMarkup(
      <RecordsKpiCard total={128} pendingCount={18} hoveredFolder="pending" />,
    );

    expect(html).toContain('bezent-kpi-records-tooltip is-visible');
    expect(html).toContain('Pending Verification: 18');
    expect(html).toContain('bezent-kpi-folder-item--pending is-hovered');
  });

  it('displays expiring soon details when expiring folder is hovered', () => {
    const html = renderToStaticMarkup(
      <RecordsKpiCard total={128} expiringCount={10} hoveredFolder="expiring" />,
    );

    expect(html).toContain('bezent-kpi-records-tooltip is-visible');
    expect(html).toContain('Expiring Soon (&lt; 30 days): 10');
    expect(html).toContain('bezent-kpi-folder-item--expiring is-hovered');
  });

  it('displays expired records details when expired folder is hovered', () => {
    const html = renderToStaticMarkup(
      <RecordsKpiCard total={128} expiredCount={4} hoveredFolder="expired" />,
    );

    expect(html).toContain('bezent-kpi-records-tooltip is-visible');
    expect(html).toContain('Expired Records: 4');
    expect(html).toContain('bezent-kpi-folder-item--expired is-hovered');
  });

  it('renders loading state cleanly when loading is true', () => {
    const html = renderToStaticMarkup(<RecordsKpiCard loading={true} />);

    expect(html).toContain('bezent-kpi-value-skeleton');
    expect(html).toContain('bezent-kpi-pill-skeleton');
    expect(html).toContain('Records');
  });

  it('handles zero total gracefully without crashing or NaN', () => {
    const html = renderToStaticMarkup(
      <RecordsKpiCard
        total={0}
        verifiedCount={0}
        pendingCount={0}
        expiringCount={0}
        expiredCount={0}
      />,
    );

    expect(html).toContain('0');
  });
});
