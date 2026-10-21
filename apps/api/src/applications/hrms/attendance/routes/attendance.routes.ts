import { Router } from 'express';
import { attendanceController } from '../controller/attendance.controller.js';
import { attendanceSettingsController } from '../controller/attendanceSettings.controller.js';
import { attendanceRegularizationController } from '../controller/attendanceRegularization.controller.js';
import { attendanceOnDutyController } from '../controller/attendanceOnDuty.controller.js';
import { attendanceMonthlySummaryController } from '../controller/attendanceMonthlySummary.controller.js';
import { attendanceReportsController } from '../controller/attendanceReports.controller.js';
import { attendanceOverviewController } from '../controller/attendanceOverview.controller.js';
import { attendanceOvertimeController } from '../controller/attendanceOvertime.controller.js';
import { attendanceCompOffController } from '../controller/attendanceCompOff.controller.js';
import { requireReadWrite } from '../../../../platform/access/middleware/access.middleware.js';

export const attendanceRouter = Router();

attendanceRouter.use(
  '/hrms/attendance',
  requireReadWrite(['hrms.attendance.view'], 'hrms.attendance.regularize'),
);

// 1. Overview & Operational Control Center V1.0
attendanceRouter.get('/hrms/attendance/overview', attendanceOverviewController.getOverview);
attendanceRouter.get('/hrms/attendance/overview/today', attendanceOverviewController.getTodayKpis);
attendanceRouter.get('/hrms/attendance/overview/trends', attendanceOverviewController.getTrends);
attendanceRouter.get(
  '/hrms/attendance/overview/departments',
  attendanceOverviewController.getDepartments,
);
attendanceRouter.get(
  '/hrms/attendance/overview/actions',
  attendanceOverviewController.getActionQueue,
);
attendanceRouter.get(
  '/hrms/attendance/overview/processing-health',
  attendanceOverviewController.getProcessingHealth,
);
attendanceRouter.get(
  '/hrms/attendance/overview/monthly-readiness',
  attendanceOverviewController.getMonthlyReadiness,
);

// 2. Daily Log
attendanceRouter.get('/hrms/attendance/daily-log', attendanceController.getDailyLog);
attendanceRouter.get(
  '/hrms/attendance/daily-log/employee/:employeeId',
  attendanceController.getEmployeeDailyDetail,
);
attendanceRouter.post(
  '/hrms/attendance/daily-log/recalculate',
  attendanceController.recalculateDailyAttendance,
);
attendanceRouter.post(
  '/hrms/attendance/daily-log/bulk-finalize',
  attendanceController.bulkFinalizeDailyAttendance,
);

// 3. Monthly Summary V1.0
attendanceRouter.get('/hrms/attendance/monthly-summary', (req, res, next) => {
  if (req.query.view === 'matrix') {
    return attendanceController.getMonthlySummary(req, res, next);
  }
  return attendanceMonthlySummaryController.getWorkspace(req, res, next);
});
attendanceRouter.get(
  '/hrms/attendance/monthly-summary/workspace',
  attendanceMonthlySummaryController.getWorkspace,
);
attendanceRouter.get(
  '/hrms/attendance/monthly-summary/export',
  attendanceMonthlySummaryController.exportSummaries,
);
attendanceRouter.post(
  '/hrms/attendance/monthly-summary/export',
  attendanceMonthlySummaryController.exportSummaries,
);
attendanceRouter.post(
  '/hrms/attendance/monthly-summary/bulk-preview',
  attendanceMonthlySummaryController.bulkPreview,
);
attendanceRouter.post(
  '/hrms/attendance/monthly-summary/bulk',
  attendanceMonthlySummaryController.bulkExecute,
);
attendanceRouter.get(
  '/hrms/attendance/monthly-summary/:id',
  attendanceMonthlySummaryController.getSummary,
);
attendanceRouter.get(
  '/hrms/attendance/monthly-summary/:id/days',
  attendanceMonthlySummaryController.getDailyBreakdown,
);
attendanceRouter.get(
  '/hrms/attendance/monthly-summary/:id/readiness',
  attendanceMonthlySummaryController.getReadiness,
);
attendanceRouter.get(
  '/hrms/attendance/monthly-summary/:id/history',
  attendanceMonthlySummaryController.getHistory,
);
attendanceRouter.post(
  '/hrms/attendance/monthly-summary/:id/assign',
  attendanceMonthlySummaryController.assignReviewer,
);
attendanceRouter.post(
  '/hrms/attendance/monthly-summary/:id/start-review',
  attendanceMonthlySummaryController.startReview,
);
attendanceRouter.post(
  '/hrms/attendance/monthly-summary/:id/request-correction',
  attendanceMonthlySummaryController.requestCorrection,
);
attendanceRouter.post(
  '/hrms/attendance/monthly-summary/:id/mark-reviewed',
  attendanceMonthlySummaryController.markReviewed,
);
attendanceRouter.post(
  '/hrms/attendance/monthly-summary/:id/reopen',
  attendanceMonthlySummaryController.reopenReview,
);
attendanceRouter.post(
  '/hrms/attendance/monthly-summary/:id/recalculate',
  attendanceMonthlySummaryController.recalculateSummary,
);

