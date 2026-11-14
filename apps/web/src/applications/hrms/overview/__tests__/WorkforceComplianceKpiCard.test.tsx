import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { WorkforceComplianceKpiCard } from '../components/WorkforceComplianceKpiCard';

describe('WorkforceComplianceKpiCard – Compliance Health Design', () => {
  it('renders Top Section with Workforce Compliance heading, 94% value, and Compliance Completion label', () => {
    const html = renderToStaticMarkup(<WorkforceComplianceKpiCard complianceRate={94} />);

    expect(html).toContain('Compliance');
    expect(html).toContain('94%');
    expect(html).toContain('Workforce Compliance');
    expect(html).toContain('bezent-kpi-compliance-icon');
  });

  it('renders Middle Section horizontal progress indicator with compliant and attention segments', () => {
    const html = renderToStaticMarkup(<WorkforceComplianceKpiCard complianceRate={94} />);

    expect(html).toContain('bezent-kpi-compliance-bar-svg');
    expect(html).toContain('bezent-kpi-compliance-segment--compliant');
    expect(html).toContain('bezent-kpi-compliance-segment--attention');
  });

  it('applies correct accessible aria-labels and descriptions', () => {
    const html = renderToStaticMarkup(
      <WorkforceComplianceKpiCard
        complianceRate={94}
        compliantCount={94}
        attentionCount={6}
        totalRecords={100}
      />,
    );

    expect(html).toContain('Compliant Records: 94%, 94 records');
    expect(html).toContain('Requires Attention: 6%, 6 records');
  });

  it('renders strictly "Requires Attention: 6" in the bottom indicator', () => {
    const html = renderToStaticMarkup(
      <WorkforceComplianceKpiCard complianceRate={94} attentionCount={6} />,
    );

    expect(html).toContain('Requires Attention:');
    expect(html).toContain('6');
    expect(html).toContain('bezent-kpi-compliance-pending-count');
  });

  it('renders loading state cleanly when loading is true', () => {
    const html = renderToStaticMarkup(<WorkforceComplianceKpiCard loading={true} />);

    expect(html).toContain('—');
    expect(html).toContain('Workforce Compliance');
    expect(html).toContain('Requires Attention:');
  });

  it('calculates compliance percentage dynamically from counts when rate is omitted', () => {
    const html = renderToStaticMarkup(
      <WorkforceComplianceKpiCard compliantCount={45} attentionCount={5} totalRecords={50} />,
    );

    // 45 / 50 = 90%
    expect(html).toContain('90%');
    expect(html).toContain('Requires Attention:');
    expect(html).toContain('5');
  });

  it('handles 100% compliance without rendering an attention segment', () => {
    const html = renderToStaticMarkup(
      <WorkforceComplianceKpiCard
        complianceRate={100}
        compliantCount={100}
        attentionCount={0}
        totalRecords={100}
      />,
    );

    expect(html).toContain('100%');
    expect(html).toContain('bezent-kpi-compliance-segment--compliant');
    expect(html).not.toContain('bezent-kpi-compliance-segment--attention');
    expect(html).toContain('Requires Attention:');
    expect(html).toContain('0');
  });

  it('renders default meta header with Compliant Records and percentage when not hovered', () => {
    const html = renderToStaticMarkup(<WorkforceComplianceKpiCard complianceRate={94} />);

    expect(html).toContain('Compliant Records');
    expect(html).toContain('94%');
  });
});
