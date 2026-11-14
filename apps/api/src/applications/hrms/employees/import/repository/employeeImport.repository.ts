import { eq, and, desc } from 'drizzle-orm';
import { getDb } from '../../../../../db/connection.js';
import {
  employeeImports,
  employeeImportRows,
  type EmployeeImport,
  type NewEmployeeImport,
  type EmployeeImportRow,
  type NewEmployeeImportRow,
} from '../../../../../db/schema.js';
import type { ImportRowStatus } from '../types/employeeImport.types.js';

export class EmployeeImportRepository {
  private get db() {
    return getDb();
  }

  async createImport(data: NewEmployeeImport): Promise<EmployeeImport> {
    await this.db.insert(employeeImports).values(data);
    const [record] = await this.db
      .select()
      .from(employeeImports)
      .where(eq(employeeImports.id, data.id))
      .limit(1);
    return record!;
  }

  async getImportById(
    tenantId: string,
    companyId: string,
    id: string,
  ): Promise<EmployeeImport | null> {
    const [record] = await this.db
      .select()
      .from(employeeImports)
      .where(
        and(
          eq(employeeImports.tenantId, tenantId),
          eq(employeeImports.companyId, companyId),
          eq(employeeImports.id, id),
        ),
      )
      .limit(1);
    return record ?? null;
  }

  async updateImport(
    id: string,
    updates: Partial<Omit<EmployeeImport, 'id' | 'tenantId' | 'companyId' | 'createdAt'>>,
  ): Promise<void> {
    await this.db.update(employeeImports).set(updates).where(eq(employeeImports.id, id));
  }

  async listImports(tenantId: string, companyId: string): Promise<EmployeeImport[]> {
    return this.db
      .select()
      .from(employeeImports)
      .where(and(eq(employeeImports.tenantId, tenantId), eq(employeeImports.companyId, companyId)))
      .orderBy(desc(employeeImports.createdAt));
  }

  async createImportRows(rows: NewEmployeeImportRow[]): Promise<void> {
    if (rows.length === 0) return;
    const chunkSize = 100;
    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);
      await this.db.insert(employeeImportRows).values(chunk);
    }
  }

  async getImportRows(importId: string, status?: ImportRowStatus): Promise<EmployeeImportRow[]> {
    if (status) {
      return this.db
        .select()
        .from(employeeImportRows)
        .where(
          and(eq(employeeImportRows.importId, importId), eq(employeeImportRows.status, status)),
        )
        .orderBy(employeeImportRows.rowNumber);
    }
    return this.db
      .select()
      .from(employeeImportRows)
      .where(eq(employeeImportRows.importId, importId))
      .orderBy(employeeImportRows.rowNumber);
  }

  async updateImportRowStatus(id: string, status: ImportRowStatus): Promise<void> {
    await this.db.update(employeeImportRows).set({ status }).where(eq(employeeImportRows.id, id));
  }
}
