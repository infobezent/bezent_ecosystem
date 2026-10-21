import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../../../../app/errors/AppError.js';
import { MilestoneService } from '../service/milestone.service.js';
import { WorkingHoursService } from '../service/workingHours.service.js';

export class MilestoneController {
  constructor(
    private readonly milestoneService = new MilestoneService(),
    private readonly workingHoursService = new WorkingHoursService(),
  ) {}

  private getContext(req: Request) {
    const ctx = req.companyContext;
    if (!ctx) {
      throw new AppError('Company context not resolved', 400, 'CONTEXT_MISSING');
    }
    return ctx;
  }

  private getParam(req: Request, name: string): string {
    const val = req.params[name];
    if (!val) {
      throw new AppError(`${name} is required`, 400, 'MISSING_PARAM');
    }
    const resolved = Array.isArray(val) ? val[0] : val;
    if (!resolved) {
      throw new AppError(`${name} is required`, 400, 'MISSING_PARAM');
    }
    return resolved;
  }

  getEmployeeWorkingHours = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = this.getContext(req);
      const employeeId = this.getParam(req, 'employeeId');
      const summary = await this.workingHoursService.calculateWorkingHours(
        tenantId,
        companyId,
        employeeId,
      );
      res.json({ data: summary });
    } catch (err) {
      next(err);
    }
  };

  getEmployeeMilestones = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = this.getContext(req);
      const employeeId = this.getParam(req, 'employeeId');
      const overview = await this.milestoneService.getEmployeeMilestoneOverview(
        tenantId,
        companyId,
        employeeId,
      );
      res.json({ data: overview });
    } catch (err) {
      next(err);
    }
  };

  evaluateEmployeeMilestones = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = this.getContext(req);
      const employeeId = this.getParam(req, 'employeeId');
      const overview = await this.milestoneService.evaluateEmployeeMilestones(
        tenantId,
        companyId,
        employeeId,
      );
      res.json({ data: overview, message: 'Milestone evaluation completed successfully.' });
    } catch (err) {
      next(err);
    }
  };

  publishAchievementPoster = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = this.getContext(req);
      const achievementId = this.getParam(req, 'achievementId');
      const userId = (req as unknown as { user?: { id?: string } })?.user?.id || 'admin_user';
      const result = await this.milestoneService.publishAchievementPoster(
        tenantId,
        companyId,
        achievementId,
        userId,
      );
      res.json({
        data: result.achievement,
        feedPostId: result.feedPostId,
        message: 'Recognition poster published to company feed successfully.',
      });
    } catch (err) {
      next(err);
    }
  };

  getMilestoneConfigs = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = this.getContext(req);
      const configs = await this.milestoneService.getMilestoneConfigs(tenantId, companyId);
      res.json({ data: configs });
    } catch (err) {
      next(err);
    }
  };

  updateMilestoneConfig = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = this.getContext(req);
      const config = await this.milestoneService.updateMilestoneConfig(
        tenantId,
        companyId,
        req.body,
      );
      res.json({ data: config, message: 'Milestone configuration saved.' });
    } catch (err) {
      next(err);
    }
  };

  getRewardsCatalogue = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = this.getContext(req);
      const milestoneKey = req.query.milestoneKey as string | undefined;
      const items = await this.milestoneService.getRewardsCatalogue(
        tenantId,
        companyId,
        milestoneKey,
      );
      res.json({ data: items });
    } catch (err) {
      next(err);
    }
  };

  addRewardCatalogueItem = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = this.getContext(req);
      const item = await this.milestoneService.addRewardCatalogueItem(
        tenantId,
        companyId,
        req.body,
      );
      res.status(201).json({ data: item, message: 'Reward catalogue item created.' });
    } catch (err) {
      next(err);
    }
  };

  getRewardAssignments = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = this.getContext(req);
      const employeeId = req.query.employeeId as string | undefined;
      const assignments = await this.milestoneService.getRewardAssignments(
        tenantId,
        companyId,
        employeeId,
      );
      res.json({ data: assignments });
    } catch (err) {
      next(err);
    }
  };

  assignReward = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = this.getContext(req);
      const { employeeId, achievementId, rewardId, notes } = req.body;
      if (!employeeId || !achievementId || !rewardId) {
        throw new AppError(
          'employeeId, achievementId, and rewardId are required',
          400,
          'MISSING_FIELDS',
        );
      }

      const userId = (req as unknown as { user?: { id?: string } })?.user?.id || 'admin_user';
      const assignment = await this.milestoneService.assignReward(
        tenantId,
        companyId,
        employeeId,
        achievementId,
        rewardId,
        userId,
        notes,
      );
      res.status(201).json({ data: assignment, message: 'Reward assigned successfully.' });
    } catch (err) {
      next(err);
    }
  };

  updateRewardStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = this.getContext(req);
      const assignmentId = this.getParam(req, 'assignmentId');
      const userId = (req as unknown as { user?: { id?: string } })?.user?.id || 'admin_user';
      const updated = await this.milestoneService.updateRewardStatus(
        tenantId,
        companyId,
        assignmentId,
        userId,
        req.body,
      );
      res.json({
        data: updated,
        message: `Reward assignment status updated to ${req.body.status}.`,
      });
    } catch (err) {
      next(err);
    }
  };

  getCompanyFeedPosts = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = this.getContext(req);
      const posts = await this.milestoneService.getCompanyFeedPosts(tenantId, companyId);
      res.json({ data: posts });
    } catch (err) {
      next(err);
    }
  };
}
