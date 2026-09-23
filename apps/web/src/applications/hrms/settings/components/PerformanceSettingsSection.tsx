import { useState } from 'react';
import {
  Button,
  Card,
  Grid,
  Select,
  Input,
  Badge,
  Toolbar,
  Stack,
  Inline,
} from '../../../../design-system/components';
import { BezentIcon } from '../../../../design-system/icons';

const RATING_OPTIONS = [
  {
    value: '5-Point Scale (1-5)',
    label: '5-Point Scale (1: Unsatisfactory to 5: Outstanding)',
  },
  {
    value: '3-Point Scale (Exceeds/Meets/Needs Imp.)',
    label: '3-Point Performance Scale',
  },
  {
    value: 'Percentage Grade (0-100%)',
    label: 'Percentage Grade (0% - 100%)',
  },
];

const CYCLE_OPTIONS = [
  { value: 'Quarterly (Q1-Q4)', label: 'Quarterly Reviews (Q1, Q2, Q3, Q4)' },
  { value: 'Bi-Annual (H1/H2)', label: 'Bi-Annual Reviews (H1 & H2)' },
  { value: 'Annual', label: 'Annual Appraisal Cycle' },
];

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
    <Stack gap="lg">
      <Toolbar
        left={
          <div>
            <h2 className="bezent-card__title">Performance Settings</h2>
            <p className="bezent-card__desc">
              Configure appraisal rating options, review cycles, goal categories, and competency
              evaluation criteria.
            </p>
          </div>
        }
        right={
          <Button variant="primary" type="button" onClick={handleSave}>
            {saved ? '✓ Saved' : 'Save Performance Config'}
          </Button>
        }
      />

      <Grid columns={2} gap="lg">
        <Card padding="lg">
          <Stack gap="md">
            <h3 className="bezent-card__title">Appraisal & Rating Cycles</h3>
            <Select
              label="Default Rating Scale"
              value={ratingScale}
              options={RATING_OPTIONS}
              onChange={(e) => setRatingScale(e.target.value)}
            />
            <Select
              label="Review Cycle Frequency"
              value={reviewCycle}
              options={CYCLE_OPTIONS}
              onChange={(e) => setReviewCycle(e.target.value)}
            />
          </Stack>
        </Card>

        <Card padding="lg">
          <Stack gap="md">
            <h3 className="bezent-card__title">Evaluation Competencies</h3>
            <Inline gap="sm" align="center">
              <Input
                placeholder="New competency area"
                value={newCompInput}
                onChange={(e) => setNewCompInput(e.target.value)}
              />
              <Button variant="secondary" type="button" onClick={handleAddCompetency}>
                + Add
              </Button>
            </Inline>
            <Inline gap="xs" wrap>
              {competencies.map((comp, idx) => (
                <Badge key={idx} variant="neutral">
                  <Inline gap="xs" align="center">
                    <span>{comp}</span>
                    <button
                      type="button"
                      aria-label={`Remove ${comp}`}
                      onClick={() => handleDeleteCompetency(idx)}
                    >
                      <BezentIcon name="close" size={12} />
                    </button>
                  </Inline>
                </Badge>
              ))}
            </Inline>
          </Stack>
        </Card>
      </Grid>
    </Stack>
  );
}

export default PerformanceSettingsSection;