// 4. Punch Logs (Audit history & operations)
attendanceRouter.get('/hrms/attendance/punch-logs', attendanceController.getPunchLogs);
attendanceRouter.get('/hrms/attendance/punch-logs/export', attendanceController.exportPunchLogs);
attendanceRouter.get('/hrms/attendance/punch-logs/:id', attendanceController.getPunchDetails);
attendanceRouter.post(
  '/hrms/attendance/punch-logs/investigation',
  attendanceController.updatePunchInvestigation,
);
attendanceRouter.post(
  '/hrms/attendance/punch-logs/retry',
  attendanceController.retryPunchProcessing,
);
attendanceRouter.post('/hrms/attendance/punch-logs/bulk', attendanceController.bulkPunchAction);

// 5. Exceptions
attendanceRouter.get('/hrms/attendance/exceptions', attendanceController.getExceptions);
attendanceRouter.get(
  '/hrms/attendance/exceptions/export',
  attendanceController.exportExceptionsCsv,
);
attendanceRouter.get('/hrms/attendance/exceptions/:id', attendanceController.getExceptionDetails);
attendanceRouter.post(
  '/hrms/attendance/exceptions/:id/assign',
  attendanceController.assignException,
);
attendanceRouter.post(
  '/hrms/attendance/exceptions/:id/status',
  attendanceController.updateExceptionStatus,
);
attendanceRouter.post(
  '/hrms/attendance/exceptions/:id/severity',
  attendanceController.overrideExceptionSeverity,
);
attendanceRouter.post(
  '/hrms/attendance/exceptions/:id/verify-resolve',
  attendanceController.verifyAndResolveException,
);
attendanceRouter.post('/hrms/attendance/exceptions/bulk', attendanceController.bulkExceptionAction);

