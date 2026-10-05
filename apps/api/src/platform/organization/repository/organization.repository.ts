import { getDb } from '../../../db/connection.js';
import { companies, departments, designations, locations } from '../../../db/schema.js';
import { eq, and } from 'drizzle-orm';
import type {
  OrganizationProfileRecord,
  UpdateOrganizationProfileDto,
} from '../types/organization.types.js';

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

  async getProfile(tenantId: string, companyId: string): Promise<OrganizationProfileRecord | null> {
    const db = getDb();
    const rows = await db
      .select()
      .from(companies)
      .where(and(eq(companies.tenantId, tenantId), eq(companies.id, companyId)));

    const comp = rows[0];
    if (!comp) return null;

    return {
      id: comp.id,
      tenantId: comp.tenantId,
      name: comp.name,
      code: comp.code,
      displayName: comp.displayName ?? null,
      organizationType: comp.organizationType ?? null,
      industry: comp.industry ?? null,
      website: comp.website ?? null,
      logoUrl: comp.logoUrl ?? null,
      primaryEmail: comp.businessEmail ?? null,
      phoneNumber: comp.contactPhone ?? null,
      alternateEmail: comp.alternateEmail ?? null,
      alternatePhone: comp.alternatePhone ?? null,
      addressLine1: comp.addressLine1 ?? null,
      addressLine2: comp.addressLine2 ?? null,
      country: comp.country ?? null,
      state: comp.state ?? null,
      city: comp.city ?? null,
      postalCode: comp.postalCode ?? null,
      status: comp.status,
      createdAt: comp.createdAt.toISOString(),
      updatedAt: comp.updatedAt.toISOString(),
    };
  }

  async updateProfile(
    tenantId: string,
    companyId: string,
    data: UpdateOrganizationProfileDto,
  ): Promise<OrganizationProfileRecord | null> {
    const db = getDb();

    // Canonical Company Name is immutable through Profile updates (Provisioning-controlled)
    await db
      .update(companies)
      .set({
        displayName: data.displayName ?? null,
        organizationType: data.organizationType,
        industry: data.industry ?? null,
        website: data.website ?? null,
        logoUrl: data.logoUrl !== undefined ? data.logoUrl : null,
        businessEmail: data.primaryEmail,
        contactPhone: data.phoneNumber ?? null,
        alternateEmail: data.alternateEmail ?? null,
        alternatePhone: data.alternatePhone ?? null,
        addressLine1: data.addressLine1,
        addressLine2: data.addressLine2 ?? null,
        country: data.country,
        state: data.state,
        city: data.city,
        postalCode: data.postalCode,
        updatedAt: new Date(),
      })
      .where(and(eq(companies.tenantId, tenantId), eq(companies.id, companyId)));

    return this.getProfile(tenantId, companyId);
  }

  async getSummary(companyId: string) {
    const db = getDb();
    const [depts, desigs, locs] = await Promise.all([
      db.select().from(departments).where(eq(departments.companyId, companyId)),
      db.select().from(designations).where(eq(designations.companyId, companyId)),
      db.select().from(locations).where(eq(locations.companyId, companyId)),
    ]);
    return {
      departments: depts,
      designations: desigs,
      locations: locs,
    };
  }
}

export const organizationRepository = new OrganizationRepository();
