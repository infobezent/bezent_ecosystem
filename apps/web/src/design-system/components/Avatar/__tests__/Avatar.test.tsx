import { describe, it, expect, vi } from 'vitest';
import type { ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Avatar } from '../Avatar';

describe('BEZENT Design System — Avatar Component', () => {
  describe('Backward Compatibility for Existing Usage', () => {
    it('renders initials avatar when only initials are provided', () => {
      const html = renderToStaticMarkup(<Avatar initials="AM" alt="Arjun Mehta" />);

      expect(html).toContain('bezent-avatar');
      expect(html).toContain('role="img"');
      expect(html).toContain('aria-label="Arjun Mehta"');
      expect(html).toContain('AM');
      expect(html).not.toContain('<img');
    });

    it('renders image when direct src is provided', () => {
      const html = renderToStaticMarkup(
        <Avatar src="/custom-uploads/employee-1.jpg" alt="Priya Sharma" />,
      );

      expect(html).toContain('bezent-avatar');
      expect(html).toContain('<img');
      expect(html).toContain('src="/custom-uploads/employee-1.jpg"');
      expect(html).toContain('alt="Priya Sharma"');
    });

    it('direct src takes strict precedence over avatarId', () => {
      const html = renderToStaticMarkup(
        <Avatar
          src="/custom-photo.jpg"
          avatarId="human-classic-male"
          initials="JD"
          alt="John Doe"
        />,
      );

      expect(html).toContain('src="/custom-photo.jpg"');
      expect(html).not.toContain('avatar-male.png');
    });

    it('renders icon when icon prop is provided without image', () => {
      const html = renderToStaticMarkup(
        <Avatar icon={<span data-testid="user-icon">👤</span>} alt="User Profile" />,
      );

      expect(html).toContain('data-testid="user-icon"');
      expect(html).toContain('role="img"');
      expect(html).toContain('aria-label="User Profile"');
    });
  });

  describe('Catalog Avatar Resolution via avatarId', () => {
    it('resolves valid canonical avatarId to verified asset image', () => {
      const html = renderToStaticMarkup(
        <Avatar avatarId="human-classic-male" alt="Arjun Mehta" initials="AM" />,
      );

      expect(html).toContain('<img');
      expect(html).toContain('src="/assets/avatars/avatar-male.png"');
      expect(html).toContain('alt="Arjun Mehta"');
    });

    it('resolves valid alias avatarId to canonical asset image', () => {
      const html = renderToStaticMarkup(
        <Avatar avatarId="female" alt="Priya Sharma" initials="PS" />,
      );

      expect(html).toContain('<img');
      expect(html).toContain('src="/assets/avatars/avatar-female.png"');
      expect(html).toContain('alt="Priya Sharma"');
    });

    it('falls back safely to initials when avatarId is unknown', () => {
      const html = renderToStaticMarkup(
        <Avatar avatarId="nonexistent-avatar-id" initials="NK" alt="Naveen Kumar" />,
      );

      expect(html).not.toContain('<img');
      expect(html).toContain('NK');
      expect(html).toContain('aria-label="Naveen Kumar"');
    });

    it('falls back safely to initials when avatarId contains malicious path', () => {
      const html = renderToStaticMarkup(
        <Avatar avatarId="../../etc/passwd" initials="XX" alt="Malicious Attempt" />,
      );

      expect(html).not.toContain('<img');
      expect(html).toContain('XX');
      expect(html).toContain('aria-label="Malicious Attempt"');
    });
  });

  describe('Size Variants & Fixed Dimension Classes', () => {
    it('applies default size (md) without extra size class', () => {
      const html = renderToStaticMarkup(<Avatar initials="A" size="md" />);
      expect(html).toContain('bezent-avatar');
      expect(html).not.toContain('bezent-avatar--md');
    });

    it('applies sm size modifier class', () => {
      const html = renderToStaticMarkup(<Avatar initials="A" size="sm" />);
      expect(html).toContain('bezent-avatar--sm');
    });

    it('applies lg size modifier class', () => {
      const html = renderToStaticMarkup(<Avatar initials="A" size="lg" />);
      expect(html).toContain('bezent-avatar--lg');
    });

    it('applies xl size modifier class', () => {
      const html = renderToStaticMarkup(<Avatar initials="A" size="xl" />);
      expect(html).toContain('bezent-avatar--xl');
    });
  });

  describe('Shape and Color Variants', () => {
    it('applies square shape modifier class', () => {
      const html = renderToStaticMarkup(<Avatar initials="A" shape="square" />);
      expect(html).toContain('bezent-avatar--square');
    });

    it('applies color variants correctly', () => {
      expect(renderToStaticMarkup(<Avatar initials="A" color="blue" />)).toContain(
        'bezent-avatar--blue',
      );
      expect(renderToStaticMarkup(<Avatar initials="A" color="pink" />)).toContain(
        'bezent-avatar--pink',
      );
      expect(renderToStaticMarkup(<Avatar initials="A" color="purple" />)).toContain(
        'bezent-avatar--purple',
      );
      expect(renderToStaticMarkup(<Avatar initials="A" color="green" />)).toContain(
        'bezent-avatar--green',
      );
      expect(renderToStaticMarkup(<Avatar initials="A" color="amber" />)).toContain(
        'bezent-avatar--amber',
      );
      expect(renderToStaticMarkup(<Avatar initials="A" color="cyan" />)).toContain(
        'bezent-avatar--cyan',
      );
    });
  });

  describe('Image Error Fallback Callback Contract', () => {
    /**
     * Testing Boundary Note:
     * In this repository, web unit tests run in Node.js without a DOM (jsdom/happy-dom).
     * `renderToStaticMarkup` performs a single-pass SSR render to an HTML string.
     * The tests below verify the component's element tree contract:
     * - The rendered <img> element attaches the `onError` prop handler.
     * - Invoking the element's `onError` callback fires the `onImageError` callback prop.
     * Note: Visual transition to fallback in the live DOM occurs via client-side React
     * state updates (`setImgFailed(true)`), which requires a browser/mounted DOM environment.
     */
    it('attaches onError handler to the rendered img element and calls onImageError when triggered', () => {
      const onImageError = vi.fn();
      let capturedEl:
        ReactElement<{ children?: ReactElement<{ onError?: () => void }> }> | undefined;

      function Harness() {
        const el = Avatar({
          src: '/broken-image.jpg',
          alt: 'Broken Image',
          initials: 'BK',
          onImageError,
        });
        capturedEl = el as unknown as ReactElement<{
          children?: ReactElement<{ onError?: () => void }>;
        }>;
        return el;
      }

      const initialHtml = renderToStaticMarkup(<Harness />);
      expect(initialHtml).toContain('<img');
      expect(initialHtml).toContain('src="/broken-image.jpg"');
      expect(capturedEl).toBeDefined();

      const img = capturedEl?.props?.children;
      expect(img).toBeDefined();
      expect(typeof img?.props?.onError).toBe('function');

      // Interactively invoke the image onError callback to verify contract
      img?.props?.onError?.();
      expect(onImageError).toHaveBeenCalledTimes(1);
    });

    it('re-renders with updated source when image source props change', () => {
      let renderCount = 0;

      function StatefulContainer({ src }: { src?: string }) {
        renderCount++;
        return Avatar({
          src,
          initials: 'JD',
          alt: 'John Doe',
        });
      }

      // Initial render with valid src
      const html1 = renderToStaticMarkup(<StatefulContainer src="/valid.png" />);
      expect(html1).toContain('src="/valid.png"');
      expect(renderCount).toBe(1);

      // Subsequent render with updated src
      const html2 = renderToStaticMarkup(<StatefulContainer src="/updated.png" />);
      expect(html2).toContain('src="/updated.png"');
      expect(renderCount).toBe(2);
    });
  });
});
