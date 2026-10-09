import {
  mysqlTable,
  varchar,
  timestamp,
  mysqlEnum,
  index,
  boolean,
  int,
  uniqueIndex,
  json,
  type AnyMySqlColumn,
} from 'drizzle-orm/mysql-core';
import { sql } from 'drizzle-orm';

/**
 * Platform: Tenants
 * Top-level customer/account and data-isolation boundary.
 */
export const tenants = mysqlTable('tenants', {
  id: varchar('id', { length: 64 }).primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  maxCompanies: int('max_companies').notNull().default(5),
  logoUrl: varchar('logo_url', { length: 500 }),
  bannerUrl: varchar('banner_url', { length: 500 }),
  status: mysqlEnum('status', ['active', 'inactive', 'suspended', 'archived'])
    .default('active')
    .notNull(),
  suspendedReason: varchar('suspended_reason', { length: 1000 }),
  suspendedAt: timestamp('suspended_at'),
  reactivatedAt: timestamp('reactivated_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
});

/**
 * Organization Masters: Companies
 */
export const companies = mysqlTable(
  'companies',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    tenantId: varchar('tenant_id', { length: 64 }).notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    code: varchar('code', { length: 50 }).notNull(),
    legalName: varchar('legal_name', { length: 255 }),
    businessEmail: varchar('business_email', { length: 255 }),
    contactPhone: varchar('contact_phone', { length: 50 }),
    country: varchar('country', { length: 100 }),
    timeZone: varchar('time_zone', { length: 100 }),
    displayName: varchar('display_name', { length: 255 }),
    organizationType: varchar('organization_type', { length: 100 }),
    industry: varchar('industry', { length: 100 }),
    website: varchar('website', { length: 255 }),
    logoUrl: varchar('logo_url', { length: 500 }),
    alternateEmail: varchar('alternate_email', { length: 255 }),
    alternatePhone: varchar('alternate_phone', { length: 50 }),
    addressLine1: varchar('address_line_1', { length: 255 }),
    addressLine2: varchar('address_line_2', { length: 255 }),
    state: varchar('state', { length: 100 }),
    city: varchar('city', { length: 100 }),
    postalCode: varchar('postal_code', { length: 20 }),
    registrationNumber: varchar('registration_number', { length: 100 }),
    currency: varchar('currency', { length: 10 }),
    locale: varchar('locale', { length: 20 }),
    dateFormat: varchar('date_format', { length: 30 }),
    weekStartsOn: varchar('week_starts_on', { length: 20 }),
    financialYearStart: varchar('financial_year_start', { length: 20 }),
    brandingMode: varchar('branding_mode', { length: 30 }).default('initials').notNull(),
    status: mysqlEnum('status', ['active', 'inactive', 'suspended']).default('active').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    index('idx_companies_tenant_id').on(table.tenantId),
    index('idx_companies_code').on(table.code),
  ],
);

/**
 * Platform: Media Assets
 * Metadata index for all persistent media and documents in the platform.
 */
export const mediaAssets = mysqlTable(
  'media_assets',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    tenantId: varchar('tenant_id', { length: 64 }).notNull(),
    ownerType: mysqlEnum('owner_type', ['tenant', 'company']).notNull(),
    ownerId: varchar('owner_id', { length: 64 }).notNull(),
    assetType: mysqlEnum('asset_type', ['tenant_logo', 'tenant_banner', 'company_logo']).notNull(),
    storageProvider: varchar('storage_provider', { length: 50 }).notNull(),
    storageKey: varchar('storage_key', { length: 500 }).notNull(),
    originalFilename: varchar('original_filename', { length: 255 }).notNull(),
    mimeType: varchar('mime_type', { length: 100 }).notNull(),
    sizeBytes: int('size_bytes').notNull(),
    width: int('width'),
    height: int('height'),
    status: mysqlEnum('status', ['active', 'archived', 'deleted']).default('active').notNull(),
    createdBy: varchar('created_by', { length: 64 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    index('idx_media_assets_tenant_id').on(table.tenantId),
    index('idx_media_assets_owner').on(table.ownerType, table.ownerId),
    index('idx_media_assets_status').on(table.status),
  ],
);

export type MediaAsset = typeof mediaAssets.$inferSelect;
export type NewMediaAsset = typeof mediaAssets.$inferInsert;

/**
 * Organization Masters: Departments
 */
export const departments = mysqlTable(
  'departments',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    tenantId: varchar('tenant_id', { length: 64 }).notNull(),
    companyId: varchar('company_id', { length: 64 })
      .notNull()
      .references(() => companies.id),
    name: varchar('name', { length: 255 }).notNull(),
    code: varchar('code', { length: 50 }),
    description: varchar('description', { length: 1000 }),
    businessUnitId: varchar('business_unit_id', { length: 64 }).references(
      (): AnyMySqlColumn => businessUnits.id,
    ),
    divisionId: varchar('division_id', { length: 64 }).references(
      (): AnyMySqlColumn => divisions.id,
    ),
    parentDepartmentId: varchar('parent_department_id', { length: 64 }).references(
      (): AnyMySqlColumn => departments.id,
    ),
    headEmployeeId: varchar('head_employee_id', { length: 64 }).references(
      (): AnyMySqlColumn => employees.id,
    ),
    status: mysqlEnum('status', ['active', 'inactive']).default('active').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    index('idx_departments_tenant_company').on(table.tenantId, table.companyId),
    index('idx_departments_business_unit').on(table.businessUnitId),
    index('idx_departments_division').on(table.divisionId),
    index('idx_departments_parent').on(table.parentDepartmentId),
    index('idx_departments_company_code').on(table.companyId, table.code),
  ],
);

/**
 * Organization Masters: Designations
 */
export const designations = mysqlTable(
  'designations',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    tenantId: varchar('tenant_id', { length: 64 }).notNull(),
    companyId: varchar('company_id', { length: 64 })
      .notNull()
      .references(() => companies.id),
    name: varchar('name', { length: 255 }).notNull(),
    code: varchar('code', { length: 50 }),
    description: varchar('description', { length: 1000 }),
    departmentId: varchar('department_id', { length: 64 }).references(
      (): AnyMySqlColumn => departments.id,
    ),
    status: mysqlEnum('status', ['active', 'inactive']).default('active').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    index('idx_designations_tenant_company').on(table.tenantId, table.companyId),
    uniqueIndex('idx_designations_company_code').on(table.companyId, table.code),
    index('idx_designations_department').on(table.departmentId),
  ],
);

/**
 * Organization Masters: Work Locations
 */
export const locationTypeEnum = mysqlEnum('type', [
  'office',
  'branch',
  'plant_factory',
  'client_site',
  'remote',
  'other',
]);

export const locations = mysqlTable(
  'locations',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    tenantId: varchar('tenant_id', { length: 64 }).notNull(),
    companyId: varchar('company_id', { length: 64 })
      .notNull()
      .references(() => companies.id),
    name: varchar('name', { length: 255 }).notNull(),
    code: varchar('code', { length: 50 }),
    type: locationTypeEnum.default('office').notNull(),
    addressLine1: varchar('address_line_1', { length: 255 }),
    addressLine2: varchar('address_line_2', { length: 255 }),
    city: varchar('city', { length: 100 }),
    state: varchar('state', { length: 100 }),
    country: varchar('country', { length: 100 }),
    postalCode: varchar('postal_code', { length: 20 }),
    timezone: varchar('timezone', { length: 100 }),
    description: varchar('description', { length: 1000 }),
    status: mysqlEnum('status', ['active', 'inactive']).default('active').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    index('idx_locations_tenant_company').on(table.tenantId, table.companyId),
    index('idx_locations_company').on(table.companyId),
    uniqueIndex('idx_locations_company_code').on(table.companyId, table.code),
  ],
);

/**
 * Organization Masters: Job Levels
 * Seniority / classification tier master within Company.
 */
export const jobLevels = mysqlTable(
  'job_levels',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    tenantId: varchar('tenant_id', { length: 64 }).notNull(),
    companyId: varchar('company_id', { length: 64 })
      .notNull()
      .references(() => companies.id),
    name: varchar('name', { length: 255 }).notNull(),
    code: varchar('code', { length: 50 }).notNull(),
    rank: int('rank').notNull(),
    description: varchar('description', { length: 1000 }),
    status: mysqlEnum('status', ['active', 'inactive']).default('active').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    index('idx_job_levels_tenant_company').on(table.tenantId, table.companyId),
    uniqueIndex('idx_job_levels_company_code').on(table.companyId, table.code),
    uniqueIndex('idx_job_levels_company_rank').on(table.companyId, table.rank),
    index('idx_job_levels_company_status').on(table.companyId, table.status),
  ],
);

/**
 * Organization Masters: Grades
 * Employment / classification grade master within Company.
 */
export const grades = mysqlTable(
  'grades',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    tenantId: varchar('tenant_id', { length: 64 }).notNull(),
    companyId: varchar('company_id', { length: 64 })
      .notNull()
      .references(() => companies.id),
    name: varchar('name', { length: 255 }).notNull(),
    code: varchar('code', { length: 50 }).notNull(),
    rank: int('rank').notNull(),
    description: varchar('description', { length: 1000 }),
    status: mysqlEnum('status', ['active', 'inactive']).default('active').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    index('idx_grades_tenant_company').on(table.tenantId, table.companyId),
    uniqueIndex('idx_grades_company_code').on(table.companyId, table.code),
    uniqueIndex('idx_grades_company_rank').on(table.companyId, table.rank),
    index('idx_grades_company_status').on(table.companyId, table.status),
  ],
);

/**
 * Organization Structure: Business Units
 * Optional layer under Company in the organizational hierarchy.
 */
export const businessUnits = mysqlTable(
  'business_units',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    tenantId: varchar('tenant_id', { length: 64 }).notNull(),
    companyId: varchar('company_id', { length: 64 })
      .notNull()
      .references(() => companies.id),
    name: varchar('name', { length: 255 }).notNull(),
    code: varchar('code', { length: 50 }),
    description: varchar('description', { length: 1000 }),
    headEmployeeId: varchar('head_employee_id', { length: 64 }).references(
      (): AnyMySqlColumn => employees.id,
    ),
    status: mysqlEnum('status', ['active', 'inactive']).default('active').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    index('idx_business_units_tenant_company').on(table.tenantId, table.companyId),
    index('idx_business_units_company_code').on(table.companyId, table.code),
  ],
);

