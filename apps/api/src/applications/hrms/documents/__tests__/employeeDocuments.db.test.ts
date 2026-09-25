import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { and, eq, inArray } from 'drizzle-orm';
import { createApp } from '../../../../app/server/createApp.js';
import { getDb, pingDatabase } from '../../../../db/connection.js';
import { companies, employeeDocuments, employees } from '../../../../db/schema.js';
import { EmployeeRepository } from '../../employees/repository/employee.repository.js';
import { expiryWindow, todayIsoDate } from '../service/employeeDocument.service.js';

/**
 * MySQL-backed tests for the Documents list/detail/create API. Each test run
 * uses unique employees, so assertions scope to them via `employeeId` or the
 * run-specific search token.
 */
describe('HRMS Employee Documents API (MySQL)', () => {
  const app = createApp();
  const employeeRepo = new EmployeeRepository();
  const tenantId = 'tenant_demo_01';
  const companyId = 'comp_demo_01';
  const run = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const token = `DOCRUN${run}`;
  const otherCompanyId = `comp_doc_other_${run}`;
  const otherHeaders = { 'x-tenant-id': tenantId, 'x-company-id': otherCompanyId };
  const employeeIds: string[] = [];
  const { today, warningUntil } = expiryWindow(todayIsoDate());
  const past = '2020-01-31';
  const soon = warningUntil;
  const later = '2099-12-31';

  let masters: { departments: { id: string; name: string }[] };
  let alice: { id: string };
  let bob: { id: string };
  let foreign: { id: string };

  async function createEmployee(
    firstName: string,
    departmentIndex: number | null,
    company = companyId,
  ) {
    const number = `DOC-${run}-${employeeIds.length + 1}`;
    const created = await employeeRepo.create(tenantId, company, {
      employeeNumber: number,
      firstName,
      lastName: token,
      email: `${number.toLowerCase()}@example.com`,
      joiningDate: '2025-01-01',
      departmentId: departmentIndex === null ? null : masters.departments[departmentIndex]!.id,
    });
    employeeIds.push(created.id);
    return created;
  }

  /** Fixture rows of this run only — never touches other data in a shared dev DB. */
  const ownDoc = (documentName: string) =>
    and(
      eq(employeeDocuments.documentName, documentName),
      inArray(employeeDocuments.employeeId, employeeIds),
    );

  function createDocument(body: Record<string, unknown>, headers = {}) {
    return request(app).post('/api/v1/hrms/employee-documents').set(headers).send(body);
  }

  function list(query: Record<string, string> = {}, headers = {}) {
    return request(app)
      .get('/api/v1/hrms/employee-documents')
      .set(headers)
      .query({ search: token, pageSize: '100', ...query });
  }

  beforeAll(async () => {
    const connected = await pingDatabase();
    if (!connected) {
      throw new Error(
        'MySQL database is unreachable. Start MySQL to run MySQL-backed integration tests.',
      );
    }
    masters = (await request(app).get('/api/v1/hrms/organization/masters')).body.data;
    await getDb()
      .insert(companies)
      .values({
        id: otherCompanyId,
        tenantId,
        name: 'Documents Isolation Co',
        code: `DOC${run}`.slice(0, 50),
        status: 'active',
      });

    alice = await createEmployee('Alice', 0);
    bob = await createEmployee('Bob', 1);
    foreign = await createEmployee('Foreign', null, otherCompanyId);

    const docs = [
      {
        employeeId: alice.id,
        category: 'personal_identity',
        documentName: 'Passport',
        documentNumber: 'P1234567',
        expiryDate: later,
      },
      { employeeId: alice.id, category: 'address_proof', documentName: 'Utility Bill' },
      {
        employeeId: alice.id,
        category: 'personal_identity',
        documentName: 'Driving Licence',
        expiryDate: soon,
      },
      { employeeId: bob.id, category: 'education', documentName: 'Degree Certificate' },
      { employeeId: bob.id, category: 'personal_identity', documentName: 'Visa', expiryDate: past },
    ];
    for (const doc of docs) {
      const res = await createDocument(doc);
      expect(res.status).toBe(201);
    }

    // Verification transitions are not exposed yet; seed reviewed states directly.
    const db = getDb();
    await db
      .update(employeeDocuments)
      .set({ status: 'verified', verificationRemarks: 'Matches original' })
      .where(ownDoc('Utility Bill'));
    await db
      .update(employeeDocuments)
      .set({ status: 'under_review' })
      .where(ownDoc('Degree Certificate'));
  });

  afterAll(async () => {
    const db = getDb();
    await db.delete(employeeDocuments).where(inArray(employeeDocuments.employeeId, employeeIds));
    await db.delete(employees).where(inArray(employees.id, employeeIds));
    await db.delete(companies).where(eq(companies.id, otherCompanyId));
  });

  it('creates documents associated with an employee, starting as Pending', async () => {
    const res = await createDocument({
      employeeId: alice.id,
      category: 'tax_other',
      documentName: 'Form 16',
    });
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      employeeId: alice.id,
      employeeName: `Alice ${token}`,
      departmentName: masters.departments[0]!.name,
      category: 'tax_other',
      status: 'pending',
      expiryDate: null,
      expiryState: null,
      fileAvailable: false,
    });

    const detail = await request(app).get(`/api/v1/hrms/employee-documents/${res.body.data.id}`);
    expect(detail.status).toBe(200);
    expect(detail.body.data.documentName).toBe('Form 16');
    await getDb().delete(employeeDocuments).where(eq(employeeDocuments.id, res.body.data.id));
  });

  it('rejects unknown and cross-company employees', async () => {
    expect(
      (
        await createDocument({
          employeeId: 'emp_missing',
          category: 'education',
          documentName: 'X',
        })
      ).status,
    ).toBe(404);
    expect(
      (await createDocument({ employeeId: foreign.id, category: 'education', documentName: 'X' }))
        .status,
    ).toBe(404);
  });

  it('lists documents with employee, department, expiry state and counts', async () => {
    const res = await list();
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(5);
    const passport = res.body.data.find(
      (d: { documentName: string }) => d.documentName === 'Passport',
    );
    expect(passport).toMatchObject({
      employeeId: alice.id,
      departmentName: masters.departments[0]!.name,
      expiryDate: later,
      expiryState: 'valid',
      status: 'pending',
    });
    expect(res.body.counts).toEqual({ all: 5, pending_review: 4, expiring: 1, expired: 1 });
    expect(res.body.pagination).toMatchObject({ page: 1, totalItems: 5 });
  });

  it('searches by document name, document number and employee', async () => {
    const byDoc = await request(app)
      .get('/api/v1/hrms/employee-documents')
      .query({ search: 'Driving Licence', employeeId: alice.id });
    expect(byDoc.body.data.map((d: { documentName: string }) => d.documentName)).toEqual([
      'Driving Licence',
    ]);

    const byNumber = await request(app)
      .get('/api/v1/hrms/employee-documents')
      .query({ search: 'P1234567', employeeId: alice.id });
    expect(byNumber.body.data).toHaveLength(1);

    const byEmployee = await list({ search: 'Bob' });
    // `search` is replaced here, so scope by employee instead of the run token.
    const bobDocs = byEmployee.body.data.filter(
      (d: { employeeId: string }) => d.employeeId === bob.id,
    );
    expect(bobDocs).toHaveLength(2);

    const none = await list({ search: `${token}-nothing` });
    expect(none.body.data).toEqual([]);
    expect(none.body.counts.all).toBe(0);
  });

  it('filters by category, status, department and employee', async () => {
    const identity = await list({ category: 'personal_identity' });
    expect(identity.body.data).toHaveLength(3);

    const verified = await list({ status: 'verified' });
    expect(verified.body.data.map((d: { documentName: string }) => d.documentName)).toEqual([
      'Utility Bill',
    ]);
    expect(verified.body.data[0].verificationRemarks).toBe('Matches original');

    const dept = await list({ departmentId: masters.departments[1]!.id });
    expect(dept.body.data.every((d: { employeeId: string }) => d.employeeId === bob.id)).toBe(true);
    expect(dept.body.data).toHaveLength(2);

    const byEmployee = await list({ employeeId: alice.id });
    expect(byEmployee.body.data).toHaveLength(3);
  });

  it('serves Pending Review, Expiring and Expired views from real state', async () => {
    const pending = await list({ view: 'pending_review' });
    expect(pending.body.data.map((d: { status: string }) => d.status).sort()).toEqual([
      'pending',
      'pending',
      'pending',
      'under_review',
    ]);

    const expiring = await list({ view: 'expiring' });
    expect(expiring.body.data).toHaveLength(1);
    expect(expiring.body.data[0]).toMatchObject({
      documentName: 'Driving Licence',
      expiryState: 'expiring',
    });
    expect(expiring.body.data[0].expiryDate >= today).toBe(true);

    const expired = await list({ view: 'expired' });
    expect(expired.body.data).toHaveLength(1);
    expect(expired.body.data[0]).toMatchObject({ documentName: 'Visa', expiryState: 'expired' });
  });

  it('treats a persisted Expired status as expired even without a past date', async () => {
    await getDb().update(employeeDocuments).set({ status: 'expired' }).where(ownDoc('Passport'));
    const expired = await list({ view: 'expired' });
    expect(expired.body.data.map((d: { documentName: string }) => d.documentName).sort()).toEqual([
      'Passport',
      'Visa',
    ]);
    await getDb().update(employeeDocuments).set({ status: 'pending' }).where(ownDoc('Passport'));
  });

  it('isolates documents by tenant/company', async () => {
    const res = await list({}, otherHeaders);
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);

    const own = await list();
    const detail = await request(app)
      .get(`/api/v1/hrms/employee-documents/${own.body.data[0].id}`)
      .set(otherHeaders);
    expect(detail.status).toBe(404);
  });

  it('paginates server-side', async () => {
    const page1 = await list({ pageSize: '2', page: '1' });
    const page2 = await list({ pageSize: '2', page: '2' });
    expect(page1.body.data).toHaveLength(2);
    expect(page1.body.pagination).toMatchObject({ totalItems: 5, totalPages: 3 });
    const ids = [...page1.body.data, ...page2.body.data].map((d: { id: string }) => d.id);
    expect(new Set(ids).size).toBe(4);
  });
});
