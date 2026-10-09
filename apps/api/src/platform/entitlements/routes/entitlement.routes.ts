import { Router } from 'express';
import { entitlementController } from '../controller/entitlement.controller.js';
import { requirePlatformAuth, requireSuperAdmin } from '../../auth/middleware/auth.middleware.js';

export const entitlementRouter = Router();

entitlementRouter.use(requirePlatformAuth, requireSuperAdmin);

entitlementRouter.get('/tenants/:tenantId/entitlements', entitlementController.getEffective);
entitlementRouter.get('/tenants/:tenantId/entitlements/reconciliation', entitlementController.reconcile);

entitlementRouter.get('/tenants/:tenantId/entitlements/overrides', entitlementController.listOverrides);
entitlementRouter.post('/tenants/:tenantId/entitlements/overrides', entitlementController.createOverride);
entitlementRouter.post(
  '/tenants/:tenantId/entitlements/overrides/:overrideId/revoke',
  entitlementController.revokeOverride,
);
