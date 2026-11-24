import { Router } from 'express';
import { OnboardingSettingsController } from '../controller/settings.controller.js';
import { PipelineController } from '../controller/pipeline.controller.js';
import { ChecklistController } from '../controller/checklist.controller.js';
import { DocumentRequirementController } from '../controller/documentRequirement.controller.js';
import { EmployeeConversionController } from '../controller/employeeConversion.controller.js';
import { NotificationSettingsController } from '../controller/notificationSettings.controller.js';
import { OnboardingGeneralSettingsController } from '../controller/onboardingGeneralSettings.controller.js';
import { requireReadWrite } from '../../../../../platform/access/middleware/access.middleware.js';

export const onboardingSettingsRouter = Router();
const controller = new OnboardingSettingsController();
const pipelineController = new PipelineController();
const checklistController = new ChecklistController();
const docReqController = new DocumentRequirementController();
const conversionController = new EmployeeConversionController();
const notifController = new NotificationSettingsController();
const generalConfigController = new OnboardingGeneralSettingsController();

// Reads serve onboarding operators and settings administrators; every change
// requires HR settings authority (ADR-017). Covers all routes under the prefix.
onboardingSettingsRouter.use(
  '/hrms/settings/onboarding',
  requireReadWrite(
    ['hrms.settings.view', 'hrms.settings.manage', 'hrms.onboarding.read'],
    'hrms.settings.manage',
  ),
);

// Pipeline Stages & Rules Configuration
onboardingSettingsRouter.get(
  '/hrms/settings/onboarding/pipelines',
  pipelineController.listPipelines,
);
onboardingSettingsRouter.post(
  '/hrms/settings/onboarding/pipelines',
  pipelineController.createPipeline,
);
onboardingSettingsRouter.get(
  '/hrms/settings/onboarding/pipelines/:pipelineId',
  pipelineController.getPipeline,
);
onboardingSettingsRouter.patch(
  '/hrms/settings/onboarding/pipelines/:pipelineId',
  pipelineController.updatePipeline,
);
onboardingSettingsRouter.put(
  '/hrms/settings/onboarding/pipelines/:pipelineId/stages',
  pipelineController.savePipelineStages,
);
onboardingSettingsRouter.post(
  '/hrms/settings/onboarding/pipelines/:pipelineId/duplicate',
  pipelineController.duplicatePipeline,
);
onboardingSettingsRouter.delete(
  '/hrms/settings/onboarding/pipelines/:pipelineId',
  pipelineController.deletePipeline,
);
onboardingSettingsRouter.get(
  '/hrms/settings/onboarding/pipeline-rules',
  pipelineController.listAssignmentRules,
);
onboardingSettingsRouter.put(
  '/hrms/settings/onboarding/pipeline-rules',
  pipelineController.saveAssignmentRules,
);
onboardingSettingsRouter.post(
  '/hrms/settings/onboarding/pipeline-resolve',
  pipelineController.resolvePipeline,
);

// Aggregate and Idempotent Initialization
onboardingSettingsRouter.get('/hrms/settings/onboarding', controller.getAggregateSettings);
onboardingSettingsRouter.post(
  '/hrms/settings/onboarding/initialize',
  controller.initializeSettings,
);

