import { useState } from 'react';
import {
  Button,
  Card,
  Grid,
  Select,
  Switch,
  Toolbar,
  Stack,
} from '../../../../design-system/components';
import { BezentIcon } from '../../../../design-system/icons';

const REFRESH_OPTIONS = [
  { value: '1m', label: 'Every 1 minute' },
  { value: '5m', label: 'Every 5 minutes' },
  { value: '15m', label: 'Every 15 minutes' },
  { value: 'manual', label: 'Manual Refresh Only' },
];

export function DashboardSettingsSection() {
  const [refreshInterval, setRefreshInterval] = useState('5m');
  const [widgets, setWidgets] = useState([
    { id: 'w1', name: 'Workforce Overview', enabled: true },
    { id: 'w2', name: 'Attendance Today', enabled: true },
    { id: 'w3', name: 'Pending Leave Approvals', enabled: true },
    { id: 'w4', name: 'Upcoming Birthdays & Anniversaries', enabled: true },
    { id: 'w5', name: 'Recent Onboarding Activity', enabled: false },
    { id: 'w6', name: 'Department Headcount Distribution', enabled: true },
  ]);
  const [saved, setSaved] = useState(false);

  const toggleWidget = (id: string) => {
    setWidgets((prev) => prev.map((w) => (w.id === id ? { ...w, enabled: !w.enabled } : w)));
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
            <h2 className="bezent-card__title">Dashboard Settings</h2>
            <p className="bezent-card__desc">
              Configure default widget visibility, refresh frequency, and overview layouts.
            </p>
          </div>
        }
        right={
          <Button variant="primary" type="button" onClick={handleSave}>
            {saved ? '✓ Saved' : 'Save Dashboard Settings'}
          </Button>
        }
      />

      <Grid columns={2} gap="lg">
        <Card padding="lg">
          <Stack gap="md">
            <h3 className="bezent-card__title">General Configuration</h3>
            <Select
              id="refresh-interval"
              label="Auto-Refresh Interval"
              value={refreshInterval}
              options={REFRESH_OPTIONS}
              onChange={(e) => setRefreshInterval(e.target.value)}
            />
          </Stack>
        </Card>

        <Card padding="lg">
          <Stack gap="md">
            <div>
              <h3 className="bezent-card__title">Available Dashboard Widgets</h3>
              <p className="bezent-card__desc">
                Enable or disable default widgets for authorized users.
              </p>
            </div>
            <Stack gap="sm">
              {widgets.map((widget) => (
                <Card key={widget.id} variant="flat" padding="sm">
                  <div className="bezent-toolbar">
                    <span className="bezent-switch-label">
                      <BezentIcon name="dashboard" size={16} /> {widget.name}
                    </span>
                    <Switch
                      checked={widget.enabled}
                      onChange={() => toggleWidget(widget.id)}
                      aria-label={`Enable ${widget.name}`}
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

export default DashboardSettingsSection;