/**
 * Organization Structure: Divisions
 * Optional layer under Business Unit in the organizational hierarchy.
 */
export const divisions = mysqlTable(
  'divisions',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    tenantId: varchar('tenant_id', { length: 64 }).notNull(),
    companyId: varchar('company_id', { length: 64 })
      .notNull()
      .references(() => companies.id),
    businessUnitId: varchar('business_unit_id', { length: 64 })
      .notNull()
      .references(() => businessUnits.id),
    name: varchar('name', { length: 255 }).notNull(),
    code: varchar('code', { length: 50 }),
    description: varchar('description', { length: 1000 }),
    headEmployeeId: varchar('head_employee_id', { length: 64 }).references(
      (): AnyMySqlColumn => employees.id,
    ),
    status: mysqlEnum('status', ['active', 'inactive']).default('active').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    index('idx_divisions_tenant_company').on(table.tenantId, table.companyId),
    index('idx_divisions_business_unit').on(table.businessUnitId),
    index('idx_divisions_company_code').on(table.companyId, table.code),
  ],
);

export type BusinessUnit = typeof businessUnits.$inferSelect;
export type NewBusinessUnit = typeof businessUnits.$inferInsert;
export type Division = typeof divisions.$inferSelect;
export type NewDivision = typeof divisions.$inferInsert;

/**
 * HRMS Domain: Onboarding Cases (New Hires)
 * Represents individuals in the onboarding workflow prior to employee record creation.
 * Draft is an OnboardingCase lifecycle state (status = 'draft').
 */
export const onboardingCases = mysqlTable(
  'onboarding_cases',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    tenantId: varchar('tenant_id', { length: 64 }).notNull(),
    companyId: varchar('company_id', { length: 64 })
      .notNull()
      .references(() => companies.id),
    departmentId: varchar('department_id', { length: 64 }).references(() => departments.id),
    designationId: varchar('designation_id', { length: 64 }).references(() => designations.id),
    locationId: varchar('location_id', { length: 64 }).references(() => locations.id),
    firstName: varchar('first_name', { length: 100 }),
    lastName: varchar('last_name', { length: 100 }),
    email: varchar('email', { length: 255 }),
    phone: varchar('phone', { length: 50 }),
    joiningDate: varchar('joining_date', { length: 10 }),
    employmentType: mysqlEnum('employment_type', ['full_time', 'part_time', 'contract', 'intern'])
      .default('full_time')
      .notNull(),
    stage: varchar('stage', { length: 50 }).default('preboarding').notNull(),
    status: mysqlEnum('status', ['draft', 'active', 'withdrawn', 'completed'])
      .default('active')
      .notNull(),
    version: int('version').default(1).notNull(),
    draftPayload: json('draft_payload').$type<Record<string, unknown>>(),
    withdrawalReason: varchar('withdrawal_reason', { length: 500 }),
    withdrawnAt: timestamp('withdrawn_at'),
    completedAt: timestamp('completed_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    index('idx_onboarding_tenant_company').on(table.tenantId, table.companyId),
    index('idx_onboarding_email').on(table.email),
    index('idx_onboarding_stage').on(table.stage),
    index('idx_onboarding_status').on(table.status),
  ],
);

/**
 * HR Settings Domain: Onboarding General Settings
 */
export const onboardingGeneralSettings = mysqlTable(
  'onboarding_general_settings',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    tenantId: varchar('tenant_id', { length: 64 }).notNull(),
    companyId: varchar('company_id', { length: 64 })
      .notNull()
      .references(() => companies.id),
    onboardingEnabled: boolean('onboarding_enabled').default(true).notNull(),
    defaultDurationDays: int('default_duration_days').default(30).notNull(),
    idPrefix: varchar('id_prefix', { length: 20 }).default('NH-').notNull(),
    defaultLocationId: varchar('default_location_id', { length: 64 }).references(
      () => locations.id,
    ),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
  },
  (table) => [uniqueIndex('idx_onboarding_gen_tenant_company').on(table.tenantId, table.companyId)],
);

/**
 * HR Settings Domain: Onboarding Stage Configurations
 */
export const onboardingStageConfigs = mysqlTable(
  'onboarding_stage_configs',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    tenantId: varchar('tenant_id', { length: 64 }).notNull(),
    companyId: varchar('company_id', { length: 64 })
      .notNull()
      .references(() => companies.id),
    stageKey: varchar('stage_key', { length: 50 }).notNull(),
    name: varchar('name', { length: 100 }).notNull(),
    description: varchar('description', { length: 255 }),
    displayOrder: int('display_order').default(0).notNull(),
    isRequired: boolean('is_required').default(true).notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    isSystem: boolean('is_system').default(true).notNull(),
    isTerminal: boolean('is_terminal').default(false).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    index('idx_onboarding_stages_company').on(table.tenantId, table.companyId),
    uniqueIndex('idx_onboarding_stages_key').on(table.tenantId, table.companyId, table.stageKey),
  ],
);

/**
 * HR Settings Domain: Onboarding Field Configurations
 */
export const onboardingFieldConfigs = mysqlTable(
  'onboarding_field_configs',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    tenantId: varchar('tenant_id', { length: 64 }).notNull(),
    companyId: varchar('company_id', { length: 64 })
      .notNull()
      .references(() => companies.id),
    fieldKey: varchar('field_key', { length: 50 }).notNull(),
    label: varchar('label', { length: 100 }).notNull(),
    isRequired: boolean('is_required').default(false).notNull(),
    isEnabled: boolean('is_enabled').default(true).notNull(),
    displayOrder: int('display_order').default(0).notNull(),
    isSystem: boolean('is_system').default(true).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    index('idx_onboarding_fields_company').on(table.tenantId, table.companyId),
    uniqueIndex('idx_onboarding_fields_key').on(table.tenantId, table.companyId, table.fieldKey),
  ],
);

/**
 * HR Settings Domain: Onboarding Document Requirements
 */
export const onboardingDocumentRequirements = mysqlTable(
  'onboarding_document_requirements',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    tenantId: varchar('tenant_id', { length: 64 }).notNull(),
    companyId: varchar('company_id', { length: 64 })
      .notNull()
      .references(() => companies.id),
    documentType: varchar('document_type', { length: 50 }).notNull(),
    name: varchar('name', { length: 100 }).notNull(),
    description: varchar('description', { length: 255 }),
    isRequired: boolean('is_required').default(true).notNull(),
    verificationRequired: boolean('verification_required').default(true).notNull(),
    expiryTracking: boolean('expiry_tracking').default(false).notNull(),
    displayOrder: int('display_order').default(0).notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    index('idx_onboarding_docs_company').on(table.tenantId, table.companyId),
    uniqueIndex('idx_onboarding_docs_type').on(table.tenantId, table.companyId, table.documentType),
  ],
);

/**
 * HR Settings Domain: Onboarding Checklist / Task Templates
 */
export const onboardingChecklistTemplates = mysqlTable(
  'onboarding_checklist_templates',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    tenantId: varchar('tenant_id', { length: 64 }).notNull(),
    companyId: varchar('company_id', { length: 64 })
      .notNull()
      .references(() => companies.id),
    name: varchar('name', { length: 150 }).notNull(),
    description: varchar('description', { length: 255 }),
    stageKey: varchar('stage_key', { length: 50 }).notNull(),
    assigneeType: varchar('assignee_type', { length: 50 }).default('hr').notNull(),
    dueOffsetDays: int('due_offset_days').default(0).notNull(),
    isRequired: boolean('is_required').default(true).notNull(),
    displayOrder: int('display_order').default(0).notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    index('idx_onboarding_checklists_company').on(table.tenantId, table.companyId),
    index('idx_onboarding_checklists_stage').on(table.stageKey),
  ],
);

/**
 * HR Settings Domain: Onboarding Employee Conversion Settings
 */
export const onboardingConversionSettings = mysqlTable(
  'onboarding_conversion_settings',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    tenantId: varchar('tenant_id', { length: 64 }).notNull(),
    companyId: varchar('company_id', { length: 64 })
      .notNull()
      .references(() => companies.id),
    autoConvertOnJoining: boolean('auto_convert_on_joining').default(false).notNull(),
    requireDocumentVerification: boolean('require_document_verification').default(true).notNull(),
    requireChecklistCompletion: boolean('require_checklist_completion').default(true).notNull(),
    employeeIdPrefix: varchar('employee_id_prefix', { length: 20 }).default('EMP-').notNull(),
    defaultEmploymentStatus: varchar('default_employment_status', { length: 50 })
      .default('probation')
      .notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    uniqueIndex('idx_onboarding_conv_tenant_company').on(table.tenantId, table.companyId),
  ],
);

export type Tenant = typeof tenants.$inferSelect;
export type NewTenant = typeof tenants.$inferInsert;

export type Company = typeof companies.$inferSelect;
export type NewCompany = typeof companies.$inferInsert;

export type Department = typeof departments.$inferSelect;
export type NewDepartment = typeof departments.$inferInsert;

export type Designation = typeof designations.$inferSelect;
export type NewDesignation = typeof designations.$inferInsert;

export type Location = typeof locations.$inferSelect;
export type NewLocation = typeof locations.$inferInsert;

export type JobLevel = typeof jobLevels.$inferSelect;
export type NewJobLevel = typeof jobLevels.$inferInsert;

export type Grade = typeof grades.$inferSelect;
export type NewGrade = typeof grades.$inferInsert;

export type OnboardingCase = typeof onboardingCases.$inferSelect;
export type NewOnboardingCase = typeof onboardingCases.$inferInsert;

export type OnboardingGeneralSettings = typeof onboardingGeneralSettings.$inferSelect;
export type NewOnboardingGeneralSettings = typeof onboardingGeneralSettings.$inferInsert;

