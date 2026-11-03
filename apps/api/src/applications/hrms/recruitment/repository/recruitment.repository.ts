import { getDb } from '../../../../db/connection.js';
import {
  jobRequisitions,
  jobPostings,
  candidates,
  candidateApplications,
  recruitmentStages,
  recruitmentActivities,
  recruitmentInterviews,
  recruitmentInterviewInterviewers,
  recruitmentOnboardings,
  departments,
  designations,
  locations,
  employees,
  type JobRequisition,
  type NewJobRequisition,
  type JobPosting,
  type NewJobPosting,
  type Candidate,
  type NewCandidate,
  type CandidateApplication,
  type NewCandidateApplication,
  type RecruitmentStage,
  type NewRecruitmentStage,
  type RecruitmentActivity,
  type NewRecruitmentActivity,
  type RecruitmentInterview,
  type NewRecruitmentInterview,
  type RecruitmentInterviewInterviewer,
  type NewRecruitmentInterviewInterviewer,
  type RecruitmentOnboarding,
  type NewRecruitmentOnboarding,
  type Employee,
} from '../../../../db/schema.js';
import { eq, and, desc, asc, like, or, count, type SQL } from 'drizzle-orm';
import { generateSurrogateId } from '../../../../platform/auth/security.js';
import type {
  RequisitionFilterQuery,
  CandidateFilterQuery,
  ApplicationFilterQuery,
  InterviewFilterQuery,
  PaginatedResult,
  CandidateApplicationDetail,
  RecruitmentInterviewWithPanel,
  InterviewPanelMemberInput,
} from '../types/recruitment.types.js';
import type { OnboardingFilterQuery } from '../types/onboarding.types.js';

type Db = ReturnType<typeof getDb>;
type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];
export type DbExecutor = Db | Tx;

export const DEFAULT_PIPELINE_STAGES: Array<{
  code: string;
  name: string;
  description: string;
  order: number;
  stageType: 'active' | 'terminal_success' | 'terminal_rejection' | 'terminal_withdrawal';
  badgeVariant: string;
}> = [
  {
    code: 'applied',
    name: 'Applied',
    description: 'New inbound applications awaiting review',
    order: 1,
    stageType: 'active',
    badgeVariant: 'neutral',
  },
  {
    code: 'screening',
    name: 'Screening',
    description: 'Phone screen and initial qualification check',
    order: 2,
    stageType: 'active',
    badgeVariant: 'info',
  },
  {
    code: 'shortlisted',
    name: 'Shortlisted',
    description: 'Cleared for interview loops',
    order: 3,
    stageType: 'active',
    badgeVariant: 'info',
  },
  {
    code: 'interview',
    name: 'Interview',
    description: 'Technical and behavioral interview rounds',
    order: 4,
    stageType: 'active',
    badgeVariant: 'info',
  },
  {
    code: 'assessment',
    name: 'Assessment',
    description: 'Take-home assignment or domain evaluation',
    order: 5,
    stageType: 'active',
    badgeVariant: 'warning',
  },
  {
    code: 'selected',
    name: 'Selected',
    description: 'Loop cleared, ready for offer preparation',
    order: 6,
    stageType: 'active',
    badgeVariant: 'success',
  },
  {
    code: 'offer',
    name: 'Offer',
    description: 'Offer letter extended and under review',
    order: 7,
    stageType: 'active',
    badgeVariant: 'success',
  },
  {
    code: 'hired',
    name: 'Hired',
    description: 'Offer accepted, ready for onboarding handoff',
    order: 8,
    stageType: 'terminal_success',
    badgeVariant: 'success',
  },
  {
    code: 'rejected',
    name: 'Rejected',
    description: 'Candidate not proceeding further',
    order: 9,
    stageType: 'terminal_rejection',
    badgeVariant: 'danger',
  },
  {
    code: 'withdrawn',
    name: 'Withdrawn',
    description: 'Application withdrawn by candidate',
    order: 10,
    stageType: 'terminal_withdrawal',
    badgeVariant: 'neutral',
  },
];

export class RecruitmentRepository {
  async transaction<T>(fn: (tx: DbExecutor) => Promise<T>): Promise<T> {
    return getDb().transaction(fn as any);
  }

