import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { PhoneInput } from '../PhoneInput';
import * as RootDesignSystem from '../../index';

describe('Design System PhoneInput Component', () => {
  it('is exported from root design-system barrel', () => {
    expect(RootDesignSystem.PhoneInput).toBeDefined();
    expect(typeof RootDesignSystem.PhoneInput).toBe('object'); // forwardRef component
  });

  it('renders a single unified box with country picker and phone input field', () => {
    const html = renderToStaticMarkup(
      <PhoneInput id="test-phone" countryCode="+91" value="9876543210" placeholder="Enter phone" />,
    );

    expect(html).toContain('bezent-phone-input-wrapper');
    expect(html).toContain('bezent-phone-input-box');
    expect(html).toContain('bezent-phone-input-country');
    expect(html).toContain('bezent-phone-input-field');
    expect(html).toContain('id="test-phone"');
    expect(html).toContain('type="tel"');
    expect(html).toContain('value="9876543210"');
    expect(html).toContain('+91 (IN)');
  });

  it('renders label and error message when provided', () => {
    const html = renderToStaticMarkup(
      <PhoneInput label="Primary Mobile" error="Invalid mobile number" countryCode="+1" />,
    );

    expect(html).toContain('bezent-phone-input-label');
    expect(html).toContain('Primary Mobile');
    expect(html).toContain('has-error');
    expect(html).toContain('Invalid mobile number');
  });

  it('renders country flag icon next to country code', () => {
    const html = renderToStaticMarkup(<PhoneInput countryCode="+91" />);

    expect(html).toContain('🇮🇳');
    expect(html).toContain('bezent-phone-input-flag');
  });
});
