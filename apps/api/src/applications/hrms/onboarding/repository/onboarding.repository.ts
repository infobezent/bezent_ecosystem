import { randomUUID } from 'node:crypto';
import { getDb, isDatabaseConfigured } from '../../../../db/connection.js';
import {
  onboardingCases,
  onboardingCaseStageHistory,
  departments,
  designations,
  locations,
  type NewOnboardingCase,
  type OnboardingCase,
} from '../../../../db/schema.js';
import { eq, and, desc, asc } from 'drizzle-orm';
import type {
  OnboardingCaseListItem,
  OnboardingCaseHistoryItem,
} from '../types/onboarding.types.js';

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
    version: 1,
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
    version: 1,
    createdAt: new Date('2026-09-02'),
  },
];

const inMemoryCases: OnboardingCaseListItem[] = [...INITIAL_FALLBACK_CASES];

export class OnboardingRepository {
  async listByCompany(
    tenantId: string,
    companyId: string,
    filters?: { status?: string },
  ): Promise<OnboardingCaseListItem[]> {
    if (!isDatabaseConfigured) {
      return inMemoryCases.filter((c) => {
        if (c.tenantId !== tenantId || c.companyId !== companyId) return false;
        if (filters?.status && c.status !== filters.status) return false;
        return true;
      });
    }

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
    if (!isDatabaseConfigured) {
      const item: OnboardingCaseListItem = {
        id: data.id,
        tenantId: data.tenantId,
        companyId: data.companyId,
        firstName: data.firstName ?? null,
        lastName: data.lastName ?? null,
        fullName:
          data.firstName && data.lastName
            ? `${data.firstName} ${data.lastName}`
            : (data.firstName ?? 'Untitled Candidate'),
        email: data.email ?? null,
        phone: data.phone ?? null,
        joiningDate: data.joiningDate ?? null,
        employmentType: data.employmentType ?? 'full_time',
        stage: data.stage ?? 'preboarding',
        status: data.status ?? 'active',
        version: data.version ?? 1,
        draftPayload: (data.draftPayload as Record<string, unknown>) ?? null,
        withdrawalReason: null,
        withdrawnAt: null,
        completedAt: null,
        departmentId: data.departmentId ?? null,
        departmentName: 'Engineering',
        designationId: data.designationId ?? null,
        designationName: 'Software Engineer',
        locationId: data.locationId ?? null,
        locationName: data.locationId ? 'Chennai (HQ)' : null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      inMemoryCases.unshift(item);
      return {
        id: data.id,
        tenantId: data.tenantId,
        companyId: data.companyId,
        departmentId: data.departmentId ?? null,
        designationId: data.designationId ?? null,
        locationId: data.locationId ?? null,
        firstName: data.firstName ?? null,
        lastName: data.lastName ?? null,
        email: data.email ?? null,
        phone: data.phone ?? null,
        joiningDate: data.joiningDate ?? null,
        employmentType: data.employmentType ?? 'full_time',
        stage: data.stage ?? 'preboarding',
        status: data.status ?? 'active',
        version: data.version ?? 1,
        draftPayload: (data.draftPayload as Record<string, unknown>) ?? null,
        withdrawalReason: null,
        withdrawnAt: null,
        completedAt: null,
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

  async updateWithVersion(
    tenantId: string,
    companyId: string,
    id: string,
    expectedVersion: number,
    data: Partial<Omit<NewOnboardingCase, 'id' | 'tenantId' | 'companyId'>>,
  ): Promise<boolean> {
    if (!isDatabaseConfigured) {
      const idx = inMemoryCases.findIndex(
        (c) => c.tenantId === tenantId && c.companyId === companyId && c.id === id,
      );
      if (idx === -1) return false;
      const current = inMemoryCases[idx]!;
      if (current.version !== expectedVersion) return false;

      const newVersion = expectedVersion + 1;
      inMemoryCases[idx] = {
        ...current,
        ...data,
        version: newVersion,
        updatedAt: new Date(),
        fullName:
          (data.firstName ?? current.firstName) && (data.lastName ?? current.lastName)
            ? `${data.firstName ?? current.firstName} ${data.lastName ?? current.lastName}`
            : (data.firstName ?? current.firstName ?? 'Untitled Candidate'),
      };
      return true;
    }

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
    if (!isDatabaseConfigured) {
      const idx = inMemoryCases.findIndex(
        (c) =>
          c.tenantId === tenantId &&
          c.companyId === companyId &&
          c.id === id &&
          c.status === 'draft',
      );
      if (idx === -1) return false;
      inMemoryCases.splice(idx, 1);
      return true;
    }

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
