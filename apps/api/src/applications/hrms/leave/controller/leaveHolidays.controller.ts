import type { Request, Response, NextFunction } from 'express';
import { LeaveHolidaysService, leaveHolidaysService } from '../service/leaveHolidays.service.js';

type Handler = (req: Request, res: Response, next: NextFunction) => Promise<void>;

export class LeaveHolidaysController {
  constructor(private readonly service: LeaveHolidaysService = leaveHolidaysService) {}

  private handle =
    (
      fn: (
        req: Request,
        ctx: { tenantId: string; companyId: string; userId: string },
      ) => Promise<unknown>,
      status = 200,
    ): Handler =>
    async (req, res, next) => {
      try {
        const { tenantId, companyId } = req.companyContext!;
        const data = await fn(req, { tenantId, companyId, userId: req.user?.id || 'system' });
        res.status(status).json({ data });
      } catch (err) {
        next(err);
      }
    };

  listCalendars = this.handle((req, c) => {
    const year = Number(req.query.year);
    return this.service.listCalendars(
      c.tenantId,
      c.companyId,
      Number.isInteger(year) ? year : undefined,
    );
  });

  getCalendar = this.handle((req, c) =>
    this.service.getCalendar(c.tenantId, c.companyId, String(req.params.id)),
  );

  createCalendar = this.handle(
    (req, c) => this.service.createCalendar(c.tenantId, c.companyId, c.userId, req.body),
    201,
  );

  updateCalendar = this.handle((req, c) =>
    this.service.updateCalendar(c.tenantId, c.companyId, String(req.params.id), c.userId, req.body),
  );

  publishCalendar = this.handle((req, c) =>
    this.service.publishCalendar(c.tenantId, c.companyId, String(req.params.id), c.userId),
  );

  deleteCalendar = this.handle(async (req, c) => {
    await this.service.deleteCalendar(c.tenantId, c.companyId, String(req.params.id), c.userId);
    return { deleted: true };
  });

  addHoliday = this.handle(
    (req, c) =>
      this.service.addHoliday(c.tenantId, c.companyId, String(req.params.id), c.userId, req.body),
    201,
  );

  copyFrom = this.handle((req, c) =>
    this.service.copyFrom(
      c.tenantId,
      c.companyId,
      String(req.params.id),
      c.userId,
      req.body?.sourceCalendarId,
    ),
  );

  importCsv = this.handle((req, c) =>
    this.service.importCsv(c.tenantId, c.companyId, String(req.params.id), c.userId, req.body?.csv),
  );

  updateHoliday = this.handle((req, c) =>
    this.service.updateHoliday(
      c.tenantId,
      c.companyId,
      String(req.params.holidayId),
      c.userId,
      req.body,
    ),
  );

  deleteHoliday = this.handle((req, c) =>
    this.service.deleteHoliday(c.tenantId, c.companyId, String(req.params.holidayId), c.userId),
  );
}

export const leaveHolidaysController = new LeaveHolidaysController();
