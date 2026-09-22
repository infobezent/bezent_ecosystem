/**
 * BEZENT Design System — Typed Token Access
 *
 * A typed convenience layer over the CSS custom properties defined in
 * `theme.css`, `typography.css`, `motion.css`, and `layout.css`. Every
 * value here is a `var(--...)` reference — CSS remains the single runtime
 * source of truth (see docs/architecture/UI-MIGRATION-INVENTORY.md §5).
 * This file must never hardcode a hex/color/duration value directly.
 *
 * Coverage: the categories below mirror the old approved UI's
 * `theme/tokens.ts` convenience layer (bg/text/border/icon/accent/nav/
 * shadow/status), plus the new token groups introduced this phase
 * (typography/motion/layout). Not every CSS custom property in
 * `theme.css` has a TS entry — the full token catalog (search, drawer,
 * more-services-panel, popup-row, top-nav-control, sidebar, right-rail,
 * footer tokens, etc.) is consumed directly via `var(--token-name)` in
 * CSS; adding a TS accessor for all ~220 of them would duplicate names
 * for no benefit over referencing the CSS variable directly.
 */

export const THEME_TOKENS = {
  bg: {
    app: 'var(--bg-app)',
    surface: 'var(--bg-surface)',
    surfaceSecondary: 'var(--bg-surface-secondary)',
    header: 'var(--bg-header)',
    sidebar: 'var(--bg-sidebar)',
    footer: 'var(--bg-footer)',
    popup: 'var(--bg-popup)',
    popupHeader: 'var(--bg-popup-header)',
    search: 'var(--bg-search)',
    drawer: 'var(--bg-drawer)',
    overlay: 'var(--bg-overlay)',
    hover: 'var(--bg-hover)',
    selected: 'var(--bg-selected)',
  },
  text: {
    brand: 'var(--text-brand)',
    primary: 'var(--text-primary)',
    body: 'var(--text-body)',
    secondary: 'var(--text-secondary)',
    tertiary: 'var(--text-tertiary)',
    muted: 'var(--text-muted)',
    disabled: 'var(--text-disabled)',
    inverse: 'var(--text-inverse)',
  },
  border: {
    default: 'var(--border-default)',
    subtle: 'var(--border-subtle)',
    divider: 'var(--border-divider)',
    focus: 'var(--border-focus)',
  },
  icon: {
    default: 'var(--icon-default)',
    hover: 'var(--icon-hover)',
    active: 'var(--icon-active)',
    muted: 'var(--icon-muted)',
    onSolid: 'var(--icon-on-solid)',
    surface: 'var(--icon-surface)',
    surfaceHover: 'var(--icon-surface-hover)',
    surfaceActive: 'var(--icon-surface-active)',
  },
  accent: {
    primary: 'var(--accent-primary)',
    hover: 'var(--accent-hover)',
    pressed: 'var(--accent-pressed)',
    soft: 'var(--accent-soft)',
    subtle: 'var(--accent-subtle)',
    dark: 'var(--accent-dark)',
    heading: 'var(--accent-heading)',
  },
  nav: {
    hover: 'var(--nav-hover)',
    selected: 'var(--nav-selected)',
    iconBgSelected: 'var(--nav-icon-bg-selected)',
    iconBgHover: 'var(--nav-icon-bg-hover)',
  },
  shadow: {
    popup: 'var(--shadow-popup)',
    card: 'var(--shadow-card)',
    workspace: 'var(--shadow-workspace)',
    dropdown: 'var(--shadow-dropdown)',
  },
  status: {
    success: 'var(--status-success)',
    warning: 'var(--status-warning)',
    danger: 'var(--status-danger)',
    info: 'var(--status-info)',
  },
} as const;

export const TYPOGRAPHY_TOKENS = {
  fontFamily: {
    base: 'var(--font-family-base)',
  },
  fontWeight: {
    light: 'var(--font-weight-light)',
    regular: 'var(--font-weight-regular)',
    medium: 'var(--font-weight-medium)',
    semibold: 'var(--font-weight-semibold)',
    bold: 'var(--font-weight-bold)',
  },
} as const;

export const MOTION_TOKENS = {
  duration: {
    theme: 'var(--motion-duration-theme)',
  },
  easing: {
    standard: 'var(--motion-ease-standard)',
    emphasized: 'var(--motion-ease-emphasized)',
    exit: 'var(--motion-ease-exit)',
  },
} as const;

export const LAYOUT_TOKENS = {
  shell: {
    topbarHeight: 'var(--shell-topbar-height)',
    sidebarWidth: 'var(--shell-sidebar-width)',
    rightRailWidth: 'var(--shell-right-rail-width)',
    bottomBarHeight: 'var(--shell-bottom-bar-height)',
    utilityDrawerWidth: 'var(--shell-utility-drawer-width)',
    aiPanelWidth: 'var(--shell-ai-panel-width)',
  },
} as const;

export default THEME_TOKENS;
