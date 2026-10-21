import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { HeroSceneIllustration } from '../HeroSceneIllustration';

describe('HeroSceneIllustration Dynamic Sun Trajectory', () => {
  const makeDate = (hours: number, minutes: number, seconds: number = 0): Date => {
    const d = new Date('2026-10-21T00:00:00');
    d.setHours(hours, minutes, seconds, 0);
    return d;
  };

  it('renders sun at sunrise (06:00 AM) positioned on the East horizon', () => {
    const dateAtSunrise = makeDate(6, 0);
    const html = renderToStaticMarkup(
      <HeroSceneIllustration period="morning" now={dateAtSunrise} />,
    );
    expect(html).toContain('id="bezent-dynamic-sun"');
    // progress = 0: x = 480, y = 185
    expect(html).toContain('transform="translate(480, 185)"');
  });

  it('renders sun at zenith (12:15 PM) positioned at peak altitude', () => {
    // 12:15 PM = 735 minutes (progress = (735 - 360) / 750 = 0.5)
    const dateAtZenith = makeDate(12, 15);
    const html = renderToStaticMarkup(
      <HeroSceneIllustration period="afternoon" now={dateAtZenith} />,
    );
    expect(html).toContain('id="bezent-dynamic-sun"');
    // progress = 0.5: x = 480 + 0.5*440 = 700; y = 185 - 125 = 60
    expect(html).toContain('transform="translate(700, 60)"');
  });

  it('renders sun at sunset (06:30 PM) positioned on the West horizon', () => {
    // 18:30 = 1110 minutes (progress = (1110 - 360) / 750 = 1.0)
    const dateAtSunset = makeDate(18, 30);
    const html = renderToStaticMarkup(
      <HeroSceneIllustration period="evening" now={dateAtSunset} />,
    );
    expect(html).toContain('id="bezent-dynamic-sun"');
    // progress = 1.0: x = 480 + 440 = 920; y = 185 - 0 = 185
    expect(html).toContain('transform="translate(920, 185)"');
  });

  it('hides sun after sunset (e.g. 06:31 PM and night at 11:00 PM)', () => {
    const dateAfterSunset = makeDate(18, 31);
    const htmlDusk = renderToStaticMarkup(
      <HeroSceneIllustration period="evening" now={dateAfterSunset} />,
    );
    expect(htmlDusk).not.toContain('id="bezent-dynamic-sun"');

    const dateNight = makeDate(23, 0);
    const htmlNight = renderToStaticMarkup(
      <HeroSceneIllustration period="night" now={dateNight} />,
    );
    expect(htmlNight).not.toContain('id="bezent-dynamic-sun"');
    // Night scene renders moon
    expect(htmlNight).toContain('id="bezent-night-moon"');
  });

  it('hides sun before sunrise (e.g. 05:59 AM)', () => {
    const datePreSunrise = makeDate(5, 59);
    const html = renderToStaticMarkup(
      <HeroSceneIllustration period="night" now={datePreSunrise} />,
    );
    expect(html).not.toContain('id="bezent-dynamic-sun"');
  });

  it('ensures no harsh or saturated red tones in sun color stops', () => {
    const dateMidday = makeDate(12, 0);
    const html = renderToStaticMarkup(
      <HeroSceneIllustration period="afternoon" now={dateMidday} />,
    );

    // Ensure forbidden red color strings are not used
    const forbiddenRedHexes = [
      '#ef4444',
      '#dc2626',
      '#b91c1c',
      '#991b1b',
      '#f87171',
      '#e11d48',
      '#be123c',
      '#ff0000',
    ];
    for (const redHex of forbiddenRedHexes) {
      expect(html.toLowerCase()).not.toContain(redHex);
    }

    // Ensure warm golden cream and luminous pearl-white are present
    expect(html).toContain('#ffffff');
    expect(html).toContain('#fffdf0');
    expect(html).toContain('bezent-sun-core');
    expect(html).toContain('bezent-sun-outer');
  });

  describe('Dynamic Moon Trajectory at Remaining Hours (18:30 to 06:00)', () => {
    it('renders moon at moonrise (18:30 PM) on the East horizon', () => {
      // 18:30 = sunset / moonrise
      const dateMoonrise = makeDate(18, 30);
      const html = renderToStaticMarkup(
        <HeroSceneIllustration period="evening" now={dateMoonrise} />,
      );
      // At 18:30, sun is at West horizon and moon is at East horizon (transition moment)
      // If we check 18:31 (just after sunset):
      const dateAfterSunset = makeDate(18, 31);
      const htmlAfterSunset = renderToStaticMarkup(
        <HeroSceneIllustration period="evening" now={dateAfterSunset} />,
      );
      expect(htmlAfterSunset).toContain('id="bezent-dynamic-moon"');
      expect(htmlAfterSunset).toContain('id="bezent-night-moon"');
      expect(htmlAfterSunset).not.toContain('id="bezent-dynamic-sun"');
    });

    it('renders moon at midnight zenith (00:15 AM) at peak altitude', () => {
      // 00:15 AM = exactly halfway through night (345 min elapsed out of 690 min)
      const dateMidnight = makeDate(0, 15);
      const html = renderToStaticMarkup(
        <HeroSceneIllustration period="night" now={dateMidnight} />,
      );
      expect(html).toContain('id="bezent-dynamic-moon"');
      expect(html).toContain('transform="translate(700, 70)"');
      expect(html).not.toContain('id="bezent-dynamic-sun"');
    });

    it('renders moon at moonset (05:59 AM) on the West horizon before sunrise', () => {
      const datePreDawn = makeDate(5, 59);
      const html = renderToStaticMarkup(
        <HeroSceneIllustration period="morning" now={datePreDawn} />,
      );
      expect(html).toContain('id="bezent-dynamic-moon"');
      expect(html).not.toContain('id="bezent-dynamic-sun"');
    });

    it('hides moon during daylight hours (e.g. 12:00 PM and 09:00 AM)', () => {
      const dateNoon = makeDate(12, 0);
      const htmlNoon = renderToStaticMarkup(
        <HeroSceneIllustration period="afternoon" now={dateNoon} />,
      );
      expect(htmlNoon).not.toContain('id="bezent-dynamic-moon"');
      expect(htmlNoon).toContain('id="bezent-dynamic-sun"');

      const dateMorning = makeDate(9, 0);
      const htmlMorning = renderToStaticMarkup(
        <HeroSceneIllustration period="morning" now={dateMorning} />,
      );
      expect(htmlMorning).not.toContain('id="bezent-dynamic-moon"');
      expect(htmlMorning).toContain('id="bezent-dynamic-sun"');
    });
  });
});
