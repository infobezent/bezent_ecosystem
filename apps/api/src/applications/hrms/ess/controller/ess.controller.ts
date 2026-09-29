import type { Request, Response, NextFunction } from 'express';
import { EssService } from '../service/ess.service.js';
import { AppError } from '../../../../app/errors/AppError.js';

export class EssController {
  constructor(private readonly service: EssService = new EssService()) {}

  getDashboard = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.service.getDashboardData(req.employeeContext!);
      res.status(200).json({ data });
    } catch (err) {
      next(err);
    }
  };

  getProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const profile = await this.service.getFullProfile(req.employeeContext!);
      res.status(200).json({ data: profile });
    } catch (err) {
      next(err);
    }
  };

  createProfileChangeRequest = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.service.createProfileChangeRequest(req.employeeContext!, req.body);
      res.status(201).json({ data: result });
    } catch (err) {
      next(err);
    }
  };

  getAttendance = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const attendance = await this.service.getAttendanceWorkspace(req.employeeContext!);
      res.status(200).json({ data: attendance });
    } catch (err) {
      next(err);
    }
  };

  checkIn = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const record = await this.service.checkIn(req.employeeContext!, req.body);
      res.status(200).json({ data: record });
    } catch (err) {
      next(err);
    }
  };

  checkOut = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const record = await this.service.checkOut(req.employeeContext!);
      res.status(200).json({ data: record });
    } catch (err) {
      next(err);
    }
  };

  regularizeAttendance = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.service.regularizeAttendance(req.employeeContext!, req.body);
      res.status(201).json({ data: result });
    } catch (err) {
      next(err);
    }
  };

  getLeaveWorkspace = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.service.getLeaveWorkspace(req.employeeContext!);
      res.status(200).json({ data });
    } catch (err) {
      next(err);
    }
  };

  applyLeave = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const request = await this.service.applyLeave(req.employeeContext!, req.body);
      res.status(201).json({ data: request });
    } catch (err) {
      next(err);
    }
  };

  cancelLeave = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.service.cancelLeave(req.employeeContext!, requireRecordId(req));
      res.status(200).json({ data: result });
    } catch (err) {
      next(err);
    }
  };

  getTimesheets = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.service.getTimesheetsWorkspace(req.employeeContext!);
      res.status(200).json({ data });
    } catch (err) {
      next(err);
    }
  };

  logTimesheet = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const entry = await this.service.logTimesheet(req.employeeContext!, req.body);
      res.status(201).json({ data: entry });
    } catch (err) {
      next(err);
    }
  };

  submitTimesheets = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.service.submitTimesheets(req.employeeContext!, req.body?.ids);
      res.status(200).json({ data: result });
    } catch (err) {
      next(err);
    }
  };

  getDocuments = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.service.getDocumentsWorkspace(req.employeeContext!);
      res.status(200).json({ data });
    } catch (err) {
      next(err);
    }
  };

  submitDocument = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const doc = await this.service.submitDocument(req.employeeContext!, req.body);
      res.status(201).json({ data: doc });
    } catch (err) {
      next(err);
    }
  };

  getRequests = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.service.getRequestsWorkspace(req.employeeContext!);
      res.status(200).json({ data });
    } catch (err) {
      next(err);
    }
  };

  cancelRequest = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.service.cancelRequest(req.employeeContext!, requireRecordId(req));
      res.status(200).json({ data: result });
    } catch (err) {
      next(err);
    }
  };

  getTasks = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.service.getTasksWorkspace(req.employeeContext!);
      res.status(200).json({ data });
    } catch (err) {
      next(err);
    }
  };

  updateTaskStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.service.updateTaskStatus(
        req.employeeContext!,
        requireRecordId(req),
        req.body?.status,
      );
      res.status(200).json({ data: result });
    } catch (err) {
      next(err);
    }
  };

  getNotifications = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.service.getNotificationsWorkspace(req.employeeContext!);
      res.status(200).json({ data });
    } catch (err) {
      next(err);
    }
  };

  markNotificationRead = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.service.markNotificationRead(
        req.employeeContext!,
        requireRecordId(req),
      );
      res.status(200).json({ data: result });
    } catch (err) {
      next(err);
    }
  };

  markAllNotificationsRead = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.service.markAllNotificationsRead(req.employeeContext!);
      res.status(200).json({ data: result });
    } catch (err) {
      next(err);
    }
  };

  getPayslips = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const status = this.service.getPayslipsStatus(req.employeeContext!);
      res.status(200).json({ data: status });
    } catch (err) {
      next(err);
    }
  };
}

function requireRecordId(req: Request): string {
  const rawId = req.params.id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  if (!id) {
    throw new AppError('Record ID is required', 400, 'VALIDATION_ERROR');
  }
  return id;
}

export const essController = new EssController();
