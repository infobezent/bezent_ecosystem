import { getDb } from '../../../../db/connection.js';
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

export class OnboardingRepository {
  async listByCompany(tenantId: string, companyId: string): Promise<OnboardingCaseListItem[]> {
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
