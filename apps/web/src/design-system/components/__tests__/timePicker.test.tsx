import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { TimePicker } from '../TimePicker';

describe('Design System TimePicker Component (24-Hour Military Time)', () => {
  it('renders with 24-hour format and default time', () => {
    const html = renderToStaticMarkup(<TimePicker value="04:00:00" onChange={() => {}} />);

    expect(html).toContain('04');
    expect(html).toContain('00');
    expect(html).toContain('bezent-time-picker');
    // Ensure no AM/PM indicators exist in 24-hr format
    expect(html).not.toContain('AM');
    expect(html).not.toContain('PM');
  });

  it('renders aria-label and accessible controls', () => {
    const html = renderToStaticMarkup(
      <TimePicker value="14:30:00" onChange={() => {}} aria-label="Attendance Day Cutoff" />,
    );

    expect(html).toContain('aria-label="Attendance Day Cutoff"');
    expect(html).toContain('14');
    expect(html).toContain('30');
    expect(html).toContain('Increment hour');
    expect(html).toContain('Decrement hour');
  });

  it('renders disabled state correctly', () => {
    const html = renderToStaticMarkup(<TimePicker value="04:00:00" onChange={() => {}} disabled />);

    expect(html).toContain('bezent-time-picker--disabled');
    expect(html).toContain('disabled');
  });
});
