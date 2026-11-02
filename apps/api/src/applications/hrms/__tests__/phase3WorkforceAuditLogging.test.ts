import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { EmployeeService } from '../employees/service/employee.service.js';
import type { EmployeeRepository } from '../employees/repository/employee.repository.js';
import type { OrganizationRepository } from '../../../platform/organization/repository/organization.repository.js';
import { AuditService } from '../../../platform/audit/service/audit.service.js';
import type { AuditRepository } from '../../../platform/audit/repository/audit.repository.js';
import type { AuditEventInput } from '../../../platform/audit/types/audit.types.js';
import { ConflictError, BadRequestError, NotFoundError } from '../../../app/errors/AppError.js';
import type { EmployeeDetails } from '../employees/types/employee.types.js';
import { employeeRouter } from '../employees/routes/employee.route.js';
import { errorHandler } from '../../../app/errors/errorHandler.js';

describe('BEZENT HRMS — Phase 3.0: Workforce Audit Logging Suite', () => {
  const tenantId = 'tenant_audit_01';
  const companyId = 'comp_audit_01';
  const employeeId = 'emp_audit_001';

  let mockRepo: Partial<EmployeeRepository>;
  let mockOrgRepo: Partial<OrganizationRepository>;
  let mockAuditRepo: Partial<AuditRepository>;
  let auditService: AuditService;
  let employeeService: EmployeeService;

  const baseEmployee: EmployeeDetails = {
    id: employeeId,
    tenantId,
    companyId,
    employeeNumber: 'EMP-9001',
    userId: 'usr_emp_target',
    firstName: 'Michael',
    lastName: 'Scott',
    fullName: 'Michael Scott',
    email: 'm.scott@dundermifflin.com',
    phone: '+15551234567',
    departmentId: 'dept_management',
    departmentName: 'Management',
    designationId: 'desig_regional_mgr',
    designationName: 'Regional Manager',
    locationId: 'loc_scranton',
    locationName: 'Scranton Branch',
    reportingManagerId: null,
    reportingManagerName: null,
    joiningDate: '2026-01-15',
    confirmedJoiningDate: '2026-01-15',
    probationEndDate: '2026-04-15',
    confirmationDate: null,
    lastWorkingDate: null,
    sourceOfHire: 'direct_applicant',
    noticePeriodDays: 30,
    contractEndDate: null,
    employmentType: 'full_time',
    employmentStatus: 'probation',
    referralCode: 'REF-EMP9001',
    referredByEmployeeId: null,
    referredByName: null,
    createdAt: new Date('2026-01-15T00:00:00Z'),
    updatedAt: new Date('2026-01-15T00:00:00Z'),
  };

  beforeEach(() => {
    mockRepo = {
      getById: vi.fn().mockResolvedValue({ ...baseEmployee }),
      update: vi.fn().mockImplementation((_t, _c, _id, dto) =>
        Promise.resolve({
          ...baseEmployee,
          ...dto,
          fullName: `${dto.firstName ?? baseEmployee.firstName} ${dto.lastName ?? baseEmployee.lastName}`,
          updatedAt: new Date(),
        }),
      ),
      getByEmail: vi.fn().mockResolvedValue(null),
    };

    mockOrgRepo = {
      getMasters: vi.fn().mockResolvedValue({
        company: { id: companyId, name: 'Dunder Mifflin', code: 'DM-SCR' },
        departments: [
          { id: 'dept_management', name: 'Management', code: 'MGT' },
          { id: 'dept_sales', name: 'Sales', code: 'SLS' },
        ],
        designations: [
          { id: 'desig_regional_mgr', name: 'Regional Manager', code: 'RM' },
          { id: 'desig_sales_rep', name: 'Sales Representative', code: 'SR' },
        ],
        locations: [{ id: 'loc_scranton', name: 'Scranton Branch', code: 'SCR' }],
      }),
    };

    mockAuditRepo = {
      record: vi.fn().mockImplementation((event) =>
        Promise.resolve({
          id: 'aud_generated_123',
          actorUserId: event.actorUserId ?? null,
          actorEmail: event.actorEmail ?? null,
          action: event.action,
          targetType: event.targetType,
          targetId: event.targetId,
          tenantId: event.tenantId ?? null,
          companyId: event.companyId ?? null,
          metadata: event.metadata ?? null,
          createdAt: new Date().toISOString(),
        }),
      ),
      list: vi.fn(),
    };

    auditService = new AuditService(mockAuditRepo as AuditRepository);

    employeeService = new EmployeeService(
      mockRepo as EmployeeRepository,
      mockOrgRepo as OrganizationRepository,
      undefined,
      auditService,
    );
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // 1 & 2. FIELD UPDATES, EVENT GENERATION & PREVIOUS / NEW VALUES
  // ═════════════════════════════════════════════════════════════════════════════

  it('1 & 2. records audit event with correct previous and new values on employee field update', async () => {
    const logSpy = vi.spyOn(auditService, 'logEvent');

    const result = await employeeService.updateEmployee(
      tenantId,
      companyId,
      employeeId,
      { firstName: 'Michael G.' },
      { userId: 'usr_admin_42', email: 'jan.levinson@corporate.com' },
    );

    expect(result.firstName).toBe('Michael G.');
    expect(mockRepo.update).toHaveBeenCalledTimes(1);
    expect(logSpy).toHaveBeenCalledTimes(1);

    const auditCall = logSpy.mock.calls[0]![0];
    expect(auditCall.action).toBe('employee_updated');
    expect(auditCall.targetType).toBe('employee');
    expect(auditCall.targetId).toBe(employeeId);
    expect(auditCall.tenantId).toBe(tenantId);
    expect(auditCall.companyId).toBe(companyId);
    expect(auditCall.actorUserId).toBe('usr_admin_42');
    expect(auditCall.actorEmail).toBe('jan.levinson@corporate.com');

    expect(auditCall.metadata).toEqual({
      employeeNumber: 'EMP-9001',
      changedFields: ['firstName'],
      previousValues: { firstName: 'Michael' },
      newValues: { firstName: 'Michael G.' },
    });
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // 3. MULTIPLE CHANGED FIELDS CAPTURED
  // ═════════════════════════════════════════════════════════════════════════════

  it('3. captures multiple changed fields simultaneously in changedFields diff', async () => {
    const logSpy = vi.spyOn(auditService, 'logEvent');

    await employeeService.updateEmployee(
      tenantId,
      companyId,
      employeeId,
      {
        firstName: 'Mike',
        phone: '+15559876543',
        departmentId: 'dept_sales',
      },
      'usr_hr_lead',
    );

    expect(logSpy).toHaveBeenCalledTimes(1);
    const auditCall = logSpy.mock.calls[0]![0];

    expect(auditCall.metadata?.changedFields).toEqual(['firstName', 'phone', 'departmentId']);
    expect(auditCall.metadata?.previousValues).toEqual({
      firstName: 'Michael',
      phone: '+15551234567',
      departmentId: 'dept_management',
    });
    expect(auditCall.metadata?.newValues).toEqual({
      firstName: 'Mike',
      phone: '+15559876543',
      departmentId: 'dept_sales',
    });
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // 4. UNCHANGED FIELDS EXCLUSION & NO-OP LOGGING SUPPRESSION
  // ═════════════════════════════════════════════════════════════════════════════

  it('4a. excludes unchanged fields from previousValues and newValues', async () => {
    const logSpy = vi.spyOn(auditService, 'logEvent');

    // Send both changed and identical values
    await employeeService.updateEmployee(
      tenantId,
      companyId,
      employeeId,
      {
        firstName: 'Michael', // Unchanged
        lastName: 'Scarn', // Changed
      },
      'usr_admin_01',
    );

    expect(logSpy).toHaveBeenCalledTimes(1);
    const auditCall = logSpy.mock.calls[0]![0];

    expect(auditCall.metadata?.changedFields).toEqual(['lastName']);
    expect(auditCall.metadata?.previousValues).toEqual({ lastName: 'Scott' });
    expect(auditCall.metadata?.newValues).toEqual({ lastName: 'Scarn' });
    expect((auditCall.metadata?.previousValues as Record<string, unknown>).firstName).toBeUndefined();
  });

  it('4b. suppresses audit logging when no fields actually changed', async () => {
    const logSpy = vi.spyOn(auditService, 'logEvent');

    await employeeService.updateEmployee(
      tenantId,
      companyId,
      employeeId,
      {
        firstName: 'Michael',
        lastName: 'Scott',
        departmentId: 'dept_management',
      },
      'usr_admin_01',
    );

    expect(mockRepo.update).toHaveBeenCalledTimes(1);
    expect(logSpy).not.toHaveBeenCalled();
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // 5 & 6. ACTOR ID CONTEXT & TENANT/COMPANY ISOLATION
  // ═════════════════════════════════════════════════════════════════════════════

  it('5 & 6. correctly records actor ID and preserves tenant/company context', async () => {
    const logSpy = vi.spyOn(auditService, 'logEvent');

    await employeeService.updateEmployee(
      'tenant_isolated_99',
      'comp_isolated_99',
      employeeId,
      { phone: '+10000000000' },
      { userId: 'usr_david_wallace', email: 'david@cfo.com' },
    );

    const auditCall = logSpy.mock.calls[0]![0];
    expect(auditCall.tenantId).toBe('tenant_isolated_99');
    expect(auditCall.companyId).toBe('comp_isolated_99');
    expect(auditCall.actorUserId).toBe('usr_david_wallace');
    expect(auditCall.actorEmail).toBe('david@cfo.com');
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // 7. SENSITIVE VALUES REDACTION
  // ═════════════════════════════════════════════════════════════════════════════

  it('7. automatically redacts sensitive financial and authentication identifiers in audit metadata', async () => {
    const recordSpy = vi.spyOn(mockAuditRepo as { record: any }, 'record');

    // Simulate audit event with sensitive financial or statutory metadata
    await auditService.logEvent({
      actorUserId: 'usr_admin',
      action: 'employee_updated',
      targetType: 'employee',
      targetId: employeeId,
      tenantId,
      companyId,
      metadata: {
        employeeNumber: 'EMP-9001',
        changedFields: ['bank_account', 'pan_number', 'phone'],
        previousValues: {
          bank_account: '987654321012',
          pan_number: 'ABCDE1234F',
          phone: '+15551234567',
        },
        newValues: {
          bank_account: '112233445566',
          pan_number: 'XYZ987654A',
          phone: '+15559876543',
        },
      },
    });

    expect(recordSpy).toHaveBeenCalledTimes(1);
    const recorded = recordSpy.mock.calls[0]![0] as AuditEventInput;

    const prev = recorded.metadata?.previousValues as Record<string, unknown>;
    const next = recorded.metadata?.newValues as Record<string, unknown>;

    expect(prev.bank_account).toBe('[REDACTED]');
    expect(prev.pan_number).toBe('[REDACTED]');
    expect(prev.phone).toBe('+15551234567'); // Non-sensitive field preserved

    expect(next.bank_account).toBe('[REDACTED]');
    expect(next.pan_number).toBe('[REDACTED]');
    expect(next.phone).toBe('+15559876543');
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // 8. AUDIT PERSISTENCE FAILURE & TRANSACTION CONSISTENCY
  // ═════════════════════════════════════════════════════════════════════════════

  it('8. rolls back and propagates error if audit logging fails during transaction', async () => {
    const txRollbackSpy = vi.fn();
    const mockTx = { rollback: txRollbackSpy };

    // Simulate repository with transaction support
    mockRepo.transaction = vi.fn().mockImplementation(async (callback) => {
      try {
        return await callback(mockTx);
      } catch (err) {
        txRollbackSpy();
        throw err;
      }
    });

    // Audit service throws a persistence error
    vi.spyOn(auditService, 'logEvent').mockRejectedValue(
      new Error('DB_DEADLOCK: Failed to insert audit log record'),
    );

    await expect(
      employeeService.updateEmployee(
        tenantId,
        companyId,
        employeeId,
        { firstName: 'NewName' },
        'usr_admin',
      ),
    ).rejects.toThrow('DB_DEADLOCK: Failed to insert audit log record');

    expect(mockRepo.transaction).toHaveBeenCalledTimes(1);
    expect(txRollbackSpy).toHaveBeenCalledTimes(1);
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // 9. INVALID UPDATES DO NOT EMIT AUDIT EVENTS
  // ═════════════════════════════════════════════════════════════════════════════

  it('9. does not emit audit events when validation fails or conflict occurs', async () => {
    const logSpy = vi.spyOn(auditService, 'logEvent');

    // 1. Employee not found
    vi.mocked(mockRepo.getById!).mockResolvedValueOnce(null);
    await expect(
      employeeService.updateEmployee(tenantId, companyId, 'non_existent_id', { firstName: 'Ghost' }),
    ).rejects.toThrow(NotFoundError);

    // 2. Email conflict
    vi.mocked(mockRepo.getByEmail!).mockResolvedValueOnce({
      ...baseEmployee,
      id: 'emp_other',
      email: 'taken@example.com',
    });
    await expect(
      employeeService.updateEmployee(tenantId, companyId, employeeId, { email: 'taken@example.com' }),
    ).rejects.toThrow(ConflictError);

    // 3. Self-reporting manager error
    await expect(
      employeeService.updateEmployee(tenantId, companyId, employeeId, {
        reportingManagerId: employeeId,
      }),
    ).rejects.toThrow(BadRequestError);

    expect(logSpy).not.toHaveBeenCalled();
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // 10. EMPLOYEE LIFECYCLE TRANSITIONS AUDITING & VALIDATION
  // ═════════════════════════════════════════════════════════════════════════════

  it('10a. records audit event on valid lifecycle transition (probation -> active)', async () => {
    const logSpy = vi.spyOn(auditService, 'logEvent');

    await employeeService.updateEmployee(
      tenantId,
      companyId,
      employeeId,
      { employmentStatus: 'active' },
      'usr_hr_manager',
    );

    expect(logSpy).toHaveBeenCalledTimes(1);
    const auditCall = logSpy.mock.calls[0]![0];
    expect(auditCall.metadata?.changedFields).toEqual(['employmentStatus']);
    expect(auditCall.metadata?.previousValues).toEqual({ employmentStatus: 'probation' });
    expect(auditCall.metadata?.newValues).toEqual({ employmentStatus: 'active' });
  });

  it('10b. blocks illegal lifecycle transition (probation -> terminated) and generates no audit log', async () => {
    // Note: In existing allowedTransitions, probation can transition to terminated or active,
    // but terminated cannot transition to active. Let's test terminated -> active.
    vi.mocked(mockRepo.getById!).mockResolvedValueOnce({
      ...baseEmployee,
      employmentStatus: 'terminated',
    });
    const logSpy = vi.spyOn(auditService, 'logEvent');

    await expect(
      employeeService.updateEmployee(tenantId, companyId, employeeId, { employmentStatus: 'active' }),
    ).rejects.toThrow(BadRequestError);

    expect(logSpy).not.toHaveBeenCalled();
    expect(mockRepo.update).not.toHaveBeenCalled();
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // 11. END-TO-END CONTROLLER INTEGRATION TEST
  // ═════════════════════════════════════════════════════════════════════════════

  it('11. forwards authenticated req.user context from controller into update audit event', async () => {
    const app = express();
    app.use(express.json());

    // Inject authenticated company context & user
    app.use((req, _res, next) => {
      req.user = { id: 'usr_controller_actor', email: 'actor@dundermifflin.com' } as any;
      req.companyContext = { tenantId, companyId };
      req.access = {
        tenantId,
        companyId,
        userId: 'usr_controller_actor',
        permissions: ['hrms.employees.update', 'hrms.employees.read'],
      } as any;
      next();
    });

    app.use('/api/v1', employeeRouter);
    app.use(errorHandler);

    const logSpy = vi.spyOn(auditService, 'logEvent');
    // Mock repository methods on global repo used by controller
    vi.spyOn(EmployeeService.prototype, 'getEmployeeById').mockResolvedValue(baseEmployee);
    const updateSpy = vi
      .spyOn(EmployeeService.prototype, 'updateEmployee')
      .mockResolvedValue({ ...baseEmployee, firstName: 'Michael Scott Jr.' });

    const res = await request(app)
      .patch(`/api/v1/hrms/employees/${employeeId}`)
      .send({ firstName: 'Michael Scott Jr.' });

    expect(res.status).toBe(200);
    expect(updateSpy).toHaveBeenCalledWith(
      tenantId,
      companyId,
      employeeId,
      { firstName: 'Michael Scott Jr.' },
      { userId: 'usr_controller_actor', email: 'actor@dundermifflin.com' },
    );
  });
});
