import { Router } from 'express';
import { OrganizationController } from '../../../platform/organization/controller/organization.controller.js';
import { OrganizationStructureController } from '../../../platform/organization/controller/organizationStructure.controller.js';
import { DepartmentController } from '../../../platform/organization/controller/department.controller.js';
import { WorkLocationController } from '../../../platform/organization/controller/workLocation.controller.js';
import { DesignationController } from '../workforce/controller/designation.controller.js';
import { JobLevelController } from '../workforce/controller/jobLevel.controller.js';
import { GradeController } from '../workforce/controller/grade.controller.js';
import { requireAnyPermission } from '../../../platform/access/middleware/access.middleware.js';

/**
 * Legacy compatibility router for /hrms/organization/* URLs.
 * Thin adapter layer delegating to canonical Platform Organization and HRMS Workforce controllers.
 */
export const organizationCompatibilityRouter = Router();

const organizationController = new OrganizationController();
const structureController = new OrganizationStructureController();
const departmentController = new DepartmentController();
const workLocationController = new WorkLocationController();
const designationController = new DesignationController();
const jobLevelController = new JobLevelController();
const gradeController = new GradeController();

// Masters feed HRMS screens
organizationCompatibilityRouter.get(
  '/hrms/organization/masters',
  requireAnyPermission(
    'hrms.organization.read',
    'hrms.employees.read',
    'hrms.employees.create',
    'hrms.onboarding.read',
  ),
  organizationController.getMasters,
);

// Organization Profile
organizationCompatibilityRouter.get(
  '/hrms/organization/profile',
  requireAnyPermission(
    'hrms.organization.read',
    'hrms.organization.view',
    'hrms.settings.read',
    'hrms.settings.view',
    'company.profile.read',
    'company.profile.view',
  ),
  organizationController.getProfile,
);

organizationCompatibilityRouter.put(
  '/hrms/organization/profile',
  requireAnyPermission(
    'company.profile.update',
    'company.profile.edit',
    'hrms.organization.manage',
  ),
  organizationController.updateProfile,
);

// Organization Structure
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

organizationCompatibilityRouter.get(
  '/hrms/organization/structure',
  viewStructurePermissions,
  structureController.getHierarchy,
);

organizationCompatibilityRouter.get(
  '/hrms/organization/structure/heads',
  viewStructurePermissions,
  structureController.getEligibleHeads,
);

organizationCompatibilityRouter.get(
  '/hrms/organization/structure/business-units',
  viewStructurePermissions,
  structureController.listBusinessUnits,
);

organizationCompatibilityRouter.post(
  '/hrms/organization/structure/business-units',
  manageStructurePermissions,
  structureController.createBusinessUnit,
);

organizationCompatibilityRouter.put(
  '/hrms/organization/structure/business-units/:id',
  manageStructurePermissions,
  structureController.updateBusinessUnit,
);

organizationCompatibilityRouter.patch(
  '/hrms/organization/structure/business-units/:id/status',
  manageStructurePermissions,
  structureController.setBusinessUnitStatus,
);

organizationCompatibilityRouter.get(
  '/hrms/organization/structure/divisions',
  viewStructurePermissions,
  structureController.listDivisions,
);

organizationCompatibilityRouter.post(
  '/hrms/organization/structure/divisions',
  manageStructurePermissions,
  structureController.createDivision,
);

organizationCompatibilityRouter.put(
  '/hrms/organization/structure/divisions/:id',
  manageStructurePermissions,
  structureController.updateDivision,
);

organizationCompatibilityRouter.patch(
  '/hrms/organization/structure/divisions/:id/status',
  manageStructurePermissions,
  structureController.setDivisionStatus,
);

// Departments
const viewDepartmentPermissions = requireAnyPermission(
  'organization.departments.view',
  'hrms.organization.read',
  'hrms.organization.view',
  'hrms.settings.read',
  'hrms.settings.view',
);

const manageDepartmentPermissions = requireAnyPermission(
  'organization.departments.manage',
  'hrms.organization.manage',
  'hrms.settings.manage',
);

organizationCompatibilityRouter.get(
  '/hrms/organization/departments',
  viewDepartmentPermissions,
  departmentController.listDepartments,
);

organizationCompatibilityRouter.get(
  '/hrms/organization/departments/:id',
  viewDepartmentPermissions,
  departmentController.getDepartmentById,
);

