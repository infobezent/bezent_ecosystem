import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { eq } from 'drizzle-orm';
import { employees } from '../../../../db/schema.js';
import * as connection from '../../../../db/connection.js';
import { EmployeeRepository } from '../repository/employee.repository.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isDbAvailable = await connection.pingDatabase();
const testIfDb = isDbAvailable ? it : it.skip;

describe('HRMS Employee Database & Repository Foundation', () => {
  // ============================================================================
  // 1. Schema & Migration Invariants (Always runs offline)
  // ============================================================================
  describe('Schema & Migration Invariants', () => {
    it('defines employees table with canonical workforce fields', () => {
      expect(employees).toBeDefined();

      // Primary Key
      expect(employees.id).toBeDefined();
      expect(employees.id.primary).toBe(true);
      expect(employees.id.notNull).toBe(true);

      // Multi-tenancy & company scope
      expect(employees.tenantId).toBeDefined();
      expect(employees.tenantId.notNull).toBe(true);
      expect(employees.companyId).toBeDefined();
      expect(employees.companyId.notNull).toBe(true);

      // Business identifiers
      expect(employees.employeeNumber).toBeDefined();
      expect(employees.employeeNumber.notNull).toBe(true);

      // IAM boundary invariant: user_id must remain nullable (Employee != User)
      expect(employees.userId).toBeDefined();
      expect(employees.userId.notNull).toBe(false);

      // Person details
      expect(employees.firstName).toBeDefined();
      expect(employees.firstName.notNull).toBe(true);
      expect(employees.lastName).toBeDefined();
      expect(employees.lastName.notNull).toBe(false);
      expect(employees.email).toBeDefined();
      expect(employees.email.notNull).toBe(true);
      expect(employees.phone).toBeDefined();
      expect(employees.phone.notNull).toBe(false);

      // Organization master foreign references
      expect(employees.departmentId).toBeDefined();
      expect(employees.designationId).toBeDefined();
      expect(employees.locationId).toBeDefined();

      // Employment details
      expect(employees.joiningDate).toBeDefined();
      expect(employees.joiningDate.notNull).toBe(true);
      expect(employees.confirmedJoiningDate).toBeDefined();
      expect(employees.confirmedJoiningDate.notNull).toBe(false);

      // Enums
      expect(employees.employmentType).toBeDefined();
      expect(employees.employmentType.enumValues).toEqual([
        'full_time',
        'part_time',
        'contract',
        'intern',
      ]);
      expect(employees.employmentStatus).toBeDefined();
      expect(employees.employmentStatus.enumValues).toEqual([
        'active',
        'probation',
        'notice',
        'terminated',
        'suspended',
        'resigned',
      ]);

      // Timestamps
      expect(employees.createdAt).toBeDefined();
      expect(employees.updatedAt).toBeDefined();
    });

    it('0006_employee_foundation.sql migration file exists with valid canonical DDL', () => {
      const migrationsDir = path.resolve(__dirname, '..', '..', '..', '..', 'db', 'migrations');
      const migrationFile = path.join(migrationsDir, '0006_employee_foundation.sql');

      expect(fs.existsSync(migrationFile)).toBe(true);

      const ddl = fs.readFileSync(migrationFile, 'utf8');
      expect(ddl).toContain('CREATE TABLE `employees`');
      expect(ddl).toContain('`id` varchar(64) NOT NULL');
      expect(ddl).toContain('`tenant_id` varchar(64) NOT NULL');
      expect(ddl).toContain('`company_id` varchar(64) NOT NULL');
      expect(ddl).toContain('`employee_number` varchar(50) NOT NULL');
      expect(ddl).toContain('`user_id` varchar(64)');
      expect(ddl).toContain('`first_name` varchar(100) NOT NULL');
      expect(ddl).toContain('`email` varchar(255) NOT NULL');
      expect(ddl).toContain('`joining_date` varchar(10) NOT NULL');
      expect(ddl).toContain(
        'CONSTRAINT `idx_employees_company_emp_no` UNIQUE(`tenant_id`,`company_id`,`employee_number`)',
      );
      expect(ddl).toContain('FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`)');
      expect(ddl).toContain('FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`)');
      expect(ddl).toContain('FOREIGN KEY (`designation_id`) REFERENCES `designations`(`id`)');
      expect(ddl).toContain('FOREIGN KEY (`location_id`) REFERENCES `locations`(`id`)');
      expect(ddl).toContain('CREATE INDEX `idx_employees_tenant_company`');
    });

    it('migration journal contains 0006_employee_foundation entry', () => {
      const journalPath = path.resolve(
        __dirname,
        '..',
        '..',
        '..',
        '..',
        'db',
        'migrations',
        'meta',
        '_journal.json',
      );
      expect(fs.existsSync(journalPath)).toBe(true);

      const journal = JSON.parse(fs.readFileSync(journalPath, 'utf8'));
      const entries = journal.entries as Array<{ tag: string; idx: number }>;
      const entry0006 = entries.find((e) => e.idx === 6);

      expect(entry0006).toBeDefined();
      expect(entry0006?.tag).toBe('0006_employee_foundation');
    });
  });

  // ============================================================================
  // 2. Live MySQL Verification (Runs in CI against MySQL 8.4 container)
  // ============================================================================
  describe('Live MySQL Persistence Invariants', () => {
    const repo = new EmployeeRepository();
    const testTenantId = 'tenant_demo_01';
    const testCompanyId = 'comp_demo_01';

    testIfDb('inserts and retrieves an employee record with proper scoping', async () => {
      const db = connection.getDb();
      const testEmpNo = `EMP-TEST-${Date.now()}`;
      let createdId: string | null = null;

      try {
        const created = await repo.create(testTenantId, testCompanyId, {
          employeeNumber: testEmpNo,
          firstName: 'Persistence',
          lastName: 'Tester',
          email: `${testEmpNo.toLowerCase()}@example.com`,
          joiningDate: '2026-10-01',
          employmentType: 'full_time',
          employmentStatus: 'probation',
        });

        createdId = created.id;
        expect(created.employeeNumber).toBe(testEmpNo);

        const fetched = await repo.getById(testTenantId, testCompanyId, created.id);
        expect(fetched).not.toBeNull();
        expect(fetched?.fullName).toBe('Persistence Tester');
        expect(fetched?.employeeNumber).toBe(testEmpNo);

        // Verification of tenant/company isolation
        const crossTenant = await repo.getById('different_tenant', testCompanyId, created.id);
        expect(crossTenant).toBeNull();
      } finally {
        if (createdId) {
          await db.delete(employees).where(eq(employees.id, createdId));
        }
      }
    });

    testIfDb('enforces unique constraint on (tenant_id, company_id, employee_number)', async () => {
      const db = connection.getDb();
      const testEmpNo = `EMP-DUP-${Date.now()}`;
      let id1: string | null = null;

      try {
        const first = await repo.create(testTenantId, testCompanyId, {
          employeeNumber: testEmpNo,
          firstName: 'First',
          email: `${testEmpNo.toLowerCase()}-1@example.com`,
          joiningDate: '2026-10-01',
        });
        id1 = first.id;

        // Attempt duplicate employeeNumber insert in same tenant & company
        await expect(
          repo.create(testTenantId, testCompanyId, {
            employeeNumber: testEmpNo,
            firstName: 'Second',
            email: `${testEmpNo.toLowerCase()}-2@example.com`,
            joiningDate: '2026-10-01',
          }),
        ).rejects.toThrow();
      } finally {
        if (id1) {
          await db.delete(employees).where(eq(employees.id, id1));
        }
      }
    });
  });
});
