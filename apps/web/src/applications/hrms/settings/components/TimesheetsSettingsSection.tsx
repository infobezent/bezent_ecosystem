import { useState } from 'react';
import {
  Button,
  Card,
  Grid,
  Input,
  Switch,
  Badge,
  Toolbar,
  Stack,
  Inline,
} from '../../../../design-system/components';
import { BezentIcon } from '../../../../design-system/icons';

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
    <Stack gap="lg">
      <Toolbar
        left={
          <div>
            <h2 className="bezent-card__title">Timesheets Settings</h2>
            <p className="bezent-card__desc">
              Configure timesheet time entry options, mandatory fields, status categories, and time
              tracking rules.
            </p>
          </div>
        }
        right={
          <Button variant="primary" type="button" onClick={handleSave}>
            {saved ? '✓ Saved' : 'Save Timesheet Rules'}
          </Button>
        }
      />

      <Grid columns={2} gap="lg">
        <Card padding="lg">
          <Stack gap="md">
            <h3 className="bezent-card__title">Time Entry Rules & Required Fields</h3>
            <Switch
              label="Require Project Selection for every time entry"
              checked={requireProject}
              onChange={(e) => setRequireProject(e.target.checked)}
            />
            <Switch
              label="Require Work Description / Notes"
              checked={requireDescription}
              onChange={(e) => setRequireDescription(e.target.checked)}
            />
          </Stack>
        </Card>

        <Card padding="lg">
          <Stack gap="md">
            <h3 className="bezent-card__title">Available Time Categories</h3>
            <Inline gap="sm" align="center">
              <Input
                placeholder="New time category"
                value={newCatInput}
                onChange={(e) => setNewCatInput(e.target.value)}
              />
              <Button variant="secondary" type="button" onClick={handleAddCategory}>
                + Add
              </Button>
            </Inline>
            <Inline gap="xs" wrap>
              {categories.map((cat, idx) => (
                <Badge key={idx} variant="neutral">
                  <Inline gap="xs" align="center">
                    <span>{cat}</span>
                    <button
                      type="button"
                      aria-label={`Remove ${cat}`}
                      onClick={() => handleDeleteCategory(idx)}
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

export default TimesheetsSettingsSection;
