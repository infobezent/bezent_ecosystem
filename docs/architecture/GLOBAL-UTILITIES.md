# BEZENT Global Utilities

**Status: UI capabilities implemented (Phase 0B.7). No backend, no real data.**
Governed by [AGENTS.md](../../AGENTS.md). Visual source of truth: the approved
old UI (`App.tsx` RightNav/RailBtn, `UtilityDrawerShell`, `DrawerLoader`,
`NotificationDropdown`, `TaskDrawer`, `ApprovalDrawer`, `ScheduleDrawer`,
`NotesDrawer`, and `index.css` drawer/notification animations).

## 1. Capability architecture

```
layouts/app-shell  RightRail (buttons)  ── emits onItemSelect(id) ─┐
                   TopNav bell          ── emits onNotificationsToggle
                   AppShell drawer slot ◄── renders what the host passes │
                                                                          ▼
app/router/ShellLayout  (composition: the ONLY place layouts meets platform)
        │  useActiveUtility()  ← one state: which utility is open
        ▼
platform/utility-drawer (registry, shell, shared parts)
platform/{tasks,approvals,calendar,notes,notifications}  (capability UIs)
```

`layouts` never imports `platform`, and `platform` never imports `layouts`.

## 2. RightRail vs platform

`RightRail` (layouts) is presentation only: it renders `items: ShellRailItem[]`
(id, label, icon), an active id, and reports `onItemSelect(id)`. It imports no
capability. Each capability owns its UI under `platform/<name>/`.

## 3. Capability registry (`platform/utility-drawer/registry.ts`)

One typed list — `UtilityCapabilityId` = notifications | approvals | tasks |
calendar | notes — with label, drawer title, icon and `placement`
(`rail` | `topnav`). Metadata only: no records, no renderers. The rail items
are derived from it; nothing lists rail buttons by hand.

**Update (Phase 0B.8):** the rail item is now labelled **Notes** with the
`notes` icon; "Documents" is a separate HRMS destination
([HRMS-NAVIGATION.md](HRMS-NAVIGATION.md)). The text below records the old-UI
evidence that led to it.

