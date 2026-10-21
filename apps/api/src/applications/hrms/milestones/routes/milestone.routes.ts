import { Router } from 'express';
import { MilestoneController } from '../controller/milestone.controller.js';
import { requirePermission } from '../../../../platform/access/middleware/access.middleware.js';

export const milestoneRouter = Router();
const controller = new MilestoneController();

// 1. Employee Working Hours & Milestones
milestoneRouter.get(
  '/hrms/milestones/working-hours/:employeeId',
  requirePermission('hrms.employees.view'),
  controller.getEmployeeWorkingHours,
);

milestoneRouter.get(
  '/hrms/milestones/employee/:employeeId',
  requirePermission('hrms.employees.view'),
  controller.getEmployeeMilestones,
);

milestoneRouter.post(
  '/hrms/milestones/employee/:employeeId/evaluate',
  requirePermission('hrms.employees.view'),
  controller.evaluateEmployeeMilestones,
);

// 2. Poster Publishing
milestoneRouter.post(
  '/hrms/milestones/achievements/:achievementId/publish-poster',
  requirePermission('hrms.employees.edit'),
  controller.publishAchievementPoster,
);

// 3. Milestone Configurations
milestoneRouter.get(
  '/hrms/milestones/configs',
  requirePermission('hrms.settings.view'),
  controller.getMilestoneConfigs,
);

milestoneRouter.put(
  '/hrms/milestones/configs',
  requirePermission('hrms.settings.manage'),
  controller.updateMilestoneConfig,
);

// 4. Rewards Catalogue & Assignments
milestoneRouter.get(
  '/hrms/milestones/rewards/catalogue',
  requirePermission('hrms.settings.view'),
  controller.getRewardsCatalogue,
);

milestoneRouter.post(
  '/hrms/milestones/rewards/catalogue',
  requirePermission('hrms.settings.manage'),
  controller.addRewardCatalogueItem,
);

milestoneRouter.get(
  '/hrms/milestones/rewards/assignments',
  requirePermission('hrms.employees.view'),
  controller.getRewardAssignments,
);

milestoneRouter.post(
  '/hrms/milestones/rewards/assign',
  requirePermission('hrms.employees.edit'),
  controller.assignReward,
);

milestoneRouter.patch(
  '/hrms/milestones/rewards/assignments/:assignmentId/status',
  requirePermission('hrms.employees.edit'),
  controller.updateRewardStatus,
);

// 5. Company Feed Posts
milestoneRouter.get(
  '/hrms/milestones/feed',
  requirePermission('hrms.dashboard.view'),
  controller.getCompanyFeedPosts,
);
