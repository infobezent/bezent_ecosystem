import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { eq } from 'drizzle-orm';
import { createApp } from '../../../../app/server/createApp.js';
import { isDatabaseConfigured, getDb } from '../../../../db/connection.js';
import {
  tenants,
  companies,
  users,
  memberships,
  employees,
  leaveTypes,
  employeeLeaveBalances,
  leaveBalanceTransactions,
  holidayCalendars,
} from '../../../../db/schema.js';
import { hashPassword, generateSurrogateId } from '../../../../platform/auth/security.js';
import { signInForTest } from '../../../../platform/__tests__/support/testSession.js';

describe('ESS Leave Ledger Backend API (Phase 3.5)', () => {
  const app = createApp();

  const tenantId = 'tent_ess_ledger_01';
  const companyId = 'comp_ess_ledger_01';
  const otherCompanyId = 'comp_ess_ledger_02';
  const employeeId = 'emp_ess_ledger_01';
  const otherEmployeeId = 'emp_ess_ledger_02';

  const leaveTypeId1 = 'lvt_ledger_ann_01';
  const leaveTypeId2 = 'lvt_ledger_sck_01';
  const balanceId1 = 'bal_ledger_ann_01';
  const balanceId2 = 'bal_ledger_sck_01';

  let employeeToken: string;
  let otherEmployeeToken: string;
  let nonEmployeeToken: string;

  beforeAll(async () => {
    if (!isDatabaseConfigured) return;
    const db = getDb();

    // 1. Tenants & Companies
    await db
      .insert(tenants)
      .values({
        id: tenantId,
        name: 'ESS Ledger Test Tenant',
        status: 'active',
      })
      .onDuplicateKeyUpdate({ set: { status: 'active' } });

    await db
      .insert(companies)
      .values([
        {
          id: companyId,
          tenantId,
          name: 'ESS Ledger Primary Company',
          code: 'ELP',
          status: 'active',
        },
        {
          id: otherCompanyId,
          tenantId,
          name: 'ESS Ledger Other Company',
          code: 'ELO',
          status: 'active',
        },
      ])
      .onDuplicateKeyUpdate({ set: { status: 'active' } });

    // 2. Users
    const empPass = hashPassword('BezentPass2026!');
    await db
      .insert(users)
      .values([
        {
          id: 'usr_ess_ledger_01',
          email: 'ess_ledger_emp@test.example',
          passwordHash: empPass.hash,
          salt: empPass.salt,
          firstName: 'Anand',
          lastName: 'Kumar',
          status: 'active',
          isSuperAdmin: false,
        },
        {
          id: 'usr_ess_ledger_02',
          email: 'ess_ledger_other@test.example',
          passwordHash: empPass.hash,
          salt: empPass.salt,
          firstName: 'Suresh',
          lastName: 'Raina',
          status: 'active',
          isSuperAdmin: false,
        },
        {
          id: 'usr_ess_ledger_non_emp',
          email: 'ess_ledger_nonemp@test.example',
          passwordHash: empPass.hash,
          salt: empPass.salt,
          firstName: 'Contractor',
          lastName: 'User',
          status: 'active',
          isSuperAdmin: false,
        },
      ])
      .onDuplicateKeyUpdate({ set: { status: 'active' } });

    // 3. Employees
    await db
      .insert(employees)
      .values([
        {
          id: employeeId,
          tenantId,
          companyId,
          userId: 'usr_ess_ledger_01',
          employeeNumber: 'EMP-LEDGER-01',
          firstName: 'Anand',
          lastName: 'Kumar',
          email: 'ess_ledger_emp@test.example',
          joiningDate: '2024-01-01',
          employmentStatus: 'active',
          employmentType: 'full_time',
        },
        {
          id: otherEmployeeId,
          tenantId,
          companyId: otherCompanyId,
          userId: 'usr_ess_ledger_02',
          employeeNumber: 'EMP-LEDGER-02',
          firstName: 'Suresh',
          lastName: 'Raina',
          email: 'ess_ledger_other@test.example',
          joiningDate: '2024-01-01',
          employmentStatus: 'active',
          employmentType: 'full_time',
        },
      ])
      .onDuplicateKeyUpdate({ set: { employmentStatus: 'active' } });

    // 4. Memberships
    await db
      .insert(memberships)
      .values([
        {
          id: 'mem_ess_ledger_01',
          tenantId,
          companyId,
          userId: 'usr_ess_ledger_01',
          role: 'employee',
          status: 'active',
        },
        {
          id: 'mem_ess_ledger_02',
          tenantId,
          companyId: otherCompanyId,
          userId: 'usr_ess_ledger_02',
          role: 'employee',
          status: 'active',
        },
        {
          id: 'mem_ess_ledger_03',
          tenantId,
          companyId,
          userId: 'usr_ess_ledger_non_emp',
          role: 'user',
          status: 'active',
        },
      ])
      .onDuplicateKeyUpdate({ set: { status: 'active' } });

    // 5. Leave Types
    await db
      .insert(leaveTypes)
      .values([
        {
          id: leaveTypeId1,
          tenantId,
          companyId,
          code: 'ANN-LEDGER',
          name: 'Annual Vacation',
          shortLabel: 'ANN',
          category: 'paid' as const,
          colorToken: 'success',
          isActive: true,
          visibleToEmployee: true,
          allowHalfDay: true,
          unit: 'days' as const,
          effectiveFrom: '2024-01-01',
        },
        {
          id: leaveTypeId2,
          tenantId,
          companyId,
          code: 'SCK-LEDGER',
          name: 'Sick Leave',
          shortLabel: 'SCK',
          category: 'paid' as const,
          colorToken: 'danger',
          isActive: true,
          visibleToEmployee: true,
          allowHalfDay: true,
          unit: 'days' as const,
          effectiveFrom: '2024-01-01',
        },
      ])
      .onDuplicateKeyUpdate({ set: { isActive: true } });

    // 6. Holiday Calendar (required for leave engine)
    const currentYear = new Date().getFullYear();
    await db
      .insert(holidayCalendars)
      .values({
        id: `hcal_ledger_test_${currentYear}`,
        tenantId,
        companyId,
        name: 'Ledger Test Calendar',
        year: currentYear,
        status: 'published',
        isDefault: true,
        createdByUserId: 'system',
      })
      .onDuplicateKeyUpdate({ set: { status: 'published', isDefault: true } });

    // 7. Balances
    await db.delete(leaveBalanceTransactions).where(eq(leaveBalanceTransactions.employeeId, employeeId));
    await db.delete(employeeLeaveBalances).where(eq(employeeLeaveBalances.employeeId, employeeId));

    await db.insert(employeeLeaveBalances).values([
      {
        id: balanceId1,
        tenantId,
        companyId,
        employeeId,
        leaveTypeId: leaveTypeId1,
        totalDays: '20.00',
        usedDays: '3.00',
        pendingDays: '1.00',
        carriedForwardDays: '5.00',
        year: currentYear,
        cycleStartDate: `${currentYear}-01-01`,
        cycleEndDate: `${currentYear}-12-31`,
      },
      {
        id: balanceId2,
        tenantId,
        companyId,
        employeeId,
        leaveTypeId: leaveTypeId2,
        totalDays: '10.00',
        usedDays: '0.00',
        pendingDays: '0.00',
        carriedForwardDays: '0.00',
        year: currentYear,
        cycleStartDate: `${currentYear}-01-01`,
        cycleEndDate: `${currentYear}-12-31`,
      },
    ]);

    // 8. Seed transactions with controlled dates
    await db.insert(leaveBalanceTransactions).values([
      {
        id: 'lbt_test_01',
        tenantId,
        companyId,
        employeeId,
        leaveTypeId: leaveTypeId1,
        balanceId: balanceId1,
        cycleStartDate: `${currentYear}-01-01`,
        txnType: 'opening',
        days: '15.00',
        referenceType: 'policy',
        referenceId: null,
        reason: 'Annual entitlement grant',
        createdByUserId: 'system',
        createdAt: new Date(`${currentYear}-01-01T08:00:00Z`),
      },
      {
        id: 'lbt_test_02',
        tenantId,
        companyId,
        employeeId,
        leaveTypeId: leaveTypeId1,
        balanceId: balanceId1,
        cycleStartDate: `${currentYear}-01-01`,
        txnType: 'carry_forward_in',
        days: '5.00',
        referenceType: 'cycle_close',
        referenceId: null,
        reason: 'Carried forward from previous year',
        createdByUserId: 'system',
        createdAt: new Date(`${currentYear}-01-01T08:30:00Z`),
      },
      {
        id: 'lbt_test_03',
        tenantId,
        companyId,
        employeeId,
        leaveTypeId: leaveTypeId1,
        balanceId: balanceId1,
        cycleStartDate: `${currentYear}-01-01`,
        txnType: 'usage_reserve',
        days: '3.00',
        referenceType: 'leave_request',
        referenceId: 'req_001',
        reason: 'Family vacation',
        createdByUserId: 'usr_ess_ledger_01',
        createdAt: new Date(`${currentYear}-02-10T10:00:00Z`),
      },
      {
        id: 'lbt_test_04',
        tenantId,
        companyId,
        employeeId,
        leaveTypeId: leaveTypeId1,
        balanceId: balanceId1,
        cycleStartDate: `${currentYear}-01-01`,
        txnType: 'usage_confirm',
        days: '3.00',
        referenceType: 'leave_request',
        referenceId: 'req_001',
        reason: null,
        createdByUserId: 'system',
        createdAt: new Date(`${currentYear}-02-11T14:00:00Z`),
      },
      {
        id: 'lbt_test_05',
        tenantId,
        companyId,
        employeeId,
        leaveTypeId: leaveTypeId1,
        balanceId: balanceId1,
        cycleStartDate: `${currentYear}-01-01`,
        txnType: 'usage_reserve',
        days: '1.00',
        referenceType: 'leave_request',
        referenceId: 'req_002',
        reason: 'Doctor appointment',
        createdByUserId: 'usr_ess_ledger_01',
        createdAt: new Date(`${currentYear}-03-01T09:00:00Z`),
      },
      {
        id: 'lbt_test_06',
        tenantId,
        companyId,
        employeeId,
        leaveTypeId: leaveTypeId2,
        balanceId: balanceId2,
        cycleStartDate: `${currentYear}-01-01`,
        txnType: 'opening',
        days: '10.00',
        referenceType: 'policy',
        referenceId: null,
        reason: 'Sick leave opening entitlement',
        createdByUserId: 'system',
        createdAt: new Date(`${currentYear}-01-01T08:00:00Z`),
      },
    ]);

    // Tokens
    const login1 = await signInForTest('ess_ledger_emp@test.example');
    employeeToken = login1.token;

    const login2 = await signInForTest('ess_ledger_other@test.example');
    otherEmployeeToken = login2.token;

    const login3 = await signInForTest('ess_ledger_nonemp@test.example');
    nonEmployeeToken = login3.token;
  });

  describe('1. Authentication & Multi-Tenant Security', () => {
    it('rejects unauthenticated requests with 401', async () => {
      const res = await request(app).get('/api/v1/ess/leave/transactions');
      expect(res.status).toBe(401);
    });

    it('rejects users without employee record with 403', async () => {
      const res = await request(app)
        .get('/api/v1/ess/leave/transactions')
        .set('Authorization', `Bearer ${nonEmployeeToken}`)
        .set('x-company-id', companyId);
      expect(res.status).toBe(403);
    });

    it('rejects request with invalid or mismatched company header with 403', async () => {
      const res = await request(app)
        .get('/api/v1/ess/leave/transactions')
        .set('Authorization', `Bearer ${employeeToken}`)
        .set('x-company-id', otherCompanyId);
      expect(res.status).toBe(403);
    });

    it('strictly isolates data: employee cannot access another employee ledger via query spoofing', async () => {
      // Attempting to pass another employee ID via query string
      const res = await request(app)
        .get(`/api/v1/ess/leave/transactions?employeeId=${otherEmployeeId}`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .set('x-company-id', companyId);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.items).toBeDefined();

      // Ensure every returned item belongs exclusively to the authenticated employee's balance
      for (const item of res.body.data.items) {
        expect([balanceId1, balanceId2]).toContain(item.balanceId);
      }
    });

    it('enforces multi-tenancy: other employee in other company only sees their own transactions and none from employee 1', async () => {
      const res = await request(app)
        .get('/api/v1/ess/leave/transactions')
        .set('Authorization', `Bearer ${otherEmployeeToken}`)
        .set('x-company-id', otherCompanyId);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();

      // Verify that NONE of employeeId's transaction IDs appear in otherEmployee's transactions
      const employee1Ids = ['lbt_test_01', 'lbt_test_02', 'lbt_test_03', 'lbt_test_04', 'lbt_test_05', 'lbt_test_06'];
      for (const item of res.body.data.items) {
        expect(employee1Ids).not.toContain(item.id);
        expect([balanceId1, balanceId2]).not.toContain(item.balanceId);
      }
    });
  });

  describe('2. Ledger Querying, Pagination & Sorting', () => {
    it('returns all leave transactions for authenticated employee with pagination metadata', async () => {
      const res = await request(app)
        .get('/api/v1/ess/leave/transactions')
        .set('Authorization', `Bearer ${employeeToken}`)
        .set('x-company-id', companyId);

      expect(res.status).toBe(200);
      const data = res.body.data;
      expect(data.items.length).toBe(6);
      expect(data.pagination).toMatchObject({
        total: 6,
        limit: 20,
        page: 1,
        pages: 1,
      });

      // Verify fields on transaction items
      const first = data.items[0];
      expect(first).toHaveProperty('id');
      expect(first).toHaveProperty('leaveTypeId');
      expect(first).toHaveProperty('leaveTypeName');
      expect(first).toHaveProperty('leaveTypeCode');
      expect(first).toHaveProperty('colorToken');
      expect(first).toHaveProperty('txnType');
      expect(first).toHaveProperty('direction');
      expect(first).toHaveProperty('credit');
      expect(first).toHaveProperty('debit');
      expect(first).toHaveProperty('runningBalance');
      expect(first).toHaveProperty('transactionDate');
      expect(first).toHaveProperty('description');
      expect(first).toHaveProperty('createdBy');
    });

    it('orders transactions deterministically in descending chronological order', async () => {
      const res = await request(app)
        .get('/api/v1/ess/leave/transactions')
        .set('Authorization', `Bearer ${employeeToken}`)
        .set('x-company-id', companyId);

      expect(res.status).toBe(200);
      const items = res.body.data.items;

      // The newest item (req_002 usage_reserve created in March) must be first
      expect(items[0].id).toBe('lbt_test_05');
      expect(items[0].txnType).toBe('usage_reserve');
      expect(items[0].direction).toBe('debit');
      expect(items[0].debit).toBe(1);

      // Verify descending order across all elements
      for (let i = 0; i < items.length - 1; i++) {
        const timeCurrent = new Date(items[i].createdAt).getTime();
        const timeNext = new Date(items[i + 1].createdAt).getTime();
        expect(timeCurrent).toBeGreaterThanOrEqual(timeNext);
      }
    });

    it('paginates results accurately with page and limit', async () => {
      const res = await request(app)
        .get('/api/v1/ess/leave/transactions?page=1&limit=2')
        .set('Authorization', `Bearer ${employeeToken}`)
        .set('x-company-id', companyId);

      expect(res.status).toBe(200);
      const data = res.body.data;
      expect(data.items.length).toBe(2);
      expect(data.pagination).toMatchObject({
        total: 6,
        limit: 2,
        page: 1,
        pages: 3,
        offset: 0,
      });

      // Fetch page 2
      const resPage2 = await request(app)
        .get('/api/v1/ess/leave/transactions?page=2&limit=2')
        .set('Authorization', `Bearer ${employeeToken}`)
        .set('x-company-id', companyId);

      expect(resPage2.status).toBe(200);
      expect(resPage2.body.data.items.length).toBe(2);
      expect(resPage2.body.data.pagination.offset).toBe(2);

      // Verify no overlap between page 1 and page 2
      const page1Ids = data.items.map((x: { id: string }) => x.id);
      const page2Ids = resPage2.body.data.items.map((x: { id: string }) => x.id);
      for (const id of page2Ids) {
        expect(page1Ids).not.toContain(id);
      }
    });
  });

  describe('3. Filtering Capabilities', () => {
    it('filters accurately by leaveTypeId', async () => {
      const res = await request(app)
        .get(`/api/v1/ess/leave/transactions?leaveTypeId=${leaveTypeId2}`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .set('x-company-id', companyId);

      expect(res.status).toBe(200);
      const items = res.body.data.items;
      expect(items.length).toBe(1);
      expect(items[0].leaveTypeId).toBe(leaveTypeId2);
      expect(items[0].leaveTypeName).toBe('Sick Leave');
      expect(items[0].runningBalance).toBe(10);
    });

    it('filters accurately by direction (credits only)', async () => {
      const res = await request(app)
        .get('/api/v1/ess/leave/transactions?direction=credit')
        .set('Authorization', `Bearer ${employeeToken}`)
        .set('x-company-id', companyId);

      expect(res.status).toBe(200);
      const items = res.body.data.items;
      expect(items.length).toBe(3);
      for (const item of items) {
        expect(item.direction).toBe('credit');
        expect(item.credit).toBeGreaterThan(0);
        expect(item.debit).toBe(0);
      }
    });

    it('filters accurately by direction (debits only)', async () => {
      const res = await request(app)
        .get('/api/v1/ess/leave/transactions?direction=debit')
        .set('Authorization', `Bearer ${employeeToken}`)
        .set('x-company-id', companyId);

      expect(res.status).toBe(200);
      const items = res.body.data.items;
      expect(items.length).toBe(3);
      for (const item of items) {
        expect(item.direction).toBe('debit');
        expect(item.debit).toBeGreaterThan(0);
        expect(item.credit).toBe(0);
      }
    });

    it('filters accurately by txnType', async () => {
      const res = await request(app)
        .get('/api/v1/ess/leave/transactions?txnType=opening')
        .set('Authorization', `Bearer ${employeeToken}`)
        .set('x-company-id', companyId);

      expect(res.status).toBe(200);
      const items = res.body.data.items;
      expect(items.length).toBe(2);
      for (const item of items) {
        expect(item.txnType).toBe('opening');
      }
    });

    it('filters accurately by date range', async () => {
      const currentYear = new Date().getFullYear();
      const res = await request(app)
        .get(`/api/v1/ess/leave/transactions?startDate=${currentYear}-02-01&endDate=${currentYear}-02-28`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .set('x-company-id', companyId);

      expect(res.status).toBe(200);
      const items = res.body.data.items;
      expect(items.length).toBe(2);
      expect(items.map((x: { id: string }) => x.id).sort()).toEqual(['lbt_test_03', 'lbt_test_04']);
    });
  });

  describe('4. Running Balance Integrity', () => {
    it('accurately maintains running available balance across chronological transactions', async () => {
      const res = await request(app)
        .get(`/api/v1/ess/leave/transactions?leaveTypeId=${leaveTypeId1}`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .set('x-company-id', companyId);

      expect(res.status).toBe(200);
      const items = res.body.data.items;

      // Find transactions by ID
      const t01 = items.find((x: { id: string }) => x.id === 'lbt_test_01'); // opening 15
      const t02 = items.find((x: { id: string }) => x.id === 'lbt_test_02'); // carry_forward 5 -> 20
      const t03 = items.find((x: { id: string }) => x.id === 'lbt_test_03'); // usage_reserve 3 -> 17
      const t04 = items.find((x: { id: string }) => x.id === 'lbt_test_04'); // usage_confirm 3 -> 17
      const t05 = items.find((x: { id: string }) => x.id === 'lbt_test_05'); // usage_reserve 1 -> 16

      expect(t01.runningBalance).toBe(15);
      expect(t02.runningBalance).toBe(20);
      expect(t03.runningBalance).toBe(17);
      expect(t04.runningBalance).toBe(17);
      expect(t05.runningBalance).toBe(16);

      // Latest transaction runningBalance matches the current available on the balance record:
      // totalDays (20) - usedDays (3) - pendingDays (1) = 16.
      expect(items[0].runningBalance).toBe(16);
    });
  });
});
