import { useState } from 'react';
import {
  Badge,
  Button,
  EmptyState,
  Label,
  Section,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  Tabs,
} from '../../../../design-system/components';
import { BezentIcon } from '../../../../design-system/icons';
import { RegistrationSettingsSection } from './RegistrationSettingsSection';

/** Forms the platform ships with. Custom forms arrive with the Forms engine. */
export const SYSTEM_FORMS = [
  {
    id: 'employee-registration',
    name: 'Employee Registration',
    description: 'Information collected when registering a new employee.',
    status: 'Active',
  },
] as const;

export type SystemFormId = (typeof SYSTEM_FORMS)[number]['id'];

export interface FormsLandingProps {
  onConfigure: (formId: SystemFormId) => void;
}

/** HR Settings → Administration → Forms. */
export function FormsLanding({ onConfigure }: FormsLandingProps) {
  return (
    <Stack gap="lg">
      <Section title="System Forms" subtitle="Forms provided by BEZENT HRMS.">
        <Table aria-label="System forms">
          <TableHead>
            <TableRow>
              <TableHeaderCell>Form</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
              <TableHeaderCell>Actions</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {SYSTEM_FORMS.map((form) => (
              <TableRow key={form.id}>
                <TableCell>
                  <Stack gap="xs">
                    <span>{form.name}</span>
                    <Label as="span" size="sm">
                      {form.description}
                    </Label>
                  </Stack>
                </TableCell>
                <TableCell>
                  <Badge variant="success" size="sm">
                    {form.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onConfigure(form.id)}
                    aria-label={`Configure ${form.name}`}
                  >
                    Configure
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Section>

      <Section
        title="Custom Forms"
        subtitle="Forms your company creates."
        actions={
          <Button
            variant="primary"
            size="sm"
            disabled
            leftIcon={<BezentIcon name="plusSign" size={16} />}
            aria-label="Create Form (available in a future release)"
          >
            Create Form
          </Button>
        }
      >
        <EmptyState
          size="compact"
          hideIllustration
          title="No custom forms yet"
          description="Creating custom forms will be available in a future release."
        />
      </Section>
    </Stack>
  );
}

/** Form configuration views. Only Customize is available in this milestone. */
export const FORM_CONFIGURATION_TABS = [
  { id: 'customize', label: 'Customize', disabled: false },
  { id: 'access-control', label: 'Access Control', disabled: true },
  { id: 'preview', label: 'Preview', disabled: true },
] as const;

type FormConfigurationTab = (typeof FORM_CONFIGURATION_TABS)[number]['id'];

export interface FormConfigurationProps {
  onBack: () => void;
}

/** HR Settings → Administration → Forms → Employee Registration. */
export function EmployeeRegistrationFormConfiguration({ onBack }: FormConfigurationProps) {
  const [tab, setTab] = useState<FormConfigurationTab>('customize');

  return (
    <Stack gap="lg">
      <Stack gap="sm" align="start">
        <Button
          variant="text"
          size="sm"
          leftIcon={<BezentIcon name="arrowLeft" size={14} />}
          onClick={onBack}
        >
          Forms
        </Button>
        <Tabs
          activeId={tab}
          onChange={(id) => setTab(id as FormConfigurationTab)}
          items={FORM_CONFIGURATION_TABS.map((item) => ({
            id: item.id,
            label: item.label,
            disabled: item.disabled,
          }))}
        />
        <Label as="span" size="sm">
          Access Control and Preview will be available in a future release.
        </Label>
      </Stack>

      {/* V1 Customize: persisted Enabled / Required configuration. */}
      {tab === 'customize' && <RegistrationSettingsSection />}
    </Stack>
  );
}
