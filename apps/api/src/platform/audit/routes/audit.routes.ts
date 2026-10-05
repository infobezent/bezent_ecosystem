import { Router } from 'express';
import { auditController } from '../controller/audit.controller.js';
import { requirePlatformAuth, requireSuperAdmin } from '../../auth/middleware/auth.middleware.js';

export const auditRouter = Router();

auditRouter.get('/audit-logs', requirePlatformAuth, requireSuperAdmin, auditController.list);
auditRouter.get('/audit', requirePlatformAuth, requireSuperAdmin, auditController.list);
