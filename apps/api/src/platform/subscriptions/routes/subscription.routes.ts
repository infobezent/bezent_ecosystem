import { Router } from 'express';
import { subscriptionController } from '../controller/subscription.controller.js';
import { requirePlatformAuth, requireSuperAdmin } from '../../auth/middleware/auth.middleware.js';

export const subscriptionRouter = Router();

subscriptionRouter.use(requirePlatformAuth, requireSuperAdmin);

subscriptionRouter.get('/subscriptions', subscriptionController.list);
subscriptionRouter.get('/subscriptions/:id', subscriptionController.getById);
subscriptionRouter.patch('/subscriptions/:id', subscriptionController.update);
subscriptionRouter.put('/subscriptions/:id', subscriptionController.update);

subscriptionRouter.post('/subscriptions/:id/activate', subscriptionController.activate);
subscriptionRouter.post('/subscriptions/:id/renew', subscriptionController.renew);
subscriptionRouter.post('/subscriptions/:id/cancel', subscriptionController.cancel);

// Tenant-scoped routes for subscriptions
subscriptionRouter.get('/tenants/:tenantId/subscriptions', subscriptionController.listByTenant);
subscriptionRouter.post('/tenants/:tenantId/subscriptions', subscriptionController.create);
