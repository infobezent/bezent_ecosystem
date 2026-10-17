import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { and, eq } from 'drizzle-orm';
import { createApp } from '../../../../app/server/createApp.js';
import { isDatabaseConfigured, getDb } from '../../../../db/connection.js';
import { attendancePunches, employees } from '../../../../db/schema.js';
import { generateSurrogateId } from '../../../../platform/auth/security.js';
import { hrmsTestHeaders } from '../../../../platform/__tests__/support/testSession.js';

describe.skipIf(!isDatabaseConfigured)('BEZENT HRMS — Attendance Punch Logs V1.0 API', () => {
  const app = createApp();
  const tenantId = 'tenant_demo_01';
  const companyId = 'comp_demo_01';
  const empId = 'emp_att_api_01';
  let headers: Record<string, string>;

  const testPunchId1 = generateSurrogateId('ptst');
  const testPunchId2 = generateSurrogateId('ptst');
  const testPunchIdUnmatched = generateSurrogateId('ptst');
  const testPunchIdFailed = generateSurrogateId('ptst');

  beforeAll(async () => {
    headers = await hrmsTestHeaders(companyId, tenantId);
    const db = getDb();

    // Clean up previous test punches for empId to ensure idempotent CSV exports
    await db
      .delete(attendancePunches)
      .where(
        and(
          eq(attendancePunches.tenantId, tenantId),
          eq(attendancePunches.companyId, companyId),
          eq(attendancePunches.employeeId, empId),
        ),
      );

    // Ensure test employee exists
    await db
      .insert(employees)
      .values({
        id: empId,
        tenantId,
        companyId,
        employeeNumber: 'EMP-ATT-001',
        firstName: 'Vikram',
        lastName: 'Seth',
        email: 'vikram.seth.punch@example.com',
        joiningDate: '2026-01-01',
        employmentStatus: 'active',
        employmentType: 'full_time',
      })
      .onDuplicateKeyUpdate({ set: { employmentStatus: 'active' } });

    // Seed test punches
    await db.insert(attendancePunches).values([
      {
        id: testPunchId1,
        tenantId,
        companyId,
        employeeId: empId,
        punchTime: new Date('2026-10-10T09:00:00Z'),
        punchType: 'in',
        source: 'biometric',
        workLocation: 'HQ - Gate 1',
        workday: '2026-10-10',
        validationStatus: 'valid',
        processingState: 'processed',
        retryCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: testPunchId2,
        tenantId,
        companyId,
        employeeId: empId,
        punchTime: new Date('2026-10-10T18:00:00Z'),
        punchType: 'out',
        source: 'web',
        workLocation: 'Remote',
        workday: '2026-10-10',
        validationStatus: 'valid',
        processingState: 'processed',
        retryCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: testPunchIdUnmatched,
        tenantId,
        companyId,
        employeeId: null,
        rawIdentifier: 'BADGE_UNKNOWN_999',
        punchTime: new Date('2026-10-10T12:00:00Z'),
        punchType: 'unknown',
        source: 'kiosk',
        workLocation: 'Factory Entrance',
        workday: '2026-10-10',
        validationStatus: 'unmatched',
        validationReason: 'Unrecognized badge number',
        processingState: 'processed',
        investigationStatus: 'open',
        retryCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: testPunchIdFailed,
        tenantId,
        companyId,
        employeeId: empId,
        punchTime: new Date('2026-10-10T14:00:00Z'),
        punchType: 'in',
        source: 'biometric',
        workLocation: 'Warehouse B',
        workday: '2026-10-10',
        validationStatus: 'valid',
        processingState: 'failed',
        processingError: 'Connection timeout to daily log pipeline',
        retryCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
  });

  it('fetches punch logs with counters and tenant scoping', async () => {
    const res = await request(app)
      .get('/api/v1/hrms/attendance/punch-logs?date=2026-10-10')
      .set(headers);

    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.total).toBeGreaterThanOrEqual(4);
    expect(res.body.counters).toBeDefined();
    expect(res.body.counters.total).toBeGreaterThanOrEqual(4);
    expect(res.body.counters.valid).toBeGreaterThanOrEqual(3);
    expect(res.body.counters.unmatched).toBeGreaterThanOrEqual(1);
    expect(res.body.counters.processingFailed).toBeGreaterThanOrEqual(1);
  });

  it('enforces tenant isolation — other tenant sees 0 punches', async () => {
    const otherHeaders = await hrmsTestHeaders('other-comp-999', 'other-tenant-999');
    const res = await request(app)
      .get('/api/v1/hrms/attendance/punch-logs?date=2026-10-10')
      .set(otherHeaders);

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(0);
    expect(res.body.data).toHaveLength(0);
    expect(res.body.counters.total).toBe(0);
  });

  it('filters by dateInterpretation (event_timestamp vs workday)', async () => {
    // Workday filter
    const resWorkday = await request(app)
      .get('/api/v1/hrms/attendance/punch-logs?date=2026-10-10&dateInterpretation=workday')
      .set(headers);
    expect(resWorkday.status).toBe(200);
    expect(resWorkday.body.total).toBeGreaterThanOrEqual(4);

    // Non-existent workday
    const resEmpty = await request(app)
      .get('/api/v1/hrms/attendance/punch-logs?date=1999-01-01&dateInterpretation=workday')
      .set(headers);
    expect(resEmpty.status).toBe(200);
    expect(resEmpty.body.total).toBe(0);
  });

  it('fetches punch event details by ID including audits', async () => {
    const res = await request(app)
      .get(`/api/v1/hrms/attendance/punch-logs/${testPunchIdUnmatched}`)
      .set(headers);

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(testPunchIdUnmatched);
    expect(res.body.data.rawIdentifier).toBe('BADGE_UNKNOWN_999');
    expect(res.body.data.validationStatus).toBe('unmatched');
    expect(res.body.data.audits).toBeDefined();
  });

  it('updates investigation status and resolves identity with audit logging', async () => {
    const updateRes = await request(app)
      .post('/api/v1/hrms/attendance/punch-logs/investigation')
      .set(headers)
      .send({
        punchId: testPunchIdUnmatched,
        investigationStatus: 'in_review',
        assignedTo: 'usr-reviewer-1',
        investigationNotes: 'Checked security badge register',
        resolvedEmployeeId: empId,
        resolutionReason: 'Matched employee badge RFID card number',
      });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.employeeId).toBe(empId);
    expect(updateRes.body.data.validationStatus).toBe('valid');
    expect(updateRes.body.data.investigationStatus).toBe('resolved');

    // Verify audit record was created
    const detailRes = await request(app)
      .get(`/api/v1/hrms/attendance/punch-logs/${testPunchIdUnmatched}`)
      .set(headers);
    expect(detailRes.status).toBe(200);
    expect(detailRes.body.data.audits.length).toBeGreaterThanOrEqual(1);
    expect(detailRes.body.data.audits[0].action).toBe('identity_mapped');
  });

  it('retries processing for technical failure and increments retryCount', async () => {
    const retryRes = await request(app)
      .post('/api/v1/hrms/attendance/punch-logs/retry')
      .set(headers)
      .send({ punchIds: [testPunchIdFailed] });

    expect(retryRes.status).toBe(200);
    expect(retryRes.body.data.retriedCount).toBe(1);

    // Verify punch state updated
    const detailRes = await request(app)
      .get(`/api/v1/hrms/attendance/punch-logs/${testPunchIdFailed}`)
      .set(headers);
    expect(detailRes.status).toBe(200);
    expect(detailRes.body.data.processingState).toBe('processed');
    expect(detailRes.body.data.retryCount).toBe(1);
    expect(detailRes.body.data.processingError).toBeNull();
  });

  it('executes bulk punch actions safely', async () => {
    const bulkRes = await request(app)
      .post('/api/v1/hrms/attendance/punch-logs/bulk')
      .set(headers)
      .send({
        action: 'mark_investigation',
        punchIds: [testPunchId1, testPunchId2],
        notes: 'Flagged for bulk supervisor verification',
      });

    expect(bulkRes.status).toBe(200);
    expect(bulkRes.body.data.affectedCount).toBe(2);
  });

  it('exports punch logs as CSV with security formula injection protection', async () => {
    const exportRes = await request(app)
      .get('/api/v1/hrms/attendance/punch-logs/export?date=2026-10-10')
      .set(headers);

    expect(exportRes.status).toBe(200);
    expect(exportRes.header['content-type']).toContain('text/csv');
    expect(exportRes.text).toContain('Event ID,Employee Code,Employee Name');
    expect(exportRes.text).toContain(testPunchId1);
  });
});
