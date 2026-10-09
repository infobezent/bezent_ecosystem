import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { Checkbox } from '../Checkbox';

describe('Design System Checkbox Component', () => {
  it('renders unchecked checkbox with accessible label', () => {
    const html = renderToStaticMarkup(
      <Checkbox id="terms-agree" label="I accept the terms and conditions" />,
    );

    expect(html).toContain('bezent-checkbox-wrapper');
    expect(html).toContain('bezent-checkbox-wrapper--md');
    expect(html).toContain('for="terms-agree"');
    expect(html).toContain('type="checkbox"');
    expect(html).toContain('id="terms-agree"');
    expect(html).toContain('bezent-checkbox__track');
    expect(html).toContain('bezent-checkbox__box');
    expect(html).toContain('bezent-checkbox__checkmark');
    expect(html).toContain('bezent-checkbox__indeterminate');
    expect(html).toContain('bezent-checkbox__label');
    expect(html).toContain('I accept the terms and conditions');
  });

  it('renders checked state correctly', () => {
    const html = renderToStaticMarkup(
      <Checkbox id="notifications" label="Enable notifications" defaultChecked />,
    );

    expect(html).toContain('checked=""');
    expect(html).toContain('id="notifications"');
  });

  it('applies disabled state with wrapper modifier and disabled input', () => {
    const html = renderToStaticMarkup(
      <Checkbox id="dis-check" label="Disabled Option" disabled />,
    );

    expect(html).toContain('bezent-checkbox-wrapper--disabled');
    expect(html).toContain('disabled=""');
  });

  it('supports indeterminate state representation', () => {
    const html = renderToStaticMarkup(
      <Checkbox id="parent-row" label="Select All Rows" indeterminate />,
    );

    expect(html).toContain('bezent-checkbox__box');
    expect(html).toContain('bezent-checkbox__indeterminate');
  });

  it('supports size modifiers (sm and md)', () => {
    const htmlSm = renderToStaticMarkup(
      <Checkbox id="sm-size" label="Small size" size="sm" />,
    );
    const htmlMd = renderToStaticMarkup(
      <Checkbox id="md-size" label="Medium size" size="md" />,
    );

    expect(htmlSm).toContain('bezent-checkbox-wrapper--sm');
    expect(htmlMd).toContain('bezent-checkbox-wrapper--md');
  });

  it('propagates custom className and HTML input attributes', () => {
    const handleChange = vi.fn();
    const html = renderToStaticMarkup(
      <Checkbox
        id="custom-check"
        className="my-custom-checkbox"
        name="filter_apps"
        value="hrms"
        onChange={handleChange}
        aria-label="Filter HRMS"
      />,
    );

    expect(html).toContain('my-custom-checkbox');
    expect(html).toContain('name="filter_apps"');
    expect(html).toContain('value="hrms"');
    expect(html).toContain('aria-label="Filter HRMS"');
  });
});
