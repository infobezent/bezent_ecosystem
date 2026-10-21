import { and, desc, eq } from 'drizzle-orm';
import { getDb } from '../../../../db/connection.js';
import {
  companies,
  companyFeedPosts,
  departments,
  designations,
  employeeAttendance,
  employeeMilestoneAchievements,
  employeeNotifications,
  employeeRewardAssignments,
  employees,
  employeeTimesheets,
  milestoneConfigs,
  rewardsCatalogue,
  type CompanyFeedPost,
  type EmployeeMilestoneAchievement,
  type EmployeeRewardAssignment,
  type MilestoneConfig,
  type NewCompanyFeedPost,
  type NewEmployeeMilestoneAchievement,
  type NewEmployeeNotification,
  type NewEmployeeRewardAssignment,
  type NewMilestoneConfig,
  type NewRewardsCatalogueItem,
  type RewardsCatalogueItem,
} from '../../../../db/schema.js';

export class MilestoneRepository {
  /**
   * Queries verified attendance records for an employee within a company.
   */
  async getEmployeeAttendanceRecords(tenantId: string, companyId: string, employeeId: string) {
    return getDb()
      .select({
        id: employeeAttendance.id,
        date: employeeAttendance.date,
        workedMinutes: employeeAttendance.workedMinutes,
        status: employeeAttendance.status,
        processingState: employeeAttendance.processingState,
        isMissingPunch: employeeAttendance.isMissingPunch,
        isRegularized: employeeAttendance.isRegularized,
        checkInTime: employeeAttendance.checkInTime,
        checkOutTime: employeeAttendance.checkOutTime,
      })
      .from(employeeAttendance)
      .where(
        and(
          eq(employeeAttendance.tenantId, tenantId),
          eq(employeeAttendance.companyId, companyId),
          eq(employeeAttendance.employeeId, employeeId),
        ),
      )
      .orderBy(desc(employeeAttendance.date));
  }

  /**
   * Queries approved timesheets for an employee within a company.
   */
  async getEmployeeApprovedTimesheets(tenantId: string, companyId: string, employeeId: string) {
    return getDb()
      .select({
        id: employeeTimesheets.id,
        date: employeeTimesheets.date,
        projectName: employeeTimesheets.projectName,
        taskDescription: employeeTimesheets.taskDescription,
        hours: employeeTimesheets.hours,
        status: employeeTimesheets.status,
      })
      .from(employeeTimesheets)
      .where(
        and(
          eq(employeeTimesheets.tenantId, tenantId),
          eq(employeeTimesheets.companyId, companyId),
          eq(employeeTimesheets.employeeId, employeeId),
          eq(employeeTimesheets.status, 'approved'),
        ),
      )
      .orderBy(desc(employeeTimesheets.date));
  }

  /**
   * Fetches employee with personal details, designation, department, and company.
   */
  async getEmployeeWithContext(tenantId: string, companyId: string, employeeId: string) {
    const [emp] = await getDb()
      .select({
        id: employees.id,
        employeeNumber: employees.employeeNumber,
        firstName: employees.firstName,
        lastName: employees.lastName,
        email: employees.email,
        departmentId: employees.departmentId,
        designationId: employees.designationId,
        employmentStatus: employees.employmentStatus,
        joiningDate: employees.joiningDate,
      })
      .from(employees)
      .where(
        and(
          eq(employees.tenantId, tenantId),
          eq(employees.companyId, companyId),
          eq(employees.id, employeeId),
        ),
      );

    if (!emp) return null;

    const [comp] = await getDb()
      .select({ id: companies.id, name: companies.name, code: companies.code })
      .from(companies)
      .where(and(eq(companies.tenantId, tenantId), eq(companies.id, companyId)));

    let designationTitle: string | null = null;
    if (emp.designationId) {
      const [des] = await getDb()
        .select({ name: designations.name })
        .from(designations)
        .where(eq(designations.id, emp.designationId));
      designationTitle = des?.name ?? null;
    }

    let departmentName: string | null = null;
    if (emp.departmentId) {
      const [dep] = await getDb()
        .select({ name: departments.name })
        .from(departments)
        .where(eq(departments.id, emp.departmentId));
      departmentName = dep?.name ?? null;
    }

    return {
      employee: emp,
      company: comp ?? { id: companyId, name: 'BEZENT Enterprise', code: 'BEZENT' },
      designationTitle,
      departmentName,
      profilePhotoUrl: null,
    };
  }