export type OnboardingStageConfig = typeof onboardingStageConfigs.$inferSelect;
export type NewOnboardingStageConfig = typeof onboardingStageConfigs.$inferInsert;

export type OnboardingFieldConfig = typeof onboardingFieldConfigs.$inferSelect;
export type NewOnboardingFieldConfig = typeof onboardingFieldConfigs.$inferInsert;

export type OnboardingDocumentRequirement = typeof onboardingDocumentRequirements.$inferSelect;
export type NewOnboardingDocumentRequirement = typeof onboardingDocumentRequirements.$inferInsert;

export type OnboardingChecklistTemplate = typeof onboardingChecklistTemplates.$inferSelect;
export type NewOnboardingChecklistTemplate = typeof onboardingChecklistTemplates.$inferInsert;

export type OnboardingConversionSettings = typeof onboardingConversionSettings.$inferSelect;
export type NewOnboardingConversionSettings = typeof onboardingConversionSettings.$inferInsert;

/**
 * HRMS Domain: Onboarding Case Stage & Status History
 * Audit trail for stage progressions, reversions, withdrawals, and completions.
 */
export const onboardingCaseStageHistory = mysqlTable(
  'onboarding_case_stage_history',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    tenantId: varchar('tenant_id', { length: 64 }).notNull(),
    companyId: varchar('company_id', { length: 64 })
      .notNull()
      .references(() => companies.id),
    caseId: varchar('case_id', { length: 64 })
      .notNull()
      .references(() => onboardingCases.id),
    fromStage: varchar('from_stage', { length: 50 }),
    toStage: varchar('to_stage', { length: 50 }).notNull(),
    action: mysqlEnum('action', ['transition', 'revert', 'withdraw', 'complete']).notNull(),
    notes: varchar('notes', { length: 500 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_case_history_tenant_company').on(table.tenantId, table.companyId),
    index('idx_case_history_case_id').on(table.caseId),
    index('idx_case_history_created_at').on(table.createdAt),
  ],
);

export type OnboardingCaseStageHistory = typeof onboardingCaseStageHistory.$inferSelect;
export type NewOnboardingCaseStageHistory = typeof onboardingCaseStageHistory.$inferInsert;

/**
 * HRMS Domain: Employees
 * Canonical workforce record for employees post-conversion.
 * Invariants: Employee != User != Candidate.
 * user_id is a nullable bridge for future IAM integration.
 */
export const employees = mysqlTable(
  'employees',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    tenantId: varchar('tenant_id', { length: 64 }).notNull(),
    companyId: varchar('company_id', { length: 64 })
      .notNull()
      .references(() => companies.id),
    employeeNumber: varchar('employee_number', { length: 50 }).notNull(),
    userId: varchar('user_id', { length: 64 }),
    firstName: varchar('first_name', { length: 100 }).notNull(),
    lastName: varchar('last_name', { length: 100 }),
    email: varchar('email', { length: 255 }).notNull(),
    phone: varchar('phone', { length: 50 }),
    departmentId: varchar('department_id', { length: 64 }).references(() => departments.id),
    designationId: varchar('designation_id', { length: 64 }).references(() => designations.id),
    locationId: varchar('location_id', { length: 64 }).references(() => locations.id),
    reportingManagerId: varchar('reporting_manager_id', { length: 64 }).references(
      (): AnyMySqlColumn => employees.id,
    ),
    joiningDate: varchar('joining_date', { length: 10 }).notNull(),
    confirmedJoiningDate: varchar('confirmed_joining_date', { length: 10 }),
    probationEndDate: varchar('probation_end_date', { length: 10 }),
    confirmationDate: varchar('confirmation_date', { length: 10 }),
    lastWorkingDate: varchar('last_working_date', { length: 10 }),
    // Employment terms captured at hire (Registration → General)
    sourceOfHire: mysqlEnum('source_of_hire', [
      'direct_applicant',
      'referral',
      'agency',
      'campus',
      'linkedin',
      'other',
    ]),
    referralCode: varchar('referral_code', { length: 50 }),
    referredByEmployeeId: varchar('referred_by_employee_id', { length: 64 }).references(
      (): AnyMySqlColumn => employees.id,
    ),
    noticePeriodDays: int('notice_period_days'),
    contractEndDate: varchar('contract_end_date', { length: 10 }),
    employmentType: mysqlEnum('employment_type', ['full_time', 'part_time', 'contract', 'intern'])
      .default('full_time')
      .notNull(),
    employmentStatus: mysqlEnum('employment_status', [
      'pending_activation',
      'active',
      'probation',
      'notice',
      'terminated',
      'suspended',
      'resigned',
    ])
      .default('pending_activation')
      .notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    index('idx_employees_tenant_company').on(table.tenantId, table.companyId),
    uniqueIndex('idx_employees_company_emp_no').on(
      table.tenantId,
      table.companyId,
      table.employeeNumber,
    ),
    uniqueIndex('idx_employees_company_ref_code').on(
      table.tenantId,
      table.companyId,
      table.referralCode,
    ),
    index('idx_employees_email').on(table.tenantId, table.companyId, table.email),
    index('idx_employees_department').on(table.departmentId),
    index('idx_employees_designation').on(table.designationId),
    index('idx_employees_location').on(table.locationId),
    index('idx_employees_user_id').on(table.userId),
    index('idx_employees_reporting_manager').on(table.reportingManagerId),
    index('idx_employees_referred_by').on(table.referredByEmployeeId),
  ],
);

export type Employee = typeof employees.$inferSelect;
export type NewEmployee = typeof employees.$inferInsert;

/*
 * HRMS Domain: Employee record details (canonical, employee-owned).
 * Every row is tenant/company scoped and belongs to exactly one employee.
 * One-to-one details are keyed by employee_id; repeatable records have their
 * own id. These hold the employee's CURRENT HR record — not a snapshot of the
 * onboarding registration form.
 */

/** Personal details and personal contact/address (one per employee). */
export const employeePersonalDetails = mysqlTable(
  'employee_personal_details',
  {
    employeeId: varchar('employee_id', { length: 64 })
      .primaryKey()
      .references(() => employees.id),
    tenantId: varchar('tenant_id', { length: 64 }).notNull(),
    companyId: varchar('company_id', { length: 64 })
      .notNull()
      .references(() => companies.id),
    middleName: varchar('middle_name', { length: 100 }),
    preferredName: varchar('preferred_name', { length: 100 }),
    gender: varchar('gender', { length: 50 }),
    dateOfBirth: varchar('date_of_birth', { length: 10 }),
    maritalStatus: varchar('marital_status', { length: 50 }),
    bloodGroup: varchar('blood_group', { length: 10 }),
    nationality: varchar('nationality', { length: 100 }),
    nativeLanguage: varchar('native_language', { length: 100 }),
    fatherName: varchar('father_name', { length: 200 }),
    guardianName: varchar('guardian_name', { length: 200 }),
    personalEmail: varchar('personal_email', { length: 255 }),
    homePhone: varchar('home_phone', { length: 50 }),
    businessPhone: varchar('business_phone', { length: 50 }),
    workPhone: varchar('work_phone', { length: 50 }),
    // Current Address
    addressStreet: varchar('address_street', { length: 255 }),
    addressLine2: varchar('address_line_2', { length: 255 }),
    addressCity: varchar('address_city', { length: 100 }),
    addressDistrict: varchar('address_district', { length: 100 }),
    addressState: varchar('address_state', { length: 100 }),
    addressPostalCode: varchar('address_postal_code', { length: 20 }),
    addressCountry: varchar('address_country', { length: 100 }),
    // Permanent Address
    isPermanentSameAsCurrent: boolean('is_permanent_same_as_current').default(true).notNull(),
    permanentAddressStreet: varchar('permanent_address_street', { length: 255 }),
    permanentAddressLine2: varchar('permanent_address_line_2', { length: 255 }),
    permanentAddressCity: varchar('permanent_address_city', { length: 100 }),
    permanentAddressDistrict: varchar('permanent_address_district', { length: 100 }),
    permanentAddressState: varchar('permanent_address_state', { length: 100 }),
    permanentAddressPostalCode: varchar('permanent_address_postal_code', { length: 20 }),
    permanentAddressCountry: varchar('permanent_address_country', { length: 100 }),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
  },
  (table) => [index('idx_emp_personal_tenant_company').on(table.tenantId, table.companyId)],
);

/** Family members (repeatable). */
export const employeeFamilyMembers = mysqlTable(
  'employee_family_members',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    tenantId: varchar('tenant_id', { length: 64 }).notNull(),
    companyId: varchar('company_id', { length: 64 })
      .notNull()
      .references(() => companies.id),
    employeeId: varchar('employee_id', { length: 64 })
      .notNull()
      .references(() => employees.id),
    name: varchar('name', { length: 200 }).notNull(),
    relationship: varchar('relationship', { length: 50 }).notNull(),
    dateOfBirth: varchar('date_of_birth', { length: 10 }),
    phone: varchar('phone', { length: 50 }),
    sortOrder: int('sort_order').default(0).notNull(),
  },
  (table) => [
    index('idx_emp_family_tenant_company').on(table.tenantId, table.companyId),
    index('idx_emp_family_employee').on(table.employeeId),
  ],
);

/** Nominees (repeatable; shares total at most 100%). */
export const employeeNominees = mysqlTable(
  'employee_nominees',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    tenantId: varchar('tenant_id', { length: 64 }).notNull(),
    companyId: varchar('company_id', { length: 64 })
      .notNull()
      .references(() => companies.id),
    employeeId: varchar('employee_id', { length: 64 })
      .notNull()
      .references(() => employees.id),
    name: varchar('name', { length: 200 }).notNull(),
    relationship: varchar('relationship', { length: 50 }).notNull(),
    sharePercentage: int('share_percentage').notNull(),
    sortOrder: int('sort_order').default(0).notNull(),
  },
  (table) => [
    index('idx_emp_nominee_tenant_company').on(table.tenantId, table.companyId),
    index('idx_emp_nominee_employee').on(table.employeeId),
  ],
);