// General Settings (Legacy & Modern Balanced Configuration)
onboardingSettingsRouter.get('/hrms/settings/onboarding/general', controller.getGeneralSettings);
onboardingSettingsRouter.patch(
  '/hrms/settings/onboarding/general',
  controller.updateGeneralSettings,
);
onboardingSettingsRouter.get(
  '/hrms/settings/onboarding/general-config',
  generalConfigController.getConfig,
);
onboardingSettingsRouter.put(
  '/hrms/settings/onboarding/general-config',
  generalConfigController.updateConfig,
);
onboardingSettingsRouter.post(
  '/hrms/settings/onboarding/general-config/reset',
  generalConfigController.resetConfig,
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

// Document Categories Configuration
onboardingSettingsRouter.get(
  '/hrms/settings/onboarding/document-categories',
  docReqController.listCategories,
);
onboardingSettingsRouter.post(
  '/hrms/settings/onboarding/document-categories',
  docReqController.createCategory,
);
onboardingSettingsRouter.patch(
  '/hrms/settings/onboarding/document-categories/:categoryId',
  docReqController.updateCategory,
);
onboardingSettingsRouter.delete(
  '/hrms/settings/onboarding/document-categories/:categoryId',
  docReqController.deleteCategory,
);
onboardingSettingsRouter.put(
  '/hrms/settings/onboarding/document-categories/reorder',
  docReqController.reorderCategories,
);

// Advanced Document Requirements & Applicability
onboardingSettingsRouter.get(
  '/hrms/settings/onboarding/document-requirements',
  docReqController.listRequirements,
);
onboardingSettingsRouter.post(
  '/hrms/settings/onboarding/document-requirements',
  docReqController.createRequirement,
);
onboardingSettingsRouter.get(
  '/hrms/settings/onboarding/document-requirements/:id',
  docReqController.getRequirement,
);
onboardingSettingsRouter.patch(
  '/hrms/settings/onboarding/document-requirements/:id',
  docReqController.updateRequirement,
);
onboardingSettingsRouter.post(
  '/hrms/settings/onboarding/document-requirements/:id/duplicate',
  docReqController.duplicateRequirement,
);
onboardingSettingsRouter.delete(
  '/hrms/settings/onboarding/document-requirements/:id',
  docReqController.deleteRequirement,
);
onboardingSettingsRouter.put(
  '/hrms/settings/onboarding/document-requirements/:id/applicability',
  docReqController.saveApplicability,
);
onboardingSettingsRouter.post(
  '/hrms/settings/onboarding/document-requirements/resolve',
  docReqController.resolveApplicable,
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

// Checklist Builder (Reusable Templates & Custom Task Groups)
onboardingSettingsRouter.get(
  '/hrms/settings/onboarding/checklist-builder/templates',
  checklistController.listTemplates,
);
onboardingSettingsRouter.post(
  '/hrms/settings/onboarding/checklist-builder/templates',
  checklistController.createTemplate,
);
onboardingSettingsRouter.get(
  '/hrms/settings/onboarding/checklist-builder/templates/:templateId',
  checklistController.getTemplate,
);
onboardingSettingsRouter.patch(
  '/hrms/settings/onboarding/checklist-builder/templates/:templateId',
  checklistController.updateTemplate,
);
onboardingSettingsRouter.post(
  '/hrms/settings/onboarding/checklist-builder/templates/:templateId/duplicate',
  checklistController.duplicateTemplate,
);
onboardingSettingsRouter.delete(
  '/hrms/settings/onboarding/checklist-builder/templates/:templateId',
  checklistController.deleteTemplate,
);
onboardingSettingsRouter.put(
  '/hrms/settings/onboarding/checklist-builder/templates/:templateId/tasks',
  checklistController.saveTasks,
);
onboardingSettingsRouter.post(
  '/hrms/settings/onboarding/checklist-builder/generate',
  checklistController.generateCandidateChecklist,
);

// Conversion Settings (Legacy & Modern V2)
onboardingSettingsRouter.get(
  '/hrms/settings/onboarding/conversion',
  controller.getConversionSettings,
);
onboardingSettingsRouter.patch(
  '/hrms/settings/onboarding/conversion',
  controller.updateConversionSettings,
);
onboardingSettingsRouter.get(
  '/hrms/settings/onboarding/conversion-config',
  conversionController.getConfig,
);
onboardingSettingsRouter.put(
  '/hrms/settings/onboarding/conversion-config',
  conversionController.updateConfig,
);
onboardingSettingsRouter.post(
  '/hrms/settings/onboarding/conversion-config/reset',
  conversionController.resetConfig,
);

// ==================== Notifications & Reminders V1 ====================

// Overview
onboardingSettingsRouter.get(
  '/hrms/settings/onboarding/notifications/overview',
  notifController.getOverview,
);

// Notification Settings
onboardingSettingsRouter.get(
  '/hrms/settings/onboarding/notifications/settings',
  notifController.getSettings,
);
onboardingSettingsRouter.put(
  '/hrms/settings/onboarding/notifications/settings',
  notifController.updateSettings,
);

// Reminder Rules
onboardingSettingsRouter.get(
  '/hrms/settings/onboarding/notifications/reminder-rules',
  notifController.listReminderRules,
);
onboardingSettingsRouter.post(
  '/hrms/settings/onboarding/notifications/reminder-rules',
  notifController.createReminderRule,
);
onboardingSettingsRouter.patch(
  '/hrms/settings/onboarding/notifications/reminder-rules/:id',
  notifController.updateReminderRule,
);
onboardingSettingsRouter.delete(
  '/hrms/settings/onboarding/notifications/reminder-rules/:id',
  notifController.deleteReminderRule,
);
onboardingSettingsRouter.post(
  '/hrms/settings/onboarding/notifications/reminder-rules/evaluate',
  notifController.evaluateReminderRules,
);

// Email Templates
onboardingSettingsRouter.get(
  '/hrms/settings/onboarding/notifications/email-templates',
  notifController.listEmailTemplates,
);
onboardingSettingsRouter.post(
  '/hrms/settings/onboarding/notifications/email-templates',
  notifController.createEmailTemplate,
);
onboardingSettingsRouter.get(
  '/hrms/settings/onboarding/notifications/email-templates/:id',
  notifController.getEmailTemplate,
);
onboardingSettingsRouter.patch(
  '/hrms/settings/onboarding/notifications/email-templates/:id',
  notifController.updateEmailTemplate,
);
onboardingSettingsRouter.post(
  '/hrms/settings/onboarding/notifications/email-templates/:id/duplicate',
  notifController.duplicateEmailTemplate,
);
onboardingSettingsRouter.delete(
  '/hrms/settings/onboarding/notifications/email-templates/:id',
  notifController.deleteEmailTemplate,
);
onboardingSettingsRouter.post(
  '/hrms/settings/onboarding/notifications/email-templates/preview',
  notifController.previewTemplate,
);
onboardingSettingsRouter.post(
  '/hrms/settings/onboarding/notifications/email-templates/test-send',
  notifController.sendTestEmail,
);

// Notification History
onboardingSettingsRouter.get(
  '/hrms/settings/onboarding/notifications/history',
  notifController.listHistory,
);
onboardingSettingsRouter.get(
  '/hrms/settings/onboarding/notifications/history/:id',
  notifController.getHistoryItem,
);
onboardingSettingsRouter.post(
  '/hrms/settings/onboarding/notifications/history/:id/retry',
  notifController.retryNotification,
);
