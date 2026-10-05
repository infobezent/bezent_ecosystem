import { Router } from 'express';
import { DepartmentController } from '../controller/department.controller.js';
import { WorkLocationController } from '../controller/workLocation.controller.js';
import { OrganizationStructureController } from '../controller/organizationStructure.controller.js';
import { OrganizationController } from '../controller/organization.controller.js';
import { requireAnyPermission } from '../../access/middleware/access.middleware.js';

export const organizationRouter = Router();

const organizationController = new OrganizationController();
const departmentController = new DepartmentController();
const workLocationController = new WorkLocationController();
const structureController = new OrganizationStructureController();

const viewOrgPermissions = requireAnyPermission(
  'company.organization.view',
  'company.organization.read',
  'organization.departments.view',
  'organization.locations.view',
  'organization.workLocations.view',
  'organization.structure.view',
);

const manageOrgPermissions = requireAnyPermission(
  'company.organization.manage',
  'company.organization.edit',
  'organization.departments.manage',
  'organization.locations.manage',
  'organization.workLocations.manage',
  'organization.structure.manage',
);

// 1. Summary & Profile
organizationRouter.get('/summary', viewOrgPermissions, organizationController.getSummary);
organizationRouter.get('/profile', viewOrgPermissions, organizationController.getProfile);
// Legacy PUT /profile endpoint: strictly requires company.profile.update so callers with only company.organization.manage cannot modify Company Profile fields.
organizationRouter.put(
  '/profile',
  requireAnyPermission('company.profile.update', 'company.profile.edit'),
  organizationController.updateProfile,
);

// 2. Organization Structure & Hierarchy
organizationRouter.get('/structure', viewOrgPermissions, structureController.getHierarchy);
organizationRouter.get('/structure/heads', viewOrgPermissions, structureController.getEligibleHeads);
organizationRouter.get('/structure/business-units', viewOrgPermissions, structureController.listBusinessUnits);
organizationRouter.post('/structure/business-units', manageOrgPermissions, structureController.createBusinessUnit);
organizationRouter.put('/structure/business-units/:id', manageOrgPermissions, structureController.updateBusinessUnit);
organizationRouter.patch('/structure/business-units/:id/status', manageOrgPermissions, structureController.setBusinessUnitStatus);

organizationRouter.get('/structure/divisions', viewOrgPermissions, structureController.listDivisions);
organizationRouter.post('/structure/divisions', manageOrgPermissions, structureController.createDivision);
organizationRouter.put('/structure/divisions/:id', manageOrgPermissions, structureController.updateDivision);
organizationRouter.patch('/structure/divisions/:id/status', manageOrgPermissions, structureController.setDivisionStatus);

// 3. Departments
organizationRouter.get('/departments', viewOrgPermissions, departmentController.listDepartments);
organizationRouter.get('/departments/:id', viewOrgPermissions, departmentController.getDepartmentById);
organizationRouter.post('/departments', manageOrgPermissions, departmentController.createDepartment);
organizationRouter.put('/departments/:id', manageOrgPermissions, departmentController.updateDepartment);
organizationRouter.patch('/departments/:id/status', manageOrgPermissions, departmentController.setDepartmentStatus);
organizationRouter.post('/departments/:id/deactivate', manageOrgPermissions, departmentController.deactivateDepartment);
organizationRouter.post('/departments/:id/reactivate', manageOrgPermissions, departmentController.reactivateDepartment);

// 4. Work Locations (both /work-locations and /locations supported)
organizationRouter.get('/work-locations', viewOrgPermissions, workLocationController.listWorkLocations);
organizationRouter.get('/work-locations/:id', viewOrgPermissions, workLocationController.getWorkLocationById);
organizationRouter.post('/work-locations', manageOrgPermissions, workLocationController.createWorkLocation);
organizationRouter.put('/work-locations/:id', manageOrgPermissions, workLocationController.updateWorkLocation);
organizationRouter.patch('/work-locations/:id/status', manageOrgPermissions, workLocationController.setWorkLocationStatus);
organizationRouter.post('/work-locations/:id/deactivate', manageOrgPermissions, workLocationController.deactivateWorkLocation);
organizationRouter.post('/work-locations/:id/reactivate', manageOrgPermissions, workLocationController.reactivateWorkLocation);

organizationRouter.get('/locations', viewOrgPermissions, workLocationController.listWorkLocations);
organizationRouter.get('/locations/:id', viewOrgPermissions, workLocationController.getWorkLocationById);
organizationRouter.post('/locations', manageOrgPermissions, workLocationController.createWorkLocation);
organizationRouter.put('/locations/:id', manageOrgPermissions, workLocationController.updateWorkLocation);
organizationRouter.patch('/locations/:id/status', manageOrgPermissions, workLocationController.setWorkLocationStatus);
organizationRouter.post('/locations/:id/deactivate', manageOrgPermissions, workLocationController.deactivateWorkLocation);
organizationRouter.post('/locations/:id/reactivate', manageOrgPermissions, workLocationController.reactivateWorkLocation);
