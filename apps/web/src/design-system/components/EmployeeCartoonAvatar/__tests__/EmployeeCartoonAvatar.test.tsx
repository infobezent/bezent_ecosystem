import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  EmployeeCartoonAvatar,
  resolveCartoonAvatarVariant,
} from '../EmployeeCartoonAvatar';

describe('EmployeeCartoonAvatar & resolveCartoonAvatarVariant', () => {
  describe('Avatar Selection Logic (Priority Hierarchy)', () => {
    it('priority 1: explicit employee avatar preference overrides gender', () => {
      // Even if profile gender is male, preference 'female' wins
      expect(resolveCartoonAvatarVariant('female', 'male')).toBe('female');
      // Preference 'male' wins over female profile
      expect(resolveCartoonAvatarVariant('male', 'female')).toBe('male');
      // Preference 'neutral' wins over male profile
      expect(resolveCartoonAvatarVariant('neutral', 'male')).toBe('neutral');
    });

    it('priority 2: profile gender is used when no preference is set', () => {
      expect(resolveCartoonAvatarVariant(null, 'male')).toBe('male');
      expect(resolveCartoonAvatarVariant(undefined, 'female')).toBe('female');
      expect(resolveCartoonAvatarVariant('', 'MALE')).toBe('male');
      expect(resolveCartoonAvatarVariant('', 'Female')).toBe('female');
    });

    it('priority 3: neutral default fallback when missing or non-binary gender', () => {
      expect(resolveCartoonAvatarVariant(null, null)).toBe('neutral');
      expect(resolveCartoonAvatarVariant(undefined, undefined)).toBe('neutral');
      expect(resolveCartoonAvatarVariant('', '')).toBe('neutral');
      expect(resolveCartoonAvatarVariant('', 'other')).toBe('neutral');
      expect(resolveCartoonAvatarVariant('', 'prefer_not_to_say')).toBe('neutral');
    });

    it('handles invalid preference gracefully by falling back to gender or neutral', () => {
      expect(resolveCartoonAvatarVariant('invalid_pref', 'male')).toBe('male');
      expect(resolveCartoonAvatarVariant('invalid_pref', null)).toBe('neutral');
    });
  });

  describe('Component Rendering', () => {
    it('renders male cartoon character with actual high-res image and accessible labels', () => {
      const html = renderToStaticMarkup(
        <EmployeeCartoonAvatar
          avatarVariant="male"
          employeeName="Arjun Mehta"
          size="hero"
        />
      );

      expect(html).toContain('bezent-cartoon-avatar');
      expect(html).toContain('bezent-cartoon-avatar--hero');
      expect(html).toContain('aria-label="Arjun Mehta&#x27;s avatar (male)"');
      expect(html).toContain('src="/assets/avatars/avatar-male.png"');
    });

    it('renders female cartoon character with actual high-res image and accessible labels', () => {
      const html = renderToStaticMarkup(
        <EmployeeCartoonAvatar
          avatarVariant="female"
          employeeName="Priya Sharma"
          size="hero"
        />
      );

      expect(html).toContain('bezent-cartoon-avatar');
      expect(html).toContain('aria-label="Priya Sharma&#x27;s avatar (female)"');
      expect(html).toContain('src="/assets/avatars/avatar-female.png"');
    });

    it('renders default avatar image when no variant or gender is given', () => {
      const html = renderToStaticMarkup(<EmployeeCartoonAvatar employeeName="Alex" />);

      expect(html).toContain('bezent-cartoon-avatar');
      expect(html).toContain('aria-label="Alex&#x27;s avatar (neutral)"');
      expect(html).toContain('src="/assets/avatars/avatar-male.png"');
    });

    it('resolves female avatar from profile gender automatically', () => {
      const html = renderToStaticMarkup(
        <EmployeeCartoonAvatar gender="female" employeeName="Kavya" />
      );

      expect(html).toContain('aria-label="Kavya&#x27;s avatar (female)"');
      expect(html).toContain('src="/assets/avatars/avatar-female.png"');
    });

    it('supports custom profile image src over default cartoon avatar', () => {
      const html = renderToStaticMarkup(
        <EmployeeCartoonAvatar
          src="/custom-uploaded-photo.jpg"
          employeeName="Custom Employee"
        />
      );

      expect(html).toContain('src="/custom-uploaded-photo.jpg"');
    });

    it('supports 128px size class and interactive button role', () => {
      const html = renderToStaticMarkup(
        <EmployeeCartoonAvatar
          avatarVariant="neutral"
          size="128"
          employeeName="Test Employee"
          onClick={() => {}}
        />
      );

      expect(html).toContain('bezent-cartoon-avatar--interactive');
      expect(html).toContain('bezent-cartoon-avatar--128');
      expect(html).toContain('role="button"');
      expect(html).toContain('tabindex="0"');
    });
  });
});
