# BEZENT Global Search

**Status: UI capability implemented (Phase 0B.6). No backend, no real data.**
Governed by [AGENTS.md](../../AGENTS.md). Visual source of truth: the approved
old UI (`GlobalSearch.tsx` and `components/search/*`).

## 1. Ownership

`apps/web/src/platform/search/` — Global Search is a **platform capability**,
not a layout, design-system or HRMS concern. It owns the query, open state,
filter state, highlighted row, keyboard interaction and result presentation.
AppShell owns only the place it appears.

## 2. Component tree

```
platform/search/
├── GlobalSearch.tsx / .css     bar + floating panel, all search UI state
├── SearchFilters.tsx / .css    filter chips + dropdown
├── SearchResults.tsx / .css    sectioned list + keyboard hint
├── SearchResultRow.tsx / .css  one result
├── SearchEmptyState.tsx / .css suggestions (empty query) + no-results
├── types.ts                    the contract (SearchProvider, SearchResultItem, ...)
└── index.ts                    public API
```

## 3. AppShell integration

`AppShell` takes `topNavSearch?: ReactNode`, forwarded to `TopNav`, which
renders it in `.top-nav__search-slot` (460px max, centred). `layouts` never
imports `platform/search`; `app/router` (`ShellLayout`) composes
`<AppShell topNavSearch={<GlobalSearch …/>}>`. Removing or replacing search
needs no shell change.

## 4. States (evidenced in the old source)

CLOSED → (click / focus / typing / Ctrl-or-Cmd+K) OPEN. Inside OPEN:
suggestions (empty query), results (query with matches, optionally
filtered), no results (query, no matches). Filter menus open inside the
panel. A `loading` skeleton existed in old `SearchEmptyState` but was never
rendered by `GlobalSearch`; it is not migrated. **"State B"** — the old
full-page results view (`SearchResultsView`, rendered into the workspace
after a query is executed) — is not part of the search bar and is deferred;
hosts get `onExecuteSearch(query)`.

## 5. Data boundary

`GlobalSearch` has **no built-in data**. It renders whatever the
`SearchProvider` prop returns. It never imports `applications/*`.

## 6. Typed contract (`types.ts`)

```
SearchProvider { getFilters(ctx), getSuggestions(ctx), search(req) → {currentItems, otherItems} }
SearchResultItem { id, title, subtitle?, icon?: BezentIconName, sourceKey, sourceLabel,
                   badge?: {text, tone?}, metaRight?, targetRoute?, childId? }
SearchSuggestion { id, label, sourceLabel?, actionQuery? }
FilterChipConfig { id, label, options[{label,value}] }
```

Only fields the old UI rendered. Old `moduleKey` (an HRMS module enum)
became the generic `sourceKey`/`sourceLabel`; old per-item badge hex colours
became a small `tone`. `targetRoute`/`childId` are opaque hints passed to
`onSelectResult`; search never resolves routes. Old icon-name strings
(`"user"`, `"clock"` …) became registry `BezentIconName`s, so no lucide
mapping table exists.

## 7-8. Filters and results

Single-select chip dropdowns per `FilterChipConfig`; "all" clears. Results
group into "In {context}" and "Other Results across BEZENT" with match
counts and a keyboard-hint footer; rows show icon, title, subtitle, optional
badge, meta text and a source tag. The result list scrolls internally
(`max-height: 330px`).

## 9. Empty state decision

Not built on the global `EmptyState`: that is a full-page illustrated shell;
the search states are compact panel content (38px icon, one line of copy).
Reusing it would visibly regress the approved UI, so `SearchEmptyState`
stays a thin search-specific component with no illustration.

## 10. Keyboard (as in the old UI)

Ctrl/Cmd+K opens; ↑/↓ cycle (wrapping); Enter runs the search, or — when a
result later than the first is highlighted — selects it (approved
behaviour); on an empty query Enter picks the highlighted suggestion; Esc
closes and blurs; click outside closes; hover moves the highlight. New: the
highlight now also shows on suggestions.

## 11. Accessibility

`role="search"` container; the input is a real ARIA combobox
(`aria-expanded`, `aria-controls`, `aria-activedescendant`,
`aria-autocomplete="list"`) because it genuinely follows that model (input
keeps focus, arrows move an active option). Results/suggestions are a
`listbox` of `option`s (results in labelled `group`s). Filter chips are
buttons with `aria-expanded`; their clear button is a sibling, not nested
(the old chip nested a clickable span). Visible focus rings via
`--border-focus`. Panel mousedown is cancelled so clicks never steal input
focus. Not done: live-region announcement of result counts.

## 12. Layering

The bar and panel live inside TopNav's stacking context (`--z-topbar`
100), so they cover sidebar (90) and rail (50). Internal values are the old
ones, now tokens: `--z-search-panel` 250, `--z-search-trigger` 260,
`--z-search-filter-menu` 300. Tooltips (300) and the sub-nav flyout (340)
sit in the root context above the top bar; they do not open while search is
used.

## 13. Scrolling

