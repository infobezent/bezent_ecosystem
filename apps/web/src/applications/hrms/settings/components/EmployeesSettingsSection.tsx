import { useState } from 'react';
import {
  Button,
  Card,
  Grid,
  Input,
  Badge,
  Toolbar,
  Stack,
  Inline,
} from '../../../../design-system/components';
import { BezentIcon } from '../../../../design-system/icons';

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
    <Stack gap="lg">
      <Toolbar
        left={
          <div>
            <h2 className="bezent-card__title">Employees Settings</h2>
            <p className="bezent-card__desc">
              Configure employee directory fields, departments, employment types, designations, and
              grade levels.
            </p>
          </div>
        }
        right={
          <Button variant="primary" type="button" onClick={handleSave}>
            {saved ? '✓ Saved' : 'Save Employee Config'}
          </Button>
        }
      />

      <Grid columns={2} gap="lg">
        <Card padding="lg">
          <Stack gap="md">
            <h3 className="bezent-card__title">Departments</h3>
            <Inline gap="sm" align="center">
              <Input
                placeholder="New department"
                value={newDept}
                onChange={(e) => setNewDept(e.target.value)}
              />
              <Button variant="secondary" type="button" onClick={handleAddDept}>
                + Add
              </Button>
            </Inline>
            <Inline gap="xs" wrap>
              {departments.map((dept, idx) => (
                <Badge key={idx} variant="neutral">
                  <Inline gap="xs" align="center">
                    <span>{dept}</span>
                    <button
                      type="button"
                      aria-label={`Remove ${dept}`}
                      onClick={() => setDepartments(departments.filter((_, i) => i !== idx))}
                    >
                      <BezentIcon name="close" size={12} />
                    </button>
                  </Inline>
                </Badge>
              ))}
            </Inline>
          </Stack>
        </Card>

        <Card padding="lg">
          <Stack gap="md">
            <h3 className="bezent-card__title">Employment Types</h3>
            <Inline gap="sm" align="center">
              <Input
                placeholder="New employment type"
                value={newType}
                onChange={(e) => setNewType(e.target.value)}
              />
              <Button variant="secondary" type="button" onClick={handleAddType}>
                + Add
              </Button>
            </Inline>
            <Inline gap="xs" wrap>
              {employmentTypes.map((type, idx) => (
                <Badge key={idx} variant="neutral">
                  <Inline gap="xs" align="center">
                    <span>{type}</span>
                    <button
                      type="button"
                      aria-label={`Remove ${type}`}
                      onClick={() =>
                        setEmploymentTypes(employmentTypes.filter((_, i) => i !== idx))
                      }
                    >
                      <BezentIcon name="close" size={12} />
                    </button>
                  </Inline>
                </Badge>
              ))}
            </Inline>
          </Stack>
        </Card>

        <Card padding="lg">
          <Stack gap="md">
            <h3 className="bezent-card__title">Grades & Band Levels</h3>
            <Inline gap="xs" wrap>
              {grades.map((g, idx) => (
                <Badge key={idx} variant="info">
                  {g}
                </Badge>
              ))}
            </Inline>
          </Stack>
        </Card>
      </Grid>
    </Stack>
  );
}

export default EmployeesSettingsSection;
