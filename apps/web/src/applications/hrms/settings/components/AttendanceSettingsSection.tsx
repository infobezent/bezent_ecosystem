import { useState } from 'react';
import { Button } from '../../../../design-system/components/Button';
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
    <div className="settings-section">
      <div className="settings-section__header">
        <div>
          <h2 className="settings-section__title">Attendance Settings</h2>
          <p className="settings-section__subtitle">
            Configure attendance check-in rules, grace periods, working hours, attendance types, and
            late policies.
          </p>
        </div>
        <Button variant="primary" size="sm" className="btn-primary-blue" type="button" onClick={handleSave}>
          {saved ? '✓ Saved' : 'Save Attendance Rules'}
        </Button>
      </div>

      <div className="settings-card-grid">
        <div className="settings-card">
          <h3 className="settings-card__title">Check-in & Late Rules</h3>
          <div className="settings-field-group">
            <label className="settings-label">Grace Period for Late Arrival (Minutes)</label>
            <input
              type="number"
              className="settings-input"
              value={gracePeriodMins}
              onChange={(e) => setGracePeriodMins(Number(e.target.value))}
            />
          </div>
          <div className="settings-field-group">
            <label className="settings-label">Standard Daily Working Hours Schedule</label>
            <input
              type="text"
              className="settings-input"
              value={defaultShift}
              onChange={(e) => setDefaultShift(e.target.value)}
            />
          </div>
          <div className="settings-field-group">
            <label className="settings-checkbox-label">
              <input
                type="checkbox"
                checked={allowEarlyCheckout}
                onChange={(e) => setAllowEarlyCheckout(e.target.checked)}
              />
              Allow Early Checkout Request with Reason
            </label>
          </div>
        </div>

        <div className="settings-card">
          <h3 className="settings-card__title">Supported Attendance Types</h3>
          <p className="settings-card__desc">Enable attendance modes authorized for employees.</p>
          <div className="settings-toggle-list">
            {attendanceTypes.map((type) => (
              <label key={type.id} className="settings-toggle-item">
                <span className="settings-toggle-label">
                  <BezentIcon name="attendance" size={16} />
                  {type.name}
                </span>
                <input
                  type="checkbox"
                  checked={type.enabled}
                  onChange={() => toggleType(type.id)}
                />
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
