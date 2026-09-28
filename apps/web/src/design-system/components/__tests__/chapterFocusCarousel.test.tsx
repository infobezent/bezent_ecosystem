import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ChapterFocusCarousel } from '../index';

describe('Design System ChapterFocusCarousel Primitive', () => {
  const chapters = [
    { id: 'general', stepNumber: '01', label: 'General' },
    { id: 'personal', stepNumber: '02', label: 'Personal Information' },
    { id: 'onboarding', stepNumber: '03', label: 'Administration' },
    { id: 'skills', stepNumber: '04', label: 'Skills' },
    { id: 'review', stepNumber: '10', label: 'Review' },
  ];

  it('renders horizontal chapter focus carousel with all chapters and counter', () => {
    const html = renderToStaticMarkup(
      <ChapterFocusCarousel
        chapters={chapters}
        activeId="general"
        onSelectChapter={vi.fn()}
        kickerLabel="REGISTRATION CHAPTERS"
      />,
    );

    expect(html).toContain('bezent-focus-carousel');
    expect(html).toContain('REGISTRATION CHAPTERS');
    expect(html).toContain('01');
    expect(html).toContain('05');
    expect(html).toContain('General');
    expect(html).toContain('Personal Information');
    expect(html).toContain('Administration');
    expect(html).toContain('Skills');
    expect(html).toContain('Review');
    expect(html).toContain('role="tablist"');
    expect(html).toContain('role="tab"');
  });

  it('assigns is-focus-active to active chapter and proper depth classes to neighbors', () => {
    const html = renderToStaticMarkup(
      <ChapterFocusCarousel chapters={chapters} activeId="personal" onSelectChapter={vi.fn()} />,
    );

    // Active item (personal)
    expect(html).toContain('is-focus-active');
    expect(html).toContain('aria-selected="true"');

    // Neighbors (general at -1, onboarding at +1)
    expect(html).toContain('is-focus-neighbor');

    // Secondary neighbor (skills at +2)
    expect(html).toContain('is-focus-secondary');
  });
});
