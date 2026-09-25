import { Router } from 'express';
import { EmployeeController } from '../controller/employee.controller.js';

export const employeeRouter = Router();
const controller = new EmployeeController();

// Read access to canonical employee records (employee selection, probation views).
employeeRouter.get('/hrms/employees', controller.listEmployees);
employeeRouter.get('/hrms/employees/:employeeId', controller.getEmployeeById);
