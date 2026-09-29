import { Router } from 'express';
import { accessController } from '../controller/access.controller.js';
import { requirePlatformAuth } from '../../auth/middleware/auth.middleware.js';
import { requireCompanyContext } from '../middleware/access.middleware.js';

export const accessRouter = Router();

// The signed-in user's authorized companies and workspaces (launcher / switcher).
accessRouter.get('/access', requirePlatformAuth, accessController.getOverview);

// Validated access for the selected company (X-Company-Id), re-checked server-side.
accessRouter.get(
  '/access/context',
  requirePlatformAuth,
  requireCompanyContext,
  accessController.getCompanyContext,
);

// Permission directory (platform permissions are shown to Super Admin only).
accessRouter.get(
  '/access/permissions',
  requirePlatformAuth,
  accessController.getPermissionDirectory,
);
