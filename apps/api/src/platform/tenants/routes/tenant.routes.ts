import { Router } from 'express';
import { tenantController } from '../controller/tenant.controller.js';
import { requirePlatformAuth, requireSuperAdmin } from '../../auth/middleware/auth.middleware.js';

export const tenantRouter = Router();

tenantRouter.use(requirePlatformAuth, requireSuperAdmin);

tenantRouter.get('/tenants', tenantController.list);
tenantRouter.post('/tenants', tenantController.create);
tenantRouter.get('/tenants/:id', tenantController.getById);
tenantRouter.put('/tenants/:id', tenantController.update);
tenantRouter.post('/tenants/:id/activate', tenantController.activate);
tenantRouter.post('/tenants/:id/reactivate', tenantController.activate);
tenantRouter.post('/tenants/:id/suspend', tenantController.suspend);
