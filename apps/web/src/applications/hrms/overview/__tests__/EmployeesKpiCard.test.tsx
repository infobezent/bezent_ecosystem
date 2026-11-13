import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { EmployeesKpiCard } from '../components/EmployeesKpiCard';

describe('EmployeesKpiCard – Premium Employee KPI Card', () => {
  it('renders clean default layout: small heading "Employees", large number, and no extra footer or category text', () => {
    const html = renderToStaticMarkup(
      <EmployeesKpiCard total={1248} active={1186} probation={32} pending={12} separated={18} />,
    );

    // Primary KPI elements
    expect(html).toContain('Employees');
    expect(html).toContain('1,248');
    expect(html).toContain('bezent-kpi-ring-svg');

    // Strictly avoided elements per design principle: Heading + Big Number + Small Ring
    expect(html).not.toContain('bezent-kpi-employees-footer');
    expect(html).not.toContain('bezent-kpi-employees-label');
    expect(html).not.toContain('bezent-kpi-ring-info');
    expect(html).not.toContain('Active Workforce:');
  });

  it('renders four proportional ring segments matching actual category counts with accessible labels', () => {
    const html = renderToStaticMarkup(
      <EmployeesKpiCard total={1248} active={1186} probation={32} pending={12} separated={18} />,
    );

    expect(html).toContain('bezent-kpi-ring-segment--active');
    expect(html).toContain('bezent-kpi-ring-segment--probation');
    expect(html).toContain('bezent-kpi-ring-segment--pending');
    expect(html).toContain('bezent-kpi-ring-segment--separated');

    // Accessible ARIA labels on paths
    expect(html).toContain('aria-label="Active Employees: 1,186 employees"');
    expect(html).toContain('aria-label="Probation: 32 employees"');
    expect(html).toContain('aria-label="Pending Activation: 12 employees"');
    expect(html).toContain('aria-label="Separated: 18 employees"');
  });

  it('displays default person/employee icon in center when unhovered', () => {
    const html = renderToStaticMarkup(
      <EmployeesKpiCard total={1248} active={1186} probation={32} pending={12} separated={18} />,
    );

    expect(html).toContain('bezent-kpi-ring-default');
    expect(html).toContain('bezent-kpi-ring-icon-wrapper--default');
    expect(html).not.toContain('bezent-kpi-ring-info');
  });

  it('displays Active hover state with user-round-check icon and green styling', () => {
    const html = renderToStaticMarkup(
      <EmployeesKpiCard
        total={1248}
        active={1186}
        probation={32}
        pending={12}
        separated={18}
        hoveredSegmentId="active"
      />,
    );

    expect(html).toContain('bezent-kpi-ring-icon-wrapper--active');
    expect(html).toContain('person_check');
  });

  it('displays Probation hover state with user-round-clock icon and amber styling', () => {
    const html = renderToStaticMarkup(
      <EmployeesKpiCard
        total={1248}
        active={1186}
        probation={32}
        pending={12}
        separated={18}
        hoveredSegmentId="probation"
      />,
    );

    expect(html).toContain('bezent-kpi-ring-icon-wrapper--probation');
    expect(html).toContain('schedule');
  });

  it('displays Pending Activation hover state with user-round-plus icon and blue styling', () => {
    const html = renderToStaticMarkup(
      <EmployeesKpiCard
        total={1248}
        active={1186}
        probation={32}
        pending={12}
        separated={18}
        hoveredSegmentId="pending"
      />,
    );

    expect(html).toContain('bezent-kpi-ring-icon-wrapper--pending');
    expect(html).toContain('person_add');
  });

  it('displays Separated hover state with user-round-minus icon and neutral grey styling', () => {
    const html = renderToStaticMarkup(
      <EmployeesKpiCard
        total={1248}
        active={1186}
        probation={32}
        pending={12}
        separated={18}
        hoveredSegmentId="separated"
      />,
    );

    expect(html).toContain('bezent-kpi-ring-icon-wrapper--separated');
    expect(html).toContain('person_remove');
  });

  it('restores default icon cleanly when hover ends (hoveredSegmentId is null)', () => {
    const html = renderToStaticMarkup(
      <EmployeesKpiCard
        total={1248}
        active={1186}
        probation={32}
        pending={12}
        separated={18}
        hoveredSegmentId={null}
      />,
    );

    expect(html).toContain('bezent-kpi-ring-icon-wrapper--default');
    expect(html).toContain('bezent-kpi-ring-default');
    expect(html).not.toContain('bezent-kpi-ring-icon-wrapper--active');
  });

  it('handles zero employees cleanly without NaN or broken SVG geometry', () => {
    const html = renderToStaticMarkup(
      <EmployeesKpiCard total={0} active={0} probation={0} pending={0} separated={0} />,
    );

    expect(html).toContain('bezent-kpi-employees-value">0</div>');
    expect(html).toContain('bezent-kpi-ring-empty-track');
    expect(html).not.toContain('NaN');
  });

  it('renders loading state cleanly when loading is true', () => {
    const html = renderToStaticMarkup(<EmployeesKpiCard loading={true} />);

    expect(html).toContain('bezent-kpi-value-skeleton');
    expect(html).toContain('bezent-kpi-pill-skeleton');
    expect(html).toContain('bezent-kpi-ring-segment--loading');
    expect(html).toContain('Employees');
  });

  it('updates ring geometry when category distributions change', () => {
    const html1 = renderToStaticMarkup(
      <EmployeesKpiCard total={100} active={90} probation={10} pending={0} separated={0} />,
    );
    const html2 = renderToStaticMarkup(
      <EmployeesKpiCard total={100} active={50} probation={50} pending={0} separated={0} />,
    );

    // Segment arcs should reflect different geometrical paths
    expect(html1).toContain('bezent-kpi-ring-segment--active');
    expect(html1).toContain('bezent-kpi-ring-segment--probation');
    expect(html2).toContain('bezent-kpi-ring-segment--active');
    expect(html2).toContain('bezent-kpi-ring-segment--probation');
    expect(html1).not.toEqual(html2);
  });

  it('renders with increased default strokeWidth (7.2) or custom strokeWidth', () => {
    const htmlDefault = renderToStaticMarkup(
      <EmployeesKpiCard total={100} active={90} probation={10} pending={0} separated={0} />,
    );
    expect(htmlDefault).toContain('stroke-width="7.2"');

    const htmlCustom = renderToStaticMarkup(
      <EmployeesKpiCard
        total={100}
        active={90}
        probation={10}
        pending={0}
        separated={0}
        strokeWidth={8.5}
      />,
    );
    expect(htmlCustom).toContain('stroke-width="8.5"');
  });

  it('renders floating hover tooltip popover when segment is hovered', () => {
    const html = renderToStaticMarkup(
      <EmployeesKpiCard
        total={1248}
        active={1186}
        probation={32}
        pending={12}
        separated={18}
        hoveredSegmentId="active"
      />,
    );

    expect(html).toContain('bezent-kpi-employees-tooltip');
    expect(html).toContain('is-visible');
    expect(html).toContain('Active Employees: 1,186 (95%)');
  });

  it('renders floating hover tooltip popover when center is hovered', () => {
    const html = renderToStaticMarkup(
      <EmployeesKpiCard
        total={1248}
        active={1186}
        probation={32}
        pending={12}
        separated={18}
        hoveredSegmentId="center"
      />,
    );

    expect(html).toContain('bezent-kpi-employees-tooltip');
    expect(html).toContain('is-visible');
    expect(html).toContain('Workforce: 1,248 Total');
  });
});