  async getDepartment(
    tenantId: string,
    companyId: string,
    id: string,
    executor: DbExecutor = getDb(),
  ) {
    const [row] = await executor
      .select()
      .from(departments)
      .where(
        and(
          eq(departments.id, id),
          eq(departments.tenantId, tenantId),
          eq(departments.companyId, companyId),
        ),
      )
      .limit(1);
    return row ?? null;
  }

  async getDesignation(
    tenantId: string,
    companyId: string,
    id: string,
    executor: DbExecutor = getDb(),
  ) {
    const [row] = await executor
      .select()
      .from(designations)
      .where(
        and(
          eq(designations.id, id),
          eq(designations.tenantId, tenantId),
          eq(designations.companyId, companyId),
        ),
      )
      .limit(1);
    return row ?? null;
  }

  async getLocation(
    tenantId: string,
    companyId: string,
    id: string,
    executor: DbExecutor = getDb(),
  ) {
    const [row] = await executor
      .select()
      .from(locations)
      .where(
        and(
          eq(locations.id, id),
          eq(locations.tenantId, tenantId),
          eq(locations.companyId, companyId),
        ),
      )
      .limit(1);
    return row ?? null;
  }

  async getEmployee(
    tenantId: string,
    companyId: string,
    id: string,
    executor: DbExecutor = getDb(),
  ) {
    const [row] = await executor
      .select()
      .from(employees)
      .where(
        and(
          eq(employees.id, id),
          eq(employees.tenantId, tenantId),
          eq(employees.companyId, companyId),
        ),
      )
      .limit(1);
    return row ?? null;
  }

  // ---------------------------------------------------------------------------
  // Job Requisitions
  // ---------------------------------------------------------------------------

  async getNextRequisitionNumber(
    tenantId: string,
    companyId: string,
    executor: DbExecutor = getDb(),
  ): Promise<string> {
    const [row] = await executor
      .select({ count: count() })
      .from(jobRequisitions)
      .where(and(eq(jobRequisitions.tenantId, tenantId), eq(jobRequisitions.companyId, companyId)));
    const nextSeq = (row?.count ?? 0) + 1;
    const year = new Date().getFullYear();
    return `REQ-${year}-${String(nextSeq).padStart(4, '0')}`;
  }

  async createRequisition(
    data: NewJobRequisition,
    executor: DbExecutor = getDb(),
  ): Promise<JobRequisition> {
    await executor.insert(jobRequisitions).values(data);
    const created = await this.getRequisitionById(data.tenantId, data.companyId, data.id, executor);
    if (!created) {
      throw new Error(`Failed to retrieve newly created requisition ${data.id}`);
    }
    return created;
  }

  async getRequisitionById(
    tenantId: string,
    companyId: string,
    id: string,
    executor: DbExecutor = getDb(),
  ): Promise<JobRequisition | null> {
    const [row] = await executor
      .select()
      .from(jobRequisitions)
      .where(
        and(
          eq(jobRequisitions.id, id),
          eq(jobRequisitions.tenantId, tenantId),
          eq(jobRequisitions.companyId, companyId),
        ),
      )
      .limit(1);
    return row ?? null;
  }

  async getRequisitionByNumber(
    tenantId: string,
    companyId: string,
    requisitionNumber: string,
    executor: DbExecutor = getDb(),
  ): Promise<JobRequisition | null> {
    const [row] = await executor
      .select()
      .from(jobRequisitions)
      .where(
        and(
          eq(jobRequisitions.requisitionNumber, requisitionNumber),
          eq(jobRequisitions.tenantId, tenantId),
          eq(jobRequisitions.companyId, companyId),
        ),
      )
      .limit(1);
    return row ?? null;
  }

