import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { JourneyNav, EditorialHeader } from '../index';

describe('Design System Editorial Workspace Primitives', () => {
  describe('JourneyNav', () => {
    const steps = [
      { id: 'step-1', stepNumber: '01', label: 'General' },
      { id: 'step-2', stepNumber: '02', label: 'Personal Information' },
      { id: 'step-3', stepNumber: '03', label: 'Review' },
    ];

    it('renders journey navigation with continuous track and steps', () => {
      const html = renderToStaticMarkup(
        <JourneyNav steps={steps} activeId="step-2" />,
      );

      expect(html).toContain('bezent-journey-nav');
      expect(html).toContain('bezent-journey-nav__guide-track');
      expect(html).toContain('bezent-journey-nav__list');
      expect(html).toContain('role="tablist"');
      expect(html).toContain('role="tab"');
      expect(html).toContain('General');
      expect(html).toContain('Personal Information');
      expect(html).toContain('Review');
      expect(html).toContain('01');
      expect(html).toContain('02');
      expect(html).toContain('03');
    });

    it('correctly assigns active, completed, and upcoming classes', () => {
      const html = renderToStaticMarkup(
        <JourneyNav steps={steps} activeId="step-2" />,
      );

      // step-1 is before activeId, so it is completed
      expect(html).toContain('is-completed');
      // step-2 is activeId
      expect(html).toContain('is-active');
      expect(html).toContain('aria-selected="true"');
      // step-3 is upcoming
      expect(html).toContain('is-upcoming');
    });
  });

  describe('EditorialHeader', () => {
    it('renders editorial chapter introduction with numeral, title, and description', () => {
      const html = renderToStaticMarkup(
        <EditorialHeader
          chapterNumber="01"
          kicker="CHAPTER // 01"
          title="GENERAL INFORMATION"
          description="Core identity and classification details"
        />,
      );

      expect(html).toContain('bezent-editorial-header');
      expect(html).toContain('bezent-editorial-header__numeral');
      expect(html).toContain('01');
      expect(html).toContain('CHAPTER // 01');
      expect(html).toContain('GENERAL INFORMATION');
      expect(html).toContain('Core identity and classification details');
      expect(html).toContain('bezent-editorial-header__rule');
      expect(html).toContain('bezent-editorial-header__rule-accent');
    });

    it('renders optional badge and actions when provided', () => {
      const html = renderToStaticMarkup(
        <EditorialHeader
          chapterNumber="02"
          title="PERSONAL INFORMATION"
          badge={<span className="test-badge">Verified</span>}
          actions={<button type="button">Quick Save</button>}
        />,
      );

      expect(html).toContain('test-badge');
      expect(html).toContain('Verified');
      expect(html).toContain('Quick Save');
    });
  });
});
