import { useState } from 'react';
import {
  Button,
  Card,
  Grid,
  Input,
  Switch,
  Toolbar,
  Stack,
} from '../../../../design-system/components';
import { BezentIcon } from '../../../../design-system/icons';

export function AttendanceSettingsSection() {
  const [gracePeriodMins, setGracePeriodMins] = useState(15);
  const [defaultShift, setDefaultShift] = useState('09:00 AM - 06:00 PM');
  const [allowEarlyCheckout, setAllowEarlyCheckout] = useState(true);
  const [attendanceTypes, setAttendanceTypes] = useState([
    { id: 'a1', name: 'On-site Office Check-in', enabled: true },
    { id: 'a2', name: 'Remote Work Check-in', enabled: true },
    { id: 'a3', name: 'Hybrid Shift Rotation', enabled: true },
    { id: 'a4', name: 'Field Visit & Geo-tagged Attendance', enabled: false },
  ]);
  const [saved, setSaved] = useState(false);

  const toggleType = (id: string) => {
    setAttendanceTypes((prev) =>
      prev.map((t) => (t.id === id ? { ...t, enabled: !t.enabled } : t)),
    );
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <Stack gap="lg">
      <Toolbar
        left={
          <div>
            <h2 className="bezent-card__title">Attendance Settings</h2>
            <p className="bezent-card__desc">
              Configure attendance check-in rules, grace periods, working hours, attendance types,
              and late policies.
            </p>
          </div>
        }
        right={
          <Button variant="primary" type="button" onClick={handleSave}>
            {saved ? '✓ Saved' : 'Save Attendance Rules'}
          </Button>
        }
      />

      <Grid columns={2} gap="lg">
        <Card padding="lg">
          <Stack gap="md">
            <h3 className="bezent-card__title">Check-in & Late Rules</h3>
            <Input
              label="Grace Period for Late Arrival (Minutes)"
              type="number"
              value={gracePeriodMins}
              onChange={(e) => setGracePeriodMins(Number(e.target.value))}
            />
            <Input
              label="Standard Daily Working Hours Schedule"
              type="text"
              value={defaultShift}
              onChange={(e) => setDefaultShift(e.target.value)}
            />
            <Switch
              label="Allow Early Checkout Request with Reason"
              checked={allowEarlyCheckout}
              onChange={(e) => setAllowEarlyCheckout(e.target.checked)}
            />
          </Stack>
        </Card>

        <Card padding="lg">
          <Stack gap="md">
            <div>
              <h3 className="bezent-card__title">Supported Attendance Types</h3>
              <p className="bezent-card__desc">Enable attendance modes authorized for employees.</p>
            </div>
            <Stack gap="sm">
              {attendanceTypes.map((type) => (
                <Card key={type.id} variant="flat" padding="sm">
                  <div className="bezent-toolbar">
                    <span className="bezent-switch-label">
                      <BezentIcon name="attendance" size={16} /> {type.name}
                    </span>
                    <Switch
                      checked={type.enabled}
                      onChange={() => toggleType(type.id)}
                      aria-label={`Enable ${type.name}`}
                    />
                  </div>
                </Card>
              ))}
            </Stack>
          </Stack>
        </Card>
      </Grid>
    </Stack>
  );
}

export default AttendanceSettingsSection;
