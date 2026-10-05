import { describe, it, expect } from 'vitest';
import { dashboardService } from '../dashboard/service/dashboard.service.js';
import { getDb } from '../../db/connection.js';
import {
  tenants,
  tenantDetails,
  companies,
  users,
  memberships,
  tenantModules,
} from '../../db/schema.js';
import { inArray } from 'drizzle-orm';

describe('Super Admin Dashboard Service', () => {
  it('aggregates live platform metrics, customer health, and application overview truthfully', async () => {
    const db = getDb();
    const testSuffix = Math.random().toString(36).substring(2, 8);

    // 1. Create Test Tenants
    // Tenant A: Healthy (active, 1 active company, 1 active admin who has logged in, HRMS enabled)
    const tA = `tnt_dash_a_${testSuffix}`;
    // Tenant B: Suspended (Critical)
    const tB = `tnt_dash_b_${testSuffix}`;
    // Tenant C: Active but No Company (Critical)
    const tC = `tnt_dash_c_${testSuffix}`;
    // Tenant D: Active with 1 Company, active admin, HRMS disabled (Needs Attention)
    const tD = `tnt_dash_d_${testSuffix}`;

    const tenantIds = [tA, tB, tC, tD];

    try {
      await db.insert(tenants).values([
        { id: tA, name: `Alpha Corp ${testSuffix}`, status: 'active' },
        { id: tB, name: `Beta Suspended ${testSuffix}`, status: 'suspended' },
        { id: tC, name: `Gamma NoCompany ${testSuffix}`, status: 'active' },
        { id: tD, name: `Delta NoModule ${testSuffix}`, status: 'active' },
      ]);
      await db.insert(tenantDetails).values([
        { tenantId: tA, code: `ALPHA_${testSuffix}` },
        { tenantId: tB, code: `BETA_${testSuffix}` },
        { tenantId: tC, code: `GAMMA_${testSuffix}` },
        { tenantId: tD, code: `DELTA_${testSuffix}` },
      ]);

      // 2. Create Companies
      const compA1 = `cmp_a1_${testSuffix}`;
      const compA2 = `cmp_a2_${testSuffix}`;
      const compD1 = `cmp_d1_${testSuffix}`;
      const companyIds = [compA1, compA2, compD1];

      await db.insert(companies).values([
        { id: compA1, tenantId: tA, name: 'Alpha Retail', code: `AR_${testSuffix}`, status: 'active' },
        { id: compA2, tenantId: tA, name: 'Alpha Logistics', code: `AL_${testSuffix}`, status: 'active' },
        { id: compD1, tenantId: tD, name: 'Delta Main', code: `DM_${testSuffix}`, status: 'active' },
      ]);

      // 3. Create Users
      // User 1: Admin of both compA1 and compA2 (tests unique admin vs multiple assignments!)
      const usrAdmin1 = `usr_adm1_${testSuffix}`;
      // User 2: Admin of compD1
      const usrAdmin2 = `usr_adm2_${testSuffix}`;
      // User 3: Suspended user
      const usrSuspended = `usr_susp_${testSuffix}`;
      const userIds = [usrAdmin1, usrAdmin2, usrSuspended];

      await db.insert(users).values([
        {
          id: usrAdmin1,
          email: `admin1_${testSuffix}@example.com`,
          passwordHash: 'x',
          salt: 'y',
          firstName: 'Admin',
          lastName: 'One',
          status: 'active',
          lastLoginAt: new Date(),
        },
        {
          id: usrAdmin2,
          email: `admin2_${testSuffix}@example.com`,
          passwordHash: 'x',
          salt: 'y',
          firstName: 'Admin',
          lastName: 'Two',
          status: 'active',
          lastLoginAt: new Date(),
        },
        {
          id: usrSuspended,
          email: `susp_${testSuffix}@example.com`,
          passwordHash: 'x',
          salt: 'y',
          firstName: 'Suspended',
          lastName: 'User',
          status: 'suspended',
        },
      ]);

      // 4. Create Memberships
      // User 1 has two active company_admin assignments
      const mem1 = `mem1_${testSuffix}`;
      const mem2 = `mem2_${testSuffix}`;
      const mem3 = `mem3_${testSuffix}`;
      const membershipIds = [mem1, mem2, mem3];

      await db.insert(memberships).values([
        {
          id: mem1,
          userId: usrAdmin1,
          tenantId: tA,
          companyId: compA1,
          role: 'company_admin',
          status: 'active',
        },
        {
          id: mem2,
          userId: usrAdmin1,
          tenantId: tA,
          companyId: compA2,
          role: 'company_admin',
          status: 'active',
        },
        {
          id: mem3,
          userId: usrAdmin2,
          tenantId: tD,
          companyId: compD1,
          role: 'company_admin',
          status: 'active',
        },
      ]);

      // 5. Tenant Modules:
      // Tenant D explicitly disables HRMS to test HRMS disabled exclusion
      const mod1 = `mod1_${testSuffix}`;
      const moduleIds = [mod1];
      await db.insert(tenantModules).values([
        {
          id: mod1,
          tenantId: tD,
          companyId: null,
          moduleCode: 'hrms',
          status: 'disabled',
        },
      ]);

      // Execute dashboard service
      const overview = await dashboardService.getOverview();

      // Assert Customers Metrics
      expect(overview.metrics.customers.total).toBeGreaterThanOrEqual(4);
      expect(overview.metrics.customers.active).toBeGreaterThanOrEqual(3);
      expect(overview.metrics.customers.suspended).toBeGreaterThanOrEqual(1);
      expect(overview.metrics.totalTenants).toBe(overview.metrics.customers.total);
      expect(overview.metrics.activeTenants).toBe(overview.metrics.customers.active);
      expect(overview.metrics.suspendedTenants).toBe(overview.metrics.customers.suspended);

      // Assert Companies Metrics
      expect(overview.metrics.companies.total).toBeGreaterThanOrEqual(3);
      expect(overview.metrics.companies.active).toBeGreaterThanOrEqual(3);
      expect(overview.metrics.totalCompanies).toBe(overview.metrics.companies.total);

      // Assert Platform Users Metrics (including fix for activeUsers)
      expect(overview.metrics.platformUsers.total).toBeGreaterThanOrEqual(3);
      expect(overview.metrics.platformUsers.active).toBeGreaterThanOrEqual(2);
      expect(overview.metrics.platformUsers.suspended).toBeGreaterThanOrEqual(1);
      expect(overview.metrics.totalUsers).toBe(overview.metrics.platformUsers.total);
      expect(overview.metrics.activeUsers).toBe(overview.metrics.platformUsers.active);
      expect(overview.metrics.suspendedUsers).toBe(overview.metrics.platformUsers.suspended);
      expect(overview.metrics.activeUsers).toBeDefined();

      // Assert Company Admins Metrics
      // Admin 1 administers 2 companies, Admin 2 administers 1 -> total assignments >= 3, unique admins >= 2
      expect(overview.metrics.companyAdmins.uniqueAdmins).toBeGreaterThanOrEqual(2);
      expect(overview.metrics.companyAdmins.totalAssignments).toBeGreaterThanOrEqual(3);
      expect(overview.metrics.companyAdmins.totalAssignments).toBeGreaterThan(
        overview.metrics.companyAdmins.uniqueAdmins,
      );

      // Assert No Hardcoded pendingProvisioning
      expect((overview.metrics as Record<string, unknown>).pendingProvisioning).toBeUndefined();

      // Assert Health Summary & Needs Attention Queue
      expect(overview.customerHealth.health.healthy).toBeGreaterThanOrEqual(1);
      expect(overview.customerHealth.health.critical).toBeGreaterThanOrEqual(2); // tB (suspended) + tC (no company)
      expect(overview.customerHealth.health.needsAttention).toBeGreaterThanOrEqual(1); // tD (no modules)

      expect(overview.needsAttention.length).toBeGreaterThan(0);
      expect(overview.needsAttention.length).toBeLessThanOrEqual(5);

      // Check Critical items are sorted before Needs Attention
      const firstNeedsAttentionIdx = overview.needsAttention.findIndex(
        (i) => i.status === 'needs_attention',
      );
      const lastCriticalIdx = overview.needsAttention
        .map((i) => i.status)
        .lastIndexOf('critical');

      if (firstNeedsAttentionIdx !== -1 && lastCriticalIdx !== -1) {
        expect(lastCriticalIdx).toBeLessThan(firstNeedsAttentionIdx);
      }

      // Check attention item contains canonical Next Best Action
      const betaAttention = overview.needsAttention.find((i) => i.tenantId === tB);
      if (betaAttention) {
        expect(betaAttention.status).toBe('critical');
        expect(betaAttention.reason).toContain('Tenant is suspended');
        expect(betaAttention.nextBestAction?.actionType).toBe('reactivate_tenant');
      }

      const gammaAttention = overview.needsAttention.find((i) => i.tenantId === tC);
      if (gammaAttention) {
        expect(gammaAttention.status).toBe('critical');
        expect(gammaAttention.reason).toContain('No legal company entity');
        expect(gammaAttention.nextBestAction?.actionType).toBe('create_company');
      }

      // Assert Application Overview
      expect(overview.applications.length).toBe(3);
      const hrmsApp = overview.applications.find((a) => a.code === 'hrms');
      const crmApp = overview.applications.find((a) => a.code === 'crm');
      const pmApp = overview.applications.find((a) => a.code === 'project_management');

      expect(hrmsApp?.availability).toBe('GA');
      expect(hrmsApp?.entitledTenantsCount).toBeGreaterThan(0);
      // tD has disabled HRMS so should be excluded from HRMS entitled count
      expect(crmApp?.availability).toBe('Planned');
      expect(crmApp?.entitledTenantsCount).toBe(0);
      expect(pmApp?.availability).toBe('Planned');
      expect(pmApp?.entitledTenantsCount).toBe(0);

      // Assert Recent Customers & Audit Logs
      expect(overview.recentTenants.length).toBeLessThanOrEqual(5);
      expect(overview.recentAuditLogs.length).toBeLessThanOrEqual(8);

      // Clean up test rows
      await db.delete(tenantModules).where(inArray(tenantModules.id, moduleIds));
      await db.delete(memberships).where(inArray(memberships.id, membershipIds));
      await db.delete(users).where(inArray(users.id, userIds));
      await db.delete(companies).where(inArray(companies.id, companyIds));
      await db.delete(tenantDetails).where(inArray(tenantDetails.tenantId, tenantIds));
      await db.delete(tenants).where(inArray(tenants.id, tenantIds));
    } catch (err) {
      // Cleanup on error
      await db.delete(tenantModules).where(inArray(tenantModules.tenantId, tenantIds)).catch(() => {});
      await db.delete(memberships).where(inArray(memberships.tenantId, tenantIds)).catch(() => {});
      await db.delete(companies).where(inArray(companies.tenantId, tenantIds)).catch(() => {});
      await db.delete(tenantDetails).where(inArray(tenantDetails.tenantId, tenantIds)).catch(() => {});
      await db.delete(tenants).where(inArray(tenants.id, tenantIds)).catch(() => {});
      throw err;
    }
  });
});
