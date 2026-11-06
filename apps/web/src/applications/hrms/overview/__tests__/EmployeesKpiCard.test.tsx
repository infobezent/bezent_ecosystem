import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { EmployeesKpiCard } from '../components/EmployeesKpiCard';

describe('EmployeesKpiCard – Interactive Workforce Ring', () => {
  it('renders Left Section with Employees heading, value and Total Employees label', () => {
    const html = renderToStaticMarkup(
      <EmployeesKpiCard total={1248} active={1186} probation={32} pending={12} separated={18} />,
    );

    expect(html).toContain('Employees');
    expect(html).toContain('1,248');
    expect(html).toContain('Total Employees');
  });

  it('renders all four circular ring segments with accessible labels and colors', () => {
    const html = renderToStaticMarkup(
      <EmployeesKpiCard total={1248} active={1186} probation={32} pending={12} separated={18} />,
    );

    expect(html).toContain('bezent-kpi-ring-segment--active');
    expect(html).toContain('bezent-kpi-ring-segment--probation');
    expect(html).toContain('bezent-kpi-ring-segment--pending');
    expect(html).toContain('bezent-kpi-ring-segment--separated');

    expect(html).toContain('Active Employees: 1,186 employees');
    expect(html).toContain('Probation: 32 employees');
    expect(html).toContain('Pending Activation: 12 employees');
    expect(html).toContain('Separated: 18 employees');
  });

  it('displays default person/employee icon in center when unhovered', () => {
    const html = renderToStaticMarkup(
      <EmployeesKpiCard total={1248} active={1186} probation={32} pending={12} separated={18} />,
    );

    expect(html).toContain('bezent-kpi-ring-default');
    expect(html).not.toContain('bezent-kpi-ring-info');
  });

  it('renders loading state cleanly when loading is true', () => {
    const html = renderToStaticMarkup(<EmployeesKpiCard loading={true} />);

    expect(html).toContain('—');
    expect(html).toContain('Total Employees');
  });

  it('falls back seamlessly to approved sample values if props are omitted', () => {
    const html = renderToStaticMarkup(<EmployeesKpiCard />);

    expect(html).toContain('1,248');
    expect(html).toContain('Active Employees: 1,186 employees');
    expect(html).toContain('Probation: 32 employees');
    expect(html).toContain('Pending Activation: 12 employees');
    expect(html).toContain('Separated: 18 employees');
  });
});
