import { Router } from 'express';
import { moduleController } from '../controller/module.controller.js';
import { requirePlatformAuth, requireSuperAdmin } from '../../auth/middleware/auth.middleware.js';

export const moduleRouter = Router();

moduleRouter.use(requirePlatformAuth, requireSuperAdmin);

moduleRouter.get('/modules/catalog', moduleController.getCatalog);
moduleRouter.get('/modules', moduleController.listTenantModules);
moduleRouter.post('/modules/enable', moduleController.enable);
moduleRouter.post('/modules/disable', moduleController.disable);
