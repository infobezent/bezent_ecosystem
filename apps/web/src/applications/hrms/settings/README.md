# BEZENT HRMS — Settings Frontend Architecture

This directory houses the frontend configuration and settings domain for the **BEZENT HRMS** business application.

All components strictly compose Design System primitives from `@design-system` without application-level CSS files or inline styling, in compliance with **AGENTS.md Article 7 (Zero Application CSS Rule)**.

---

## Domain Organization

The settings frontend is organized into clear domain modules:

```
settings/
├── administration/
│   ├── forms/                     # Form Editor & Form Configuration (e.g. Employee Registration)
│   ├── onboarding/                # Onboarding workflow settings (General, Stages, Checklists, Documents, Conversion)
│   ├── employee-configuration/    # Employee Numbering & workforce configuration
│   ├── AdministrationSettingsSection.tsx  # Administration workspace orchestrator
│   └── index.ts
├── attendance/                    # Attendance policy and check-in configuration
├── leave/                         # Leave policy, balances, and accrual types
├── timesheets/                    # Project categories and timesheet rules
├── performance/                   # Review cycles, rating scales, and appraisal settings
├── general/                       # Common dashboards, employee directory presets, HR policy
├── api/                           # Backend API integration clients
├── context/                       # Shared contexts (e.g., CustomFieldsContext)
├── pages/                         # Main settings page entry point (SettingsPage.tsx)
├── types/                         # Shared domain type definitions
├── __tests__/                     # Unit and integration test suites
└── README.md                      # Architecture documentation (this file)
```

---

## Administration Domain Alignment

The `administration/` workspace orchestrates three core configuration areas:

```
Administration
├── Forms
│   └── Employee Registration
├── Onboarding
│   ├── General
│   ├── Stages
│   ├── Checklist Templates
│   ├── Document Requirements
│   └── Conversion
└── Employee Configuration
    └── Employee Numbering
```

### 1. Forms (`administration/forms/`)
- **`FormEditorPage.tsx`**: Visual Form Builder supporting Chapters, Sections, Fields, drag-and-drop ordering, and context-sensitive right inspector (Form Settings, Chapter Settings, Field Settings).
- **`FormCanvas.tsx`**: Form editor canvas with inline section editing and sortable field positioning.
- **`FieldProperties.tsx`**: Capability-driven field inspector for system and custom field metadata.
- **`FieldToolbox.tsx`**: Toolbox of available draggable field types and outline tree mode.
- **`FormsSettings.tsx`**: Administration Forms landing page listing active system and custom forms.
- **`RegistrationSettingsSection.tsx`**: Quick toggle configuration view for Employee Registration.

### 2. Onboarding (`administration/onboarding/`)
- **`GeneralSettingsSection.tsx`**: Master toggle, default timeline, and new hire ID prefix configuration.
- **`StagesSection.tsx`**: Onboarding pipeline stage management, reordering, and customization.
- **`ChecklistsSection.tsx` & `ChecklistModal.tsx`**: Checklist template authoring mapped to onboarding stages.
- **`DocumentsSection.tsx` & `DocumentModal.tsx`**: Required compliance document templates.
- **`ConversionSection.tsx`**: Conversion criteria from new hire to active employee record.
- **`FieldsSection.tsx` & `OnboardingBuilderSection.tsx`**: Custom field management and legacy builder utilities.

### 3. Employee Configuration (`administration/employee-configuration/`)
- **`EmployeeConfigurationSection.tsx`**: Workspace for employee categorization and profile configuration.
- **`EmployeeNumberingSection.tsx`**: Automated employee ID numbering series and sequences.

---

## Other Domain Modules

- **`attendance/`**: Configures shift windows, grace periods, remote/geo-fenced check-in policies.
- **`leave/`**: Configures annual balances, half-day allowances, and approval routing.
- **`timesheets/`**: Configures billable project categories and mandatory descriptions.
- **`performance/`**: Configures rating scales (e.g., 5-point, percentage) and review cadences.
- **`general/`**: Configures portal dashboard widgets, employee directory defaults, and company policies.

---

## Shared Boundaries & Dependencies

- **Organization Masters**: Company identity and organizational master records (Organization Profile, Structure, Departments, Designations, Work Locations, Job Levels/Grades) are owned by **Company Administration** (`/company-admin/organization`), not HRMS Settings. They represent company-wide master data shared across all BEZENT business applications. Deep links from `/hrms/settings/organization/*` automatically redirect to `/company-admin/organization/*`.
- **`api/`**: Shared HTTP clients for settings and forms (`formsApi.ts`, `onboardingSettingsApi.ts`, `registrationSettingsApi.ts`).
- **`types/`**: Domain contracts (`settings.ts`, `settingsCenter.ts`).
- **`context/`**: Shared state (`CustomFieldsContext.tsx`) consumed across settings and onboarding.
- **`pages/SettingsPage.tsx`**: Root settings router page switching between the overview grid, administration workspace, and individual module configuration workspaces.