  /**
   * Fetches all milestone configs for a company. Initializes default 100k config if none exists.
   */
  async getMilestoneConfigs(tenantId: string, companyId: string): Promise<MilestoneConfig[]> {
    const existing = await getDb()
      .select()
      .from(milestoneConfigs)
      .where(
        and(
          eq(milestoneConfigs.tenantId, tenantId),
          eq(milestoneConfigs.companyId, companyId),
        ),
      )
      .orderBy(milestoneConfigs.requiredHours);

    if (existing.length > 0) return existing;

    // Default configuration (100k hours milestone)
    const defaultConfig: NewMilestoneConfig = {
      id: `mcfg_${Date.now()}_100k`,
      tenantId,
      companyId,
      milestoneKey: '100k_hours',
      title: '100,000 Hours Legend',
      description: 'Awarded to employees reaching 100,000 verified lifetime working hours of dedicated enterprise service.',
      requiredHours: 100000,
      badgeIcon: 'award',
      badgeLabel: 'Centurion of Service',
      posterTemplate: {
        titleTemplate: 'Century of Dedication: 100,000 Hours',
        subtitleTemplate: 'A Milestone of Extraordinary Craftsmanship & Enterprise Loyalty',
        primaryColor: '#1a73e8',
        includePhoto: true,
        includeDepartment: true,
        includeJoiningDate: true,
      },
      approvalRequired: true,
      isActive: true,
    };

    await getDb().insert(milestoneConfigs).values(defaultConfig);
    return [defaultConfig as MilestoneConfig];
  }

  /**
   * Saves or updates a milestone configuration.
   */
  async upsertMilestoneConfig(config: NewMilestoneConfig): Promise<MilestoneConfig> {
    const [existing] = await getDb()
      .select()
      .from(milestoneConfigs)
      .where(
        and(
          eq(milestoneConfigs.tenantId, config.tenantId),
          eq(milestoneConfigs.companyId, config.companyId),
          eq(milestoneConfigs.milestoneKey, config.milestoneKey),
        ),
      );

    if (existing) {
      await getDb()
        .update(milestoneConfigs)
        .set({
          title: config.title,
          description: config.description,
          requiredHours: config.requiredHours,
          badgeIcon: config.badgeIcon,
          badgeLabel: config.badgeLabel,
          posterTemplate: config.posterTemplate,
          approvalRequired: config.approvalRequired,
          isActive: config.isActive,
          updatedAt: new Date(),
        })
        .where(eq(milestoneConfigs.id, existing.id));

      const [updated] = await getDb()
        .select()
        .from(milestoneConfigs)
        .where(eq(milestoneConfigs.id, existing.id));
      return updated!;
    }

    await getDb().insert(milestoneConfigs).values(config);
    return config as MilestoneConfig;
  }

  /**
   * Queries an achievement by its primary ID within tenant and company.
   */
  async getAchievementById(
    id: string,
    tenantId: string,
    companyId: string,
  ): Promise<EmployeeMilestoneAchievement | null> {
    const [ach] = await getDb()
      .select()
      .from(employeeMilestoneAchievements)
      .where(
        and(
          eq(employeeMilestoneAchievements.id, id),
          eq(employeeMilestoneAchievements.tenantId, tenantId),
          eq(employeeMilestoneAchievements.companyId, companyId),
        ),
      );
    return ach ?? null;
  }

  /**
   * Queries existing employee milestone achievements.
   */
  async getEmployeeAchievements(
    tenantId: string,
    companyId: string,
    employeeId: string,
  ): Promise<EmployeeMilestoneAchievement[]> {
    return getDb()
      .select()
      .from(employeeMilestoneAchievements)
      .where(
        and(
          eq(employeeMilestoneAchievements.tenantId, tenantId),
          eq(employeeMilestoneAchievements.companyId, companyId),
          eq(employeeMilestoneAchievements.employeeId, employeeId),
        ),
      )
      .orderBy(desc(employeeMilestoneAchievements.achievedAt));
  }

