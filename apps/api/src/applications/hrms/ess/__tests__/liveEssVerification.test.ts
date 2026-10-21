import { describe, it, expect } from 'vitest';
import { getDb } from '../../../../db/connection.js';
import { employees, users, memberships } from '../../../../db/schema.js';
import { eq, and } from 'drizzle-orm';
import { EmployeeService } from '../../employees/service/employee.service.js';
import { EssService } from '../service/ess.service.js';
import { AuthService } from '../../../../platform/auth/service/auth.service.js';
import { createUnusableCredential } from '../../../../platform/auth/security.js';

describe('Live Employee Creation to ESS Access Verification', () => {
  it('allows a newly created employee to access the ESS portal, dashboard, attendance, and timesheets', async () => {
    const db = getDb();
    const empService = new EmployeeService();
    const essService = new EssService();
    const authService = new AuthService();

    const tenantId = 'tenant_demo_01';
    const companyId = 'comp_demo_01';
    const testEmail = `ess_live_verify_${Date.now()}@testbezent.example`;

    // 1. Create a brand new employee in HRMS
    const createdEmployee = await empService.createEmployee(tenantId, companyId, {
      firstName: 'Kavitha',
      lastName: 'Ranganathan',
      email: testEmail,
      employmentType: 'full_time',
      joiningDate: '2026-01-15',
      workMobile: '+91 9876543210',
    });

    expect(createdEmployee.id).toBeDefined();
    expect(createdEmployee.employeeNumber).toMatch(/^EMP-\d+/);
    expect(createdEmployee.email).toBe(testEmail);

    // 2. Simulate User identity creation (Email OTP login or invitation)
    const userId = `usr_test_${Date.now()}`;
    const credential = createUnusableCredential();
    await db.insert(users).values({
      id: userId,
      email: testEmail,
      firstName: 'Kavitha',
      lastName: 'Ranganathan',
      status: 'active',
      passwordHash: credential.hash,
      salt: credential.salt,
    });

    // User gets 'employee' role membership in the company
    await db.insert(memberships).values({
      id: `mem_test_${Date.now()}`,
      userId,
      tenantId,
      companyId,
      role: 'employee',
      status: 'active',
    });

    // 3. Issue Session and verify workspace resolution
    const [createdUser] = await db.select().from(users).where(eq(users.id, userId));
    if (!createdUser) throw new Error('User record was not created');
    const session = await authService.issueSession(createdUser);
    const resolvedWorkspaces = Array.from(
      new Set(session.access.companies.flatMap((c) => c.workspaces)),
    );

    // An employee user must have 'ess' workspace access
    expect(resolvedWorkspaces).toContain('ess');
    expect(session.defaultDestination).toBe('/ess');

    // 4. Emulate IAM Bridge: Auto-link Employee record to User ID
    const [empRecord] = await db
      .select()
      .from(employees)
      .where(
        and(
          eq(employees.tenantId, tenantId),
          eq(employees.companyId, companyId),
          eq(employees.email, testEmail),
        ),
      );

    expect(empRecord).toBeDefined();
    if (!empRecord) throw new Error('Employee record was not created');
    await db.update(employees).set({ userId }).where(eq(employees.id, empRecord.id));

    // 5. Verify ESS Dashboard Data
    const ctx = {
      id: empRecord.id,
      tenantId,
      companyId,
      employeeNumber: empRecord.employeeNumber,
      firstName: empRecord.firstName,
      lastName: empRecord.lastName,
      email: empRecord.email,
      departmentId: empRecord.departmentId,
      designationId: empRecord.designationId,
      locationId: empRecord.locationId,
      reportingManagerId: empRecord.reportingManagerId,
      employmentType: empRecord.employmentType,
      employmentStatus: empRecord.employmentStatus,
      joiningDate: empRecord.joiningDate,
    };

    const dashboard = await essService.getDashboardData(ctx);
    expect(dashboard.employee.firstName).toBe('Kavitha');
    expect(dashboard.employee.lastName).toBe('Ranganathan');
    expect(dashboard.leaveBalances.length).toBeGreaterThan(0);

    // 6. Verify Attendance Workspace
    const attendanceWorkspace = await essService.getAttendanceWorkspace(ctx);
    expect(attendanceWorkspace.today.status).toBe('not_checked_in');
    expect(attendanceWorkspace.today.checkInTime).toBeNull();
    expect(Array.isArray(attendanceWorkspace.history)).toBe(true);

    // 7. Verify Timesheets
    const timesheetWorkspace = await essService.getTimesheetsWorkspace(ctx);
    expect(timesheetWorkspace).toBeDefined();
    expect(Array.isArray(timesheetWorkspace.timesheets)).toBe(true);
  });
});
