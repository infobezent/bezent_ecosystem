import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { LeftSidebar, type LeftSidebarProps } from '../LeftSidebar';
import type { ShellNavItem } from '../types';

describe('LeftSidebar Generic Overflow & Responsive Launcher Engine', () => {
  const superAdminFourItems: ShellNavItem[] = [
    {
      id: 'overview',
      label: 'Overview',
      icon: 'dashboard',
      subItems: [{ id: 'dashboard', label: 'Dashboard', icon: 'dashboard' }],
    },
    {
      id: 'customers',
      label: 'Customers',
      icon: 'organization',
      subItems: [
        { id: 'tenants', label: 'Tenants', icon: 'organization' },
        { id: 'companies', label: 'Companies', icon: 'organization' },
        { id: 'provisioning', label: 'Customer Provisioning', icon: 'dashboard' },
      ],
    },
    {
      id: 'access',
      label: 'Access',
      icon: 'employees',
      subItems: [
        { id: 'users', label: 'Platform Users', icon: 'employees' },
        { id: 'admins', label: 'Company Admins', icon: 'employees' },
      ],
    },
    {
      id: 'governance',
      label: 'Governance',
      icon: 'settings',
      subItems: [
        { id: 'audit', label: 'Audit Logs', icon: 'settings' },
        { id: 'platform_settings', label: 'Platform Settings', icon: 'settings' },
      ],
    },
  ];

  it('1. renders all 4 items and DOES NOT render More when items fit available area', () => {
    // 4 items need 4*68 + 3*2 = 278px. Available 600px -> easily fits.
    const html = renderToStaticMarkup(
      <LeftSidebar
        items={superAdminFourItems}
        activeId="customers"
        testAvailableHeight={600}
        more={{
          active: false,
          open: false,
          onToggle: vi.fn(),
          hasLauncherOnlyItems: false,
        }}
      />,
    );

    expect(html).toContain('Overview');
    expect(html).toContain('Customers');
    expect(html).toContain('Access');
    expect(html).toContain('Governance');
    expect(html).not.toContain('More');
    expect(html).not.toContain('data-more-toggle');
  });

  it('2. navigation items exactly fit available area -> More NOT rendered', () => {
    // 4 items exact required content height is 278px.
    // effectiveHeight = 278 + 8 (padding) = 286px.
    const html = renderToStaticMarkup(
      <LeftSidebar
        items={superAdminFourItems}
        activeId="overview"
        testAvailableHeight={286}
        more={{
          active: false,
          open: false,
          onToggle: vi.fn(),
          hasLauncherOnlyItems: false,
        }}
      />,
    );

    expect(html).toContain('Overview');
    expect(html).toContain('Customers');
    expect(html).toContain('Access');
    expect(html).toContain('Governance');
    expect(html).not.toContain('More');
  });

  it('3. items genuinely exceed available area -> More rendered and fitting items displayed', () => {
    // Available height 200px.
    // 4 items require 278px. They genuinely overflow!
    // Space with More: 200 - 8 - 70 = 122px.
    // Fit count: Math.floor((122 + 2) / 70) = 1 item.
    const html = renderToStaticMarkup(
      <LeftSidebar
        items={superAdminFourItems}
        activeId="overview"
        testAvailableHeight={200}
        more={{
          active: false,
          open: false,
          onToggle: vi.fn(),
          hasLauncherOnlyItems: false,
        }}
      />,
    );

    expect(html).toContain('Overview');
    expect(html).toContain('More');
    expect(html).toContain('data-more-toggle');
    // Governance overflowed into More
    expect(html).not.toContain('Governance');
  });

  it('4. overflow destinations are hidden from rail and accessible via More launcher', () => {
    const eightItems: ShellNavItem[] = [
      ...superAdminFourItems,
      { id: 'item_5', label: 'Item Five', icon: 'payroll' },
      { id: 'item_6', label: 'Item Six', icon: 'performance' },
      { id: 'item_7', label: 'Item Seven', icon: 'reports' },
      { id: 'item_8', label: 'Item Eight', icon: 'documents' },
    ];
    // 8 items require 8*70 - 2 = 558px. Available 350px.
    // Fitting items will render + MoreButton
    const html = renderToStaticMarkup(
      <LeftSidebar
        items={eightItems}
        activeId="overview"
        testAvailableHeight={350}
        more={{
          active: false,
          open: false,
          onToggle: vi.fn(),
          hasLauncherOnlyItems: false,
        }}
      />,
    );

    expect(html).toContain('Overview');
    expect(html).toContain('More');
    expect(html).not.toContain('Item Eight');
  });

  it('5. resizing from large -> small causes More to appear only when capacity is exceeded', () => {
    // Large viewport (700px): all 4 fit, NO More
    const htmlLarge = renderToStaticMarkup(
      <LeftSidebar
        items={superAdminFourItems}
        activeId="overview"
        testAvailableHeight={700}
        more={{
          active: false,
          open: false,
          onToggle: vi.fn(),
          hasLauncherOnlyItems: false,
        }}
      />,
    );
    expect(htmlLarge).not.toContain('More');

    // Small viewport (180px): items overflow, More appears
    const htmlSmall = renderToStaticMarkup(
      <LeftSidebar
        items={superAdminFourItems}
        activeId="overview"
        testAvailableHeight={180}
        more={{
          active: false,
          open: false,
          onToggle: vi.fn(),
          hasLauncherOnlyItems: false,
        }}
      />,
    );
    expect(htmlSmall).toContain('More');
  });

  it('6. resizing from small -> large causes More to disappear when all items fit', () => {
    const htmlExpanded = renderToStaticMarkup(
      <LeftSidebar
        items={superAdminFourItems}
        activeId="overview"
        testAvailableHeight={800}
        more={{
          active: false,
          open: false,
          onToggle: vi.fn(),
          hasLauncherOnlyItems: false,
        }}
      />,
    );

    expect(htmlExpanded).toContain('Overview');
    expect(htmlExpanded).toContain('Customers');
    expect(htmlExpanded).toContain('Access');
    expect(htmlExpanded).toContain('Governance');
    expect(htmlExpanded).not.toContain('More');
  });

  it('7. Super Admin canonical 4-item configuration exhibits NO More item in standard workspace', () => {
    // Default viewport height in standard desktop viewports (> 600px)
    const html = renderToStaticMarkup(
      <LeftSidebar
        items={superAdminFourItems}
        activeId="customers"
        testAvailableHeight={650}
        more={{
          active: false,
          open: false,
          onToggle: vi.fn(),
          hasLauncherOnlyItems: false,
        }}
      />,
    );

    expect(html).toContain('Overview');
    expect(html).toContain('Customers');
    expect(html).toContain('Access');
    expect(html).toContain('Governance');
    expect(html).not.toContain('More');
  });

  it('8. Main Nav active item preserves single active rail item invariant', () => {
    const html = renderToStaticMarkup(
      <LeftSidebar items={superAdminFourItems} activeId="customers" testAvailableHeight={600} />,
    );

    expect(html).toContain('is-active');
  });

  it('9. When an active item overflows into More, More receives active styling', () => {
    // 4 items with active item 'governance', but available height only fits 2 items + More.
    // Governance overflows into More -> More button should be active.
    const html = renderToStaticMarkup(
      <LeftSidebar
        items={superAdminFourItems}
        activeId="governance"
        testAvailableHeight={230}
        more={{
          active: false,
          open: false,
          onToggle: vi.fn(),
          hasLauncherOnlyItems: false,
        }}
      />,
    );

    expect(html).toContain('More');
    expect(html).toContain('is-active');
  });

  it('10. Renders More when an application has launcher-only items (HRMS scenario)', () => {
    // HRMS has extra destinations that only exist in the More launcher
    const html = renderToStaticMarkup(
      <LeftSidebar
        items={superAdminFourItems}
        activeId="overview"
        testAvailableHeight={600}
        more={{
          active: false,
          open: false,
          onToggle: vi.fn(),
          hasLauncherOnlyItems: true, // extra items exist in launcher
        }}
      />,
    );

    expect(html).toContain('Overview');
    expect(html).toContain('More');
  });
});
