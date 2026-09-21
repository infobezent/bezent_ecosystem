import { getDb, isDatabaseConfigured } from '../../../../db/connection.js';
import { companies, departments, designations, locations } from '../../../../db/schema.js';
import { eq, and } from 'drizzle-orm';

const MOCK_MASTERS = {
  company: {
    id: 'comp_demo_01',
    name: 'BEZENT Demo Pvt Ltd',
    code: 'BEZENT_DEMO',
  },
  departments: [
    { id: 'dept_eng_01', name: 'Engineering', code: 'ENG' },
    { id: 'dept_hr_01', name: 'Human Resources', code: 'HR' },
    { id: 'dept_ops_01', name: 'Operations', code: 'OPS' },
  ],
  designations: [
    { id: 'desig_se_01', name: 'Senior Software Engineer', code: 'SSE' },
    { id: 'desig_hrm_01', name: 'HR Manager', code: 'HRM' },
  ],
  locations: [
    {
      id: 'loc_chennai_01',
      name: 'Chennai HQ',
      code: 'CHN01',
      city: 'Chennai',
      country: 'India',
    },
  ],
};

export class OrganizationRepository {
  async getMasters(tenantId: string, companyId: string) {
    if (!isDatabaseConfigured) {
      return MOCK_MASTERS;
    }

    try {
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
        company: companyList[0] ?? MOCK_MASTERS.company,
        departments: deptList.length > 0 ? deptList : MOCK_MASTERS.departments,
        designations: desigList.length > 0 ? desigList : MOCK_MASTERS.designations,
        locations: locList.length > 0 ? locList : MOCK_MASTERS.locations,
      };
    } catch {
      return MOCK_MASTERS;
    }
  }
}
