import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { EmptyState } from '../EmptyState/EmptyState';
import { EmptyStateIllustration } from '../EmptyState/EmptyStateIllustration';

describe('Design System EmptyState Primitive', () => {
  it('renders default empty state with canonical illustration, title, and description', () => {
    const html = renderToStaticMarkup(
      <EmptyState
        title="No items found"
        description="Try adjusting your filters or creating a new item."
      />,
    );

    expect(html).toContain('bezent-empty-state');
    expect(html).toContain('bezent-empty-state--default');
    expect(html).toContain('No items found');
    expect(html).toContain('Try adjusting your filters or creating a new item.');
    expect(html).toContain('bezent-sleeping-raccoon-img');
    expect(html).toContain('bezent-sparkles-layer');
    expect(html).toContain('bezent-empty-state__tagline');
    expect(html).toContain('Process');
  });

  it('supports custom illustration via generic illustration slot', () => {
    const html = renderToStaticMarkup(
      <EmptyState
        title="Custom State"
        illustration={<div className="custom-illustration-box">Graphic</div>}
      />,
    );

    expect(html).toContain('custom-illustration-box');
    expect(html).toContain('Graphic');
    expect(html).not.toContain('bezent-sleeping-raccoon-img');
  });

  it('supports EmptyStateIllustration with custom imageSrc', () => {
    const html = renderToStaticMarkup(
      <EmptyState
        title="Custom Mascot"
        illustration={
          <EmptyStateIllustration imageSrc="/assets/custom-mascot.png" imageAlt="Mascot" />
        }
      />,
    );

    expect(html).toContain('src="/assets/custom-mascot.png"');
    expect(html).toContain('alt="Mascot"');
    expect(html).toContain('bezent-sleeping-raccoon-stage');
    expect(html).toContain('bezent-sparkles-layer');
  });

  it('hides illustration when hideIllustration is true', () => {
    const html = renderToStaticMarkup(<EmptyState title="Text Only" hideIllustration />);

    expect(html).not.toContain('bezent-empty-state__illustration');
    expect(html).not.toContain('bezent-sleeping-raccoon-img');
    expect(html).toContain('Text Only');
  });

  it('renders compact size without tagline', () => {
    const html = renderToStaticMarkup(<EmptyState title="Compact" size="compact" />);

    expect(html).toContain('bezent-empty-state--compact');
    expect(html).toContain('bezent-empty-illustration-container--compact');
    expect(html).not.toContain('bezent-empty-state__tagline');
  });

  it('renders primary and secondary actions properly', () => {
    const html = renderToStaticMarkup(
      <EmptyState
        title="With Actions"
        primaryAction={{ label: 'Create New' }}
        secondaryAction={{ label: 'Learn More' }}
      />,
    );

    expect(html).toContain('bezent-empty-state__primary-action');
    expect(html).toContain('Create New');
    expect(html).toContain('bezent-empty-state__secondary-action');
    expect(html).toContain('Learn More');
  });
});
