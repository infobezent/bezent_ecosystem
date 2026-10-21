import { randomUUID } from 'crypto';
import { AppError } from '../../../../app/errors/AppError.js';
import { MilestoneRepository } from '../repository/milestone.repository.js';
import { WorkingHoursService } from './workingHours.service.js';
import type {
  EmployeeMilestoneOverview,
  MilestoneProgressItem,
  RewardCatalogueItemInput,
  UpdateMilestoneConfigDto,
  UpdateRewardStatusDto,
} from '../types/milestone.types.js';
import type {
  EmployeeMilestoneAchievement,
  EmployeeRewardAssignment,
  MilestoneConfig,
  NewCompanyFeedPost,
  NewEmployeeMilestoneAchievement,
  NewEmployeeNotification,
  NewEmployeeRewardAssignment,
  NewMilestoneConfig,
  NewRewardsCatalogueItem,
  RewardsCatalogueItem,
} from '../../../../db/schema.js';

export class MilestoneService {
  constructor(
    private readonly repo = new MilestoneRepository(),
    private readonly hoursService = new WorkingHoursService(),
  ) {}

  /**
   * Retrieves comprehensive working hours, milestones progress, achievements,
   * badges, and reward status for an employee.
   */
  async getEmployeeMilestoneOverview(
    tenantId: string,
    companyId: string,
    employeeId: string,
  ): Promise<EmployeeMilestoneOverview> {
    const [workingHours, configs, existingAchievements, rewardAssignments] = await Promise.all([
      this.hoursService.calculateWorkingHours(tenantId, companyId, employeeId),
      this.repo.getMilestoneConfigs(tenantId, companyId),
      this.repo.getEmployeeAchievements(tenantId, companyId, employeeId),
      this.repo.getRewardAssignments(tenantId, companyId, employeeId),
    ]);

    const achievementsMap = new Map(existingAchievements.map((a) => [a.milestoneKey, a]));

    const milestones: MilestoneProgressItem[] = configs.map((cfg) => {
      const achievement = achievementsMap.get(cfg.milestoneKey);
      const isAchieved = Boolean(achievement);
      const percentComplete = Math.min(
        100,
        Number(((workingHours.lifetimeHours / cfg.requiredHours) * 100).toFixed(1)),
      );

      return {
        milestoneKey: cfg.milestoneKey,
        title: cfg.title,
        description: cfg.description,
        requiredHours: cfg.requiredHours,
        badgeIcon: cfg.badgeIcon,
        badgeLabel: cfg.badgeLabel,
        currentHours: workingHours.lifetimeHours,
        percentComplete,
        isAchieved,
        achievedAt: achievement?.achievedAt ? achievement.achievedAt.toISOString() : null,
        status: achievement?.status ?? null,
        posterData: (achievement?.posterData as MilestoneProgressItem['posterData']) ?? null,
        achievementId: achievement?.id ?? null,
      };
    });

    return {
      employeeId,
      workingHours,
      milestones,
      achievements: existingAchievements.map((a) => ({
        id: a.id,
        milestoneKey: a.milestoneKey,
        milestoneTitle: a.milestoneTitle,
        milestoneHours: a.milestoneHours,
        achievedHours: Number(a.achievedHours),
        status: a.status,
        achievedAt: a.achievedAt.toISOString(),
        posterPublishedAt: a.posterPublishedAt ? a.posterPublishedAt.toISOString() : null,
        posterData: a.posterData,
      })),
      rewardAssignments: rewardAssignments.map((r) => ({
        id: r.id,
        achievementId: r.achievementId,
        rewardId: r.rewardId,
        rewardName: r.rewardName,
        status: r.status,
        approvedAt: r.approvedAt ? r.approvedAt.toISOString() : null,
        fulfilledAt: r.fulfilledAt ? r.fulfilledAt.toISOString() : null,
        notes: r.notes,
        auditHistory: r.auditHistory,
      })),
    };
  }