// 6. Regularization Workflow V1.0
attendanceRouter.get(
  '/hrms/attendance/regularization',
  attendanceRegularizationController.listWorkspace,
);
attendanceRouter.get(
  '/hrms/attendance/regularization/workspace',
  attendanceRegularizationController.listWorkspace,
);
attendanceRouter.get(
  '/hrms/attendance/regularization/eligibility',
  attendanceRegularizationController.checkEligibility,
);
attendanceRouter.post(
  '/hrms/attendance/regularization/eligibility',
  attendanceRegularizationController.checkEligibility,
);
attendanceRouter.get(
  '/hrms/attendance/regularization/export',
  attendanceRegularizationController.exportCsv,
);
attendanceRouter.post(
  '/hrms/attendance/regularization/export',
  attendanceRegularizationController.exportCsv,
);
attendanceRouter.post(
  '/hrms/attendance/regularization/bulk',
  attendanceRegularizationController.bulkAction,
);
attendanceRouter.post(
  '/hrms/attendance/regularization',
  attendanceRegularizationController.submitRequest,
);
attendanceRouter.get(
  '/hrms/attendance/regularization/:id',
  attendanceRegularizationController.getDetails,
);
attendanceRouter.post(
  '/hrms/attendance/regularization/:id/assign',
  attendanceRegularizationController.assignReviewer,
);
attendanceRouter.post(
  '/hrms/attendance/regularization/:id/start-review',
  attendanceRegularizationController.startReview,
);
attendanceRouter.post(
  '/hrms/attendance/regularization/:id/request-info',
  attendanceRegularizationController.requestClarification,
);
attendanceRouter.post(
  '/hrms/attendance/regularization/:id/clarify',
  attendanceRegularizationController.provideClarification,
);
attendanceRouter.patch(
  '/hrms/attendance/regularization/:id/review',
  attendanceRegularizationController.reviewRequest,
);
attendanceRouter.post(
  '/hrms/attendance/regularization/:id/review',
  attendanceRegularizationController.reviewRequest,
);
attendanceRouter.post(
  '/hrms/attendance/regularization/:id/decision',
  attendanceRegularizationController.reviewRequest,
);
attendanceRouter.post(
  '/hrms/attendance/regularization/:id/cancel',
  attendanceRegularizationController.cancelRequest,
);

// 6b. On-Duty (OD) Operational Workflow V1.0
attendanceRouter.get(
  '/hrms/attendance/on-duty/types',
  attendanceOnDutyController.getConfiguredOdTypes,
);
attendanceRouter.get('/hrms/attendance/on-duty', attendanceOnDutyController.listWorkspace);
attendanceRouter.post('/hrms/attendance/on-duty', attendanceOnDutyController.createRequest);
attendanceRouter.get('/hrms/attendance/on-duty/export', attendanceOnDutyController.exportRequests);
attendanceRouter.post('/hrms/attendance/on-duty/export', attendanceOnDutyController.exportRequests);
attendanceRouter.post(
  '/hrms/attendance/on-duty/bulk-preview',
  attendanceOnDutyController.previewBulkApproval,
);
attendanceRouter.post('/hrms/attendance/on-duty/bulk', attendanceOnDutyController.bulkAction);
attendanceRouter.get('/hrms/attendance/on-duty/:id', attendanceOnDutyController.getRequestDetails);
attendanceRouter.post(
  '/hrms/attendance/on-duty/:id/assign',
  attendanceOnDutyController.assignReviewer,
);
attendanceRouter.post(
  '/hrms/attendance/on-duty/:id/start-review',
  attendanceOnDutyController.startReview,
);
attendanceRouter.post(
  '/hrms/attendance/on-duty/:id/request-info',
  attendanceOnDutyController.requestClarification,
);
attendanceRouter.post(
  '/hrms/attendance/on-duty/:id/clarify',
  attendanceOnDutyController.provideClarification,
);
attendanceRouter.post(
  '/hrms/attendance/on-duty/:id/decision',
  attendanceOnDutyController.reviewDecision,
);
attendanceRouter.patch(
  '/hrms/attendance/on-duty/:id/review',
  attendanceOnDutyController.reviewDecision,
);
attendanceRouter.post(
  '/hrms/attendance/on-duty/:id/review',
  attendanceOnDutyController.reviewDecision,
);
attendanceRouter.post(
  '/hrms/attendance/on-duty/:id/cancel',
  attendanceOnDutyController.cancelRequest,
);
attendanceRouter.post(
  '/hrms/attendance/on-duty/:id/withdraw',
  attendanceOnDutyController.cancelRequest,
);

