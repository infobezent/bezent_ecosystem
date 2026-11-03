import type { Request, Response, NextFunction } from 'express';
import { ShiftService, shiftService } from '../service/shift.service.js';
import { BadRequestError } from '../../../../app/errors/AppError.js';
import type { ShiftAssignmentScope } from '../types/shift.types.js';

function getCompanyContext(req: Request) {
  const ctx = req.companyContext;
  if (!ctx || !ctx.tenantId || !ctx.companyId) {
    throw new BadRequestError('Company context not resolved');
  }
  return ctx;
}

function requireParam(req: Request, name: string): string {
  const val = req.params[name];
  if (!val || typeof val !== 'string') {
    throw new BadRequestError(`Missing route parameter: ${name}`);
  }
  return val;
}

export class ShiftController {
  constructor(private readonly service: ShiftService = shiftService) {}

  // ---------------------------------------------------------------------------
  // Shift Definitions
  // ---------------------------------------------------------------------------

  listShifts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, companyId } = getCompanyContext(req);
      const { status, search, limit, offset, page } = req.query;

      const effectiveOffset =
        offset !== undefined
          ? Number(offset)
          : page !== undefined && limit !== undefined
            ? (Number(page) - 1) * Number(limit)
            : 0;

      const result = await this.service.listShifts(tenantId, companyId, {
        status: status as 'all' | 'active' | 'inactive',
        search: typeof search === 'string' ? search : undefined,
        limit: limit ? Number(limit) : 50,
        offset: effectiveOffset,
      });

      res.json({
        data: result.items,
        pagination: {
          total: result.total,
          limit: limit ? Number(limit) : 50,
          offset: effectiveOffset,
        },
      });
    } catch (err) {
      next(err);
    }
  };

  getShiftById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, companyId } = getCompanyContext(req);
      const id = requireParam(req, 'id');
      const data = await this.service.getShiftById(tenantId, companyId, id);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  };

  createShift = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, companyId } = getCompanyContext(req);
      const data = await this.service.createShift(tenantId, companyId, req.body, req.user?.id);
      res.status(201).json({ data });
    } catch (err) {
      next(err);
    }
  };

  updateShift = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, companyId } = getCompanyContext(req);
      const id = requireParam(req, 'id');
      const data = await this.service.updateShift(tenantId, companyId, id, req.body, req.user?.id);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  };

  patchShiftStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, companyId } = getCompanyContext(req);
      const id = requireParam(req, 'id');
      const isActive = req.body?.isActive !== undefined ? Boolean(req.body.isActive) : true;
      const data = await this.service.setShiftStatus(
        tenantId,
        companyId,
        id,
        isActive,
        req.user?.id,
      );
      res.json({ data });
    } catch (err) {
      next(err);
    }
  };

  deleteShift = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, companyId } = getCompanyContext(req);
      const id = requireParam(req, 'id');
      await this.service.deleteShift(tenantId, companyId, id, req.user?.id);
      res.json({ success: true, message: 'Shift deleted successfully' });
    } catch (err) {
      next(err);
    }
  };

  // ---------------------------------------------------------------------------
  // Shift Assignments
  // ---------------------------------------------------------------------------

  listAssignments = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, companyId } = getCompanyContext(req);
      const {
        scope,
        shiftId,
        employeeId,
        departmentId,
        locationId,
        status,
        effectiveDate,
        limit,
        offset,
        page,
      } = req.query;

      const effectiveOffset =
        offset !== undefined
          ? Number(offset)
          : page !== undefined && limit !== undefined
            ? (Number(page) - 1) * Number(limit)
            : 0;

      const result = await this.service.listAssignments(tenantId, companyId, {
        scope: scope as ShiftAssignmentScope | 'all',
        shiftId: typeof shiftId === 'string' ? shiftId : undefined,
        employeeId: typeof employeeId === 'string' ? employeeId : undefined,
        departmentId: typeof departmentId === 'string' ? departmentId : undefined,
        locationId: typeof locationId === 'string' ? locationId : undefined,
        status: status as 'all' | 'active' | 'inactive',
        effectiveDate: typeof effectiveDate === 'string' ? effectiveDate : undefined,
        limit: limit ? Number(limit) : 50,
        offset: effectiveOffset,
      });

      res.json({
        data: result.items,
        pagination: {
          total: result.total,
          limit: limit ? Number(limit) : 50,
          offset: effectiveOffset,
        },
      });
    } catch (err) {
      next(err);
    }
  };

  getAssignmentById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, companyId } = getCompanyContext(req);
      const id = requireParam(req, 'id');
      const data = await this.service.getAssignmentById(tenantId, companyId, id);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  };

  createAssignment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, companyId } = getCompanyContext(req);
      const data = await this.service.createAssignment(tenantId, companyId, req.body, req.user?.id);
      res.status(201).json({ data });
    } catch (err) {
      next(err);
    }
  };

  updateAssignment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, companyId } = getCompanyContext(req);
      const id = requireParam(req, 'id');
      const data = await this.service.updateAssignment(
        tenantId,
        companyId,
        id,
        req.body,
        req.user?.id,
      );
      res.json({ data });
    } catch (err) {
      next(err);
    }
  };

  endAssignment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, companyId } = getCompanyContext(req);
      const id = requireParam(req, 'id');
      const data = await this.service.endAssignment(
        tenantId,
        companyId,
        id,
        req.body,
        req.user?.id,
      );
      res.json({ data });
    } catch (err) {
      next(err);
    }
  };

  deleteAssignment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, companyId } = getCompanyContext(req);
      const id = requireParam(req, 'id');
      await this.service.deleteAssignment(tenantId, companyId, id, req.user?.id);
      res.json({ success: true, message: 'Shift assignment deleted successfully' });
    } catch (err) {
      next(err);
    }
  };

  // ---------------------------------------------------------------------------
  // Employee Shift Lookup
  // ---------------------------------------------------------------------------

  resolveEmployeeShift = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, companyId } = getCompanyContext(req);
      const employeeId = requireParam(req, 'employeeId');
      const date =
        typeof req.query.date === 'string' && req.query.date.trim()
          ? req.query.date.trim()
          : new Date().toISOString().slice(0, 10);

      const punchInTime =
        typeof req.query.punchInTime === 'string' ? req.query.punchInTime : undefined;
      const autoAlloc = req.query.enableAutoShiftAllocation === 'true';

      const data = await this.service.resolveEmployeeShift(
        tenantId,
        companyId,
        employeeId,
        date,
        punchInTime,
        autoAlloc,
      );

      res.json({ data });
    } catch (err) {
      next(err);
    }
  };
}

export const shiftController = new ShiftController();
