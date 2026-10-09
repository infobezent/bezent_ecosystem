# READ-ONLY Typography Audit — apps/web

> **Audit Scope:** All CSS and style definitions in `apps/web`.
> **Authoritative Specification:** [`apps/web/src/design-system/tokens/typography.css`](file:///e:/Company/bezent_ecosystem/apps/web/src/design-system/tokens/typography.css)
> **Date:** October 7, 2026
> **Audit Mode:** READ-ONLY (Zero files modified)

---

## 1. Executive Summary

- **Total Typography Declarations Without Canonical Tokens:** **1111**
  - **Hardcoded Literals (fixed px, numeric weights like 500/600/700, custom fonts, fixed line-heights):** **1048**
  - **Keyword Resets (`inherit`, `initial`, `unset`, `normal`):** **63**

### Breakdown by CSS Property

| Property | Occurrences | Status & Pattern |
| :--- | :--- | :--- |
| `font-size` | **552** | Hardcoded literals (e.g. `12px`, `13px`, `14px`, `500`, `600`, `1.4`) not consuming `var(--...)` |
| `font-weight` | **414** | Hardcoded literals (e.g. `12px`, `13px`, `14px`, `500`, `600`, `1.4`) not consuming `var(--...)` |
| `line-height` | **80** | Hardcoded literals (e.g. `12px`, `13px`, `14px`, `500`, `600`, `1.4`) not consuming `var(--...)` |
| `font-family` | **52** | Hardcoded literals (e.g. `12px`, `13px`, `14px`, `500`, `600`, `1.4`) not consuming `var(--...)` |
| `font` | **13** | Hardcoded literals (e.g. `12px`, `13px`, `14px`, `500`, `600`, `1.4`) not consuming `var(--...)` |

### Breakdown by Architectural Layer

| Architectural Layer | Occurrences | Primary Files Affected |
| :--- | :--- | :--- |
| **Global Styles (styles/)** | **386** | base.css, forms.css, profile.css |
| **Platform Utilities** | **346** | ApprovalsDrawer.css, ApprovalsPage.css, LoginPage.css |
| **Design System Components** | **259** | Alert.css, Avatar.css, Badge.css |
| **Global AppShell Layouts** | **84** | BottomBar.css, LeftSidebar.css, MoreLauncher.css |
| **Icon System** | **21** | icons.css |
| **App Infrastructure** | **15** | DesignSystemShowcase.css, DevPlaceholderPage.css, StandaloneUtilityLayout.css |

---

## 2. Font Families Used Besides Inter

BEZENT's canonical design system specifies **Inter** (`--font-family-base`) as the single product typeface.
The audit inspected all stylesheets, HTML files, external webfont links, and CSS rules to identify every font family used besides Inter:

| Font Family | Category / Purpose | File Location(s) |
| :--- | :--- | :--- |
| **`Material Symbols Outlined`** | Iconography webfont (Google Fonts) | [`index.html`](file:///e:/Company/bezent_ecosystem/apps/web/index.html), [`icons.css`](file:///e:/Company/bezent_ecosystem/apps/web/src/design-system/icons/components/icons.css), [`typography.css`](file:///e:/Company/bezent_ecosystem/apps/web/src/design-system/tokens/typography.css) |
| **`Google Sans`** | Fallback font stack | [`FormField.css`](file:///e:/Company/bezent_ecosystem/apps/web/src/design-system/components/FormField/FormField.css), [`Label.css`](file:///e:/Company/bezent_ecosystem/apps/web/src/design-system/components/Label/Label.css) |
| **`Segoe UI`** | System UI fallback stack | [`FormField.css`](file:///e:/Company/bezent_ecosystem/apps/web/src/design-system/components/FormField/FormField.css) |
| **`Roboto`** | System UI fallback stack | [`FormField.css`](file:///e:/Company/bezent_ecosystem/apps/web/src/design-system/components/FormField/FormField.css) |
| **`Arial Black`** | Decorative login brand logo | [`LoginPage.css`](file:///e:/Company/bezent_ecosystem/apps/web/src/platform/auth/LoginPage.css) |
| **`Gadget`** | Decorative login brand logo | [`LoginPage.css`](file:///e:/Company/bezent_ecosystem/apps/web/src/platform/auth/LoginPage.css) |

### Detailed Occurrences of Non-Inter Fonts:

#### `Material Symbols Outlined` (3 occurrences)

- [`index.html:1`](file:///e:/Company/bezent_ecosystem/apps/web/index.html#L1):
  ```css
  External Google Font stylesheet: fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200
  ```
- [`src/design-system/icons/components/icons.css:19`](file:///e:/Company/bezent_ecosystem/apps/web/src/design-system/icons/components/icons.css#L19):
  ```css
  font-family: 'Material Symbols Outlined', sans-serif !important;
  ```
- [`src/design-system/tokens/typography.css:1`](file:///e:/Company/bezent_ecosystem/apps/web/src/design-system/tokens/typography.css#L1):
  ```css
  External Google Font stylesheet: fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200
  ```

#### `Google Sans` (2 occurrences)

- [`src/design-system/components/FormField/FormField.css:81`](file:///e:/Company/bezent_ecosystem/apps/web/src/design-system/components/FormField/FormField.css#L81):
  ```css
  font-family: var( --font-family-base, 'Google Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif );
  ```
- [`src/design-system/components/Label/Label.css:7`](file:///e:/Company/bezent_ecosystem/apps/web/src/design-system/components/Label/Label.css#L7):
  ```css
  font-family: var(--font-family-base, 'Google Sans', sans-serif);
  ```

#### `Segoe UI` (1 occurrence)

- [`src/design-system/components/FormField/FormField.css:81`](file:///e:/Company/bezent_ecosystem/apps/web/src/design-system/components/FormField/FormField.css#L81):
  ```css
  font-family: var( --font-family-base, 'Google Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif );
  ```

#### `Roboto` (1 occurrence)

- [`src/design-system/components/FormField/FormField.css:81`](file:///e:/Company/bezent_ecosystem/apps/web/src/design-system/components/FormField/FormField.css#L81):
  ```css
  font-family: var( --font-family-base, 'Google Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif );
  ```

#### `Arial Black` (1 occurrence)

- [`src/platform/auth/LoginPage.css:117`](file:///e:/Company/bezent_ecosystem/apps/web/src/platform/auth/LoginPage.css#L117):
  ```css
  font-family: 'Arial Black', Gadget, sans-serif;
  ```

#### `Gadget` (1 occurrence)

- [`src/platform/auth/LoginPage.css:117`](file:///e:/Company/bezent_ecosystem/apps/web/src/platform/auth/LoginPage.css#L117):
  ```css
  font-family: 'Arial Black', Gadget, sans-serif;
  ```

---

## 3. Comprehensive File-by-File Inventory

Below is the complete inventory of all 1111 typography declarations across all 55 affected files in `apps/web`, sorted by frequency:

### [`src/design-system/styles/forms.css`](file:///e:/Company/bezent_ecosystem/apps/web/src/design-system/styles/forms.css) (197 instances — Global Styles (styles/))

| Line | Property | Hardcoded / Current Value | Code Snippet |
| :--- | :--- | :--- | :--- |
| 55 | `font-size` | `var(--form-font-size-label, 14px)` | `font-size: var(--form-font-size-label, 14px);` |
| 56 | `font-weight` | `600` | `font-weight: 600;` |
| 65 | `font-weight` | `700` | `font-weight: 700;` |
| 83 | `font` | `inherit` | `font: inherit;` |
| 84 | `font-size` | `var(--form-font-size-input, 14px)` | `font-size: var(--form-font-size-input, 14px);` |
| 145 | `font` | `inherit` | `font: inherit;` |
| 146 | `font-size` | `var(--form-font-size-input, 14px)` | `font-size: var(--form-font-size-input, 14px);` |
| 197 | `font-size` | `0` | `font-size: 0 !important;` |
| 221 | `font-size` | `13px` | `font-size: 13px;` |
| 247 | `font` | `inherit` | `font: inherit;` |
| 248 | `font-size` | `var(--form-font-size-input, 14px)` | `font-size: var(--form-font-size-input, 14px);` |
| 251 | `line-height` | `1.45` | `line-height: 1.45;` |
| 301 | `font-size` | `var(--form-font-size-title, 20px)` | `font-size: var(--form-font-size-title, 20px);` |
| 302 | `font-weight` | `700` | `font-weight: 700;` |
| 306 | `line-height` | `1.3` | `line-height: 1.3;` |
| 310 | `font-size` | `var(--form-font-size-subtitle, 14px)` | `font-size: var(--form-font-size-subtitle, 14px);` |
| 313 | `line-height` | `1.45` | `line-height: 1.45;` |
| 328 | `font-size` | `var(--form-font-size-input, 14px)` | `font-size: var(--form-font-size-input, 14px);` |
| 329 | `font-weight` | `600` | `font-weight: 600;` |
| 355 | `font-size` | `13px` | `font-size: 13px;` |
| 356 | `font-weight` | `600` | `font-weight: 600;` |
| 388 | `font-size` | `13px` | `font-size: 13px;` |
| 389 | `font-weight` | `500` | `font-weight: 500;` |
| 395 | `font-size` | `12.5px` | `font-size: 12.5px;` |
| 396 | `font-weight` | `500` | `font-weight: 500;` |
| 401 | `font-size` | `14px` | `font-size: 14px;` |
| 402 | `font-weight` | `600` | `font-weight: 600;` |
| 407 | `font-weight` | `400` | `font-weight: 400;` |
| 429 | `font-size` | `var(--form-font-size-section-label, 13px)` | `font-size: var(--form-font-size-section-label, 13px);` |
| 430 | `font-weight` | `700` | `font-weight: 700;` |
| 438 | `font-size` | `var(--form-font-size-subtitle, 13.5px)` | `font-size: var(--form-font-size-subtitle, 13.5px);` |
| 498 | `font-size` | `var(--form-font-size-card-title, 16px)` | `font-size: var(--form-font-size-card-title, 16px);` |
| 499 | `font-weight` | `700` | `font-weight: 700;` |
| 557 | `font-size` | `var(--form-font-size-badge, 12px)` | `font-size: var(--form-font-size-badge, 12px);` |
| 558 | `font-weight` | `700` | `font-weight: 700;` |
| 591 | `font` | `inherit` | `font: inherit;` |
| 592 | `font-size` | `var(--form-font-size-input, 14px)` | `font-size: var(--form-font-size-input, 14px);` |
| 609 | `font-size` | `var(--form-font-size-input, 14px)` | `font-size: var(--form-font-size-input, 14px);` |
| 610 | `font-weight` | `500` | `font-weight: 500;` |
| 615 | `font-size` | `var(--form-font-size-hint, 12px)` | `font-size: var(--form-font-size-hint, 12px);` |
| 617 | `font-weight` | `500` | `font-weight: 500;` |
| 628 | `font-size` | `var(--form-font-size-badge, 12px)` | `font-size: var(--form-font-size-badge, 12px);` |
| 629 | `font-weight` | `600` | `font-weight: 600;` |
| 671 | `font-size` | `26px` | `font-size: 26px;` |
| 672 | `font-weight` | `700` | `font-weight: 700;` |
| 686 | `font-size` | `var(--form-font-size-card-title, 15px)` | `font-size: var(--form-font-size-card-title, 15px);` |
| 687 | `font-weight` | `600` | `font-weight: 600;` |
| 692 | `font-size` | `var(--form-font-size-hint, 13px)` | `font-size: var(--form-font-size-hint, 13px);` |
| 712 | `font-size` | `var(--form-font-size-subtitle, 13px)` | `font-size: var(--form-font-size-subtitle, 13px);` |
| 713 | `font-weight` | `600` | `font-weight: 600;` |
| 733 | `font-size` | `var(--form-font-size-subtitle, 13px)` | `font-size: var(--form-font-size-subtitle, 13px);` |
| 734 | `font-weight` | `600` | `font-weight: 600;` |
| 766 | `font-size` | `var(--form-font-size-card-title, 15px)` | `font-size: var(--form-font-size-card-title, 15px);` |
| 767 | `font-weight` | `600` | `font-weight: 600;` |
| 772 | `font-size` | `var(--form-font-size-subtitle, 13.5px)` | `font-size: var(--form-font-size-subtitle, 13.5px);` |
| 787 | `font-size` | `var(--form-font-size-subtitle, 13px)` | `font-size: var(--form-font-size-subtitle, 13px);` |
| 788 | `font-weight` | `600` | `font-weight: 600;` |
| 827 | `font-size` | `var(--form-font-size-card-title, 15px)` | `font-size: var(--form-font-size-card-title, 15px);` |
| 828 | `font-weight` | `600` | `font-weight: 600;` |
| 833 | `font-size` | `11px` | `font-size: 11px;` |
| 834 | `font-weight` | `700` | `font-weight: 700;` |
| 856 | `font-size` | `var(--form-font-size-badge, 12px)` | `font-size: var(--form-font-size-badge, 12px);` |
| 857 | `font-weight` | `600` | `font-weight: 600;` |
| 887 | `font-size` | `var(--form-font-size-hint, 12px)` | `font-size: var(--form-font-size-hint, 12px);` |
| 888 | `font-weight` | `600` | `font-weight: 600;` |
| 903 | `font-size` | `var(--form-font-size-hint, 12px)` | `font-size: var(--form-font-size-hint, 12px);` |
| 904 | `font-weight` | `600` | `font-weight: 600;` |
| 924 | `font-size` | `var(--form-font-size-hint, 13px)` | `font-size: var(--form-font-size-hint, 13px);` |
| 925 | `font-weight` | `400` | `font-weight: 400;` |
| 941 | `font-size` | `var(--form-font-size-subtitle, 13px)` | `font-size: var(--form-font-size-subtitle, 13px);` |
| 942 | `font-weight` | `600` | `font-weight: 600;` |
| 962 | `font-size` | `var(--form-font-size-subtitle, 13.5px)` | `font-size: var(--form-font-size-subtitle, 13.5px);` |
| 963 | `font-weight` | `600` | `font-weight: 600;` |
| 968 | `font-size` | `var(--form-font-size-hint, 12px)` | `font-size: var(--form-font-size-hint, 12px);` |
| 974 | `font-size` | `var(--form-font-size-hint, 12px)` | `font-size: var(--form-font-size-hint, 12px);` |
| 975 | `font-weight` | `600` | `font-weight: 600;` |
| 1023 | `font-size` | `var(--form-font-size-card-title, 15px)` | `font-size: var(--form-font-size-card-title, 15px);` |
| 1024 | `font-weight` | `600` | `font-weight: 600;` |
| 1029 | `font-size` | `var(--form-font-size-hint, 13px)` | `font-size: var(--form-font-size-hint, 13px);` |
| 1042 | `font-size` | `var(--form-font-size-subtitle, 13px)` | `font-size: var(--form-font-size-subtitle, 13px);` |
| 1043 | `font-weight` | `600` | `font-weight: 600;` |
| 1065 | `font-size` | `var(--form-font-size-badge, 12px)` | `font-size: var(--form-font-size-badge, 12px);` |
| 1066 | `font-weight` | `700` | `font-weight: 700;` |
| 1081 | `font-size` | `var(--form-font-size-label, 14px)` | `font-size: var(--form-font-size-label, 14px);` |
| 1082 | `font-weight` | `700` | `font-weight: 700;` |
| 1094 | `font-size` | `var(--form-font-size-subtitle, 13.5px)` | `font-size: var(--form-font-size-subtitle, 13.5px);` |
| 1105 | `font-weight` | `600` | `font-weight: 600;` |
| 1123 | `font-size` | `var(--form-font-size-badge, 12px)` | `font-size: var(--form-font-size-badge, 12px);` |
| 1124 | `font-weight` | `600` | `font-weight: 600;` |
| 1137 | `font-size` | `var(--form-font-size-subtitle, 13.5px)` | `font-size: var(--form-font-size-subtitle, 13.5px);` |
| 1161 | `font-size` | `var(--form-font-size-label, 14px)` | `font-size: var(--form-font-size-label, 14px);` |
| 1162 | `font-weight` | `700` | `font-weight: 700;` |
| 1168 | `font-size` | `var(--form-font-size-hint, 13px)` | `font-size: var(--form-font-size-hint, 13px);` |
| 1221 | `font-size` | `var(--form-font-size-subtitle, 13px)` | `font-size: var(--form-font-size-subtitle, 13px);` |
| 1222 | `font-weight` | `700` | `font-weight: 700;` |
| 1236 | `font-size` | `var(--form-font-size-subtitle, 13px)` | `font-size: var(--form-font-size-subtitle, 13px);` |
| 1237 | `font-weight` | `600` | `font-weight: 600;` |
| 1271 | `font-size` | `var(--form-font-size-label, 14px)` | `font-size: var(--form-font-size-label, 14px);` |
| 1272 | `font-weight` | `700` | `font-weight: 700;` |
| 1278 | `font-size` | `var(--form-font-size-hint, 12px)` | `font-size: var(--form-font-size-hint, 12px);` |
| 1292 | `font-size` | `var(--form-font-size-hint, 12px)` | `font-size: var(--form-font-size-hint, 12px);` |
| 1293 | `font-weight` | `600` | `font-weight: 600;` |
| 1312 | `font-size` | `var(--form-font-size-subtitle, 13.5px)` | `font-size: var(--form-font-size-subtitle, 13.5px);` |
| 1334 | `font-size` | `var(--form-font-size-hint, 13px)` | `font-size: var(--form-font-size-hint, 13px);` |
| 1339 | `font-size` | `var(--form-font-size-card-title, 15px)` | `font-size: var(--form-font-size-card-title, 15px);` |
| 1340 | `font-weight` | `700` | `font-weight: 700;` |
| 1361 | `font-size` | `var(--form-font-size-input, 14px)` | `font-size: var(--form-font-size-input, 14px);` |
| 1362 | `font-weight` | `600` | `font-weight: 600;` |
| 1372 | `font-size` | `11px` | `font-size: 11px;` |
| 1373 | `font-weight` | `700` | `font-weight: 700;` |
| 1383 | `font-size` | `13px` | `font-size: 13px;` |
| 1400 | `font-size` | `var(--form-font-size-input, 14px)` | `font-size: var(--form-font-size-input, 14px);` |
| 1401 | `font-weight` | `600` | `font-weight: 600;` |
| 1417 | `font-size` | `var(--form-font-size-card-title, 16px)` | `font-size: var(--form-font-size-card-title, 16px);` |
| 1418 | `font-weight` | `700` | `font-weight: 700;` |
| 1437 | `font-size` | `var(--form-font-size-card-title, 15px)` | `font-size: var(--form-font-size-card-title, 15px);` |
| 1438 | `font-weight` | `700` | `font-weight: 700;` |
| 1444 | `font-size` | `var(--form-font-size-badge, 12px)` | `font-size: var(--form-font-size-badge, 12px);` |
| 1445 | `font-weight` | `600` | `font-weight: 600;` |
| 1462 | `font-size` | `var(--form-font-size-hint, 12px)` | `font-size: var(--form-font-size-hint, 12px);` |
| 1463 | `font-weight` | `600` | `font-weight: 600;` |
| 1487 | `font-size` | `var(--form-font-size-subtitle, 13px)` | `font-size: var(--form-font-size-subtitle, 13px);` |
| 1496 | `font-weight` | `600` | `font-weight: 600;` |
| 1540 | `font-size` | `var(--form-font-size-subtitle, 12px)` | `font-size: var(--form-font-size-subtitle, 12px);` |
| 1541 | `font-weight` | `700` | `font-weight: 700;` |
| 1557 | `font-size` | `var(--form-font-size-subtitle, 13.5px)` | `font-size: var(--form-font-size-subtitle, 13.5px);` |
| 1558 | `font-weight` | `600` | `font-weight: 600;` |
| 1563 | `font-size` | `var(--form-font-size-subtitle, 13.5px)` | `font-size: var(--form-font-size-subtitle, 13.5px);` |
| 1586 | `font-size` | `var(--form-font-size-card-title, 16px)` | `font-size: var(--form-font-size-card-title, 16px);` |
| 1587 | `font-weight` | `700` | `font-weight: 700;` |
| 1604 | `font-size` | `var(--form-font-size-subtitle, 13.5px)` | `font-size: var(--form-font-size-subtitle, 13.5px);` |
| 1630 | `font-size` | `var(--form-font-size-hint, 12px)` | `font-size: var(--form-font-size-hint, 12px);` |
| 1631 | `font-weight` | `600` | `font-weight: 600;` |
| 1641 | `font-weight` | `700` | `font-weight: 700;` |
| 1650 | `font-weight` | `700` | `font-weight: 700;` |
| 1704 | `font-size` | `15px` | `font-size: 15px;` |
| 1708 | `font-size` | `var(--form-font-size-badge, 12px)` | `font-size: var(--form-font-size-badge, 12px);` |
| 1709 | `font-weight` | `700` | `font-weight: 700;` |
| 1757 | `font-size` | `10px` | `font-size: 10px;` |
| 1769 | `font-size` | `var(--form-font-size-card-title, 15px)` | `font-size: var(--form-font-size-card-title, 15px);` |
| 1770 | `font-weight` | `700` | `font-weight: 700;` |
| 1776 | `font-size` | `var(--form-font-size-hint, 13px)` | `font-size: var(--form-font-size-hint, 13px);` |
| 1793 | `font-size` | `var(--form-font-size-section-label, 12px)` | `font-size: var(--form-font-size-section-label, 12px);` |
| 1794 | `font-weight` | `600` | `font-weight: 600;` |
| 1801 | `font-size` | `var(--form-font-size-input, 14px)` | `font-size: var(--form-font-size-input, 14px);` |
| 1802 | `font-weight` | `500` | `font-weight: 500;` |
| 1820 | `font-size` | `var(--form-font-size-subtitle, 14px)` | `font-size: var(--form-font-size-subtitle, 14px);` |
| 1821 | `font-weight` | `700` | `font-weight: 700;` |
| 1861 | `font-size` | `var(--form-font-size-input, 14px)` | `font-size: var(--form-font-size-input, 14px);` |
| 1862 | `font-weight` | `700` | `font-weight: 700;` |
| 1867 | `font-size` | `11px` | `font-size: 11px;` |
| 1868 | `font-weight` | `600` | `font-weight: 600;` |
| 1877 | `font-size` | `11px` | `font-size: 11px;` |
| 1878 | `font-weight` | `700` | `font-weight: 700;` |
| 1889 | `font-size` | `var(--form-font-size-hint, 13px)` | `font-size: var(--form-font-size-hint, 13px);` |
| 1899 | `font-size` | `var(--form-font-size-hint, 12px)` | `font-size: var(--form-font-size-hint, 12px);` |
| 1900 | `font-weight` | `600` | `font-weight: 600;` |
| 1919 | `font-size` | `var(--form-font-size-subtitle, 13px)` | `font-size: var(--form-font-size-subtitle, 13px);` |
| 1920 | `font-weight` | `600` | `font-weight: 600;` |
| 1939 | `font-size` | `var(--form-font-size-hint, 12px)` | `font-size: var(--form-font-size-hint, 12px);` |
| 1940 | `font-weight` | `600` | `font-weight: 600;` |
| 1982 | `font-size` | `var(--form-font-size-subtitle, 13.5px)` | `font-size: var(--form-font-size-subtitle, 13.5px);` |
| 1990 | `font-size` | `14.5px` | `font-size: 14.5px;` |
| 1991 | `font-weight` | `600` | `font-weight: 600;` |
| 2012 | `font-size` | `20px` | `font-size: 20px;` |
| 2018 | `font-size` | `var(--form-font-size-input, 14px)` | `font-size: var(--form-font-size-input, 14px);` |
| 2044 | `font-size` | `var(--form-font-size-hint, 12px)` | `font-size: var(--form-font-size-hint, 12px);` |
| 2045 | `font-weight` | `600` | `font-weight: 600;` |
| 2067 | `font-size` | `var(--form-font-size-subtitle, 13px)` | `font-size: var(--form-font-size-subtitle, 13px);` |
| 2068 | `font-weight` | `600` | `font-weight: 600;` |
| 2086 | `font-weight` | `600` | `font-weight: 600;` |
| 2087 | `font-size` | `var(--form-font-size-subtitle, 13px)` | `font-size: var(--form-font-size-subtitle, 13px);` |
| 2131 | `font-size` | `var(--form-font-size-card-title, 16px)` | `font-size: var(--form-font-size-card-title, 16px);` |
| 2132 | `font-weight` | `700` | `font-weight: 700;` |
| 2141 | `font-size` | `14px` | `font-size: 14px;` |
| 2176 | `font-size` | `var(--form-font-size-input, 14px)` | `font-size: var(--form-font-size-input, 14px);` |
| 2177 | `font-weight` | `600` | `font-weight: 600;` |
| 2182 | `font-size` | `var(--form-font-size-hint, 13px)` | `font-size: var(--form-font-size-hint, 13px);` |
| 2190 | `font-size` | `var(--form-font-size-hint, 13px)` | `font-size: var(--form-font-size-hint, 13px);` |
| 2197 | `font-size` | `var(--form-font-size-hint, 12px)` | `font-size: var(--form-font-size-hint, 12px);` |
| 2199 | `font-weight` | `500` | `font-weight: 500;` |
| 2221 | `font-size` | `var(--form-font-size-hint, 12px)` | `font-size: var(--form-font-size-hint, 12px);` |
| 2222 | `font-weight` | `600` | `font-weight: 600;` |
| 2242 | `font-size` | `12px` | `font-size: 12px;` |
| 2243 | `font-weight` | `600` | `font-weight: 600;` |
| 2287 | `font-size` | `var(--form-font-size-subtitle, 13px)` | `font-size: var(--form-font-size-subtitle, 13px);` |
| 2288 | `font-weight` | `600` | `font-weight: 600;` |
| 2312 | `font-size` | `11px` | `font-size: 11px;` |
| 2313 | `font-weight` | `700` | `font-weight: 700;` |
| 2342 | `font-size` | `var(--form-font-size-input, 14px)` | `font-size: var(--form-font-size-input, 14px);` |
| 2343 | `font-weight` | `600` | `font-weight: 600;` |
| 2349 | `font-size` | `var(--form-font-size-hint, 13.5px)` | `font-size: var(--form-font-size-hint, 13.5px);` |
| 2350 | `font-weight` | `400` | `font-weight: 400;` |
| 2361 | `font-size` | `var(--form-font-size-hint, 11px)` | `font-size: var(--form-font-size-hint, 11px);` |
| 2362 | `font-weight` | `600` | `font-weight: 600;` |
| 2402 | `font-size` | `12px` | `font-size: 12px;` |
| 2403 | `font-weight` | `600` | `font-weight: 600;` |

### [`src/design-system/styles/profile.css`](file:///e:/Company/bezent_ecosystem/apps/web/src/design-system/styles/profile.css) (188 instances — Global Styles (styles/))

| Line | Property | Hardcoded / Current Value | Code Snippet |
| :--- | :--- | :--- | :--- |
| 45 | `font-size` | `13px` | `font-size: 13px;` |
| 46 | `font-weight` | `500` | `font-weight: 500;` |
| 130 | `font-size` | `32px` | `font-size: 32px;` |
| 131 | `font-weight` | `700` | `font-weight: 700;` |
| 178 | `font-size` | `22px` | `font-size: 22px;` |
| 179 | `font-weight` | `700` | `font-weight: 700;` |
| 185 | `font-size` | `13.5px` | `font-size: 13.5px;` |
| 196 | `font-size` | `13px` | `font-size: 13px;` |
| 207 | `font-size` | `11px` | `font-size: 11px;` |
| 229 | `font-size` | `13.5px` | `font-size: 13.5px;` |
| 230 | `font-weight` | `700` | `font-weight: 700;` |
| 245 | `font-size` | `12.5px` | `font-size: 12.5px;` |
| 253 | `font-weight` | `500` | `font-weight: 500;` |
| 263 | `font-weight` | `500` | `font-weight: 500;` |
| 280 | `font-size` | `13.5px` | `font-size: 13.5px;` |
| 281 | `font-weight` | `600` | `font-weight: 600;` |
| 289 | `font-size` | `26px` | `font-size: 26px;` |
| 290 | `font-weight` | `700` | `font-weight: 700;` |
| 294 | `line-height` | `1.1` | `line-height: 1.1;` |
| 298 | `font-size` | `12px` | `font-size: 12px;` |
| 315 | `font-size` | `18px` | `font-size: 18px;` |
| 316 | `font-weight` | `700` | `font-weight: 700;` |
| 330 | `font-size` | `13.5px` | `font-size: 13.5px;` |
| 353 | `font-size` | `13.5px` | `font-size: 13.5px;` |
| 363 | `font-weight` | `500` | `font-weight: 500;` |
| 368 | `font-weight` | `600` | `font-weight: 600;` |
| 422 | `font-size` | `14px` | `font-size: 14px;` |
| 423 | `font-weight` | `700` | `font-weight: 700;` |
| 439 | `font-size` | `13px` | `font-size: 13px;` |
| 440 | `font-weight` | `600` | `font-weight: 600;` |
| 445 | `font-size` | `11.5px` | `font-size: 11.5px;` |
| 506 | `font-size` | `13px` | `font-size: 13px;` |
| 511 | `font-weight` | `500` | `font-weight: 500;` |
| 518 | `font-weight` | `600` | `font-weight: 600;` |
| 528 | `font-size` | `16px` | `font-size: 16px;` |
| 529 | `font-weight` | `700` | `font-weight: 700;` |
| 534 | `font-size` | `13.5px` | `font-size: 13.5px;` |
| 539 | `font-size` | `13px` | `font-size: 13px;` |
| 544 | `font-size` | `13px` | `font-size: 13px;` |
| 545 | `font-weight` | `500` | `font-weight: 500;` |
| 550 | `font-size` | `12px` | `font-size: 12px;` |
| 604 | `font-size` | `12.5px` | `font-size: 12.5px;` |
| 605 | `font-weight` | `500` | `font-weight: 500;` |
| 610 | `font-size` | `15px` | `font-size: 15px;` |
| 611 | `font-weight` | `700` | `font-weight: 700;` |
| 616 | `font-size` | `13.5px` | `font-size: 13.5px;` |
| 617 | `font-weight` | `500` | `font-weight: 500;` |
| 654 | `font-size` | `13px` | `font-size: 13px;` |
| 655 | `font-weight` | `500` | `font-weight: 500;` |
| 688 | `font-size` | `13.5px` | `font-size: 13.5px;` |
| 689 | `font-weight` | `500` | `font-weight: 500;` |
| 732 | `font-size` | `11px` | `font-size: 11px;` |
| 733 | `font-weight` | `700` | `font-weight: 700;` |
| 734 | `line-height` | `1` | `line-height: 1;` |
| 767 | `font-size` | `13.5px` | `font-size: 13.5px;` |
| 768 | `font-weight` | `600` | `font-weight: 600;` |
| 783 | `font-size` | `11px` | `font-size: 11px;` |
| 784 | `font-weight` | `600` | `font-weight: 600;` |
| 807 | `font-size` | `13px` | `font-size: 13px;` |
| 865 | `font-size` | `13px` | `font-size: 13px;` |
| 893 | `font-size` | `12.5px` | `font-size: 12.5px;` |
| 894 | `font-weight` | `500` | `font-weight: 500;` |
| 918 | `font-size` | `13px` | `font-size: 13px;` |
| 924 | `font-size` | `13px` | `font-size: 13px;` |
| 925 | `font-weight` | `500` | `font-weight: 500;` |
| 935 | `font-size` | `12.5px` | `font-size: 12.5px;` |
| 936 | `font-weight` | `500` | `font-weight: 500;` |
| 955 | `font-size` | `14px` | `font-size: 14px;` |
| 956 | `line-height` | `1` | `line-height: 1;` |
| 963 | `font-size` | `13px` | `font-size: 13px;` |
| 964 | `font-weight` | `500` | `font-weight: 500;` |
| 973 | `font-size` | `16px` | `font-size: 16px;` |
| 974 | `font-weight` | `700` | `font-weight: 700;` |
| 1020 | `font-size` | `15px` | `font-size: 15px;` |
| 1021 | `font-weight` | `700` | `font-weight: 700;` |
| 1066 | `font-size` | `15.5px` | `font-size: 15.5px;` |
| 1067 | `font-weight` | `700` | `font-weight: 700;` |
| 1087 | `font-size` | `12px` | `font-size: 12px;` |
| 1088 | `font-weight` | `600` | `font-weight: 600;` |
| 1119 | `font-size` | `13px` | `font-size: 13px;` |
| 1120 | `font-weight` | `400` | `font-weight: 400;` |
| 1140 | `font-size` | `12px` | `font-size: 12px;` |
| 1141 | `font-weight` | `600` | `font-weight: 600;` |
| 1160 | `font-size` | `12px` | `font-size: 12px;` |
| 1161 | `font-weight` | `600` | `font-weight: 600;` |
| 1170 | `font-size` | `13px` | `font-size: 13px;` |
| 1178 | `font-size` | `12.5px` | `font-size: 12.5px;` |
| 1191 | `font-size` | `11px` | `font-size: 11px;` |
| 1203 | `font-size` | `13.5px` | `font-size: 13.5px;` |
| 1204 | `font-weight` | `600` | `font-weight: 600;` |
| 1256 | `font-size` | `15.5px` | `font-size: 15.5px;` |
| 1257 | `font-weight` | `700` | `font-weight: 700;` |
| 1263 | `font-size` | `13px` | `font-size: 13px;` |
| 1270 | `font-size` | `12.5px` | `font-size: 12.5px;` |
| 1272 | `font-weight` | `500` | `font-weight: 500;` |
| 1282 | `font-size` | `13px` | `font-size: 13px;` |
| 1299 | `font-size` | `13px` | `font-size: 13px;` |
| 1300 | `font-weight` | `600` | `font-weight: 600;` |
| 1360 | `font-size` | `13px` | `font-size: 13px;` |
| 1361 | `font-weight` | `600` | `font-weight: 600;` |
| 1390 | `font-size` | `14px` | `font-size: 14px;` |
| 1391 | `font-weight` | `500` | `font-weight: 500;` |
| 1398 | `font-weight` | `600` | `font-weight: 600;` |
| 1403 | `font-weight` | `500` | `font-weight: 500;` |
| 1499 | `font-size` | `18px` | `font-size: 18px;` |
| 1500 | `font-weight` | `700` | `font-weight: 700;` |
| 1518 | `font-size` | `26px` | `font-size: 26px;` |
| 1519 | `font-weight` | `700` | `font-weight: 700;` |
| 1547 | `font-size` | `11px` | `font-size: 11px;` |
| 1549 | `line-height` | `1.2` | `line-height: 1.2;` |
| 1562 | `font-size` | `13px` | `font-size: 13px;` |
| 1627 | `font-size` | `15px` | `font-size: 15px;` |
| 1628 | `font-weight` | `600` | `font-weight: 600;` |
| 1671 | `font-size` | `11px` | `font-size: 11px;` |
| 1672 | `font-weight` | `700` | `font-weight: 700;` |
| 1691 | `font-size` | `18px` | `font-size: 18px;` |
| 1692 | `font-weight` | `700` | `font-weight: 700;` |
| 1715 | `font-size` | `15px` | `font-size: 15px;` |
| 1716 | `font-weight` | `600` | `font-weight: 600;` |
| 1718 | `line-height` | `1.25` | `line-height: 1.25;` |
| 1723 | `font-size` | `12px` | `font-size: 12px;` |
| 1743 | `font-size` | `13px` | `font-size: 13px;` |
| 1757 | `font-size` | `13px` | `font-size: 13px;` |
| 1766 | `font-size` | `12px` | `font-size: 12px;` |
| 1787 | `font-size` | `11px` | `font-size: 11px;` |
| 1788 | `font-weight` | `700` | `font-weight: 700;` |
| 1799 | `font-size` | `14px` | `font-size: 14px;` |
| 1800 | `font-weight` | `500` | `font-weight: 500;` |
| 1855 | `font-size` | `20px` | `font-size: 20px;` |
| 1856 | `font-weight` | `700` | `font-weight: 700;` |
| 1867 | `font-size` | `14px` | `font-size: 14px;` |
| 1868 | `font-weight` | `700` | `font-weight: 700;` |
| 1874 | `font-size` | `12px` | `font-size: 12px;` |
| 1908 | `font-size` | `13px` | `font-size: 13px;` |
| 1909 | `font-weight` | `700` | `font-weight: 700;` |
| 1925 | `font-size` | `12px` | `font-size: 12px;` |
| 1933 | `font-weight` | `600` | `font-weight: 600;` |
| 1968 | `font-size` | `20px` | `font-size: 20px;` |
| 1969 | `font-weight` | `700` | `font-weight: 700;` |
| 1974 | `font-size` | `18px` | `font-size: 18px;` |
| 1975 | `font-weight` | `700` | `font-weight: 700;` |
| 2009 | `font-size` | `14px` | `font-size: 14px;` |
| 2013 | `font-weight` | `700` | `font-weight: 700;` |
| 2017 | `font-size` | `11px` | `font-size: 11px;` |
| 2025 | `font-size` | `12px` | `font-size: 12px;` |
| 2032 | `font-size` | `12px` | `font-size: 12px;` |
| 2036 | `font-weight` | `600` | `font-weight: 600;` |
| 2040 | `font-size` | `12px` | `font-size: 12px;` |
| 2042 | `line-height` | `1.4` | `line-height: 1.4;` |
| 2067 | `font-size` | `18px` | `font-size: 18px;` |
| 2075 | `font-size` | `13px` | `font-size: 13px;` |
| 2086 | `font-size` | `13px` | `font-size: 13px;` |
| 2087 | `font-weight` | `500` | `font-weight: 500;` |
| 2098 | `font-size` | `12px` | `font-size: 12px;` |
| 2103 | `font-weight` | `500` | `font-weight: 500;` |
| 2134 | `font-size` | `18px` | `font-size: 18px;` |
| 2135 | `font-weight` | `700` | `font-weight: 700;` |
| 2162 | `font-size` | `20px` | `font-size: 20px;` |
| 2163 | `font-weight` | `700` | `font-weight: 700;` |
| 2165 | `line-height` | `1.25` | `line-height: 1.25;` |
| 2172 | `font-size` | `13px` | `font-size: 13px;` |
| 2179 | `font-size` | `10px` | `font-size: 10px;` |
| 2186 | `font-size` | `12.5px` | `font-size: 12.5px;` |
| 2219 | `font-size` | `15px` | `font-size: 15px;` |
| 2220 | `font-weight` | `700` | `font-weight: 700;` |
| 2245 | `font-size` | `12px` | `font-size: 12px;` |
| 2246 | `font-weight` | `500` | `font-weight: 500;` |
| 2251 | `font-size` | `14px` | `font-size: 14px;` |
| 2252 | `font-weight` | `600` | `font-weight: 600;` |
| 2366 | `font-size` | `20px` | `font-size: 20px;` |
| 2367 | `font-weight` | `700` | `font-weight: 700;` |
| 2369 | `line-height` | `1.2` | `line-height: 1.2;` |
| 2376 | `font-size` | `12.5px` | `font-size: 12.5px;` |
| 2377 | `font-weight` | `500` | `font-weight: 500;` |
| 2426 | `font-size` | `15px` | `font-size: 15px;` |
| 2427 | `font-weight` | `700` | `font-weight: 700;` |
| 2432 | `font-size` | `13px` | `font-size: 13px;` |
| 2433 | `font-weight` | `500` | `font-weight: 500;` |
| 2460 | `font-size` | `13.5px` | `font-size: 13.5px;` |
| 2474 | `font-weight` | `500` | `font-weight: 500;` |
| 2479 | `font-weight` | `600` | `font-weight: 600;` |
| 2535 | `font-size` | `13.5px` | `font-size: 13.5px;` |
| 2536 | `font-weight` | `600` | `font-weight: 600;` |
| 2589 | `font-size` | `13px` | `font-size: 13px;` |
| 2590 | `font-weight` | `600` | `font-weight: 600;` |
| 2595 | `font-size` | `12px` | `font-size: 12px;` |
| 2600 | `font-size` | `12px` | `font-size: 12px;` |
| 2606 | `font-size` | `12.5px` | `font-size: 12.5px;` |

### [`src/platform/calendar/CalendarPage.css`](file:///e:/Company/bezent_ecosystem/apps/web/src/platform/calendar/CalendarPage.css) (57 instances — Platform Utilities)

| Line | Property | Hardcoded / Current Value | Code Snippet |
| :--- | :--- | :--- | :--- |
| 40 | `font-size` | `18px` | `font-size: 18px;` |
| 41 | `font-weight` | `600` | `font-weight: 600;` |
| 63 | `font-family` | `inherit` | `font-family: inherit;` |
| 64 | `font-size` | `13.5px` | `font-size: 13.5px;` |
| 65 | `font-weight` | `500` | `font-weight: 500;` |
| 103 | `font-size` | `20px` | `font-size: 20px;` |
| 104 | `font-weight` | `500` | `font-weight: 500;` |
| 130 | `font-family` | `inherit` | `font-family: inherit;` |
| 131 | `font-size` | `13px` | `font-size: 13px;` |
| 132 | `font-weight` | `500` | `font-weight: 500;` |
| 141 | `font-weight` | `600` | `font-weight: 600;` |
| 155 | `font-family` | `inherit` | `font-family: inherit;` |
| 156 | `font-size` | `13.5px` | `font-size: 13.5px;` |
| 157 | `font-weight` | `600` | `font-weight: 600;` |
| 201 | `font-family` | `inherit` | `font-family: inherit;` |
| 202 | `font-size` | `14px` | `font-size: 14px;` |
| 203 | `font-weight` | `600` | `font-weight: 600;` |
| 237 | `font-size` | `13px` | `font-size: 13px;` |
| 238 | `font-weight` | `600` | `font-weight: 600;` |
| 273 | `font-size` | `11px` | `font-size: 11px;` |
| 274 | `font-weight` | `600` | `font-weight: 600;` |
| 285 | `font-size` | `11.5px` | `font-size: 11.5px;` |
| 286 | `font-weight` | `500` | `font-weight: 500;` |
| 308 | `font-weight` | `700` | `font-weight: 700;` |
| 330 | `font-family` | `inherit` | `font-family: inherit;` |
| 331 | `font-size` | `12.5px` | `font-size: 12.5px;` |
| 350 | `font-size` | `12px` | `font-size: 12px;` |
| 351 | `font-weight` | `600` | `font-weight: 600;` |
| 361 | `font-size` | `13px` | `font-size: 13px;` |
| 414 | `font-size` | `10px` | `font-size: 10px;` |
| 415 | `font-weight` | `600` | `font-weight: 600;` |
| 433 | `font-size` | `11.5px` | `font-size: 11.5px;` |
| 434 | `font-weight` | `600` | `font-weight: 600;` |
| 446 | `font-size` | `18px` | `font-size: 18px;` |
| 447 | `font-weight` | `500` | `font-weight: 500;` |
| 454 | `font-weight` | `700` | `font-weight: 700;` |
| 481 | `font-size` | `10.5px` | `font-size: 10.5px;` |
| 482 | `font-weight` | `500` | `font-weight: 500;` |
| 609 | `font-size` | `12.5px` | `font-size: 12.5px;` |
| 610 | `font-weight` | `600` | `font-weight: 600;` |
| 611 | `line-height` | `1.25` | `line-height: 1.25;` |
| 618 | `font-size` | `11px` | `font-size: 11px;` |
| 624 | `font-size` | `10.5px` | `font-size: 10.5px;` |
| 699 | `font-size` | `16px` | `font-size: 16px;` |
| 700 | `font-weight` | `600` | `font-weight: 600;` |
| 705 | `font-size` | `12px` | `font-size: 12px;` |
| 736 | `font-size` | `11.5px` | `font-size: 11.5px;` |
| 737 | `font-weight` | `600` | `font-weight: 600;` |
| 744 | `font-size` | `13.5px` | `font-size: 13.5px;` |
| 762 | `font-family` | `inherit` | `font-family: inherit;` |
| 763 | `font-size` | `13.5px` | `font-size: 13.5px;` |
| 787 | `font-family` | `inherit` | `font-family: inherit;` |
| 788 | `font-size` | `13px` | `font-size: 13px;` |
| 789 | `font-weight` | `500` | `font-weight: 500;` |
| 800 | `font-family` | `inherit` | `font-family: inherit;` |
| 801 | `font-size` | `13px` | `font-size: 13px;` |
| 802 | `font-weight` | `600` | `font-weight: 600;` |

### [`src/design-system/components/Pane/Pane.css`](file:///e:/Company/bezent_ecosystem/apps/web/src/design-system/components/Pane/Pane.css) (48 instances — Design System Components)

| Line | Property | Hardcoded / Current Value | Code Snippet |
| :--- | :--- | :--- | :--- |
| 226 | `line-height` | `1.35` | `line-height: 1.35;` |
| 262 | `font-size` | `12px` | `font-size: 12px;` |
| 291 | `font-weight` | `500` | `font-weight: 500;` |
| 390 | `line-height` | `1.4` | `line-height: 1.4;` |
| 594 | `font-weight` | `500` | `font-weight: 500;` |
| 647 | `font-weight` | `500` | `font-weight: 500;` |
| 733 | `font-family` | `inherit` | `font-family: inherit;` |
| 734 | `font-size` | `inherit` | `font-size: inherit;` |
| 735 | `font-weight` | `inherit` | `font-weight: inherit;` |
| 736 | `line-height` | `inherit` | `line-height: inherit;` |
| 750 | `font-weight` | `500` | `font-weight: 500;` |
| 809 | `font-weight` | `500` | `font-weight: 500;` |
| 826 | `font-weight` | `600` | `font-weight: 600;` |
| 848 | `font-weight` | `600` | `font-weight: 600;` |
| 871 | `font-size` | `13px` | `font-size: 13px;` |
| 884 | `font-weight` | `600` | `font-weight: 600;` |
| 902 | `font-size` | `11px` | `font-size: 11px;` |
| 903 | `font-weight` | `600` | `font-weight: 600;` |
| 920 | `font-size` | `12.5px` | `font-size: 12.5px;` |
| 970 | `font-size` | `13px` | `font-size: 13px;` |
| 971 | `font-weight` | `500` | `font-weight: 500;` |
| 987 | `font-weight` | `600` | `font-weight: 600;` |
| 992 | `font-size` | `11px` | `font-size: 11px;` |
| 993 | `font-weight` | `600` | `font-weight: 600;` |
| 1029 | `font-size` | `14px` | `font-size: 14px;` |
| 1030 | `font-weight` | `600` | `font-weight: 600;` |
| 1036 | `font-size` | `12px` | `font-size: 12px;` |
| 1051 | `font-size` | `12.5px` | `font-size: 12.5px;` |
| 1052 | `font-weight` | `500` | `font-weight: 500;` |
| 1087 | `font-size` | `13px` | `font-size: 13px;` |
| 1088 | `font-weight` | `600` | `font-weight: 600;` |
| 1093 | `font-size` | `11.5px` | `font-size: 11.5px;` |
| 1096 | `line-height` | `1.35` | `line-height: 1.35;` |
| 1113 | `font-size` | `12px` | `font-size: 12px;` |
| 1122 | `font-weight` | `500` | `font-weight: 500;` |
| 1133 | `font-size` | `12px` | `font-size: 12px;` |
| 1135 | `font-weight` | `500` | `font-weight: 500;` |
| 1139 | `font-size` | `11px` | `font-size: 11px;` |
| 1153 | `font-size` | `11px` | `font-size: 11px;` |
| 1155 | `line-height` | `1.35` | `line-height: 1.35;` |
| 1160 | `font-size` | `11px` | `font-size: 11px;` |
| 1172 | `font-size` | `12px` | `font-size: 12px;` |
| 1175 | `line-height` | `1.3` | `line-height: 1.3;` |
| 1196 | `font-size` | `18px` | `font-size: 18px;` |
| 1197 | `font-weight` | `600` | `font-weight: 600;` |
| 1203 | `font-size` | `13px` | `font-size: 13px;` |
| 1250 | `font-size` | `12.5px` | `font-size: 12.5px;` |
| 1251 | `font-weight` | `600` | `font-weight: 600;` |

### [`src/layouts/app-shell/MoreLauncher.css`](file:///e:/Company/bezent_ecosystem/apps/web/src/layouts/app-shell/MoreLauncher.css) (40 instances — Global AppShell Layouts)

| Line | Property | Hardcoded / Current Value | Code Snippet |
| :--- | :--- | :--- | :--- |
| 54 | `font-size` | `18px` | `font-size: 18px;` |
| 55 | `font-weight` | `600` | `font-weight: 600;` |
| 56 | `line-height` | `24px` | `line-height: 24px;` |
| 63 | `font-size` | `12px` | `font-size: 12px;` |
| 64 | `line-height` | `18px` | `line-height: 18px;` |
| 131 | `font-family` | `inherit` | `font-family: inherit;` |
| 132 | `font-size` | `13px` | `font-size: 13px;` |
| 185 | `font-family` | `inherit` | `font-family: inherit;` |
| 216 | `font-size` | `13px` | `font-size: 13px;` |
| 217 | `font-weight` | `500` | `font-weight: 500;` |
| 218 | `line-height` | `18px` | `line-height: 18px;` |
| 223 | `font-weight` | `600` | `font-weight: 600;` |
| 229 | `font-size` | `11px` | `font-size: 11px;` |
| 230 | `font-weight` | `500` | `font-weight: 500;` |
| 290 | `font-size` | `11px` | `font-size: 11px;` |
| 291 | `font-weight` | `500` | `font-weight: 500;` |
| 302 | `font-size` | `11px` | `font-size: 11px;` |
| 303 | `font-weight` | `500` | `font-weight: 500;` |
| 318 | `font-family` | `inherit` | `font-family: inherit;` |
| 319 | `font-size` | `12px` | `font-size: 12px;` |
| 320 | `font-weight` | `500` | `font-weight: 500;` |
| 331 | `font-size` | `13px` | `font-size: 13px;` |
| 352 | `font-family` | `inherit` | `font-family: inherit;` |
| 392 | `font-size` | `12px` | `font-size: 12px;` |
| 393 | `font-weight` | `500` | `font-weight: 500;` |
| 399 | `font-weight` | `600` | `font-weight: 600;` |
| 421 | `font-family` | `inherit` | `font-family: inherit;` |
| 479 | `font-size` | `13px` | `font-size: 13px;` |
| 480 | `font-weight` | `500` | `font-weight: 500;` |
| 481 | `line-height` | `18px` | `line-height: 18px;` |
| 487 | `font-weight` | `600` | `font-weight: 600;` |
| 493 | `font-size` | `10.5px` | `font-size: 10.5px;` |
| 494 | `font-weight` | `500` | `font-weight: 500;` |
| 504 | `font-size` | `12px` | `font-size: 12px;` |
| 505 | `line-height` | `17px` | `line-height: 17px;` |
| 547 | `font-size` | `18px` | `font-size: 18px;` |
| 548 | `font-weight` | `600` | `font-weight: 600;` |
| 556 | `font-size` | `11px` | `font-size: 11px;` |
| 557 | `font-weight` | `500` | `font-weight: 500;` |
| 564 | `font-size` | `12px` | `font-size: 12px;` |

### [`src/platform/calendar/CalendarDrawer.css`](file:///e:/Company/bezent_ecosystem/apps/web/src/platform/calendar/CalendarDrawer.css) (37 instances — Platform Utilities)

| Line | Property | Hardcoded / Current Value | Code Snippet |
| :--- | :--- | :--- | :--- |
| 42 | `font-size` | `14px` | `font-size: 14px;` |
| 43 | `font-weight` | `700` | `font-weight: 700;` |
| 54 | `font-family` | `inherit` | `font-family: inherit;` |
| 62 | `font-size` | `11px` | `font-size: 11px;` |
| 63 | `font-weight` | `600` | `font-weight: 600;` |
| 94 | `font-size` | `12px` | `font-size: 12px;` |
| 118 | `font-family` | `inherit` | `font-family: inherit;` |
| 132 | `font-size` | `9px` | `font-size: 9px;` |
| 133 | `font-weight` | `600` | `font-weight: 600;` |
| 144 | `font-size` | `14px` | `font-size: 14px;` |
| 145 | `font-weight` | `450` | `font-weight: 450;` |
| 150 | `font-weight` | `700` | `font-weight: 700;` |
| 162 | `font-size` | `11px` | `font-size: 11px;` |
| 181 | `font-size` | `11px` | `font-size: 11px;` |
| 182 | `font-weight` | `600` | `font-weight: 600;` |
| 194 | `font-family` | `inherit` | `font-family: inherit;` |
| 195 | `font-size` | `12px` | `font-size: 12px;` |
| 196 | `font-weight` | `600` | `font-weight: 600;` |
| 213 | `font-size` | `10px` | `font-size: 10px;` |
| 214 | `font-weight` | `500` | `font-weight: 500;` |
| 242 | `font-family` | `inherit` | `font-family: inherit;` |
| 264 | `font-size` | `12px` | `font-size: 12px;` |
| 265 | `font-weight` | `600` | `font-weight: 600;` |
| 271 | `font-size` | `11px` | `font-size: 11px;` |
| 277 | `font-size` | `10px` | `font-size: 10px;` |
| 301 | `font-family` | `inherit` | `font-family: inherit;` |
| 302 | `font-size` | `12px` | `font-size: 12px;` |
| 303 | `font-weight` | `600` | `font-weight: 600;` |
| 335 | `font-size` | `14px` | `font-size: 14px;` |
| 336 | `font-weight` | `700` | `font-weight: 700;` |
| 343 | `font-size` | `11px` | `font-size: 11px;` |
| 344 | `font-weight` | `600` | `font-weight: 600;` |
| 366 | `font-size` | `10px` | `font-size: 10px;` |
| 367 | `font-weight` | `600` | `font-weight: 600;` |
| 375 | `font-size` | `12px` | `font-size: 12px;` |
| 386 | `font-size` | `12px` | `font-size: 12px;` |
| 387 | `line-height` | `1.6` | `line-height: 1.6;` |

### [`src/platform/tasks/TasksPage.css`](file:///e:/Company/bezent_ecosystem/apps/web/src/platform/tasks/TasksPage.css) (35 instances — Platform Utilities)

| Line | Property | Hardcoded / Current Value | Code Snippet |
| :--- | :--- | :--- | :--- |
| 46 | `font-size` | `20px` | `font-size: 20px;` |
| 47 | `font-weight` | `500` | `font-weight: 500;` |
| 86 | `font-family` | `inherit` | `font-family: inherit;` |
| 87 | `font-size` | `14px` | `font-size: 14px;` |
| 88 | `font-weight` | `600` | `font-weight: 600;` |
| 122 | `font-family` | `inherit` | `font-family: inherit;` |
| 123 | `font-size` | `13.5px` | `font-size: 13.5px;` |
| 124 | `font-weight` | `500` | `font-weight: 500;` |
| 139 | `font-weight` | `600` | `font-weight: 600;` |
| 154 | `font-size` | `11px` | `font-size: 11px;` |
| 155 | `font-weight` | `600` | `font-weight: 600;` |
| 190 | `font-size` | `22px` | `font-size: 22px;` |
| 191 | `font-weight` | `600` | `font-weight: 600;` |
| 197 | `font-size` | `13px` | `font-size: 13px;` |
| 198 | `font-weight` | `500` | `font-weight: 500;` |
| 214 | `font-family` | `inherit` | `font-family: inherit;` |
| 215 | `font-size` | `14px` | `font-size: 14px;` |
| 216 | `font-weight` | `600` | `font-weight: 600;` |
| 241 | `font-family` | `inherit` | `font-family: inherit;` |
| 242 | `font-size` | `15px` | `font-size: 15px;` |
| 243 | `font-weight` | `600` | `font-weight: 600;` |
| 251 | `font-family` | `inherit` | `font-family: inherit;` |
| 252 | `font-size` | `13px` | `font-size: 13px;` |
| 336 | `font-size` | `14.5px` | `font-size: 14.5px;` |
| 337 | `font-weight` | `500` | `font-weight: 500;` |
| 339 | `line-height` | `1.35` | `line-height: 1.35;` |
| 348 | `font-size` | `12.5px` | `font-size: 12.5px;` |
| 351 | `line-height` | `1.35` | `line-height: 1.35;` |
| 366 | `font-size` | `11.5px` | `font-size: 11.5px;` |
| 367 | `font-weight` | `500` | `font-weight: 500;` |
| 375 | `font-size` | `11px` | `font-size: 11px;` |
| 376 | `font-weight` | `600` | `font-weight: 600;` |
| 398 | `font-size` | `11.5px` | `font-size: 11.5px;` |
| 447 | `font-size` | `12.5px` | `font-size: 12.5px;` |
| 448 | `font-weight` | `600` | `font-weight: 600;` |

### [`src/design-system/components/Input/Input.css`](file:///e:/Company/bezent_ecosystem/apps/web/src/design-system/components/Input/Input.css) (31 instances — Design System Components)

| Line | Property | Hardcoded / Current Value | Code Snippet |
| :--- | :--- | :--- | :--- |
| 13 | `font-size` | `var(--form-font-size-label, 14px)` | `font-size: var(--form-font-size-label, 14px);` |
| 14 | `font-weight` | `600` | `font-weight: 600;` |
| 50 | `font-size` | `13px` | `font-size: 13px;` |
| 60 | `font-size` | `var(--form-font-size-input, 17px)` | `font-size: var(--form-font-size-input, 17px);` |
| 70 | `font-size` | `18px` | `font-size: 18px;` |
| 96 | `font-size` | `10px` | `font-size: 10px;` |
| 110 | `font-size` | `13px` | `font-size: 13px;` |
| 123 | `font-size` | `13px` | `font-size: 13px;` |
| 124 | `font-weight` | `600` | `font-weight: 600;` |
| 161 | `font-size` | `13px` | `font-size: 13px;` |
| 162 | `font-weight` | `500` | `font-weight: 500;` |
| 172 | `font-size` | `10px` | `font-size: 10px;` |
| 173 | `font-weight` | `700` | `font-weight: 700;` |
| 183 | `font-size` | `11px` | `font-size: 11px;` |
| 187 | `line-height` | `1` | `line-height: 1;` |
| 198 | `font-size` | `14px` | `font-size: 14px;` |
| 210 | `font-size` | `12px` | `font-size: 12px;` |
| 211 | `font-weight` | `600` | `font-weight: 600;` |
| 241 | `font-size` | `13px` | `font-size: 13px;` |
| 256 | `font` | `inherit` | `font: inherit;` |
| 257 | `font-size` | `var(--form-font-size-input, 14px)` | `font-size: var(--form-font-size-input, 14px);` |
| 340 | `font-size` | `var(--form-font-size-input, 13.5px)` | `font-size: var(--form-font-size-input, 13.5px) !important;` |
| 341 | `line-height` | `1.5` | `line-height: 1.5;` |
| 347 | `font-size` | `11px` | `font-size: 11px;` |
| 353 | `font-weight` | `500` | `font-weight: 500;` |
| 384 | `font` | `inherit` | `font: inherit;` |
| 385 | `font-size` | `var(--form-font-size-input, 17px)` | `font-size: var(--form-font-size-input, 17px);` |
| 386 | `font-weight` | `400` | `font-weight: 400;` |
| 416 | `font` | `inherit` | `font: inherit;` |
| 417 | `font-size` | `var(--form-font-size-input, 17px)` | `font-size: var(--form-font-size-input, 17px);` |
| 418 | `font-weight` | `400` | `font-weight: 400;` |

### [`src/platform/notes/NotesPage.css`](file:///e:/Company/bezent_ecosystem/apps/web/src/platform/notes/NotesPage.css) (31 instances — Platform Utilities)

| Line | Property | Hardcoded / Current Value | Code Snippet |
| :--- | :--- | :--- | :--- |
| 46 | `font-size` | `20px` | `font-size: 20px;` |
| 47 | `font-weight` | `500` | `font-weight: 500;` |
| 92 | `font-family` | `inherit` | `font-family: inherit;` |
| 93 | `font-size` | `13.5px` | `font-size: 13.5px;` |
| 94 | `font-weight` | `500` | `font-weight: 500;` |
| 109 | `font-weight` | `600` | `font-weight: 600;` |
| 119 | `font-size` | `11px` | `font-size: 11px;` |
| 120 | `font-weight` | `600` | `font-weight: 600;` |
| 164 | `font-size` | `14px` | `font-size: 14px;` |
| 205 | `font-family` | `inherit` | `font-family: inherit;` |
| 206 | `font-size` | `15.5px` | `font-size: 15.5px;` |
| 207 | `font-weight` | `600` | `font-weight: 600;` |
| 233 | `font-family` | `inherit` | `font-family: inherit;` |
| 234 | `font-size` | `13.5px` | `font-size: 13.5px;` |
| 239 | `line-height` | `1.45` | `line-height: 1.45;` |
| 304 | `font-family` | `inherit` | `font-family: inherit;` |
| 305 | `font-size` | `13px` | `font-size: 13px;` |
| 306 | `font-weight` | `600` | `font-weight: 600;` |
| 324 | `font-size` | `11px` | `font-size: 11px;` |
| 325 | `font-weight` | `700` | `font-weight: 700;` |
| 391 | `font-size` | `15px` | `font-size: 15px;` |
| 392 | `font-weight` | `600` | `font-weight: 600;` |
| 394 | `line-height` | `1.3` | `line-height: 1.3;` |
| 427 | `font-size` | `13.5px` | `font-size: 13.5px;` |
| 429 | `line-height` | `1.45` | `line-height: 1.45;` |
| 441 | `font-size` | `11px` | `font-size: 11px;` |
| 442 | `font-weight` | `500` | `font-weight: 500;` |
| 458 | `font-size` | `11px` | `font-size: 11px;` |
| 483 | `font-size` | `18px` | `font-size: 18px;` |
| 484 | `font-weight` | `600` | `font-weight: 600;` |
| 490 | `font-size` | `13.5px` | `font-size: 13.5px;` |

### [`src/platform/auth/LoginPage.css`](file:///e:/Company/bezent_ecosystem/apps/web/src/platform/auth/LoginPage.css) (29 instances — Platform Utilities)

| Line | Property | Hardcoded / Current Value | Code Snippet |
| :--- | :--- | :--- | :--- |
| 117 | `font-family` | `'Arial Black', Gadget, sans-serif` | `font-family: 'Arial Black', Gadget, sans-serif;` |
| 118 | `font-size` | `260px` | `font-size: 260px;` |
| 119 | `font-weight` | `900` | `font-weight: 900;` |
| 236 | `font-size` | `30px` | `font-size: 30px;` |
| 237 | `font-weight` | `700` | `font-weight: 700;` |
| 246 | `font-size` | `16px` | `font-size: 16px;` |
| 247 | `line-height` | `1.55` | `line-height: 1.55;` |
| 262 | `font-size` | `16.5px` | `font-size: 16.5px;` |
| 283 | `font-size` | `15px` | `font-size: 15px;` |
| 284 | `font-weight` | `600` | `font-weight: 600;` |
| 296 | `font-size` | `16.5px` | `font-size: 16.5px;` |
| 297 | `font-weight` | `600` | `font-weight: 600;` |
| 320 | `font-weight` | `500` | `font-weight: 500;` |
| 331 | `font-size` | `13.5px` | `font-size: 13.5px;` |
| 332 | `line-height` | `1.5` | `line-height: 1.5;` |
| 347 | `font-size` | `15px` | `font-size: 15px;` |
| 348 | `font-weight` | `600` | `font-weight: 600;` |
| 369 | `font-size` | `24px` | `font-size: 24px;` |
| 370 | `font-weight` | `700` | `font-weight: 700;` |
| 410 | `font-size` | `13px` | `font-size: 13px;` |
| 412 | `line-height` | `1.4` | `line-height: 1.4;` |
| 417 | `font-size` | `13px` | `font-size: 13px;` |
| 418 | `font-weight` | `500` | `font-weight: 500;` |
| 420 | `line-height` | `1.4` | `line-height: 1.4;` |
| 630 | `font-size` | `13px` | `font-size: 13px;` |
| 631 | `font-weight` | `600` | `font-weight: 600;` |
| 714 | `font-size` | `22px` | `font-size: 22px;` |
| 718 | `font-size` | `13.5px` | `font-size: 13.5px;` |
| 726 | `font-size` | `12px` | `font-size: 12px;` |

### [`src/platform/notes/NotesDrawer.css`](file:///e:/Company/bezent_ecosystem/apps/web/src/platform/notes/NotesDrawer.css) (26 instances — Platform Utilities)

| Line | Property | Hardcoded / Current Value | Code Snippet |
| :--- | :--- | :--- | :--- |
| 27 | `font-size` | `10px` | `font-size: 10px;` |
| 28 | `font-weight` | `700` | `font-weight: 700;` |
| 63 | `font-family` | `inherit` | `font-family: inherit;` |
| 77 | `font-size` | `12px` | `font-size: 12px;` |
| 78 | `font-weight` | `600` | `font-weight: 600;` |
| 79 | `line-height` | `1.3` | `line-height: 1.3;` |
| 89 | `font-size` | `11px` | `font-size: 11px;` |
| 90 | `line-height` | `1.5` | `line-height: 1.5;` |
| 101 | `font-size` | `10px` | `font-size: 10px;` |
| 106 | `font-size` | `10px` | `font-size: 10px;` |
| 163 | `font-family` | `inherit` | `font-family: inherit;` |
| 164 | `font-size` | `12px` | `font-size: 12px;` |
| 196 | `font-family` | `inherit` | `font-family: inherit;` |
| 197 | `font-size` | `12px` | `font-size: 12px;` |
| 198 | `font-weight` | `600` | `font-weight: 600;` |
| 207 | `font-size` | `10px` | `font-size: 10px;` |
| 229 | `font-family` | `inherit` | `font-family: inherit;` |
| 234 | `font-size` | `15px` | `font-size: 15px;` |
| 235 | `font-weight` | `700` | `font-weight: 700;` |
| 241 | `font-size` | `13px` | `font-size: 13px;` |
| 242 | `line-height` | `1.6` | `line-height: 1.6;` |
| 266 | `font-size` | `10px` | `font-size: 10px;` |
| 267 | `font-weight` | `600` | `font-weight: 600;` |
| 280 | `font-family` | `inherit` | `font-family: inherit;` |
| 281 | `font-size` | `12px` | `font-size: 12px;` |
| 291 | `font-size` | `11px` | `font-size: 11px;` |

### [`src/platform/approvals/ApprovalsPage.css`](file:///e:/Company/bezent_ecosystem/apps/web/src/platform/approvals/ApprovalsPage.css) (25 instances — Platform Utilities)

| Line | Property | Hardcoded / Current Value | Code Snippet |
| :--- | :--- | :--- | :--- |
| 46 | `font-size` | `20px` | `font-size: 20px;` |
| 47 | `font-weight` | `500` | `font-weight: 500;` |
| 77 | `font-size` | `11px` | `font-size: 11px;` |
| 78 | `font-weight` | `600` | `font-weight: 600;` |
| 101 | `font-family` | `inherit` | `font-family: inherit;` |
| 102 | `font-size` | `13.5px` | `font-size: 13.5px;` |
| 103 | `font-weight` | `500` | `font-weight: 500;` |
| 118 | `font-weight` | `600` | `font-weight: 600;` |
| 125 | `font-size` | `11.5px` | `font-size: 11.5px;` |
| 126 | `font-weight` | `600` | `font-weight: 600;` |
| 178 | `font-size` | `12.5px` | `font-size: 12.5px;` |
| 179 | `font-weight` | `500` | `font-weight: 500;` |
| 184 | `font-size` | `26px` | `font-size: 26px;` |
| 185 | `font-weight` | `700` | `font-weight: 700;` |
| 203 | `font-size` | `11.5px` | `font-size: 11.5px;` |
| 211 | `font-size` | `18px` | `font-size: 18px;` |
| 212 | `font-weight` | `600` | `font-weight: 600;` |
| 253 | `font-size` | `14.5px` | `font-size: 14.5px;` |
| 254 | `font-weight` | `600` | `font-weight: 600;` |
| 259 | `font-size` | `12.5px` | `font-size: 12.5px;` |
| 265 | `font-size` | `11px` | `font-size: 11px;` |
| 266 | `font-weight` | `600` | `font-weight: 600;` |
| 283 | `font-size` | `13.5px` | `font-size: 13.5px;` |
| 285 | `line-height` | `1.4` | `line-height: 1.4;` |
| 298 | `font-size` | `12px` | `font-size: 12px;` |

### [`src/platform/utility-drawer/UtilityDrawerParts.css`](file:///e:/Company/bezent_ecosystem/apps/web/src/platform/utility-drawer/UtilityDrawerParts.css) (24 instances — Platform Utilities)

| Line | Property | Hardcoded / Current Value | Code Snippet |
| :--- | :--- | :--- | :--- |
| 33 | `font-size` | `14px` | `font-size: 14px;` |
| 34 | `font-weight` | `600` | `font-weight: 600;` |
| 55 | `font-size` | `10px` | `font-size: 10px;` |
| 56 | `font-weight` | `600` | `font-weight: 600;` |
| 62 | `font-size` | `11px` | `font-size: 11px;` |
| 121 | `font-family` | `inherit` | `font-family: inherit;` |
| 122 | `font-size` | `12px` | `font-size: 12px;` |
| 123 | `font-weight` | `500` | `font-weight: 500;` |
| 135 | `font-weight` | `600` | `font-weight: 600;` |
| 162 | `font-size` | `10px` | `font-size: 10px;` |
| 163 | `font-weight` | `600` | `font-weight: 600;` |
| 180 | `font-family` | `inherit` | `font-family: inherit;` |
| 181 | `font-size` | `10px` | `font-size: 10px;` |
| 182 | `font-weight` | `500` | `font-weight: 500;` |
| 212 | `font-family` | `inherit` | `font-family: inherit;` |
| 213 | `font-size` | `12px` | `font-size: 12px;` |
| 214 | `font-weight` | `600` | `font-weight: 600;` |
| 228 | `font-family` | `inherit` | `font-family: inherit;` |
| 229 | `font-size` | `11px` | `font-size: 11px;` |
| 230 | `font-weight` | `600` | `font-weight: 600;` |
| 237 | `font-size` | `10px` | `font-size: 10px;` |
| 238 | `font-weight` | `600` | `font-weight: 600;` |
| 244 | `font-size` | `9px` | `font-size: 9px;` |
| 245 | `font-weight` | `700` | `font-weight: 700;` |

### [`src/design-system/components/Page/Page.css`](file:///e:/Company/bezent_ecosystem/apps/web/src/design-system/components/Page/Page.css) (23 instances — Design System Components)

| Line | Property | Hardcoded / Current Value | Code Snippet |
| :--- | :--- | :--- | :--- |
| 83 | `font-size` | `13px` | `font-size: 13px;` |
| 84 | `font-weight` | `600` | `font-weight: 600;` |
| 109 | `font-weight` | `500` | `font-weight: 500;` |
| 125 | `font-weight` | `600` | `font-weight: 600;` |
| 133 | `font-size` | `13px` | `font-size: 13px;` |
| 135 | `font-weight` | `500` | `font-weight: 500;` |
| 140 | `font-weight` | `600` | `font-weight: 600;` |
| 156 | `font-size` | `12px` | `font-size: 12px;` |
| 157 | `font-weight` | `600` | `font-weight: 600;` |
| 189 | `font-size` | `18px` | `font-size: 18px;` |
| 190 | `font-weight` | `700` | `font-weight: 700;` |
| 196 | `font-size` | `14px` | `font-size: 14px;` |
| 198 | `line-height` | `1.5` | `line-height: 1.5;` |
| 226 | `font-size` | `14px` | `font-size: 14px;` |
| 227 | `font-weight` | `600` | `font-weight: 600;` |
| 248 | `font-size` | `12px` | `font-size: 12px;` |
| 249 | `font-weight` | `600` | `font-weight: 600;` |
| 271 | `font-size` | `14px` | `font-size: 14px;` |
| 272 | `font-weight` | `600` | `font-weight: 600;` |
| 288 | `font-size` | `14px` | `font-size: 14px;` |
| 289 | `font-weight` | `600` | `font-weight: 600;` |
| 305 | `font-size` | `12px` | `font-size: 12px;` |
| 306 | `font-weight` | `600` | `font-weight: 600;` |

### [`src/design-system/components/ChapterFocusCarousel/ChapterFocusCarousel.css`](file:///e:/Company/bezent_ecosystem/apps/web/src/design-system/components/ChapterFocusCarousel/ChapterFocusCarousel.css) (22 instances — Design System Components)

| Line | Property | Hardcoded / Current Value | Code Snippet |
| :--- | :--- | :--- | :--- |
| 29 | `font-size` | `11px` | `font-size: 11px;` |
| 30 | `font-weight` | `700` | `font-weight: 700;` |
| 52 | `font-size` | `14px` | `font-size: 14px;` |
| 53 | `font-weight` | `600` | `font-weight: 600;` |
| 54 | `line-height` | `1` | `line-height: 1;` |
| 77 | `font-size` | `12px` | `font-size: 12px;` |
| 78 | `font-weight` | `700` | `font-weight: 700;` |
| 93 | `font-weight` | `400` | `font-weight: 400;` |
| 170 | `font-size` | `11.5px` | `font-size: 11.5px;` |
| 171 | `font-weight` | `700` | `font-weight: 700;` |
| 187 | `font-size` | `13.5px` | `font-size: 13.5px;` |
| 188 | `font-weight` | `600` | `font-weight: 600;` |
| 189 | `line-height` | `1.25` | `line-height: 1.25;` |
| 278 | `font-weight` | `700` | `font-weight: 700;` |
| 315 | `font-size` | `12.5px` | `font-size: 12.5px;` |
| 316 | `font-weight` | `700` | `font-weight: 700;` |
| 327 | `font-size` | `23px` | `font-size: 23px;` |
| 328 | `font-weight` | `700` | `font-weight: 700;` |
| 329 | `line-height` | `1.2` | `line-height: 1.2;` |
| 336 | `font-size` | `14px` | `font-size: 14px;` |
| 337 | `font-weight` | `400` | `font-weight: 400;` |
| 339 | `line-height` | `1.5` | `line-height: 1.5;` |

### [`src/design-system/icons/components/icons.css`](file:///e:/Company/bezent_ecosystem/apps/web/src/design-system/icons/components/icons.css) (21 instances — Icon System)

| Line | Property | Hardcoded / Current Value | Code Snippet |
| :--- | :--- | :--- | :--- |
| 19 | `font-family` | `'Material Symbols Outlined', sans-serif` | `font-family: 'Material Symbols Outlined', sans-serif !important;` |
| 20 | `font-weight` | `normal` | `font-weight: normal;` |
| 22 | `font-size` | `20px` | `font-size: 20px;` |
| 23 | `line-height` | `1` | `line-height: 1;` |
| 73 | `font-size` | `10px` | `font-size: 10px;` |
| 80 | `font-size` | `11px` | `font-size: 11px;` |
| 87 | `font-size` | `12px` | `font-size: 12px;` |
| 94 | `font-size` | `13px` | `font-size: 13px;` |
| 101 | `font-size` | `14px` | `font-size: 14px;` |
| 108 | `font-size` | `15px` | `font-size: 15px;` |
| 115 | `font-size` | `16px` | `font-size: 16px;` |
| 122 | `font-size` | `17px` | `font-size: 17px;` |
| 129 | `font-size` | `18px` | `font-size: 18px;` |
| 136 | `font-size` | `19px` | `font-size: 19px;` |
| 143 | `font-size` | `20px` | `font-size: 20px;` |
| 150 | `font-size` | `22px` | `font-size: 22px;` |
| 157 | `font-size` | `24px` | `font-size: 24px;` |
| 164 | `font-size` | `28px` | `font-size: 28px;` |
| 171 | `font-size` | `32px` | `font-size: 32px;` |
| 178 | `font-size` | `40px` | `font-size: 40px;` |
| 185 | `font-size` | `48px` | `font-size: 48px;` |

### [`src/platform/notifications/NotificationsPanel.css`](file:///e:/Company/bezent_ecosystem/apps/web/src/platform/notifications/NotificationsPanel.css) (21 instances — Platform Utilities)

| Line | Property | Hardcoded / Current Value | Code Snippet |
| :--- | :--- | :--- | :--- |
| 103 | `font-size` | `14px` | `font-size: 14px;` |
| 104 | `font-weight` | `700` | `font-weight: 700;` |
| 112 | `font-size` | `10px` | `font-size: 10px;` |
| 113 | `font-weight` | `700` | `font-weight: 700;` |
| 114 | `line-height` | `15px` | `line-height: 15px;` |
| 128 | `font-family` | `inherit` | `font-family: inherit;` |
| 129 | `font-size` | `11px` | `font-size: 11px;` |
| 130 | `font-weight` | `600` | `font-weight: 600;` |
| 202 | `font-size` | `10px` | `font-size: 10px;` |
| 203 | `font-weight` | `700` | `font-weight: 700;` |
| 212 | `font-size` | `13px` | `font-size: 13px;` |
| 229 | `font-family` | `inherit` | `font-family: inherit;` |
| 230 | `font-size` | `12px` | `font-size: 12px;` |
| 231 | `font-weight` | `600` | `font-weight: 600;` |
| 281 | `font-size` | `12px` | `font-size: 12px;` |
| 282 | `font-weight` | `400` | `font-weight: 400;` |
| 283 | `line-height` | `1.4` | `line-height: 1.4;` |
| 288 | `font-weight` | `600` | `font-weight: 600;` |
| 293 | `font-size` | `11px` | `font-size: 11px;` |
| 294 | `line-height` | `1.4` | `line-height: 1.4;` |
| 303 | `font-size` | `10px` | `font-size: 10px;` |

### [`src/layouts/app-shell/ProfileMenu.css`](file:///e:/Company/bezent_ecosystem/apps/web/src/layouts/app-shell/ProfileMenu.css) (17 instances — Global AppShell Layouts)

| Line | Property | Hardcoded / Current Value | Code Snippet |
| :--- | :--- | :--- | :--- |
| 61 | `font-size` | `16px` | `font-size: 16px;` |
| 62 | `font-weight` | `600` | `font-weight: 600;` |
| 64 | `line-height` | `1.25` | `line-height: 1.25;` |
| 70 | `font-size` | `12.5px` | `font-size: 12.5px;` |
| 73 | `line-height` | `1.3` | `line-height: 1.3;` |
| 85 | `font-size` | `11.5px` | `font-size: 11.5px;` |
| 86 | `font-weight` | `600` | `font-weight: 600;` |
| 100 | `font-size` | `13px` | `font-size: 13px;` |
| 101 | `font-weight` | `500` | `font-weight: 500;` |
| 203 | `font-size` | `13.5px` | `font-size: 13.5px;` |
| 204 | `font-weight` | `500` | `font-weight: 500;` |
| 206 | `line-height` | `1.25` | `line-height: 1.25;` |
| 211 | `font-size` | `11.5px` | `font-size: 11.5px;` |
| 214 | `line-height` | `1.2` | `line-height: 1.2;` |
| 241 | `font-size` | `13.5px` | `font-size: 13.5px;` |
| 242 | `font-weight` | `600` | `font-weight: 600;` |
| 272 | `font-size` | `11px` | `font-size: 11px;` |

### [`src/design-system/components/Select/Select.css`](file:///e:/Company/bezent_ecosystem/apps/web/src/design-system/components/Select/Select.css) (16 instances — Design System Components)

| Line | Property | Hardcoded / Current Value | Code Snippet |
| :--- | :--- | :--- | :--- |
| 23 | `font-size` | `var(--form-font-size-label, 17px)` | `font-size: var(--form-font-size-label, 17px);` |
| 24 | `font-weight` | `600` | `font-weight: 600;` |
| 83 | `font-size` | `13px` | `font-size: 13px;` |
| 93 | `font-size` | `var(--form-font-size-input, 17px)` | `font-size: var(--form-font-size-input, 17px);` |
| 103 | `font-size` | `18px` | `font-size: 18px;` |
| 110 | `font` | `inherit` | `font: inherit;` |
| 111 | `font-size` | `var(--form-font-size-input, 17px)` | `font-size: var(--form-font-size-input, 17px);` |
| 112 | `font-weight` | `400` | `font-weight: 400;` |
| 189 | `font-size` | `var(--form-font-size-input, 17px)` | `font-size: var(--form-font-size-input, 17px);` |
| 190 | `font-weight` | `400` | `font-weight: 400;` |
| 208 | `font-weight` | `600` | `font-weight: 600;` |
| 219 | `font-size` | `14px` | `font-size: 14px;` |
| 230 | `font-size` | `13px` | `font-size: 13px;` |
| 231 | `font-weight` | `700` | `font-weight: 700;` |
| 245 | `font-size` | `13px` | `font-size: 13px;` |
| 251 | `font-weight` | `500` | `font-weight: 500;` |

### [`src/platform/search/SearchEmptyState.css`](file:///e:/Company/bezent_ecosystem/apps/web/src/platform/search/SearchEmptyState.css) (14 instances — Platform Utilities)

| Line | Property | Hardcoded / Current Value | Code Snippet |
| :--- | :--- | :--- | :--- |
| 16 | `font-size` | `10px` | `font-size: 10px;` |
| 17 | `font-weight` | `700` | `font-weight: 700;` |
| 24 | `font-size` | `10px` | `font-size: 10px;` |
| 59 | `font-size` | `12.5px` | `font-size: 12.5px;` |
| 60 | `font-weight` | `500` | `font-weight: 500;` |
| 67 | `font-size` | `10px` | `font-size: 10px;` |
| 68 | `font-weight` | `600` | `font-weight: 600;` |
| 98 | `font-size` | `13.5px` | `font-size: 13.5px;` |
| 99 | `font-weight` | `600` | `font-weight: 600;` |
| 106 | `font-size` | `12px` | `font-size: 12px;` |
| 107 | `line-height` | `1.4` | `line-height: 1.4;` |
| 120 | `font-family` | `inherit` | `font-family: inherit;` |
| 121 | `font-size` | `12.5px` | `font-size: 12.5px;` |
| 122 | `font-weight` | `600` | `font-weight: 600;` |

### [`src/design-system/components/EditorialHeader/EditorialHeader.css`](file:///e:/Company/bezent_ecosystem/apps/web/src/design-system/components/EditorialHeader/EditorialHeader.css) (13 instances — Design System Components)

| Line | Property | Hardcoded / Current Value | Code Snippet |
| :--- | :--- | :--- | :--- |
| 38 | `font-size` | `24px` | `font-size: 24px;` |
| 39 | `font-weight` | `800` | `font-weight: 800;` |
| 40 | `line-height` | `1` | `line-height: 1;` |
| 47 | `font-size` | `8px` | `font-size: 8px;` |
| 48 | `font-weight` | `700` | `font-weight: 700;` |
| 64 | `font-size` | `11px` | `font-size: 11px;` |
| 65 | `font-weight` | `700` | `font-weight: 700;` |
| 80 | `font-size` | `23px` | `font-size: 23px;` |
| 81 | `font-weight` | `700` | `font-weight: 700;` |
| 84 | `line-height` | `1.2` | `line-height: 1.2;` |
| 89 | `font-size` | `14px` | `font-size: 14px;` |
| 90 | `font-weight` | `400` | `font-weight: 400;` |
| 92 | `line-height` | `1.5` | `line-height: 1.5;` |

### [`src/design-system/components/Table/Table.css`](file:///e:/Company/bezent_ecosystem/apps/web/src/design-system/components/Table/Table.css) (11 instances — Design System Components)

| Line | Property | Hardcoded / Current Value | Code Snippet |
| :--- | :--- | :--- | :--- |
| 19 | `font-size` | `14px` | `font-size: 14px;` |
| 31 | `font-size` | `12px` | `font-size: 12px;` |
| 32 | `font-weight` | `700` | `font-weight: 700;` |
| 110 | `font-weight` | `600` | `font-weight: 600;` |
| 111 | `font-size` | `14px` | `font-size: 14px;` |
| 116 | `font-size` | `13.5px` | `font-size: 13.5px;` |
| 117 | `font-weight` | `400` | `font-weight: 400;` |
| 126 | `font-size` | `14px` | `font-size: 14px;` |
| 141 | `font-size` | `16px` | `font-size: 16px;` |
| 142 | `font-weight` | `600` | `font-weight: 600;` |
| 148 | `font-size` | `14px` | `font-size: 14px;` |

### [`src/platform/search/SearchResultRow.css`](file:///e:/Company/bezent_ecosystem/apps/web/src/platform/search/SearchResultRow.css) (11 instances — Platform Utilities)

| Line | Property | Hardcoded / Current Value | Code Snippet |
| :--- | :--- | :--- | :--- |
| 60 | `line-height` | `1.3` | `line-height: 1.3;` |
| 64 | `font-size` | `12.5px` | `font-size: 12.5px;` |
| 65 | `font-weight` | `600` | `font-weight: 600;` |
| 71 | `font-size` | `11px` | `font-size: 11px;` |
| 72 | `font-weight` | `400` | `font-weight: 400;` |
| 87 | `font-size` | `10px` | `font-size: 10px;` |
| 88 | `font-weight` | `600` | `font-weight: 600;` |
| 105 | `font-size` | `11px` | `font-size: 11px;` |
| 106 | `font-weight` | `450` | `font-weight: 450;` |
| 114 | `font-size` | `9.5px` | `font-size: 9.5px;` |
| 115 | `font-weight` | `700` | `font-weight: 700;` |

### [`src/design-system/components/Modal/Modal.css`](file:///e:/Company/bezent_ecosystem/apps/web/src/design-system/components/Modal/Modal.css) (10 instances — Design System Components)

| Line | Property | Hardcoded / Current Value | Code Snippet |
| :--- | :--- | :--- | :--- |
| 175 | `font-size` | `18px` | `font-size: 18px;` |
| 176 | `font-weight` | `700` | `font-weight: 700;` |
| 183 | `font-size` | `13.5px` | `font-size: 13.5px;` |
| 233 | `font-size` | `23px` | `font-size: 23px;` |
| 234 | `font-weight` | `700` | `font-weight: 700;` |
| 235 | `line-height` | `1.2` | `line-height: 1.2;` |
| 242 | `font-size` | `13.5px` | `font-size: 13.5px;` |
| 243 | `font-weight` | `500` | `font-weight: 500;` |
| 250 | `font-size` | `13px` | `font-size: 13px;` |
| 255 | `font-weight` | `700` | `font-weight: 700;` |

### [`src/layouts/app-shell/SubNavFlyout.css`](file:///e:/Company/bezent_ecosystem/apps/web/src/layouts/app-shell/SubNavFlyout.css) (10 instances — Global AppShell Layouts)

| Line | Property | Hardcoded / Current Value | Code Snippet |
| :--- | :--- | :--- | :--- |
| 90 | `font-size` | `11px` | `font-size: 11px;` |
| 91 | `font-weight` | `600` | `font-weight: 600;` |
| 94 | `line-height` | `1.2` | `line-height: 1.2;` |
| 100 | `font-size` | `11.5px` | `font-size: 11.5px;` |
| 101 | `line-height` | `1.2` | `line-height: 1.2;` |
| 129 | `font-family` | `inherit` | `font-family: inherit;` |
| 168 | `font-size` | `12px` | `font-size: 12px;` |
| 169 | `font-weight` | `500` | `font-weight: 500;` |
| 170 | `line-height` | `1.2` | `line-height: 1.2;` |
| 175 | `font-weight` | `600` | `font-weight: 600;` |

### [`src/platform/search/SearchFilters.css`](file:///e:/Company/bezent_ecosystem/apps/web/src/platform/search/SearchFilters.css) (10 instances — Platform Utilities)

| Line | Property | Hardcoded / Current Value | Code Snippet |
| :--- | :--- | :--- | :--- |
| 34 | `font-family` | `inherit` | `font-family: inherit;` |
| 35 | `font-size` | `11.5px` | `font-size: 11.5px;` |
| 36 | `font-weight` | `500` | `font-weight: 500;` |
| 57 | `font-weight` | `600` | `font-weight: 600;` |
| 122 | `font-size` | `10px` | `font-size: 10px;` |
| 123 | `font-weight` | `700` | `font-weight: 700;` |
| 139 | `font-family` | `inherit` | `font-family: inherit;` |
| 140 | `font-size` | `12px` | `font-size: 12px;` |
| 141 | `font-weight` | `450` | `font-weight: 450;` |
| 155 | `font-weight` | `600` | `font-weight: 600;` |

### [`src/design-system/components/FormGrid/FormGrid.css`](file:///e:/Company/bezent_ecosystem/apps/web/src/design-system/components/FormGrid/FormGrid.css) (9 instances — Design System Components)

| Line | Property | Hardcoded / Current Value | Code Snippet |
| :--- | :--- | :--- | :--- |
| 127 | `font-size` | `14px` | `font-size: 14px;` |
| 128 | `font-weight` | `600` | `font-weight: 600;` |
| 140 | `font-size` | `13px` | `font-size: 13px;` |
| 146 | `font-size` | `12px` | `font-size: 12px;` |
| 192 | `font-size` | `14px` | `font-size: 14px;` |
| 193 | `font-weight` | `500` | `font-weight: 500;` |
| 217 | `font-size` | `14px` | `font-size: 14px;` |
| 256 | `font-size` | `24px` | `font-size: 24px;` |
| 257 | `font-weight` | `700` | `font-weight: 700;` |

### [`src/app/router/StandaloneUtilityLayout.css`](file:///e:/Company/bezent_ecosystem/apps/web/src/app/router/StandaloneUtilityLayout.css) (8 instances — App Infrastructure)

| Line | Property | Hardcoded / Current Value | Code Snippet |
| :--- | :--- | :--- | :--- |
| 47 | `font-size` | `13px` | `font-size: 13px;` |
| 48 | `font-weight` | `500` | `font-weight: 500;` |
| 72 | `font-size` | `17px` | `font-size: 17px;` |
| 73 | `font-weight` | `600` | `font-weight: 600;` |
| 148 | `font-size` | `12px` | `font-size: 12px;` |
| 149 | `font-weight` | `500` | `font-weight: 500;` |
| 306 | `font-size` | `12px` | `font-size: 12px;` |
| 307 | `font-weight` | `500` | `font-weight: 500;` |

### [`src/design-system/components/Label/Label.css`](file:///e:/Company/bezent_ecosystem/apps/web/src/design-system/components/Label/Label.css) (8 instances — Design System Components)

| Line | Property | Hardcoded / Current Value | Code Snippet |
| :--- | :--- | :--- | :--- |
| 8 | `font-weight` | `600` | `font-weight: 600;` |
| 18 | `font-size` | `var(--form-font-size-label, 17px)` | `font-size: var(--form-font-size-label, 17px);` |
| 23 | `font-size` | `var(--form-font-size-label, 15px)` | `font-size: var(--form-font-size-label, 15px);` |
| 29 | `font-weight` | `400` | `font-weight: 400;` |
| 33 | `font-weight` | `500` | `font-weight: 500;` |
| 37 | `font-weight` | `600` | `font-weight: 600;` |
| 41 | `font-weight` | `700` | `font-weight: 700;` |
| 48 | `line-height` | `1` | `line-height: 1;` |

### [`src/design-system/components/PageHeader/PageHeader.css`](file:///e:/Company/bezent_ecosystem/apps/web/src/design-system/components/PageHeader/PageHeader.css) (8 instances — Design System Components)

| Line | Property | Hardcoded / Current Value | Code Snippet |
| :--- | :--- | :--- | :--- |
| 15 | `font-size` | `13.5px` | `font-size: 13.5px;` |
| 34 | `font-size` | `12px` | `font-size: 12px;` |
| 35 | `font-weight` | `700` | `font-weight: 700;` |
| 50 | `font-size` | `24px` | `font-size: 24px;` |
| 51 | `font-weight` | `700` | `font-weight: 700;` |
| 54 | `line-height` | `1.2` | `line-height: 1.2;` |
| 59 | `font-size` | `14px` | `font-size: 14px;` |
| 61 | `line-height` | `1.45` | `line-height: 1.45;` |

### [`src/layouts/app-shell/TopNav.css`](file:///e:/Company/bezent_ecosystem/apps/web/src/layouts/app-shell/TopNav.css) (8 instances — Global AppShell Layouts)

| Line | Property | Hardcoded / Current Value | Code Snippet |
| :--- | :--- | :--- | :--- |
| 39 | `font-size` | `13px` | `font-size: 13px;` |
| 40 | `font-weight` | `700` | `font-weight: 700;` |
| 42 | `line-height` | `1` | `line-height: 1;` |
| 52 | `font-size` | `22px` | `font-size: 22px;` |
| 53 | `font-weight` | `500` | `font-weight: 500;` |
| 56 | `line-height` | `1` | `line-height: 1;` |
| 104 | `font-size` | `14px` | `font-size: 14px;` |
| 105 | `font-weight` | `500` | `font-weight: 500;` |

### [`src/design-system/components/Avatar/Avatar.css`](file:///e:/Company/bezent_ecosystem/apps/web/src/design-system/components/Avatar/Avatar.css) (7 instances — Design System Components)

| Line | Property | Hardcoded / Current Value | Code Snippet |
| :--- | :--- | :--- | :--- |
| 21 | `font-size` | `12px` | `font-size: 12px;` |
| 22 | `font-weight` | `700` | `font-weight: 700;` |
| 55 | `font-size` | `11px` | `font-size: 11px;` |
| 61 | `font-size` | `12px` | `font-size: 12px;` |
| 67 | `font-size` | `20px` | `font-size: 20px;` |
| 68 | `font-weight` | `700` | `font-weight: 700;` |
| 74 | `font-size` | `40px` | `font-size: 40px;` |

### [`src/design-system/components/Tabs/Tabs.css`](file:///e:/Company/bezent_ecosystem/apps/web/src/design-system/components/Tabs/Tabs.css) (7 instances — Design System Components)

| Line | Property | Hardcoded / Current Value | Code Snippet |
| :--- | :--- | :--- | :--- |
| 28 | `font` | `inherit` | `font: inherit;` |
| 29 | `font-size` | `13.5px` | `font-size: 13.5px;` |
| 30 | `font-weight` | `600` | `font-weight: 600;` |
| 46 | `font-weight` | `700` | `font-weight: 700;` |
| 101 | `font-size` | `11.5px` | `font-size: 11.5px;` |
| 102 | `font-weight` | `700` | `font-weight: 700;` |
| 103 | `line-height` | `1` | `line-height: 1;` |

### [`src/platform/tasks/TasksDrawer.css`](file:///e:/Company/bezent_ecosystem/apps/web/src/platform/tasks/TasksDrawer.css) (7 instances — Platform Utilities)

| Line | Property | Hardcoded / Current Value | Code Snippet |
| :--- | :--- | :--- | :--- |
| 101 | `font-size` | `12px` | `font-size: 12px;` |
| 102 | `font-weight` | `600` | `font-weight: 600;` |
| 113 | `font-size` | `11px` | `font-size: 11px;` |
| 125 | `font-size` | `10px` | `font-size: 10px;` |
| 133 | `font-size` | `10px` | `font-size: 10px;` |
| 134 | `font-weight` | `600` | `font-weight: 600;` |
| 153 | `font-size` | `11px` | `font-size: 11px;` |

### [`src/design-system/components/Button/Button.css`](file:///e:/Company/bezent_ecosystem/apps/web/src/design-system/components/Button/Button.css) (6 instances — Design System Components)

| Line | Property | Hardcoded / Current Value | Code Snippet |
| :--- | :--- | :--- | :--- |
| 12 | `font` | `inherit` | `font: inherit;` |
| 13 | `font-weight` | `600` | `font-weight: 600;` |
| 31 | `font-size` | `11px` | `font-size: 11px;` |
| 38 | `font-size` | `12px` | `font-size: 12px;` |
| 45 | `font-size` | `13px` | `font-size: 13px;` |
| 202 | `font-size` | `14px` | `font-size: 14px;` |

### [`src/design-system/components/FormSection/FormSection.css`](file:///e:/Company/bezent_ecosystem/apps/web/src/design-system/components/FormSection/FormSection.css) (6 instances — Design System Components)

| Line | Property | Hardcoded / Current Value | Code Snippet |
| :--- | :--- | :--- | :--- |
| 29 | `font-size` | `var(--form-font-size-title, 14px)` | `font-size: var(--form-font-size-title, 14px);` |
| 30 | `font-weight` | `700` | `font-weight: 700;` |
| 33 | `line-height` | `1.35` | `line-height: 1.35;` |
| 38 | `font-size` | `var(--form-font-size-subtitle, 14px)` | `font-size: var(--form-font-size-subtitle, 14px);` |
| 39 | `font-weight` | `400` | `font-weight: 400;` |
| 41 | `line-height` | `1.45` | `line-height: 1.45;` |

### [`src/platform/approvals/ApprovalsDrawer.css`](file:///e:/Company/bezent_ecosystem/apps/web/src/platform/approvals/ApprovalsDrawer.css) (6 instances — Platform Utilities)

| Line | Property | Hardcoded / Current Value | Code Snippet |
| :--- | :--- | :--- | :--- |
| 63 | `font-size` | `12px` | `font-size: 12px;` |
| 64 | `font-weight` | `600` | `font-weight: 600;` |
| 70 | `font-size` | `11px` | `font-size: 11px;` |
| 71 | `font-weight` | `500` | `font-weight: 500;` |
| 77 | `font-size` | `11px` | `font-size: 11px;` |
| 88 | `font-size` | `10px` | `font-size: 10px;` |

### [`src/platform/search/SearchResults.css`](file:///e:/Company/bezent_ecosystem/apps/web/src/platform/search/SearchResults.css) (6 instances — Platform Utilities)

| Line | Property | Hardcoded / Current Value | Code Snippet |
| :--- | :--- | :--- | :--- |
| 20 | `font-size` | `10px` | `font-size: 10px;` |
| 21 | `font-weight` | `700` | `font-weight: 700;` |
| 30 | `font-size` | `9.5px` | `font-size: 9.5px;` |
| 31 | `font-weight` | `500` | `font-weight: 500;` |
| 41 | `font-size` | `11px` | `font-size: 11px;` |
| 48 | `font-weight` | `600` | `font-weight: 600;` |

### [`src/design-system/components/Badge/Badge.css`](file:///e:/Company/bezent_ecosystem/apps/web/src/design-system/components/Badge/Badge.css) (5 instances — Design System Components)

| Line | Property | Hardcoded / Current Value | Code Snippet |
| :--- | :--- | :--- | :--- |
| 16 | `font-size` | `9px` | `font-size: 9px;` |
| 17 | `font-weight` | `700` | `font-weight: 700;` |
| 18 | `line-height` | `14px` | `line-height: 14px;` |
| 37 | `line-height` | `18px` | `line-height: 18px;` |
| 63 | `line-height` | `1` | `line-height: 1;` |

### [`src/design-system/components/JourneyNav/JourneyNav.css`](file:///e:/Company/bezent_ecosystem/apps/web/src/design-system/components/JourneyNav/JourneyNav.css) (5 instances — Design System Components)

| Line | Property | Hardcoded / Current Value | Code Snippet |
| :--- | :--- | :--- | :--- |
| 139 | `line-height` | `1.25` | `line-height: 1.25;` |
| 146 | `font-weight` | `400` | `font-weight: 400;` |
| 148 | `line-height` | `1.2` | `line-height: 1.2;` |
| 167 | `font-weight` | `600` | `font-weight: 600;` |
| 182 | `font-weight` | `600` | `font-weight: 600;` |

### [`src/design-system/components/Section/Section.css`](file:///e:/Company/bezent_ecosystem/apps/web/src/design-system/components/Section/Section.css) (5 instances — Design System Components)

| Line | Property | Hardcoded / Current Value | Code Snippet |
| :--- | :--- | :--- | :--- |
| 53 | `font-size` | `var(--form-font-size-title, 20px)` | `font-size: var(--form-font-size-title, 20px);` |
| 54 | `font-weight` | `700` | `font-weight: 700;` |
| 57 | `line-height` | `1.3` | `line-height: 1.3;` |
| 62 | `font-size` | `var(--form-font-size-subtitle, 14px)` | `font-size: var(--form-font-size-subtitle, 14px);` |
| 64 | `line-height` | `1.45` | `line-height: 1.45;` |

### [`src/layouts/app-shell/LeftSidebar.css`](file:///e:/Company/bezent_ecosystem/apps/web/src/layouts/app-shell/LeftSidebar.css) (5 instances — Global AppShell Layouts)

| Line | Property | Hardcoded / Current Value | Code Snippet |
| :--- | :--- | :--- | :--- |
| 57 | `font-family` | `inherit` | `font-family: inherit;` |
| 146 | `line-height` | `14px` | `line-height: 14px;` |
| 157 | `font-weight` | `650` | `font-weight: 650;` |
| 172 | `font-weight` | `500` | `font-weight: 500;` |
| 251 | `font-weight` | `650` | `font-weight: 650;` |

### [`src/app/router/DesignSystemShowcase.css`](file:///e:/Company/bezent_ecosystem/apps/web/src/app/router/DesignSystemShowcase.css) (4 instances — App Infrastructure)

| Line | Property | Hardcoded / Current Value | Code Snippet |
| :--- | :--- | :--- | :--- |
| 21 | `font-family` | `var(--font-sans)` | `font-family: var(--font-sans);` |
| 57 | `font-family` | `var(--font-sans)` | `font-family: var(--font-sans);` |
| 79 | `font-family` | `var(--font-sans)` | `font-family: var(--font-sans);` |
| 89 | `font-family` | `var(--font-mono, monospace)` | `font-family: var(--font-mono, monospace);` |

### [`src/design-system/components/Card/Card.css`](file:///e:/Company/bezent_ecosystem/apps/web/src/design-system/components/Card/Card.css) (4 instances — Design System Components)

| Line | Property | Hardcoded / Current Value | Code Snippet |
| :--- | :--- | :--- | :--- |
| 103 | `font-size` | `var(--form-font-size-card-title, 16px)` | `font-size: var(--form-font-size-card-title, 16px);` |
| 104 | `font-weight` | `700` | `font-weight: 700;` |
| 111 | `font-size` | `13.5px` | `font-size: 13.5px;` |
| 114 | `line-height` | `1.45` | `line-height: 1.45;` |

### [`src/design-system/components/SelectableList/SelectableList.css`](file:///e:/Company/bezent_ecosystem/apps/web/src/design-system/components/SelectableList/SelectableList.css) (4 instances — Design System Components)

| Line | Property | Hardcoded / Current Value | Code Snippet |
| :--- | :--- | :--- | :--- |
| 68 | `font-size` | `13px` | `font-size: 13px;` |
| 69 | `font-weight` | `500` | `font-weight: 500;` |
| 74 | `font-weight` | `600` | `font-weight: 600;` |
| 78 | `font-size` | `12px` | `font-size: 12px;` |

### [`src/layouts/app-shell/BottomBar.css`](file:///e:/Company/bezent_ecosystem/apps/web/src/layouts/app-shell/BottomBar.css) (4 instances — Global AppShell Layouts)

| Line | Property | Hardcoded / Current Value | Code Snippet |
| :--- | :--- | :--- | :--- |
| 26 | `font-size` | `11px` | `font-size: 11px;` |
| 72 | `font-family` | `inherit` | `font-family: inherit;` |
| 73 | `font-size` | `11px` | `font-size: 11px;` |
| 74 | `font-weight` | `500` | `font-weight: 500;` |

### [`src/platform/utility-drawer/UtilityDrawerShell.css`](file:///e:/Company/bezent_ecosystem/apps/web/src/platform/utility-drawer/UtilityDrawerShell.css) (4 instances — Platform Utilities)

| Line | Property | Hardcoded / Current Value | Code Snippet |
| :--- | :--- | :--- | :--- |
| 67 | `font-size` | `11px` | `font-size: 11px;` |
| 68 | `font-weight` | `700` | `font-weight: 700;` |
| 75 | `font-size` | `14px` | `font-size: 14px;` |
| 76 | `font-weight` | `500` | `font-weight: 500;` |

### [`src/app/router/DevPlaceholderPage.css`](file:///e:/Company/bezent_ecosystem/apps/web/src/app/router/DevPlaceholderPage.css) (3 instances — App Infrastructure)

| Line | Property | Hardcoded / Current Value | Code Snippet |
| :--- | :--- | :--- | :--- |
| 18 | `font-size` | `0.75rem` | `font-size: 0.75rem;` |
| 61 | `font-size` | `0.7rem` | `font-size: 0.7rem;` |
| 80 | `font-size` | `0.75rem` | `font-size: 0.75rem;` |

### [`src/design-system/components/Alert/Alert.css`](file:///e:/Company/bezent_ecosystem/apps/web/src/design-system/components/Alert/Alert.css) (3 instances — Design System Components)

| Line | Property | Hardcoded / Current Value | Code Snippet |
| :--- | :--- | :--- | :--- |
| 12 | `font-size` | `13px` | `font-size: 13px;` |
| 13 | `line-height` | `1.45` | `line-height: 1.45;` |
| 36 | `font-weight` | `600` | `font-weight: 600;` |

### [`src/platform/search/GlobalSearch.css`](file:///e:/Company/bezent_ecosystem/apps/web/src/platform/search/GlobalSearch.css) (3 instances — Platform Utilities)

| Line | Property | Hardcoded / Current Value | Code Snippet |
| :--- | :--- | :--- | :--- |
| 74 | `font-size` | `15px` | `font-size: 15px;` |
| 75 | `font-weight` | `400` | `font-weight: 400;` |
| 76 | `line-height` | `1.4` | `line-height: 1.4;` |

### [`src/design-system/components/EmptyState/EmptyState.css`](file:///e:/Company/bezent_ecosystem/apps/web/src/design-system/components/EmptyState/EmptyState.css) (2 instances — Design System Components)

| Line | Property | Hardcoded / Current Value | Code Snippet |
| :--- | :--- | :--- | :--- |
| 89 | `font` | `inherit` | `font: inherit;` |
| 132 | `font` | `inherit` | `font: inherit;` |

### [`src/design-system/components/EmptyState/EmptyStateIllustration.css`](file:///e:/Company/bezent_ecosystem/apps/web/src/design-system/components/EmptyState/EmptyStateIllustration.css) (2 instances — Design System Components)

| Line | Property | Hardcoded / Current Value | Code Snippet |
| :--- | :--- | :--- | :--- |
| 298 | `font-size` | `10.5px` | `font-size: 10.5px;` |
| 299 | `font-weight` | `600` | `font-weight: 600;` |

### [`src/design-system/components/FormField/FormField.css`](file:///e:/Company/bezent_ecosystem/apps/web/src/design-system/components/FormField/FormField.css) (2 instances — Design System Components)

| Line | Property | Hardcoded / Current Value | Code Snippet |
| :--- | :--- | :--- | :--- |
| 90 | `font-size` | `var(--form-font-size-hint, 12px)` | `font-size: var(--form-font-size-hint, 12px);` |
| 91 | `font-weight` | `400` | `font-weight: 400;` |

### [`src/design-system/components/ProgressBar/ProgressBar.css`](file:///e:/Company/bezent_ecosystem/apps/web/src/design-system/components/ProgressBar/ProgressBar.css) (2 instances — Design System Components)

| Line | Property | Hardcoded / Current Value | Code Snippet |
| :--- | :--- | :--- | :--- |
| 17 | `font-size` | `12px` | `font-size: 12px;` |
| 18 | `font-weight` | `500` | `font-weight: 500;` |

### [`src/design-system/styles/base.css`](file:///e:/Company/bezent_ecosystem/apps/web/src/design-system/styles/base.css) (1 instances — Global Styles (styles/))

| Line | Property | Hardcoded / Current Value | Code Snippet |
| :--- | :--- | :--- | :--- |
| 51 | `font` | `inherit` | `font: inherit;` |

---

## 4. Canonical Tokens Reference (`tokens/typography.css`)

To align these hardcoded values with the BEZENT Design System, map them to the corresponding tokens:

### Font Size Scale
- `11px` → `var(--font-size-xs)` (or semantic `var(--font-caption-size)`)
- `12px` → `var(--font-size-sm)` (or semantic `var(--font-form-label-size)`, `var(--font-table-header-size)`)
- `13px` → `var(--font-size-md)` (or semantic `var(--font-form-input-size)`, `var(--font-button-size)`, `var(--font-tab-size)`, `var(--font-table-cell-size)`)
- `14px` → `var(--font-size-base)` (or semantic `var(--font-body-size)`, `var(--font-card-title-size)`)
- `16px` → `var(--font-size-lg)` (or semantic `var(--font-section-title-size)`)
- `18px` → `var(--font-size-xl)`
- `22px` → `var(--font-size-2xl)` (or semantic `var(--font-page-title-size)`)
- `26px` → `var(--font-size-3xl)`

### Font Weight Scale
- `300` → `var(--font-weight-light)`
- `400` → `var(--font-weight-regular)` (or semantic `var(--font-body-weight)`, `var(--font-table-cell-weight)`)
- `500` → `var(--font-weight-medium)` (or semantic `var(--font-button-weight)`, `var(--font-tab-weight)`, `var(--font-form-label-weight)`)
- `600` → `var(--font-weight-semibold)` (or semantic `var(--font-weight-semibold)`, `var(--font-section-title-weight)`, `var(--font-card-title-weight)`)
- `700` → `var(--font-weight-bold)`

### Line Height Scale
- `1.25` → `var(--line-height-tight)`
- `1.375` → `var(--line-height-snug)`
- `1.5` → `var(--line-height-normal)`
- `1.625` → `var(--line-height-relaxed)`

### Font Family
- Canonical product font stack → `var(--font-family-base)`