  async listRequisitions(
    tenantId: string,
    companyId: string,
    params: RequisitionFilterQuery,
    executor: DbExecutor = getDb(),
  ): Promise<PaginatedResult<JobRequisition>> {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(params.limit) || 20));
    const offset = (page - 1) * limit;

    const conditions: SQL[] = [
      eq(jobRequisitions.tenantId, tenantId),
      eq(jobRequisitions.companyId, companyId),
    ];

    if (params.status && params.status !== 'all') {
      conditions.push(eq(jobRequisitions.status, params.status));
    }
    if (params.departmentId) {
      conditions.push(eq(jobRequisitions.departmentId, params.departmentId));
    }
    if (params.workplaceType) {
      conditions.push(eq(jobRequisitions.workplaceType, params.workplaceType));
    }
    if (params.search) {
      conditions.push(
        or(
          like(jobRequisitions.jobTitle, `%${params.search}%`),
          like(jobRequisitions.requisitionNumber, `%${params.search}%`),
        )!,
      );
    }

    const whereClause = and(...conditions);

    const [totalRow] = await executor
      .select({ total: count() })
      .from(jobRequisitions)
      .where(whereClause);

    const total = totalRow?.total ?? 0;

    const items = await executor
      .select()
      .from(jobRequisitions)
      .where(whereClause)
      .orderBy(desc(jobRequisitions.createdAt))
      .limit(limit)
      .offset(offset);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async updateRequisition(
    tenantId: string,
    companyId: string,
    id: string,
    data: Partial<NewJobRequisition>,
    executor: DbExecutor = getDb(),
  ): Promise<JobRequisition | null> {
    await executor
      .update(jobRequisitions)
      .set(data)
      .where(
        and(
          eq(jobRequisitions.id, id),
          eq(jobRequisitions.tenantId, tenantId),
          eq(jobRequisitions.companyId, companyId),
        ),
      );
    return this.getRequisitionById(tenantId, companyId, id, executor);
  }

  // ---------------------------------------------------------------------------
  // Job Postings
  // ---------------------------------------------------------------------------

  async getNextPostingCode(
    tenantId: string,
    companyId: string,
    executor: DbExecutor = getDb(),
  ): Promise<string> {
    const [row] = await executor
      .select({ count: count() })
      .from(jobPostings)
      .where(and(eq(jobPostings.tenantId, tenantId), eq(jobPostings.companyId, companyId)));
    const nextSeq = (row?.count ?? 0) + 1;
    return `JOB-${String(nextSeq).padStart(4, '0')}`;
  }

  async createJobPosting(data: NewJobPosting, executor: DbExecutor = getDb()): Promise<JobPosting> {
    await executor.insert(jobPostings).values(data);
    const created = await this.getJobPostingById(data.tenantId, data.companyId, data.id, executor);
    if (!created) {
      throw new Error(`Failed to retrieve newly created posting ${data.id}`);
    }
    return created;
  }

  async getJobPostingById(
    tenantId: string,
    companyId: string,
    id: string,
    executor: DbExecutor = getDb(),
  ): Promise<JobPosting | null> {
    const [row] = await executor
      .select()
      .from(jobPostings)
      .where(
        and(
          eq(jobPostings.id, id),
          eq(jobPostings.tenantId, tenantId),
          eq(jobPostings.companyId, companyId),
        ),
      )
      .limit(1);
    return row ?? null;
  }

  async listJobPostings(
    tenantId: string,
    companyId: string,
    params: { page?: number; limit?: number; status?: string; requisitionId?: string },
    executor: DbExecutor = getDb(),
  ): Promise<PaginatedResult<JobPosting>> {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(params.limit) || 20));
    const offset = (page - 1) * limit;

    const conditions: SQL[] = [
      eq(jobPostings.tenantId, tenantId),
      eq(jobPostings.companyId, companyId),
    ];

    if (params.status && params.status !== 'all') {
      conditions.push(eq(jobPostings.status, params.status as any));
    }
    if (params.requisitionId) {
      conditions.push(eq(jobPostings.requisitionId, params.requisitionId));
    }

    const whereClause = and(...conditions);

    const [totalRow] = await executor
      .select({ total: count() })
      .from(jobPostings)
      .where(whereClause);

    const total = totalRow?.total ?? 0;

    const items = await executor
      .select()
      .from(jobPostings)
      .where(whereClause)
      .orderBy(desc(jobPostings.createdAt))
      .limit(limit)
      .offset(offset);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async updateJobPosting(
    tenantId: string,
    companyId: string,
    id: string,
    data: Partial<NewJobPosting>,
    executor: DbExecutor = getDb(),
  ): Promise<JobPosting | null> {
    await executor
      .update(jobPostings)
      .set(data)
      .where(
        and(
          eq(jobPostings.id, id),
          eq(jobPostings.tenantId, tenantId),
          eq(jobPostings.companyId, companyId),
        ),
      );
    return this.getJobPostingById(tenantId, companyId, id, executor);
  }

  // ---------------------------------------------------------------------------
  // Candidates
  // ---------------------------------------------------------------------------

  async getNextCandidateNumber(tenantId: string, executor: DbExecutor = getDb()): Promise<string> {
    const [row] = await executor
      .select({ count: count() })
      .from(candidates)
      .where(eq(candidates.tenantId, tenantId));
    const nextSeq = (row?.count ?? 0) + 1;
    return `CND-${String(nextSeq).padStart(5, '0')}`;
  }

  async createCandidate(data: NewCandidate, executor: DbExecutor = getDb()): Promise<Candidate> {
    await executor.insert(candidates).values(data);
    const created = await this.getCandidateById(data.tenantId, data.id, executor);
    if (!created) {
      throw new Error(`Failed to retrieve newly created candidate ${data.id}`);
    }
    return created;
  }

  async getCandidateById(
    tenantId: string,
    id: string,
    executor: DbExecutor = getDb(),
  ): Promise<Candidate | null> {
    const [row] = await executor
      .select()
      .from(candidates)
      .where(and(eq(candidates.id, id), eq(candidates.tenantId, tenantId)))
      .limit(1);
    return row ?? null;
  }

  async getCandidateByEmail(
    tenantId: string,
    email: string,
    executor: DbExecutor = getDb(),
  ): Promise<Candidate | null> {
    const [row] = await executor
      .select()
      .from(candidates)
      .where(
        and(eq(candidates.tenantId, tenantId), eq(candidates.email, email.toLowerCase().trim())),
      )
      .limit(1);
    return row ?? null;
  }

  async listCandidates(
    tenantId: string,
    params: CandidateFilterQuery,
    executor: DbExecutor = getDb(),
  ): Promise<PaginatedResult<Candidate>> {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(params.limit) || 20));
    const offset = (page - 1) * limit;

    const conditions: SQL[] = [eq(candidates.tenantId, tenantId)];

    if (params.status) {
      conditions.push(eq(candidates.status, params.status));
    }
    if (params.source) {
      conditions.push(eq(candidates.source, params.source));
    }
    if (params.search) {
      conditions.push(
        or(
          like(candidates.firstName, `%${params.search}%`),
          like(candidates.lastName, `%${params.search}%`),
          like(candidates.email, `%${params.search}%`),
          like(candidates.candidateNumber, `%${params.search}%`),
        )!,
      );
    }

    const whereClause = and(...conditions);

    const [totalRow] = await executor
      .select({ total: count() })
      .from(candidates)
      .where(whereClause);

    const total = totalRow?.total ?? 0;

    const items = await executor
      .select()
      .from(candidates)
      .where(whereClause)
      .orderBy(desc(candidates.createdAt))
      .limit(limit)
      .offset(offset);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async updateCandidate(
    tenantId: string,
    id: string,
    data: Partial<NewCandidate>,
    executor: DbExecutor = getDb(),
  ): Promise<Candidate | null> {
    await executor
      .update(candidates)
      .set(data)
      .where(and(eq(candidates.id, id), eq(candidates.tenantId, tenantId)));
    return this.getCandidateById(tenantId, id, executor);
  }

  // ---------------------------------------------------------------------------
  // Candidate Applications
  // ---------------------------------------------------------------------------

  async createApplication(
    data: NewCandidateApplication,
    executor: DbExecutor = getDb(),
  ): Promise<CandidateApplication> {
    await executor.insert(candidateApplications).values(data);
    const created = await this.getApplicationById(data.tenantId, data.companyId, data.id, executor);
    if (!created) {
      throw new Error(`Failed to retrieve newly created application ${data.id}`);
    }
    return created;
  }

  async getApplicationById(
    tenantId: string,
    companyId: string,
    id: string,
    executor: DbExecutor = getDb(),
  ): Promise<CandidateApplicationDetail | null> {
    const [app] = await executor
      .select()
      .from(candidateApplications)
      .where(
        and(
          eq(candidateApplications.id, id),
          eq(candidateApplications.tenantId, tenantId),
          eq(candidateApplications.companyId, companyId),
        ),
      )
      .limit(1);

    if (!app) return null;

    const [candidate] = await executor
      .select()
      .from(candidates)
      .where(and(eq(candidates.id, app.candidateId), eq(candidates.tenantId, tenantId)))
      .limit(1);

    const [req] = await executor
      .select()
      .from(jobRequisitions)
      .where(
        and(
          eq(jobRequisitions.id, app.requisitionId),
          eq(jobRequisitions.tenantId, tenantId),
          eq(jobRequisitions.companyId, companyId),
        ),
      )
      .limit(1);

    let posting: JobPosting | null = null;
    if (app.jobPostingId) {
      const [p] = await executor
        .select()
        .from(jobPostings)
        .where(
          and(
            eq(jobPostings.id, app.jobPostingId),
            eq(jobPostings.tenantId, tenantId),
            eq(jobPostings.companyId, companyId),
          ),
        )
        .limit(1);
      posting = p ?? null;
    }

    return {
      ...app,
      candidate: candidate ?? null,
      requisition: req ?? null,
      posting,
    };
  }

  async getActiveApplication(
    tenantId: string,
    companyId: string,
    candidateId: string,
    requisitionId: string,
    executor: DbExecutor = getDb(),
  ): Promise<CandidateApplication | null> {
    const [row] = await executor
      .select()
      .from(candidateApplications)
      .where(
        and(
          eq(candidateApplications.tenantId, tenantId),
          eq(candidateApplications.companyId, companyId),
          eq(candidateApplications.candidateId, candidateId),
          eq(candidateApplications.requisitionId, requisitionId),
          eq(candidateApplications.status, 'active'),
        ),
      )
      .limit(1);
    return row ?? null;
  }

  async listApplications(
    tenantId: string,
    companyId: string,
    params: ApplicationFilterQuery,
    executor: DbExecutor = getDb(),
  ): Promise<PaginatedResult<CandidateApplication>> {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(params.limit) || 20));
    const offset = (page - 1) * limit;

    const conditions: SQL[] = [
      eq(candidateApplications.tenantId, tenantId),
      eq(candidateApplications.companyId, companyId),
    ];

    if (params.requisitionId) {
      conditions.push(eq(candidateApplications.requisitionId, params.requisitionId));
    }
    if (params.candidateId) {
      conditions.push(eq(candidateApplications.candidateId, params.candidateId));
    }
    if (params.stage) {
      conditions.push(eq(candidateApplications.stage, params.stage));
    }
    if (params.status) {
      conditions.push(eq(candidateApplications.status, params.status));
    }

    const whereClause = and(...conditions);

    const [totalRow] = await executor
      .select({ total: count() })
      .from(candidateApplications)
      .where(whereClause);

    const total = totalRow?.total ?? 0;

    const items = await executor
      .select()
      .from(candidateApplications)
      .where(whereClause)
      .orderBy(desc(candidateApplications.appliedAt))
      .limit(limit)
      .offset(offset);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async updateApplication(
    tenantId: string,
    companyId: string,
    id: string,
    data: Partial<NewCandidateApplication>,
    executor: DbExecutor = getDb(),
  ): Promise<CandidateApplication | null> {
    await executor
      .update(candidateApplications)
      .set(data)
      .where(
        and(
          eq(candidateApplications.id, id),
          eq(candidateApplications.tenantId, tenantId),
          eq(candidateApplications.companyId, companyId),
        ),
      );
    return this.getApplicationById(tenantId, companyId, id, executor);
  }

  // ---------------------------------------------------------------------------
  // Pipeline Stages
  // ---------------------------------------------------------------------------

  async listStages(
    tenantId: string,
    companyId: string,
    executor: DbExecutor = getDb(),
  ): Promise<RecruitmentStage[]> {
    const stages = await executor
      .select()
      .from(recruitmentStages)
      .where(
        and(eq(recruitmentStages.tenantId, tenantId), eq(recruitmentStages.companyId, companyId)),
      )
      .orderBy(asc(recruitmentStages.stageOrder));

    if (stages.length === 0) {
      return this.seedDefaultStages(tenantId, companyId, executor);
    }

    return stages;
  }

  async seedDefaultStages(
    tenantId: string,
    companyId: string,
    executor: DbExecutor = getDb(),
  ): Promise<RecruitmentStage[]> {
    const toInsert: NewRecruitmentStage[] = DEFAULT_PIPELINE_STAGES.map((s) => ({
      id: generateSurrogateId('stg'),
      tenantId,
      companyId,
      code: s.code,
      name: s.name,
      description: s.description,
      stageOrder: s.order,
      stageType: s.stageType,
      badgeVariant: s.badgeVariant,
      isSystem: true,
    }));

    for (const item of toInsert) {
      await executor.insert(recruitmentStages).values(item);
    }

    return executor
      .select()
      .from(recruitmentStages)
      .where(
        and(eq(recruitmentStages.tenantId, tenantId), eq(recruitmentStages.companyId, companyId)),
      )
      .orderBy(asc(recruitmentStages.stageOrder));
  }

  async getStageByCode(
    tenantId: string,
    companyId: string,
    code: string,
    executor: DbExecutor = getDb(),
  ): Promise<RecruitmentStage | null> {
    const [row] = await executor
      .select()
      .from(recruitmentStages)
      .where(
        and(
          eq(recruitmentStages.code, code),
          eq(recruitmentStages.tenantId, tenantId),
          eq(recruitmentStages.companyId, companyId),
        ),
      )
      .limit(1);
    return row ?? null;
  }

  // ---------------------------------------------------------------------------
  // Activities and Notes
  // ---------------------------------------------------------------------------

  async createActivity(
    data: NewRecruitmentActivity,
    executor: DbExecutor = getDb(),
  ): Promise<RecruitmentActivity> {
    await executor.insert(recruitmentActivities).values(data);
    const [row] = await executor
      .select()
      .from(recruitmentActivities)
      .where(
        and(
          eq(recruitmentActivities.id, data.id),
          eq(recruitmentActivities.tenantId, data.tenantId),
          eq(recruitmentActivities.companyId, data.companyId),
        ),
      )
      .limit(1);
    return row!;
  }

  async listActivities(
    tenantId: string,
    companyId: string,
    applicationId: string,
    executor: DbExecutor = getDb(),
  ): Promise<RecruitmentActivity[]> {
    return executor
      .select()
      .from(recruitmentActivities)
      .where(
        and(
          eq(recruitmentActivities.applicationId, applicationId),
          eq(recruitmentActivities.tenantId, tenantId),
          eq(recruitmentActivities.companyId, companyId),
        ),
      )
      .orderBy(desc(recruitmentActivities.createdAt));
  }

  // ---------------------------------------------------------------------------
  // Interviews and Panels
  // ---------------------------------------------------------------------------

  async createInterview(
    data: NewRecruitmentInterview,
    panel: InterviewPanelMemberInput[],
    executor: DbExecutor = getDb(),
  ): Promise<RecruitmentInterviewWithPanel> {
    await executor.insert(recruitmentInterviews).values(data);

    if (panel.length > 0) {
      const panelRecords: NewRecruitmentInterviewInterviewer[] = panel.map((p) => ({
        id: generateSurrogateId('pnl'),
        interviewId: data.id,
        employeeId: p.employeeId || null,
        interviewerName: p.interviewerName,
        interviewerEmail: p.interviewerEmail || null,
        interviewerRole: p.interviewerRole || null,
      }));
      for (const p of panelRecords) {
        await executor.insert(recruitmentInterviewInterviewers).values(p);
      }
    }

    const created = await this.getInterviewById(data.tenantId, data.companyId, data.id, executor);
    if (!created) {
      throw new Error(`Failed to retrieve newly created interview ${data.id}`);
    }
    return created;
  }

  async getInterviewById(
    tenantId: string,
    companyId: string,
    id: string,
    executor: DbExecutor = getDb(),
  ): Promise<RecruitmentInterviewWithPanel | null> {
    const [interview] = await executor
      .select()
      .from(recruitmentInterviews)
      .where(
        and(
          eq(recruitmentInterviews.id, id),
          eq(recruitmentInterviews.tenantId, tenantId),
          eq(recruitmentInterviews.companyId, companyId),
        ),
      )
      .limit(1);

    if (!interview) return null;

    const panel = await executor
      .select()
      .from(recruitmentInterviewInterviewers)
      .where(eq(recruitmentInterviewInterviewers.interviewId, id));

    return {
      ...interview,
      panel,
    };
  }

  async listInterviews(
    tenantId: string,
    companyId: string,
    params: InterviewFilterQuery,
    executor: DbExecutor = getDb(),
  ): Promise<PaginatedResult<RecruitmentInterviewWithPanel>> {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(params.limit) || 20));
    const offset = (page - 1) * limit;

    const conditions: SQL[] = [
      eq(recruitmentInterviews.tenantId, tenantId),
      eq(recruitmentInterviews.companyId, companyId),
    ];

    if (params.applicationId) {
      conditions.push(eq(recruitmentInterviews.applicationId, params.applicationId));
    }
    if (params.candidateId) {
      conditions.push(eq(recruitmentInterviews.candidateId, params.candidateId));
    }
    if (params.status) {
      conditions.push(eq(recruitmentInterviews.status, params.status));
    }
    if (params.scheduledDate) {
      conditions.push(eq(recruitmentInterviews.scheduledDate, params.scheduledDate));
    }

    const whereClause = and(...conditions);

    const [totalRow] = await executor
      .select({ total: count() })
      .from(recruitmentInterviews)
      .where(whereClause);

    const total = totalRow?.total ?? 0;

    const items = await executor
      .select()
      .from(recruitmentInterviews)
      .where(whereClause)
      .orderBy(desc(recruitmentInterviews.scheduledDate), desc(recruitmentInterviews.startTime))
      .limit(limit)
      .offset(offset);

    // Fetch panels for these interviews
    const results: RecruitmentInterviewWithPanel[] = [];
    for (const item of items) {
      const panel = await executor
        .select()
        .from(recruitmentInterviewInterviewers)
        .where(eq(recruitmentInterviewInterviewers.interviewId, item.id));
      results.push({ ...item, panel });
    }

    return {
      items: results,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async updateInterview(
    tenantId: string,
    companyId: string,
    id: string,
    data: Partial<NewRecruitmentInterview>,
    executor: DbExecutor = getDb(),
  ): Promise<RecruitmentInterview | null> {
    await executor
      .update(recruitmentInterviews)
      .set(data)
      .where(
        and(
          eq(recruitmentInterviews.id, id),
          eq(recruitmentInterviews.tenantId, tenantId),
          eq(recruitmentInterviews.companyId, companyId),
        ),
      );
    return this.getInterviewById(tenantId, companyId, id, executor);
  }

  // ---------------------------------------------------------------------------
  // Workforce Onboarding Handoff
  // ---------------------------------------------------------------------------

  async createOnboarding(
    data: NewRecruitmentOnboarding,
    executor: DbExecutor = getDb(),
  ): Promise<RecruitmentOnboarding> {
    await executor.insert(recruitmentOnboardings).values(data);
    const [row] = await executor
      .select()
      .from(recruitmentOnboardings)
      .where(
        and(
          eq(recruitmentOnboardings.id, data.id),
          eq(recruitmentOnboardings.tenantId, data.tenantId),
          eq(recruitmentOnboardings.companyId, data.companyId),
        ),
      )
      .limit(1);
    if (!row) throw new Error('Failed to retrieve created recruitment onboarding');
    return row;
  }

  async getOnboardingById(
    tenantId: string,
    companyId: string,
    id: string,
    executor: DbExecutor = getDb(),
    forUpdate: boolean = false,
  ): Promise<RecruitmentOnboarding | null> {
    const query = executor
      .select()
      .from(recruitmentOnboardings)
      .where(
        and(
          eq(recruitmentOnboardings.id, id),
          eq(recruitmentOnboardings.tenantId, tenantId),
          eq(recruitmentOnboardings.companyId, companyId),
        ),
      )
      .limit(1);

    if (forUpdate && typeof (query as any).for === 'function') {
      (query as any).for('update');
    }

    const [row] = await query;
    return row ?? null;
  }

  async getOnboardingByApplicationId(
    tenantId: string,
    companyId: string,
    applicationId: string,
    executor: DbExecutor = getDb(),
  ): Promise<RecruitmentOnboarding | null> {
    const [row] = await executor
      .select()
      .from(recruitmentOnboardings)
      .where(
        and(
          eq(recruitmentOnboardings.applicationId, applicationId),
          eq(recruitmentOnboardings.tenantId, tenantId),
          eq(recruitmentOnboardings.companyId, companyId),
        ),
      )
      .limit(1);
    return row ?? null;
  }

  async updateOnboarding(
    tenantId: string,
    companyId: string,
    id: string,
    data: Partial<NewRecruitmentOnboarding>,
    executor: DbExecutor = getDb(),
  ): Promise<RecruitmentOnboarding | null> {
    await executor
      .update(recruitmentOnboardings)
      .set(data)
      .where(
        and(
          eq(recruitmentOnboardings.id, id),
          eq(recruitmentOnboardings.tenantId, tenantId),
          eq(recruitmentOnboardings.companyId, companyId),
        ),
      );
    return this.getOnboardingById(tenantId, companyId, id, executor);
  }

  async listOnboardings(
    tenantId: string,
    companyId: string,
    params: OnboardingFilterQuery = {},
    executor: DbExecutor = getDb(),
  ): Promise<PaginatedResult<RecruitmentOnboarding>> {
    const limit = Math.max(1, Math.min(100, Number(params.limit) || 20));
    const offset = Math.max(0, Number(params.offset) || 0);
    const page = Math.floor(offset / limit) + 1;

    const conditions: SQL[] = [
      eq(recruitmentOnboardings.tenantId, tenantId),
      eq(recruitmentOnboardings.companyId, companyId),
    ];

    if (params.status) {
      conditions.push(eq(recruitmentOnboardings.status, params.status));
    }
    if (params.departmentId) {
      conditions.push(eq(recruitmentOnboardings.departmentId, params.departmentId));
    }

    const whereClause = and(...conditions);

    const [totalRow] = await executor
      .select({ total: count() })
      .from(recruitmentOnboardings)
      .where(whereClause);

    const total = totalRow?.total ?? 0;

    const items = await executor
      .select()
      .from(recruitmentOnboardings)
      .where(whereClause)
      .orderBy(desc(recruitmentOnboardings.createdAt))
      .limit(limit)
      .offset(offset);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getEmployeeByEmail(
    tenantId: string,
    companyId: string,
    email: string,
    executor: DbExecutor = getDb(),
  ): Promise<Employee | null> {
    const [row] = await executor
      .select()
      .from(employees)
      .where(
        and(
          eq(employees.tenantId, tenantId),
          eq(employees.companyId, companyId),
          eq(employees.email, email.toLowerCase().trim()),
        ),
      )
      .limit(1);
    return row ?? null;
  }

  async getEmployeeByPhone(
    tenantId: string,
    companyId: string,
    phone: string,
    executor: DbExecutor = getDb(),
  ): Promise<Employee | null> {
    const [row] = await executor
      .select()
      .from(employees)
      .where(
        and(
          eq(employees.tenantId, tenantId),
          eq(employees.companyId, companyId),
          eq(employees.phone, phone.trim()),
        ),
      )
      .limit(1);
    return row ?? null;
  }

  async getEmployeesByName(
    tenantId: string,
    companyId: string,
    firstName: string,
    lastName: string,
    executor: DbExecutor = getDb(),
  ): Promise<Employee[]> {
    return executor
      .select()
      .from(employees)
      .where(
        and(
          eq(employees.tenantId, tenantId),
          eq(employees.companyId, companyId),
          eq(employees.firstName, firstName.trim()),
          eq(employees.lastName, lastName.trim()),
        ),
      );
  }
}

export const recruitmentRepository = new RecruitmentRepository();
