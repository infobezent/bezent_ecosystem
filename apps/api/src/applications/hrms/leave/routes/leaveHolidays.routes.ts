import { Router } from 'express';
import { leaveHolidaysController as c } from '../controller/leaveHolidays.controller.js';
import { requireReadWrite } from '../../../../platform/access/middleware/access.middleware.js';

export const leaveHolidaysRouter = Router();

leaveHolidaysRouter.use(
  '/hrms/leave/holidays',
  requireReadWrite(
    [
      'hrms.leave.settings.view',
      'hrms.leave.settings.manage',
      'hrms.settings.view',
      'hrms.settings.manage',
    ],
    'hrms.leave.settings.manage',
  ),
);

leaveHolidaysRouter.get('/hrms/leave/holidays/calendars', c.listCalendars);
leaveHolidaysRouter.post('/hrms/leave/holidays/calendars', c.createCalendar);
leaveHolidaysRouter.get('/hrms/leave/holidays/calendars/:id', c.getCalendar);
leaveHolidaysRouter.put('/hrms/leave/holidays/calendars/:id', c.updateCalendar);
leaveHolidaysRouter.delete('/hrms/leave/holidays/calendars/:id', c.deleteCalendar);
leaveHolidaysRouter.post('/hrms/leave/holidays/calendars/:id/publish', c.publishCalendar);
leaveHolidaysRouter.post('/hrms/leave/holidays/calendars/:id/holidays', c.addHoliday);
leaveHolidaysRouter.post('/hrms/leave/holidays/calendars/:id/copy', c.copyFrom);
leaveHolidaysRouter.post('/hrms/leave/holidays/calendars/:id/import', c.importCsv);
leaveHolidaysRouter.put('/hrms/leave/holidays/:holidayId', c.updateHoliday);
leaveHolidaysRouter.delete('/hrms/leave/holidays/:holidayId', c.deleteHoliday);
