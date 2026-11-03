import { Router } from 'express';
import { RecruitmentController } from '../controller/recruitment.controller.js';
import { RecruitmentOnboardingController } from '../controller/recruitmentOnboarding.controller.js';
import { requirePermission } from '../../../../platform/access/middleware/access.middleware.js';

export const recruitmentRouter = Router();
const controller = new RecruitmentController();
const onboardingController = new RecruitmentOnboardingController();

// -----------------------------------------------------------------------------
// Job Requisitions
// -----------------------------------------------------------------------------
recruitmentRouter.post(
  '/hrms/recruitment/requisitions',
  requirePermission('hrms.recruitment.requisitions_manage'),
  controller.createRequisition,
);

recruitmentRouter.get(
  '/hrms/recruitment/requisitions',
  requirePermission('hrms.recruitment.view'),
  controller.listRequisitions,
);

recruitmentRouter.get(
  '/hrms/recruitment/requisitions/:id',
  requirePermission('hrms.recruitment.view'),
  controller.getRequisitionById,
);

recruitmentRouter.patch(
  '/hrms/recruitment/requisitions/:id',
  requirePermission('hrms.recruitment.requisitions_manage'),
  controller.updateRequisition,
);

recruitmentRouter.post(
  '/hrms/recruitment/requisitions/:id/close',
  requirePermission('hrms.recruitment.requisitions_manage'),
  controller.closeRequisition,
);

// -----------------------------------------------------------------------------
// Job Postings
// -----------------------------------------------------------------------------
recruitmentRouter.post(
  '/hrms/recruitment/postings',
  requirePermission('hrms.recruitment.requisitions_manage'),
  controller.createJobPosting,
);

recruitmentRouter.get(
  '/hrms/recruitment/postings',
  requirePermission('hrms.recruitment.view'),
  controller.listJobPostings,
);

recruitmentRouter.get(
  '/hrms/recruitment/postings/:id',
  requirePermission('hrms.recruitment.view'),
  controller.getJobPostingById,
);

recruitmentRouter.post(
  '/hrms/recruitment/postings/:id/publish',
  requirePermission('hrms.recruitment.requisitions_manage'),
  controller.publishJobPosting,
);

recruitmentRouter.post(
  '/hrms/recruitment/postings/:id/close',
  requirePermission('hrms.recruitment.requisitions_manage'),
  controller.closeJobPosting,
);

// -----------------------------------------------------------------------------
// Candidates
// -----------------------------------------------------------------------------
recruitmentRouter.post(
  '/hrms/recruitment/candidates',
  requirePermission('hrms.recruitment.candidates_manage'),
  controller.createCandidate,
);

recruitmentRouter.get(
  '/hrms/recruitment/candidates',
  requirePermission('hrms.recruitment.candidates_view'),
  controller.listCandidates,
);

recruitmentRouter.get(
  '/hrms/recruitment/candidates/:id',
  requirePermission('hrms.recruitment.candidates_view'),
  controller.getCandidateById,
);

recruitmentRouter.patch(
  '/hrms/recruitment/candidates/:id',
  requirePermission('hrms.recruitment.candidates_manage'),
  controller.updateCandidate,
);

// -----------------------------------------------------------------------------
// Candidate Applications
// -----------------------------------------------------------------------------
recruitmentRouter.post(
  '/hrms/recruitment/applications',
  requirePermission('hrms.recruitment.applications_manage'),
  controller.createApplication,
);

recruitmentRouter.get(
  '/hrms/recruitment/applications',
  requirePermission('hrms.recruitment.view'),
  controller.listApplications,
);

recruitmentRouter.get(
  '/hrms/recruitment/applications/:id',
  requirePermission('hrms.recruitment.view'),
  controller.getApplicationById,
);

recruitmentRouter.post(
  '/hrms/recruitment/applications/:id/stage',
  requirePermission('hrms.recruitment.applications_manage'),
  controller.changeApplicationStage,
);

recruitmentRouter.post(
  '/hrms/recruitment/applications/:id/reject',
  requirePermission('hrms.recruitment.applications_manage'),
  controller.rejectApplication,
);

recruitmentRouter.post(
  '/hrms/recruitment/applications/:id/withdraw',
  requirePermission('hrms.recruitment.applications_manage'),
  controller.withdrawApplication,
);

recruitmentRouter.post(
  '/hrms/recruitment/applications/:id/recruiter',
  requirePermission('hrms.recruitment.applications_manage'),
  controller.assignRecruiter,
);

recruitmentRouter.post(
  '/hrms/recruitment/applications/:applicationId/notes',
  requirePermission('hrms.recruitment.applications_manage'),
  controller.addNote,
);

recruitmentRouter.get(
  '/hrms/recruitment/applications/:applicationId/activities',
  requirePermission('hrms.recruitment.view'),
  controller.listActivities,
);

// -----------------------------------------------------------------------------
// Pipeline Stages
// -----------------------------------------------------------------------------
recruitmentRouter.get(
  '/hrms/recruitment/stages',
  requirePermission('hrms.recruitment.view'),
  controller.listStages,
);

// -----------------------------------------------------------------------------
// Interviews
// -----------------------------------------------------------------------------
recruitmentRouter.post(
  '/hrms/recruitment/interviews',
  requirePermission('hrms.recruitment.interviews_manage'),
  controller.scheduleInterview,
);

recruitmentRouter.get(
  '/hrms/recruitment/interviews',
  requirePermission('hrms.recruitment.view'),
  controller.listInterviews,
);

recruitmentRouter.get(
  '/hrms/recruitment/interviews/:id',
  requirePermission('hrms.recruitment.view'),
  controller.getInterviewById,
);

recruitmentRouter.post(
  '/hrms/recruitment/interviews/:id/reschedule',
  requirePermission('hrms.recruitment.interviews_manage'),
  controller.rescheduleInterview,
);

recruitmentRouter.post(
  '/hrms/recruitment/interviews/:id/cancel',
  requirePermission('hrms.recruitment.interviews_manage'),
  controller.cancelInterview,
);

recruitmentRouter.post(
  '/hrms/recruitment/interviews/:id/feedback',
  requirePermission('hrms.recruitment.interviews_manage'),
  controller.recordFeedback,
);

// -----------------------------------------------------------------------------
// Workforce Onboarding Handoff
// -----------------------------------------------------------------------------
recruitmentRouter.get(
  '/hrms/recruitment/onboarding',
  requirePermission('hrms.recruitment.onboarding_view'),
  onboardingController.listOnboardings,
);

recruitmentRouter.get(
  '/hrms/recruitment/onboarding/:id',
  requirePermission('hrms.recruitment.onboarding_view'),
  onboardingController.getOnboardingById,
);

recruitmentRouter.post(
  '/hrms/recruitment/applications/:applicationId/initiate-onboarding',
  requirePermission('hrms.recruitment.onboarding_manage'),
  onboardingController.initiateOnboarding,
);

recruitmentRouter.put(
  '/hrms/recruitment/onboarding/:id',
  requirePermission('hrms.recruitment.onboarding_manage'),
  onboardingController.reviewOnboarding,
);

recruitmentRouter.post(
  '/hrms/recruitment/onboarding/:id/confirm',
  requirePermission('hrms.recruitment.onboarding_confirm'),
  onboardingController.confirmOnboarding,
);

recruitmentRouter.post(
  '/hrms/recruitment/onboarding/:id/cancel',
  requirePermission('hrms.recruitment.onboarding_manage'),
  onboardingController.cancelOnboarding,
);