  /**
   * Evaluates if an employee has crossed any active milestone threshold (e.g. 100,000 hours).
   * Unlocks achievement ONLY ONCE per milestone, creates an in-app notification,
   * generates a recognition poster draft, and creates an eligible reward assignment.
   */
  async evaluateEmployeeMilestones(
    tenantId: string,
    companyId: string,
    employeeId: string,
  ): Promise<EmployeeMilestoneOverview> {
    const workingHours = await this.hoursService.calculateWorkingHours(
      tenantId,
      companyId,
      employeeId,
    );
    const configs = await this.repo.getMilestoneConfigs(tenantId, companyId);
    const existingAchievements = await this.repo.getEmployeeAchievements(
      tenantId,
      companyId,
      employeeId,
    );
    const achievedKeys = new Set(existingAchievements.map((a) => a.milestoneKey));

    const employeeContext = await this.repo.getEmployeeWithContext(tenantId, companyId, employeeId);
    if (!employeeContext) {
      throw new AppError('Employee not found in this company context', 404, 'EMPLOYEE_NOT_FOUND');
    }

    const { employee, company, designationTitle, departmentName, profilePhotoUrl } =
      employeeContext;
    const employeeFullName = [employee.firstName, employee.lastName].filter(Boolean).join(' ');

    for (const cfg of configs) {
      if (
        cfg.isActive &&
        workingHours.lifetimeHours >= cfg.requiredHours &&
        !achievedKeys.has(cfg.milestoneKey)
      ) {
        // Unlock new achievement
        const achievementId = `msach_${Date.now()}_${randomUUID().slice(0, 8)}`;
        const achievedDate = new Date().toISOString().slice(0, 10);

        const posterData = {
          employeeName: employeeFullName,
          employeeNumber: employee.employeeNumber,
          designation: designationTitle || 'Distinguished Contributor',
          department: departmentName || 'Company Workforce',
          companyName: company.name,
          photoUrl: profilePhotoUrl || undefined,
          milestoneHours: cfg.requiredHours,
          milestoneTitle: cfg.title,
          achievedDate,
          publishedToFeed: false,
        };

        const newAchievement: NewEmployeeMilestoneAchievement = {
          id: achievementId,
          tenantId,
          companyId,
          employeeId,
          milestoneKey: cfg.milestoneKey,
          milestoneTitle: cfg.title,
          milestoneHours: cfg.requiredHours,
          achievedHours: String(workingHours.lifetimeHours),
          status: 'unlocked',
          posterData,
        };

        const created = await this.repo.recordAchievement(newAchievement);

        if (created) {
          achievedKeys.add(cfg.milestoneKey);

          // Create In-App Notification (Feature 3 Requirement 4)
          const notification: NewEmployeeNotification = {
            id: `notif_${Date.now()}_${randomUUID().slice(0, 8)}`,
            tenantId,
            companyId,
            employeeId,
            title: `Milestone Unlocked: ${cfg.title}! 🏆`,
            message: `Congratulations ${employee.firstName}! You have officially achieved ${cfg.requiredHours.toLocaleString()} verified lifetime working hours at ${company.name}. Your dedication is celebrated company-wide.`,
            type: 'success',
            link: `/hrms/administration/employees/${employeeId}?tab=milestones`,
          };
          await this.repo.createNotification(notification);

          // Seed default reward assignment if catalogue has items (Feature 3 Requirement 7)
          const catalogue = await this.repo.getRewardsCatalogue(
            tenantId,
            companyId,
            cfg.milestoneKey,
          );
          if (catalogue.length > 0 && catalogue[0]) {
            const reward = catalogue[0];
            const assignment: NewEmployeeRewardAssignment = {
              id: `rwass_${Date.now()}_${randomUUID().slice(0, 8)}`,
              tenantId,
              companyId,
              employeeId,
              achievementId,
              rewardId: reward.id,
              rewardName: reward.name,
              status: 'eligible',
              auditHistory: [
                {
                  status: 'eligible',
                  changedBy: 'system',
                  timestamp: new Date().toISOString(),
                  reason: `Milestone ${cfg.title} reached with ${workingHours.lifetimeHours} verified hours.`,
                },
              ],
            };
            await this.repo.createRewardAssignment(assignment);
          }
        }
      }
    }

    return this.getEmployeeMilestoneOverview(tenantId, companyId, employeeId);
  }

