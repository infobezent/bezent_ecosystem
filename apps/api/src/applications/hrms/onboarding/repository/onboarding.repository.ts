import { randomUUID } from 'node:crypto';
import { getDb } from '../../../../db/connection.js';
import {
  onboardingCases,
  onboardingCaseStageHistory,
  departments,
  designations,
  locations,
  type NewOnboardingCase,
  type OnboardingCase,
} from '../../../../db/schema.js';
import { eq, and, desc, asc, like, or, count, sql } from 'drizzle-orm';
import type {
  OnboardingCaseListItem,
  OnboardingCaseHistoryItem,
  PaginatedNewHiresResult,
  StageCounts,
} from '../types/onboarding.types.js';

export class OnboardingRepository {
  async listByCompany(
    tenantId: string,
    companyId: string,
    filters?: { status?: string },
  ): Promise<OnboardingCaseListItem[]> {
    const db = getDb();

    const conditions = [
      eq(onboardingCases.tenantId, tenantId),
      eq(onboardingCases.companyId, companyId),
    ];

    if (filters?.status) {
      conditions.push(
        eq(onboardingCases.status, filters.status as OnboardingCaseListItem['status']),
      );
    }

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
        version: onboardingCases.version,
        draftPayload: onboardingCases.draftPayload,
        withdrawalReason: onboardingCases.withdrawalReason,
        withdrawnAt: onboardingCases.withdrawnAt,
        completedAt: onboardingCases.completedAt,
        departmentId: onboardingCases.departmentId,
        departmentName: departments.name,
        designationId: onboardingCases.designationId,
        designationName: designations.name,
        locationId: onboardingCases.locationId,
        locationName: locations.name,
        createdAt: onboardingCases.createdAt,
        updatedAt: onboardingCases.updatedAt,
      })
      .from(onboardingCases)
      .leftJoin(departments, eq(onboardingCases.departmentId, departments.id))
      .leftJoin(designations, eq(onboardingCases.designationId, designations.id))
      .leftJoin(locations, eq(onboardingCases.locationId, locations.id))
      .where(and(...conditions))
      .orderBy(desc(onboardingCases.createdAt));

    return rows.map((r) => ({
      ...r,
      fullName:
        r.firstName && r.lastName
          ? `${r.firstName} ${r.lastName}`
          : (r.firstName ?? 'Untitled Candidate'),
    }));
  }

  async listNewHiresPaginated(
    tenantId: string,
    companyId: string,
    params: {
      page: number;
      pageSize: number;
      stage?: string;
      search?: string;
    },
  ): Promise<PaginatedNewHiresResult> {
    const { page, pageSize, stage, search } = params;

    const db = getDb();

    // 1. Stage counts across entire company dataset (tenant and company isolated)
    const [countsRow] = await db
      .select({
        all: count(onboardingCases.id),
        preboarding: sql<number>`COALESCE(SUM(CASE WHEN ${onboardingCases.stage} = 'preboarding' THEN 1 ELSE 0 END), 0)`,
        documents: sql<number>`COALESCE(SUM(CASE WHEN ${onboardingCases.stage} = 'documents' THEN 1 ELSE 0 END), 0)`,
        completed: sql<number>`COALESCE(SUM(CASE WHEN ${onboardingCases.stage} = 'completed' THEN 1 ELSE 0 END), 0)`,
      })
      .from(onboardingCases)
      .where(and(eq(onboardingCases.tenantId, tenantId), eq(onboardingCases.companyId, companyId)));

    const counts: StageCounts = {
      all: Number(countsRow?.all ?? 0),
      preboarding: Number(countsRow?.preboarding ?? 0),
      documents: Number(countsRow?.documents ?? 0),
      completed: Number(countsRow?.completed ?? 0),
    };

    // 2. Build filtered conditions for items and total count
    const conditions = [
      eq(onboardingCases.tenantId, tenantId),
      eq(onboardingCases.companyId, companyId),
    ];

    if (stage && stage !== 'all') {
      conditions.push(eq(onboardingCases.stage, stage as OnboardingCaseListItem['stage']));
    }

    if (search) {
      const searchPattern = `%${search}%`;
      conditions.push(
        or(
          like(onboardingCases.firstName, searchPattern),
          like(onboardingCases.lastName, searchPattern),
          like(onboardingCases.email, searchPattern),
          like(departments.name, searchPattern),
          like(designations.name, searchPattern),
          like(locations.name, searchPattern),
        )!,
      );
    }

    // 3. Count query for matching rows
    const [countResult] = await db
      .select({ total: count(onboardingCases.id) })
      .from(onboardingCases)
      .leftJoin(departments, eq(onboardingCases.departmentId, departments.id))
      .leftJoin(designations, eq(onboardingCases.designationId, designations.id))
      .leftJoin(locations, eq(onboardingCases.locationId, locations.id))
      .where(and(...conditions));

    const totalItems = Number(countResult?.total ?? 0);
    const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / pageSize);

    // 4. Paginated rows query with LIMIT and OFFSET
    const offset = (page - 1) * pageSize;
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
        version: onboardingCases.version,
        draftPayload: onboardingCases.draftPayload,
        withdrawalReason: onboardingCases.withdrawalReason,
        withdrawnAt: onboardingCases.withdrawnAt,
        completedAt: onboardingCases.completedAt,
        departmentId: onboardingCases.departmentId,
        departmentName: departments.name,
        designationId: onboardingCases.designationId,
        designationName: designations.name,
        locationId: onboardingCases.locationId,
        locationName: locations.name,
        createdAt: onboardingCases.createdAt,
        updatedAt: onboardingCases.updatedAt,
      })
      .from(onboardingCases)
      .leftJoin(departments, eq(onboardingCases.departmentId, departments.id))
      .leftJoin(designations, eq(onboardingCases.designationId, designations.id))
      .leftJoin(locations, eq(onboardingCases.locationId, locations.id))
      .where(and(...conditions))
      .orderBy(desc(onboardingCases.createdAt))
      .limit(pageSize)
      .offset(offset);

    const items: OnboardingCaseListItem[] = rows.map((r) => ({
      ...r,
      fullName:
        r.firstName && r.lastName
          ? `${r.firstName} ${r.lastName}`
          : (r.firstName ?? 'Untitled Candidate'),
    }));

    return {
      items,
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages,
      },
      counts,
    };
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
        version: onboardingCases.version,
        draftPayload: onboardingCases.draftPayload,
        withdrawalReason: onboardingCases.withdrawalReason,
        withdrawnAt: onboardingCases.withdrawnAt,
        completedAt: onboardingCases.completedAt,
        departmentId: onboardingCases.departmentId,
        departmentName: departments.name,
        designationId: onboardingCases.designationId,
        designationName: designations.name,
        locationId: onboardingCases.locationId,
        locationName: locations.name,
        createdAt: onboardingCases.createdAt,
        updatedAt: onboardingCases.updatedAt,
      })
      .from(onboardingCases)
      .leftJoin(departments, eq(onboardingCases.departmentId, departments.id))
      .leftJoin(designations, eq(onboardingCases.designationId, designations.id))
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
      fullName:
        r.firstName && r.lastName
          ? `${r.firstName} ${r.lastName}`
          : (r.firstName ?? 'Untitled Candidate'),
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

  async updateWithVersion(
    tenantId: string,
    companyId: string,
    id: string,
    expectedVersion: number,
    data: Partial<Omit<NewOnboardingCase, 'id' | 'tenantId' | 'companyId'>>,
  ): Promise<boolean> {
    const db = getDb();
    const updateValues = {
      ...data,
      version: expectedVersion + 1,
      updatedAt: new Date(),
    };

    const result = await db
      .update(onboardingCases)
      .set(updateValues)
      .where(
        and(
          eq(onboardingCases.tenantId, tenantId),
          eq(onboardingCases.companyId, companyId),
          eq(onboardingCases.id, id),
          eq(onboardingCases.version, expectedVersion),
        ),
      );

    // In mysql2/drizzle, affectedRows is in [ResultSetHeader]
    const header = result[0] as unknown as { affectedRows?: number };
    return (header?.affectedRows ?? 0) > 0;
  }

  async deleteDraft(tenantId: string, companyId: string, id: string): Promise<boolean> {
    const db = getDb();
    const result = await db
      .delete(onboardingCases)
      .where(
        and(
          eq(onboardingCases.tenantId, tenantId),
          eq(onboardingCases.companyId, companyId),
          eq(onboardingCases.id, id),
          eq(onboardingCases.status, 'draft'),
        ),
      );

    const header = result[0] as unknown as { affectedRows?: number };
    return (header?.affectedRows ?? 0) > 0;
  }

  async transitionStageWithHistory(
    tenantId: string,
    companyId: string,
    caseId: string,
    expectedVersion: number,
    fromStage: string,
    toStage: string,
    action: 'transition' | 'revert' | 'complete',
    notes?: string,
  ): Promise<boolean> {
    const db = getDb();
    return db.transaction(async (tx) => {
      const isComplete = toStage === 'completed';
      const now = new Date();

      const updateValues: Record<string, unknown> = {
        stage: toStage,
        status: isComplete ? 'completed' : 'active',
        version: expectedVersion + 1,
        updatedAt: now,
      };

      if (isComplete) {
        updateValues.completedAt = now;
      }

      const result = await tx
        .update(onboardingCases)
        .set(updateValues)
        .where(
          and(
            eq(onboardingCases.tenantId, tenantId),
            eq(onboardingCases.companyId, companyId),
            eq(onboardingCases.id, caseId),
            eq(onboardingCases.version, expectedVersion),
          ),
        );

      const header = result[0] as unknown as { affectedRows?: number };
      if ((header?.affectedRows ?? 0) === 0) {
        return false;
      }

      const historyId = `hist_${Date.now()}_${randomUUID().slice(0, 8)}`;
      await tx.insert(onboardingCaseStageHistory).values({
        id: historyId,
        tenantId,
        companyId,
        caseId,
        fromStage,
        toStage,
        action,
        notes: notes ?? null,
        createdAt: now,
      });

      return true;
    });
  }

  async withdrawWithHistory(
    tenantId: string,
    companyId: string,
    caseId: string,
    expectedVersion: number,
    currentStage: string,
    reason: string,
  ): Promise<boolean> {
    const db = getDb();
    return db.transaction(async (tx) => {
      const now = new Date();

      const result = await tx
        .update(onboardingCases)
        .set({
          status: 'withdrawn',
          withdrawalReason: reason,
          withdrawnAt: now,
          version: expectedVersion + 1,
          updatedAt: now,
        })
        .where(
          and(
            eq(onboardingCases.tenantId, tenantId),
            eq(onboardingCases.companyId, companyId),
            eq(onboardingCases.id, caseId),
            eq(onboardingCases.version, expectedVersion),
          ),
        );

      const header = result[0] as unknown as { affectedRows?: number };
      if ((header?.affectedRows ?? 0) === 0) {
        return false;
      }

      const historyId = `hist_${Date.now()}_${randomUUID().slice(0, 8)}`;
      await tx.insert(onboardingCaseStageHistory).values({
        id: historyId,
        tenantId,
        companyId,
        caseId,
        fromStage: currentStage,
        toStage: currentStage,
        action: 'withdraw',
        notes: reason,
        createdAt: now,
      });

      return true;
    });
  }

  async getHistoryByCaseId(
    tenantId: string,
    companyId: string,
    caseId: string,
  ): Promise<OnboardingCaseHistoryItem[]> {
    const db = getDb();
    const rows = await db
      .select({
        id: onboardingCaseStageHistory.id,
        tenantId: onboardingCaseStageHistory.tenantId,
        companyId: onboardingCaseStageHistory.companyId,
        caseId: onboardingCaseStageHistory.caseId,
        fromStage: onboardingCaseStageHistory.fromStage,
        toStage: onboardingCaseStageHistory.toStage,
        action: onboardingCaseStageHistory.action,
        notes: onboardingCaseStageHistory.notes,
        createdAt: onboardingCaseStageHistory.createdAt,
      })
      .from(onboardingCaseStageHistory)
      .where(
        and(
          eq(onboardingCaseStageHistory.tenantId, tenantId),
          eq(onboardingCaseStageHistory.companyId, companyId),
          eq(onboardingCaseStageHistory.caseId, caseId),
        ),
      )
      .orderBy(asc(onboardingCaseStageHistory.createdAt), asc(onboardingCaseStageHistory.id));

    return rows;
  }
}
