import { Router } from 'express';
import {
  leaveOperationsController as ops,
  leaveReportsController as reports,
} from '../controller/leaveOperations.controller.js';
import {
  requireAnyPermission,
  requirePermission,
  requireReadWrite,
} from '../../../../platform/access/middleware/access.middleware.js';

export const leaveOperationsRouter = Router();

const LEAVE_READ = ['hrms.leave.view', 'hrms.leave.approve'];

leaveOperationsRouter.get(
  '/hrms/leave/overview',
  requireAnyPermission(...LEAVE_READ),
  ops.overview,
);

// Request register: readers see their scope; writes (apply on behalf, HR cancel) are HR-only.
leaveOperationsRouter.use(
  '/hrms/leave/requests',
  requireReadWrite(LEAVE_READ, 'hrms.leave.apply_on_behalf'),
);
leaveOperationsRouter.get('/hrms/leave/requests', ops.listRequests);
leaveOperationsRouter.post('/hrms/leave/requests', ops.applyOnBehalf);
leaveOperationsRouter.get('/hrms/leave/requests/:id', ops.getRequest);
leaveOperationsRouter.post('/hrms/leave/requests/:id/cancel', ops.cancelRequest);

leaveOperationsRouter.get(
  '/hrms/leave/employees/:employeeId/workspace',
  requirePermission('hrms.leave.apply_on_behalf'),
  ops.employeeWorkspace,
);

// Approval queue helpers (the queue and single decisions live in leaveAdmin.routes).
leaveOperationsRouter.get(
  '/hrms/leave/approval-stats',
  requireAnyPermission(...LEAVE_READ),
  ops.approvalStats,
);
leaveOperationsRouter.post(
  '/hrms/leave/approvals/bulk-approve',
  requirePermission('hrms.leave.approve'),
  ops.bulkApprove,
);

// P2 — team calendar and leave balances.
leaveOperationsRouter.get(
  '/hrms/leave/calendar',
  requireAnyPermission(...LEAVE_READ),
  ops.calendar,
);
leaveOperationsRouter.get(
  '/hrms/leave/balances',
  requireAnyPermission(...LEAVE_READ),
  ops.balances,
);
leaveOperationsRouter.get(
  '/hrms/leave/balances/:employeeId/ledger',
  requireAnyPermission(...LEAVE_READ),
  ops.ledger,
);
leaveOperationsRouter.post(
  '/hrms/leave/balances/adjustments',
  requirePermission('hrms.leave.balance_adjust'),
  ops.adjustBalance,
);

// P3 — holiday calendar (read view) and year-end processing.
leaveOperationsRouter.get(
  '/hrms/leave/holiday-calendar',
  requireAnyPermission(...LEAVE_READ),
  ops.holidayCalendar,
);
leaveOperationsRouter.get('/hrms/leave/year-end', requireAnyPermission(...LEAVE_READ), ops.yearEnd);
leaveOperationsRouter.post(
  '/hrms/leave/year-end/close',
  requirePermission('hrms.leave.year_end_process'),
  ops.closeYear,
);

// P4 — reports (JSON, or CSV with ?format=csv).
leaveOperationsRouter.get(
  '/hrms/leave/reports/:reportId',
  requireAnyPermission(...LEAVE_READ),
  reports.report,
);
