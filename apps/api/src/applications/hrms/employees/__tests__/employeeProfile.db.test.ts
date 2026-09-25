import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import request from 'supertest';
import { eq, inArray, or } from 'drizzle-orm';
import { createApp } from '../../../../app/server/createApp.js';
import { getDb, pingDatabase } from '../../../../db/connection.js';
import {
  companies,
  employeeActionHistory,
  employeeActions,
  employeeBankAccounts,
  employeeEmergencyContacts,
  employeeFamilyMembers,
  employeeNominees,
  employeePersonalDetails,
  employees,
  employeeSkills,
  employeeWorkSchedules,
} from '../../../../db/schema.js';
import { EmployeeProfileRepository } from '../repository/employeeProfile.repository.js';

/**
 * MySQL-backed tests for the canonical Employee Profile and employee-owned
 * record details (seeded tenant_demo_01 / comp_demo_01 plus an isolation company).
 */
describe('HRMS Employee Profile & record details (MySQL)', () => {
  const app = createApp();
  const tenantId = 'tenant_demo_01';
  const run = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const otherCompanyId = `comp_ep_other_${run}`;
  const otherHeaders = { 'x-tenant-id': tenantId, 'x-company-id': otherCompanyId };
  const createdIds: string[] = [];
  let masters: {
    departments: { id: string; name: string }[];
    designations: { id: string; name: string }[];
    locations: { id: string; name: string }[];
  };
  let sequence = 0;

  function employeeBody(overrides: Record<string, unknown> = {}) {
    sequence += 1;
    const number = `EP-${run}-${sequence}`;
    return {
      employeeNumber: number,
      firstName: 'Profile',
      lastName: `Tester ${sequence}`,
      email: `${number.toLowerCase()}@example.com`,
      phone: '+91 90000 00000',
      joiningDate: '2025-02-03',
      probationEndDate: '2025-08-03',
      departmentId: masters.departments[0]!.id,
      designationId: masters.designations[0]!.id,
      locationId: masters.locations[0]!.id,
      employmentType: 'full_time',
      employmentStatus: 'probation',
      ...overrides,
    };
  }

  async function createEmployee(overrides: Record<string, unknown> = {}, headers = {}) {
    const res = await request(app)
      .post('/api/v1/hrms/employees')
      .set(headers)
      .send(employeeBody(overrides));
    if (res.status === 201) createdIds.push(res.body.data.id);
    return res;
  }

  const fullDetails = () => ({
    personal: {
      middleName: 'K',
      preferredName: 'Pro',
      gender: 'Female',
      dateOfBirth: '1994-05-18',
      maritalStatus: 'Married',
      bloodGroup: 'O+',
      nationality: 'Indian',
      nativeLanguage: 'Tamil',
      fatherName: 'Ramesh',
      personalEmail: 'Profile.Personal@Example.com',
      homePhone: '+91 44 2222 3333',
      addressStreet: '12 Anna Salai',
      addressCity: 'Chennai',
      addressState: 'Tamil Nadu',
      addressPostalCode: '600017',
      addressCountry: 'India',
    },
    familyMembers: [
      {
        name: 'Spouse Name',
        relationship: 'Spouse',
        dateOfBirth: '1995-01-10',
        phone: '+91 91111 11111',
      },
      { name: 'Child Name', relationship: 'Child', dateOfBirth: '2021-06-01' },
    ],
    nominees: [
      { name: 'Spouse Name', relationship: 'Spouse', sharePercentage: 60 },
      { name: 'Child Name', relationship: 'Child', sharePercentage: 40 },
    ],
    emergencyContacts: [
      {
        priority: 'primary',
        name: 'Spouse Name',
        relationship: 'Spouse',
        phone: '+91 91111 11111',
        email: 'spouse@example.com',
        address: '12 Anna Salai, Chennai',
        isPrivate: true,
      },
      { priority: 'secondary', name: 'Brother', relationship: 'Sibling', phone: '+91 92222 22222' },
    ],
    bankAccount: {
      accountHolderName: 'Profile Tester',
      accountNumber: '50100012345678',
      ifscCode: 'hdfc0001234',
      bankName: 'HDFC Bank',
      branchName: 'T. Nagar',
    },
    skills: [
      {
        skillName: 'TypeScript',
        skillType: 'Technical',
        proficiency: 'Advanced',
        level: 'Level 4',
        assessedOn: '2025-11-20',
        yearsOfExperience: 4,
      },
    ],
    workSchedule: {
      workingCalendar: 'India Corporate Calendar',
      workSchedule: 'General Shift',
      workingDays: ['Friday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'],
      startTime: '09:00',
      endTime: '18:00',
      breakMinutes: 15,
      lunchMinutes: 45,
      timeZone: 'Asia/Kolkata',
    },
  });

  const getProfile = (id: string, headers = {}) =>
    request(app).get(`/api/v1/hrms/employees/${id}/profile`).set(headers);

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
        name: 'Employee Profile Isolation Co',
        code: `EP${run}`.slice(0, 50),
        status: 'active',
      });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  afterAll(async () => {
    const db = getDb();
    if (createdIds.length > 0) {
      const actions = await db
        .select({ id: employeeActions.id })
        .from(employeeActions)
        .where(inArray(employeeActions.employeeId, createdIds));
      if (actions.length > 0) {
        const actionIds = actions.map((a) => a.id);
        await db
          .delete(employeeActionHistory)
          .where(inArray(employeeActionHistory.actionId, actionIds));
        await db.delete(employeeActions).where(inArray(employeeActions.id, actionIds));
      }
      for (const table of [
        employeePersonalDetails,
        employeeFamilyMembers,
        employeeNominees,
        employeeEmergencyContacts,
        employeeBankAccounts,
        employeeWorkSchedules,
      ]) {
        await db.delete(table).where(inArray(table.employeeId, createdIds));
      }
      await db
        .delete(employeeSkills)
        .where(
          or(
            inArray(employeeSkills.employeeId, createdIds),
            inArray(employeeSkills.mentorEmployeeId, createdIds),
          ),
        );
      await db
        .update(employees)
        .set({ reportingManagerId: null })
        .where(inArray(employees.id, createdIds));
      await db.delete(employees).where(inArray(employees.id, createdIds));
    }
    await db.delete(employees).where(eq(employees.companyId, otherCompanyId));
    await db.delete(companies).where(eq(companies.id, otherCompanyId));
  });

  // ==========================================================================
  // Creation (Onboarding conversion target) & profile read
  // ==========================================================================

  it('creates an employee with all record details in one request and reads them back', async () => {
    const res = await createEmployee({
      sourceOfHire: 'referral',
      noticePeriodDays: 30,
      details: fullDetails(),
    });
    expect(res.status).toBe(201);
    const id = res.body.data.id;
    expect(res.body.data).toMatchObject({ sourceOfHire: 'referral', noticePeriodDays: 30 });

    const profile = (await getProfile(id)).body.data;
    expect(profile.employee).toMatchObject({
      id,
      departmentName: masters.departments[0]!.name,
      employmentStatus: 'probation',
    });
    expect(profile.personal).toMatchObject({
      middleName: 'K',
      dateOfBirth: '1994-05-18',
      personalEmail: 'profile.personal@example.com',
      addressCity: 'Chennai',
      businessPhone: null,
    });
    expect(profile.familyMembers.map((f: { name: string }) => f.name)).toEqual([
      'Spouse Name',
      'Child Name',
    ]);
    expect(profile.nominees.map((n: { sharePercentage: number }) => n.sharePercentage)).toEqual([
      60, 40,
    ]);
    expect(profile.emergencyContacts.map((c: { priority: string }) => c.priority)).toEqual([
      'primary',
      'secondary',
    ]);
    expect(profile.emergencyContacts[0].isPrivate).toBe(true);
    expect(profile.skills[0]).toMatchObject({ skillName: 'TypeScript', proficiency: 'Advanced' });
    expect(profile.workSchedule).toMatchObject({
      // stored in calendar order
      workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      startTime: '09:00',
      lunchMinutes: 45,
    });
  });

  it('never returns the full bank account number', async () => {
    const res = await createEmployee({ details: { bankAccount: fullDetails().bankAccount } });
    const profileRes = await getProfile(res.body.data.id);
    expect(profileRes.body.data.bankAccount).toMatchObject({
      accountNumberMasked: '••••5678',
      ifscCode: 'HDFC0001234',
    });
    expect(JSON.stringify(profileRes.body)).not.toContain('50100012345678');
  });

  it('returns an empty profile shape when no details exist', async () => {
    const res = await createEmployee();
    const profile = (await getProfile(res.body.data.id)).body.data;
    expect(profile).toMatchObject({
      personal: null,
      familyMembers: [],
      nominees: [],
      emergencyContacts: [],
      bankAccount: null,
      skills: [],
      workSchedule: null,
    });
  });

  it('rejects onboarding tasks, review and other non-record data and creates nothing', async () => {
    const body = employeeBody({
      details: {
        personal: { gender: 'Male' },
        tasks: [{ taskName: 'Laptop & Workspace Setup', status: 'Completed' }],
        review: { confirmed: true },
        onlineAccess: { username: 'someone' },
      },
    });
    const res = await request(app).post('/api/v1/hrms/employees').send(body);
    expect(res.status).toBe(400);
    expect(res.body.error.details['details.tasks']).toContain('not part of the employee record');
    expect(res.body.error.details['details.review']).toBeDefined();
    expect(res.body.error.details['details.onlineAccess']).toBeDefined();

    const persisted = await getDb()
      .select()
      .from(employees)
      .where(eq(employees.employeeNumber, body.employeeNumber as string));
    expect(persisted).toHaveLength(0);
  });

  it('rolls back the employee when a detail write fails inside the create transaction', async () => {
    vi.spyOn(EmployeeProfileRepository.prototype, 'replaceSkills').mockRejectedValue(
      new Error('Simulated detail write failure'),
    );
    const body = employeeBody({ details: fullDetails() });
    const res = await request(app).post('/api/v1/hrms/employees').send(body);
    expect(res.status).toBe(500);

    const db = getDb();
    const persisted = await db
      .select()
      .from(employees)
      .where(eq(employees.employeeNumber, body.employeeNumber as string));
    expect(persisted).toHaveLength(0);
  });

  it('validates organization masters on creation', async () => {
    const res = await createEmployee({ departmentId: 'dept_does_not_exist' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_DEPARTMENT');
  });

  // ==========================================================================
  // Section updates (repeatable records)
  // ==========================================================================

  it('replaces repeatable sections as a whole', async () => {
    const id = (await createEmployee({ details: fullDetails() })).body.data.id;

    const res = await request(app)
      .put(`/api/v1/hrms/employees/${id}/family-members`)
      .send([{ name: 'Only Parent', relationship: 'Parent' }]);
    expect(res.status).toBe(200);
    expect(res.body.data.familyMembers).toHaveLength(1);
    expect(res.body.data.familyMembers[0]).toMatchObject({
      name: 'Only Parent',
      dateOfBirth: null,
    });

    const cleared = await request(app).put(`/api/v1/hrms/employees/${id}/skills`).send([]);
    expect(cleared.body.data.skills).toEqual([]);
    // Other sections untouched
    expect(cleared.body.data.nominees).toHaveLength(2);
  });

  it('upserts one-to-one sections', async () => {
    const id = (await createEmployee()).body.data.id;
    const first = await request(app)
      .put(`/api/v1/hrms/employees/${id}/personal`)
      .send({ gender: 'Male', addressCity: 'Madurai' });
    expect(first.body.data.personal).toMatchObject({ gender: 'Male', addressCity: 'Madurai' });

    const second = await request(app)
      .put(`/api/v1/hrms/employees/${id}/personal`)
      .send({ gender: 'Male', addressCity: 'Coimbatore' });
    expect(second.body.data.personal.addressCity).toBe('Coimbatore');
  });

  it('enforces nominee share and emergency contact rules', async () => {
    const id = (await createEmployee()).body.data.id;

    const overShare = await request(app)
      .put(`/api/v1/hrms/employees/${id}/nominees`)
      .send([
        { name: 'A', relationship: 'Spouse', sharePercentage: 70 },
        { name: 'B', relationship: 'Child', sharePercentage: 40 },
      ]);
    expect(overShare.status).toBe(400);
    expect(overShare.body.error.details.nominees).toContain('100%');

    const twoPrimaries = await request(app)
      .put(`/api/v1/hrms/employees/${id}/emergency-contacts`)
      .send([
        { priority: 'primary', name: 'A', relationship: 'Spouse', phone: '1' },
        { priority: 'primary', name: 'B', relationship: 'Parent', phone: '2' },
      ]);
    expect(twoPrimaries.status).toBe(400);

    const secondaryOnly = await request(app)
      .put(`/api/v1/hrms/employees/${id}/emergency-contacts`)
      .send([{ priority: 'secondary', name: 'B', relationship: 'Parent', phone: '2' }]);
    expect(secondaryOnly.status).toBe(400);
  });

  it('validates skill examiner/verifier/mentor as employees of the same company', async () => {
    const mentor = (await createEmployee()).body.data;
    const employee = (await createEmployee()).body.data;
    const foreign = await createEmployee({}, otherHeaders);
    // Masters belong to comp_demo_01, so the foreign employee is created without them.
    expect(foreign.status).toBe(400);
    const foreignRes = await request(app)
      .post('/api/v1/hrms/employees')
      .set(otherHeaders)
      .send(employeeBody({ departmentId: null, designationId: null, locationId: null }));
    expect(foreignRes.status).toBe(201);

    const skill = { skillName: 'SQL', skillType: 'Technical', proficiency: 'Expert' };

    const ok = await request(app)
      .put(`/api/v1/hrms/employees/${employee.id}/skills`)
      .send([{ ...skill, mentorEmployeeId: mentor.id }]);
    expect(ok.status).toBe(200);
    expect(ok.body.data.skills[0].mentorName).toBe(`${mentor.firstName} ${mentor.lastName}`);

    const crossCompany = await request(app)
      .put(`/api/v1/hrms/employees/${employee.id}/skills`)
      .send([{ ...skill, examinerEmployeeId: foreignRes.body.data.id }]);
    expect(crossCompany.status).toBe(400);
    expect(crossCompany.body.error.code).toBe('INVALID_SKILL_REFERENCE');

    const self = await request(app)
      .put(`/api/v1/hrms/employees/${employee.id}/skills`)
      .send([{ ...skill, verifiedByEmployeeId: employee.id }]);
    expect(self.status).toBe(400);
  });

  // ==========================================================================
  // Isolation, current state and history
  // ==========================================================================

  it('isolates profiles and detail writes by tenant/company', async () => {
    const id = (await createEmployee({ details: fullDetails() })).body.data.id;

    expect((await getProfile(id, otherHeaders)).status).toBe(404);
    const write = await request(app)
      .put(`/api/v1/hrms/employees/${id}/personal`)
      .set(otherHeaders)
      .send({ gender: 'Other' });
    expect(write.status).toBe(404);

    const profile = (await getProfile(id)).body.data;
    expect(profile.personal.gender).toBe('Female');
  });

  it('shows Employee Administration changes as the current profile state', async () => {
    const id = (await createEmployee()).body.data.id;
    const target = masters.departments[1]!;

    const action = await request(app)
      .post('/api/v1/hrms/employee-actions')
      .send({
        employeeId: id,
        actionType: 'department_change',
        effectiveDate: '2025-06-01',
        reason: 'Reorganisation',
        values: { departmentId: target.id },
      });
    expect(action.status).toBe(201);
    await request(app)
      .post(`/api/v1/hrms/employee-actions/${action.body.data.id}/apply`)
      .send({ version: 1 })
      .expect(200);

    const profile = (await getProfile(id)).body.data;
    expect(profile.employee.departmentId).toBe(target.id);
    expect(profile.employee.departmentName).toBe(target.name);

    // History comes from the persisted Employee Administration actions
    const history = await request(app)
      .get('/api/v1/hrms/employee-actions')
      .query({ employeeId: id });
    expect(history.body.data[0]).toMatchObject({
      actionType: 'department_change',
      status: 'applied',
      changes: [
        { field: 'departmentId', fromLabel: masters.departments[0]!.name, toLabel: target.name },
      ],
    });
  });

  it('returns 404 for unknown employees and unknown sections', async () => {
    expect((await getProfile('emp_does_not_exist')).status).toBe(404);
    const id = (await createEmployee()).body.data.id;
    expect((await request(app).put(`/api/v1/hrms/employees/${id}/tasks`).send([])).status).toBe(
      404,
    );
    expect((await request(app).put(`/api/v1/hrms/employees/${id}/review`).send({})).status).toBe(
      404,
    );
  });
});