// 6c. Overtime (OT) Operational Workflow V1.0
attendanceRouter.get(
  '/hrms/attendance/overtime/overview',
  attendanceOvertimeController.getOverview,
);
attendanceRouter.get(
  '/hrms/attendance/overtime/eligibility',
  attendanceOvertimeController.checkEligibility,
);
attendanceRouter.get(
  '/hrms/attendance/overtime/requests',
  attendanceOvertimeController.listRequests,
);
attendanceRouter.post(
  '/hrms/attendance/overtime/requests',
  attendanceOvertimeController.createRequest,
);
attendanceRouter.get(
  '/hrms/attendance/overtime/requests/:id',
  attendanceOvertimeController.getRequestDetails,
);
attendanceRouter.post(
  '/hrms/attendance/overtime/requests/:id/decision',
  attendanceOvertimeController.decideRequest,
);
attendanceRouter.post(
  '/hrms/attendance/overtime/requests/:id/withdraw',
  attendanceOvertimeController.withdrawRequest,
);
attendanceRouter.post(
  '/hrms/attendance/overtime/requests/:id/cancel',
  attendanceOvertimeController.cancelRequest,
);
attendanceRouter.post(
  '/hrms/attendance/overtime/requests/:id/settle',
  attendanceOvertimeController.allocateSettlement,
);
attendanceRouter.get(
  '/hrms/attendance/overtime/settlements',
  attendanceOvertimeController.listSettlements,
);
attendanceRouter.post(
  '/hrms/attendance/overtime/settlements/:settlementId/reverse',
  attendanceOvertimeController.reverseSettlement,
);
attendanceRouter.get(
  '/hrms/attendance/overtime/policies',
  attendanceOvertimeController.listPolicies,
);
attendanceRouter.post(
  '/hrms/attendance/overtime/policies',
  attendanceOvertimeController.createPolicy,
);
attendanceRouter.get(
  '/hrms/attendance/overtime/policies/:id',
  attendanceOvertimeController.getPolicyDetails,
);
attendanceRouter.put(
  '/hrms/attendance/overtime/policies/:id',
  attendanceOvertimeController.updatePolicy,
);

// 6d. Compensatory Off (Comp-Off) Operational Workflow V1.0
attendanceRouter.get('/hrms/attendance/comp-off/overview', attendanceCompOffController.getOverview);
attendanceRouter.get(
  '/hrms/attendance/comp-off/eligibility',
  attendanceCompOffController.checkEligibility,
);
attendanceRouter.get(
  '/hrms/attendance/comp-off/requests',
  attendanceCompOffController.listRequests,
);
attendanceRouter.post(
  '/hrms/attendance/comp-off/requests',
  attendanceCompOffController.createRequest,
);
attendanceRouter.get(
  '/hrms/attendance/comp-off/requests/:id',
  attendanceCompOffController.getRequestDetail,
);
attendanceRouter.post(
  '/hrms/attendance/comp-off/requests/:id/decision',
  attendanceCompOffController.decideRequest,
);
attendanceRouter.post(
  '/hrms/attendance/comp-off/requests/:id/withdraw',
  attendanceCompOffController.withdrawRequest,
);
attendanceRouter.post(
  '/hrms/attendance/comp-off/requests/:id/cancel',
  attendanceCompOffController.withdrawRequest,
);
attendanceRouter.get(
  '/hrms/attendance/comp-off/approvals',
  attendanceCompOffController.getApprovalQueue,
);
attendanceRouter.get(
  '/hrms/attendance/comp-off/approval-queue',
  attendanceCompOffController.getApprovalQueue,
);
attendanceRouter.get(
  '/hrms/attendance/comp-off/entitlements',
  attendanceCompOffController.listEntitlements,
);
attendanceRouter.post(
  '/hrms/attendance/comp-off/entitlements/:id/reverse',
  attendanceCompOffController.reverseEntitlement,
);
attendanceRouter.post(
  '/hrms/attendance/comp-off/entitlements/auto-lapse',
  attendanceCompOffController.triggerAutoLapse,
);
attendanceRouter.post(
  '/hrms/attendance/comp-off/from-overtime/:settlementId',
  attendanceCompOffController.convertFromOvertime,
);
attendanceRouter.get(
  '/hrms/attendance/comp-off/handoffs',
  attendanceCompOffController.listHandoffs,
);
attendanceRouter.get(
  '/hrms/attendance/comp-off/policies',
  attendanceCompOffController.listPolicies,
);
attendanceRouter.post(
  '/hrms/attendance/comp-off/policies',
  attendanceCompOffController.createPolicy,
);
attendanceRouter.get(
  '/hrms/attendance/comp-off/policies/:id',
  attendanceCompOffController.getPolicyDetails,
);
attendanceRouter.put(
  '/hrms/attendance/comp-off/policies/:id',
  attendanceCompOffController.updatePolicy,
);
attendanceRouter.get(
  '/hrms/attendance/comp-off/requests/:id/audits',
  attendanceCompOffController.getRequestAudits,
);

