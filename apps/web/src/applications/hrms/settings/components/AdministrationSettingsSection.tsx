import { useState } from 'react';
import { useNavigate, useInRouterContext } from 'react-router-dom';
import { Stack, Tabs } from '../../../../design-system/components';
import {
  EmployeeRegistrationFormConfiguration,
  FormsLanding,
  type SystemFormId,
} from './FormsSettings';

/** Administration settings areas. Forms is the first; more areas join later. */
const ADMINISTRATION_SETTINGS_TABS = [{ id: 'forms', label: 'Forms' }] as const;

type AdministrationSettingsTab = (typeof ADMINISTRATION_SETTINGS_TABS)[number]['id'];

/**
 * HR Settings → Administration. Forms → Employee Registration holds the
 * persisted Registration configuration. The legacy in-memory form builder
 * (`OnboardingBuilderSection`) is intentionally no longer reachable here.
 */
interface AdministrationSettingsSectionInnerProps {
  onNavigate?: ((path: string) => void) | null;
}

function AdministrationSettingsSectionInner({
  onNavigate,
}: AdministrationSettingsSectionInnerProps) {
  const [tab, setTab] = useState<AdministrationSettingsTab>('forms');
  const [openForm, setOpenForm] = useState<SystemFormId | null>(null);

  const handleConfigure = (formId: SystemFormId) => {
    if (onNavigate) {
      onNavigate(`/hrms/settings/forms/${formId}`);
    } else {
      setOpenForm(formId);
    }
  };

  return (
    <Stack gap="lg">
      <Tabs
        activeId={tab}
        onChange={(id) => {
          setTab(id as AdministrationSettingsTab);
          setOpenForm(null);
        }}
        items={ADMINISTRATION_SETTINGS_TABS.map((item) => ({ id: item.id, label: item.label }))}
      />
      {tab === 'forms' &&
        (openForm === 'employee-registration' ? (
          <EmployeeRegistrationFormConfiguration onBack={() => setOpenForm(null)} />
        ) : (
          <FormsLanding onConfigure={handleConfigure} />
        ))}
    </Stack>
  );
}

function RoutedAdministrationSettingsSection() {
  const navigate = useNavigate();
  return <AdministrationSettingsSectionInner onNavigate={(path) => navigate(path)} />;
}

export function AdministrationSettingsSection() {
  const inRouter = useInRouterContext();
  if (inRouter) {
    return <RoutedAdministrationSettingsSection />;
  }
  return <AdministrationSettingsSectionInner onNavigate={null} />;
}
