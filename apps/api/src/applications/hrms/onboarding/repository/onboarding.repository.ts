import { getDb, isDatabaseConfigured } from '../../../../db/connection.js';
import {
  onboardingCases,
  departments,
  designations,
  locations,
  type NewOnboardingCase,
  type OnboardingCase,
} from '../../../../db/schema.js';
import { eq, and, desc } from 'drizzle-orm';
import type { OnboardingCaseListItem } from '../types/onboarding.types.js';

const INITIAL_FALLBACK_CASES: OnboardingCaseListItem[] = [
  {
    id: 'case_arun_01',
    tenantId: 'tenant_demo_01',
    companyId: 'comp_demo_01',
    firstName: 'Arun',
    lastName: 'Kumar',
    fullName: 'Arun Kumar',
    email: 'arun.kumar@example.com',
    phone: '+91 98765 43210',
    joiningDate: '2026-10-01',
    employmentType: 'full_time',
    stage: 'preboarding',
    status: 'active',
    departmentId: 'dept_eng_01',
    departmentName: 'Engineering',
    designationId: 'desig_se_01',
    designationName: 'Software Engineer',
    locationId: 'loc_chn_01',
    locationName: 'Chennai (HQ)',
    createdAt: new Date('2026-09-01'),
  },
  {
    id: 'case_priya_02',
    tenantId: 'tenant_demo_01',
    companyId: 'comp_demo_01',
    firstName: 'Priya',
    lastName: 'S',
    fullName: 'Priya S',
    email: 'priya.s@example.com',
    phone: '+91 98765 43211',
    joiningDate: '2026-10-15',
    employmentType: 'full_time',
    stage: 'documents',
    status: 'active',
    departmentId: 'dept_hr_01',
    departmentName: 'Human Resources',
    designationId: 'desig_hr_01',
    designationName: 'Senior HR Specialist',
    locationId: 'loc_chn_01',
    locationName: 'Chennai (HQ)',
    createdAt: new Date('2026-09-02'),
  },
];

const inMemoryCases: OnboardingCaseListItem[] = [...INITIAL_FALLBACK_CASES];

export class OnboardingRepository {
  async listByCompany(tenantId: string, companyId: string): Promise<OnboardingCaseListItem[]> {
    if (!isDatabaseConfigured) {
      return inMemoryCases.filter((c) => c.tenantId === tenantId && c.companyId === companyId);
    }

    const db = getDb();

    const rows = await db
      .select({
        id: onboardingCases.id,
        tenantId: onboardingCases.tenantId,
        companyId: onboardingCases.companyId,
        firstName: onboardingCases.firstName,
        lastName: onboardingCases.lastName,
        email: onboardingCases.email,
        phone: onboardingCases.phone,
        joiningDate: onboardingCases.joiningDate,
        employmentType: onboardingCases.employmentType,
        stage: onboardingCases.stage,
        status: onboardingCases.status,
        departmentId: onboardingCases.departmentId,
        departmentName: departments.name,
        designationId: onboardingCases.designationId,
        designationName: designations.name,
        locationId: onboardingCases.locationId,
        locationName: locations.name,
        createdAt: onboardingCases.createdAt,
      })
      .from(onboardingCases)
      .innerJoin(departments, eq(onboardingCases.departmentId, departments.id))
      .innerJoin(designations, eq(onboardingCases.designationId, designations.id))
      .leftJoin(locations, eq(onboardingCases.locationId, locations.id))
      .where(and(eq(onboardingCases.tenantId, tenantId), eq(onboardingCases.companyId, companyId)))
      .orderBy(desc(onboardingCases.createdAt));

    return rows.map((r) => ({
      ...r,
      fullName: r.lastName ? `${r.firstName} ${r.lastName}` : r.firstName,
    }));
  }

  async getById(
    tenantId: string,
    companyId: string,
    id: string,
  ): Promise<OnboardingCaseListItem | null> {
    if (!isDatabaseConfigured) {
      const match = inMemoryCases.find(
        (c) => c.tenantId === tenantId && c.companyId === companyId && c.id === id,
      );
      return match ?? null;
    }

    const db = getDb();

    const rows = await db
      .select({
        id: onboardingCases.id,
        tenantId: onboardingCases.tenantId,
        companyId: onboardingCases.companyId,
        firstName: onboardingCases.firstName,
        lastName: onboardingCases.lastName,
        email: onboardingCases.email,
        phone: onboardingCases.phone,
        joiningDate: onboardingCases.joiningDate,
        employmentType: onboardingCases.employmentType,
        stage: onboardingCases.stage,
        status: onboardingCases.status,
        departmentId: onboardingCases.departmentId,
        departmentName: departments.name,
        designationId: onboardingCases.designationId,
        designationName: designations.name,
        locationId: onboardingCases.locationId,
        locationName: locations.name,
        createdAt: onboardingCases.createdAt,
      })
      .from(onboardingCases)
      .innerJoin(departments, eq(onboardingCases.departmentId, departments.id))
      .innerJoin(designations, eq(onboardingCases.designationId, designations.id))
      .leftJoin(locations, eq(onboardingCases.locationId, locations.id))
      .where(
        and(
          eq(onboardingCases.tenantId, tenantId),
          eq(onboardingCases.companyId, companyId),
          eq(onboardingCases.id, id),
        ),
      );

    const r = rows[0];
    if (!r) return null;

    return {
      ...r,
      fullName: r.lastName ? `${r.firstName} ${r.lastName}` : r.firstName,
    };
  }

  async create(data: NewOnboardingCase): Promise<OnboardingCase> {
    if (!isDatabaseConfigured) {
      const item: OnboardingCaseListItem = {
        id: data.id,
        tenantId: data.tenantId,
        companyId: data.companyId,
        firstName: data.firstName,
        lastName: data.lastName ?? null,
        fullName: data.lastName ? `${data.firstName} ${data.lastName}` : data.firstName,
        email: data.email,
        phone: data.phone ?? null,
        joiningDate: data.joiningDate,
        employmentType: data.employmentType ?? 'full_time',
        stage: data.stage ?? 'preboarding',
        status: data.status ?? 'active',
        departmentId: data.departmentId,
        departmentName: 'Engineering',
        designationId: data.designationId,
        designationName: 'Software Engineer',
        locationId: data.locationId ?? null,
        locationName: data.locationId ? 'Chennai (HQ)' : null,
        createdAt: new Date(),
      };
      inMemoryCases.unshift(item);
      return {
        id: data.id,
        tenantId: data.tenantId,
        companyId: data.companyId,
        departmentId: data.departmentId,
        designationId: data.designationId,
        firstName: data.firstName,
        lastName: data.lastName ?? null,
        email: data.email,
        phone: data.phone ?? null,
        joiningDate: data.joiningDate,
        employmentType: data.employmentType ?? 'full_time',
        stage: data.stage ?? 'preboarding',
        status: data.status ?? 'active',
        locationId: data.locationId ?? null,
        createdAt: item.createdAt,
        updatedAt: item.createdAt,
      };
    }

    const db = getDb();
    await db.insert(onboardingCases).values(data);

    const created = await db
      .select()
      .from(onboardingCases)
      .where(
        and(
          eq(onboardingCases.tenantId, data.tenantId),
          eq(onboardingCases.companyId, data.companyId),
          eq(onboardingCases.id, data.id),
        ),
      );

    return created[0]!;
  }
}