/** Emergency contacts (primary and optional secondary). */
export const employeeEmergencyContacts = mysqlTable(
  'employee_emergency_contacts',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    tenantId: varchar('tenant_id', { length: 64 }).notNull(),
    companyId: varchar('company_id', { length: 64 })
      .notNull()
      .references(() => companies.id),
    employeeId: varchar('employee_id', { length: 64 })
      .notNull()
      .references(() => employees.id),
    priority: mysqlEnum('priority', ['primary', 'secondary']).notNull(),
    name: varchar('name', { length: 200 }).notNull(),
    relationship: varchar('relationship', { length: 50 }).notNull(),
    phone: varchar('phone', { length: 50 }).notNull(),
    email: varchar('email', { length: 255 }),
    address: varchar('address', { length: 500 }),
    isPrivate: boolean('is_private').default(false).notNull(),
  },
  (table) => [
    index('idx_emp_emergency_tenant_company').on(table.tenantId, table.companyId),
    uniqueIndex('idx_emp_emergency_employee_priority').on(table.employeeId, table.priority),
  ],
);

/** Salary bank account (one per employee). Account numbers are masked in API responses. */
export const employeeBankAccounts = mysqlTable(
  'employee_bank_accounts',
  {
    employeeId: varchar('employee_id', { length: 64 })
      .primaryKey()
      .references(() => employees.id),
    tenantId: varchar('tenant_id', { length: 64 }).notNull(),
    companyId: varchar('company_id', { length: 64 })
      .notNull()
      .references(() => companies.id),
    accountHolderName: varchar('account_holder_name', { length: 200 }).notNull(),
    accountNumber: varchar('account_number', { length: 34 }).notNull(),
    ifscCode: varchar('ifsc_code', { length: 11 }).notNull(),
    bankName: varchar('bank_name', { length: 200 }).notNull(),
    branchName: varchar('branch_name', { length: 200 }),
    bankLocation: varchar('bank_location', { length: 200 }),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
  },
  (table) => [index('idx_emp_bank_tenant_company').on(table.tenantId, table.companyId)],
);

/** Skills (repeatable). Examiner/verifier/mentor are employees of the same company. */
export const employeeSkills = mysqlTable(
  'employee_skills',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    tenantId: varchar('tenant_id', { length: 64 }).notNull(),
    companyId: varchar('company_id', { length: 64 })
      .notNull()
      .references(() => companies.id),
    employeeId: varchar('employee_id', { length: 64 })
      .notNull()
      .references(() => employees.id),
    skillName: varchar('skill_name', { length: 200 }).notNull(),
    skillType: varchar('skill_type', { length: 50 }).notNull(),
    proficiency: mysqlEnum('proficiency', [
      'Beginner',
      'Intermediate',
      'Advanced',
      'Expert',
    ]).notNull(),
    level: varchar('level', { length: 50 }),
    assessedOn: varchar('assessed_on', { length: 10 }),
    yearsOfExperience: int('years_of_experience'),
    examinerEmployeeId: varchar('examiner_employee_id', { length: 64 }).references(
      (): AnyMySqlColumn => employees.id,
    ),
    verifiedByEmployeeId: varchar('verified_by_employee_id', { length: 64 }).references(
      (): AnyMySqlColumn => employees.id,
    ),
    mentorEmployeeId: varchar('mentor_employee_id', { length: 64 }).references(
      (): AnyMySqlColumn => employees.id,
    ),
    sortOrder: int('sort_order').default(0).notNull(),
  },
  (table) => [
    index('idx_emp_skill_tenant_company').on(table.tenantId, table.companyId),
    index('idx_emp_skill_employee').on(table.employeeId),
  ],
);

/** Assigned working hours (one per employee; Registration → Working Hours). */
export const employeeWorkSchedules = mysqlTable(
  'employee_work_schedules',
  {
    employeeId: varchar('employee_id', { length: 64 })
      .primaryKey()
      .references(() => employees.id),
    tenantId: varchar('tenant_id', { length: 64 }).notNull(),
    companyId: varchar('company_id', { length: 64 })
      .notNull()
      .references(() => companies.id),
    workingCalendar: varchar('working_calendar', { length: 100 }),
    workSchedule: varchar('work_schedule', { length: 100 }),
    workingDays: json('working_days').$type<string[]>().notNull(),
    startTime: varchar('start_time', { length: 5 }).notNull(),
    endTime: varchar('end_time', { length: 5 }).notNull(),
    breakMinutes: int('break_minutes').default(0).notNull(),
    lunchMinutes: int('lunch_minutes').default(0).notNull(),
    timeZone: varchar('time_zone', { length: 64 }),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
  },
  (table) => [index('idx_emp_work_tenant_company').on(table.tenantId, table.companyId)],
);

export type EmployeePersonalDetails = typeof employeePersonalDetails.$inferSelect;
export type EmployeeFamilyMember = typeof employeeFamilyMembers.$inferSelect;
export type EmployeeNominee = typeof employeeNominees.$inferSelect;
export type EmployeeEmergencyContact = typeof employeeEmergencyContacts.$inferSelect;
export type EmployeeBankAccount = typeof employeeBankAccounts.$inferSelect;
export type EmployeeSkill = typeof employeeSkills.$inferSelect;
export type EmployeeWorkSchedule = typeof employeeWorkSchedules.$inferSelect;

/**
 * HRMS Domain: Employee Administration — Employee Actions
 * Persistent employment actions (job changes, probation decisions, transfers,
 * status changes, separations) performed on existing employees.
 * Canonical employee fields change only when an action is applied; the action
 * row is preserved as employment history.
 */
export const employeeActions = mysqlTable(
  'employee_actions',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    tenantId: varchar('tenant_id', { length: 64 }).notNull(),
    companyId: varchar('company_id', { length: 64 })
      .notNull()
      .references(() => companies.id),
    employeeId: varchar('employee_id', { length: 64 })
      .notNull()
      .references(() => employees.id),
    actionType: mysqlEnum('action_type', [
      'department_change',
      'designation_change',
      'reporting_manager_change',
      'employment_type_change',
      'confirm_employee',
      'extend_probation',
      'location_transfer',
      'employment_status_change',
      'resignation',
      'termination',
    ]).notNull(),
    status: mysqlEnum('status', ['pending', 'applied', 'cancelled']).default('pending').notNull(),
    effectiveDate: varchar('effective_date', { length: 10 }).notNull(),
    reason: varchar('reason', { length: 1000 }).notNull(),
    /** Typed change set (EmployeeActionChangeSet): old/new values captured at request time. */
    changeData: json('change_data').notNull(),
    /** Nullable until platform authentication supplies an authenticated actor. */
    requestedBy: varchar('requested_by', { length: 64 }),
    cancellationReason: varchar('cancellation_reason', { length: 1000 }),
    appliedAt: timestamp('applied_at'),
    cancelledAt: timestamp('cancelled_at'),
    version: int('version').default(1).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    index('idx_employee_actions_tenant_company').on(table.tenantId, table.companyId),
    index('idx_employee_actions_employee').on(table.employeeId),
    index('idx_employee_actions_type_status').on(table.actionType, table.status),
  ],
);

export type EmployeeAction = typeof employeeActions.$inferSelect;
export type NewEmployeeAction = typeof employeeActions.$inferInsert;

/**
 * HRMS Domain: Employee Administration — Action History
 * Append-only audit trail of employee action lifecycle events.
 */
export const employeeActionHistory = mysqlTable(
  'employee_action_history',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    tenantId: varchar('tenant_id', { length: 64 }).notNull(),
    companyId: varchar('company_id', { length: 64 })
      .notNull()
      .references(() => companies.id),
    actionId: varchar('action_id', { length: 64 })
      .notNull()
      .references(() => employeeActions.id),
    event: mysqlEnum('event', ['created', 'updated', 'applied', 'cancelled']).notNull(),
    fromStatus: varchar('from_status', { length: 20 }),
    toStatus: varchar('to_status', { length: 20 }).notNull(),
    notes: varchar('notes', { length: 1000 }),
    /** Nullable until platform authentication supplies an authenticated actor. */
    actor: varchar('actor', { length: 64 }),
    createdAt: timestamp('created_at', { fsp: 3 }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_employee_action_history_tenant_company').on(table.tenantId, table.companyId),
    index('idx_employee_action_history_action').on(table.actionId),
  ],
);

export type EmployeeActionHistory = typeof employeeActionHistory.$inferSelect;
export type NewEmployeeActionHistory = typeof employeeActionHistory.$inferInsert;

/**
 * HRMS Domain: Documents — Employee Documents
 * The ONE canonical store for employee documents across the employee
 * lifecycle (Administration → Documents). Onboarding-collected documents are
 * expected to feed into this table. Metadata only: binary file storage does
 * not exist yet, so no file columns are modelled.
 */
