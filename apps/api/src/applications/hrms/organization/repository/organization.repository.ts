import { getDb } from '../../../../db/connection.js';
import { companies, departments, designations, locations } from '../../../../db/schema.js';
import { eq, and } from 'drizzle-orm';

export class OrganizationRepository {
  async getMasters(tenantId: string, companyId: string) {
    const db = getDb();

    const [companyList, deptList, desigList, locList] = await Promise.all([
      db
        .select({ id: companies.id, name: companies.name, code: companies.code })
        .from(companies)
        .where(
          and(
            eq(companies.tenantId, tenantId),
            eq(companies.id, companyId),
            eq(companies.status, 'active'),
          ),
        ),
      db
        .select({ id: departments.id, name: departments.name, code: departments.code })
        .from(departments)
        .where(
          and(
            eq(departments.tenantId, tenantId),
            eq(departments.companyId, companyId),
            eq(departments.status, 'active'),
          ),
        ),
      db
        .select({ id: designations.id, name: designations.name, code: designations.code })
        .from(designations)
        .where(
          and(
            eq(designations.tenantId, tenantId),
            eq(designations.companyId, companyId),
            eq(designations.status, 'active'),
          ),
        ),
      db
        .select({
          id: locations.id,
          name: locations.name,
          code: locations.code,
          city: locations.city,
          country: locations.country,
        })
        .from(locations)
        .where(
          and(
            eq(locations.tenantId, tenantId),
            eq(locations.companyId, companyId),
            eq(locations.status, 'active'),
          ),
        ),
    ]);

    return {
      company: companyList[0] ?? null,
      departments: deptList,
      designations: desigList,
      locations: locList,
    };
  }
}
