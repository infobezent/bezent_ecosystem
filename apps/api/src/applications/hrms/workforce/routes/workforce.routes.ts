import { Router } from 'express';
import { DesignationController } from '../controller/designation.controller.js';
import { JobLevelController } from '../controller/jobLevel.controller.js';
import { GradeController } from '../controller/grade.controller.js';
import { requireAnyPermission } from '../../../../platform/access/middleware/access.middleware.js';

export const workforceRouter = Router();
const designationController = new DesignationController();
const jobLevelController = new JobLevelController();
const gradeController = new GradeController();

const viewDesignationPermissions = requireAnyPermission(
  'organization.designations.view',
  'hrms.organization.read',
  'hrms.organization.view',
  'hrms.settings.read',
  'hrms.settings.view',
  'hrms.workforce.read',
  'hrms.workforce.view',
);

const manageDesignationPermissions = requireAnyPermission(
  'organization.designations.manage',
  'hrms.organization.manage',
  'hrms.settings.manage',
  'hrms.workforce.manage',
);

// Designations
workforceRouter.get(
  '/hrms/workforce/designations',
  viewDesignationPermissions,
  designationController.listDesignations,
);
workforceRouter.get(
  '/hrms/workforce/designations/:id',
  viewDesignationPermissions,
  designationController.getDesignationById,
);
workforceRouter.post(
  '/hrms/workforce/designations',
  manageDesignationPermissions,
  designationController.createDesignation,
);
workforceRouter.put(
  '/hrms/workforce/designations/:id',
  manageDesignationPermissions,
  designationController.updateDesignation,
);
workforceRouter.patch(
  '/hrms/workforce/designations/:id/status',
  manageDesignationPermissions,
  designationController.setDesignationStatus,
);
workforceRouter.post(
  '/hrms/workforce/designations/:id/deactivate',
  manageDesignationPermissions,
  designationController.deactivateDesignation,
);
workforceRouter.post(
  '/hrms/workforce/designations/:id/reactivate',
  manageDesignationPermissions,
  designationController.reactivateDesignation,
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

workforceRouter.get(
  '/hrms/workforce/job-levels',
  viewJobLevelPermissions,
  jobLevelController.listJobLevels,
);
workforceRouter.get(
  '/hrms/workforce/job-levels/:id',
  viewJobLevelPermissions,
  jobLevelController.getJobLevelById,
);
workforceRouter.post(
  '/hrms/workforce/job-levels',
  manageJobLevelPermissions,
  jobLevelController.createJobLevel,
);
workforceRouter.patch(
  '/hrms/workforce/job-levels/:id',
  manageJobLevelPermissions,
  jobLevelController.updateJobLevel,
);
workforceRouter.put(
  '/hrms/workforce/job-levels/:id',
  manageJobLevelPermissions,
  jobLevelController.updateJobLevel,
);
workforceRouter.patch(
  '/hrms/workforce/job-levels/:id/status',
  manageJobLevelPermissions,
  jobLevelController.setJobLevelStatus,
);
workforceRouter.post(
  '/hrms/workforce/job-levels/:id/deactivate',
  manageJobLevelPermissions,
  jobLevelController.deactivateJobLevel,
);
workforceRouter.post(
  '/hrms/workforce/job-levels/:id/reactivate',
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

workforceRouter.get('/hrms/workforce/grades', viewGradePermissions, gradeController.listGrades);
workforceRouter.get(
  '/hrms/workforce/grades/:id',
  viewGradePermissions,
  gradeController.getGradeById,
);
workforceRouter.post('/hrms/workforce/grades', manageGradePermissions, gradeController.createGrade);
workforceRouter.patch(
  '/hrms/workforce/grades/:id',
  manageGradePermissions,
  gradeController.updateGrade,
);
workforceRouter.put(
  '/hrms/workforce/grades/:id',
  manageGradePermissions,
  gradeController.updateGrade,
);
workforceRouter.patch(
  '/hrms/workforce/grades/:id/status',
  manageGradePermissions,
  gradeController.setGradeStatus,
);
workforceRouter.post(
  '/hrms/workforce/grades/:id/deactivate',
  manageGradePermissions,
  gradeController.deactivateGrade,
);
workforceRouter.post(
  '/hrms/workforce/grades/:id/reactivate',
  manageGradePermissions,
  gradeController.reactivateGrade,
);