export const employeeDocuments = mysqlTable(
  'employee_documents',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    tenantId: varchar('tenant_id', { length: 64 }).notNull(),
    companyId: varchar('company_id', { length: 64 })
      .notNull()
      .references(() => companies.id),
    employeeId: varchar('employee_id', { length: 64 })
      .notNull()
      .references(() => employees.id),
    category: mysqlEnum('category', [
      'personal_identity',
      'address_proof',
      'education',
      'previous_employment',
      'bank_payroll',
      'tax_other',
    ]).notNull(),
    documentName: varchar('document_name', { length: 150 }).notNull(),
    documentNumber: varchar('document_number', { length: 100 }),
    status: mysqlEnum('status', [
      'pending',
      'under_review',
      'verified',
      'rejected',
      'resubmission_required',
      'expired',
    ])
      .default('pending')
      .notNull(),
    expiryDate: varchar('expiry_date', { length: 10 }),
    verificationRemarks: varchar('verification_remarks', { length: 1000 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    index('idx_employee_documents_tenant_company').on(table.tenantId, table.companyId),
    index('idx_employee_documents_employee').on(table.employeeId),
    index('idx_employee_documents_status').on(table.status),
    index('idx_employee_documents_expiry').on(table.expiryDate),
  ],
);

export type EmployeeDocument = typeof employeeDocuments.$inferSelect;
export type NewEmployeeDocument = typeof employeeDocuments.$inferInsert;

/**
 * HR Settings Domain: Form Engine — company customisation of a system form.
 *
 * System form definitions (forms, sections, fields, defaults) ship in code.
 * A company's customisation is stored in three tables, keyed by the stable
 * form / section / field keys, and resolved on read:
 *   resolved form = system definition + field overrides + custom fields
 * (see docs/architecture/FORM-ENGINE.md). The system form is never copied.
 *
 * No created_by / updated_by yet: requests carry no authenticated user
 * (development context only). Add them with authentication.
 */

/**
 * One row per (company, system form) once the company first saves the form.
 * `version` is the optimistic-concurrency token for editor saves: a save
 * must present the version it was based on (0 = never saved) and increments it.
 * Hard delete only (nothing references it; losing it = "never customised").
 */
export const formCustomizations = mysqlTable(
  'form_customizations',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    tenantId: varchar('tenant_id', { length: 64 }).notNull(),
    companyId: varchar('company_id', { length: 64 })
      .notNull()
      .references(() => companies.id),
    formKey: varchar('form_key', { length: 100 }).notNull(),
    version: int('version').default(1).notNull(),
    metadata: json('metadata').$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    uniqueIndex('idx_form_customizations_key').on(table.tenantId, table.companyId, table.formKey),
  ],
);

export type FormCustomization = typeof formCustomizations.$inferSelect;

/**
 * A company's overrides of one SYSTEM field of a system form.
 *
 * - A row exists only while at least one property differs from the system
 *   definition.
 * - Every override column is nullable: NULL = inherit the system default, so a
 *   later BEZENT change to that default still reaches the company.
 * - `sort_order` positions the field within its (fixed) section; it is set for
 *   every field of a section whose layout the company changed, NULL otherwise.
 * - Hard delete (no soft delete): removing a row returns the field to the
 *   system default; nothing references these rows.
 */
export const formFieldOverrides = mysqlTable(
  'form_field_overrides',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    tenantId: varchar('tenant_id', { length: 64 }).notNull(),
    companyId: varchar('company_id', { length: 64 })
      .notNull()
      .references(() => companies.id),
    formKey: varchar('form_key', { length: 100 }).notNull(),
    fieldKey: varchar('field_key', { length: 100 }).notNull(),
    isEnabled: boolean('is_enabled'),
    isRequired: boolean('is_required'),
    label: varchar('label', { length: 100 }),
    description: varchar('description', { length: 500 }),
    width: mysqlEnum('width', ['half', 'full']),
    sortOrder: int('sort_order'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    uniqueIndex('idx_form_field_overrides_key').on(
      table.tenantId,
      table.companyId,
      table.formKey,
      table.fieldKey,
    ),
  ],
);

export type FormFieldOverride = typeof formFieldOverrides.$inferSelect;
export type NewFormFieldOverride = typeof formFieldOverrides.$inferInsert;

/**
 * Company-owned CUSTOM field definitions added to a system form.
 *
 * - `field_key` is a generated, permanent key (`custom.<32 hex>`).
 * - Definitions only: values are NOT stored here and never as columns on
 *   `employees` (value storage is a separate, later table — see FORM-ENGINE.md).
 * - Hard delete while no values exist; once value storage lands, deletion of a
 *   field with values must become an archive (status) instead.
 */
export const formCustomFields = mysqlTable(
  'form_custom_fields',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    tenantId: varchar('tenant_id', { length: 64 }).notNull(),
    companyId: varchar('company_id', { length: 64 })
      .notNull()
      .references(() => companies.id),
    formKey: varchar('form_key', { length: 100 }).notNull(),
    fieldKey: varchar('field_key', { length: 100 }).notNull(),
    sectionKey: varchar('section_key', { length: 100 }).notNull(),
    fieldType: mysqlEnum('field_type', [
      'single_line',
      'multi_line',
      'email',
      'phone',
      'number',
      'decimal',
      'dropdown',
      'radio',
      'checkbox',
      'multi_select',
      'date',
      'time',
      'datetime',
      'file_upload',
    ]).notNull(),
    label: varchar('label', { length: 100 }).notNull(),
    description: varchar('description', { length: 500 }),
    isEnabled: boolean('is_enabled').notNull(),
    isRequired: boolean('is_required').notNull(),
    width: mysqlEnum('width', ['half', 'full']).notNull(),
    sortOrder: int('sort_order').notNull(),
    config: json('config').$type<Record<string, unknown>>().notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    uniqueIndex('idx_form_custom_fields_key').on(
      table.tenantId,
      table.companyId,
      table.formKey,
      table.fieldKey,
    ),
  ],
);

export type FormCustomField = typeof formCustomFields.$inferSelect;
export type NewFormCustomField = typeof formCustomFields.$inferInsert;

/**
 * Platform: Tenant Details (Extension of canonical Tenants table)
 * Stores extended profile information: code, contact email, contact phone.
 */
