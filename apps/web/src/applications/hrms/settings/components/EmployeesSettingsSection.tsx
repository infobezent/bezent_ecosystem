import { useState } from 'react';
import { Button } from '../../../../design-system/components/Button';

export function EmployeesSettingsSection() {
  const [departments, setDepartments] = useState([
    'Engineering',
    'Human Resources',
    'Product & Design',
    'Finance & Operations',
    'Sales & Marketing',
  ]);
  const [employmentTypes, setEmploymentTypes] = useState([
    'Full-Time Permanent',
    'Part-Time',
    'Contractor / Freelancer',
    'Intern / Trainee',
  ]);
  const [grades] = useState([
    'L1 - Associate',
    'L2 - Senior',
    'L3 - Lead',
    'L4 - Director',
    'L5 - VP',
  ]);

  const [newDept, setNewDept] = useState('');
  const [newType, setNewType] = useState('');
  const [saved, setSaved] = useState(false);

  const handleAddDept = () => {
    if (!newDept.trim()) return;
    setDepartments((prev) => [...prev, newDept.trim()]);
    setNewDept('');
  };

  const handleAddType = () => {
    if (!newType.trim()) return;
    setEmploymentTypes((prev) => [...prev, newType.trim()]);
    setNewType('');
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="settings-section">
      <div className="settings-section__header">
        <div>
          <h2 className="settings-section__title">Employees Settings</h2>
          <p className="settings-section__subtitle">
            Configure employee directory fields, departments, employment types, designations, and
            grade levels.
          </p>
        </div>
        <Button type="button" onClick={handleSave}>
          {saved ? '✓ Saved' : 'Save Employee Config'}
        </Button>
      </div>

      <div className="settings-card-grid">
        <div className="settings-card">
          <h3 className="settings-card__title">Departments</h3>
          <div className="dropdown-input-row">
            <input
              type="text"
              className="settings-input"
              placeholder="New department"
              value={newDept}
              onChange={(e) => setNewDept(e.target.value)}
            />
            <Button type="button" onClick={handleAddDept}>
              + Add
            </Button>
          </div>
          <ul className="dropdown-option-tag-list">
            {departments.map((dept, idx) => (
              <li key={idx} className="dropdown-option-tag">
                <span>{dept}</span>
                <button
                  type="button"
                  onClick={() => setDepartments(departments.filter((_, i) => i !== idx))}
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="settings-card">
          <h3 className="settings-card__title">Employment Types</h3>
          <div className="dropdown-input-row">
            <input
              type="text"
              className="settings-input"
              placeholder="New employment type"
              value={newType}
              onChange={(e) => setNewType(e.target.value)}
            />
            <Button type="button" onClick={handleAddType}>
              + Add
            </Button>
          </div>
          <ul className="dropdown-option-tag-list">
            {employmentTypes.map((type, idx) => (
              <li key={idx} className="dropdown-option-tag">
                <span>{type}</span>
                <button
                  type="button"
                  onClick={() => setEmploymentTypes(employmentTypes.filter((_, i) => i !== idx))}
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="settings-card">
          <h3 className="settings-card__title">Grades & Band Levels</h3>
          <ul className="dropdown-option-tag-list">
            {grades.map((g, idx) => (
              <li key={idx} className="dropdown-option-tag">
                <span>{g}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