The panel is absolutely positioned (no layout impact); only the result list
scrolls. Verified: opening search leaves document height = viewport height
and workspace scroll untouched.

## 14. Token usage (old hardcoded value → token)

The old panel used light-mode hex literals and had **no dark variant**; the
approved `--search-*` tokens already existed in `theme.css`. Each literal was
mapped, accepting small deltas rather than inventing colours:

| Element                  | Old                                                      | Token (light Δ)                                                                   |
| ------------------------ | -------------------------------------------------------- | --------------------------------------------------------------------------------- |
| panel/bar bg             | `#FFF`                                                   | `--search-expanded-bg` (same)                                                     |
| expanded border          | `#DED7E3`                                                | `--search-border-hover` (`#ddc9e8`)                                               |
| dividers                 | `#E8E3EB` / `#F0EBF3`                                    | `--search-divider` / `--search-row-separator`                                     |
| section/footer bg        | `#FAF7FC`                                                | `--floating-surface-header-bg` (`#fdf7ff`)                                        |
| highlighted row          | `#F5EEFD`                                                | `--search-row-hover` (`#f7eefc`)                                                  |
| highlighted icon bg      | `#EAD7FD`                                                | `--search-row-selected` (same)                                                    |
| default icon bg / tags   | `#F4EFF7` / `#F5EEFD`                                    | `--icon-surface` (`#f7f0fe`)                                                      |
| title / subtitle / muted | `#17111D` / `#625A68` / `#8A828F`                        | `--search-row-text` / `--text-secondary` (`#756b7d`) / `--text-muted` (`#968d9d`) |
| icons                    | `#5F5865`                                                | `--search-row-icon` (`#887692`)                                                   |
| chips                    | `#FFF`,`#DED7E3`,`#F9F6FC`,`#C8BFD0`,`#931CF5`,`#F5EEFD` | `--search-chip-*`                                                                 |
| dropdown menu            | white + custom shadow                                    | `--bg-popup`, `--shadow-dropdown`                                                 |
| expanded placeholder     | `#77707C`                                                | `--search-placeholder` (`#968d9d`)                                                |
| chip focus ring          | brand rgba box-shadow                                    | outline with `--border-focus`                                                     |

**Tokens added:** `--search-panel-shadow` (light = the old panel shadow
exactly; dark = `var(--shadow-dropdown)`, since the old panel had no dark
form), and `--z-search-panel/-trigger/-filter-menu`. **Brand shadow
decision:** the old search used no `rgba(147,28,245,…)` shadow except the
chip focus ring, which was replaced by an outline — so no brand-shadow
token was introduced and the existing pattern (logo, rail tab, Badge) was
not expanded.

Badge tones use `--status-success`/`--accent-primary` with a `color-mix`
tint; `warning`/`danger` tones (old data used amber/red hex) are **not
supported** because no status tokens exist for them.

## 15. Mock/dev data policy

`app/router/devSearchFixtures.ts` is the only data: six obviously fake
records. It lives in `app/router` (composition, like `devShellNavigation.ts`),
never in `platform/search`, and must not be imported by production code. The
old 1,200-line `searchData.ts` (HRMS people/leave/payroll records) was not
migrated.

## 16. Future contribution model

```
HRMS ─┐
CRM  ─┼─► SearchProvider (composed at app level) ─► GlobalSearch
PM   ─┘
```

Each application exposes its searchable entities through the contract; a
composing provider merges them. Search imports none of them.

## 17. Backend search: deferred

No API, FULLTEXT, external engine or indexing exists. The provider is
synchronous like the old UI; async/paging is a later decision.

## 18. Old → new

| Old                                        | New                                               |
| ------------------------------------------ | ------------------------------------------------- |
| `GlobalSearch.tsx` (bar + State A panel)   | `GlobalSearch.tsx`                                |
| `SearchFilters.tsx`                        | `SearchFilters.tsx`                               |
| `SearchResults.tsx`, `SearchResultRow.tsx` | same names                                        |
| `SearchEmptyState.tsx`                     | `SearchEmptyState.tsx` (suggestions + no-results) |
| `searchTypes.ts`                           | `types.ts` (generalised)                          |
| `searchData.ts`                            | dev fixture only                                  |
| `SearchResultsView.tsx` (State B)          | deferred                                          |
| `getSearchModuleKey`/`MODULE_*`            | not migrated (HRMS knowledge)                     |
| `.search-dropdown-enter` keyframes         | not applied — see below                           |

**Animation:** the old `index.css` defines `searchDropdownEnter` /
`.search-dropdown-enter` but nothing ever applied it, so the approved panel
had no entrance animation; none is added. Only the 140ms bar
background/border, 100ms row and 140ms chip transitions carry over (literal
durations from the old code).

## Known differences from the old UI

Token-mapping deltas in §14; a visible focus ring on the bar; highlight on
suggestions; sibling (not nested) chip clear button; colour tones limited to
success/accent; the panel uses the global theme so dark mode works (the old
panel stayed white). Not compared side by side with the running old app.
