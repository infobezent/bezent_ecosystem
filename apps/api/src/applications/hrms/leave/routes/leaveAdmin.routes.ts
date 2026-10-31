import { Router } from 'express';
import {
  leaveAccrualController as accrual,
  leaveApprovalsController as approvals,
  leaveRestrictionsController as restrictions,
} from '../controller/leaveAdmin.controller.js';
import {
  requirePermission,
  requireReadWrite,
} from '../../../../platform/access/middleware/access.middleware.js';

export const leaveAdminRouter = Router();

const settingsGuard = requireReadWrite(
  [
    'hrms.leave.settings.view',
    'hrms.leave.settings.manage',
    'hrms.settings.view',
    'hrms.settings.manage',
  ],
  'hrms.leave.settings.manage',
);

// Tab 7 — approval workflows
leaveAdminRouter.use('/hrms/leave/workflows', settingsGuard);
leaveAdminRouter.get('/hrms/leave/workflows', approvals.listWorkflows);
leaveAdminRouter.post('/hrms/leave/workflows', approvals.createWorkflow);
leaveAdminRouter.get('/hrms/leave/workflows/:id', approvals.getWorkflow);
leaveAdminRouter.put('/hrms/leave/workflows/:id', approvals.updateWorkflow);

// HR approval queue: approvers act on their own steps; settings managers can see and act on all.
leaveAdminRouter.use(
  '/hrms/leave/approvals',
  requireReadWrite(['hrms.leave.approve', 'hrms.leave.view'], 'hrms.leave.approve'),
);
leaveAdminRouter.get('/hrms/leave/approvals', approvals.queue);
leaveAdminRouter.post('/hrms/leave/approvals/:approvalId/approve', approvals.approve);
leaveAdminRouter.post('/hrms/leave/approvals/:approvalId/reject', approvals.reject);

// Tab 5 — restrictions
leaveAdminRouter.use('/hrms/leave/restrictions', settingsGuard);
leaveAdminRouter.get('/hrms/leave/restrictions', restrictions.list);
leaveAdminRouter.post('/hrms/leave/restrictions', restrictions.create);
leaveAdminRouter.get('/hrms/leave/restrictions/:ruleKey/history', restrictions.history);
leaveAdminRouter.put('/hrms/leave/restrictions/:ruleKey', restrictions.update);

// Tab 4 — accrual & carry forward, year-end
leaveAdminRouter.use('/hrms/leave/accrual', settingsGuard);
leaveAdminRouter.get('/hrms/leave/accrual/rules', accrual.listRules);
leaveAdminRouter.put('/hrms/leave/accrual/rules/:leaveTypeId', accrual.saveRule);
leaveAdminRouter.get('/hrms/leave/accrual/year-end/preview', accrual.previewYearEnd);
leaveAdminRouter.get('/hrms/leave/accrual/year-end/runs', accrual.listRuns);
leaveAdminRouter.get('/hrms/leave/accrual/encashments', accrual.listEncashments);
leaveAdminRouter.post(
  '/hrms/leave/accrual/year-end/review',
  requirePermission('hrms.leave.year_end_process'),
  accrual.reviewYearEnd,
);
leaveAdminRouter.post(
  '/hrms/leave/accrual/year-end/commit',
  requirePermission('hrms.leave.year_end_process'),
  accrual.commitYearEnd,
);
