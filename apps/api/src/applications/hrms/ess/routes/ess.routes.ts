import { Router } from 'express';
import { essController } from '../controller/ess.controller.js';
import {
  requirePlatformAuth,
  requireEssAuth,
} from '../../../../platform/auth/middleware/auth.middleware.js';

export const essRouter = Router();

// Enforce platform authentication and employee identity resolution across all ESS routes
essRouter.use(requirePlatformAuth);
essRouter.use(requireEssAuth);

// 1. Dashboard
essRouter.get('/dashboard', essController.getDashboard);

// 2. Profile & Profile Change Requests
essRouter.get('/profile', essController.getProfile);
essRouter.post('/profile/change-requests', essController.createProfileChangeRequest);

// 3. Attendance
essRouter.get('/attendance', essController.getAttendance);
essRouter.post('/attendance/check-in', essController.checkIn);
essRouter.post('/attendance/check-out', essController.checkOut);
essRouter.post('/attendance/regularize', essController.regularizeAttendance);

// 4. Leave
essRouter.get('/leave', essController.getLeaveWorkspace);
essRouter.post('/leave/apply', essController.applyLeave);
essRouter.post('/leave/:id/cancel', essController.cancelLeave);

// 5. Timesheets
essRouter.get('/timesheets', essController.getTimesheets);
essRouter.post('/timesheets/log', essController.logTimesheet);
essRouter.post('/timesheets/submit', essController.submitTimesheets);

// 6. Documents
essRouter.get('/documents', essController.getDocuments);
essRouter.post('/documents/upload', essController.submitDocument);

// 7. Requests (Unified Ledger)
essRouter.get('/requests', essController.getRequests);
essRouter.post('/requests/:id/cancel', essController.cancelRequest);

// 8. Tasks
essRouter.get('/tasks', essController.getTasks);
essRouter.patch('/tasks/:id/status', essController.updateTaskStatus);

// 9. Notifications
essRouter.get('/notifications', essController.getNotifications);
essRouter.patch('/notifications/:id/read', essController.markNotificationRead);
essRouter.post('/notifications/read-all', essController.markAllNotificationsRead);

// 10. Payslips (Conditional / Status)
essRouter.get('/payslips', essController.getPayslips);