  /**
   * Reviews and publishes the milestone recognition poster to the Company Feed.
   * Feature 3 Requirement 6: "Allow the poster to be reviewed and published to the existing company feed."
   */
  async publishAchievementPoster(
    tenantId: string,
    companyId: string,
    achievementId: string,
    userId: string,
  ): Promise<{ achievement: EmployeeMilestoneAchievement; feedPostId: string }> {
    const achievement = await this.repo.getAchievementById(achievementId, tenantId, companyId);
    if (!achievement) {
      throw new AppError('Achievement record not found', 404, 'ACHIEVEMENT_NOT_FOUND');
    }

    if (achievement.status === 'published' && achievement.feedPostId) {
      return { achievement, feedPostId: achievement.feedPostId };
    }

    const poster = achievement.posterData as {
      employeeName: string;
      employeeNumber?: string;
      designation?: string;
      department?: string;
      companyName: string;
      photoUrl?: string;
      milestoneHours: number;
      milestoneTitle: string;
      achievedDate: string;
    } | null;

    const employeeName = poster?.employeeName || 'Our Colleague';
    const milestoneHours = poster?.milestoneHours || achievement.milestoneHours;
    const designation = poster?.designation ? ` (${poster.designation})` : '';

    const feedPostId = `feed_${Date.now()}_${randomUUID().slice(0, 8)}`;
    const feedPost: NewCompanyFeedPost = {
      id: feedPostId,
      tenantId,
      companyId,
      authorId: userId,
      type: 'milestone_poster',
      title: `Honoring ${employeeName} for ${milestoneHours.toLocaleString()} Lifetime Hours! 🌟`,
      subtitle: `Milestone Achievement • ${achievement.milestoneTitle}`,
      message: `Join us in giving a warm standing ovation to ${employeeName}${designation} for achieving an extraordinary career landmark of ${milestoneHours.toLocaleString()} verified lifetime working hours at ${poster?.companyName || 'our company'}! Thank you for your tireless dedication, craftsmanship, and leadership.`,
      badge: `${milestoneHours.toLocaleString()} Hours Milestone`,
      posterImageUrl: poster?.photoUrl || undefined,
      likesCount: 5,
      commentsCount: 1,
      status: 'published',
      metadata: {
        achievementId: achievement.id,
        employeeId: achievement.employeeId,
        milestoneHours,
        milestoneTitle: achievement.milestoneTitle,
      },
    };

    const createdPost = await this.repo.createCompanyFeedPost(feedPost);
    const publishedFeedId = createdPost?.id || feedPostId;

    const updatedPosterData = poster
      ? {
          ...poster,
          publishedToFeed: true,
        }
      : null;

    const updatedAchievement = await this.repo.updateAchievement(
      achievement.id,
      tenantId,
      companyId,
      {
        status: 'published',
        posterPublishedAt: new Date(),
        feedPostId: publishedFeedId,
        posterData: updatedPosterData,
      },
    );

    return {
      achievement: updatedAchievement ?? achievement,
      feedPostId: publishedFeedId,
    };
  }

  /**
   * Retrieves or initializes company milestone configurations.
   */
  async getMilestoneConfigs(tenantId: string, companyId: string): Promise<MilestoneConfig[]> {
    return this.repo.getMilestoneConfigs(tenantId, companyId);
  }

