import { Router } from 'express';
import { companyAdminController } from '../controller/companyAdmin.controller.js';
import {
  requirePlatformAuth,
  requireCompanyAdmin,
} from '../../auth/middleware/auth.middleware.js';

export const companyAdminRouter = Router();

// Base authentication required on all company admin endpoints
companyAdminRouter.use(requirePlatformAuth);

// 1. Authorized Companies (for Company Switcher)
companyAdminRouter.get('/companies', companyAdminController.getAuthorizedCompanies);

// 2. Company-Scoped Workspace Endpoints (require active Company Admin authorization)
companyAdminRouter.use(requireCompanyAdmin);

// Dashboard
companyAdminRouter.get('/dashboard', companyAdminController.getDashboard);

// Company Profile & Settings
companyAdminRouter.get('/profile', companyAdminController.getProfile);
companyAdminRouter.patch('/profile', companyAdminController.updateProfile);

// User Management
companyAdminRouter.get('/users', companyAdminController.listUsers);
companyAdminRouter.post('/users/invite', companyAdminController.inviteUser);
companyAdminRouter.patch('/users/:userId/role', companyAdminController.updateUserRole);
companyAdminRouter.patch('/users/:userId/status', companyAdminController.updateUserStatus);
companyAdminRouter.delete('/users/:userId/membership', companyAdminController.revokeMembership);

// Invitations
companyAdminRouter.get('/invitations', companyAdminController.listInvitations);
companyAdminRouter.post('/invitations/:id/resend', companyAdminController.resendInvitation);
companyAdminRouter.delete('/invitations/:id', companyAdminController.cancelInvitation);

// Roles & Permissions
companyAdminRouter.get('/roles', companyAdminController.getRoles);

// Module Management
companyAdminRouter.get('/modules', companyAdminController.getModules);
companyAdminRouter.patch('/modules/:moduleCode', companyAdminController.setModuleStatus);

// Organization Management (HRMS Masters Integration)
companyAdminRouter.get('/organization/summary', companyAdminController.getOrganizationSummary);

// Policies & HRMS Settings
companyAdminRouter.get('/policies/summary', companyAdminController.getPoliciesSummary);

// Audit Trail
companyAdminRouter.get('/audit-logs', companyAdminController.listAuditLogs);
