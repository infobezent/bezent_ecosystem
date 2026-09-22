import { Router } from 'express';
import { OnboardingController } from '../controller/onboarding.controller.js';

export const onboardingRouter = Router();
const controller = new OnboardingController();

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