export const tenantDetails = mysqlTable(
  'tenant_details',
  {
    tenantId: varchar('tenant_id', { length: 64 })
      .primaryKey()
      .references(() => tenants.id),
    code: varchar('code', { length: 50 }).notNull(),
    contactEmail: varchar('contact_email', { length: 255 }),
    contactPhone: varchar('contact_phone', { length: 50 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
  },
  (table) => [uniqueIndex('idx_tenant_details_code').on(table.code)],
);

export type TenantDetail = typeof tenantDetails.$inferSelect;
export type NewTenantDetail = typeof tenantDetails.$inferInsert;

/**
 * Platform: Users (ADR-009 User != Employee)
 * Authentication identity and platform access credentials.
 */
export const users = mysqlTable(
  'users',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    email: varchar('email', { length: 255 }).notNull(),
    passwordHash: varchar('password_hash', { length: 255 }).notNull(),
    salt: varchar('salt', { length: 64 }).notNull(),
    firstName: varchar('first_name', { length: 100 }).notNull(),
    lastName: varchar('last_name', { length: 100 }).notNull(),
    phone: varchar('phone', { length: 50 }),
    status: mysqlEnum('status', ['active', 'inactive', 'suspended']).default('active').notNull(),
    isSuperAdmin: boolean('is_super_admin').default(false).notNull(),
    lastLoginAt: timestamp('last_login_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    uniqueIndex('idx_users_email').on(table.email),
    index('idx_users_status').on(table.status),
  ],
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

/**
 * Platform: Company Memberships & Role Assignments
 * Associates users with tenants and legal company entities with explicit roles.
 */
export const memberships = mysqlTable(
  'memberships',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    userId: varchar('user_id', { length: 64 })
      .notNull()
      .references(() => users.id),
    tenantId: varchar('tenant_id', { length: 64 }).notNull(),
    companyId: varchar('company_id', { length: 64 })
      .notNull()
      .references(() => companies.id),
    role: mysqlEnum('role', ['company_admin', 'hr_manager', 'employee', 'user']).notNull(),
    status: mysqlEnum('status', ['active', 'inactive', 'revoked']).default('active').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    index('idx_memberships_user').on(table.userId),
    index('idx_memberships_tenant_company').on(table.tenantId, table.companyId),
    uniqueIndex('idx_memberships_user_company_role').on(table.userId, table.companyId, table.role),
  ],
);

export type Membership = typeof memberships.$inferSelect;
export type NewMembership = typeof memberships.$inferInsert;

/**
 * Platform: Tenant Administrators
 * Represents explicit, tenant-level administrative authority.
 * A Tenant Admin has authority over the tenant and all companies within it
 * without requiring individual company_admin memberships.
 */
export const tenantAdmins = mysqlTable(
  'tenant_admins',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    tenantId: varchar('tenant_id', { length: 64 })
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    userId: varchar('user_id', { length: 64 })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    status: mysqlEnum('status', ['active', 'inactive', 'revoked']).default('active').notNull(),
    isPrimary: boolean('is_primary').default(false).notNull(),
    jobTitle: varchar('job_title', { length: 100 }),
    primaryTenantScope: varchar('primary_tenant_scope', { length: 64 }).generatedAlwaysAs(
      sql`(CASE WHEN \`is_primary\` = 1 AND \`status\` = 'active' THEN \`tenant_id\` ELSE NULL END)`,
      { mode: 'virtual' },
    ),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    index('idx_tenant_admins_tenant').on(table.tenantId),
    index('idx_tenant_admins_user').on(table.userId),
    index('idx_tenant_admins_status').on(table.status),
    uniqueIndex('idx_tenant_admins_tenant_user').on(table.tenantId, table.userId),
    uniqueIndex('idx_tenant_admins_single_primary').on(table.primaryTenantScope),
  ],
);

export type TenantAdmin = typeof tenantAdmins.$inferSelect;
export type NewTenantAdmin = typeof tenantAdmins.$inferInsert;

/**
 * Platform: Roles (ADR-017)
 * A role is a named collection of permissions. System roles ship with BEZENT
 * (tenant_id / company_id NULL, is_system = true, permissions defined in code);
 * custom roles belong to one company and keep their permissions in
 * `role_permissions`. `code` is the stable internal identifier.
 * No hard delete while assigned: roles are deactivated through `status`.
 */
export const roles = mysqlTable(
  'roles',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    tenantId: varchar('tenant_id', { length: 64 }),
    companyId: varchar('company_id', { length: 64 }).references(() => companies.id),
    code: varchar('code', { length: 64 }).notNull(),
    name: varchar('name', { length: 100 }).notNull(),
    description: varchar('description', { length: 500 }),
    /** Business application the role belongs to; NULL = company administration. */
    moduleCode: mysqlEnum('module_code', ['hrms', 'crm', 'project_management']),
    isSystem: boolean('is_system').default(false).notNull(),
    status: mysqlEnum('status', ['active', 'inactive']).default('active').notNull(),
    createdBy: varchar('created_by', { length: 64 }),
    updatedBy: varchar('updated_by', { length: 64 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    index('idx_roles_tenant_company').on(table.tenantId, table.companyId),
    uniqueIndex('idx_roles_company_code').on(table.tenantId, table.companyId, table.code),
  ],
);

export type Role = typeof roles.$inferSelect;
export type NewRole = typeof roles.$inferInsert;

/**
 * Platform: Custom Role Permissions (ADR-017)
 * Maps a company custom role to permission identifiers from the code-defined
 * catalog. Hard delete: rows are replaced as a set when a role is edited;
 * the change itself is recorded in audit_logs.
 */
export const rolePermissions = mysqlTable(
  'role_permissions',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    tenantId: varchar('tenant_id', { length: 64 }).notNull(),
    companyId: varchar('company_id', { length: 64 })
      .notNull()
      .references(() => companies.id),
    roleId: varchar('role_id', { length: 64 })
      .notNull()
      .references(() => roles.id),
    permissionId: varchar('permission_id', { length: 100 }).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    index('idx_role_permissions_tenant_company').on(table.tenantId, table.companyId),
    uniqueIndex('idx_role_permissions_role_perm').on(table.roleId, table.permissionId),
  ],
);

export type RolePermission = typeof rolePermissions.$inferSelect;
export type NewRolePermission = typeof rolePermissions.$inferInsert;

/**
 * Platform: Role Assignments (ADR-017)
 * Grants a role to a User within exactly one company. A User may hold many
 * roles per company; a role held in one company never applies to another.
 * Revocation is a status change (kept as access history).
 */
export const roleAssignments = mysqlTable(
  'role_assignments',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    userId: varchar('user_id', { length: 64 })
      .notNull()
      .references(() => users.id),
    roleId: varchar('role_id', { length: 64 })
      .notNull()
      .references(() => roles.id),
    tenantId: varchar('tenant_id', { length: 64 }).notNull(),
    companyId: varchar('company_id', { length: 64 })
      .notNull()
      .references(() => companies.id),
    status: mysqlEnum('status', ['active', 'revoked']).default('active').notNull(),
    assignedBy: varchar('assigned_by', { length: 64 }),
    revokedBy: varchar('revoked_by', { length: 64 }),
    revokedAt: timestamp('revoked_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    index('idx_role_assignments_tenant_company').on(table.tenantId, table.companyId),
    index('idx_role_assignments_user').on(table.userId),
    index('idx_role_assignments_role').on(table.roleId),
    uniqueIndex('idx_role_assignments_user_company_role').on(
      table.userId,
      table.companyId,
      table.roleId,
    ),
  ],
);

export type RoleAssignment = typeof roleAssignments.$inferSelect;
export type NewRoleAssignment = typeof roleAssignments.$inferInsert;

/**
 * Platform: Company User Invitations
 * Manages secure, expiring tokens for inviting users to specific companies.
 */
export const invitations = mysqlTable(
  'invitations',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    tenantId: varchar('tenant_id', { length: 64 })
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    companyId: varchar('company_id', { length: 64 })
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    email: varchar('email', { length: 255 }).notNull(),
    role: mysqlEnum('role', ['company_admin', 'hr_manager', 'employee', 'user']).notNull(),
    authorityType: mysqlEnum('authority_type', ['tenant_admin', 'company_role'])
      .default('company_role')
      .notNull(),
    isPrimaryAdmin: boolean('is_primary_admin').default(false).notNull(),
    token: varchar('token', { length: 255 }).notNull(),
    invitedByUserId: varchar('invited_by_user_id', { length: 64 }).references(() => users.id, {
      onDelete: 'set null',
    }),
    status: mysqlEnum('status', ['pending', 'accepted', 'expired', 'cancelled'])
      .default('pending')
      .notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    acceptedAt: timestamp('accepted_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    uniqueIndex('idx_invitations_token').on(table.token),
    index('idx_invitations_tenant_company').on(table.tenantId, table.companyId),
    index('idx_invitations_email').on(table.email),
    index('idx_invitations_status').on(table.status),
  ],
);

export type Invitation = typeof invitations.$inferSelect;
export type NewInvitation = typeof invitations.$inferInsert;

/**
 * Platform: Sessions & Auth Tokens
 * Persisted sessions with explicit expiration and revocation.
 * `token` holds the SHA-256 hex digest of the bearer token (ADR-018); the raw
 * token is only ever held by the client. Sessions created before ADR-018 hold
 * the raw token and remain valid until they expire.
 */
export const sessions = mysqlTable(
  'sessions',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    token: varchar('token', { length: 255 }).notNull(),
    userId: varchar('user_id', { length: 64 })
      .notNull()
      .references(() => users.id),
    expiresAt: timestamp('expires_at').notNull(),
    revokedAt: timestamp('revoked_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    uniqueIndex('idx_sessions_token').on(table.token),
    index('idx_sessions_user').on(table.userId),
    index('idx_sessions_expires_at').on(table.expiresAt),
  ],
);

export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;

/**
 * Platform: Email OTP login challenges (ADR-018)
 * One row per code request. The code itself is never stored, only an HMAC
 * digest. `user_id` and `code_digest` are NULL when the email matched no
 * active account: the row still exists, counts attempts and locks exactly like
 * a real challenge, so responses never reveal whether an account exists.
 * Rows are kept (status) as security history; no hard delete.
 */
export const authOtpChallenges = mysqlTable(
  'auth_otp_challenges',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    userId: varchar('user_id', { length: 64 }).references(() => users.id),
    email: varchar('email', { length: 255 }).notNull(),
    codeDigest: varchar('code_digest', { length: 64 }),
    status: mysqlEnum('status', ['pending', 'consumed', 'locked', 'expired'])
      .default('pending')
      .notNull(),
    attempts: int('attempts').default(0).notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    consumedAt: timestamp('consumed_at'),
    requestIp: varchar('request_ip', { length: 64 }),
    createdAt: timestamp('created_at', { fsp: 3 }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    index('idx_otp_email_created').on(table.email, table.createdAt),
    index('idx_otp_ip_created').on(table.requestIp, table.createdAt),
    index('idx_otp_user').on(table.userId),
  ],
);

export type AuthOtpChallenge = typeof authOtpChallenges.$inferSelect;

/**
 * Platform: Development email outbox (ADR-018)
 * Written only by the `outbox` email transport (development and tests); the
 * API refuses to start in production unless SMTP is configured. Hard delete is
 * acceptable: nothing references these rows.
 */
export const emailOutbox = mysqlTable(
  'email_outbox',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    recipient: varchar('recipient', { length: 255 }).notNull(),
    subject: varchar('subject', { length: 255 }).notNull(),
    bodyText: varchar('body_text', { length: 4000 }).notNull(),
    createdAt: timestamp('created_at', { fsp: 3 }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
  },
  (table) => [index('idx_email_outbox_recipient').on(table.recipient, table.createdAt)],
);

export type EmailOutboxMessage = typeof emailOutbox.$inferSelect;

/**
 * Platform: Tenant Module Entitlements
 * Configures application module access (HRMS, CRM, Project Management) per customer.
 */
export const tenantModules = mysqlTable(
  'tenant_modules',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    tenantId: varchar('tenant_id', { length: 64 }).notNull(),
    companyId: varchar('company_id', { length: 64 }),
    moduleCode: mysqlEnum('module_code', ['hrms', 'crm', 'project_management']).notNull(),
    status: mysqlEnum('status', ['enabled', 'disabled']).default('enabled').notNull(),
    enabledAt: timestamp('enabled_at').defaultNow().notNull(),
    disabledAt: timestamp('disabled_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    index('idx_tenant_modules_tenant').on(table.tenantId),
    uniqueIndex('idx_tenant_modules_tenant_company_module').on(
      table.tenantId,
      table.companyId,
      table.moduleCode,
    ),
  ],
);

export type TenantModule = typeof tenantModules.$inferSelect;
export type NewTenantModule = typeof tenantModules.$inferInsert;

/**
 * Platform: Commercial Subscription Plans
 * Application-specific subscription plans (HRMS, CRM, PM) with seat constraints and tier metadata.
 */
export const plans = mysqlTable(
  'plans',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    applicationCode: mysqlEnum('application_code', ['hrms', 'crm', 'project_management']).notNull(),
    code: varchar('code', { length: 50 }).notNull(),
    name: varchar('name', { length: 100 }).notNull(),
    description: varchar('description', { length: 500 }),
    tier: varchar('tier', { length: 50 }).notNull(),
    status: mysqlEnum('status', ['active', 'deprecated', 'draft']).default('active').notNull(),
    version: int('version').default(1).notNull(),
    defaultSeats: int('default_seats').default(10).notNull(),
    minSeats: int('min_seats').default(1).notNull(),
    maxSeats: int('max_seats'),
    trialEligible: boolean('trial_eligible').default(true).notNull(),
    trialDurationDays: int('trial_duration_days').default(14).notNull(),
    isCustom: boolean('is_custom').default(false).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    uniqueIndex('idx_plans_app_code').on(table.applicationCode, table.code),
    index('idx_plans_app_status').on(table.applicationCode, table.status),
  ],
);

export type Plan = typeof plans.$inferSelect;
export type NewPlan = typeof plans.$inferInsert;

/**
 * Platform: Plan Commercial Prices
 * Price per seat/interval kept separate from entitlement definitions.
 */
export const planPrices = mysqlTable(
  'plan_prices',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    planId: varchar('plan_id', { length: 64 })
      .notNull()
      .references(() => plans.id),
    currency: varchar('currency', { length: 10 }).notNull(),
    billingInterval: mysqlEnum('billing_interval', [
      'monthly',
      'annual',
      'quarterly',
      'custom',
    ])
      .default('monthly')
      .notNull(),
    amountMinorUnits: int('amount_minor_units').notNull(),
    effectiveFrom: timestamp('effective_from').defaultNow().notNull(),
    effectiveTo: timestamp('effective_to'),
    status: mysqlEnum('status', ['active', 'deprecated']).default('active').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    index('idx_plan_prices_plan_curr_interval').on(
      table.planId,
      table.currency,
      table.billingInterval,
      table.status,
    ),
  ],
);

export type PlanPrice = typeof planPrices.$inferSelect;
export type NewPlanPrice = typeof planPrices.$inferInsert;

