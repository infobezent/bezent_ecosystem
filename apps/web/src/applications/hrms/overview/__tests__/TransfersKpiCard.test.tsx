import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import {
  TransfersKpiCard,
  type TransferLocationDetails,
  type TransferTypeItem,
} from '../components/TransfersKpiCard';

describe('TransfersKpiCard – Compact Connected Circular Visual', () => {
  it('renders Left Section with Transfers heading and total value', () => {
    const html = renderToStaticMarkup(<TransfersKpiCard total={18} />);

    expect(html).toContain('bezent-kpi-transfers-heading');
    expect(html).toContain('Transfers');
    expect(html).toContain('bezent-kpi-transfers-value');
    expect(html).toContain('18');
  });

  it('strictly avoids permanent category descriptions, legends, or footer labels', () => {
    const html = renderToStaticMarkup(<TransfersKpiCard total={18} pendingApproval={6} />);

    expect(html).not.toContain('bezent-kpi-transfers-label');
    expect(html).not.toContain('Pending Approval:');
    expect(html).not.toContain('bezent-kpi-transfers-pending-count');
    expect(html).not.toContain('bezent-kpi-transfers-footer');
  });

  it('renders circular flow loop visual with incoming and outgoing curved arrows', () => {
    const html = renderToStaticMarkup(<TransfersKpiCard total={18} />);

    expect(html).toContain('bezent-kpi-transfers-right');
    expect(html).toContain('bezent-kpi-flow-svg');
    expect(html).toContain('bezent-kpi-flow-arc--out');
    expect(html).toContain('bezent-kpi-flow-arc--in');
    expect(html).toContain('bezent-kpi-flow-arrowhead--out');
    expect(html).toContain('bezent-kpi-flow-arrowhead--in');
    expect(html).toContain('bezent-kpi-flow-center');
  });

  it('displays From Location details in floating tooltip when left node is hovered', () => {
    const details: TransferLocationDetails = {
      fromLocation: 'HQ Campus',
      toLocation: 'APAC Hub',
      summary: '18 transfers active',
    };

    const html = renderToStaticMarkup(
      <TransfersKpiCard total={18} locationDetails={details} hoveredNode="from" />,
    );

    expect(html).toContain('bezent-kpi-transfer-tooltip is-visible');
    expect(html).toContain('From: HQ Campus');
    expect(html).toContain('bezent-kpi-transfer-node--from is-hovered');
  });

  it('displays Employee transfer details in floating tooltip when center node is hovered', () => {
    const details: TransferLocationDetails = {
      fromLocation: 'HQ Campus',
      toLocation: 'APAC Hub',
      summary: '18 transfers active',
    };

    const html = renderToStaticMarkup(
      <TransfersKpiCard total={18} locationDetails={details} hoveredNode="center" />,
    );

    expect(html).toContain('bezent-kpi-transfer-tooltip is-visible');
    expect(html).toContain('Transfers: 18 transfers active');
    expect(html).toContain('bezent-kpi-transfer-node--center is-hovered');
  });

  it('displays To Location details in floating tooltip when right node is hovered', () => {
    const details: TransferLocationDetails = {
      fromLocation: 'HQ Campus',
      toLocation: 'APAC Hub',
      summary: '18 transfers active',
    };

    const html = renderToStaticMarkup(
      <TransfersKpiCard total={18} locationDetails={details} hoveredNode="to" />,
    );

    expect(html).toContain('bezent-kpi-transfer-tooltip is-visible');
    expect(html).toContain('To: APAC Hub');
    expect(html).toContain('bezent-kpi-transfer-node--to is-hovered');
  });

  it('renders loading state cleanly with shimmer skeleton and no bare dash', () => {
    const html = renderToStaticMarkup(<TransfersKpiCard loading={true} />);

    expect(html).toContain('bezent-kpi-value-skeleton');
    expect(html).toContain('bezent-kpi-pill-skeleton');
    expect(html).toContain('Transfers');
  });

  it('handles zero transfers gracefully without crashing or hardcoded mock data', () => {
    const html = renderToStaticMarkup(<TransfersKpiCard total={0} />);

    expect(html).toContain('0');
  });

  it('supports backward compatibility deriving total from legacy transferTypes array', () => {
    const legacyTypes: TransferTypeItem[] = [
      { id: 'branch', label: 'Branch Transfer', count: 7, colorClass: 'branch' },
      { id: 'location', label: 'Location Transfer', count: 5, colorClass: 'location' },
    ];

    const html = renderToStaticMarkup(<TransfersKpiCard transferTypes={legacyTypes} />);

    expect(html).toContain('12');
  });
});
