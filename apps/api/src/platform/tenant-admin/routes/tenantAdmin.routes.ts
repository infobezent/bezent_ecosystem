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

// =========================================================================
// Phase 2D: Tenant-wide Members & Company Access
// =========================================================================

// 7. Tenant Members Directory
tenantAdminRouter.get('/members', tenantAdminController.listMembers);
tenantAdminRouter.post('/members', tenantAdminController.inviteMember);
tenantAdminRouter.get('/members/:userId', tenantAdminController.getMember);

// 8. Company Access Management
tenantAdminRouter.post('/members/:userId/companies', tenantAdminController.grantCompanyAccess);
tenantAdminRouter.delete('/members/:userId/companies/:companyId', tenantAdminController.revokeCompanyAccess);

// 9. Company Role Management
tenantAdminRouter.post('/members/:userId/companies/:companyId/roles', tenantAdminController.assignCompanyRoles);
tenantAdminRouter.delete('/members/:userId/companies/:companyId/roles/:roleId', tenantAdminController.revokeCompanyRole);

// 10. Tenant Admin Promotion / Demotion from Member Directory
tenantAdminRouter.post('/members/:userId/promote-admin', tenantAdminController.promoteMemberToAdmin);
tenantAdminRouter.post('/members/:userId/demote-admin', tenantAdminController.demoteMemberFromAdmin);

// =========================================================================
// Phase 2E: Application Distribution
// =========================================================================

// 11. Tenant Application Catalog (Entitlement Ceiling & Distribution Overview)
tenantAdminRouter.get('/applications', tenantAdminController.listApplications);

// 12. Company Application Distribution
tenantAdminRouter.get(
  '/companies/:companyId/applications',
  requireTenantAdminCompanyContext,
  tenantAdminController.getCompanyApplications,
);
tenantAdminRouter.post(
  '/companies/:companyId/applications/:moduleCode/enable',
  requireTenantAdminCompanyContext,
  tenantAdminController.enableCompanyApplication,
);
tenantAdminRouter.post(
  '/companies/:companyId/applications/:moduleCode/disable',
  requireTenantAdminCompanyContext,
  tenantAdminController.disableCompanyApplication,
);

