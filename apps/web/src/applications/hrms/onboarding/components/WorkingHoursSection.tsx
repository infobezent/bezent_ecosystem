import { useState, useMemo } from 'react';
import {
  FormSection,
  FormGrid,
  FormField,
  Input,
  Select,
  Button,
  Card,
  CardTitle,
  Divider,
  Stack,
  Inline,
  Grid,
} from '../../../../design-system';

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

const CALENDAR_OPTIONS = [
  { value: 'Standard India General Calendar 2026', label: 'Standard India General Calendar 2026' },
  { value: 'US East Coast Shift Calendar 2026', label: 'US East Coast Shift Calendar 2026' },
  { value: '24/7 Operations Shift Calendar', label: '24/7 Operations Shift Calendar' },
  { value: 'Other', label: 'Other / Add New' },
];

const SHIFT_OPTIONS = [
  {
    value: 'General Shift (9:00 AM - 6:00 PM)',
    label: 'General Shift (9:00 AM - 6:00 PM)',
  },
  {
    value: 'Morning Shift (7:00 AM - 4:00 PM)',
    label: 'Morning Shift (7:00 AM - 4:00 PM)',
  },
  {
    value: 'Evening Shift (2:00 PM - 11:00 PM)',
    label: 'Evening Shift (2:00 PM - 11:00 PM)',
  },
  {
    value: 'Night Shift (10:00 PM - 7:00 AM)',
    label: 'Night Shift (10:00 PM - 7:00 AM)',
  },
  { value: 'Other', label: 'Other / Add New' },
];

const BREAK_OPTIONS = [
  { value: '15', label: '15 mins' },
  { value: '30', label: '30 mins' },
  { value: '45', label: '45 mins' },
  { value: '60', label: '60 mins' },
];

const LUNCH_OPTIONS = [
  { value: '30', label: '30 mins' },
  { value: '45', label: '45 mins' },
  { value: '60', label: '60 mins (1 Hour)' },
  { value: '90', label: '90 mins' },
];

