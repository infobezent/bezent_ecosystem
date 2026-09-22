import { useState, useMemo } from 'react';
import { BezentIcon } from '../../../../design-system/icons';
import './WorkingHoursSection.css';

interface ShiftPreset {
  name: string;
  startTime: string;
  endTime: string;
  breakMins: number;
  lunchMins: number;
  days: string[];
}

const SHIFT_PRESETS: Record<string, ShiftPreset> = {
  'General Shift (9:00 AM - 6:00 PM)': {
    name: 'General Shift (9:00 AM - 6:00 PM)',
    startTime: '09:00',
    endTime: '18:00',
    breakMins: 30,
    lunchMins: 60,
    days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
  },
  'Morning Shift (7:00 AM - 4:00 PM)': {
    name: 'Morning Shift (7:00 AM - 4:00 PM)',
    startTime: '07:00',
    endTime: '16:00',
    breakMins: 30,
    lunchMins: 60,
    days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
  },
  'Evening Shift (2:00 PM - 11:00 PM)': {
    name: 'Evening Shift (2:00 PM - 11:00 PM)',
    startTime: '14:00',
    endTime: '23:00',
    breakMins: 30,
    lunchMins: 60,
    days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
  },
  'Night Shift (10:00 PM - 7:00 AM)': {
    name: 'Night Shift (10:00 PM - 7:00 AM)',
    startTime: '22:00',
    endTime: '07:00',
    breakMins: 30,
    lunchMins: 60,
    days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
  },
};

