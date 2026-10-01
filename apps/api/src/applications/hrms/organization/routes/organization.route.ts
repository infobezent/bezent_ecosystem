import { Router } from 'express';
import { OrganizationController } from '../controller/organization.controller.js';
import { OrganizationStructureController } from '../controller/organizationStructure.controller.js';
import { requireAnyPermission } from '../../../../platform/access/middleware/access.middleware.js';

export const organizationRouter = Router();
const controller = new OrganizationController();
const structureController = new OrganizationStructureController();

// Masters feed every HRMS screen that picks a department/designation/location.
organizationRouter.get(
  '/hrms/organization/masters',
  requireAnyPermission(
    'hrms.organization.read',
    'hrms.employees.read',
    'hrms.employees.create',
    'hrms.onboarding.read',
  ),
  controller.getMasters,
);

// Organization Profile (HRMS -> Settings -> Organization -> Organization Profile)
organizationRouter.get(
  '/hrms/organization/profile',
  requireAnyPermission(
    'hrms.organization.read',
    'hrms.organization.view',
    'hrms.settings.read',
    'hrms.settings.view',
    'company.profile.read',
    'company.profile.view',
  ),
  controller.getProfile,
);

organizationRouter.put(
  '/hrms/organization/profile',
  requireAnyPermission(
    'hrms.organization.manage',
    'hrms.settings.manage',
    'company.profile.update',
    'company.profile.edit',
  ),
  controller.updateProfile,
);

// Organization Structure (HRMS -> Settings -> Organization -> Organization Structure)
const viewStructurePermissions = requireAnyPermission(
  'organization.structure.view',
  'hrms.organization.read',
  'hrms.organization.view',
  'hrms.settings.read',
  'hrms.settings.view',
);

const manageStructurePermissions = requireAnyPermission(
  'organization.structure.manage',
  'hrms.organization.manage',
  'hrms.settings.manage',
);

organizationRouter.get(
  '/hrms/organization/structure',
  viewStructurePermissions,
  structureController.getHierarchy,
);

organizationRouter.get(
  '/hrms/organization/structure/heads',
  viewStructurePermissions,
  structureController.getEligibleHeads,
);

organizationRouter.get(
  '/hrms/organization/structure/business-units',
  viewStructurePermissions,
  structureController.listBusinessUnits,
);

organizationRouter.post(
  '/hrms/organization/structure/business-units',
  manageStructurePermissions,
  structureController.createBusinessUnit,
);

organizationRouter.put(
  '/hrms/organization/structure/business-units/:id',
  manageStructurePermissions,
  structureController.updateBusinessUnit,
);

organizationRouter.patch(
  '/hrms/organization/structure/business-units/:id/status',
  manageStructurePermissions,
  structureController.setBusinessUnitStatus,
);

organizationRouter.get(
  '/hrms/organization/structure/divisions',
  viewStructurePermissions,
  structureController.listDivisions,
);

organizationRouter.post(
  '/hrms/organization/structure/divisions',
  manageStructurePermissions,
  structureController.createDivision,
);

organizationRouter.put(
  '/hrms/organization/structure/divisions/:id',
  manageStructurePermissions,
  structureController.updateDivision,
);

organizationRouter.patch(
  '/hrms/organization/structure/divisions/:id/status',
  manageStructurePermissions,
  structureController.setDivisionStatus,
);