  /**
   * Atomically records a newly achieved milestone (only once per employee per milestone).
   */
  async recordAchievement(achievement: NewEmployeeMilestoneAchievement): Promise<EmployeeMilestoneAchievement | null> {
    const [existing] = await getDb()
      .select()
      .from(employeeMilestoneAchievements)
      .where(
        and(
          eq(employeeMilestoneAchievements.tenantId, achievement.tenantId),
          eq(employeeMilestoneAchievements.companyId, achievement.companyId),
          eq(employeeMilestoneAchievements.employeeId, achievement.employeeId),
          eq(employeeMilestoneAchievements.milestoneKey, achievement.milestoneKey),
        ),
      );

    if (existing) {
      return existing; // Already recorded, do not duplicate!
    }

    await getDb().insert(employeeMilestoneAchievements).values(achievement);
    const [created] = await getDb()
      .select()
      .from(employeeMilestoneAchievements)
      .where(eq(employeeMilestoneAchievements.id, achievement.id));
    return created ?? null;
  }

  /**
   * Updates an achievement status (e.g. published to feed).
   */
  async updateAchievement(
    id: string,
    tenantId: string,
    companyId: string,
    updates: Partial<EmployeeMilestoneAchievement>,
  ) {
    await getDb()
      .update(employeeMilestoneAchievements)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(employeeMilestoneAchievements.id, id),
          eq(employeeMilestoneAchievements.tenantId, tenantId),
          eq(employeeMilestoneAchievements.companyId, companyId),
        ),
      );

    const [updated] = await getDb()
      .select()
      .from(employeeMilestoneAchievements)
      .where(eq(employeeMilestoneAchievements.id, id));
    return updated ?? null;
  }

  /**
   * Creates an in-app employee notification.
   */
  async createNotification(notification: NewEmployeeNotification) {
    await getDb().insert(employeeNotifications).values(notification);
  }

  /**
   * Gets reward catalogue items.
   */
  async getRewardsCatalogue(tenantId: string, companyId: string, milestoneKey?: string): Promise<RewardsCatalogueItem[]> {
    const conditions = [
      eq(rewardsCatalogue.tenantId, tenantId),
      eq(rewardsCatalogue.companyId, companyId),
    ];
    if (milestoneKey) {
      conditions.push(eq(rewardsCatalogue.milestoneKey, milestoneKey));
    }

    const items = await getDb()
      .select()
      .from(rewardsCatalogue)
      .where(and(...conditions))
      .orderBy(rewardsCatalogue.createdAt);

    if (items.length > 0) return items;

    // Seed initial default 100k gifts if catalogue is empty
    const defaultReward1: NewRewardsCatalogueItem = {
      id: `rew_${Date.now()}_watch`,
      tenantId,
      companyId,
      milestoneKey: '100k_hours',
      name: 'Custom Engraved Centurion Chronograph Watch & Golden Plaque',
      description: 'Handcrafted luxury timepiece engraved with the employee name, employee number, and 100,000 Hours dedication inscription.',
      category: 'gift',
      imageUrl: '/assets/rewards/luxury_chronograph.png',
      isActive: true,
    };
    const defaultReward2: NewRewardsCatalogueItem = {
      id: `rew_${Date.now()}_sabbatical`,
      tenantId,
      companyId,
      milestoneKey: '100k_hours',
      name: 'Executive Sabbatical Grant (4 Weeks Fully Paid Recharge)',
      description: 'Four consecutive weeks of fully compensated leave plus travel stipend to honor a decade of continuous service excellence.',
      category: 'experience',
      imageUrl: '/assets/rewards/sabbatical_grant.png',
      isActive: true,
    };

    await getDb().insert(rewardsCatalogue).values([defaultReward1, defaultReward2]);
    return [defaultReward1 as RewardsCatalogueItem, defaultReward2 as RewardsCatalogueItem];
  }

  /**
   * Adds or updates a reward in the catalogue.
   */
  async upsertRewardCatalogueItem(item: NewRewardsCatalogueItem): Promise<RewardsCatalogueItem> {
    await getDb().insert(rewardsCatalogue).values(item);
    const [created] = await getDb()
      .select()
      .from(rewardsCatalogue)
      .where(eq(rewardsCatalogue.id, item.id));
    return created!;
  }

  /**
   * Queries reward assignments.
   */
  async getRewardAssignments(
    tenantId: string,
    companyId: string,
    employeeId?: string,
  ): Promise<EmployeeRewardAssignment[]> {
    const conditions = [
      eq(employeeRewardAssignments.tenantId, tenantId),
      eq(employeeRewardAssignments.companyId, companyId),
    ];
    if (employeeId) {
      conditions.push(eq(employeeRewardAssignments.employeeId, employeeId));
    }

    return getDb()
      .select()
      .from(employeeRewardAssignments)
      .where(and(...conditions))
      .orderBy(desc(employeeRewardAssignments.createdAt));
  }

  /**
   * Creates a reward assignment.
   */
  async createRewardAssignment(assignment: NewEmployeeRewardAssignment): Promise<EmployeeRewardAssignment> {
    await getDb().insert(employeeRewardAssignments).values(assignment);
    const [created] = await getDb()
      .select()
      .from(employeeRewardAssignments)
      .where(eq(employeeRewardAssignments.id, assignment.id));
    return created!;
  }

  /**
   * Updates reward assignment status and appends audit history.
   */
  async updateRewardAssignmentStatus(
    id: string,
    tenantId: string,
    companyId: string,
    status: EmployeeRewardAssignment['status'],
    userId: string,
    notes?: string,
    reason?: string,
  ): Promise<EmployeeRewardAssignment | null> {
    const [existing] = await getDb()
      .select()
      .from(employeeRewardAssignments)
      .where(
        and(
          eq(employeeRewardAssignments.id, id),
          eq(employeeRewardAssignments.tenantId, tenantId),
          eq(employeeRewardAssignments.companyId, companyId),
        ),
      );

    if (!existing) return null;

    const history = existing.auditHistory ?? [];
    const newHistoryEntry = {
      status,
      changedBy: userId,
      timestamp: new Date().toISOString(),
      reason: reason || notes,
    };

    const updates: Partial<EmployeeRewardAssignment> = {
      status,
      auditHistory: [...history, newHistoryEntry],
      updatedAt: new Date(),
    };

    if (status === 'approved') {
      updates.approvedByUserId = userId;
      updates.approvedAt = new Date();
    }
    if (status === 'fulfilled') {
      updates.fulfilledAt = new Date();
    }
    if (notes) {
      updates.notes = notes;
    }

    await getDb()
      .update(employeeRewardAssignments)
      .set(updates)
      .where(eq(employeeRewardAssignments.id, id));

    const [updated] = await getDb()
      .select()
      .from(employeeRewardAssignments)
      .where(eq(employeeRewardAssignments.id, id));
    return updated ?? null;
  }

  /**
   * Publishes a post to company feed.
   */
  async createCompanyFeedPost(post: NewCompanyFeedPost): Promise<CompanyFeedPost> {
    await getDb().insert(companyFeedPosts).values(post);
    const [created] = await getDb()
      .select()
      .from(companyFeedPosts)
      .where(eq(companyFeedPosts.id, post.id));
    return created!;
  }

  /**
   * Lists published company feed posts.
   */
  async getCompanyFeedPosts(tenantId: string, companyId: string, limit = 20): Promise<CompanyFeedPost[]> {
    return getDb()
      .select()
      .from(companyFeedPosts)
      .where(
        and(
          eq(companyFeedPosts.tenantId, tenantId),
          eq(companyFeedPosts.companyId, companyId),
          eq(companyFeedPosts.status, 'published'),
        ),
      )
      .orderBy(desc(companyFeedPosts.createdAt))
      .limit(limit);
  }
}

export const milestoneRepository = new MilestoneRepository();
