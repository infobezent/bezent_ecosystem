import { Router } from 'express';
import { tenantAdminController } from '../controller/tenantAdmin.controller.js';
import { requirePlatformAuth } from '../../auth/middleware/auth.middleware.js';
import {
  requireTenantAdmin,
  requireTenantAdminCompanyContext,
} from '../middleware/tenantAdmin.middleware.js';
import { organizationRouter } from '../../organization/routes/organization.routes.js';

export const tenantAdminRouter = Router();

// Base guards: authentication + verified tenant admin authority
tenantAdminRouter.use(requirePlatformAuth, requireTenantAdmin);

// 1. Current Tenant Admin Context
tenantAdminRouter.get('/context', tenantAdminController.getContext);

// 2. Tenant Details — Read
tenantAdminRouter.get('/tenant', tenantAdminController.getTenantDetails);

// 3. Companies — Tenant-wide List & Creation within Capacity
tenantAdminRouter.get('/companies', tenantAdminController.listCompanies);
tenantAdminRouter.post('/companies', tenantAdminController.createCompany);

// 3b. Company Context Verification
tenantAdminRouter.get(
  '/companies/:companyId/context',
  requireTenantAdminCompanyContext,
  tenantAdminController.getCompanyContext,
);

// 3c. Company Details / Profile (Canonical Company Administration)
tenantAdminRouter.get(
  '/companies/:companyId/profile',
  requireTenantAdminCompanyContext,
  tenantAdminController.getCompanyProfile,
);
tenantAdminRouter.patch(
  '/companies/:companyId/profile',
  requireTenantAdminCompanyContext,
  tenantAdminController.updateCompanyProfile,
);

// 3d. Shared Organization Masters via Company Context
tenantAdminRouter.use(
  '/companies/:companyId/organization',
  requireTenantAdminCompanyContext,
  organizationRouter,
);

// 4. Tenant Admins — List
tenantAdminRouter.get('/admins', tenantAdminController.listAdmins);

// 5. Tenant Admin Assignment (same-tenant only)
tenantAdminRouter.post('/admins', tenantAdminController.assignAdmin);

// 6. Tenant Admin Revocation (with last active admin safety rule)
tenantAdminRouter.post('/admins/:userId/revoke', tenantAdminController.revokeAdmin);
tenantAdminRouter.delete('/admins/:userId', tenantAdminController.revokeAdmin);
