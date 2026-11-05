import { Router } from 'express';
import { ShiftController, shiftController } from '../controller/shift.controller.js';
import { requirePermission } from '../../../../platform/access/middleware/access.middleware.js';

export const shiftRouter = Router();
const controller = shiftController;

// -----------------------------------------------------------------------------
// Shift Definitions
// -----------------------------------------------------------------------------

// Specific employee resolution route must precede :id parameter
shiftRouter.get(
  '/hrms/shifts/employee/:employeeId',
  requirePermission('hrms.shifts.view'),
  controller.resolveEmployeeShift,
);

shiftRouter.get('/hrms/shifts', requirePermission('hrms.shifts.view'), controller.listShifts);

shiftRouter.get('/hrms/shifts/:id', requirePermission('hrms.shifts.view'), controller.getShiftById);

shiftRouter.post('/hrms/shifts', requirePermission('hrms.shifts.manage'), controller.createShift);

shiftRouter.put(
  '/hrms/shifts/:id',
  requirePermission('hrms.shifts.manage'),
  controller.updateShift,
);

shiftRouter.patch(
  '/hrms/shifts/:id/status',
  requirePermission('hrms.shifts.manage'),
  controller.patchShiftStatus,
);

shiftRouter.delete(
  '/hrms/shifts/:id',
  requirePermission('hrms.shifts.manage'),
  controller.deleteShift,
);

// -----------------------------------------------------------------------------
// Shift Assignments
// -----------------------------------------------------------------------------

shiftRouter.get(
  '/hrms/shift-assignments',
  requirePermission('hrms.shift_assignments.view'),
  controller.listAssignments,
);

shiftRouter.get(
  '/hrms/shift-assignments/:id',
  requirePermission('hrms.shift_assignments.view'),
  controller.getAssignmentById,
);

shiftRouter.post(
  '/hrms/shift-assignments',
  requirePermission('hrms.shift_assignments.manage'),
  controller.createAssignment,
);

shiftRouter.put(
  '/hrms/shift-assignments/:id',
  requirePermission('hrms.shift_assignments.manage'),
  controller.updateAssignment,
);

shiftRouter.post(
  '/hrms/shift-assignments/:id/end',
  requirePermission('hrms.shift_assignments.manage'),
  controller.endAssignment,
);

shiftRouter.delete(
  '/hrms/shift-assignments/:id',
  requirePermission('hrms.shift_assignments.manage'),
  controller.deleteAssignment,
);
