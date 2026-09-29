import { eq, and, isNull } from 'drizzle-orm';
import { getDb } from '../../../db/connection.js';
import { tenantModules } from '../../../db/schema.js';
import type { ModuleCode, TenantModuleRecord } from '../types/module.types.js';
import { generateSurrogateId } from '../../auth/security.js';

export class ModuleRepository {
  async listByTenant(tenantId: string, companyId?: string | null): Promise<TenantModuleRecord[]> {
    const db = getDb();
    const conditions = [eq(tenantModules.tenantId, tenantId)];
    if (companyId !== undefined) {
      if (companyId === null) {
        conditions.push(isNull(tenantModules.companyId));
      } else {
        conditions.push(eq(tenantModules.companyId, companyId));
      }
    }

    const rows = await db
      .select()
      .from(tenantModules)
      .where(and(...conditions));

    return rows.map((r) => ({
      id: r.id,
      tenantId: r.tenantId,
      companyId: r.companyId,
      moduleCode: r.moduleCode as ModuleCode,
      status: r.status as 'enabled' | 'disabled',
      enabledAt: r.enabledAt.toISOString(),
      disabledAt: r.disabledAt ? r.disabledAt.toISOString() : null,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    }));
  }

  async findEntitlement(
    tenantId: string,
    moduleCode: ModuleCode,
    companyId?: string | null,
  ): Promise<TenantModuleRecord | null> {
    const db = getDb();
    const conditions = [
      eq(tenantModules.tenantId, tenantId),
      eq(tenantModules.moduleCode, moduleCode),
    ];
    if (companyId !== undefined && companyId !== null) {
      conditions.push(eq(tenantModules.companyId, companyId));
    } else {
      conditions.push(isNull(tenantModules.companyId));
    }

    const [row] = await db
      .select()
      .from(tenantModules)
      .where(and(...conditions));

    if (!row) return null;
    return {
      id: row.id,
      tenantId: row.tenantId,
      companyId: row.companyId,
      moduleCode: row.moduleCode as ModuleCode,
      status: row.status as 'enabled' | 'disabled',
      enabledAt: row.enabledAt.toISOString(),
      disabledAt: row.disabledAt ? row.disabledAt.toISOString() : null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  async setStatus(
    tenantId: string,
    moduleCode: ModuleCode,
    status: 'enabled' | 'disabled',
    companyId?: string | null,
  ): Promise<TenantModuleRecord> {
    const db = getDb();
    const existing = await this.findEntitlement(tenantId, moduleCode, companyId);

    if (existing) {
      await db
        .update(tenantModules)
        .set({
          status,
          enabledAt:
            status === 'enabled'
              ? new Date()
              : existing.enabledAt
                ? new Date(existing.enabledAt)
                : new Date(),
          disabledAt: status === 'disabled' ? new Date() : null,
        })
        .where(eq(tenantModules.id, existing.id));

      const updated = await this.findEntitlement(tenantId, moduleCode, companyId);
      if (!updated) throw new Error('Failed to update tenant module');
      return updated;
    }

    const id = generateSurrogateId('mod');
    await db.insert(tenantModules).values({
      id,
      tenantId,
      companyId: companyId ?? null,
      moduleCode,
      status,
      enabledAt: new Date(),
      disabledAt: status === 'disabled' ? new Date() : null,
    });

    const created = await this.findEntitlement(tenantId, moduleCode, companyId);
    if (!created) throw new Error('Failed to create tenant module');
    return created;
  }
}

export const moduleRepository = new ModuleRepository();
