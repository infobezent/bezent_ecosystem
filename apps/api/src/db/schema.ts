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
} from 'drizzle-orm/mysql-core';

/**
 * Platform: Tenants
 * Top-level customer/account and data-isolation boundary.
 */
export const tenants = mysqlTable('tenants', {
  id: varchar('id', { length: 64 }).primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  status: mysqlEnum('status', ['active', 'inactive', 'suspended', 'archived'])
    .default('active')
    .notNull(),
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
    status: mysqlEnum('status', ['active', 'inactive']).default('active').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    index('idx_companies_tenant_id').on(table.tenantId),
    index('idx_companies_code').on(table.code),
  ],
);

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
    code: varchar('code', { length: 50 }).notNull(),
    status: mysqlEnum('status', ['active', 'inactive']).default('active').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
  },
  (table) => [index('idx_departments_tenant_company').on(table.tenantId, table.companyId)],
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
    code: varchar('code', { length: 50 }).notNull(),
    status: mysqlEnum('status', ['active', 'inactive']).default('active').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
  },
  (table) => [index('idx_designations_tenant_company').on(table.tenantId, table.companyId)],
);

/**
 * Organization Masters: Locations
 */
export const locations = mysqlTable(
  'locations',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    tenantId: varchar('tenant_id', { length: 64 }).notNull(),
    companyId: varchar('company_id', { length: 64 })
      .notNull()
      .references(() => companies.id),
    name: varchar('name', { length: 255 }).notNull(),
    code: varchar('code', { length: 50 }).notNull(),
    city: varchar('city', { length: 100 }),
    country: varchar('country', { length: 100 }),
    status: mysqlEnum('status', ['active', 'inactive']).default('active').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
  },
  (table) => [index('idx_locations_tenant_company').on(table.tenantId, table.companyId)],
);

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
    stage: mysqlEnum('stage', ['preboarding', 'documents', 'induction', 'completed'])
      .default('preboarding')
      .notNull(),
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