const TIMEZONE_OPTIONS = [
  {
    value: '(UTC+05:30) India Standard Time (IST)',
    label: '(UTC+05:30) India Standard Time (IST)',
  },
  { value: '(UTC+00:00) London (GMT/BST)', label: '(UTC+00:00) London (GMT/BST)' },
  {
    value: '(UTC-05:00) Eastern Time (US & Canada)',
    label: '(UTC-05:00) Eastern Time (US & Canada)',
  },
  {
    value: '(UTC+08:00) Singapore Standard Time (SGT)',
    label: '(UTC+08:00) Singapore Standard Time (SGT)',
  },
];

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
    <Stack gap="xl">
      {/* A. WORK SCHEDULE */}
      <FormSection
        title="Work Schedule & Calendar"
        description="Working calendar, shift presets, and scheduled work days."
      >
        <FormGrid columns={2} layout="horizontal" labelWidth="md">
          {/* 1. Working Time Calendar */}
          <FormField label="Working Calendar" required>
            <Stack gap="xs">
              <Select
                options={CALENDAR_OPTIONS}
                value={workingCalendar}
                onChange={(e) => {
                  setWorkingCalendar(e.target.value);
                  setAssignedCalendar(e.target.value);
                }}
              />
              {workingCalendar === 'Other' && (
                <Input
                  type="text"
                  placeholder="Enter Custom Working Time Calendar"
                  value={customWorkingCalendar}
                  onChange={(e) => setCustomWorkingCalendar(e.target.value)}
                />
              )}
            </Stack>
          </FormField>

          {/* 2. Work Schedule Shift */}
          <FormField label="Work Schedule" required>
            <Stack gap="xs">
              <Select
                options={SHIFT_OPTIONS}
                value={workSchedule}
                onChange={(e) => handleShiftChange(e.target.value)}
              />
              {workSchedule === 'Other' && (
                <Input
                  type="text"
                  placeholder="Enter Custom Work Schedule"
                  value={customWorkSchedule}
                  onChange={(e) => setCustomWorkSchedule(e.target.value)}
                />
              )}
            </Stack>
          </FormField>

          {/* 3. Working Days */}
          <FormField label="Working Days" required span="full">
            <Inline gap="xs" wrap>
              {ALL_DAYS.map((day) => {
                const isSelected = workingDays.includes(day);
                return (
                  <Button
                    key={day}
                    type="button"
                    variant={isSelected ? 'primary' : 'secondary'}
                    size="sm"
                    onClick={() => toggleDay(day)}
                  >
                    {day}
                  </Button>
                );
              })}
            </Inline>
          </FormField>
        </FormGrid>
      </FormSection>

      {/* B. TIME CONFIGURATION */}
      <FormSection
        title="Time Configuration & Breaks"
        description="Shift timing, break deductions, and automated net work hour calculation."
      >
        <FormGrid columns={2} layout="horizontal" labelWidth="md">
          {/* 1. Start Time */}
          <FormField label="Start Time">
            <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
          </FormField>

          {/* 2. End Time */}
          <FormField label="End Time">
            <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
          </FormField>

          {/* 3. Break */}
          <FormField label="Break Duration">
            <Select
              options={BREAK_OPTIONS}
              value={String(breakMins)}
              onChange={(e) => setBreakMins(Number(e.target.value))}
            />
          </FormField>

          {/* 4. Lunch */}
          <FormField label="Lunch Duration">
            <Select
              options={LUNCH_OPTIONS}
              value={String(lunchMins)}
              onChange={(e) => setLunchMins(Number(e.target.value))}
            />
          </FormField>

          {/* 5. Standard Working Hours (Net) */}
          <FormField
            label="Daily Net Hours"
            span="full"
            helperText={`Gross: ${calculatedHours.totalGross} hrs • Non-work: ${calculatedHours.nonWork} hrs`}
          >
            <Input type="text" value={`${calculatedHours.totalNet} Hours / Day`} readOnly />
          </FormField>
        </FormGrid>
      </FormSection>

      {/* C. CALENDAR & HOLIDAYS + D. EMPLOYEE ASSIGNMENT */}
      <FormSection
        title="Holidays & Employee Shift Linking"
        description="Standard holidays, company closures, and employee timezone assignment."
      >
        <Grid columns={2} gap="lg">
          {/* C. CALENDAR & HOLIDAYS */}
          <Card variant="flat">
            <Stack gap="md">
              <CardTitle>Assigned Standard Holidays (2026)</CardTitle>
              <Stack gap="xs">
                <Inline gap="xs" align="center">
                  <span className="bezent-label--md">Jan 26, 2026</span>
                  <span className="bezent-card__desc">— Republic Day (National Holiday)</span>
                </Inline>
                <Inline gap="xs" align="center">
                  <span className="bezent-label--md">May 01, 2026</span>
                  <span className="bezent-card__desc">— May Day (Public Holiday)</span>
                </Inline>
                <Inline gap="xs" align="center">
                  <span className="bezent-label--md">Aug 15, 2026</span>
                  <span className="bezent-card__desc">— Independence Day (National Holiday)</span>
                </Inline>
                <Inline gap="xs" align="center">
                  <span className="bezent-label--md">Oct 02, 2026</span>
                  <span className="bezent-card__desc">— Gandhi Jayanti (National Holiday)</span>
                </Inline>
                <Inline gap="xs" align="center">
                  <span className="bezent-label--md">Nov 08, 2026</span>
                  <span className="bezent-card__desc">— Diwali / Deepavali (Festival)</span>
                </Inline>
                <Inline gap="xs" align="center">
                  <span className="bezent-label--md">Dec 25, 2026</span>
                  <span className="bezent-card__desc">— Christmas (Festival)</span>
                </Inline>
              </Stack>

              <Divider />

              <CardTitle>Company Closures</CardTitle>
              <Stack gap="xs">
                <Inline gap="xs" align="center">
                  <span className="bezent-label--md">Dec 31, 2026</span>
                  <span className="bezent-card__desc">— Annual Corporate Strategy Closure</span>
                </Inline>
              </Stack>
            </Stack>
          </Card>

          {/* D. EMPLOYEE ASSIGNMENT */}
          <Card variant="flat">
            <Stack gap="md">
              <CardTitle>Employee Shift & Timezone Linking</CardTitle>
              <FormGrid columns={1} layout="horizontal" labelWidth="md">
                {/* 1. Employee / Worker */}
                <FormField label="Employee Link">
                  <Input type="text" value={assignedEmployee} readOnly />
                </FormField>

                {/* 2. Assigned Work Calendar */}
                <FormField label="Assigned Calendar">
                  <Select
                    options={CALENDAR_OPTIONS.filter((c) => c.value !== 'Other')}
                    value={assignedCalendar}
                    onChange={(e) => setAssignedCalendar(e.target.value)}
                  />
                </FormField>

                {/* 3. Assigned Work Schedule */}
                <FormField label="Assigned Schedule">
                  <Select
                    options={SHIFT_OPTIONS.filter((s) => s.value !== 'Other')}
                    value={assignedSchedule}
                    onChange={(e) => setAssignedSchedule(e.target.value)}
                  />
                </FormField>

                {/* 4. Time Zone */}
                <FormField label="Time Zone">
                  <Select
                    options={TIMEZONE_OPTIONS}
                    value={timeZone}
                    onChange={(e) => setTimeZone(e.target.value)}
                  />
                </FormField>
              </FormGrid>
            </Stack>
          </Card>
        </Grid>
      </FormSection>
    </Stack>
  );
}
