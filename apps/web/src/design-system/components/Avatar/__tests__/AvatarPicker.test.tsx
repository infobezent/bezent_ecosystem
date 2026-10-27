import { describe, it, expect, vi, afterEach } from 'vitest';
import type { ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AvatarPicker } from '../AvatarPicker';
import { _resetCatalogRegistryForTesting, registerAvatar } from '../../../avatar/catalog';

describe('BEZENT Design System — AvatarPicker Component', () => {
  afterEach(() => {
    _resetCatalogRegistryForTesting();
  });

  describe('Dialog Visibility & Accessibility', () => {
    it('renders nothing when isOpen is false', () => {
      const html = renderToStaticMarkup(
        <AvatarPicker isOpen={false} onClose={() => {}} onSelectAvatar={() => {}} />,
      );
      expect(html).toBe('');
    });

    it('renders accessible dialog structure when isOpen is true', () => {
      const html = renderToStaticMarkup(
        <AvatarPicker
          isOpen={true}
          onClose={() => {}}
          onSelectAvatar={() => {}}
          title="Choose Your Avatar"
          description="Personalize your workforce profile."
        />,
      );

      expect(html).toContain('role="dialog"');
      expect(html).toContain('aria-modal="true"');
      expect(html).toContain('Choose Your Avatar');
      expect(html).toContain('Personalize your workforce profile.');
      expect(html).toContain('role="radiogroup"');
      expect(html).toContain('aria-label="Available avatars"');
      expect(html).toContain('role="radio"');
      expect(html).toContain('Select Avatar');
      expect(html).toContain('Cancel');
    });

    it('marks initial selected avatar with aria-checked and visual selection class', () => {
      const html = renderToStaticMarkup(
        <AvatarPicker
          isOpen={true}
          onClose={() => {}}
          onSelectAvatar={() => {}}
          selectedAvatarId="human-classic-male"
        />,
      );

      expect(html).toContain('bezent-avatar-picker__option--selected');
      expect(html).toContain('aria-checked="true"');
      expect(html).toContain('Classic Male');
      expect(html).toContain('Selected:');
    });

    it('resolves aliases correctly for initial selection', () => {
      const html = renderToStaticMarkup(
        <AvatarPicker
          isOpen={true}
          onClose={() => {}}
          onSelectAvatar={() => {}}
          selectedAvatarId="female"
        />,
      );

      expect(html).toContain('bezent-avatar-picker__option--selected');
      expect(html).toContain('Classic Female');
    });

    it('disables "Select Avatar" button when no avatar is selected', () => {
      const html = renderToStaticMarkup(
        <AvatarPicker
          isOpen={true}
          onClose={() => {}}
          onSelectAvatar={() => {}}
          selectedAvatarId={null}
        />,
      );

      expect(html).toContain('No avatar selected');
      expect(html).toContain('disabled=""');
    });

    it('normalizes unknown selectedAvatarId to empty selection and keeps button disabled', () => {
      const html = renderToStaticMarkup(
        <AvatarPicker
          isOpen={true}
          onClose={() => {}}
          onSelectAvatar={() => {}}
          selectedAvatarId="completely-unknown-avatar-id"
        />,
      );

      expect(html).toContain('No avatar selected');
      expect(html).not.toContain('bezent-avatar-picker__option--selected');
      expect(html).toContain('disabled=""');
    });
  });

  describe('Category Filtering & Empty States', () => {
    it('renders category filter buttons and counts', () => {
      const html = renderToStaticMarkup(
        <AvatarPicker isOpen={true} onClose={() => {}} onSelectAvatar={() => {}} />,
      );

      expect(html).toContain('role="tablist"');
      expect(html).toContain('All Avatars');
      expect(html).toContain('Human');
      expect(html).toContain('AI Identities');
      expect(html).toContain('10 avatars');
    });

    it('displays empty state when category has zero matching avatars', () => {
      const html = renderToStaticMarkup(
        <AvatarPicker
          isOpen={true}
          onClose={() => {}}
          onSelectAvatar={() => {}}
          defaultCategory="neutral"
        />,
      );

      expect(html).toContain('bezent-avatar-picker__empty');
      expect(html).toContain('No avatars available in this category.');
    });

    it('shows newly registered avatar in filtered category', () => {
      registerAvatar({
        id: 'neutral-pilot-bot',
        label: 'Pilot Neutral Bot',
        category: 'neutral',
        tags: ['neutral', 'bot'],
        assetPath: '/assets/avatars/neutral-bot.png',
        verified: false,
      });

      const html = renderToStaticMarkup(
        <AvatarPicker
          isOpen={true}
          onClose={() => {}}
          onSelectAvatar={() => {}}
          defaultCategory="neutral"
        />,
      );

      expect(html).not.toContain('No avatars available');
      expect(html).toContain('Pilot Neutral Bot');
      expect(html).toContain('1 avatar');
    });
  });

  describe('Interactive Handlers & Keyboard Navigation', () => {
    it('invokes onClose when Cancel button is clicked', () => {
      const onCloseSpy = vi.fn();
      let cancelBtn: ReactElement<{ onClick?: () => void }> | undefined;

      function Harness() {
        const el = AvatarPicker({
          isOpen: true,
          onClose: onCloseSpy,
          onSelectAvatar: () => {},
        });

        // el is Modal with footer prop
        const footer = el?.props?.footer;
        const actions = footer?.props?.children?.[1];
        cancelBtn = actions?.props?.children?.[0];

        return el;
      }

      renderToStaticMarkup(<Harness />);
      expect(cancelBtn).toBeDefined();
      expect(typeof cancelBtn?.props?.onClick).toBe('function');

      cancelBtn?.props?.onClick?.();
      expect(onCloseSpy).toHaveBeenCalledTimes(1);
    });

    it('invokes onSelectAvatar and onClose when Confirm button is clicked', () => {
      const onSelectSpy = vi.fn();
      const onCloseSpy = vi.fn();
      let confirmBtn: ReactElement<{ onClick?: () => void }> | undefined;

      function Harness() {
        const el = AvatarPicker({
          isOpen: true,
          onClose: onCloseSpy,
          onSelectAvatar: onSelectSpy,
          selectedAvatarId: 'human-classic-female',
        });

        const footer = el?.props?.footer;
        const actions = footer?.props?.children?.[1];
        confirmBtn = actions?.props?.children?.[1];

        return el;
      }

      renderToStaticMarkup(<Harness />);
      expect(confirmBtn).toBeDefined();
      expect(typeof confirmBtn?.props?.onClick).toBe('function');

      confirmBtn?.props?.onClick?.();
      expect(onSelectSpy).toHaveBeenCalledWith('human-classic-female');
      expect(onCloseSpy).toHaveBeenCalledTimes(1);
    });

    it('does not attach double-click auto-confirmation to avatar options', () => {
      let firstOption: ReactElement<{ onDoubleClick?: unknown }> | undefined;

      function Harness() {
        const el = AvatarPicker({
          isOpen: true,
          onClose: () => {},
          onSelectAvatar: () => {},
        });

        const body = el?.props?.children;
        const grid = body?.props?.children?.[1];
        const options = grid?.props?.children;
        firstOption = options?.[0];

        return el;
      }

      renderToStaticMarkup(<Harness />);
      expect(firstOption).toBeDefined();
      expect(firstOption?.props?.onDoubleClick).toBeUndefined();
    });

    it('supports single-click selection followed by explicit confirmation', () => {
      const onSelectSpy = vi.fn();
      const onCloseSpy = vi.fn();
      let clickOption: (() => void) | undefined;
      let clickConfirm: (() => void) | undefined;

      function Harness() {
        const el = AvatarPicker({
          isOpen: true,
          onClose: onCloseSpy,
          onSelectAvatar: onSelectSpy,
          selectedAvatarId: null,
        });

        const body = el?.props?.children;
        const grid = body?.props?.children?.[1];
        const options = grid?.props?.children;
        const firstOption = options?.[0];

        const footer = el?.props?.footer;
        const actions = footer?.props?.children?.[1];
        const confirmBtn = actions?.props?.children?.[1];

        clickOption = firstOption?.props?.onClick;
        clickConfirm = confirmBtn?.props?.onClick;

        return el;
      }

      renderToStaticMarkup(<Harness />);
      expect(typeof clickOption).toBe('function');
      expect(typeof clickConfirm).toBe('function');

      // Clicking an option selects it, but does not close or confirm prematurely
      clickOption?.();
      expect(onSelectSpy).not.toHaveBeenCalled();
      expect(onCloseSpy).not.toHaveBeenCalled();
    });

    it('supports Arrow navigation and selection via keyboard onKeyDown', () => {
      let firstOption: ReactElement<{ onKeyDown?: (e: unknown) => void }> | undefined;

      function Harness() {
        const el = AvatarPicker({
          isOpen: true,
          onClose: () => {},
          onSelectAvatar: () => {},
          selectedAvatarId: 'human-classic-male',
        });

        const body = el?.props?.children;
        const grid = body?.props?.children?.[1];
        const options = grid?.props?.children;
        firstOption = options?.[0];

        return el;
      }

      renderToStaticMarkup(<Harness />);
      expect(firstOption).toBeDefined();
      expect(typeof firstOption?.props?.onKeyDown).toBe('function');

      const mockEvent = {
        key: 'ArrowRight',
        preventDefault: vi.fn(),
      };

      firstOption?.props?.onKeyDown?.(mockEvent);
      expect(mockEvent.preventDefault).toHaveBeenCalled();
    });
  });
});
