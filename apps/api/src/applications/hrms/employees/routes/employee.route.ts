import { Router } from 'express';
import { EmployeeController } from '../controller/employee.controller.js';
import type { EmployeeRecordSection } from '../types/employeeProfile.types.js';
import { requirePermission } from '../../../../platform/access/middleware/access.middleware.js';

export const employeeRouter = Router();
const controller = new EmployeeController();

// Every route runs behind requireApplicationAccess('hrms') (see createApp);
// each operation then requires its own permission (ADR-017).

// Canonical employee records (directory, selection, probation views).
employeeRouter.get(
  '/hrms/employees',
  requirePermission('hrms.employees.read'),
  controller.listEmployees,
);
employeeRouter.get(
  '/hrms/employees/next-number',
  requirePermission('hrms.employees.create'),
  controller.getNextEmployeeNumber,
);
employeeRouter.get(
  '/hrms/employees/resolve-referral/:code',
  requirePermission('hrms.employees.create'),
  controller.resolveReferral,
);
// Create an employee with optional record details in one transaction
// (the target for Onboarding conversion).
employeeRouter.post(
  '/hrms/employees',
  requirePermission('hrms.employees.create'),
  controller.createEmployee,
);
employeeRouter.get(
  '/hrms/employees/:employeeId',
  requirePermission('hrms.employees.read'),
  controller.getEmployeeById,
);

// Canonical Employee Profile: current record + employee-owned details.
employeeRouter.get(
  '/hrms/employees/:employeeId/profile',
  requirePermission('hrms.employees.read'),
  controller.getEmployeeProfile,
);

// Employee-owned detail sections (full replacement per section).
const SECTION_ROUTES: Record<string, EmployeeRecordSection> = {
  personal: 'personal',
  'family-members': 'familyMembers',
  nominees: 'nominees',
  'emergency-contacts': 'emergencyContacts',
  'bank-account': 'bankAccount',
  skills: 'skills',
  'work-schedule': 'workSchedule',
};
for (const [path, section] of Object.entries(SECTION_ROUTES)) {
  employeeRouter.put(
    `/hrms/employees/:employeeId/${path}`,
    requirePermission('hrms.employees.update'),
    controller.updateRecordSection(section),
  );
}