// 7. Manual Correction
attendanceRouter.post('/hrms/attendance/manual-correction', attendanceController.manualCorrection);

// 8. Attendance Reports V1.0 Endpoints
attendanceRouter.get('/hrms/attendance/reports/catalog', attendanceReportsController.getCatalog);
attendanceRouter.post(
  '/hrms/attendance/reports/:reportId/preview',
  attendanceReportsController.previewReport,
);
attendanceRouter.post(
  '/hrms/attendance/reports/:reportId/export',
  attendanceReportsController.exportReport,
);
attendanceRouter.post(
  '/hrms/attendance/reports/:reportId/analytics',
  attendanceReportsController.getReportAnalytics,
);

// Saved Report Configurations
attendanceRouter.get('/hrms/attendance/reports/saved', attendanceReportsController.getSavedReports);
attendanceRouter.post(
  '/hrms/attendance/reports/saved',
  attendanceReportsController.createSavedReport,
);
attendanceRouter.patch(
  '/hrms/attendance/reports/saved/:id',
  attendanceReportsController.updateSavedReport,
);
attendanceRouter.delete(
  '/hrms/attendance/reports/saved/:id',
  attendanceReportsController.deleteSavedReport,
);

// Report Generation History & Download
attendanceRouter.get('/hrms/attendance/reports/history', attendanceReportsController.getHistory);
attendanceRouter.get(
  '/hrms/attendance/reports/history/:id',
  attendanceReportsController.downloadHistoryFile,
);
attendanceRouter.get(
  '/hrms/attendance/reports/history/:id/download',
  attendanceReportsController.downloadHistoryFile,
);

// Legacy CSV Export (Backward Compatibility)
attendanceRouter.get('/hrms/attendance/reports/export', attendanceController.exportReports);

// 9. Legacy Policies Configuration (Backward Compatibility)
attendanceRouter.get('/hrms/attendance/policies', attendanceController.getPolicy);
attendanceRouter.put('/hrms/attendance/policies', attendanceController.updatePolicy);

// 10. Attendance Settings V1.0 Endpoints
attendanceRouter.use(
  '/hrms/attendance/settings',
  requireReadWrite(
    ['hrms.settings.view', 'hrms.settings.read', 'hrms.attendance.view'],
    'hrms.settings.manage',
  ),
);

// General
attendanceRouter.get(
  '/hrms/attendance/settings/general',
  attendanceSettingsController.getGeneralSettings,
);
attendanceRouter.put(
  '/hrms/attendance/settings/general',
  attendanceSettingsController.updateGeneralSettings,
);

// Policies & Overrides
attendanceRouter.get(
  '/hrms/attendance/settings/policies',
  attendanceSettingsController.listPolicies,
);
attendanceRouter.post(
  '/hrms/attendance/settings/policies',
  attendanceSettingsController.createPolicy,
);
attendanceRouter.get(
  '/hrms/attendance/settings/policies/effective',
  attendanceSettingsController.resolveEffectivePolicy,
);
attendanceRouter.get(
  '/hrms/attendance/settings/policies/:id',
  attendanceSettingsController.getPolicyById,
);
attendanceRouter.put(
  '/hrms/attendance/settings/policies/:id',
  attendanceSettingsController.updatePolicy,
);
attendanceRouter.post(
  '/hrms/attendance/settings/policies/:id/publish',
  attendanceSettingsController.publishPolicy,
);
attendanceRouter.post(
  '/hrms/attendance/settings/policies/:id/rollback',
  attendanceSettingsController.rollbackPolicyVersion,
);