organizationCompatibilityRouter.post(
  '/hrms/organization/departments',
  manageDepartmentPermissions,
  departmentController.createDepartment,
);

organizationCompatibilityRouter.put(
  '/hrms/organization/departments/:id',
  manageDepartmentPermissions,
  departmentController.updateDepartment,
);

organizationCompatibilityRouter.patch(
  '/hrms/organization/departments/:id/status',
  manageDepartmentPermissions,
  departmentController.setDepartmentStatus,
);

organizationCompatibilityRouter.post(
  '/hrms/organization/departments/:id/deactivate',
  manageDepartmentPermissions,
  departmentController.deactivateDepartment,
);

organizationCompatibilityRouter.post(
  '/hrms/organization/departments/:id/reactivate',
  manageDepartmentPermissions,
  departmentController.reactivateDepartment,
);

// Designations
const viewDesignationPermissions = requireAnyPermission(
  'organization.designations.view',
  'hrms.organization.read',
  'hrms.organization.view',
  'hrms.settings.read',
  'hrms.settings.view',
);

const manageDesignationPermissions = requireAnyPermission(
  'organization.designations.manage',
  'hrms.organization.manage',
  'hrms.settings.manage',
);

organizationCompatibilityRouter.get(
  '/hrms/organization/designations',
  viewDesignationPermissions,
  designationController.listDesignations,
);

organizationCompatibilityRouter.get(
  '/hrms/organization/designations/:id',
  viewDesignationPermissions,
  designationController.getDesignationById,
);

organizationCompatibilityRouter.post(
  '/hrms/organization/designations',
  manageDesignationPermissions,
  designationController.createDesignation,
);

organizationCompatibilityRouter.put(
  '/hrms/organization/designations/:id',
  manageDesignationPermissions,
  designationController.updateDesignation,
);

organizationCompatibilityRouter.patch(
  '/hrms/organization/designations/:id/status',
  manageDesignationPermissions,
  designationController.setDesignationStatus,
);

organizationCompatibilityRouter.post(
  '/hrms/organization/designations/:id/deactivate',
  manageDesignationPermissions,
  designationController.deactivateDesignation,
);

organizationCompatibilityRouter.post(
  '/hrms/organization/designations/:id/reactivate',
  manageDesignationPermissions,
  designationController.reactivateDesignation,
);

// Work Locations
const viewWorkLocationPermissions = requireAnyPermission(
  'organization.workLocations.view',
  'organization.locations.view',
  'hrms.organization.read',
  'hrms.organization.view',
  'hrms.settings.read',
  'hrms.settings.view',
);

const manageWorkLocationPermissions = requireAnyPermission(
  'organization.workLocations.manage',
  'organization.locations.manage',
  'hrms.organization.manage',
  'hrms.settings.manage',
);

organizationCompatibilityRouter.get(
  '/hrms/organization/work-locations',
  viewWorkLocationPermissions,
  workLocationController.listWorkLocations,
);

organizationCompatibilityRouter.get(
  '/hrms/organization/work-locations/:id',
  viewWorkLocationPermissions,
  workLocationController.getWorkLocationById,
);

organizationCompatibilityRouter.post(
  '/hrms/organization/work-locations',
  manageWorkLocationPermissions,
  workLocationController.createWorkLocation,
);

organizationCompatibilityRouter.put(
  '/hrms/organization/work-locations/:id',
  manageWorkLocationPermissions,
  workLocationController.updateWorkLocation,
);

organizationCompatibilityRouter.patch(
  '/hrms/organization/work-locations/:id/status',
  manageWorkLocationPermissions,
  workLocationController.setWorkLocationStatus,
);

organizationCompatibilityRouter.post(
  '/hrms/organization/work-locations/:id/deactivate',
  manageWorkLocationPermissions,
  workLocationController.deactivateWorkLocation,
);

organizationCompatibilityRouter.post(
  '/hrms/organization/work-locations/:id/reactivate',
  manageWorkLocationPermissions,
  workLocationController.reactivateWorkLocation,
);

// Alias /locations routes
organizationCompatibilityRouter.get(
  '/hrms/organization/locations',
  viewWorkLocationPermissions,
  workLocationController.listWorkLocations,
);

organizationCompatibilityRouter.get(
  '/hrms/organization/locations/:id',
  viewWorkLocationPermissions,
  workLocationController.getWorkLocationById,
);