**Final approved capability list (from source evidence):** the old rail's
`RIGHT_ITEMS` were **Tasks, Approvals, Calendar, Documents**. There was no Notes
rail item: `getRightUtilityConfig` maps `"notes"` to the _Documents_ rail
entry, and that entry opens the **Notes** drawer (title "Notes", "Quick
personal notes"). Notifications was **not** a rail item — it is the panel
under the top-nav bell. So OLD FINAL RAIL = Tasks, Approvals, Calendar,
Documents(→Notes) + theme control; NEW RAIL = the same four, with the
registry entry `notes` keeping the old rail label "Documents" and icon.
The label/behaviour mismatch is old-UI behaviour, preserved and flagged for
a product decision (rename to "Notes"?), not silently changed. The old
`settings` utility (gear → Customize drawer) is a fifth drawer id in the old
code; it is out of this phase's scope and deferred.

## 4. Active capability state

`useActiveUtility()` — `{ activeId, toggle(id), close() }`. Exactly one
utility open: selecting another replaces it, selecting the active one closes
it, every close button calls `close()`. The rail and the bell both go through
it, so opening the notifications panel closes a drawer and vice versa (old
`handleDrawerToggle` / `onToggleNotifs` behaviour).

## 5. UtilityDrawerShell — ownership decision

Lives in `platform/utility-drawer/`, not `design-system/components` and not
`layouts`: it understands the right-rail capability lifecycle (reveal keyed to
a capability's title/icon, one-at-a-time) — platform semantics — while
purely visual primitives stay in the design system. It knows no tasks,
approvals, notes or other data. Shared header/tabs/filter panel/footer/
link/chip live beside it (`UtilityDrawerParts`), because every old drawer
repeated them.

## 6. Reveal animation

Source: `drawerCircleExpand` 360ms, `drawerIconSequence` 360ms,
`drawerContentIn` 180ms, all `cubic-bezier(0.2,0,0,1)`. The reveal is
centred in the drawer (not tied to the clicked rail icon), so no per-icon
origin geometry is needed. The old code swapped loader→content with a JS
`setTimeout(360)`; here both layers are always mounted and sequenced in CSS
(loader hides after 360ms via a `visibility` keyframe; content fades in with
a 360ms `animation-delay`). Durations are tokens
(`--motion-duration-drawer-reveal/-content`, easing
`--motion-ease-emphasized`); remounting by `key` replays it on A→B; under
`prefers-reduced-motion` the loader is skipped. No inline CSS or runtime
geometry was required.

## 7. Layering and geometry

The old drawer was `fixed; top:60; bottom:36; right: railWidth; width:370;
z-index:45` and the workspace's `right` grew by the drawer width — i.e. it
**docks and narrows the workspace**, it does not overlay it. It is now an
AppShell grid column (`grid-area: drawer`, width `--shell-utility-drawer-width`
370 when a drawer is present, animated like the rail) with
`--z-utility-drawer: 45`. Because it is docked, that value only governs the
drawer's shadow over the workspace edge; it sits below the rail (50), sidebar
(90), top/bottom bars (100), search (250/260), tooltips (300) and flyout (340).
The notifications panel is inside TopNav's stacking context at
`--z-notification-panel: 150` (old value). Border/shadow/background/header
values are the existing `--drawer-*` tokens plus `--shadow-utility-drawer`
(old `-4px 0 20px rgba(0,0,0,.25)`).

## 8. Scroll architecture

Viewport: never scrolls. Workspace: the shell's one scroller. Drawer: fixed
container (`overflow: hidden`); only each drawer's list/body scrolls
(`overflow-y: auto`). Verified at 1440×860 and 1100×520: document height =
viewport, drawer list scrolls internally, footer stays visible.

## 9-13. The capabilities

- **Notifications** (`platform/notifications`): the floating panel under the
  bell — header with unread count, Mark all read, Filter, close; tabs All /
  Action Required / Mentions; Today/Earlier groups; unread dot; per-row action;
  "View all". Escape and outside-mousedown close it (leave animation
  `notifPanelLeave` 180ms → unmount on `animationend`). Enter animation 260ms.
  Old-UI glow shadow (hardcoded brand rgba) is not reproduced.
- **Approvals** (`platform/approvals`): tabs Pending/Urgent/Recently Actioned,
  filter panel, request rows with "Review →", footer link. Contract is
  generic (requester, requestType, summary…) — no leave-specific fields.
- **Tasks** (`platform/tasks`): tabs Today/Upcoming/Completed, filter panel,
  checkbox complete (fade-out then callback), overdue/priority, workflow
  warning, empty state, footer link. This is the **global personal task
  surface**, not Project Management tasks (which will live in
  `applications/project-management`); they share nothing.
- **Calendar** (`platform/calendar`): week strip with previous/next/Today,
  the day's events with tone-coloured left border, in-drawer event detail,
  "+ Event" / "Open Full Calendar". The old strip was a fixed Sep 7-13 demo;
  this derives the current week.
- **Notes** (`platform/notes`): Pinned/Today/Earlier groups, card menu
  (pin/delete), New Note, in-drawer editor (title, content, related-to,
  "Auto-saved", back saves, delete), empty state. "Convert to Task" is not
  migrated.

Filter panels are **presentational**, exactly as in the old UI (chips
highlight but do not filter); no filtering was invented.

## 14. Theme-control boundary

The theme button stays in the right rail as a shell control fed by
`ThemeProvider` through props; it is not a utility capability and is not in
the registry.

## 15. TopNav notification decision

The bell and the panel are the one Notifications capability (`notifications`,
placement `topnav`) — the old rail had no second entry. The bell reads/writes
the same `useActiveUtility` state, shows the unread count via the design-system
`Badge`, and takes the old "joined to the panel" open look (radius + 14px
connector, via CSS). The bell carries `data-notifications-toggle` so the
panel's outside-click closer ignores it.

## 16. Fixture policy

`app/router/devUtilityFixtures.ts` holds all data and dev-only state
(`useDevUtilityData`): obviously fake, generic records, never imported by
production code. Platform modules receive data by props only.

## 17. Typed contracts

`NotificationItem`, `ApprovalItem`, `GlobalTaskItem`, `CalendarEvent`,
`NoteItem`/`NoteDraft` — the fields the migrated UI renders, nothing more.
Not DB entities.

## 18. Application boundaries

No platform utility imports `applications/*`; contracts are neutral so HRMS,
CRM and PM contribute later through providers. Approvals is cross-application
infrastructure. Search/utility interaction: a rail/bell press or opening
search closes the other's _panel_ by outside-mousedown (search panel,
notifications panel); a docked drawer stays open while search is used (as in
the old UI).

## 19. Future backend integration

Replace `useDevUtilityData` with providers (queries/mutations, real-time)
supplied at composition level. Callbacks (`onViewAll`, `onReview`,
`onOpenTask`, `onAddTask`, `onCreateEvent`) are already in the components'
props and are no-ops until pages/forms exist.

## 20. Old → new

| Old                                                                                       | New                         |
| ----------------------------------------------------------------------------------------- | --------------------------- |
| `RIGHT_ITEMS`, `RIGHT_UTILITIES`, `getRightUtilityConfig`                                 | registry + `ShellRailItem`s |
| `RightNav`, `RailBtn`                                                                     | `RightRail` (presentation)  |
| `UtilityDrawerShell`, `DrawerLoader`, `DrawerContentReady`                                | `UtilityDrawerShell`        |
| `DrawerIconBtn`, repeated header/tabs/`FilterRow`/footer                                  | `UtilityDrawerParts`        |
| `TaskDrawer`/`TaskRow`                                                                    | `platform/tasks`            |
| `ApprovalDrawer`/`ApprovalRow`                                                            | `platform/approvals`        |
| `ScheduleDrawer`/`CalEventBlock`/`EventDetailView`                                        | `platform/calendar`         |
| `NotesDrawer`/`NoteCard`/`NoteEditor`                                                     | `platform/notes`            |
| `NotificationDropdown`/`NotifRow`                                                         | `platform/notifications`    |
| Notifications/Tasks/Approvals/Schedule/Notes full pages, detail screens, Approval actions | deferred                    |
| Add Task / Create Event overlays, Convert to Task                                         | deferred                    |
| `CustomizeDrawer` (settings), AI panel                                                    | deferred                    |

## 21. Known visual/behaviour differences

- Event colours use tone tokens instead of per-category hex.
- Approval/Task type and module filter lists are business content and are not
  built in (type options come from the host).
- Notification enter animation lacks the old brand glow shadow.
- Tone colours: `--status-{danger,warning,neutral}` alias the existing drawer
  priority tokens; `--status-success` light is the old Completed/Active pair,
  its dark value follows the dark high/medium pattern (derived, not
  evidenced).
- Drawer add buttons use the bare `plusSign` glyph (old `add` was a plus).
- No side-by-side run of the old app was performed.

## Shared row/list pattern: not extracted

Task, approval, notification and note rows differ in icon size (30/32/32/none),
leading controls (checkbox / unread dot / card menu) and container (row vs
card). A common primitive would be a false abstraction; each stays in its
capability. Only the genuinely identical parts (header, tabs, filter panel,
footer, link button, tone chip) were shared. No `Button` variants were added:
the old drawers use text links, not new button styles.
