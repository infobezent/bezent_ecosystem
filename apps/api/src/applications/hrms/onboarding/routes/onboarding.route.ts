import { Router } from 'express';
import { OnboardingController } from '../controller/onboarding.controller.js';
import { CandidateIntakeController } from '../controller/candidateIntake.controller.js';
import { DocumentRequirementController } from '../../settings/onboarding/controller/documentRequirement.controller.js';
import { EmployeeConversionController } from '../../settings/onboarding/controller/employeeConversion.controller.js';
import { requireReadWrite } from '../../../../platform/access/middleware/access.middleware.js';

export const onboardingRouter = Router();
const controller = new OnboardingController();
const candidateIntakeController = new CandidateIntakeController();
const documentRequirementController = new DocumentRequirementController();
const conversionController = new EmployeeConversionController();

// Public Candidate Intake Self-Service routes (Token-secured, no platform session)
onboardingRouter.get('/public/candidate-intake/:token', candidateIntakeController.getByToken);
onboardingRouter.post(
  '/public/candidate-intake/:token/save-draft',
  candidateIntakeController.saveDraftByToken,
);
onboardingRouter.post(
  '/public/candidate-intake/:token/submit',
  candidateIntakeController.submitByToken,
);

// Viewing onboarding needs hrms.onboarding.read; every change to a case
// needs hrms.onboarding.manage (ADR-017). Covers all routes under the prefix.
onboardingRouter.use(
  '/hrms/onboarding',
  requireReadWrite(['hrms.onboarding.read'], 'hrms.onboarding.manage'),
);

// Candidate Intake HR Operations
onboardingRouter.get(
  '/hrms/onboarding/candidate-intake/latest-form',
  candidateIntakeController.getLatestForm,
);
onboardingRouter.post(
  '/hrms/onboarding/candidate-intake/manual-entry',
  candidateIntakeController.createManualEntry,
);
onboardingRouter.post(
  '/hrms/onboarding/candidate-intake/invite',
  candidateIntakeController.inviteCandidate,
);
onboardingRouter.post(
  '/hrms/onboarding/candidate-intake/:caseId/approve',
  candidateIntakeController.approveSubmission,
);
onboardingRouter.post(
  '/hrms/onboarding/candidate-intake/:caseId/request-changes',
  candidateIntakeController.requestChanges,
);

// Existing New Hire compatibility routes
onboardingRouter.get('/hrms/onboarding/new-hires', controller.listNewHires);
onboardingRouter.post('/hrms/onboarding/new-hires', controller.createNewHire);
onboardingRouter.get('/hrms/onboarding/new-hires/:id', controller.getNewHireById);

// V1 Onboarding Case & Draft lifecycle routes
onboardingRouter.get('/hrms/onboarding/cases', controller.listCases);
onboardingRouter.post('/hrms/onboarding/cases', controller.createCase);
onboardingRouter.get('/hrms/onboarding/cases/:caseId', controller.getCaseById);
onboardingRouter.patch('/hrms/onboarding/cases/:caseId/draft', controller.updateDraft);
onboardingRouter.post('/hrms/onboarding/cases/:caseId/submit', controller.submitCase);
onboardingRouter.delete('/hrms/onboarding/cases/:caseId', controller.deleteDraft);

// PR2 Stage progression, withdrawal, and history routes
onboardingRouter.post('/hrms/onboarding/cases/:caseId/stage', controller.transitionStage);
onboardingRouter.post('/hrms/onboarding/cases/:caseId/withdraw', controller.withdrawCase);
onboardingRouter.get('/hrms/onboarding/cases/:caseId/history', controller.getCaseHistory);

// Candidate Document Workflow & Verification Operations
onboardingRouter.get(
  '/hrms/onboarding/cases/:caseId/documents',
  documentRequirementController.getCandidateDocuments,
);
onboardingRouter.post(
  '/hrms/onboarding/cases/:caseId/documents/generate',
  documentRequirementController.generateCandidateDocuments,
);
onboardingRouter.post(
  '/hrms/onboarding/cases/:caseId/documents/:docId/upload',
  documentRequirementController.uploadCandidateDocument,
);
onboardingRouter.patch(
  '/hrms/onboarding/cases/:caseId/documents/:docId/verify',
  documentRequirementController.verifyCandidateDocument,
);
onboardingRouter.post(
  '/hrms/onboarding/cases/:caseId/documents/:docId/request-reupload',
  documentRequirementController.requestCandidateReupload,
);

// Candidate to Employee Conversion Operations
onboardingRouter.get(
  '/hrms/onboarding/cases/:caseId/conversion-preview',
  conversionController.previewConversion,
);
onboardingRouter.post(
  '/hrms/onboarding/cases/:caseId/convert',
  conversionController.executeConversion,
);
onboardingRouter.post(
  '/hrms/onboarding/cases/:caseId/conversion-retry',
  conversionController.retryConversion,
);