/**
 * Platform: Plan-Derived Entitlements
 * Defines which functional modules or capability limits are included in a plan.
 */
export const planEntitlements = mysqlTable(
  'plan_entitlements',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    planId: varchar('plan_id', { length: 64 })
      .notNull()
      .references(() => plans.id),
    applicationCode: mysqlEnum('application_code', ['hrms', 'crm', 'project_management']).notNull(),
    moduleCode: varchar('module_code', { length: 100 }).notNull(),
    isEnabled: boolean('is_enabled').default(true).notNull(),
    limits: json('limits').$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    uniqueIndex('idx_plan_entitlements_plan_mod').on(table.planId, table.moduleCode),
    index('idx_plan_entitlements_app').on(table.applicationCode),
  ],
);

export type PlanEntitlement = typeof planEntitlements.$inferSelect;
export type NewPlanEntitlement = typeof planEntitlements.$inferInsert;

/**
 * Platform: Tenant Subscriptions
 * Tracks active and historical commercial subscriptions per tenant and application.
 * Prevents conflicting simultaneously active subscriptions while preserving historical records.
 */
export const tenantSubscriptions = mysqlTable(
  'tenant_subscriptions',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    tenantId: varchar('tenant_id', { length: 64 })
      .notNull()
      .references(() => tenants.id),
    companyId: varchar('company_id', { length: 64 }).references(() => companies.id),
    applicationCode: mysqlEnum('application_code', ['hrms', 'crm', 'project_management']).notNull(),
    planId: varchar('plan_id', { length: 64 })
      .notNull()
      .references(() => plans.id),
    status: mysqlEnum('status', [
      'pending_activation',
      'active',
      'trial',
      'past_due',
      'suspended',
      'cancelled',
      'expired',
    ])
      .default('active')
      .notNull(),
    accessMode: mysqlEnum('access_mode', ['trial', 'paid']).default('paid').notNull(),
    billingCycle: mysqlEnum('billing_cycle', [
      'monthly',
      'annual',
      'quarterly',
      'custom',
    ])
      .default('monthly')
      .notNull(),
    licensedSeats: int('licensed_seats').default(10).notNull(),
    scheduledActivationAt: timestamp('scheduled_activation_at'),
    activatedAt: timestamp('activated_at'),
    trialStartsAt: timestamp('trial_starts_at'),
    trialEndsAt: timestamp('trial_ends_at'),
    currentPeriodStartsAt: timestamp('current_period_starts_at'),
    currentPeriodEndsAt: timestamp('current_period_ends_at'),
    cancelledAt: timestamp('cancelled_at'),
    cancellationReason: varchar('cancellation_reason', { length: 500 }),
    renewsAt: timestamp('renews_at'),
    autoRenew: boolean('auto_renew').default(true).notNull(),
    version: int('version').default(1).notNull(),
    activeSubscriptionScope: varchar('active_subscription_scope', { length: 128 }).generatedAlwaysAs(
      sql`(CASE WHEN \`status\` IN ('active', 'trial') THEN CONCAT(\`tenant_id\`, ':', \`application_code\`) ELSE NULL END)`,
      { mode: 'stored' },
    ),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    uniqueIndex('idx_tenant_subscriptions_active_scope').on(table.activeSubscriptionScope),
    index('idx_tenant_subscriptions_tenant_app').on(table.tenantId, table.applicationCode),
    index('idx_tenant_subscriptions_plan').on(table.planId),
    index('idx_tenant_subscriptions_status').on(table.status),
  ],
);

export type TenantSubscription = typeof tenantSubscriptions.$inferSelect;
export type NewTenantSubscription = typeof tenantSubscriptions.$inferInsert;

/**
 * Platform: Tenant Entitlement Overrides
 * Auditable, time-bounded Super Admin overrides for specific capabilities.
 */
export const tenantEntitlementOverrides = mysqlTable(
  'tenant_entitlement_overrides',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    tenantId: varchar('tenant_id', { length: 64 })
      .notNull()
      .references(() => tenants.id),
    companyId: varchar('company_id', { length: 64 }).references(() => companies.id),
    applicationCode: mysqlEnum('application_code', ['hrms', 'crm', 'project_management']).notNull(),
    moduleCode: varchar('module_code', { length: 100 }).notNull(),
    overrideType: mysqlEnum('override_type', ['enable', 'disable', 'limit'])
      .default('enable')
      .notNull(),
    overrideValue: json('override_value').$type<Record<string, unknown>>(),
    reason: varchar('reason', { length: 500 }).notNull(),
    authorizedByUserId: varchar('authorized_by_user_id', { length: 64 })
      .notNull()
      .references(() => users.id),
    validFrom: timestamp('valid_from').defaultNow().notNull(),
    validUntil: timestamp('valid_until'),
    revokedAt: timestamp('revoked_at'),
    revokedByUserId: varchar('revoked_by_user_id', { length: 64 }).references(() => users.id),
    revocationReason: varchar('revocation_reason', { length: 500 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    index('idx_entitlement_overrides_tenant_mod').on(
      table.tenantId,
      table.applicationCode,
      table.moduleCode,
    ),
    index('idx_entitlement_overrides_valid').on(table.tenantId, table.validUntil),
  ],
);

export type TenantEntitlementOverride = typeof tenantEntitlementOverrides.$inferSelect;
export type NewTenantEntitlementOverride = typeof tenantEntitlementOverrides.$inferInsert;

/**
 * Platform: Tenant Lifecycle Events
 * Audit trail of tenant lifecycle state transitions with reasons and actors.
 */
export const tenantLifecycleEvents = mysqlTable(
  'tenant_lifecycle_events',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    tenantId: varchar('tenant_id', { length: 64 })
      .notNull()
      .references(() => tenants.id),
    eventType: mysqlEnum('event_type', [
      'created',
      'activated',
      'suspended',
      'reactivated',
      'terminated',
      'status_changed',
    ]).notNull(),
    previousStatus: varchar('previous_status', { length: 50 }),
    newStatus: varchar('new_status', { length: 50 }).notNull(),
    reason: varchar('reason', { length: 1000 }),
    actorUserId: varchar('actor_user_id', { length: 64 }).references(() => users.id),
    actorEmail: varchar('actor_email', { length: 255 }),
    metadata: json('metadata').$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_lifecycle_tenant_created').on(table.tenantId, table.createdAt),
    index('idx_lifecycle_event_type').on(table.eventType),
  ],
);

export type TenantLifecycleEvent = typeof tenantLifecycleEvents.$inferSelect;
export type NewTenantLifecycleEvent = typeof tenantLifecycleEvents.$inferInsert;

/**
 * Platform: Provisioning Jobs
 * Persistent step-by-step state tracking for customer onboarding and asynchronous retries.
 */
export const provisioningJobs = mysqlTable(
  'provisioning_jobs',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    tenantId: varchar('tenant_id', { length: 64 })
      .notNull()
      .references(() => tenants.id),
    companyId: varchar('company_id', { length: 64 }).references(() => companies.id),
    jobType: mysqlEnum('job_type', [
      'tenant_creation',
      'subscription_activation',
      'module_provisioning',
      'admin_handoff',
    ])
      .default('tenant_creation')
      .notNull(),
    status: mysqlEnum('status', ['pending', 'in_progress', 'completed', 'failed'])
      .default('pending')
      .notNull(),
    idempotencyKey: varchar('idempotency_key', { length: 128 }),
    attemptCount: int('attempt_count').default(1).notNull(),
    maxAttempts: int('max_attempts').default(3).notNull(),
    retryEligible: boolean('retry_eligible').default(true).notNull(),
    nextAttemptAt: timestamp('next_attempt_at'),
    stepState: json('step_state').$type<Record<string, unknown>>().notNull(),
    errorCode: varchar('error_code', { length: 100 }),
    lastError: varchar('last_error', { length: 2000 }),
    workerId: varchar('worker_id', { length: 100 }),
    startedAt: timestamp('started_at'),
    completedAt: timestamp('completed_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    uniqueIndex('idx_prov_jobs_idempotency').on(table.idempotencyKey),
    index('idx_prov_jobs_tenant').on(table.tenantId),
    index('idx_prov_jobs_status').on(table.status),
  ],
);

export type ProvisioningJob = typeof provisioningJobs.$inferSelect;
export type NewProvisioningJob = typeof provisioningJobs.$inferInsert;

/**
 * Platform: Transactional Outbox
 * Guarantees reliable publishing of business events post-commit.
 */
export const transactionalOutbox = mysqlTable(
  'transactional_outbox',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    aggregateType: varchar('aggregate_type', { length: 50 }).notNull(),
    aggregateId: varchar('aggregate_id', { length: 64 }).notNull(),
    eventType: varchar('event_type', { length: 100 }).notNull(),
    payload: json('payload').$type<Record<string, unknown>>().notNull(),
    idempotencyKey: varchar('idempotency_key', { length: 128 }),
    status: mysqlEnum('status', ['pending', 'published', 'failed', 'dead_letter'])
      .default('pending')
      .notNull(),
    attemptCount: int('attempt_count').default(0).notNull(),
    maxAttempts: int('max_attempts').default(5).notNull(),
    nextAttemptAt: timestamp('next_attempt_at'),
    lastError: varchar('last_error', { length: 2000 }),
    publishedAt: timestamp('published_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    uniqueIndex('idx_outbox_idempotency').on(table.idempotencyKey),
    index('idx_outbox_status_next').on(table.status, table.nextAttemptAt),
    index('idx_outbox_aggregate').on(table.aggregateType, table.aggregateId),
  ],
);

export type TransactionalOutboxMessage = typeof transactionalOutbox.$inferSelect;
export type NewTransactionalOutboxMessage = typeof transactionalOutbox.$inferInsert;

/**
 * Platform: Administrative Audit Logs
 * Comprehensive administrative audit trail with actor, action, target, and change metadata.
 */
