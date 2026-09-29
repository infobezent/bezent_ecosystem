import { Router } from 'express';
import { dashboardController } from '../controller/dashboard.controller.js';
import { requirePlatformAuth, requireSuperAdmin } from '../../auth/middleware/auth.middleware.js';

export const dashboardRouter = Router();

dashboardRouter.use(requirePlatformAuth, requireSuperAdmin);

dashboardRouter.get('/dashboard/overview', dashboardController.getOverview);
