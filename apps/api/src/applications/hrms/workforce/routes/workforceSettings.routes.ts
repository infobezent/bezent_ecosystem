import { Router } from 'express';
import { WorkforceSettingsController, workforceSettingsController } from '../controller/workforceSettings.controller.js';
import { requireAnyPermission } from '../../../../platform/access/middleware/access.middleware.js';

export const workforceSettingsRouter = Router();
const controller = workforceSettingsController;

const viewWorkforceSettingsPermissions = requireAnyPermission(
  'hrms.settings.read',
  'hrms.settings.view',
  'hrms.workforce.read',
  'hrms.workforce.view',
  'organization.designations.view',
);

const manageWorkforceSettingsPermissions = requireAnyPermission(
  'hrms.settings.manage',
  'hrms.workforce.manage',
  'organization.designations.manage',
);

// Bundle endpoint (for initial page load of Workforce Settings)
workforceSettingsRouter.get(
  '/hrms/workforce/settings',
  viewWorkforceSettingsPermissions,
  controller.getSettingsBundle,
);

// 1. General Settings & Auto-Numbering
workforceSettingsRouter.get(
  '/hrms/workforce/settings/general',
  viewWorkforceSettingsPermissions,
  controller.getGeneralSettings,
);
workforceSettingsRouter.put(
  '/hrms/workforce/settings/general',
  manageWorkforceSettingsPermissions,
  controller.updateGeneralSettings,
);
workforceSettingsRouter.get(
  '/hrms/workforce/settings/general/preview-id',
  viewWorkforceSettingsPermissions,
  controller.previewNextEmployeeId,
);
workforceSettingsRouter.post(
  '/hrms/workforce/settings/general/reserve-id',
  manageWorkforceSettingsPermissions,
  controller.reserveNextEmployeeId,
);

// 2. Employment Types
workforceSettingsRouter.get(
  '/hrms/workforce/settings/employment-types',
  viewWorkforceSettingsPermissions,
  controller.listEmploymentTypes,
);
workforceSettingsRouter.post(
  '/hrms/workforce/settings/employment-types',
  manageWorkforceSettingsPermissions,
  controller.createEmploymentType,
);
workforceSettingsRouter.put(
  '/hrms/workforce/settings/employment-types/:id',
  manageWorkforceSettingsPermissions,
  controller.updateEmploymentType,
);
workforceSettingsRouter.delete(
  '/hrms/workforce/settings/employment-types/:id',
  manageWorkforceSettingsPermissions,
  controller.deleteEmploymentType,
);

// 3. Probation Policies
workforceSettingsRouter.get(
  '/hrms/workforce/settings/probation',
  viewWorkforceSettingsPermissions,
  controller.getProbationPolicy,
);
workforceSettingsRouter.put(
  '/hrms/workforce/settings/probation',
  manageWorkforceSettingsPermissions,
  controller.updateProbationPolicy,
);

// 4. Lifecycle & Transfer Policies
workforceSettingsRouter.get(
  '/hrms/workforce/settings/lifecycle',
  viewWorkforceSettingsPermissions,
  controller.getLifecyclePolicy,
);
workforceSettingsRouter.put(
  '/hrms/workforce/settings/lifecycle',
  manageWorkforceSettingsPermissions,
  controller.updateLifecyclePolicy,
);

// 5. Offboarding Policies
workforceSettingsRouter.get(
  '/hrms/workforce/settings/offboarding',
  viewWorkforceSettingsPermissions,
  controller.getOffboardingPolicy,
);
workforceSettingsRouter.put(
  '/hrms/workforce/settings/offboarding',
  manageWorkforceSettingsPermissions,
  controller.updateOffboardingPolicy,
);

// 6. Clearance Checklist Templates
workforceSettingsRouter.get(
  '/hrms/workforce/settings/clearance-templates',
  viewWorkforceSettingsPermissions,
  controller.listClearanceTemplates,
);
workforceSettingsRouter.post(
  '/hrms/workforce/settings/clearance-templates',
  manageWorkforceSettingsPermissions,
  controller.createClearanceTemplate,
);
workforceSettingsRouter.put(
  '/hrms/workforce/settings/clearance-templates/:id',
  manageWorkforceSettingsPermissions,
  controller.updateClearanceTemplate,
);
workforceSettingsRouter.delete(
  '/hrms/workforce/settings/clearance-templates/:id',
  manageWorkforceSettingsPermissions,
  controller.deleteClearanceTemplate,
);
