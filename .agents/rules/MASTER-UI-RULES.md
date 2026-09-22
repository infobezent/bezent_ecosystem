# BEZENT — MASTER DEVELOPMENT & UI RULES

These rules apply to ALL future BEZENT development work.

==================================================

1. EXISTING BEZENT UI IS THE SOURCE OF TRUTH
   \==================================================

The CURRENT BEZENT APPLICATION UI is the primary design reference.

Always reuse the existing BEZENT:

- Color palette
- Typography
- Font sizes
- Spacing
- Layout structure
- Navigation
- Sidebar
- Header
- Cards
- Buttons
- Input fields
- Dropdowns
- Tables
- Tabs
- Modals
- Icons
- Status indicators
- Active/inactive states
- Hover states
- Form layouts
- Action bars
- Page patterns

Every new feature must look like it naturally belongs to the existing BEZENT application.
DO NOT create a new visual design for a new feature.

================================================== 2. DO NOT INVENT A NEW UI
==================================================

NEVER independently create:

- New color palettes
- New UI themes
- New gradients
- New typography styles
- New button styles
- New card styles
- New navigation patterns
- New sidebar patterns
- New header styles
- New spacing systems
- Unrelated visual effects

If an existing BEZENT component or pattern already exists:
USE THE EXISTING COMPONENT/PATTERN.
Do not create another version of the same component.

================================================== 3. COMMON UI CONSISTENCY
==================================================

All BEZENT pages must follow one common design language.

When building a new page:
FIRST: Inspect and follow the existing BEZENT UI patterns.
THEN: Build the requested feature using those patterns.

The result must feel like:
"An existing BEZENT page with a new feature"
NOT:
"A completely new page designed separately."

================================================== 4. FRONTEND ONLY
==================================================

FOR CURRENT DEVELOPMENT:
BUILD FRONTEND ONLY.
DO NOT BUILD OR MODIFY BACKEND.

Do NOT create:

- Backend APIs
- Database schemas
- Database tables
- Server-side services
- Backend authentication
- Backend workflows
- Backend integrations
- Backend validation
- API endpoints
- Database migrations

Do not make backend changes even if the feature could eventually require them.

================================================== 5. FRONTEND FUNCTIONALITY
==================================================

Although backend development is prohibited, the frontend must still be interactive.
Use frontend state/mock data where necessary.
Frontend interactions should work for demonstration purposes.

Examples:

- Buttons should respond.
- Tabs should switch.
- Dropdowns should open.
- Search should work using frontend data.
- Forms should accept input.
- Add actions should work.
- Edit actions should work.
- Delete actions should work with confirmation.
- Drag/reorder interactions should work where required.
- Modals should open and close.
- Preview should work.
- Toggles should work.
- Status indicators should update.
- Navigation should work.
- Save Draft can use frontend/local state for demonstration.

Do not connect these interactions to a backend.

================================================== 6. PRESERVE EXISTING FUNCTIONALITY
==================================================

The existing approved application is the source of truth.

When implementing a new feature:

- Do not redesign unrelated pages.
- Do not change unrelated modules.
- Do not remove existing functionality.
- Do not rename existing navigation items.
- Do not reorder existing navigation items.
- Do not change existing approved workflows.
- Do not change existing data structures unless explicitly requested.

ONLY modify what the current request requires.

================================================== 7. EXISTING NAVIGATION NAMES
==================================================

Always use the exact names already present in the BEZENT navigation.
Do NOT create alternative naming systems.

For example, if the navigation says:
Dashboard, Onboarding, Leave, Attendance, Timesheets, Performance, Employees, HR Settings
use those exact names.

Do NOT rename them to: People, Work & Time, Growth, Workplace, etc. unless explicitly requested.

================================================== 8. NEW FEATURES MUST FIT THE EXISTING STRUCTURE
==================================================

When a new feature is requested:

1. Identify where it belongs in the existing BEZENT navigation.
2. Reuse the existing page/layout pattern.
3. Reuse existing UI components.
4. Add only the requested functionality.
5. Do not create unnecessary modules or settings.
6. Do not introduce unrelated features.

================================================== 9. SETTINGS PRINCIPLE
==================================================

The BEZENT Settings area is the common configuration center for the portal.
Settings should use the SAME module names as the main BEZENT navigation.

Example:
Settings
├── Dashboard
├── Onboarding
├── Leave
├── Attendance
├── Timesheets
├── Performance
├── Employees
└── HR Settings

Each settings area should configure the corresponding BEZENT module.
Do not create a separate naming/category system inside Settings.

================================================== 10. CUSTOMIZATION PRINCIPLE
==================================================

When a module requires customization:
Allow authorized users to configure the module through the frontend.

Depending on the requested module, this may include:

- Add / Edit / Delete / Rename / Reorder
- Hide/Show, Required/Optional
- Dropdown options, Field types, Field properties
- Preview, Save Draft, Publish

Only implement the customization capabilities explicitly required for that module.
Do not add unnecessary configuration features.

================================================== 11. DO NOT OVERBUILD
==================================================

Keep every implementation focused on the actual requirement.
Do NOT add features simply because they could be useful.

Do NOT create:

- Unrequested dashboards
- Unrequested analytics
- Unrequested workflows
- Unrequested permissions
- Unrequested reports
- Unrequested backend systems
- Unrequested configuration options

Build what is requested. Nothing unnecessary.

================================================== 12. RESPONSIVE & ENTERPRISE UI
==================================================

Maintain the existing BEZENT enterprise design.
Use:

- Clean spacing, Consistent alignment, Clear hierarchy
- Existing BEZENT colors, Existing component sizes
- Existing responsive behavior, Existing interaction patterns

Avoid:

- Oversized elements, Excessive rounded cards
- Random gradients, Excessive decorative graphics
- Unnecessary animations, Visually inconsistent components

================================================== 13. IMPLEMENTATION RULE
==================================================

Before creating anything new, ask:
"Does BEZENT already have a UI pattern for this?"
If YES: → Reuse it.
If NO: → Create the smallest possible component that matches the existing BEZENT design language.

Never introduce a completely new design system.

================================================== 14. FINAL VALIDATION
==================================================

Before completing any task, verify:
✓ Existing BEZENT colors are preserved.
✓ Existing UI patterns are reused.
✓ Existing navigation names are preserved.
✓ Existing layouts are respected.
✓ No unrelated modules were modified.
✓ No backend was created or modified.
✓ No database changes were made.
✓ Requested frontend interactions work.
✓ No unnecessary features were added.
✓ New UI looks native to BEZENT.

==================================================
MASTER RULE
==================================================

EXISTING BEZENT UI → SOURCE OF TRUTH → REUSE EXISTING COMPONENTS → BUILD ONLY REQUESTED FEATURE → FRONTEND ONLY → NO BACKEND → NO NEW UI STYLE → NO UNNECESSARY FEATURES