// Shifts & Rosters
attendanceRouter.get(
  '/hrms/attendance/settings/shifts',
  attendanceSettingsController.getShiftSettings,
);
attendanceRouter.put(
  '/hrms/attendance/settings/shifts',
  attendanceSettingsController.updateShiftSettings,
);
attendanceRouter.post('/hrms/attendance/settings/shifts', attendanceSettingsController.createShift);
attendanceRouter.put(
  '/hrms/attendance/settings/shifts/:id',
  attendanceSettingsController.updateShift,
);
attendanceRouter.delete(
  '/hrms/attendance/settings/shifts/:id',
  attendanceSettingsController.deleteShift,
);

// Regularization
attendanceRouter.get(
  '/hrms/attendance/settings/regularization',
  attendanceSettingsController.getRegularizationSettings,
);
attendanceRouter.put(
  '/hrms/attendance/settings/regularization',
  attendanceSettingsController.updateRegularizationSettings,
);

// Capture & Devices
attendanceRouter.get('/hrms/attendance/settings/devices', attendanceSettingsController.listDevices);
attendanceRouter.post(
  '/hrms/attendance/settings/devices',
  attendanceSettingsController.registerDevice,
);
attendanceRouter.put(
  '/hrms/attendance/settings/devices/:id',
  attendanceSettingsController.updateDevice,
);
attendanceRouter.post(
  '/hrms/attendance/settings/devices/:id/test',
  attendanceSettingsController.testDeviceConnection,
);

// Bulk Imports & Migration
attendanceRouter.get(
  '/hrms/attendance/settings/import/batches',
  attendanceSettingsController.listImportBatches,
);
attendanceRouter.post(
  '/hrms/attendance/settings/import',
  attendanceSettingsController.processBulkImport,
);
attendanceRouter.post(
  '/hrms/attendance/settings/import/batches/:id/rollback',
  attendanceSettingsController.rollbackImportBatch,
);

// Location & Security
attendanceRouter.get(
  '/hrms/attendance/settings/security',
  attendanceSettingsController.getSecuritySettings,
);
attendanceRouter.put(
  '/hrms/attendance/settings/security',
  attendanceSettingsController.updateSecuritySettings,
);

// Payroll & Locking
attendanceRouter.get(
  '/hrms/attendance/settings/payroll',
  attendanceSettingsController.getPayrollSettings,
);
attendanceRouter.put(
  '/hrms/attendance/settings/payroll',
  attendanceSettingsController.updatePayrollSettings,
);
attendanceRouter.get(
  '/hrms/attendance/settings/payroll/periods',
  attendanceSettingsController.listPeriods,
);
attendanceRouter.get(
  '/hrms/attendance/settings/payroll/periods/:code/readiness',
  attendanceSettingsController.checkPeriodLockReadiness,
);
attendanceRouter.post(
  '/hrms/attendance/settings/payroll/periods/:code/lock',
  attendanceSettingsController.lockPeriod,
);
attendanceRouter.post(
  '/hrms/attendance/settings/payroll/periods/:code/unlock',
  attendanceSettingsController.unlockPeriod,
);
attendanceRouter.get(
  '/hrms/attendance/settings/payroll/handover',
  attendanceSettingsController.listHandoverBatches,
);
attendanceRouter.post(
  '/hrms/attendance/settings/payroll/handover/generate',
  attendanceSettingsController.generatePayrollHandover,
);

// Audit & History
attendanceRouter.get('/hrms/attendance/settings/audit', attendanceSettingsController.getAuditLogs);
