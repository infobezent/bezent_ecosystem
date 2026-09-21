import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { BezentIcon, BezentNavIcon } from './components';
import { getMaterialSymbolGlyph } from './materialSymbolsMap';
import type { BezentIconName } from './definitions';

describe('BEZENT Icon System — Google Material Symbols Outlined (ADR-015)', () => {
  it('BezentIcon renders Material Symbols Outlined glyph by default when active=false', () => {
    const html = renderToStaticMarkup(<BezentIcon name="employees" active={false} />);
    expect(html).toContain('material-symbols-outlined');
    expect(html).toContain('bezent-material-icon');
    expect(html).toContain('>group</span>');
    expect(html).toContain('data-variant="outline"');
  });

  it('BezentIcon converts to solid variant when active=true (selected === solid)', () => {
    const html = renderToStaticMarkup(<BezentIcon name="employees" active={true} />);
    expect(html).toContain('material-symbols-outlined');
    expect(html).toContain('is-active');
    expect(html).toContain('is-solid');
    expect(html).toContain('>group</span>');
    expect(html).toContain('data-variant="solid"');
  });

  it('BezentIcon renders solid variant when explicitly requested via variant="solid"', () => {
    const html = renderToStaticMarkup(
      <BezentIcon name="employees" variant="solid" active={true} />,
    );
    expect(html).toContain('material-symbols-outlined');
    expect(html).toContain('is-solid');
    expect(html).toContain('data-variant="solid"');
    expect(html).toContain('>group</span>');
  });

  it('BezentNavIcon renders solid glyph when active=true with active navigation container', () => {
    const html = renderToStaticMarkup(<BezentNavIcon name="employees" active={true} />);
    expect(html).toContain('bezent-nav-icon-box is-selected');
    expect(html).toContain('material-symbols-outlined');
    expect(html).toContain('is-solid');
    expect(html).toContain('>group</span>');
  });

  it('BezentNavIcon preserves identical outline glyph between normal, hover, and active states', () => {
    const normalHtml = renderToStaticMarkup(<BezentNavIcon name="dashboard" active={false} />);
    const activeHtml = renderToStaticMarkup(<BezentNavIcon name="dashboard" active={true} />);

    expect(normalHtml).toContain('bezent-nav-icon-box is-default');
    expect(normalHtml).toContain('>dashboard</span>');

    expect(activeHtml).toContain('bezent-nav-icon-box is-selected');
    expect(activeHtml).toContain('>dashboard</span>');
  });

  it('Dashboard navigation item follows canonical states without special-case logic', () => {
    // 1. Normal state
    const normal = renderToStaticMarkup(
      <BezentNavIcon name="dashboard" active={false} hovered={false} />,
    );
    expect(normal).toContain('bezent-nav-icon-box is-default');
    expect(normal).toContain('>dashboard</span>');

    // 2. Hover state
    const hovered = renderToStaticMarkup(
      <BezentNavIcon name="dashboard" active={false} hovered={true} />,
    );
    expect(hovered).toContain('bezent-nav-icon-box is-hovered');
    expect(hovered).toContain('>dashboard</span>');

    // 3. Selected state
    const selected = renderToStaticMarkup(
      <BezentNavIcon name="dashboard" active={true} hovered={false} />,
    );
    expect(selected).toContain('bezent-nav-icon-box is-selected');
    expect(selected).toContain('>dashboard</span>');
  });

  it('Dashboard to Onboarding navigation transition switches state cleanly without geometry distortion', () => {
    const dashActive = renderToStaticMarkup(<BezentNavIcon name="dashboard" active={true} />);
    const onbInactive = renderToStaticMarkup(<BezentNavIcon name="onboarding" active={false} />);

    expect(dashActive).toContain('is-selected');
    expect(dashActive).toContain('>dashboard</span>');
    expect(onbInactive).toContain('is-default');
    expect(onbInactive).toContain('>person_add</span>');

    const dashInactive = renderToStaticMarkup(<BezentNavIcon name="dashboard" active={false} />);
    const onbActive = renderToStaticMarkup(<BezentNavIcon name="onboarding" active={true} />);

    expect(dashInactive).toContain('is-default');
    expect(dashInactive).toContain('>dashboard</span>');
    expect(onbActive).toContain('is-selected');
    expect(onbActive).toContain('>person_add</span>');
  });

  it('All left-nav icons resolve to correct Material Symbols ligatures and maintain outline in selected state', () => {
    const navExpectations: Record<string, string> = {
      employees: 'group',
      onboarding: 'person_add',
      dashboard: 'dashboard',
      attendance: 'co_present',
      timesheets: 'pending_actions',
      performance: 'trending_up',
      leave: 'event_busy',
      more: 'more_horiz',
    };

    for (const [name, expectedGlyph] of Object.entries(navExpectations)) {
      const html = renderToStaticMarkup(
        <BezentNavIcon name={name as BezentIconName} active={true} />,
      );
      expect(html).toContain('is-selected');
      expect(html).toContain(`>${expectedGlyph}</span>`);
      expect(getMaterialSymbolGlyph(name)).toBe(expectedGlyph);
    }
  });
});