const ALL_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export function WorkingHoursSection() {
  // A. WORK SCHEDULE STATE
  const [workingCalendar, setWorkingCalendar] = useState('Standard India General Calendar 2026');
  const [customWorkingCalendar, setCustomWorkingCalendar] = useState('');
  const [workSchedule, setWorkSchedule] = useState('General Shift (9:00 AM - 6:00 PM)');
  const [customWorkSchedule, setCustomWorkSchedule] = useState('');
  const [workingDays, setWorkingDays] = useState<string[]>([
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
  ]);

  // B. TIME CONFIGURATION STATE
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('18:00');
  const [breakMins, setBreakMins] = useState(30);
  const [lunchMins, setLunchMins] = useState(60);

  // D. EMPLOYEE ASSIGNMENT STATE
  const [assignedEmployee] = useState('Arun Kumar (EMP2026001)');
  const [assignedCalendar, setAssignedCalendar] = useState('Standard India General Calendar 2026');
  const [assignedSchedule, setAssignedSchedule] = useState('General Shift (9:00 AM - 6:00 PM)');
  const [timeZone, setTimeZone] = useState('(UTC+05:30) India Standard Time (IST)');

  // AUTOMATION: Handle Shift Preset Change
  const handleShiftChange = (scheduleName: string) => {
    setWorkSchedule(scheduleName);
    setAssignedSchedule(scheduleName);

    if (scheduleName === 'Other') return;

    const preset = SHIFT_PRESETS[scheduleName];
    if (preset) {
      setStartTime(preset.startTime);
      setEndTime(preset.endTime);
      setBreakMins(preset.breakMins);
      setLunchMins(preset.lunchMins);
      setWorkingDays(preset.days);
    }
  };

  const toggleDay = (day: string) => {
    if (workingDays.includes(day)) {
      setWorkingDays(workingDays.filter((d) => d !== day));
    } else {
      setWorkingDays([...workingDays, day]);
    }
  };

  // AUTOMATED WORKING HOURS CALCULATION
  const calculatedHours = useMemo(() => {
    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);

    if (isNaN(startH!) || isNaN(startM!) || isNaN(endH!) || isNaN(endM!)) {
      return { totalGross: '8.0', totalNet: '8.0', nonWork: '1.5' };
    }

    const startTotalMins = startH! * 60 + startM!;
    let endTotalMins = endH! * 60 + endM!;

    if (endTotalMins < startTotalMins) {
      endTotalMins += 24 * 60; // Overnight shift
    }

    const grossMins = endTotalMins - startTotalMins;
    const nonWorkMins = breakMins + lunchMins;
    const netMins = Math.max(0, grossMins - nonWorkMins);

    return {
      totalGross: (grossMins / 60).toFixed(1),
      totalNet: (netMins / 60).toFixed(1),
      nonWork: (nonWorkMins / 60).toFixed(1),
    };
  }, [startTime, endTime, breakMins, lunchMins]);

  return (
    <div className="working-hours-section">
      {/* Banner Header */}
      <div className="employee-registration__section-header">
        <div className="employee-registration__section-icon-badge">
          <BezentIcon name="clock" size={22} />
        </div>
        <div className="employee-registration__section-title-group">
          <h2 className="employee-registration__section-title">
            Working Hours &amp; Shift Assignment
          </h2>
          <p className="employee-registration__section-subtitle">
            Configure work schedule, shift timings, automated break calculations, holidays and
            timezones.
          </p>
        </div>
      </div>

      <div className="working-hours-section__container">
        {/* ================================================== */}
        {/* A. WORK SCHEDULE */}
        {/* ================================================== */}
        <div className="working-hours-section__card">
          <div className="working-hours-section__card-header">
            <span className="working-hours-section__sub-badge">SUBSECTION A</span>
            <h3 className="working-hours-section__card-title">Work Schedule &amp; Calendar</h3>
          </div>

          <form className="working-hours-section__grid" onSubmit={(e) => e.preventDefault()}>
            {/* 1. Working Time Calendar */}
            <div className="employee-registration__field">
              <label className="employee-registration__label">
                Working Time Calendar <span className="employee-registration__required">*</span>
              </label>
              <div className="employee-registration__select-wrapper">
                <select
                  className="employee-registration__select"
                  value={workingCalendar}
                  onChange={(e) => {
                    setWorkingCalendar(e.target.value);
                    setAssignedCalendar(e.target.value);
                  }}
                >
                  <option value="Standard India General Calendar 2026">
                    Standard India General Calendar 2026
                  </option>
                  <option value="US East Coast Shift Calendar 2026">
                    US East Coast Shift Calendar 2026
                  </option>
                  <option value="24/7 Operations Shift Calendar">
                    24/7 Operations Shift Calendar
                  </option>
                  <option value="Other">Other / Add New</option>
                </select>
                <span className="employee-registration__select-icon">▼</span>
              </div>
              {workingCalendar === 'Other' && (
                <div className="employee-registration__other-container">
                  <input
                    type="text"
                    className="employee-registration__input"
                    placeholder="Enter Custom Working Time Calendar"
                    value={customWorkingCalendar}
                    onChange={(e) => setCustomWorkingCalendar(e.target.value)}
                  />
                </div>
              )}
            </div>

            {/* 2. Work Schedule */}
            <div className="employee-registration__field">
              <label className="employee-registration__label">
                Work Schedule Shift <span className="employee-registration__required">*</span>
              </label>
              <div className="employee-registration__select-wrapper">
                <select
                  className="employee-registration__select"
                  value={workSchedule}
                  onChange={(e) => handleShiftChange(e.target.value)}
                >
                  <option value="General Shift (9:00 AM - 6:00 PM)">
                    General Shift (9:00 AM - 6:00 PM)
                  </option>
                  <option value="Morning Shift (7:00 AM - 4:00 PM)">
                    Morning Shift (7:00 AM - 4:00 PM)
                  </option>
                  <option value="Evening Shift (2:00 PM - 11:00 PM)">
                    Evening Shift (2:00 PM - 11:00 PM)
                  </option>
                  <option value="Night Shift (10:00 PM - 7:00 AM)">
                    Night Shift (10:00 PM - 7:00 AM)
                  </option>
                  <option value="Other">Other / Add New</option>
                </select>
                <span className="employee-registration__select-icon">▼</span>
              </div>
              {workSchedule === 'Other' && (
                <div className="employee-registration__other-container">
                  <input
                    type="text"
                    className="employee-registration__input"
                    placeholder="Enter Custom Work Schedule"
                    value={customWorkSchedule}
                    onChange={(e) => setCustomWorkSchedule(e.target.value)}
                  />
                </div>
              )}
            </div>

            {/* 3. Working Days Multi-Select */}
            <div className="employee-registration__field working-hours-section__field--span-2">
              <label className="employee-registration__label">
                Working Days <span className="employee-registration__required">*</span>
              </label>
              <div className="working-hours-section__days-row">
                {ALL_DAYS.map((day) => {
                  const isSelected = workingDays.includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      className={`working-hours-section__day-chip ${
                        isSelected ? 'working-hours-section__day-chip--active' : ''
                      }`}
                      onClick={() => toggleDay(day)}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>
          </form>
        </div>

        {/* ================================================== */}
        {/* B. TIME CONFIGURATION */}
        {/* ================================================== */}
        <div className="working-hours-section__card">
          <div className="working-hours-section__card-header">
            <span className="working-hours-section__sub-badge">SUBSECTION B</span>
            <h3 className="working-hours-section__card-title">
              Time Configuration &amp; Break Calculation
            </h3>
          </div>

          <form className="working-hours-section__grid" onSubmit={(e) => e.preventDefault()}>
            {/* 1. Start Time */}
            <div className="employee-registration__field">
              <label className="employee-registration__label">Start Time</label>
              <input
                type="time"
                className="employee-registration__input"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>

            {/* 2. End Time */}
            <div className="employee-registration__field">
              <label className="employee-registration__label">End Time</label>
              <input
                type="time"
                className="employee-registration__input"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>

            {/* 3. Break */}
            <div className="employee-registration__field">
              <label className="employee-registration__label">Break (Minutes)</label>
              <select
                className="employee-registration__select"
                value={breakMins}
                onChange={(e) => setBreakMins(Number(e.target.value))}
              >
                <option value={15}>15 mins</option>
                <option value={30}>30 mins</option>
                <option value={45}>45 mins</option>
                <option value={60}>60 mins</option>
              </select>
            </div>

            {/* 4. Lunch */}
            <div className="employee-registration__field">
              <label className="employee-registration__label">Lunch (Minutes)</label>
              <select
                className="employee-registration__select"
                value={lunchMins}
                onChange={(e) => setLunchMins(Number(e.target.value))}
              >
                <option value={30}>30 mins</option>
                <option value={45}>45 mins</option>
                <option value={60}>60 mins (1 Hour)</option>
                <option value={90}>90 mins</option>
              </select>
            </div>

            {/* 5. Standard Working Hours (Calculated) */}
            <div className="employee-registration__field">
              <label className="employee-registration__label">Standard Working Hours (Net)</label>
              <input
                type="text"
                className="employee-registration__input working-hours-section__input--calc"
                value={`${calculatedHours.totalNet} Hours / Day`}
                readOnly
              />
              <span className="accounts-section__helper-text">
                Gross: {calculatedHours.totalGross} hrs • Non-work: {calculatedHours.nonWork} hrs
              </span>
            </div>
          </form>
        </div>

        {/* ================================================== */}
        {/* C. CALENDAR & HOLIDAYS + D. EMPLOYEE ASSIGNMENT */}
        {/* ================================================== */}
        <div className="working-hours-section__row-2">
          {/* C. CALENDAR & HOLIDAYS */}
          <div className="working-hours-section__card">
            <div className="working-hours-section__card-header">
              <span className="working-hours-section__sub-badge">SUBSECTION C</span>
              <h3 className="working-hours-section__card-title">Holidays &amp; Company Closures</h3>
            </div>

            <div className="working-hours-section__holidays-list">
              <h4 className="working-hours-section__sub-title">
                Assigned Standard Holidays (2026)
              </h4>
              <ul className="working-hours-section__list">
                <li>
                  📅 <span>Jan 26, 2026</span> — Republic Day (National Holiday)
                </li>
                <li>
                  📅 <span>May 01, 2026</span> — May Day (Public Holiday)
                </li>
                <li>
                  📅 <span>Aug 15, 2026</span> — Independence Day (National Holiday)
                </li>
                <li>
                  📅 <span>Oct 02, 2026</span> — Gandhi Jayanti (National Holiday)
                </li>
                <li>
                  📅 <span>Nov 08, 2026</span> — Diwali / Deepavali (Festival)
                </li>
                <li>
                  📅 <span>Dec 25, 2026</span> — Christmas (Festival)
                </li>
              </ul>

              <h4 className="working-hours-section__sub-title">Company Closures</h4>
              <ul className="working-hours-section__list">
                <li>
                  🏢 <span>Dec 31, 2026</span> — Annual Corporate Strategy Closure
                </li>
              </ul>
            </div>
          </div>

          {/* D. EMPLOYEE ASSIGNMENT */}
          <div className="working-hours-section__card">
            <div className="working-hours-section__card-header">
              <span className="working-hours-section__sub-badge">SUBSECTION D</span>
              <h3 className="working-hours-section__card-title">
                Employee Shift &amp; Timezone Linking
              </h3>
            </div>

            <form className="accounts-section__grid-stack" onSubmit={(e) => e.preventDefault()}>
              {/* 1. Employee / Worker */}
              <div className="employee-registration__field">
                <label className="employee-registration__label">Employee / Worker Link</label>
                <input
                  type="text"
                  className="employee-registration__input"
                  value={assignedEmployee}
                  readOnly
                />
              </div>

              {/* 2. Assigned Work Calendar */}
              <div className="employee-registration__field">
                <label className="employee-registration__label">Assigned Work Calendar</label>
                <div className="employee-registration__select-wrapper">
                  <select
                    className="employee-registration__select"
                    value={assignedCalendar}
                    onChange={(e) => setAssignedCalendar(e.target.value)}
                  >
                    <option value="Standard India General Calendar 2026">
                      Standard India General Calendar 2026
                    </option>
                    <option value="US East Coast Shift Calendar 2026">
                      US East Coast Shift Calendar 2026
                    </option>
                    <option value="24/7 Operations Shift Calendar">
                      24/7 Operations Shift Calendar
                    </option>
                  </select>
                  <span className="employee-registration__select-icon">▼</span>
                </div>
              </div>

              {/* 3. Assigned Work Schedule */}
              <div className="employee-registration__field">
                <label className="employee-registration__label">Assigned Work Schedule</label>
                <div className="employee-registration__select-wrapper">
                  <select
                    className="employee-registration__select"
                    value={assignedSchedule}
                    onChange={(e) => setAssignedSchedule(e.target.value)}
                  >
                    <option value="General Shift (9:00 AM - 6:00 PM)">
                      General Shift (9:00 AM - 6:00 PM)
                    </option>
                    <option value="Morning Shift (7:00 AM - 4:00 PM)">
                      Morning Shift (7:00 AM - 4:00 PM)
                    </option>
                    <option value="Evening Shift (2:00 PM - 11:00 PM)">
                      Evening Shift (2:00 PM - 11:00 PM)
                    </option>
                    <option value="Night Shift (10:00 PM - 7:00 AM)">
                      Night Shift (10:00 PM - 7:00 AM)
                    </option>
                  </select>
                  <span className="employee-registration__select-icon">▼</span>
                </div>
              </div>

              {/* 4. Time Zone */}
              <div className="employee-registration__field">
                <label className="employee-registration__label">Time Zone</label>
                <div className="employee-registration__select-wrapper">
                  <select
                    className="employee-registration__select"
                    value={timeZone}
                    onChange={(e) => setTimeZone(e.target.value)}
                  >
                    <option value="(UTC+05:30) India Standard Time (IST)">
                      (UTC+05:30) India Standard Time (IST)
                    </option>
                    <option value="(UTC+00:00) London (GMT/BST)">
                      (UTC+00:00) London (GMT/BST)
                    </option>
                    <option value="(UTC-05:00) Eastern Time (US & Canada)">
                      (UTC-05:00) Eastern Time (US &amp; Canada)
                    </option>
                    <option value="(UTC+08:00) Singapore Standard Time (SGT)">
                      (UTC+08:00) Singapore Standard Time (SGT)
                    </option>
                  </select>
                  <span className="employee-registration__select-icon">▼</span>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
