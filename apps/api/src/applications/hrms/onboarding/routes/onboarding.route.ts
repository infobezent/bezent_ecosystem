import { Router } from 'express';
import { OnboardingController } from '../controller/onboarding.controller.js';

export const onboardingRouter = Router();
const controller = new OnboardingController();

onboardingRouter.get('/hrms/onboarding/new-hires', controller.listNewHires);
onboardingRouter.post('/hrms/onboarding/new-hires', controller.createNewHire);
onboardingRouter.get('/hrms/onboarding/new-hires/:id', controller.getNewHireById);
