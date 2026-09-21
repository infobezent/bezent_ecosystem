import { BezentIcon } from '../../design-system/icons';
import type { BezentIconName } from '../../design-system/icons';
import {
  Avatar,
  Badge,
  Button,
  EmptyState,
  IconButton,
  Tooltip,
} from '../../design-system/components';
import './DevPlaceholderPage.css';

/**
 * Minimal development placeholder proving the React application builds and
 * renders. Not BEZENT UI — the real application shell/pages are migrated
 * from the approved old UI in Phase 0B.
 */
export function DevPlaceholderPage() {
  return (
    <div className="dev-placeholder">
      <span className="dev-placeholder__badge">Phase 0B.5 — Development only</span>
      <h1>BEZENT Development</h1>
      <p>AppShell Migration Verification</p>
      <IconSystemDevCheck />
      <ComponentSystemDevCheck />
    </div>
  );
}

/**
 * Development-only icon system verification (Phase 0B.3). NOT a product
 * "Icon Gallery" feature — a handful of representative icons rendered in
 * their default and selected states, under whichever theme is currently
 * active, purely to confirm the migrated icon system renders and resolves
 * design tokens correctly end to end. Deleted once AppShell/HRMS pages
 * exercise the icon system for real. See
 * docs/architecture/ICON-SYSTEM.md.
 */
function IconSystemDevCheck() {
  const sampleIcons: BezentIconName[] = [
    'home',
    'employees',
    'organization',
    'recruitment',
    'attendance',
    'leave',
    'payroll',
    'notifications',
    'approvals',
    'calendar',
    'notes',
  ];

  return (
    <div className="dev-icon-check">
      <span className="dev-placeholder__badge">Dev-only icon system check (Phase 0B.3)</span>
      <div className="dev-icon-check__grid">
        {sampleIcons.map((name) => (
          <div key={name} className="dev-icon-check__cell">
            <BezentIcon name={name} variant="outline" size="module" />
            <BezentIcon name={name} variant="solid" active size="module" />
            <span className="dev-icon-check__label">{name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Development-only design-system component verification (Phase 0B.4).
 * NOT a product component gallery/Storybook — just enough of each
 * component, in its real states, to confirm the migrated primitives
 * render and resolve tokens correctly under the active theme. Deleted
 * once AppShell/platform/HRMS UI exercises these components for real.
 * See docs/architecture/DESIGN-SYSTEM-COMPONENTS.md.
 */
function ComponentSystemDevCheck() {
  return (
    <div className="dev-icon-check">
      <span className="dev-placeholder__badge">Dev-only component system check (Phase 0B.4)</span>

      <div className="dev-component-check__row">
        <Button>Primary</Button>
        <Button disabled>Disabled</Button>
        <IconButton label="Settings">
          <BezentIcon name="settings" size="action" />
        </IconButton>
        <IconButton label="App Launcher" active>
          <BezentIcon name="apps" size="action" active />
        </IconButton>
        <span className="dev-component-check__tooltip-demo">
          Tooltip (static demo)
          <Tooltip label="A standalone tooltip" direction="down" />
        </span>
      </div>

      <div className="dev-component-check__row">
        <span className="dev-component-check__badge-demo">
          <BezentIcon name="notifications" size="action" />
          <Badge count={5} />
        </span>
        <span className="dev-component-check__badge-demo">
          <BezentIcon name="notifications" size="action" />
          <Badge dot />
        </span>
        <Avatar initials="SD" />
        <Avatar initials="BZ" />
      </div>

      <div className="dev-component-check__empty-state">
        <EmptyState
          title="Let's get started"
          description="This is a development-only rendering of the shared EmptyState shell."
          primaryAction={{ label: 'Primary action' }}
          secondaryAction={{ label: 'Secondary action' }}
          size="compact"
        />
      </div>
    </div>
  );
}
