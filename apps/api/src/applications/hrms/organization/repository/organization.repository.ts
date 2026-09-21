import { getDb, isDatabaseConfigured } from '../../../../db/connection.js';
import { companies, departments, designations, locations } from '../../../../db/schema.js';
import { eq, and } from 'drizzle-orm';

const FALLBACK_MASTERS = {
  company: { id: 'comp_demo_01', name: 'BEZENT Demo Pvt Ltd', code: 'BEZENT_DEMO' },
  departments: [
    { id: 'dept_eng_01', name: 'Engineering', code: 'ENG' },
    { id: 'dept_hr_01', name: 'Human Resources', code: 'HR' },
    { id: 'dept_fin_01', name: 'Finance', code: 'FIN' },
    { id: 'dept_prod_01', name: 'Product', code: 'PROD' },
  ],
  designations: [
    { id: 'desig_se_01', name: 'Software Engineer', code: 'SE' },
    { id: 'desig_hr_01', name: 'Senior HR Specialist', code: 'SHR' },
    { id: 'desig_fa_01', name: 'Financial Analyst', code: 'FA' },
    { id: 'desig_pm_01', name: 'Product Manager', code: 'PM' },
  ],
  locations: [
    { id: 'loc_chn_01', name: 'Chennai (HQ)', code: 'CHN', city: 'Chennai', country: 'India' },
    { id: 'loc_blr_01', name: 'Bengaluru', code: 'BLR', city: 'Bengaluru', country: 'India' },
    { id: 'loc_rem_01', name: 'Remote', code: 'REM', city: 'Remote', country: 'Global' },
  ],
};

export class OrganizationRepository {
  async getMasters(tenantId: string, companyId: string) {
    if (!isDatabaseConfigured) {
      return FALLBACK_MASTERS;
    }

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
