import { Router } from 'express';
import { dashboardController } from '../controller/dashboard.controller.js';
import { requirePlatformAuth, requireSuperAdmin } from '../../auth/middleware/auth.middleware.js';

export const dashboardRouter = Router();

dashboardRouter.get(
  '/dashboard/overview',
  requirePlatformAuth,
  requireSuperAdmin,
  dashboardController.getOverview,
);
