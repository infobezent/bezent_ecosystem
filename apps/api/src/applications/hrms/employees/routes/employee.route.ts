import { Router } from 'express';
import { EmployeeController } from '../controller/employee.controller.js';
import type { EmployeeRecordSection } from '../types/employeeProfile.types.js';

export const employeeRouter = Router();
const controller = new EmployeeController();

// Canonical employee records (directory, selection, probation views).
employeeRouter.get('/hrms/employees', controller.listEmployees);
// Create an employee with optional record details in one transaction
// (the target for Onboarding conversion).
employeeRouter.post('/hrms/employees', controller.createEmployee);
employeeRouter.get('/hrms/employees/:employeeId', controller.getEmployeeById);

// Canonical Employee Profile: current record + employee-owned details.
employeeRouter.get('/hrms/employees/:employeeId/profile', controller.getEmployeeProfile);

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
    controller.updateRecordSection(section),
  );
}
