import { Router } from 'express';
import { companyAdminController } from '../controller/companyAdmin.controller.js';
import { requirePlatformAuth, requireSuperAdmin } from '../../auth/middleware/auth.middleware.js';

export const companyAdminRouter = Router();

companyAdminRouter.use(requirePlatformAuth, requireSuperAdmin);

companyAdminRouter.get('/company-admins', companyAdminController.list);
companyAdminRouter.post('/company-admins/assign', companyAdminController.assign);
companyAdminRouter.post('/company-admins/:membershipId/revoke', companyAdminController.revoke);
