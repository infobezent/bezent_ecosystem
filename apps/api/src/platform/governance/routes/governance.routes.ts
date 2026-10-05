import { Router } from 'express';
import { governanceController } from '../controller/governance.controller.js';
import { requirePlatformAuth, requireSuperAdmin } from '../../auth/middleware/auth.middleware.js';

export const governanceRouter = Router();

governanceRouter.get(
  '/governance/summary',
  requirePlatformAuth,
  requireSuperAdmin,
  governanceController.getSummary,
);

governanceRouter.get(
  '/settings/overview',
  requirePlatformAuth,
  requireSuperAdmin,
  governanceController.getSummary,
);