export const auditLogs = mysqlTable(
  'audit_logs',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    actorUserId: varchar('actor_user_id', { length: 64 }),
    actorEmail: varchar('actor_email', { length: 255 }),
    action: varchar('action', { length: 100 }).notNull(),
    targetType: varchar('target_type', { length: 50 }).notNull(),
    targetId: varchar('target_id', { length: 64 }).notNull(),
    tenantId: varchar('tenant_id', { length: 64 }),
    companyId: varchar('company_id', { length: 64 }),
    metadata: json('metadata').$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_audit_logs_actor').on(table.actorUserId),
    index('idx_audit_logs_target').on(table.targetType, table.targetId),
    index('idx_audit_logs_tenant_company').on(table.tenantId, table.companyId),
    index('idx_audit_logs_action').on(table.action),
    index('idx_audit_logs_created_at').on(table.createdAt),
  ],
);

export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;

/**
 * HRMS Domain: Employee Self-Service (ESS) — Attendance
 */
export const employeeAttendance = mysqlTable(
  'employee_attendance',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    tenantId: varchar('tenant_id', { length: 64 }).notNull(),
    companyId: varchar('company_id', { length: 64 })
      .notNull()
      .references(() => companies.id),
    employeeId: varchar('employee_id', { length: 64 })
      .notNull()
      .references(() => employees.id),
    date: varchar('date', { length: 10 }).notNull(),
    checkInTime: varchar('check_in_time', { length: 10 }),
    checkOutTime: varchar('check_out_time', { length: 10 }),
    status: mysqlEnum('status', ['present', 'absent', 'half_day', 'on_leave', 'holiday'])
      .default('present')
      .notNull(),
    workLocation: varchar('work_location', { length: 100 }).default('office').notNull(),
    notes: varchar('notes', { length: 500 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    index('idx_emp_att_tenant_company').on(table.tenantId, table.companyId),
    index('idx_emp_att_employee').on(table.employeeId),
    index('idx_emp_att_date').on(table.date),
    uniqueIndex('idx_emp_att_emp_date').on(
      table.tenantId,
      table.companyId,
      table.employeeId,
      table.date,
    ),
  ],
);

export type EmployeeAttendance = typeof employeeAttendance.$inferSelect;
export type NewEmployeeAttendance = typeof employeeAttendance.$inferInsert;

/**
 * HRMS Domain: Employee Self-Service (ESS) — Leave Balances
 */
export const employeeLeaveBalances = mysqlTable(
  'employee_leave_balances',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    tenantId: varchar('tenant_id', { length: 64 }).notNull(),
    companyId: varchar('company_id', { length: 64 })
      .notNull()
      .references(() => companies.id),
    employeeId: varchar('employee_id', { length: 64 })
      .notNull()
      .references(() => employees.id),
    leaveType: mysqlEnum('leave_type', ['annual', 'sick', 'casual', 'unpaid']).notNull(),
    totalDays: int('total_days').default(0).notNull(),
    usedDays: int('used_days').default(0).notNull(),
    pendingDays: int('pending_days').default(0).notNull(),
    year: int('year').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    index('idx_emp_leave_bal_tenant_comp').on(table.tenantId, table.companyId),
    index('idx_emp_leave_bal_employee').on(table.employeeId),
    uniqueIndex('idx_emp_leave_bal_type_year').on(
      table.tenantId,
      table.companyId,
      table.employeeId,
      table.leaveType,
      table.year,
    ),
  ],
);

export type EmployeeLeaveBalance = typeof employeeLeaveBalances.$inferSelect;
export type NewEmployeeLeaveBalance = typeof employeeLeaveBalances.$inferInsert;

/**
 * HRMS Domain: Employee Self-Service (ESS) — Leave Requests
 */
export const employeeLeaveRequests = mysqlTable(
  'employee_leave_requests',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    tenantId: varchar('tenant_id', { length: 64 }).notNull(),
    companyId: varchar('company_id', { length: 64 })
      .notNull()
      .references(() => companies.id),
    employeeId: varchar('employee_id', { length: 64 })
      .notNull()
      .references(() => employees.id),
    leaveType: mysqlEnum('leave_type', ['annual', 'sick', 'casual', 'unpaid']).notNull(),
    startDate: varchar('start_date', { length: 10 }).notNull(),
    endDate: varchar('end_date', { length: 10 }).notNull(),
    totalDays: int('total_days').notNull(),
    reason: varchar('reason', { length: 500 }).notNull(),
    status: mysqlEnum('status', ['pending', 'approved', 'rejected', 'cancelled'])
      .default('pending')
      .notNull(),
    reviewedByUserId: varchar('reviewed_by_user_id', { length: 64 }),
    rejectionReason: varchar('rejection_reason', { length: 500 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    index('idx_emp_leave_req_tenant_comp').on(table.tenantId, table.companyId),
    index('idx_emp_leave_req_employee').on(table.employeeId),
    index('idx_emp_leave_req_status').on(table.status),
    index('idx_emp_leave_req_dates').on(table.startDate, table.endDate),
  ],
);

export type EmployeeLeaveRequest = typeof employeeLeaveRequests.$inferSelect;
export type NewEmployeeLeaveRequest = typeof employeeLeaveRequests.$inferInsert;

/**
 * HRMS Domain: Employee Self-Service (ESS) — Timesheets
 */
export const employeeTimesheets = mysqlTable(
  'employee_timesheets',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    tenantId: varchar('tenant_id', { length: 64 }).notNull(),
    companyId: varchar('company_id', { length: 64 })
      .notNull()
      .references(() => companies.id),
    employeeId: varchar('employee_id', { length: 64 })
      .notNull()
      .references(() => employees.id),
    date: varchar('date', { length: 10 }).notNull(),
    projectName: varchar('project_name', { length: 150 }).notNull(),
    taskDescription: varchar('task_description', { length: 500 }).notNull(),
    hours: int('hours').notNull(),
    status: mysqlEnum('status', ['draft', 'submitted', 'approved', 'rejected'])
      .default('draft')
      .notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    index('idx_emp_timesheet_tenant_comp').on(table.tenantId, table.companyId),
    index('idx_emp_timesheet_employee').on(table.employeeId),
    index('idx_emp_timesheet_date').on(table.date),
    index('idx_emp_timesheet_status').on(table.status),
  ],
);

export type EmployeeTimesheet = typeof employeeTimesheets.$inferSelect;
export type NewEmployeeTimesheet = typeof employeeTimesheets.$inferInsert;

/**
 * HRMS Domain: Employee Self-Service (ESS) — Employee Requests
 * Handles Profile Changes, Attendance Regularizations, Document Requests, and General Requests.
 */
export const employeeRequests = mysqlTable(
  'employee_requests',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    tenantId: varchar('tenant_id', { length: 64 }).notNull(),
    companyId: varchar('company_id', { length: 64 })
      .notNull()
      .references(() => companies.id),
    employeeId: varchar('employee_id', { length: 64 })
      .notNull()
      .references(() => employees.id),
    requestType: mysqlEnum('request_type', [
      'profile_change',
      'attendance_regularization',
      'document_request',
      'general_service',
    ]).notNull(),
    subject: varchar('subject', { length: 200 }).notNull(),
    details: json('details').$type<Record<string, unknown>>().notNull(),
    status: mysqlEnum('status', ['pending', 'approved', 'rejected', 'cancelled'])
      .default('pending')
      .notNull(),
    reviewerNotes: varchar('reviewer_notes', { length: 500 }),
    reviewedByUserId: varchar('reviewed_by_user_id', { length: 64 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    index('idx_emp_requests_tenant_comp').on(table.tenantId, table.companyId),
    index('idx_emp_requests_employee').on(table.employeeId),
    index('idx_emp_requests_type_status').on(table.requestType, table.status),
  ],
);

export type EmployeeRequest = typeof employeeRequests.$inferSelect;
export type NewEmployeeRequest = typeof employeeRequests.$inferInsert;

/**
 * HRMS Domain: Employee Self-Service (ESS) — Tasks
 */
export const employeeTasks = mysqlTable(
  'employee_tasks',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    tenantId: varchar('tenant_id', { length: 64 }).notNull(),
    companyId: varchar('company_id', { length: 64 })
      .notNull()
      .references(() => companies.id),
    employeeId: varchar('employee_id', { length: 64 })
      .notNull()
      .references(() => employees.id),
    title: varchar('title', { length: 200 }).notNull(),
    description: varchar('description', { length: 500 }),
    dueDate: varchar('due_date', { length: 10 }),
    priority: mysqlEnum('priority', ['low', 'medium', 'high']).default('medium').notNull(),
    status: mysqlEnum('status', ['pending', 'in_progress', 'completed'])
      .default('pending')
      .notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    index('idx_emp_tasks_tenant_comp').on(table.tenantId, table.companyId),
    index('idx_emp_tasks_employee').on(table.employeeId),
    index('idx_emp_tasks_status').on(table.status),
  ],
);

export type EmployeeTask = typeof employeeTasks.$inferSelect;
export type NewEmployeeTask = typeof employeeTasks.$inferInsert;

/**
 * HRMS Domain: Employee Self-Service (ESS) — Notifications
 */
export const employeeNotifications = mysqlTable(
  'employee_notifications',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    tenantId: varchar('tenant_id', { length: 64 }).notNull(),
    companyId: varchar('company_id', { length: 64 })
      .notNull()
      .references(() => companies.id),
    employeeId: varchar('employee_id', { length: 64 })
      .notNull()
      .references(() => employees.id),
    title: varchar('title', { length: 200 }).notNull(),
    message: varchar('message', { length: 500 }).notNull(),
    type: mysqlEnum('type', ['info', 'success', 'warning', 'action_required'])
      .default('info')
      .notNull(),
    isRead: boolean('is_read').default(false).notNull(),
    link: varchar('link', { length: 200 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_emp_notif_tenant_comp').on(table.tenantId, table.companyId),
    index('idx_emp_notif_employee').on(table.employeeId),
    index('idx_emp_notif_read').on(table.isRead),
    index('idx_emp_notif_created').on(table.createdAt),
  ],
);

export type EmployeeNotification = typeof employeeNotifications.$inferSelect;
export type NewEmployeeNotification = typeof employeeNotifications.$inferInsert;
