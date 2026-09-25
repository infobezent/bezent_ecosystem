import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { AppShell, type AppShellProps, type BezentRouteHandle } from '../index';
import { ShellLayout } from '../../../app/router/ShellLayout';
import { ThemeProvider } from '../../../app/providers/ThemeProvider';

const defaultAppShellProps: AppShellProps = {
  navItems: [{ id: 'dashboard', label: 'Dashboard', icon: 'dashboard' }],
  userInitials: 'BZ',
  isDarkTheme: false,
  onToggleTheme: () => {},
  railItems: [],
  children: <div className="test-workspace-content">Workspace Content</div>,
};

describe('AppShell Workspace Variant Capability', () => {
  it('renders default workspace variant and class when workspaceVariant is omitted', () => {
    const html = renderToStaticMarkup(<AppShell {...defaultAppShellProps} />);

    expect(html).toContain('app-shell__workspace');
    expect(html).toContain('app-shell__workspace--default');
    expect(html).not.toContain('app-shell__workspace--flush');
    expect(html).toContain('test-workspace-content');
  });

  it('renders default workspace variant when workspaceVariant="default" explicitly provided', () => {
    const html = renderToStaticMarkup(
      <AppShell {...defaultAppShellProps} workspaceVariant="default" />,
    );

    expect(html).toContain('app-shell__workspace');
    expect(html).toContain('app-shell__workspace--default');
    expect(html).not.toContain('app-shell__workspace--flush');
  });

  it('renders flush workspace variant modifier when workspaceVariant="flush" provided', () => {
    const html = renderToStaticMarkup(
      <AppShell {...defaultAppShellProps} workspaceVariant="flush" />,
    );

    expect(html).toContain('app-shell__workspace');
    expect(html).toContain('app-shell__workspace--flush');
    expect(html).not.toContain('app-shell__workspace--default');
  });

  it('preserves complete global AppShell composition in flush mode', () => {
    const html = renderToStaticMarkup(
      <AppShell {...defaultAppShellProps} workspaceVariant="flush" />,
    );

    // Shell grid container
    expect(html).toContain('app-shell');
    // Top navigation
    expect(html).toContain('top-nav');
    // Left sidebar
    expect(html).toContain('left-sidebar');
    // Right companion rail
    expect(html).toContain('right-rail');
    // Global bottom bar
    expect(html).toContain('bottom-bar');
    // Workspace content
    expect(html).toContain('test-workspace-content');
  });
});

describe('ShellLayout Route Handle Workspace Resolution', () => {
  it('defaults to default workspace variant for routes without handle metadata', () => {
    const router = createMemoryRouter(
      [
        {
          element: (
            <ThemeProvider>
              <ShellLayout />
            </ThemeProvider>
          ),
          children: [
            {
              path: '/test-default',
              element: <div className="page-content">Normal Page</div>,
            },
          ],
        },
      ],
      { initialEntries: ['/test-default'] },
    );

    const html = renderToStaticMarkup(<RouterProvider router={router} />);

    expect(html).toContain('app-shell__workspace--default');
    expect(html).not.toContain('app-shell__workspace--flush');
    expect(html).toContain('Normal Page');
  });

  it('resolves flush workspace variant when route handle specifies workspaceVariant="flush"', () => {
    const flushHandle: BezentRouteHandle = { workspaceVariant: 'flush' };
    const router = createMemoryRouter(
      [
        {
          element: (
            <ThemeProvider>
              <ShellLayout />
            </ThemeProvider>
          ),
          children: [
            {
              path: '/test-flush',
              element: <div className="flush-content">Flush Workspace Page</div>,
              handle: flushHandle,
            },
          ],
        },
      ],
      { initialEntries: ['/test-flush'] },
    );

    const html = renderToStaticMarkup(<RouterProvider router={router} />);

    expect(html).toContain('app-shell__workspace--flush');
    expect(html).not.toContain('app-shell__workspace--default');
    expect(html).toContain('Flush Workspace Page');
  });

  it('resolves nested route metadata with leaf precedence over parent route', () => {
    const parentHandle: BezentRouteHandle = { workspaceVariant: 'flush' };
    const childDefaultHandle: BezentRouteHandle = { workspaceVariant: 'default' };

    const router = createMemoryRouter(
      [
        {
          element: (
            <ThemeProvider>
              <ShellLayout />
            </ThemeProvider>
          ),
          children: [
            {
              path: '/parent',
              handle: parentHandle,
              children: [
                {
                  path: 'child-override',
                  element: <div className="nested-content">Child Overriding to Default</div>,
                  handle: childDefaultHandle,
                },
              ],
            },
          ],
        },
      ],
      { initialEntries: ['/parent/child-override'] },
    );

    const html = renderToStaticMarkup(<RouterProvider router={router} />);

    // Leaf route override wins
    expect(html).toContain('app-shell__workspace--default');
    expect(html).not.toContain('app-shell__workspace--flush');
    expect(html).toContain('Child Overriding to Default');
  });

  it('inherits parent route handle when child route does not specify workspaceVariant', () => {
    const parentHandle: BezentRouteHandle = { workspaceVariant: 'flush' };

    const router = createMemoryRouter(
      [
        {
          element: (
            <ThemeProvider>
              <ShellLayout />
            </ThemeProvider>
          ),
          children: [
            {
              path: '/parent-flush',
              handle: parentHandle,
              children: [
                {
                  path: 'child-inherit',
                  element: <div className="nested-content">Child Inheriting Flush</div>,
                },
              ],
            },
          ],
        },
      ],
      { initialEntries: ['/parent-flush/child-inherit'] },
    );

    const html = renderToStaticMarkup(<RouterProvider router={router} />);

    // Inherits parent flush variant
    expect(html).toContain('app-shell__workspace--flush');
    expect(html).not.toContain('app-shell__workspace--default');
    expect(html).toContain('Child Inheriting Flush');
  });
});
