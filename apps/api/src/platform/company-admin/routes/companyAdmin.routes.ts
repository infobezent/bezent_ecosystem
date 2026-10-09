import { Router } from 'express';
import { companyAdminController } from '../controller/companyAdmin.controller.js';
import { accessController } from '../../access/controller/access.controller.js';
import { requirePlatformAuth } from '../../auth/middleware/auth.middleware.js';
import { requirePermission, requireWorkspace } from '../../access/middleware/access.middleware.js';
import { companyOrganizationRouter } from './companyOrganization.routes.js';

export const companyAdminRouter = Router();

// Base authentication required on all company admin endpoints
companyAdminRouter.use(requirePlatformAuth);

// 1. Authorized Companies (for Company Switcher)
companyAdminRouter.get('/companies', companyAdminController.getAuthorizedCompanies);

// 2. Company-Scoped Workspace Endpoints. The selected company is resolved and
//    validated on every request (ADR-017); each route then requires a permission.
companyAdminRouter.use(
  requireWorkspace(
    'company_admin',
    'FORBIDDEN_COMPANY_ADMIN',
    'Company Admin authorization required for this company',
  ),
);

// Dashboard
companyAdminRouter.get(
  '/dashboard',
  requirePermission('company.profile.read'),
  companyAdminController.getDashboard,
);

// Company Profile & Settings
companyAdminRouter.get(
  '/profile',
  requirePermission('company.profile.read'),
  companyAdminController.getProfile,
);
companyAdminRouter.patch(
  '/profile',
  requirePermission('company.profile.update'),
  companyAdminController.updateProfile,
);

// User Management
companyAdminRouter.get(
  '/users',
  requirePermission('company.users.read'),
  companyAdminController.listUsers,
);
companyAdminRouter.post(
  '/users/invite',
  requirePermission('company.users.invite'),
  companyAdminController.inviteUser,
);
/** @deprecated Replaces the user's primary role. Use POST/DELETE /users/:userId/roles. */
companyAdminRouter.patch(
  '/users/:userId/role',
  requirePermission('company.roles.assign'),
  companyAdminController.updateUserRole,
);
companyAdminRouter.patch(
  '/users/:userId/status',
  requirePermission('company.users.manage'),
  companyAdminController.updateUserStatus,
);
companyAdminRouter.delete(
  '/users/:userId/membership',
  requirePermission('company.users.manage'),
  companyAdminController.revokeMembership,
);

// User Role Assignments (multiple roles per user, scoped to this company)
companyAdminRouter.get(
  '/users/:userId/access',
  requirePermission('company.roles.read'),
  accessController.getUserAccess,
);
companyAdminRouter.post(
  '/users/:userId/roles',
  requirePermission('company.roles.assign'),
  accessController.assignRole,
);
companyAdminRouter.delete(
  '/users/:userId/roles/:roleId',
  requirePermission('company.roles.assign'),
  accessController.revokeRole,
);

// Invitations
companyAdminRouter.get(
  '/invitations',
  requirePermission('company.users.read'),
  companyAdminController.listInvitations,
);
companyAdminRouter.post(
  '/invitations/:id/resend',
  requirePermission('company.users.invite'),
  companyAdminController.resendInvitation,
);
companyAdminRouter.delete(
  '/invitations/:id',
  requirePermission('company.users.invite'),
  companyAdminController.cancelInvitation,
);
companyAdminRouter.post(
  '/invitations/:id/accept',
  companyAdminController.acceptInvitation,
);
companyAdminRouter.post(
  '/invitations/accept',
  companyAdminController.acceptInvitation,
);

// Roles & Permissions
companyAdminRouter.get(
  '/roles',
  requirePermission('company.roles.read'),
  accessController.listRoles,
);
companyAdminRouter.post(
  '/roles',
  requirePermission('company.roles.manage'),
  accessController.createCustomRole,
);
companyAdminRouter.patch(
  '/roles/:roleId',
  requirePermission('company.roles.manage'),
  accessController.updateCustomRole,
);
companyAdminRouter.patch(
  '/roles/:roleId/status',
  requirePermission('company.roles.manage'),
  accessController.setCustomRoleStatus,
);
companyAdminRouter.get(
  '/permissions',
  requirePermission('company.roles.read'),
  accessController.listAssignablePermissions,
);
companyAdminRouter.get(
  '/permissions/tree',
  requirePermission('company.roles.read'),
  accessController.getPermissionTree,
);

// Module Management
companyAdminRouter.get(
  '/modules',
  requirePermission('company.modules.read'),
  companyAdminController.getModules,
);
companyAdminRouter.patch(
  '/modules/:moduleCode',
  requirePermission('company.modules.manage'),
  companyAdminController.setModuleStatus,
);

// Organization Management (Shared Organization Masters)
companyAdminRouter.use('/organization', companyOrganizationRouter);

// Policies & HRMS Settings
companyAdminRouter.get(
  '/policies/summary',
  requirePermission('company.policies.read'),
  companyAdminController.getPoliciesSummary,
);

// Audit Trail
companyAdminRouter.get(
  '/audit-logs',
  requirePermission('company.audit.read'),
  companyAdminController.listAuditLogs,
);
