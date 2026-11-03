import React, { useState } from 'react';
import { Stack } from '../../../../../design-system/components';
import {
  FormsLanding,
  EmployeeRegistrationFormConfiguration,
  type SystemFormId,
} from '../../administration/forms/FormsSettings';

export function RegistrationFormsTab() {
  const [activeForm, setActiveForm] = useState<SystemFormId | null>(null);

  if (activeForm === 'employee-registration') {
    return <EmployeeRegistrationFormConfiguration onBack={() => setActiveForm(null)} />;
  }

  return (
    <Stack gap="lg">
      <FormsLanding onConfigure={(formId) => setActiveForm(formId)} />
    </Stack>
  );
}
