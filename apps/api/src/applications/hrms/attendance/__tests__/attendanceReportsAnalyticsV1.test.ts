import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { eq, and } from 'drizzle-orm';
import { createApp } from '../../../../app/server/createApp.js';
import { isDatabaseConfigured, getDb } from '../../../../db/connection.js';
import {
  employeeAttendance,
  attendanceMonthlySummaries,
  employees,
  departments,
} from '../../../../db/schema.js';
import { generateSurrogateId } from '../../../../platform/auth/security.js';
import { hrmsTestHeaders } from '../../../../platform/__tests__/support/testSession.js';
import { getReportDefinition } from '../service/attendanceReportRegistry.js';
import { buildReportAnalytics } from '../service/attendanceReportAnalytics.service.js';
import { generatePdfExport } from '../service/attendanceReportExporter.js';
import { AttendanceReportsService } from '../service/attendanceReports.service.js';
import type { CompanyAccess } from '../../../../platform/access/types/access.types.js';

describe('BEZENT HRMS — Attendance Reports Analytics V1.0 Unit & Aggregation Suite', () => {
  it('calculates mathematically accurate R01 KPIs and status distribution', () => {
    const def = getReportDefinition('R01')!;
    const mockRows = [
      {
        date: '2026-10-01',
        department: 'Engineering',
        status: 'Present',
        workedMinutes: 480,
        lateMinutes: 10,
        earlyExitMinutes: 0,
      },
      {
        date: '2026-10-01',
        department: 'Engineering',
        status: 'Present',
        workedMinutes: 500,
        lateMinutes: 0,
        earlyExitMinutes: 0,
      },
      {
        date: '2026-10-01',
        department: 'Product',
        status: 'Absent',
        workedMinutes: 0,
        lateMinutes: 0,
        earlyExitMinutes: 0,
      },
      {
        date: '2026-10-01',
        department: 'Product',
        status: 'On Leave',
        workedMinutes: 0,
        lateMinutes: 0,
        earlyExitMinutes: 0,
      },
      {
        date: '2026-10-01',
        department: 'Design',
        status: 'Half Day',
        workedMinutes: 240,
        lateMinutes: 0,
        earlyExitMinutes: 30,
      },
    ];

    const result = buildReportAnalytics(def, mockRows, { date: '2026-10-01' });

    expect(result.reportId).toBe('R01');
    expect(result.totalDatasetRows).toBe(5);

    const kpiMap = new Map(result.kpis.map((k) => [k.id, k.value]));
    expect(kpiMap.get('total')).toBe(5);
    expect(kpiMap.get('present')).toBe(2);
    expect(kpiMap.get('absent')).toBe(1);
    expect(kpiMap.get('late')).toBe(1);
    expect(kpiMap.get('early')).toBe(1);
    // (2 + 0.5) / 5 = 50.0%
    expect(kpiMap.get('rate')).toBe('50.0%');

    // Status Donut
    expect(result.charts.statusDistribution).toBeDefined();
    expect(result.charts.statusDistribution?.chartType).toBe('donut');
    expect(result.charts.statusDistribution?.slices?.length).toBe(4);

    // Department Grouped Bar
    expect(result.charts.departmentComparison).toBeDefined();
    expect(result.charts.departmentComparison?.categories).toContain('Engineering');
    expect(result.charts.departmentComparison?.categories).toContain('Product');
  });

  it('safely handles zero-denominator and empty datasets without NaN or throwing', () => {
    const def = getReportDefinition('R01')!;
    const result = buildReportAnalytics(def, [], {});

    expect(result.totalDatasetRows).toBe(0);
    const kpiMap = new Map(result.kpis.map((k) => [k.id, k.value]));
    expect(kpiMap.get('total')).toBe(0);
    expect(kpiMap.get('present')).toBe(0);
    expect(kpiMap.get('rate')).toBe('N/A');
    expect(result.charts.statusDistribution?.slices?.reduce((acc, s) => acc + s.value, 0)).toBe(0);
  });

  it('verifies R06 Overtime calculation separates actual worked from approved OT with N/A disclaimer', () => {
    const def = getReportDefinition('R06')!;
    const mockRows = [
      {
        date: '2026-10-01',
        department: 'Operations',
        scheduledHours: 8,
        actualWorkedHours: 10,
        extraWorkedHours: 2,
        processingStatus: 'Completed',
      },
      {
        date: '2026-10-01',
        department: 'Operations',
        scheduledHours: 8,
        actualWorkedHours: 11,
        extraWorkedHours: 3,
        processingStatus: 'Completed',
      },
    ];

    const result = buildReportAnalytics(def, mockRows, {});
    const kpiMap = new Map(result.kpis.map((k) => [k.id, k.value]));

    expect(kpiMap.get('scheduled')).toBe('16.0');
    expect(kpiMap.get('actual')).toBe('21.0');
    expect(kpiMap.get('extra')).toBe('5.0');
    // Approved OT must be N/A
    expect(kpiMap.get('approved_ot')).toBe('N/A');
    expect(kpiMap.get('approval_status')).toBe('N/A');

    expect(result.charts.comparisonOrComposition?.series?.length).toBe(2);
  });

  it('verifies R02 Monthly Attendance Register aggregations and readiness distribution', () => {
    const def = getReportDefinition('R02')!;
    const mockRows = [
      {
        employeeId: 'EMP-01',
        department: 'Engineering',
        scheduledDays: 22,
        presentDays: 20,
        absentDays: 1,
        leaveDays: 1,
        odDays: 0,
        payrollReadiness: 'Ready',
      },
      {
        employeeId: 'EMP-02',
        department: 'Engineering',
        scheduledDays: 22,
        presentDays: 18,
        absentDays: 2,
        leaveDays: 2,
        odDays: 0,
        payrollReadiness: 'Pending Exceptions',
      },
      {
        employeeId: 'EMP-03',
        department: 'Sales',
        scheduledDays: 22,
        presentDays: 15,
        absentDays: 5,
        leaveDays: 1,
        odDays: 1,
        payrollReadiness: 'Blocked',
      },
    ];

    const result = buildReportAnalytics(def, mockRows, {});
    const kpiMap = new Map(result.kpis.map((k) => [k.id, k.value]));

    expect(kpiMap.get('employees')).toBe(3);
    expect(kpiMap.get('present_days')).toBe('53.0');
    expect(kpiMap.get('absent_days')).toBe('8.0');
    expect(kpiMap.get('leave_days')).toBe('4.0');
    expect(kpiMap.get('od_days')).toBe('1.0');

    expect(result.charts.statusDistribution?.slices?.length).toBe(3);
    expect(result.charts.comparisonOrComposition?.chartType).toBe('stacked_bar');
  });

  it('generates a valid binary PDF-1.4 containing executive analytics dashboard', () => {
    const def = getReportDefinition('R01')!;
    const mockRows = [
      {
        date: '2026-10-01',
        employeeId: 'EMP-1',
        employeeName: 'Alice',
        department: 'HQ',
        shift: 'General',
        actualWorkedHours: 8,
        creditedHours: 8,
        status: 'Present',
      },
    ];
    const analytics = buildReportAnalytics(def, mockRows, { date: '2026-10-01' });

    const pdfBuffer = generatePdfExport(def, def.columns, mockRows, {
      companyName: 'Acme Corp',
      generatedAt: '2026-10-12 12:00:00',
      timezone: 'UTC',
      appliedFilters: { date: '2026-10-01' },
      analytics,
    });

    expect(Buffer.isBuffer(pdfBuffer)).toBe(true);
    const pdfString = pdfBuffer.toString('utf-8');
    expect(pdfString.startsWith('%PDF-1.4')).toBe(true);
    expect(pdfString.includes('Executive Visual Analytics')).toBe(true);
    expect(pdfString.includes('EXECUTIVE KEY PERFORMANCE INDICATORS')).toBe(true);
    expect(pdfString.trim().endsWith('%%EOF')).toBe(true);
  });
});

