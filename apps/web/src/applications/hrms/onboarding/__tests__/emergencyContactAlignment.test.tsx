import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { EmergencyContactSection } from '../components/EmergencyContactSection';
import { RegistrationConfigProvider } from '../registration/registrationConfig';
import type { RegistrationConfiguration } from '../../settings/api/registrationSettingsApi';
import { configurationWith, defaultRegistrationConfiguration } from './registrationConfigFixture';

function renderEmergencyWith(config: RegistrationConfiguration) {
  return renderToStaticMarkup(
    <RegistrationConfigProvider configuration={config}>
      <EmergencyContactSection />
    </RegistrationConfigProvider>,
  );
}

describe('Chapter 05 (Emergency Contact) Builder ↔ Runtime Alignment', () => {
  it('renders the primary and secondary contact groups with their catalog labels', () => {
    const html = renderEmergencyWith(defaultRegistrationConfiguration);

    expect(html).toContain('PRIMARY EMERGENCY CONTACT');
    expect(html).toContain('SECONDARY EMERGENCY CONTACT');
    expect(html).toContain('Contact Name');
    expect(html).toContain('Relationship / Role');
    expect(html).toContain('Phone');
    expect(html).toContain('Email');
    expect(html).toContain('Address Details');
    expect(html).toContain('Secondary Contact Name');
    expect(html).toContain('Secondary Relationship');
    expect(html).toContain('Secondary Mobile');
    expect(html).toContain('Secondary Email');
  });

  it('hides a field in runtime when disabled in configuration', () => {
    const config = configurationWith({
      'emergency.address': { enabled: false },
      'emergency.secondaryEmail': { enabled: false },
    });

    const html = renderEmergencyWith(config);

    expect(html).not.toContain('Address Details');
    expect(html).not.toContain('Secondary Email');
    expect(html).toContain('Contact Name');
    expect(html).toContain('Secondary Contact Name');
  });

  it('propagates a custom label from the builder to runtime', () => {
    const config = configurationWith({
      'emergency.contactName': { label: 'Primary Point of Contact' },
    });

    const html = renderEmergencyWith(config);

    expect(html).toContain('Primary Point of Contact');
  });

  it('marks a field required when configured required', () => {
    const config = configurationWith({
      'emergency.email': { required: true },
    });

    const html = renderEmergencyWith(config);

    expect(html).toMatch(/Email\s*<span class="bezent-label__required"[^>]*>\*<\/span>/);
  });
});
