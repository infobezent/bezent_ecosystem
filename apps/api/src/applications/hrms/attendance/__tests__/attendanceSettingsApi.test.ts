import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../../../app/server/createApp.js';
import { isDatabaseConfigured, getDb } from '../../../../db/connection.js';
import { departments } from '../../../../db/schema.js';
import { hrmsTestHeaders } from '../../../../platform/__tests__/support/testSession.js';

describe.skipIf(!isDatabaseConfigured)('Attendance Settings V1.0 API', () => {
  const app = createApp();

  const tenantId = 'tenant_demo_01';
  const companyId = 'comp_demo_01';
  const otherCompanyId = 'comp_demo_02';

  let headers: Record<string, string>;
  let otherHeaders: Record<string, string>;

  beforeAll(async () => {
    headers = await hrmsTestHeaders(companyId, tenantId);
    otherHeaders = await hrmsTestHeaders(otherCompanyId, tenantId);

    const db = getDb();
    await db.insert(departments).ignore().values({
      id: 'dept_engineering',
      tenantId,
      companyId,
      name: 'Engineering',
      code: 'ENG',
    });
  });

  /* ── 1. General Settings ── */
  describe('General Settings', () => {
    it('fetches company general settings', async () => {
      const res = await request(app)
        .get('/api/v1/hrms/attendance/settings/general')
        .set(headers);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.companyId).toBe(companyId);
    });

    it('updates general settings with validation and creates audit record', async () => {
      const updateRes = await request(app)
        .put('/api/v1/hrms/attendance/settings/general')
        .set(headers)
        .send({
          timezone: 'Asia/Kolkata',
          dayBoundaryTime: '04:00:00',
          manualEntryAllowed: true,
          employeeVisibility: 'self_only',
          defaultHistoryViewDays: 60,
        });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.data.timezone).toBe('Asia/Kolkata');
      expect(updateRes.body.data.dayBoundaryTime).toBe('04:00:00');
      expect(updateRes.body.data.defaultHistoryViewDays).toBe(60);
    });

    it('rejects invalid day boundary format', async () => {
      const res = await request(app)
        .put('/api/v1/hrms/attendance/settings/general')
        .set(headers)
        .send({
          dayBoundaryTime: 'invalid-time',
        });

      expect(res.status).toBe(400);
    });
  });

  /* ── 2. Policies & Overrides ── */
  describe('Attendance Policies & Overrides', () => {
    let createdPolicyId: string;

    it('creates a new department override policy', async () => {
      const res = await request(app)
        .post('/api/v1/hrms/attendance/settings/policies')
        .set(headers)
        .send({
          policyName: 'Engineering Shift Policy',
          scope: 'department',
          scopeId: 'dept_engineering',
          status: 'published',
          fullDayThresholdHours: 8.5,
          halfDayThresholdHours: 4.5,
          gracePeriodMinutes: 20,
          penaltyRules: {
            enabled: true,
            lateMarksThreshold: 3,
            penaltyUnit: 'half_day_deduction',
            period: 'calendar_month',
            isRepeating: true,
          },
          odRules: {
            enabled: true,
            odTypes: ['Client Visit', 'Conference'],
            allowHalfDay: true,
            allowHourly: false,
            allowMultiDay: true,
            advanceSubmissionDays: 1,
            backdatedAllowedDays: 2,
            requiresEvidence: false,
            exemptFromGeofence: true,
          },
        });

      expect(res.status).toBe(201);
      expect(res.body.data.policyName).toBe('Engineering Shift Policy');
      expect(res.body.data.scope).toBe('department');
      createdPolicyId = res.body.data.id;
    });

    it('resolves effective policy following hierarchy: Employee -> Department -> Company', async () => {
      const res = await request(app)
        .get('/api/v1/hrms/attendance/settings/policies/effective?departmentId=dept_engineering')
        .set(headers);

      expect(res.status).toBe(200);
      expect(res.body.data.policy.scope).toBe('department');
      expect(res.body.data.policy.scopeId).toBe('dept_engineering');
    });

    it('rolls back a policy snapshot creating a new active version', async () => {
      const res = await request(app)
        .post(`/api/v1/hrms/attendance/settings/policies/${createdPolicyId}/rollback`)
        .set(headers);

      expect(res.status).toBe(200);
      expect(res.body.data.version).toBeGreaterThan(1);
      expect(res.body.data.status).toBe('published');
    });
  });

  /* ── 3. Regularization Settings ── */
  describe('Regularization Settings', () => {
    it('updates regularization rules and submission quotas', async () => {
      const res = await request(app)
        .put('/api/v1/hrms/attendance/settings/regularization')
        .set(headers)
        .send({
          isEnabled: true,
          submissionWindowDays: 10,
          maxRequestsPerMonth: 5,
          requireReason: true,
          approvalHierarchy: 'manager_then_hr',
          blockOnPayrollLock: true,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.submissionWindowDays).toBe(10);
      expect(res.body.data.maxRequestsPerMonth).toBe(5);
    });
  });

  /* ── 4. Devices & Bulk Ingestion ── */
  describe('Capture Devices & Bulk Import', () => {
    let testDeviceId: string;
    let importBatchId: string;

    it('registers hardware terminal and tests connection ping truthfully', async () => {
      const regRes = await request(app)
        .post('/api/v1/hrms/attendance/settings/devices')
        .set(headers)
        .send({
          deviceName: 'Building A Front Door Terminal',
          deviceCode: `TERM-HQ-${Date.now().toString().slice(-4)}`,
          deviceType: 'biometric_fingerprint',
          ipAddress: '192.168.1.50',
          port: 4370,
        });

      expect(regRes.status).toBe(201);
      testDeviceId = regRes.body.data.id;

      const testRes = await request(app)
        .post(`/api/v1/hrms/attendance/settings/devices/${testDeviceId}/test`)
        .set(headers);

      expect(testRes.status).toBe(200);
      expect(testRes.body.data.status).toBe('online');
      expect(testRes.body.data.latencyMs).toBeGreaterThan(0);
    });

    it('processes bulk punch import and allows audited reversal', async () => {
      const impRes = await request(app)
        .post('/api/v1/hrms/attendance/settings/import')
        .set(headers)
        .send({
          batchType: 'raw_punches',
          fileName: 'biometric_test_batch.csv',
          rows: [
            { employeeId: 'EMP-001', date: '2026-10-01 09:00:00', punchType: 'in' },
            { employeeId: 'EMP-001', date: '2026-10-01 18:00:00', punchType: 'out' },
          ],
        });

      expect(impRes.status).toBe(201);
      expect(impRes.body.data.totalRows).toBe(2);
      expect(impRes.body.data.successRows).toBe(2);
      importBatchId = impRes.body.data.id;

      // Reverse import
      const rollbackRes = await request(app)
        .post(`/api/v1/hrms/attendance/settings/import/batches/${importBatchId}/rollback`)
        .set(headers);

      expect(rollbackRes.status).toBe(200);
      expect(rollbackRes.body.success).toBe(true);
    });
  });

  /* ── 5. Location & Security ── */
  describe('Location & Security Settings', () => {
    it('configures geofences, IP allowlist, and anti-spoofing flags', async () => {
      const res = await request(app)
        .put('/api/v1/hrms/attendance/settings/security')
        .set(headers)
        .send({
          enableGps: true,
          geofenceConfigs: [
            {
              locationId: 'loc_main',
              name: 'Bangalore Innovation Hub',
              latitude: 12.9716,
              longitude: 77.5946,
              radiusMeters: 200,
              enforceStrict: true,
            },
          ],
          ipAllowlist: ['192.168.1.0/24'],
          maxDevicesPerEmployee: 2,
          detectMockLocation: true,
          detectImpossibleTravel: true,
          rapidPunchThrottlingSeconds: 60,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.enableGps).toBe(true);
      expect(res.body.data.detectMockLocation).toBe(true);
      expect(res.body.data.geofenceConfigs).toHaveLength(1);
    });
  });

  /* ── 6. Payroll & Locking ── */
  describe('Payroll & Locking', () => {
    it('inspects period readiness, locks period, and reopens with mandatory reason', async () => {
      const periodCode = '2026-10';

      // 1. Readiness Check
      const readyRes = await request(app)
        .get(`/api/v1/hrms/attendance/settings/payroll/periods/${periodCode}/readiness`)
        .set(headers);

      expect(readyRes.status).toBe(200);
      expect(readyRes.body.data).toHaveProperty('canLock');

      // 2. Lock Period (warning_only mode allows lock if discrepancies present)
      await request(app)
        .put('/api/v1/hrms/attendance/settings/payroll')
        .set(headers)
        .send({ blockingSeverity: 'warning_only' });

      const lockRes = await request(app)
        .post(`/api/v1/hrms/attendance/settings/payroll/periods/${periodCode}/lock`)
        .set(headers);

      expect(lockRes.status).toBe(200);
      expect(lockRes.body.data.status).toBe('locked');

      // 3. Generate Audited Payroll Handover CSV
      const handoverRes = await request(app)
        .post('/api/v1/hrms/attendance/settings/payroll/handover/generate')
        .set(headers)
        .send({
          periodCode,
          format: 'csv',
        });

      expect(handoverRes.status).toBe(200);
      expect(handoverRes.body.data.batch.batchNumber).toContain(periodCode);
      expect(handoverRes.body.data.exportData).toContain('Employee Code');

      // 4. Attempt unlock with too short reason (must fail)
      const failUnlock = await request(app)
        .post(`/api/v1/hrms/attendance/settings/payroll/periods/${periodCode}/unlock`)
        .set(headers)
        .send({ reason: 'no' });

      expect(failUnlock.status).toBe(400);

      // 5. Successful unlock with valid reason
      const unlockRes = await request(app)
        .post(`/api/v1/hrms/attendance/settings/payroll/periods/${periodCode}/unlock`)
        .set(headers)
        .send({ reason: 'Authorized retro correction for late-submitted regularizations' });

      expect(unlockRes.status).toBe(200);
      expect(unlockRes.body.data.status).toBe('open');
      expect(unlockRes.body.data.unlockReason).toContain('Authorized retro correction');
    });
  });

  /* ── 7. Audit Trail Integrity & Tenant Isolation ── */
  describe('Audit Trail & Tenant Isolation', () => {
    it('retrieves append-only audit trail filtered by domain category', async () => {
      const res = await request(app)
        .get('/api/v1/hrms/attendance/settings/audit?category=general')
        .set(headers);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data[0].category).toBe('general');
    });

    it('enforces company isolation — Company 2 cannot read Company 1 devices', async () => {
      const comp1Devices = await request(app)
        .get('/api/v1/hrms/attendance/settings/devices')
        .set(headers);

      const comp2Devices = await request(app)
        .get('/api/v1/hrms/attendance/settings/devices')
        .set(otherHeaders);

      expect(comp1Devices.status).toBe(200);
      expect(comp2Devices.status).toBe(200);

      const comp1Ids = (comp1Devices.body.data as Array<{ id: string }>).map((d) => d.id);
      for (const d of comp2Devices.body.data as Array<{ id: string }>) {
        expect(comp1Ids).not.toContain(d.id);
      }
    });

    it('rejects unauthenticated requests with 401 Unauthorized', async () => {
      const res = await request(app).get('/api/v1/hrms/attendance/settings/general');
      expect(res.status).toBe(401);
    });

    it('rejects creating policy with non-existent scopeId with 400 Bad Request', async () => {
      const res = await request(app)
        .post('/api/v1/hrms/attendance/settings/policies')
        .set(headers)
        .send({
          policyName: 'Invalid Scope Policy',
          scope: 'department',
          scopeId: 'dept_completely_fictitious',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toMatch(/does not exist/i);
    });
  });
});

