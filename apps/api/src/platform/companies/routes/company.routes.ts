import { Router } from 'express';
import { companyController } from '../controller/company.controller.js';
import { requirePlatformAuth, requireSuperAdmin } from '../../auth/middleware/auth.middleware.js';

export const companyRouter = Router();

companyRouter.use(requirePlatformAuth, requireSuperAdmin);

companyRouter.get('/companies', companyController.list);
companyRouter.post('/companies', companyController.create);
companyRouter.get('/companies/:id', companyController.getById);
companyRouter.put('/companies/:id', companyController.update);
companyRouter.post('/companies/:id/activate', companyController.activate);
companyRouter.post('/companies/:id/suspend', companyController.suspend);
