import { Router } from 'express';
import { tenantController } from '../controller/tenant.controller.js';
import { primaryAdminController } from '../controller/primaryAdmin.controller.js';
import { tenantOrchestrationController } from '../controller/tenantOrchestration.controller.js';
import { requirePlatformAuth, requireSuperAdmin } from '../../auth/middleware/auth.middleware.js';
import { invitationAcceptanceRateLimiter } from '../../auth/middleware/rateLimiter.middleware.js';

export const tenantRouter = Router();

// Public invitation acceptance (hardened: requires authenticated session to bind identity)
tenantRouter.post(
  '/tenants/invitations/:token/accept',
  invitationAcceptanceRateLimiter,
  requirePlatformAuth,
  primaryAdminController.accept,
);

// Super Admin protected routes
tenantRouter.use(requirePlatformAuth, requireSuperAdmin);

// Summary metrics (must precede /tenants/:id)
tenantRouter.get('/tenants/summary', tenantController.getSummary);

// Tenant Orchestration (must precede /tenants/:id)
tenantRouter.post('/tenants/orchestrate/preflight', tenantOrchestrationController.preflight);
tenantRouter.post('/tenants/orchestrate', tenantOrchestrationController.orchestrate);

// Composite Tenant Overview
tenantRouter.get('/tenants/:id/overview', tenantController.getOverview);

// Base tenant CRUD
tenantRouter.get('/tenants', tenantController.list);
tenantRouter.post('/tenants', tenantController.create);
tenantRouter.get('/tenants/:id', tenantController.getById);
tenantRouter.put('/tenants/:id', tenantController.update);
tenantRouter.patch('/tenants/:id', tenantController.update);

// Lifecycle transitions & history
tenantRouter.post('/tenants/:id/activate', tenantController.activate);
tenantRouter.post('/tenants/:id/reactivate', tenantController.activate);
tenantRouter.post('/tenants/:id/suspend', tenantController.suspend);
tenantRouter.post('/tenants/:id/terminate', tenantController.terminate);
tenantRouter.get('/tenants/:id/lifecycle-history', tenantController.getLifecycleHistory);

// Activity log and CSV export
tenantRouter.get('/tenants/:id/activity', tenantController.getActivity);
tenantRouter.get('/tenants/:id/activity/export', tenantController.exportActivity);

// Company capacity
tenantRouter.get('/tenants/:id/company-capacity', tenantController.getCapacity);
tenantRouter.patch('/tenants/:id/company-capacity', tenantController.updateCapacity);
tenantRouter.put('/tenants/:id/company-capacity', tenantController.updateCapacity);

// Primary Admin management
tenantRouter.get('/tenants/:tenantId/primary-admin', primaryAdminController.getPrimaryAdmin);
tenantRouter.post('/tenants/:tenantId/primary-admin/invite', primaryAdminController.invite);
tenantRouter.post(
  '/tenants/:tenantId/primary-admin/invitations/:invitationId/resend',
  primaryAdminController.resend,
);
tenantRouter.delete(
  '/tenants/:tenantId/primary-admin/invitations/:invitationId',
  primaryAdminController.revoke,
);
tenantRouter.post('/tenants/:tenantId/primary-admin/reassign', primaryAdminController.reassign);
