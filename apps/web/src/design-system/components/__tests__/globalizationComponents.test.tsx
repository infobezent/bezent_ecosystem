import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  CountryFlag,
  CountrySelect,
  TimezoneSelect,
  CurrencySelect,
  LanguageSelect,
  InternationalPhoneInput,
  LocaleDatePicker,
  DateRangePicker,
} from '../index';

describe('Globalization UI Components (Design System)', () => {
  describe('CountryFlag', () => {
    it('renders accessible flag with aria-label and svg flag icon', () => {
      const html = renderToStaticMarkup(<CountryFlag countryCode="IN" showLabel={true} />);
      expect(html).toContain('fi-in');
      expect(html).toContain('India');
      expect(html).toContain('role="img"');
      expect(html).toContain('aria-label="India (IN)"');
    });

    it('renders compact flag without label by default', () => {
      const html = renderToStaticMarkup(<CountryFlag countryCode="US" size="lg" />);
      expect(html).toContain('fi-us');
      expect(html).toContain('bezent-country-flag--lg');
    });
  });

  describe('CountrySelect', () => {
    it('renders with label and selected country flag and name', () => {
      const html = renderToStaticMarkup(
        <CountrySelect
          label="Select Operating Country"
          value="IN"
          onChange={() => {}}
        />,
      );
      expect(html).toContain('Select Operating Country');
      expect(html).toContain('fi-in');
      expect(html).toContain('India');
      expect(html).toContain('bezent-country-select');
    });

    it('renders placeholder when no value is provided', () => {
      const html = renderToStaticMarkup(
        <CountrySelect
          label="Country"
          placeholder="Choose a country..."
          onChange={() => {}}
        />,
      );
      expect(html).toContain('Choose a country...');
    });
  });

  describe('TimezoneSelect', () => {
    it('renders with current selected timezone and dynamic offset badge', () => {
      const html = renderToStaticMarkup(
        <TimezoneSelect
          label="Corporate Timezone"
          value="Asia/Kolkata"
          onChange={() => {}}
        />,
      );
      expect(html).toContain('Corporate Timezone');
      expect(html).toContain('Asia/Kolkata');
      expect(html).toContain('+05:30');
      expect(html).toContain('bezent-timezone-select-trigger__offset');
    });
  });

  describe('CurrencySelect', () => {
    it('renders currency code and symbol', () => {
      const html = renderToStaticMarkup(
        <CurrencySelect
          label="Base Currency"
          value="INR"
          onChange={() => {}}
        />,
      );
      expect(html).toContain('Base Currency');
      expect(html).toContain('INR');
      expect(html).toContain('₹');
      expect(html).toContain('Indian Rupee');
    });
  });

  describe('LanguageSelect', () => {
    it('renders language selector with native and English name', () => {
      const html = renderToStaticMarkup(
        <LanguageSelect
          label="UI Language"
          value="ja"
          onChange={() => {}}
        />,
      );
      expect(html).toContain('UI Language');
      expect(html).toContain('日本語');
      expect(html).toContain('Japanese');
    });
  });

  describe('InternationalPhoneInput', () => {
    it('renders integrated country picker and phone input field', () => {
      const html = renderToStaticMarkup(
        <InternationalPhoneInput
          label="Phone Number"
          value="9876543210"
          countryCode="IN"
          onChange={() => {}}
        />,
      );
      expect(html).toContain('Phone Number');
      expect(html).toContain('+91');
      expect(html).toContain('fi-in');
      expect(html).toContain('type="tel"');
      expect(html).toContain('value="9876543210"');
    });

    it('renders helper text or error state when provided', () => {
      const html = renderToStaticMarkup(
        <InternationalPhoneInput
          label="Contact"
          countryCode="US"
          error="Please provide a valid 10-digit number"
        />,
      );
      expect(html).toContain('Please provide a valid 10-digit number');
      expect(html).toContain('has-error');
      expect(html).toContain('bezent-intl-phone-error');
    });
  });

  describe('LocaleDatePicker', () => {
    it('renders date picker trigger with calendar icon and formatted date', () => {
      const html = renderToStaticMarkup(
        <LocaleDatePicker
          label="Effective Date"
          value="2026-10-15"
          onChange={() => {}}
        />,
      );
      expect(html).toContain('Effective Date');
      expect(html).toContain('Oct 15, 2026');
      expect(html).toContain('bezent-date-picker-trigger');
    });
  });

  describe('DateRangePicker', () => {
    it('renders date range trigger with formatted date range', () => {
      const html = renderToStaticMarkup(
        <DateRangePicker
          label="Attendance Cycle"
          startDate="2026-10-01"
          endDate="2026-10-31"
          onChange={() => {}}
        />,
      );
      expect(html).toContain('Attendance Cycle');
      expect(html).toContain('Oct 1, 2026 — Oct 31, 2026');
      expect(html).toContain('bezent-date-range-trigger');
    });
  });
});
