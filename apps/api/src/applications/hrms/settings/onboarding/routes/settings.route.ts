import { Router } from 'express';
import { OnboardingSettingsController } from '../controller/settings.controller.js';
import { requireReadWrite } from '../../../../../platform/access/middleware/access.middleware.js';

export const onboardingSettingsRouter = Router();
const controller = new OnboardingSettingsController();

// Reads serve onboarding operators and settings administrators; every change
// requires HR settings authority (ADR-017). Covers all routes under the prefix.
onboardingSettingsRouter.use(
  '/hrms/settings/onboarding',
  requireReadWrite(
    ['hrms.settings.view', 'hrms.settings.manage', 'hrms.onboarding.read'],
    'hrms.settings.manage',
  ),
);

// Aggregate and Idempotent Initialization
onboardingSettingsRouter.get('/hrms/settings/onboarding', controller.getAggregateSettings);
onboardingSettingsRouter.post(
  '/hrms/settings/onboarding/initialize',
  controller.initializeSettings,
);

// General Settings
onboardingSettingsRouter.get('/hrms/settings/onboarding/general', controller.getGeneralSettings);
onboardingSettingsRouter.patch(
  '/hrms/settings/onboarding/general',
  controller.updateGeneralSettings,
);

// Stage Configurations
onboardingSettingsRouter.get('/hrms/settings/onboarding/stages', controller.getStageConfigs);
onboardingSettingsRouter.post('/hrms/settings/onboarding/stages', controller.createStageConfig);
onboardingSettingsRouter.put(
  '/hrms/settings/onboarding/stages/reorder',
  controller.reorderStageConfigs,
);
onboardingSettingsRouter.patch(
  '/hrms/settings/onboarding/stages/:stageKey',
  controller.updateStageConfig,
);
onboardingSettingsRouter.delete(
  '/hrms/settings/onboarding/stages/:stageKey',
  controller.deleteStageConfig,
);

// Field Configurations
onboardingSettingsRouter.get('/hrms/settings/onboarding/fields', controller.getFieldConfigs);
onboardingSettingsRouter.patch(
  '/hrms/settings/onboarding/fields/:fieldKey',
  controller.updateFieldConfig,
);

// Document Requirements
onboardingSettingsRouter.get(
  '/hrms/settings/onboarding/documents',
  controller.getDocumentRequirements,
);
onboardingSettingsRouter.post(
  '/hrms/settings/onboarding/documents',
  controller.createDocumentRequirement,
);
onboardingSettingsRouter.patch(
  '/hrms/settings/onboarding/documents/:id',
  controller.updateDocumentRequirement,
);
onboardingSettingsRouter.delete(
  '/hrms/settings/onboarding/documents/:id',
  controller.deleteDocumentRequirement,
);

// Checklist Templates
onboardingSettingsRouter.get(
  '/hrms/settings/onboarding/checklists',
  controller.getChecklistTemplates,
);
onboardingSettingsRouter.post(
  '/hrms/settings/onboarding/checklists',
  controller.createChecklistTemplate,
);
onboardingSettingsRouter.patch(
  '/hrms/settings/onboarding/checklists/:id',
  controller.updateChecklistTemplate,
);
onboardingSettingsRouter.delete(
  '/hrms/settings/onboarding/checklists/:id',
  controller.deleteChecklistTemplate,
);

// Conversion Settings
onboardingSettingsRouter.get(
  '/hrms/settings/onboarding/conversion',
  controller.getConversionSettings,
);
onboardingSettingsRouter.patch(
  '/hrms/settings/onboarding/conversion',
  controller.updateConversionSettings,
);
