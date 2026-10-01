import { useState } from 'react';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Inline,
  Label,
  Stack,
  Tabs,
  Toolbar,
} from '../../../../design-system/components';
import { BezentIcon } from '../../../../design-system/icons';
import { RegistrationSettingsSection } from './RegistrationSettingsSection';

/** Forms the platform ships with. Custom forms arrive with the Forms engine. */
export const SYSTEM_FORMS = [
  {
    id: 'employee-registration',
    name: 'Employee Registration',
    description: 'Configure fields and layout used during employee registration.',
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
    <Card variant="flat" padding="lg">
      <Stack gap="xl">
        {/* Forms Workspace Title Area */}
        <Inline gap="md" align="center">
          <div className="bezent-card__icon">
            <BezentIcon name="document" size={24} />
          </div>
          <Stack gap="xs">
            <h2 className="bezent-card__title">Forms</h2>
            <p className="bezent-card__desc">
              Configure the forms used to collect employee information.
            </p>
          </Stack>
        </Inline>

        {/* Surface 1: System Forms */}
        <Stack gap="sm">
          <Stack gap="xs">
            <h3 className="bezent-section__title">System Forms</h3>
            <p className="bezent-section__subtitle">
              These forms are provided by BEZENT HRMS and can be configured based on your company requirements.
            </p>
          </Stack>

          {SYSTEM_FORMS.map((form) => (
            <Card key={form.id} variant="flat" padding="md">
              <Inline justify="between" align="center" wrap>
                <Inline gap="md" align="center">
                  <div className="bezent-card__icon">
                    <BezentIcon name="document" size={22} />
                  </div>
                  <Stack gap="xs">
                    <Inline gap="sm" align="center">
                      <span className="bezent-card__title">{form.name}</span>
                      <Badge variant="success" size="sm" showDot>
                        {form.status}
                      </Badge>
                    </Inline>
                    <span className="bezent-card__desc">{form.description}</span>
                  </Stack>
                </Inline>

                <Stack gap="xs" align="end">
                  <Badge variant="neutral" size="sm">
                    System Form
                  </Badge>
                  <Button
                    variant="primary"
                    size="md"
                    rightIcon={<BezentIcon name="arrowRight" size={16} />}
                    onClick={() => onConfigure(form.id)}
                    aria-label={`Configure ${form.name}`}
                  >
                    Configure
                  </Button>
                </Stack>
              </Inline>
            </Card>
          ))}
        </Stack>

        {/* Surface 2: Custom Forms */}
        <Stack gap="sm">
          <Toolbar
            left={
              <Stack gap="xs">
                <h3 className="bezent-section__title">Custom Forms</h3>
                <p className="bezent-section__subtitle">
                  Create and manage custom forms for additional employee information.
                </p>
              </Stack>
            }
            right={
              <Button
                variant="outline"
                size="sm"
                disabled
                leftIcon={<BezentIcon name="plusSign" size={14} />}
                aria-label="Create Form (available in a future release)"
              >
                Create Form
              </Button>
            }
          />

          <Card variant="flat" padding="md">
            <EmptyState
              size="compact"
              hideIllustration={false}
              illustration={<BezentIcon name="document" size={32} color="var(--text-tertiary)" />}
              title="No custom forms yet"
              description="Creating custom forms will be available in a future release."
            />
          </Card>
        </Stack>
      </Stack>
    </Card>
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
