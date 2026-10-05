import { Router } from 'express';
import { moduleController } from '../controller/module.controller.js';
import { requirePlatformAuth, requireSuperAdmin } from '../../auth/middleware/auth.middleware.js';

export const moduleRouter = Router();

moduleRouter.use(requirePlatformAuth, requireSuperAdmin);

moduleRouter.get('/modules/catalog', moduleController.getCatalog);
moduleRouter.get('/modules', moduleController.listTenantModules);
moduleRouter.get('/modules/tenants/:tenantId', (req, res, next) => {
  req.query.tenantId = req.params.tenantId;
  moduleController.listTenantModules(req, res, next);
});
moduleRouter.post('/modules/enable', moduleController.enable);
moduleRouter.post('/modules/tenants/:tenantId/enable', (req, res, next) => {
  req.body = { ...req.body, tenantId: req.params.tenantId };
  moduleController.enable(req, res, next);
});
moduleRouter.post('/modules/disable', moduleController.disable);
moduleRouter.post('/modules/tenants/:tenantId/disable', (req, res, next) => {
  req.body = { ...req.body, tenantId: req.params.tenantId };
  moduleController.disable(req, res, next);
});