organizationCompatibilityRouter.post(
  '/hrms/organization/locations',
  manageWorkLocationPermissions,
  workLocationController.createWorkLocation,
);

organizationCompatibilityRouter.put(
  '/hrms/organization/locations/:id',
  manageWorkLocationPermissions,
  workLocationController.updateWorkLocation,
);

organizationCompatibilityRouter.patch(
  '/hrms/organization/locations/:id/status',
  manageWorkLocationPermissions,
  workLocationController.setWorkLocationStatus,
);

organizationCompatibilityRouter.post(
  '/hrms/organization/locations/:id/deactivate',
  manageWorkLocationPermissions,
  workLocationController.deactivateWorkLocation,
);

organizationCompatibilityRouter.post(
  '/hrms/organization/locations/:id/reactivate',
  manageWorkLocationPermissions,
  workLocationController.reactivateWorkLocation,
);

// Job Levels
const viewJobLevelPermissions = requireAnyPermission(
  'organization.jobLevels.view',
  'hrms.jobLevels.view',
  'hrms.organization.read',
  'hrms.organization.view',
  'hrms.settings.read',
  'hrms.settings.view',
);

const manageJobLevelPermissions = requireAnyPermission(
  'organization.jobLevels.manage',
  'hrms.jobLevels.manage',
  'hrms.organization.manage',
  'hrms.settings.manage',
);

organizationCompatibilityRouter.get(
  '/hrms/organization/job-levels',
  viewJobLevelPermissions,
  jobLevelController.listJobLevels,
);

organizationCompatibilityRouter.get(
  '/hrms/organization/job-levels/:id',
  viewJobLevelPermissions,
  jobLevelController.getJobLevelById,
);

organizationCompatibilityRouter.post(
  '/hrms/organization/job-levels',
  manageJobLevelPermissions,
  jobLevelController.createJobLevel,
);

organizationCompatibilityRouter.patch(
  '/hrms/organization/job-levels/:id',
  manageJobLevelPermissions,
  jobLevelController.updateJobLevel,
);

organizationCompatibilityRouter.put(
  '/hrms/organization/job-levels/:id',
  manageJobLevelPermissions,
  jobLevelController.updateJobLevel,
);

organizationCompatibilityRouter.patch(
  '/hrms/organization/job-levels/:id/status',
  manageJobLevelPermissions,
  jobLevelController.setJobLevelStatus,
);

organizationCompatibilityRouter.post(
  '/hrms/organization/job-levels/:id/deactivate',
  manageJobLevelPermissions,
  jobLevelController.deactivateJobLevel,
);

organizationCompatibilityRouter.post(
  '/hrms/organization/job-levels/:id/reactivate',
  manageJobLevelPermissions,
  jobLevelController.reactivateJobLevel,
);

// Grades
const viewGradePermissions = requireAnyPermission(
  'organization.grades.view',
  'hrms.grades.view',
  'hrms.organization.read',
  'hrms.organization.view',
  'hrms.settings.read',
  'hrms.settings.view',
);

const manageGradePermissions = requireAnyPermission(
  'organization.grades.manage',
  'hrms.grades.manage',
  'hrms.organization.manage',
  'hrms.settings.manage',
);

organizationCompatibilityRouter.get(
  '/hrms/organization/grades',
  viewGradePermissions,
  gradeController.listGrades,
);

organizationCompatibilityRouter.get(
  '/hrms/organization/grades/:id',
  viewGradePermissions,
  gradeController.getGradeById,
);

organizationCompatibilityRouter.post(
  '/hrms/organization/grades',
  manageGradePermissions,
  gradeController.createGrade,
);

organizationCompatibilityRouter.patch(
  '/hrms/organization/grades/:id',
  manageGradePermissions,
  gradeController.updateGrade,
);

organizationCompatibilityRouter.put(
  '/hrms/organization/grades/:id',
  manageGradePermissions,
  gradeController.updateGrade,
);

organizationCompatibilityRouter.patch(
  '/hrms/organization/grades/:id/status',
  manageGradePermissions,
  gradeController.setGradeStatus,
);

organizationCompatibilityRouter.post(
  '/hrms/organization/grades/:id/deactivate',
  manageGradePermissions,
  gradeController.deactivateGrade,
);

organizationCompatibilityRouter.post(
  '/hrms/organization/grades/:id/reactivate',
  manageGradePermissions,
  gradeController.reactivateGrade,
);
