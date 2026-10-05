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
  fontSize: {
    xs: 'var(--font-size-xs)',
    sm: 'var(--font-size-sm)',
    md: 'var(--font-size-md)',
    base: 'var(--font-size-base)',
    lg: 'var(--font-size-lg)',
    xl: 'var(--font-size-xl)',
    '2xl': 'var(--font-size-2xl)',
    '3xl': 'var(--font-size-3xl)',
  },
  fontWeight: {
    light: 'var(--font-weight-light)',
    regular: 'var(--font-weight-regular)',
    medium: 'var(--font-weight-medium)',
    semibold: 'var(--font-weight-semibold)',
    bold: 'var(--font-weight-bold)',
  },
  lineHeight: {
    tight: 'var(--line-height-tight)',
    snug: 'var(--line-height-snug)',
    normal: 'var(--line-height-normal)',
    relaxed: 'var(--line-height-relaxed)',
  },
  letterSpacing: {
    tight: 'var(--letter-spacing-tight)',
    normal: 'var(--letter-spacing-normal)',
    wide: 'var(--letter-spacing-wide)',
  },
  role: {
    pageTitle: {
      size: 'var(--font-page-title-size)',
      weight: 'var(--font-page-title-weight)',
      lineHeight: 'var(--font-page-title-line-height)',
      spacing: 'var(--font-page-title-spacing)',
    },
    sectionTitle: {
      size: 'var(--font-section-title-size)',
      weight: 'var(--font-section-title-weight)',
      lineHeight: 'var(--font-section-title-line-height)',
    },
    cardTitle: {
      size: 'var(--font-card-title-size)',
      weight: 'var(--font-card-title-weight)',
      lineHeight: 'var(--font-card-title-line-height)',
    },
    body: {
      size: 'var(--font-body-size)',
      weight: 'var(--font-body-weight)',
      lineHeight: 'var(--font-body-line-height)',
    },
    bodySm: {
      size: 'var(--font-body-sm-size)',
      weight: 'var(--font-body-sm-weight)',
      lineHeight: 'var(--font-body-sm-line-height)',
    },
    bodySecondary: {
      size: 'var(--font-body-secondary-size)',
      weight: 'var(--font-body-secondary-weight)',
      lineHeight: 'var(--font-body-secondary-line-height)',
    },
    formLabel: {
      size: 'var(--font-form-label-size)',
      weight: 'var(--font-form-label-weight)',
      lineHeight: 'var(--font-form-label-line-height)',
    },
    fieldLabel: {
      size: 'var(--text-field-label-size)',
      weight: 'var(--text-field-label-weight)',
      lineHeight: 'var(--text-field-label-line-height)',
    },
    formInput: {
      size: 'var(--font-form-input-size)',
      weight: 'var(--font-form-input-weight)',
      lineHeight: 'var(--font-form-input-line-height)',
    },
    fieldInput: {
      size: 'var(--text-field-input-size)',
      weight: 'var(--text-field-input-weight)',
      lineHeight: 'var(--text-field-input-line-height)',
    },
    formHelper: {
      size: 'var(--font-form-helper-size)',
      weight: 'var(--font-form-helper-weight)',
      lineHeight: 'var(--font-form-helper-line-height)',
    },
    fieldHelper: {
      size: 'var(--text-field-helper-size)',
      weight: 'var(--text-field-helper-weight)',
      lineHeight: 'var(--text-field-helper-line-height)',
    },
    formError: {
      size: 'var(--font-form-error-size)',
      weight: 'var(--font-form-error-weight)',
      lineHeight: 'var(--font-form-error-line-height)',
    },
    fieldError: {
      size: 'var(--text-field-error-size)',
      weight: 'var(--text-field-error-weight)',
      lineHeight: 'var(--text-field-error-line-height)',
    },
    tableHeader: {
      size: 'var(--font-table-header-size)',
      weight: 'var(--font-table-header-weight)',
      lineHeight: 'var(--font-table-header-line-height)',
    },
    tableCell: {
      size: 'var(--font-table-cell-size)',
      weight: 'var(--font-table-cell-weight)',
      lineHeight: 'var(--font-table-cell-line-height)',
    },
    tab: {
      size: 'var(--font-tab-size)',
      weight: 'var(--font-tab-weight)',
      lineHeight: 'var(--font-tab-line-height)',
    },
    button: {
      size: 'var(--font-button-size)',
      weight: 'var(--font-button-weight)',
      lineHeight: 'var(--font-button-line-height)',
    },
    caption: {
      size: 'var(--font-caption-size)',
      weight: 'var(--font-caption-weight)',
      lineHeight: 'var(--font-caption-line-height)',
    },
    overline: {
      size: 'var(--font-overline-size)',
      weight: 'var(--font-overline-weight)',
      spacing: 'var(--font-overline-spacing)',
      lineHeight: 'var(--font-overline-line-height)',
    },
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

export const SPACING_TOKENS = {
  space0: 'var(--space-0)',
  space0_5: 'var(--space-0-5)',
  space1: 'var(--space-1)',
  space1_5: 'var(--space-1-5)',
  space2: 'var(--space-2)',
  space3: 'var(--space-3)',
  space4: 'var(--space-4)',
  space5: 'var(--space-5)',
  space6: 'var(--space-6)',
  space8: 'var(--space-8)',
  space10: 'var(--space-10)',
  space12: 'var(--space-12)',
} as const;

export const RADIUS_TOKENS = {
  none: 'var(--radius-none)',
  xs: 'var(--radius-xs)',
  sm: 'var(--radius-sm)',
  md: 'var(--radius-md)',
  lg: 'var(--radius-lg)',
  xl: 'var(--radius-xl)',
  full: 'var(--radius-full)',
  card: 'var(--card-radius)',
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
