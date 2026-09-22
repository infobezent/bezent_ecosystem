import { useState } from 'react';
import { Button } from '../../../../design-system/components/Button';

export function TimesheetsSettingsSection() {
  const [categories, setCategories] = useState([
    'Software Development',
    'Client Support',
    'Project Meetings',
    'Internal Research & Training',
    'Documentation',
  ]);
  const [newCatInput, setNewCatInput] = useState('');
  const [requireProject, setRequireProject] = useState(true);
  const [requireDescription, setRequireDescription] = useState(true);
  const [saved, setSaved] = useState(false);

  const handleAddCategory = () => {
    if (!newCatInput.trim()) return;
    setCategories((prev) => [...prev, newCatInput.trim()]);
    setNewCatInput('');
  };

  const handleDeleteCategory = (idx: number) => {
    setCategories((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="settings-section">
      <div className="settings-section__header">
        <div>
          <h2 className="settings-section__title">Timesheets Settings</h2>
          <p className="settings-section__subtitle">
            Configure timesheet time entry options, mandatory fields, status categories, and time
            tracking rules.
          </p>
        </div>
        <Button type="button" onClick={handleSave}>
          {saved ? '✓ Saved' : 'Save Timesheet Rules'}
        </Button>
      </div>

      <div className="settings-card-grid">
        <div className="settings-card">
          <h3 className="settings-card__title">Time Entry Rules & Required Fields</h3>
          <div className="settings-field-group">
            <label className="settings-checkbox-label">
              <input
                type="checkbox"
                checked={requireProject}
                onChange={(e) => setRequireProject(e.target.checked)}
              />
              Require Project Selection for every time entry
            </label>
          </div>
          <div className="settings-field-group">
            <label className="settings-checkbox-label">
              <input
                type="checkbox"
                checked={requireDescription}
                onChange={(e) => setRequireDescription(e.target.checked)}
              />
              Require Work Description / Notes
            </label>
          </div>
        </div>

        <div className="settings-card">
          <h3 className="settings-card__title">Available Time Categories</h3>
          <div className="dropdown-input-row">
            <input
              type="text"
              className="settings-input"
              placeholder="New time category"
              value={newCatInput}
              onChange={(e) => setNewCatInput(e.target.value)}
            />
            <Button type="button" onClick={handleAddCategory}>
              + Add
            </Button>
          </div>
          <ul className="dropdown-option-tag-list">
            {categories.map((cat, idx) => (
              <li key={idx} className="dropdown-option-tag">
                <span>{cat}</span>
                <button type="button" onClick={() => handleDeleteCategory(idx)}>
                  ✕
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
