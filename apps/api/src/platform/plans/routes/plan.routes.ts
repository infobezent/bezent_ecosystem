import { Router } from 'express';
import { planController } from '../controller/plan.controller.js';
import { requirePlatformAuth, requireSuperAdmin } from '../../auth/middleware/auth.middleware.js';

import { moduleController } from '../../modules/controller/module.controller.js';

export const planRouter = Router();

planRouter.use(requirePlatformAuth, requireSuperAdmin);

planRouter.get('/plans', planController.list);
planRouter.post('/plans', planController.create);
planRouter.get('/plans/:id', planController.getById);
planRouter.get('/plans/:id/modules', moduleController.getPlanModules);
planRouter.patch('/plans/:id', planController.update);
planRouter.put('/plans/:id', planController.update);

planRouter.post('/plans/:id/prices', planController.addPrice);
planRouter.patch('/plans/prices/:priceId', planController.updatePrice);
planRouter.put('/plans/prices/:priceId', planController.updatePrice);
