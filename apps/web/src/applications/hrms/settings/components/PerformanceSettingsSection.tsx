import { useState } from 'react';
import { Button } from '../../../../design-system/components/Button';

export function PerformanceSettingsSection() {
  const [ratingScale, setRatingScale] = useState('5-Point Scale (1-5)');
  const [reviewCycle, setReviewCycle] = useState('Quarterly (Q1-Q4)');
  const [competencies, setCompetencies] = useState([
    'Leadership & Ownership',
    'Technical Excellence',
    'Collaboration & Teamwork',
    'Problem Solving & Innovation',
    'Communication & Transparency',
  ]);
  const [newCompInput, setNewCompInput] = useState('');
  const [saved, setSaved] = useState(false);

  const handleAddCompetency = () => {
    if (!newCompInput.trim()) return;
    setCompetencies((prev) => [...prev, newCompInput.trim()]);
    setNewCompInput('');
  };

  const handleDeleteCompetency = (idx: number) => {
    setCompetencies((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="settings-section">
      <div className="settings-section__header">
        <div>
          <h2 className="settings-section__title">Performance Settings</h2>
          <p className="settings-section__subtitle">
            Configure appraisal rating options, review cycles, goal categories, and competency
            evaluation criteria.
          </p>
        </div>
        <Button type="button" onClick={handleSave}>
          {saved ? '✓ Saved' : 'Save Performance Config'}
        </Button>
      </div>

      <div className="settings-card-grid">
        <div className="settings-card">
          <h3 className="settings-card__title">Appraisal & Rating Cycles</h3>
          <div className="settings-field-group">
            <label className="settings-label">Default Rating Scale</label>
            <select
              className="settings-input"
              value={ratingScale}
              onChange={(e) => setRatingScale(e.target.value)}
            >
              <option value="5-Point Scale (1-5)">
                5-Point Scale (1: Unsatisfactory to 5: Outstanding)
              </option>
              <option value="3-Point Scale (Exceeds/Meets/Needs Imp.)">
                3-Point Performance Scale
              </option>
              <option value="Percentage Grade (0-100%)">Percentage Grade (0% - 100%)</option>
            </select>
          </div>

          <div className="settings-field-group">
            <label className="settings-label">Review Cycle Frequency</label>
            <select
              className="settings-input"
              value={reviewCycle}
              onChange={(e) => setReviewCycle(e.target.value)}
            >
              <option value="Quarterly (Q1-Q4)">Quarterly Reviews (Q1, Q2, Q3, Q4)</option>
              <option value="Bi-Annual (H1/H2)">Bi-Annual Reviews (H1 & H2)</option>
              <option value="Annual">Annual Appraisal Cycle</option>
            </select>
          </div>
        </div>

        <div className="settings-card">
          <h3 className="settings-card__title">Evaluation Competencies</h3>
          <div className="dropdown-input-row">
            <input
              type="text"
              className="settings-input"
              placeholder="New competency area"
              value={newCompInput}
              onChange={(e) => setNewCompInput(e.target.value)}
            />
            <Button type="button" onClick={handleAddCompetency}>
              + Add
            </Button>
          </div>
          <ul className="dropdown-option-tag-list">
            {competencies.map((comp, idx) => (
              <li key={idx} className="dropdown-option-tag">
                <span>{comp}</span>
                <button type="button" onClick={() => handleDeleteCompetency(idx)}>
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