  /**
   * Updates or adds a milestone configuration.
   */
  async updateMilestoneConfig(
    tenantId: string,
    companyId: string,
    dto: UpdateMilestoneConfigDto,
  ): Promise<MilestoneConfig> {
    const config: NewMilestoneConfig = {
      id: `mcfg_${Date.now()}_${dto.milestoneKey}`,
      tenantId,
      companyId,
      milestoneKey: dto.milestoneKey,
      title: dto.title,
      description: dto.description ?? null,
      requiredHours: dto.requiredHours,
      badgeIcon: dto.badgeIcon || 'award',
      badgeLabel: dto.badgeLabel || 'Centurion of Service',
      posterTemplate: dto.posterTemplate ?? null,
      approvalRequired: dto.approvalRequired ?? true,
      isActive: dto.isActive ?? true,
    };
    return this.repo.upsertMilestoneConfig(config);
  }

  /**
   * Retrieves catalogue of milestone rewards.
   */
  async getRewardsCatalogue(
    tenantId: string,
    companyId: string,
    milestoneKey?: string,
  ): Promise<RewardsCatalogueItem[]> {
    return this.repo.getRewardsCatalogue(tenantId, companyId, milestoneKey);
  }

  /**
   * Adds an item to the rewards catalogue.
   */
  async addRewardCatalogueItem(
    tenantId: string,
    companyId: string,
    item: RewardCatalogueItemInput,
  ): Promise<RewardsCatalogueItem> {
    const newItem: NewRewardsCatalogueItem = {
      id: `rew_${Date.now()}_${randomUUID().slice(0, 8)}`,
      tenantId,
      companyId,
      milestoneKey: item.milestoneKey,
      name: item.name,
      description: item.description ?? null,
      category: item.category || 'gift',
      imageUrl: item.imageUrl ?? null,
      isActive: item.isActive ?? true,
    };
    return this.repo.upsertRewardCatalogueItem(newItem);
  }

  /**
   * Retrieves reward assignments.
   */
  async getRewardAssignments(
    tenantId: string,
    companyId: string,
    employeeId?: string,
  ): Promise<EmployeeRewardAssignment[]> {
    return this.repo.getRewardAssignments(tenantId, companyId, employeeId);
  }

  /**
   * Assigns a reward from catalogue to an employee achievement.
   */
  async assignReward(
    tenantId: string,
    companyId: string,
    employeeId: string,
    achievementId: string,
    rewardId: string,
    userId: string,
    notes?: string,
  ): Promise<EmployeeRewardAssignment> {
    const catalogue = await this.repo.getRewardsCatalogue(tenantId, companyId);
    const reward = catalogue.find((r) => r.id === rewardId);
    if (!reward) {
      throw new AppError('Reward catalogue item not found', 404, 'REWARD_NOT_FOUND');
    }

    const assignment: NewEmployeeRewardAssignment = {
      id: `rwass_${Date.now()}_${randomUUID().slice(0, 8)}`,
      tenantId,
      companyId,
      employeeId,
      achievementId,
      rewardId,
      rewardName: reward.name,
      status: 'pending_approval',
      notes: notes ?? null,
      auditHistory: [
        {
          status: 'pending_approval',
          changedBy: userId,
          timestamp: new Date().toISOString(),
          reason: 'Reward selected and submitted for manager/admin approval.',
        },
      ],
    };

    return this.repo.createRewardAssignment(assignment);
  }

  /**
   * Updates reward assignment status (approval, fulfilment, etc.) with auditable history.
   */
  async updateRewardStatus(
    tenantId: string,
    companyId: string,
    assignmentId: string,
    userId: string,
    dto: UpdateRewardStatusDto,
  ): Promise<EmployeeRewardAssignment> {
    const updated = await this.repo.updateRewardAssignmentStatus(
      assignmentId,
      tenantId,
      companyId,
      dto.status,
      userId,
      dto.notes,
      dto.reason,
    );
    if (!updated) {
      throw new AppError('Reward assignment record not found', 404, 'ASSIGNMENT_NOT_FOUND');
    }
    return updated;
  }

  /**
   * Lists published feed posts for the company feed.
   */
  async getCompanyFeedPosts(tenantId: string, companyId: string) {
    return this.repo.getCompanyFeedPosts(tenantId, companyId);
  }
}
