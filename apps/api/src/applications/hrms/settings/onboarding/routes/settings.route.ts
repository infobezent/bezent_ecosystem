import { Router } from 'express';
import { OnboardingSettingsController } from '../controller/settings.controller.js';

export const onboardingSettingsRouter = Router();
const controller = new OnboardingSettingsController();

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
onboardingSettingsRouter.patch(
  '/hrms/settings/onboarding/stages/:stageKey',
  controller.updateStageConfig,
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
