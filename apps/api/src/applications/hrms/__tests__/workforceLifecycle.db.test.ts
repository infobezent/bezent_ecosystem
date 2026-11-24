import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { hrmsTestHeaders } from '../../../platform/__tests__/support/testSession.js';
import { eq, inArray } from 'drizzle-orm';
import { createApp } from '../../../app/server/createApp.js';
import { getDb, pingDatabase } from '../../../db/connection.js';
import {
  employeeLeaveBalances,
  employeeClearanceItems,
  employeeActionHistory,
  employeeActions,
  employeeDocuments,
  employees,
} from '../../../db/schema.js';

/**
 * End-to-end Workforce lifecycle against MySQL, entirely through the HTTP API
 * the pages use: create employee -> records -> transfer -> promotion ->
 * confirmation -> resignation -> exit, checking every page's data source.
 */
describe('Workforce lifecycle (end to end)', () => {
  const app = createApp();
  let hrms: ReturnType<typeof request.agent>;
  const run = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const employeeIds: string[] = [];
  let masters: {
    departments: { id: string; name: string }[];
    designations: { id: string; name: string }[];
    locations: { id: string; name: string }[];
  };
  let employee: { id: string; employeeNumber: string };

  beforeAll(async () => {
    hrms = request.agent(app).set(await hrmsTestHeaders());
    if (!(await pingDatabase())) throw new Error('MySQL database is unreachable.');
    masters = (await hrms.get('/api/v1/hrms/organization/masters')).body.data;
  });

  afterAll(async () => {
    const db = getDb();
    if (employeeIds.length === 0) return;
    const actions = await db
      .select({ id: employeeActions.id })
      .from(employeeActions)
      .where(inArray(employeeActions.employeeId, employeeIds));
    const actionIds = actions.map((a) => a.id);
    await db
      .delete(employeeClearanceItems)
      .where(inArray(employeeClearanceItems.employeeId, employeeIds));
    if (actionIds.length > 0) {
      await db
        .delete(employeeActionHistory)
        .where(inArray(employeeActionHistory.actionId, actionIds));
      await db.delete(employeeActions).where(inArray(employeeActions.id, actionIds));
    }
    await db
      .delete(employeeLeaveBalances)
      .where(inArray(employeeLeaveBalances.employeeId, employeeIds));
    await db.delete(employeeDocuments).where(inArray(employeeDocuments.employeeId, employeeIds));
    await db.delete(employees).where(inArray(employees.id, employeeIds));
  });

  async function act(body: Record<string, unknown>) {
    const created = await hrms.post('/api/v1/hrms/employee-actions').send(body);
    expect(created.status, JSON.stringify(created.body)).toBe(201);
    const applied = await hrms
      .post(`/api/v1/hrms/employee-actions/${created.body.data.id}/apply`)
      .send({ version: 1 });
    expect(applied.status, JSON.stringify(applied.body)).toBe(200);
    return applied.body.data;
  }

  async function getEmp() {
    const res = await hrms.get(`/api/v1/hrms/employees/${employee.id}`);
    expect(res.status).toBe(200);
    return res.body.data;
  }

  it('1. creates an employee (probation) and applies the probation policy', async () => {
    const res = await hrms.post('/api/v1/hrms/employees').send({
      firstName: 'Lifecycle',
      lastName: `Flow ${run}`,
      email: `lifecycle.${run}@example.com`,
      joiningDate: '2026-01-05',
      employmentType: 'full_time',
      employmentStatus: 'probation',
      departmentId: masters.departments[0]!.id,
      designationId: masters.designations[0]!.id,
      locationId: masters.locations[0]!.id,
    });
    expect(res.status, JSON.stringify(res.body)).toBe(201);
    employee = res.body.data;
    employeeIds.push(employee.id);
    expect(employee.employeeNumber).toBeTruthy();
    expect(res.body.data.probationEndDate).toBeTruthy(); // defaulted from probation policy
  });

  it('2. appears in the Employees directory and its filters', async () => {
    const list = await hrms.get('/api/v1/hrms/employees').query({ search: run, pageSize: 50 });
    expect(list.status).toBe(200);
    expect(list.body.data.map((e: { id: string }) => e.id)).toContain(employee.id);
    const probation = await hrms
      .get('/api/v1/hrms/employees')
      .query({ employmentStatus: 'probation', search: run });
    expect(probation.body.data.map((e: { id: string }) => e.id)).toContain(employee.id);
  });

  it('3. files documents that appear in Records for that employee only', async () => {
    for (const [category, documentName, documentNumber] of [
      ['personal_identity', 'Aadhaar Card', '1234 5678 9012'],
      ['education', 'Degree Certificate', null],
    ] as const) {
      const res = await hrms
        .post('/api/v1/hrms/employee-documents')
        .send({ employeeId: employee.id, category, documentName, documentNumber });
      expect(res.status, JSON.stringify(res.body)).toBe(201);
      expect(res.body.data.status).toBe('pending');
    }
    const mine = await hrms
      .get('/api/v1/hrms/employee-documents')
      .query({ employeeId: employee.id, pageSize: 100 });
    expect(mine.status).toBe(200);
    expect(mine.body.data).toHaveLength(2);
    expect(mine.body.data[0].employeeNumber).toBe(employee.employeeNumber);
    const bySearch = await hrms
      .get('/api/v1/hrms/employee-documents')
      .query({ search: employee.employeeNumber, pageSize: 100 });
    expect(bySearch.body.data.length).toBeGreaterThanOrEqual(2);
    const pending = await hrms
      .get('/api/v1/hrms/employee-documents')
      .query({ view: 'pending_review' });
    expect(pending.body.counts.pending_review).toBeGreaterThanOrEqual(2);
  });

  it('4. transfer: department + location change update the employee and the Transfers list', async () => {
    const dept = masters.departments[1]!;
    const loc = masters.locations[1]!;
    await act({
      employeeId: employee.id,
      actionType: 'department_change',
      effectiveDate: '2026-02-01',
      reason: 'Team move',
      values: { departmentId: dept.id },
    });
    await act({
      employeeId: employee.id,
      actionType: 'location_transfer',
      effectiveDate: '2026-02-01',
      reason: 'Relocation',
      values: { locationId: loc.id },
    });
    const current = await getEmp();
    expect(current.departmentId).toBe(dept.id);
    expect(current.locationId).toBe(loc.id);

    const transfers = await hrms.get('/api/v1/hrms/employee-actions').query({
      actionTypes: 'location_transfer,department_change,reporting_manager_change',
      employeeId: employee.id,
      pageSize: 50,
    });
    expect(transfers.status).toBe(200);
    expect(transfers.body.data.length).toBeGreaterThanOrEqual(2);
    // Documents keep following the employee: Records shows the NEW department
    const docs = await hrms
      .get('/api/v1/hrms/employee-documents')
      .query({ employeeId: employee.id });
    expect(docs.body.data[0].departmentId).toBe(dept.id);
  });

  it('5. promotion: designation change updates the employee and the Promotions list', async () => {
    const designation = masters.designations[1]!;
    await act({
      employeeId: employee.id,
      actionType: 'designation_change',
      effectiveDate: '2026-03-01',
      reason: 'Promoted',
      values: { designationId: designation.id },
    });
    expect((await getEmp()).designationId).toBe(designation.id);
    const promos = await hrms
      .get('/api/v1/hrms/employee-actions')
      .query({ actionTypes: 'designation_change', employeeId: employee.id });
    expect(
      promos.body.data.some((a: { actionType: string }) => a.actionType === 'designation_change'),
    ).toBe(true);
  });

  it('6. confirmation moves the employee from probation to active', async () => {
    await act({
      employeeId: employee.id,
      actionType: 'confirm_employee',
      effectiveDate: '2026-04-01',
      reason: 'Probation completed',
      values: {},
    });
    expect((await getEmp()).employmentStatus).toBe('active');
  });

  it('7. resignation separates the employee, blocks more actions, keeps records', async () => {
    await act({
      employeeId: employee.id,
      actionType: 'resignation',
      effectiveDate: '2026-06-30',
      reason: 'Personal',
      values: { lastWorkingDate: '2026-06-30', requestDate: '2026-05-01' },
    });
    const current = await getEmp();
    expect(current.employmentStatus).toBe('resigned');
    expect(current.lastWorkingDate).toBe('2026-06-30');

    const blocked = await hrms.post('/api/v1/hrms/employee-actions').send({
      employeeId: employee.id,
      actionType: 'designation_change',
      effectiveDate: '2026-07-01',
      reason: 'x',
      values: { designationId: masters.designations[0]!.id },
    });
    expect(blocked.status).toBe(409);

    const separation = await hrms
      .get('/api/v1/hrms/employee-actions')
      .query({ category: 'separation', employeeId: employee.id });
    expect(separation.body.data.length).toBe(1);
    const docs = await hrms
      .get('/api/v1/hrms/employee-documents')
      .query({ employeeId: employee.id });
    expect(docs.body.data).toHaveLength(2); // records survive offboarding
    const separated = await hrms
      .get('/api/v1/hrms/employees')
      .query({ search: run, employmentStatus: 'resigned' });
    expect(separated.body.data.map((e: { id: string }) => e.id)).toContain(employee.id);
  });

  it('8. offboarding: resignation creates a clearance checklist from Settings that can be cleared', async () => {
    const list = await hrms
      .get('/api/v1/hrms/employee-actions')
      .query({ actionTypes: 'resignation,termination', employeeId: employee.id });
    const action = list.body.data[0];
    expect(action.clearance.total).toBeGreaterThan(0);
    expect(action.clearance.cleared).toBe(0);

    const items = await hrms.get(`/api/v1/hrms/employee-actions/${action.id}/clearance`);
    expect(items.status).toBe(200);
    expect(items.body.data.total).toBe(action.clearance.total);
    const first = items.body.data.items[0];

    const cleared = await hrms
      .patch(`/api/v1/hrms/employee-actions/${action.id}/clearance/${first.id}`)
      .send({ status: 'cleared' });
    expect(cleared.status, JSON.stringify(cleared.body)).toBe(200);
    expect(cleared.body.data.cleared).toBe(1);

    const mandatory = items.body.data.items.find(
      (i: { isMandatory: boolean; id: string }) => i.isMandatory && i.id !== first.id,
    );
    const noReason = await hrms
      .patch(`/api/v1/hrms/employee-actions/${action.id}/clearance/${mandatory.id}`)
      .send({ status: 'waived' });
    expect(noReason.status).toBe(400);

    const relist = await hrms
      .get('/api/v1/hrms/employee-actions')
      .query({ actionTypes: 'resignation', employeeId: employee.id });
    expect(relist.body.data[0].clearance.cleared).toBe(1);
  });

  it('10. a new hire left at pending activation is activated per the Settings activation timing', async () => {
    const res = await hrms.post('/api/v1/hrms/employees').send({
      firstName: 'Activation',
      lastName: `Check ${run}`,
      email: `activation.${run}@example.com`,
      joiningDate: '2026-01-05',
      employmentType: 'full_time',
      employmentStatus: 'pending_activation',
      departmentId: masters.departments[0]!.id,
      designationId: masters.designations[0]!.id,
      locationId: masters.locations[0]!.id,
    });
    expect(res.status, JSON.stringify(res.body)).toBe(201);
    employeeIds.push(res.body.data.id);
    expect(['probation', 'active']).toContain(res.body.data.employmentStatus); // default timing: instant
  });

  it('9. Overview numbers equal the database and move with each action', async () => {
    // the headline total equals the number of rows the directory actually lists
    const total = await hrms.get('/api/v1/hrms/employees').query({ pageSize: 100 });
    expect(total.body.data.length).toBe(Math.min(total.body.pagination.totalItems, 100));

    const pendingBefore = await hrms
      .get('/api/v1/hrms/employee-actions')
      .query({ status: 'pending', pageSize: 1 });
    const countOf = (b: Record<string, any>) => b.pagination.totalItems;
    const before = countOf(pendingBefore.body);

    // a second employee with a pending (not yet applied) transfer
    const other = await hrms.post('/api/v1/hrms/employees').send({
      firstName: 'Overview',
      lastName: `Check ${run}`,
      email: `overview.${run}@example.com`,
      joiningDate: '2026-01-05',
      employmentType: 'full_time',
      employmentStatus: 'active',
      departmentId: masters.departments[0]!.id,
      designationId: masters.designations[0]!.id,
      locationId: masters.locations[0]!.id,
    });
    expect(other.status, JSON.stringify(other.body)).toBe(201);
    employeeIds.push(other.body.data.id);
    const created = await hrms.post('/api/v1/hrms/employee-actions').send({
      employeeId: other.body.data.id,
      actionType: 'department_change',
      effectiveDate: '2026-09-01',
      reason: 'Overview check',
      values: { departmentId: masters.departments[1]!.id },
    });
    expect(created.status, JSON.stringify(created.body)).toBe(201);

    const after = countOf(
      (await hrms.get('/api/v1/hrms/employee-actions').query({ status: 'pending', pageSize: 1 }))
        .body,
    );
    expect(after).toBe(before + 1);
    const pendingTransfers = await hrms.get('/api/v1/hrms/employee-actions').query({
      status: 'pending',
      actionTypes: 'department_change',
      employeeId: other.body.data.id,
    });
    expect(pendingTransfers.body.data).toHaveLength(1);
    const active = await hrms
      .get('/api/v1/hrms/employees')
      .query({ employmentStatus: 'active', search: run });
    expect(active.body.data.map((e: { id: string }) => e.id)).toContain(other.body.data.id);
    expect(active.body.data.map((e: { id: string }) => e.id)).not.toContain(employee.id);
  });

  it('11. previewing the next number does not consume it, and creating with it uses it', async () => {
    const a = await hrms.get('/api/v1/hrms/employees/next-number');
    const b = await hrms.get('/api/v1/hrms/employees/next-number');
    expect(a.status).toBe(200);
    expect(b.body.data.employeeNumber).toBe(a.body.data.employeeNumber);
    const res = await hrms.post('/api/v1/hrms/employees').send({
      firstName: 'Preview',
      lastName: `Number ${run}`,
      email: `preview.${run}@example.com`,
      employeeNumber: a.body.data.employeeNumber,
      joiningDate: '2026-01-05',
      employmentType: 'full_time',
      employmentStatus: 'active',
      departmentId: masters.departments[0]!.id,
      designationId: masters.designations[0]!.id,
      locationId: masters.locations[0]!.id,
    });
    expect(res.status, JSON.stringify(res.body)).toBe(201);
    employeeIds.push(res.body.data.id);
    expect(res.body.data.employeeNumber).toBe(a.body.data.employeeNumber);
    const next = await hrms.get('/api/v1/hrms/employees/next-number');
    expect(next.body.data.employeeNumber).not.toBe(a.body.data.employeeNumber);
  });

  it('12. a pending hire whose joining date has arrived is activated when employees are listed', async () => {
    const res = await hrms.post('/api/v1/hrms/employees').send({
      firstName: 'Sweep',
      lastName: `Check ${run}`,
      email: `sweep.${run}@example.com`,
      joiningDate: '2026-01-05',
      employmentType: 'full_time',
      employmentStatus: 'active',
      departmentId: masters.departments[0]!.id,
      designationId: masters.designations[0]!.id,
      locationId: masters.locations[0]!.id,
    });
    expect(res.status, JSON.stringify(res.body)).toBe(201);
    const id = res.body.data.id as string;
    employeeIds.push(id);
    await getDb()
      .update(employees)
      .set({ employmentStatus: 'pending_activation' })
      .where(eq(employees.id, id));
    // the sweep is throttled per company; wait out any sweep triggered by an earlier list
    await new Promise((r) => setTimeout(r, 0));
    const list = await hrms.get('/api/v1/hrms/employees').query({ search: run, pageSize: 50 });
    const swept = list.body.data.find((e: { id: string }) => e.id === id);
    expect(['probation', 'active']).toContain(swept.employmentStatus);
  });
});
