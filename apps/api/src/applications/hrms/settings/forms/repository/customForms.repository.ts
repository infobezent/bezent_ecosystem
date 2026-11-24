import { randomUUID } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { getDb } from '../../../../../db/connection.js';
import { customForms, type CustomForm } from '../../../../../db/schema.js';

/** Company-owned custom form shells; every query is tenant/company scoped. */
export class CustomFormsRepository {
  async list(tenantId: string, companyId: string): Promise<CustomForm[]> {
    return getDb()
      .select()
      .from(customForms)
      .where(
        and(
          eq(customForms.tenantId, tenantId),
          eq(customForms.companyId, companyId),
          eq(customForms.status, 'active'),
        ),
      );
  }

  async getByKey(tenantId: string, companyId: string, formKey: string): Promise<CustomForm | null> {
    const [row] = await getDb()
      .select()
      .from(customForms)
      .where(
        and(
          eq(customForms.tenantId, tenantId),
          eq(customForms.companyId, companyId),
          eq(customForms.formKey, formKey),
          eq(customForms.status, 'active'),
        ),
      );
    return row ?? null;
  }

  async create(
    tenantId: string,
    companyId: string,
    formKey: string,
    name: string,
    description: string | null,
  ): Promise<CustomForm> {
    const db = getDb();
    const row = {
      id: randomUUID(),
      tenantId,
      companyId,
      formKey,
      name,
      description,
      status: 'active' as const,
    };
    await db.insert(customForms).values(row);
    const [created] = await db.select().from(customForms).where(eq(customForms.id, row.id));
    return created!;
  }
}
