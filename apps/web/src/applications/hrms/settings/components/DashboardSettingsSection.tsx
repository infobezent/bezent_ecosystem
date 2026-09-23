import { useState } from 'react';
import { Button } from '../../../../design-system/components/Button';
import { BezentIcon } from '../../../../design-system/icons';

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
    <div className="settings-section">
      <div className="settings-section__header">
        <div>
          <h2 className="settings-section__title">Dashboard Settings</h2>
          <p className="settings-section__subtitle">
            Configure default widget visibility, refresh frequency, and overview layouts.
          </p>
        </div>
        <Button variant="primary" size="sm" className="btn-primary-blue" type="button" onClick={handleSave}>
          {saved ? '✓ Saved' : 'Save Dashboard Settings'}
        </Button>
      </div>

      <div className="settings-card-grid">
        <div className="settings-card">
          <h3 className="settings-card__title">General Configuration</h3>
          <div className="settings-field-group">
            <label className="settings-label" htmlFor="refresh-interval">
              Auto-Refresh Interval
            </label>
            <select
              id="refresh-interval"
              className="settings-input"
              value={refreshInterval}
              onChange={(e) => setRefreshInterval(e.target.value)}
            >
              <option value="1m">Every 1 minute</option>
              <option value="5m">Every 5 minutes</option>
              <option value="15m">Every 15 minutes</option>
              <option value="manual">Manual Refresh Only</option>
            </select>
          </div>
        </div>

        <div className="settings-card">
          <h3 className="settings-card__title">Available Dashboard Widgets</h3>
          <p className="settings-card__desc">
            Enable or disable default widgets for authorized users.
          </p>
          <div className="settings-toggle-list">
            {widgets.map((widget) => (
              <label key={widget.id} className="settings-toggle-item">
                <span className="settings-toggle-label">
                  <BezentIcon name="dashboard" size={16} />
                  {widget.name}
                </span>
                <input
                  type="checkbox"
                  checked={widget.enabled}
                  onChange={() => toggleWidget(widget.id)}
                />
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
