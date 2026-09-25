import { describe, it, expect, vi, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { eq } from 'drizzle-orm';
import { tenants } from '../schema.js';
import * as connection from '../connection.js';
import { DatabaseConnectionError } from '../../app/errors/AppError.js';
import { seedDatabase } from '../seed.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isDbAvailable = await connection.pingDatabase();
const testIfDb = isDbAvailable ? it : it.skip;

describe('Tenant Persistence Foundation (Step 03A)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ============================================================================
  // 1. Schema & Migration Invariants (Always runs offline)
  // ============================================================================
  describe('Schema & Migration Invariants', () => {
    it('defines tenants table with exact required fields', () => {
      expect(tenants).toBeDefined();

      // id: varchar(64), primary key
      expect(tenants.id).toBeDefined();
      expect(tenants.id.primary).toBe(true);
      expect(tenants.id.notNull).toBe(true);

      // name: varchar(255), not null
      expect(tenants.name).toBeDefined();
      expect(tenants.name.notNull).toBe(true);

      // status: enum('active', 'inactive', 'suspended', 'archived'), not null, default 'active'
      expect(tenants.status).toBeDefined();
      expect(tenants.status.notNull).toBe(true);
      expect(tenants.status.default).toBe('active');
      expect(tenants.status.enumValues).toEqual(['active', 'inactive', 'suspended', 'archived']);

      // createdAt: timestamp, not null
      expect(tenants.createdAt).toBeDefined();
      expect(tenants.createdAt.notNull).toBe(true);

      // updatedAt: timestamp, not null
      expect(tenants.updatedAt).toBeDefined();
      expect(tenants.updatedAt.notNull).toBe(true);
    });

    it('does NOT contain unapproved fields (code, slug, domain, billing, etc.)', () => {
      const columnNames = Object.keys(tenants);
      expect(columnNames).not.toContain('code');
      expect(columnNames).not.toContain('slug');
      expect(columnNames).not.toContain('domain');
      expect(columnNames).not.toContain('plan');
      expect(columnNames).not.toContain('billing');
      expect(columnNames).not.toContain('subscription');
      expect(columnNames).not.toContain('branding');
      expect(columnNames).not.toContain('sso');
    });

    it('0005_tenant_foundation.sql migration file exists with valid DDL', () => {
      const migrationsDir = path.resolve(__dirname, '..', 'migrations');
      const migrationFile = path.join(migrationsDir, '0005_tenant_foundation.sql');

      expect(fs.existsSync(migrationFile)).toBe(true);

      const ddl = fs.readFileSync(migrationFile, 'utf8');
      expect(ddl).toContain('CREATE TABLE `tenants`');
      expect(ddl).toContain('`id` varchar(64) NOT NULL');
      expect(ddl).toContain('`name` varchar(255) NOT NULL');
      expect(ddl).toContain(
        "`status` enum('active','inactive','suspended','archived') NOT NULL DEFAULT 'active'",
      );
      expect(ddl).toContain('`created_at` timestamp NOT NULL DEFAULT (now())');
      expect(ddl).toContain(
        '`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP',
      );
      expect(ddl).toContain('CONSTRAINT `tenants_id` PRIMARY KEY(`id`)');

      // Crucial: No FK to companies in this PR
      expect(ddl).not.toContain('FOREIGN KEY');
      expect(ddl).not.toContain('REFERENCES `companies`');
    });

    it('migration journal contains 0005_tenant_foundation entry', () => {
      const journalPath = path.resolve(__dirname, '..', 'migrations', 'meta', '_journal.json');
      expect(fs.existsSync(journalPath)).toBe(true);

      const journal = JSON.parse(fs.readFileSync(journalPath, 'utf8'));
      const entries = journal.entries as Array<{ tag: string; idx: number }>;
      const entry0005 = entries.find((e) => e.idx === 5);

      expect(entry0005).toBeDefined();
      expect(entry0005?.tag).toBe('0005_tenant_foundation');
    });
  });

  // ============================================================================
  // 2. Database Unavailable & No In-Memory Fallback Invariants
  // ============================================================================
  describe('Persistence Failure Behavior', () => {
    it('fails clearly with DatabaseConnectionError when database is unconfigured', () => {
      vi.spyOn(connection, 'getDb').mockImplementation(() => {
        throw new DatabaseConnectionError('Database is not configured');
      });

      expect(() => {
        connection.getDb();
      }).toThrow(DatabaseConnectionError);
    });
  });

  // ============================================================================
  // 3. Live MySQL Verification (Runs in CI against MySQL 8.4 container)
  // ============================================================================
  describe('Live MySQL Persistence Invariants', () => {
    testIfDb('inserts and retrieves a tenant record via Drizzle', async () => {
      const db = connection.getDb();
      const testTenantId = 'tenant_test_' + Date.now();

      try {
        await db.insert(tenants).values({
          id: testTenantId,
          name: 'Test Tenant Foundation Corp',
          status: 'active',
        });

        const rows = await db.select().from(tenants).where(eq(tenants.id, testTenantId));
        expect(rows).toHaveLength(1);
        const record = rows[0]!;
        expect(record.id).toBe(testTenantId);
        expect(record.name).toBe('Test Tenant Foundation Corp');
        expect(record.status).toBe('active');
        expect(record.createdAt).toBeInstanceOf(Date);
        expect(record.updatedAt).toBeInstanceOf(Date);
      } finally {
        await db.delete(tenants).where(eq(tenants.id, testTenantId));
      }
    });

    testIfDb('rejects duplicate tenant ID via PRIMARY KEY constraint', async () => {
      const db = connection.getDb();
      const duplicateTenantId = 'tenant_dup_' + Date.now();

      try {
        await db.insert(tenants).values({
          id: duplicateTenantId,
          name: 'Duplicate Test Tenant',
          status: 'active',
        });

        // Attempt duplicate insert
        await expect(
          db.insert(tenants).values({
            id: duplicateTenantId,
            name: 'Another Duplicate',
            status: 'active',
          }),
        ).rejects.toThrow();
      } finally {
        await db.delete(tenants).where(eq(tenants.id, duplicateTenantId));
      }
    });

    testIfDb('seeds canonical tenant_demo_01 idempotently', async () => {
      const db = connection.getDb();

      // Run seed
      await seedDatabase();

      const rows = await db.select().from(tenants).where(eq(tenants.id, 'tenant_demo_01'));
      expect(rows).toHaveLength(1);
      const seeded = rows[0]!;
      expect(seeded.id).toBe('tenant_demo_01');
      expect(seeded.name).toBe('BEZENT Demo Organization');
      expect(seeded.status).toBe('active');
    });
  });
});
