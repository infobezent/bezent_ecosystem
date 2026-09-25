import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import request from 'supertest';
import { eq, inArray } from 'drizzle-orm';
import { createApp } from '../../../../app/server/createApp.js';
import { getDb, pingDatabase } from '../../../../db/connection.js';
import {
  companies,
  departments,
  employeeActionHistory,
  employeeActions,
  employees,
} from '../../../../db/schema.js';
import { EmployeeRepository } from '../../employees/repository/employee.repository.js';
import { EmployeeActionRepository } from '../repository/employeeAction.repository.js';
import type { CreateEmployeeDto } from '../../employees/types/employee.types.js';

/**
 * MySQL-backed integration tests for Employee Administration. They run
 * against the seeded development company (tenant_demo_01 / comp_demo_01)
 * plus a second company created here to prove cross-company isolation.
 */
describe('HRMS Employee Administration API (MySQL)', () => {
  const app = createApp();
  const employeeRepo = new EmployeeRepository();

  const tenantId = 'tenant_demo_01';
  const companyId = 'comp_demo_01';
  const run = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const otherCompanyId = `comp_ea_other_${run}`;
  const otherDepartmentId = `dept_ea_other_${run}`;
  const otherCompanyHeaders = { 'x-tenant-id': tenantId, 'x-company-id': otherCompanyId };

  const createdEmployeeIds: string[] = [];
  let masters: {
    departments: { id: string; name: string }[];
    designations: { id: string; name: string }[];
    locations: { id: string; name: string }[];
  };
  let sequence = 0;

  async function createEmployee(
    overrides: Partial<CreateEmployeeDto> = {},
    targetCompanyId = companyId,
  ) {
    sequence += 1;
    const number = `EA-${run}-${sequence}`;
    const created = await employeeRepo.create(tenantId, targetCompanyId, {
      employeeNumber: number,
      firstName: 'Admin',
      lastName: `Tester ${sequence}`,
      email: `${number.toLowerCase()}@example.com`,
      joiningDate: '2025-01-06',
      probationEndDate: '2025-07-06',
      departmentId: targetCompanyId === companyId ? masters.departments[0]!.id : null,
      designationId: targetCompanyId === companyId ? masters.designations[0]!.id : null,
      locationId: targetCompanyId === companyId ? masters.locations[0]!.id : null,
      employmentType: 'full_time',
      employmentStatus: 'active',
      ...overrides,
    });
    createdEmployeeIds.push(created.id);
    return created;
  }

  async function createAction(body: Record<string, unknown>, headers: Record<string, string> = {}) {
    return request(app).post('/api/v1/hrms/employee-actions').set(headers).send(body);
  }

  async function getEmployee(id: string) {
    return (await employeeRepo.getById(tenantId, companyId, id))!;
  }

  beforeAll(async () => {
    const connected = await pingDatabase();
    if (!connected) {
      throw new Error(
        'MySQL database is unreachable. Start MySQL to run MySQL-backed integration tests.',
      );
    }

    const mastersRes = await request(app).get('/api/v1/hrms/organization/masters');
    masters = mastersRes.body.data;
    expect(masters.departments.length).toBeGreaterThanOrEqual(2);
    expect(masters.designations.length).toBeGreaterThanOrEqual(2);
    expect(masters.locations.length).toBeGreaterThanOrEqual(2);

    const db = getDb();
    await db.insert(companies).values({
      id: otherCompanyId,
      tenantId,
      name: 'Employee Admin Isolation Co',
      code: `EA${run}`.slice(0, 50),
      status: 'active',
    });
    await db.insert(departments).values({
      id: otherDepartmentId,
      tenantId,
      companyId: otherCompanyId,
      name: 'Other Company Department',
      code: 'OTHER',
      status: 'active',
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  afterAll(async () => {
    const db = getDb();
    if (createdEmployeeIds.length > 0) {
      const actionRows = await db
        .select({ id: employeeActions.id })
        .from(employeeActions)
        .where(inArray(employeeActions.employeeId, createdEmployeeIds));
      const actionIds = actionRows.map((row) => row.id);
      if (actionIds.length > 0) {
        await db
          .delete(employeeActionHistory)
          .where(inArray(employeeActionHistory.actionId, actionIds));
        await db.delete(employeeActions).where(inArray(employeeActions.id, actionIds));
      }
      await db
        .update(employees)
        .set({ reportingManagerId: null })
        .where(inArray(employees.id, createdEmployeeIds));
      await db.delete(employees).where(inArray(employees.id, createdEmployeeIds));
    }
    await db.delete(departments).where(eq(departments.id, otherDepartmentId));
    await db.delete(companies).where(eq(companies.id, otherCompanyId));
  });

  // ==========================================================================
  // Creation & validation
  // ==========================================================================

  it('creates a pending department change with old/new values and a created history entry', async () => {
    const employee = await createEmployee();
    const target = masters.departments[1]!;

    const res = await createAction({
      employeeId: employee.id,
      actionType: 'department_change',
      effectiveDate: '2026-02-01',
      reason: 'Moving to a new team',
      values: { departmentId: target.id },
    });

    expect(res.status).toBe(201);
    const action = res.body.data;
    expect(action.status).toBe('pending');
    expect(action.category).toBe('job_changes');
    expect(action.version).toBe(1);
    expect(action.employeeNumber).toBe(employee.employeeNumber);
    expect(action.changes).toEqual([
      {
        field: 'departmentId',
        from: masters.departments[0]!.id,
        fromLabel: masters.departments[0]!.name,
        to: target.id,
        toLabel: target.name,
      },
    ]);
    expect(action.history.map((h: { event: string }) => h.event)).toEqual(['created']);

    // Creating an action never touches the canonical employee record.
    const unchanged = await getEmployee(employee.id);
    expect(unchanged.departmentId).toBe(masters.departments[0]!.id);
  });

  it('rejects an unknown employee', async () => {
    const res = await createAction({
      employeeId: 'emp_does_not_exist',
      actionType: 'designation_change',
      effectiveDate: '2026-02-01',
      reason: 'x',
      values: { designationId: masters.designations[1]!.id },
    });
    expect(res.status).toBe(404);
  });

  it('rejects an employee that belongs to another company', async () => {
    const foreign = await createEmployee({}, otherCompanyId);

    const res = await createAction({
      employeeId: foreign.id,
      actionType: 'employment_type_change',
      effectiveDate: '2026-02-01',
      reason: 'Cross-company attempt',
      values: { employmentType: 'contract' },
    });
    expect(res.status).toBe(404);
  });

  it('rejects organization masters that do not belong to the company', async () => {
    const employee = await createEmployee();

    const foreignDept = await createAction({
      employeeId: employee.id,
      actionType: 'department_change',
      effectiveDate: '2026-02-01',
      reason: 'x',
      values: { departmentId: otherDepartmentId },
    });
    expect(foreignDept.status).toBe(400);
    expect(foreignDept.body.error.code).toBe('INVALID_DEPARTMENT');

    const unknownLocation = await createAction({
      employeeId: employee.id,
      actionType: 'location_transfer',
      effectiveDate: '2026-02-01',
      reason: 'x',
      values: { locationId: 'loc_missing' },
    });
    expect(unknownLocation.status).toBe(400);
    expect(unknownLocation.body.error.code).toBe('INVALID_LOCATION');
  });

  it('rejects no-op changes, missing reasons, and inapplicable values', async () => {
    const employee = await createEmployee();

    const noop = await createAction({
      employeeId: employee.id,
      actionType: 'designation_change',
      effectiveDate: '2026-02-01',
      reason: 'x',
      values: { designationId: masters.designations[0]!.id },
    });
    expect(noop.status).toBe(400);
    expect(noop.body.error.code).toBe('NO_CHANGE');

    const noReason = await createAction({
      employeeId: employee.id,
      actionType: 'designation_change',
      effectiveDate: '2026-02-01',
      values: { designationId: masters.designations[1]!.id },
    });
    expect(noReason.status).toBe(400);
    expect(noReason.body.error.details.reason).toBeDefined();

    const smuggled = await createAction({
      employeeId: employee.id,
      actionType: 'designation_change',
      effectiveDate: '2026-02-01',
      reason: 'x',
      values: { designationId: masters.designations[1]!.id, employmentStatus: 'suspended' },
    });
    expect(smuggled.status).toBe(400);
  });

  it('blocks a second pending action that changes the same employee field', async () => {
    const employee = await createEmployee();
    const body = {
      employeeId: employee.id,
      actionType: 'location_transfer',
      effectiveDate: '2026-02-01',
      reason: 'Transfer',
      values: { locationId: masters.locations[1]!.id },
    };

    expect((await createAction(body)).status).toBe(201);
    const duplicate = await createAction(body);
    expect(duplicate.status).toBe(409);
    expect(duplicate.body.error.code).toBe('PENDING_ACTION_EXISTS');
  });

  // ==========================================================================
  // Tenant / company isolation
  // ==========================================================================

  it('does not expose actions to another company', async () => {
    const employee = await createEmployee();
    const created = await createAction({
      employeeId: employee.id,
      actionType: 'employment_type_change',
      effectiveDate: '2026-02-01',
      reason: 'Contract conversion',
      values: { employmentType: 'contract' },
    });
    const actionId = created.body.data.id;

    const detail = await request(app)
      .get(`/api/v1/hrms/employee-actions/${actionId}`)
      .set(otherCompanyHeaders);
    expect(detail.status).toBe(404);

    const apply = await request(app)
      .post(`/api/v1/hrms/employee-actions/${actionId}/apply`)
      .set(otherCompanyHeaders)
      .send({ version: 1 });
    expect(apply.status).toBe(404);

    const list = await request(app).get('/api/v1/hrms/employee-actions').set(otherCompanyHeaders);
    expect(list.status).toBe(200);
    expect(list.body.data.map((a: { id: string }) => a.id)).not.toContain(actionId);

    const ownList = await request(app)
      .get('/api/v1/hrms/employee-actions')
      .query({ employeeId: employee.id });
    expect(ownList.body.data.map((a: { id: string }) => a.id)).toContain(actionId);
  });

  it('does not expose employees to another company', async () => {
    const employee = await createEmployee();
    const res = await request(app)
      .get(`/api/v1/hrms/employees/${employee.id}`)
      .set(otherCompanyHeaders);
    expect(res.status).toBe(404);

    const own = await request(app).get(`/api/v1/hrms/employees/${employee.id}`);
    expect(own.status).toBe(200);
    expect(own.body.data.employeeNumber).toBe(employee.employeeNumber);
  });

  // ==========================================================================
  // Applying changes
  // ==========================================================================

  it('applies department (with designation and manager), designation, and location changes', async () => {
    const manager = await createEmployee();
    const employee = await createEmployee();

    const dept = await createAction({
      employeeId: employee.id,
      actionType: 'department_change',
      effectiveDate: '2026-02-01',
      reason: 'Reorg',
      values: {
        departmentId: masters.departments[1]!.id,
        designationId: masters.designations[1]!.id,
        reportingManagerId: manager.id,
      },
    });
    expect(dept.status).toBe(201);
    expect(dept.body.data.changes.map((c: { field: string }) => c.field)).toEqual([
      'departmentId',
      'designationId',
      'reportingManagerId',
    ]);

    const applied = await request(app)
      .post(`/api/v1/hrms/employee-actions/${dept.body.data.id}/apply`)
      .send({ version: 1 });
    expect(applied.status).toBe(200);
    expect(applied.body.data.status).toBe('applied');
    expect(applied.body.data.appliedAt).toBeTruthy();

    let current = await getEmployee(employee.id);
    expect(current.departmentId).toBe(masters.departments[1]!.id);
    expect(current.designationId).toBe(masters.designations[1]!.id);
    expect(current.reportingManagerId).toBe(manager.id);

    const desig = await createAction({
      employeeId: employee.id,
      actionType: 'designation_change',
      effectiveDate: '2026-03-01',
      reason: 'Promotion',
      values: { designationId: masters.designations[0]!.id },
    });
    await request(app)
      .post(`/api/v1/hrms/employee-actions/${desig.body.data.id}/apply`)
      .send({ version: 1 })
      .expect(200);

    const loc = await createAction({
      employeeId: employee.id,
      actionType: 'location_transfer',
      effectiveDate: '2026-03-15',
      reason: 'Relocation',
      values: { locationId: masters.locations[1]!.id },
    });
    await request(app)
      .post(`/api/v1/hrms/employee-actions/${loc.body.data.id}/apply`)
      .send({ version: 1 })
      .expect(200);

    current = await getEmployee(employee.id);
    expect(current.designationId).toBe(masters.designations[0]!.id);
    expect(current.locationId).toBe(masters.locations[1]!.id);
  });

  it('rejects a reporting manager that would create a cycle', async () => {
    const manager = await createEmployee();
    const report = await createEmployee({ reportingManagerId: manager.id });

    const res = await createAction({
      employeeId: manager.id,
      actionType: 'reporting_manager_change',
      effectiveDate: '2026-02-01',
      reason: 'Cycle',
      values: { reportingManagerId: report.id },
    });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_REPORTING_MANAGER');
  });

  it('confirms an employee on probation', async () => {
    const employee = await createEmployee({ employmentStatus: 'probation' });

    const res = await createAction({
      employeeId: employee.id,
      actionType: 'confirm_employee',
      effectiveDate: '2025-07-06',
      reason: 'Probation completed successfully',
      values: {},
    });
    expect(res.status).toBe(201);

    await request(app)
      .post(`/api/v1/hrms/employee-actions/${res.body.data.id}/apply`)
      .send({ version: 1 })
      .expect(200);

    const current = await getEmployee(employee.id);
    expect(current.employmentStatus).toBe('active');
    expect(current.confirmationDate).toBe('2025-07-06');

    // Confirmed employees are no longer on probation.
    const again = await createAction({
      employeeId: employee.id,
      actionType: 'confirm_employee',
      effectiveDate: '2025-08-01',
      reason: 'x',
      values: {},
    });
    expect(again.status).toBe(409);
    expect(again.body.error.code).toBe('EMPLOYEE_NOT_ON_PROBATION');
  });

  it('extends probation and rejects an earlier end date', async () => {
    const employee = await createEmployee({ employmentStatus: 'probation' });

    const earlier = await createAction({
      employeeId: employee.id,
      actionType: 'extend_probation',
      effectiveDate: '2025-07-01',
      reason: 'x',
      values: { probationEndDate: '2025-07-01' },
    });
    expect(earlier.status).toBe(400);
    expect(earlier.body.error.code).toBe('INVALID_PROBATION_DATE');

    const res = await createAction({
      employeeId: employee.id,
      actionType: 'extend_probation',
      effectiveDate: '2025-07-01',
      reason: 'Needs more time on core skills',
      values: { probationEndDate: '2025-10-06' },
    });
    expect(res.status).toBe(201);
    expect(res.body.data.changes[0]).toMatchObject({
      field: 'probationEndDate',
      from: '2025-07-06',
      to: '2025-10-06',
    });

    await request(app)
      .post(`/api/v1/hrms/employee-actions/${res.body.data.id}/apply`)
      .send({ version: 1 })
      .expect(200);

    const current = await getEmployee(employee.id);
    expect(current.probationEndDate).toBe('2025-10-06');
    expect(current.employmentStatus).toBe('probation');
  });

  it('changes employment status and requires confirmation to end probation', async () => {
    const active = await createEmployee();
    const res = await createAction({
      employeeId: active.id,
      actionType: 'employment_status_change',
      effectiveDate: '2026-02-01',
      reason: 'Disciplinary suspension',
      values: { employmentStatus: 'suspended' },
    });
    expect(res.status).toBe(201);
    await request(app)
      .post(`/api/v1/hrms/employee-actions/${res.body.data.id}/apply`)
      .send({ version: 1 })
      .expect(200);
    expect((await getEmployee(active.id)).employmentStatus).toBe('suspended');

    const onProbation = await createEmployee({ employmentStatus: 'probation' });
    const shortcut = await createAction({
      employeeId: onProbation.id,
      actionType: 'employment_status_change',
      effectiveDate: '2026-02-01',
      reason: 'x',
      values: { employmentStatus: 'active' },
    });
    expect(shortcut.status).toBe(400);
    expect(shortcut.body.error.code).toBe('USE_CONFIRMATION');
  });

  it('applies a resignation and blocks further actions on the separated employee', async () => {
    const employee = await createEmployee();

    const res = await createAction({
      employeeId: employee.id,
      actionType: 'resignation',
      reason: 'Pursuing higher studies',
      values: { requestDate: '2026-01-02', lastWorkingDate: '2026-01-31' },
    });
    expect(res.status).toBe(201);
    expect(res.body.data.effectiveDate).toBe('2026-01-31');
    expect(res.body.data.requestDate).toBe('2026-01-02');
    expect(res.body.data.category).toBe('separation');

    await request(app)
      .post(`/api/v1/hrms/employee-actions/${res.body.data.id}/apply`)
      .send({ version: 1 })
      .expect(200);

    const current = await getEmployee(employee.id);
    expect(current.employmentStatus).toBe('resigned');
    expect(current.lastWorkingDate).toBe('2026-01-31');

    const after = await createAction({
      employeeId: employee.id,
      actionType: 'location_transfer',
      effectiveDate: '2026-02-01',
      reason: 'x',
      values: { locationId: masters.locations[1]!.id },
    });
    expect(after.status).toBe(409);
    expect(after.body.error.code).toBe('EMPLOYEE_SEPARATED');
  });

  it('applies a termination', async () => {
    const employee = await createEmployee();
    const res = await createAction({
      employeeId: employee.id,
      actionType: 'termination',
      effectiveDate: '2026-02-01',
      reason: 'Policy violation',
      values: { lastWorkingDate: '2026-01-31' },
    });
    expect(res.status).toBe(201);
    await request(app)
      .post(`/api/v1/hrms/employee-actions/${res.body.data.id}/apply`)
      .send({ version: 1 })
      .expect(200);

    const current = await getEmployee(employee.id);
    expect(current.employmentStatus).toBe('terminated');
    expect(current.lastWorkingDate).toBe('2026-01-31');
  });

  // ==========================================================================
  // Lifecycle, history, stale and transactional behaviour
  // ==========================================================================

  it('preserves history across update, apply, and blocks transitions out of applied', async () => {
    const employee = await createEmployee();
    const created = await createAction({
      employeeId: employee.id,
      actionType: 'employment_type_change',
      effectiveDate: '2026-02-01',
      reason: 'Initial reason',
      values: { employmentType: 'part_time' },
    });
    const actionId = created.body.data.id;

    const updated = await request(app)
      .patch(`/api/v1/hrms/employee-actions/${actionId}`)
      .send({ version: 1, reason: 'Revised reason', values: { employmentType: 'contract' } });
    expect(updated.status).toBe(200);
    expect(updated.body.data.version).toBe(2);
    expect(updated.body.data.reason).toBe('Revised reason');
    expect(updated.body.data.changes[0].to).toBe('contract');

    await request(app)
      .post(`/api/v1/hrms/employee-actions/${actionId}/apply`)
      .send({ version: 2 })
      .expect(200);

    const detail = await request(app).get(`/api/v1/hrms/employee-actions/${actionId}`);
    expect(detail.body.data.status).toBe('applied');
    expect(detail.body.data.changes[0]).toMatchObject({ from: 'full_time', to: 'contract' });
    expect(detail.body.data.history.map((h: { event: string }) => h.event)).toEqual([
      'created',
      'updated',
      'applied',
    ]);

    const cancelApplied = await request(app)
      .post(`/api/v1/hrms/employee-actions/${actionId}/cancel`)
      .send({ version: 3 });
    expect(cancelApplied.status).toBe(409);
    expect(cancelApplied.body.error.code).toBe('INVALID_ACTION_TRANSITION');
  });

  it('cancels a pending action without touching the employee', async () => {
    const employee = await createEmployee();
    const created = await createAction({
      employeeId: employee.id,
      actionType: 'location_transfer',
      effectiveDate: '2026-02-01',
      reason: 'Transfer',
      values: { locationId: masters.locations[1]!.id },
    });

    const cancelled = await request(app)
      .post(`/api/v1/hrms/employee-actions/${created.body.data.id}/cancel`)
      .send({ version: 1, reason: 'Requested in error' });
    expect(cancelled.status).toBe(200);
    expect(cancelled.body.data.status).toBe('cancelled');
    expect(cancelled.body.data.cancellationReason).toBe('Requested in error');
    expect(cancelled.body.data.history.map((h: { event: string }) => h.event)).toEqual([
      'created',
      'cancelled',
    ]);

    expect((await getEmployee(employee.id)).locationId).toBe(masters.locations[0]!.id);
  });

  it('rejects stale versions, future-dated application, and stale employee data', async () => {
    const employee = await createEmployee();

    const future = await createAction({
      employeeId: employee.id,
      actionType: 'employment_type_change',
      effectiveDate: '2099-01-01',
      reason: 'Future change',
      values: { employmentType: 'intern' },
    });
    const early = await request(app)
      .post(`/api/v1/hrms/employee-actions/${future.body.data.id}/apply`)
      .send({ version: 1 });
    expect(early.status).toBe(409);
    expect(early.body.error.code).toBe('NOT_YET_EFFECTIVE');

    const wrongVersion = await request(app)
      .post(`/api/v1/hrms/employee-actions/${future.body.data.id}/apply`)
      .send({ version: 7 });
    expect(wrongVersion.status).toBe(409);
    expect(wrongVersion.body.error.code).toBe('STALE_VERSION');

    const dept = await createAction({
      employeeId: employee.id,
      actionType: 'department_change',
      effectiveDate: '2026-02-01',
      reason: 'Reorg',
      values: { departmentId: masters.departments[1]!.id },
    });
    // The canonical record changes underneath the pending action.
    await employeeRepo.update(tenantId, companyId, employee.id, {
      departmentId: masters.departments[2]?.id ?? masters.departments[1]!.id,
    });

    const stale = await request(app)
      .post(`/api/v1/hrms/employee-actions/${dept.body.data.id}/apply`)
      .send({ version: 1 });
    expect(stale.status).toBe(409);
    expect(stale.body.error.code).toBe('STALE_ACTION');
  });

  it('rolls back the employee update when a later write in the apply transaction fails', async () => {
    const employee = await createEmployee();
    const created = await createAction({
      employeeId: employee.id,
      actionType: 'location_transfer',
      effectiveDate: '2026-02-01',
      reason: 'Transfer',
      values: { locationId: masters.locations[1]!.id },
    });
    const actionId = created.body.data.id;

    const original = EmployeeActionRepository.prototype.insertHistory;
    vi.spyOn(EmployeeActionRepository.prototype, 'insertHistory').mockImplementation(
      async function (this: EmployeeActionRepository, executor, record) {
        if (record.event === 'applied') {
          throw new Error('Simulated history write failure');
        }
        return original.call(this, executor, record);
      },
    );

    const res = await request(app)
      .post(`/api/v1/hrms/employee-actions/${actionId}/apply`)
      .send({ version: 1 });
    expect(res.status).toBe(500);

    vi.restoreAllMocks();

    expect((await getEmployee(employee.id)).locationId).toBe(masters.locations[0]!.id);
    const detail = await request(app).get(`/api/v1/hrms/employee-actions/${actionId}`);
    expect(detail.body.data.status).toBe('pending');
    expect(detail.body.data.version).toBe(1);
    expect(detail.body.data.history.map((h: { event: string }) => h.event)).toEqual(['created']);
  });

  // ==========================================================================
  // Listing
  // ==========================================================================

  it('filters the action queue by category and reports per-category counts', async () => {
    const employee = await createEmployee();
    await createAction({
      employeeId: employee.id,
      actionType: 'employment_type_change',
      effectiveDate: '2026-02-01',
      reason: 'Type change',
      values: { employmentType: 'contract' },
    });
    await createAction({
      employeeId: employee.id,
      actionType: 'termination',
      reason: 'Termination',
      values: { lastWorkingDate: '2026-03-31' },
    });

    const res = await request(app)
      .get('/api/v1/hrms/employee-actions')
      .query({ category: 'separation', employeeId: employee.id });
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].actionType).toBe('termination');
    expect(res.body.counts).toMatchObject({ all: 2, job_changes: 1, separation: 1, probation: 0 });
    expect(res.body.pagination).toMatchObject({ page: 1, totalItems: 1 });
  });

  it('lists probation employees with confirmation due date and reporting manager', async () => {
    const manager = await createEmployee();
    const employee = await createEmployee({
      employmentStatus: 'probation',
      reportingManagerId: manager.id,
    });

    const res = await request(app)
      .get('/api/v1/hrms/employees')
      .query({ employmentStatus: 'probation', search: employee.employeeNumber });
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0]).toMatchObject({
      id: employee.id,
      probationEndDate: '2025-07-06',
      reportingManagerId: manager.id,
      reportingManagerName: manager.lastName
        ? `${manager.firstName} ${manager.lastName}`
        : manager.firstName,
    });
  });
});
