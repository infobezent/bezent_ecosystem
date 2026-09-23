import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { Label, FormField, Checkbox, Spinner, LoadingState } from '../index';
import * as RootDesignSystem from '../../index';

describe('Design System Core Primitives', () => {
  describe('Label', () => {
    it('renders label with htmlFor and content', () => {
      const html = renderToStaticMarkup(<Label htmlFor="test-id">Full Name</Label>);
      expect(html).toContain('<label');
      expect(html).toContain('for="test-id"');
      expect(html).toContain('bezent-label');
      expect(html).toContain('Full Name');
    });

    it('renders required asterisk when required is true', () => {
      const html = renderToStaticMarkup(
        <Label htmlFor="test-req" required>
          Work Email
        </Label>,
      );
      expect(html).toContain('bezent-label__required');
      expect(html).toContain('aria-hidden="true">*</span>');
    });

    it('applies disabled modifier class when disabled is true', () => {
      const html = renderToStaticMarkup(
        <Label htmlFor="test-dis" disabled>
          Disabled Field
        </Label>,
      );
      expect(html).toContain('bezent-label--disabled');
    });
  });

  describe('FormField', () => {
    it('renders label and input wrapper together', () => {
      const html = renderToStaticMarkup(
        <FormField label="Email Address" htmlFor="email-input">
          <input id="email-input" type="email" />
        </FormField>,
      );
      expect(html).toContain('bezent-form-field');
      expect(html).toContain('Email Address');
      expect(html).toContain('for="email-input"');
      expect(html).toContain('id="email-input"');
    });

    it('renders helper text when provided', () => {
      const html = renderToStaticMarkup(
        <FormField label="Password" htmlFor="pw-input" helperText="Must be at least 8 characters">
          <input id="pw-input" type="password" />
        </FormField>,
      );
      expect(html).toContain('bezent-form-field__helper');
      expect(html).toContain('Must be at least 8 characters');
    });

    it('renders error message and applies error modifier class', () => {
      const html = renderToStaticMarkup(
        <FormField label="Password" htmlFor="pw-input" error="Password is required">
          <input id="pw-input" type="password" />
        </FormField>,
      );
      expect(html).toContain('bezent-form-field--error');
      expect(html).toContain('bezent-form-field__helper--error');
      expect(html).toContain('Password is required');
      expect(html).toContain('role="alert"');
    });
  });

  describe('Checkbox', () => {
    it('renders native checkbox input with accessible label', () => {
      const html = renderToStaticMarkup(<Checkbox id="terms" label="Accept terms" />);
      expect(html).toContain('bezent-checkbox');
      expect(html).toContain('type="checkbox"');
      expect(html).toContain('id="terms"');
      expect(html).toContain('Accept terms');
    });

    it('applies disabled and size modifier classes', () => {
      const html = renderToStaticMarkup(<Checkbox id="opt" label="Optional" size="sm" disabled />);
      expect(html).toContain('bezent-checkbox-wrapper--sm');
      expect(html).toContain('bezent-checkbox-wrapper--disabled');
      expect(html).toContain('disabled=""');
    });
  });

  describe('Spinner', () => {
    it('renders SVG spinner with accessible label', () => {
      const html = renderToStaticMarkup(<Spinner size="md" label="Loading data" />);
      expect(html).toContain('bezent-spinner');
      expect(html).toContain('bezent-spinner--md');
      expect(html).toContain('role="status"');
      expect(html).toContain('Loading data');
    });

    it('supports all size modifiers', () => {
      const htmlSm = renderToStaticMarkup(<Spinner size="sm" />);
      const htmlLg = renderToStaticMarkup(<Spinner size="lg" />);
      expect(htmlSm).toContain('bezent-spinner--sm');
      expect(htmlLg).toContain('bezent-spinner--lg');
    });
  });

  describe('LoadingState', () => {
    it('renders spinner with label inside container', () => {
      const html = renderToStaticMarkup(
        <LoadingState label="Loading directory…" minHeight="md" fill />,
      );
      expect(html).toContain('bezent-loading-state');
      expect(html).toContain('bezent-loading-state--fill');
      expect(html).toContain('bezent-loading-state--min-md');
      expect(html).toContain('Loading directory…');
      expect(html).toContain('aria-busy="true"');
    });
  });

  describe('Root Design System Barrel', () => {
    it('exports all core primitives from root index', () => {
      expect(RootDesignSystem.Button).toBeDefined();
      expect(RootDesignSystem.Input).toBeDefined();
      expect(RootDesignSystem.Table).toBeDefined();
      expect(RootDesignSystem.Label).toBeDefined();
      expect(RootDesignSystem.FormField).toBeDefined();
      expect(RootDesignSystem.Checkbox).toBeDefined();
      expect(RootDesignSystem.Spinner).toBeDefined();
      expect(RootDesignSystem.LoadingState).toBeDefined();
      expect(RootDesignSystem.BezentIcon).toBeDefined();
    });
  });
});
