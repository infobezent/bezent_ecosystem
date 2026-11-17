import React from 'react';
import { DateRangePicker } from '../../../../design-system/components';

export interface AttendanceDateRange {
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function iso(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** First to last day of the current month (the default period on the request pages). */
export function getMonthRange(): AttendanceDateRange {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { startDate: iso(start), endDate: iso(end) };
}

interface AttendanceDateRangeControlProps {
  startDate: string;
  endDate: string;
  onChange: (range: AttendanceDateRange) => void;
}

/**
 * Shared date selector for the Attendance request pages. One compact control: pick a
 * single date or a custom range on the calendar, or use its Today / Yesterday /
 * Last 7 Days / This Month / Last Month shortcuts.
 */
export const AttendanceDateRangeControl: React.FC<AttendanceDateRangeControlProps> = ({
  startDate,
  endDate,
  onChange,
}) => (
  <div className="bezent-att-date-range-control">
    <DateRangePicker
      startDate={startDate}
      endDate={endDate}
      placeholder="Select date or range"
      onChange={(r) => {
        if (r.startDate && r.endDate) onChange({ startDate: r.startDate, endDate: r.endDate });
      }}
    />
  </div>
);
