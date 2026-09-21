import { mysqlTable, varchar, timestamp, mysqlEnum, index } from 'drizzle-orm/mysql-core';

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
 */
export const onboardingCases = mysqlTable(
  'onboarding_cases',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    tenantId: varchar('tenant_id', { length: 64 }).notNull(),
    companyId: varchar('company_id', { length: 64 })
      .notNull()
      .references(() => companies.id),
    departmentId: varchar('department_id', { length: 64 })
      .notNull()
      .references(() => departments.id),
    designationId: varchar('designation_id', { length: 64 })
      .notNull()
      .references(() => designations.id),
    locationId: varchar('location_id', { length: 64 }).references(() => locations.id),
    firstName: varchar('first_name', { length: 100 }).notNull(),
    lastName: varchar('last_name', { length: 100 }),
    email: varchar('email', { length: 255 }).notNull(),
    phone: varchar('phone', { length: 50 }),
    joiningDate: varchar('joining_date', { length: 10 }).notNull(),
    employmentType: mysqlEnum('employment_type', ['full_time', 'part_time', 'contract', 'intern'])
      .default('full_time')
      .notNull(),
    stage: mysqlEnum('stage', ['preboarding', 'documents', 'induction', 'completed'])
      .default('preboarding')
      .notNull(),
    status: mysqlEnum('status', ['active', 'withdrawn', 'completed']).default('active').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    index('idx_onboarding_tenant_company').on(table.tenantId, table.companyId),
    index('idx_onboarding_email').on(table.email),
    index('idx_onboarding_stage').on(table.stage),
  ],
);

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