describe.skipIf(!isDatabaseConfigured)(
  'BEZENT HRMS — Attendance Reports Analytics V1.0 API Integration Suite',
  () => {
    const app = createApp();
    const tenantId = 'tenant_demo_01';
    const companyId = 'comp_demo_01';
    const otherCompanyId = 'comp_other_analytics_test';

    const runSuffix = Date.now().toString().slice(-6);
    const testEmpId1 = generateSurrogateId('emp');
    let testDeptId: string;
    const empNum1 = `ANL1_${runSuffix}`;

    let headers: Record<string, string>;

    beforeAll(async () => {
      headers = await hrmsTestHeaders(companyId, tenantId);
      const db = getDb();

      // Look up existing department or insert if missing
      const [existingDept] = await db
        .select({ id: departments.id })
        .from(departments)
        .where(
          and(eq(departments.companyId, companyId), eq(departments.name, 'Analytics Engineering')),
        )
        .limit(1);

      if (existingDept) {
        testDeptId = existingDept.id;
      } else {
        testDeptId = generateSurrogateId('dpt');
        await db.insert(departments).values({
          id: testDeptId,
          tenantId,
          companyId,
          name: 'Analytics Engineering',
          code: `ANL-ENG-${runSuffix}`,
        });
      }

      // Insert employee
      await db.insert(employees).values([
        {
          id: testEmpId1,
          tenantId,
          companyId,
          employeeNumber: empNum1,
          firstName: 'Alan',
          lastName: 'Turing',
          email: `alan.${runSuffix}@example.com`,
          departmentId: testDeptId,
          joiningDate: '2026-01-01',
        },
      ]);

      // Insert daily attendance
      await db.insert(employeeAttendance).values([
        {
          id: generateSurrogateId('att'),
          tenantId,
          companyId,
          employeeId: testEmpId1,
          date: '2026-10-10',
          checkInTime: '09:00:00',
          checkOutTime: '17:30:00',
          status: 'present',
          processingState: 'finalized',
          workedMinutes: 510,
          lateMinutes: 10,
          earlyMinutes: 0,
          isLate: true,
          isEarlyExit: false,
          isMissingPunch: false,
          isRegularized: false,
        },
      ]);

      // Insert monthly summary
      await db.insert(attendanceMonthlySummaries).values({
        id: generateSurrogateId('ams'),
        tenantId,
        companyId,
        employeeId: testEmpId1,
        month: '2026-10',
        scheduledDays: 22,
        scheduledMinutes: 10560,
        presentDays: '20.00',
        absentDays: '1.00',
        leaveDays: '1.00',
        onDutyDays: '0.00',
        weeklyOffDays: 8,
        holidayDays: 1,
        actualWorkedMinutes: 10200,
        policyCreditedMinutes: 10200,
        lateOccurrences: 1,
        lateMinutes: 10,
        earlyExitOccurrences: 0,
        earlyExitMinutes: 0,
        unresolvedExceptions: 0,
        pendingCorrections: 0,
        reviewState: 'reviewed',
        payrollReadiness: 'ready',
        version: 1,
      });
    });

    it('POST /hrms/attendance/reports/R01/analytics returns accurate aggregations and KPI metrics', async () => {
      const res = await request(app)
        .post('/api/v1/hrms/attendance/reports/R01/analytics')
        .set(headers)
        .send({
          filters: {
            startDate: '2026-10-01',
            endDate: '2026-10-31',
          },
        });

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.reportId).toBe('R01');
      expect(res.body.data.kpis).toBeInstanceOf(Array);
      expect(res.body.data.kpis.length).toBeGreaterThan(0);
      expect(res.body.data.charts).toBeDefined();
      expect(res.body.data.charts.statusDistribution).toBeDefined();
      expect(res.body.data.charts.departmentComparison).toBeDefined();
      expect(res.body.data.drillDownSupport.supportedDimensions.length).toBeGreaterThan(0);
    });

    it('POST /hrms/attendance/reports/R02/analytics returns monthly workforce aggregations', async () => {
      const res = await request(app)
        .post('/api/v1/hrms/attendance/reports/R02/analytics')
        .set(headers)
        .send({
          filters: {
            month: '2026-10',
          },
        });

      expect(res.status).toBe(200);
      expect(res.body.data.reportId).toBe('R02');
      expect(res.body.data.charts.statusDistribution?.chartType).toBe('donut');
    });

    it('enforces RBAC on R15 Audit Analytics: forbidden without hrms.attendance.audit', async () => {
      const service = new AttendanceReportsService();
      const mockAccessWithoutAudit = {
        tenantId: 'tenant_1',
        companyId: 'comp_1',
        userId: 'usr_1',
        roles: ['employee'],
        permissions: ['hrms.attendance.reports'],
      } as unknown as CompanyAccess;

      await expect(
        service.getReportAnalytics(
          'tenant_1',
          'comp_1',
          'R15',
          {},
          undefined,
          mockAccessWithoutAudit,
        ),
      ).rejects.toThrow('hrms.attendance.audit');
    });

    it('enforces tenant/company isolation in analytics queries', async () => {
      const otherHeaders = await hrmsTestHeaders(otherCompanyId, 'tenant_other_anl_01');

      const res = await request(app)
        .post('/api/v1/hrms/attendance/reports/R01/analytics')
        .set(otherHeaders)
        .send({
          filters: {
            startDate: '2026-10-01',
            endDate: '2026-10-31',
          },
        });

      expect(res.status).toBe(200);
      expect(res.body.data.totalDatasetRows).toBe(0);
    });

    it('supports drill-down filtering consistency between analytics and preview', async () => {
      // 1. Analytics returns present count
      const anlRes = await request(app)
        .post('/api/v1/hrms/attendance/reports/R01/analytics')
        .set(headers)
        .send({
          filters: {
            startDate: '2026-10-01',
            endDate: '2026-10-31',
          },
        });

      expect(anlRes.status).toBe(200);
      const presentKpi = (anlRes.body.data.kpis as Array<{ id: string; value: number }>).find(
        (k) => k.id === 'present',
      );
      expect(presentKpi).toBeDefined();

      // 2. Preview with drilldown filter for status='present'
      const previewRes = await request(app)
        .post('/api/v1/hrms/attendance/reports/R01/preview')
        .set(headers)
        .send({
          filters: {
            startDate: '2026-10-01',
            endDate: '2026-10-31',
            status: 'present',
          },
        });

      expect(previewRes.status).toBe(200);
      expect(previewRes.body.data.totalRows).toBe(presentKpi?.value);
    });

    it('POST /hrms/attendance/reports/R01/export generates PDF containing executive analytics', async () => {
      const res = await request(app)
        .post('/api/v1/hrms/attendance/reports/R01/export')
        .set(headers)
        .send({
          format: 'pdf',
          filters: {
            startDate: '2026-10-01',
            endDate: '2026-10-31',
          },
          includeAnalytics: true,
        });

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toBe('application/pdf');
      const pdfText = res.body.toString('utf-8');
      expect(pdfText.startsWith('%PDF-1.4')).toBe(true);
      expect(pdfText.includes('Executive Visual Analytics')).toBe(true);
      expect(pdfText.trim().endsWith('%%EOF')).toBe(true);
    });

    afterAll(async () => {
      const db = getDb();
      await db.delete(employeeAttendance).where(eq(employeeAttendance.employeeId, testEmpId1));
      await db
        .delete(attendanceMonthlySummaries)
        .where(eq(attendanceMonthlySummaries.employeeId, testEmpId1));
      await db.delete(employees).where(eq(employees.id, testEmpId1));
    });
  },
);
