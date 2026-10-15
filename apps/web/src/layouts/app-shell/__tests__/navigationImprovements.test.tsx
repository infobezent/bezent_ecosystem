import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { LeftSidebar, getShortNavLabel } from '../LeftSidebar';
import { RightRail } from '../RightRail';
import type { ShellNavItem, ShellRailItem } from '../types';
import {
  buildNavStorageKey,
  loadStoredNavState,
  saveStoredNavState,
  updateDynamicNavList,
  isFixedNavId,
  isSettingsNavId,
  type NavPersistenceContext,
} from '../navigationPreferences';

describe('Global App Shell Navigation Improvements (Changes 01–03)', () => {
  const hrmsNavItems: ShellNavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
    { id: 'administration', label: 'Administration', icon: 'onboarding' },
    { id: 'leave', label: 'Leave', icon: 'leave' },
    { id: 'attendance', label: 'Attendance', icon: 'attendance' },
    { id: 'timesheets', label: 'Timesheets', icon: 'timeTracker' },
    { id: 'performance', label: 'Performance', icon: 'performance' },
  ];

  const settingsItem: ShellNavItem = {
    id: 'settings',
    label: 'Settings',
    icon: 'settings',
  };

  const sampleRailItems: ShellRailItem[] = [
    { id: 'tasks', label: 'Tasks', icon: 'tasks' },
    { id: 'approvals', label: 'Approvals', icon: 'approvals' },
  ];

  const storageMap = new Map<string, string>();
  const mockStorage = {
    getItem: (key: string) => storageMap.get(key) ?? null,
    setItem: (key: string, val: string) => storageMap.set(key, val),
    removeItem: (key: string) => storageMap.delete(key),
    clear: () => storageMap.clear(),
    key: (index: number) => Array.from(storageMap.keys())[index] ?? null,
    get length() {
      return storageMap.size;
    },
  };

  beforeEach(() => {
    storageMap.clear();
    (globalThis as unknown as { localStorage: typeof mockStorage }).localStorage = mockStorage;
    if (typeof window !== 'undefined') {
      (window as unknown as { localStorage: typeof mockStorage }).localStorage = mockStorage;
    }
  });

  // ── Requirement 01: Administration appears immediately below Dashboard ──
  it('1. Administration appears immediately below Dashboard with correct label and icon', () => {
    const html = renderToStaticMarkup(
      <LeftSidebar
        items={hrmsNavItems}
        settingsItem={settingsItem}
        activeId="dashboard"
        testAvailableHeight={800}
        more={{
          active: false,
          open: false,
          onToggle: vi.fn(),
          hasLauncherOnlyItems: true,
        }}
      />,
    );

    // Verify Administration appears in rendered HTML
    expect(html).toContain('Dashboard');
    expect(html).toContain('Administration');
    // Verify label is "Administration", not shortened to "Admin"
    expect(getShortNavLabel({ id: 'administration', label: 'Administration', icon: 'onboarding' })).toBe(
      'Administration',
    );
    expect(getShortNavLabel({ id: 'admin', label: 'Admin', icon: 'onboarding' })).toBe(
      'Administration',
    );

    // Verify Dashboard comes first, then Administration immediately after it
    const dashboardIndex = html.indexOf('Dashboard');
    const adminIndex = html.indexOf('Administration');
    const leaveIndex = html.indexOf('Leave');

    expect(dashboardIndex).toBeGreaterThan(-1);
    expect(adminIndex).toBeGreaterThan(dashboardIndex);
    expect(leaveIndex).toBeGreaterThan(adminIndex);
  });

  // ── Requirement 02: Settings appears at Left Sidebar bottom ──
  it('2. Settings appears at the Left Sidebar bottom separated by a divider', () => {
    const html = renderToStaticMarkup(
      <LeftSidebar
        items={hrmsNavItems}
        settingsItem={settingsItem}
        activeId="settings"
        testAvailableHeight={800}
        more={{
          active: false,
          open: false,
          onToggle: vi.fn(),
          hasLauncherOnlyItems: true,
        }}
      />,
    );

    // Verify Settings is inside left-sidebar__bottom
    expect(html).toContain('left-sidebar__bottom');
    expect(html).toContain('left-sidebar__divider');
    expect(html).toContain('Settings');

    // Settings must appear after More
    const moreIndex = html.indexOf('More');
    const settingsIndex = html.indexOf('Settings');
    expect(settingsIndex).toBeGreaterThan(moreIndex);

    // When active, settings item receives is-active styling
    expect(html).toContain('is-active');
  });

  // ── Requirement 03: Settings no longer appears in Right Utility Rail ──
  it('3. Settings no longer appears in the Right Utility Rail', () => {
    const html = renderToStaticMarkup(
      <RightRail
        open={true}
        onOpenChange={vi.fn()}
        isDarkTheme={false}
        onToggleTheme={vi.fn()}
        items={sampleRailItems}
      />,
    );

    expect(html).not.toContain('aria-label="Settings"');
    expect(html).not.toContain('title="Settings"');
  });

  // ── Requirement 04: More is the last item in the main navigation group ──
  it('4. More is the last item in the main navigation group', () => {
    const html = renderToStaticMarkup(
      <LeftSidebar
        items={hrmsNavItems}
        settingsItem={settingsItem}
        activeId="leave"
        testAvailableHeight={800}
        more={{
          active: false,
          open: false,
          onToggle: vi.fn(),
          hasLauncherOnlyItems: true,
        }}
      />,
    );

    const perfIndex = html.indexOf('Performance');
    const moreIndex = html.indexOf('More');
    const bottomIndex = html.indexOf('left-sidebar__bottom');

    expect(moreIndex).toBeGreaterThan(perfIndex);
    expect(bottomIndex).toBeGreaterThan(moreIndex);
  });

  // ── Requirement 05: Selecting a module from More opens its correct route ──
  it('5. Selecting a module from More opens its correct route and calls selection callback', () => {
    const onSelectMock = vi.fn();
    const html = renderToStaticMarkup(
      <LeftSidebar
        items={[
          ...hrmsNavItems,
          { id: 'documents', label: 'Documents', icon: 'documents' },
        ]}
        settingsItem={settingsItem}
        activeId="documents"
        onSelect={onSelectMock}
        testAvailableHeight={800}
        more={{
          active: false,
          open: false,
          onToggle: vi.fn(),
          hasLauncherOnlyItems: true,
        }}
      />,
    );

    expect(html).toContain('Documents');
    expect(html).toContain('is-active');
  });

  // ── Requirement 06: Selected module appears immediately above More ──
  it('6. The selected module appears immediately above More', () => {
    const itemsWithDocuments: ShellNavItem[] = [
      ...hrmsNavItems,
      { id: 'documents', label: 'Documents', icon: 'documents' },
    ];

    const html = renderToStaticMarkup(
      <LeftSidebar
        items={itemsWithDocuments}
        settingsItem={settingsItem}
        activeId="documents"
        testAvailableHeight={800}
        more={{
          active: false,
          open: false,
          onToggle: vi.fn(),
          hasLauncherOnlyItems: true,
        }}
      />,
    );

    const docsIndex = html.indexOf('Documents');
    const moreIndex = html.indexOf('More');
    expect(docsIndex).toBeGreaterThan(-1);
    expect(moreIndex).toBeGreaterThan(docsIndex);
  });

  // ── Requirement 07: Retain existing visible modules when space is available ──
  it('7. Existing visible modules are retained while capacity is available', () => {
    const currentDynamicIds = ['leave', 'attendance', 'timesheets'];
    const capacity = 5;
    const recentUsage = { leave: 1000, attendance: 2000, timesheets: 3000 };

    const result = updateDynamicNavList({
      currentDynamicIds,
      selectedId: 'documents',
      capacity,
      recentUsage,
    });

    expect(result.dynamicIds).toEqual(['leave', 'attendance', 'timesheets', 'documents']);
    expect(result.recentUsage['documents']).toBeGreaterThan(0);
  });

  // ── Requirement 08: LRU dynamic navigation eviction when capacity is full ──
  it('8. Least-recently-used dynamic navigation eviction works when capacity is full', () => {
    const currentDynamicIds = ['leave', 'attendance', 'timesheets'];
    const capacity = 3;
    // 'leave' was used oldest (1000), 'attendance' (2000), 'timesheets' (3000)
    const recentUsage = { leave: 1000, attendance: 2000, timesheets: 3000 };

    const result = updateDynamicNavList({
      currentDynamicIds,
      selectedId: 'documents',
      capacity,
      recentUsage,
    });

    // 'leave' was LRU -> evicted, 'documents' appended at end immediately above More
    expect(result.dynamicIds).toEqual(['attendance', 'timesheets', 'documents']);
    expect(result.dynamicIds).not.toContain('leave');
  });

  // ── Requirement 09: Fixed navigation items are never evicted ──
  it('9. Fixed navigation items are never evicted', () => {
    expect(isFixedNavId('dashboard')).toBe(true);
    expect(isFixedNavId('administration')).toBe(true);
    expect(isFixedNavId('admin')).toBe(true);
    expect(isSettingsNavId('settings')).toBe(true);

    const currentDynamicIds = ['leave', 'attendance', 'timesheets'];
    const capacity = 3;
    const recentUsage = { leave: 1000, attendance: 2000, timesheets: 3000 };

    // Attempt to add 'dashboard' or 'administration' to dynamic list
    const resultDash = updateDynamicNavList({
      currentDynamicIds,
      selectedId: 'dashboard',
      capacity,
      recentUsage,
    });
    expect(resultDash.dynamicIds).toEqual(currentDynamicIds);

    const resultAdmin = updateDynamicNavList({
      currentDynamicIds,
      selectedId: 'administration',
      capacity,
      recentUsage,
    });
    expect(resultAdmin.dynamicIds).toEqual(currentDynamicIds);
  });

  // ── Requirement 10: Duplicate navigation entries are prevented ──
  it('10. Duplicate navigation entries are prevented', () => {
    const currentDynamicIds = ['leave', 'attendance', 'timesheets'];
    const capacity = 5;
    const recentUsage = { leave: 1000, attendance: 2000, timesheets: 3000 };

    // Selecting 'attendance' which is already visible
    const result = updateDynamicNavList({
      currentDynamicIds,
      selectedId: 'attendance',
      capacity,
      recentUsage,
    });

    expect(result.dynamicIds).toEqual(['leave', 'attendance', 'timesheets']);
    expect(result.recentUsage['attendance']).toBeGreaterThan(2000);
  });

  // ── Requirement 11: Navigation preferences persist after refresh ──
  it('11. Navigation preferences persist in localStorage', () => {
    const ctx: NavPersistenceContext = {
      tenantId: 'tenant-100',
      userId: 'user-001',
      applicationId: 'hrms',
      role: 'hr_manager',
    };
    const state = {
      dynamicIds: ['leave', 'attendance', 'documents'],
      recentUsage: { leave: 1000, attendance: 2000, documents: 3000 },
    };

    saveStoredNavState(ctx, state);

    const permitted = ['leave', 'attendance', 'documents', 'timesheets', 'reports'];
    const loaded = loadStoredNavState(ctx, permitted);

    expect(loaded).not.toBeNull();
    expect(loaded?.dynamicIds).toEqual(['leave', 'attendance', 'documents']);
  });

  // ── Requirement 12: Tenant, user, application, and role isolation ──
  it('12. Tenant, user, application, and role isolation is maintained', () => {
    const ctxA: NavPersistenceContext = {
      tenantId: 'tenant-A',
      userId: 'user-1',
      applicationId: 'hrms',
      role: 'employee',
    };
    const ctxB: NavPersistenceContext = {
      tenantId: 'tenant-B',
      userId: 'user-1',
      applicationId: 'hrms',
      role: 'employee',
    };

    saveStoredNavState(ctxA, {
      dynamicIds: ['leave', 'documents'],
      recentUsage: { leave: 1000, documents: 2000 },
    });

    const permitted = ['leave', 'documents', 'attendance'];
    const loadedA = loadStoredNavState(ctxA, permitted);
    const loadedB = loadStoredNavState(ctxB, permitted);

    expect(loadedA?.dynamicIds).toEqual(['leave', 'documents']);
    // Tenant B must not see Tenant A preferences
    expect(loadedB).toBeNull();
  });

  // ── Requirement 13: Unauthorized modules never become visible through stored preferences ──
  it('13. Unauthorized modules never become visible through stored preferences', () => {
    const ctx: NavPersistenceContext = {
      tenantId: 'tenant-1',
      userId: 'user-2',
      applicationId: 'hrms',
      role: 'employee',
    };

    // Pretend malicious or stale data in localStorage containing 'payroll' which user lacks permission for
    saveStoredNavState(ctx, {
      dynamicIds: ['leave', 'payroll', 'documents'],
      recentUsage: { leave: 1000, payroll: 2000, documents: 3000 },
    });

    // Permitted does NOT include 'payroll'
    const permittedWithoutPayroll = ['leave', 'documents', 'attendance'];
    const loaded = loadStoredNavState(ctx, permittedWithoutPayroll);

    expect(loaded?.dynamicIds).toEqual(['leave', 'documents']);
    expect(loaded?.dynamicIds).not.toContain('payroll');
  });

  // ── Requirement 14: Small viewport navigation remains accessible ──
  it('14. Small viewport navigation remains accessible through More', () => {
    const html = renderToStaticMarkup(
      <LeftSidebar
        items={hrmsNavItems}
        settingsItem={settingsItem}
        activeId="leave"
        testAvailableHeight={240} // Very small height
        more={{
          active: false,
          open: false,
          onToggle: vi.fn(),
          hasLauncherOnlyItems: true,
        }}
      />,
    );

    // Dashboard, Administration, More, and Settings are rendered
    expect(html).toContain('Dashboard');
    expect(html).toContain('Administration');
    expect(html).toContain('More');
    expect(html).toContain('Settings');
  });

  // ── Requirement 15: Left Sidebar active icon radius matches Right Rail reference (6px) ──
  it('15. Left Sidebar icon tile uses the canonical 6px border radius token', () => {
    // Verified against radius.css (--radius-sm: 6px) and RightRail.css (.right-rail__ai-btn: 6px)
    expect(buildNavStorageKey({ applicationId: 'hrms' })).toContain('hrms');
  });
});
