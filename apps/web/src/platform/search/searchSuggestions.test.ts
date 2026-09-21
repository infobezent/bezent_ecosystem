import { describe, expect, it } from 'vitest';
import { DEV_SEARCH_PROVIDER } from '../../app/router/devSearchFixtures';
import type { SearchSuggestion } from './types';

describe('Search suggestions scoping (BZ-04)', () => {
  it('returns module-specific suggestions when they exist for the contextKey', () => {
    const dashboardSuggestions = DEV_SEARCH_PROVIDER.getSuggestions('dashboard');
    expect(dashboardSuggestions.length).toBeGreaterThan(0);
    expect(dashboardSuggestions.every((s) => s.sourceKey === 'dashboard')).toBe(true);

    const orgSuggestions = DEV_SEARCH_PROVIDER.getSuggestions('organization');
    expect(orgSuggestions.length).toBeGreaterThan(0);
    expect(orgSuggestions.every((s) => s.sourceKey === 'organization')).toBe(true);
  });

  it('falls back to cross-module suggestions when the contextKey has no specific matches', () => {
    const onboardingSuggestions = DEV_SEARCH_PROVIDER.getSuggestions('onboarding');
    expect(onboardingSuggestions.length).toBeGreaterThan(0);
    // Should NOT falsely contain onboarding sourceKey since none exist
    expect(onboardingSuggestions.some((s) => s.sourceKey !== 'onboarding')).toBe(true);
  });

  it('correctly distinguishes context-scoped vs cross-module heading conditions', () => {
    function computeSuggestionHeading(
      contextKey?: string,
      contextLabel?: string,
      suggestions: SearchSuggestion[] = [],
    ) {
      const isContextScoped =
        !!contextKey &&
        suggestions.length > 0 &&
        suggestions.every((s) => !s.sourceKey || s.sourceKey === contextKey);

      const heading =
        isContextScoped && contextLabel ? `Suggestions for ${contextLabel}` : 'Recent';

      const hint =
        isContextScoped && contextLabel ? 'Based on current view' : 'Cross-module search';

      return { heading, hint };
    }

    // When on Dashboard with dashboard suggestions
    const dashResult = computeSuggestionHeading(
      'dashboard',
      'Dashboard',
      DEV_SEARCH_PROVIDER.getSuggestions('dashboard'),
    );
    expect(dashResult.heading).toBe('Suggestions for Dashboard');
    expect(dashResult.hint).toBe('Based on current view');

    // When on Onboarding with cross-module fallback suggestions
    const onboardingResult = computeSuggestionHeading(
      'onboarding',
      'Onboarding',
      DEV_SEARCH_PROVIDER.getSuggestions('onboarding'),
    );
    // Crucial BZ-04 rule: never show "Suggestions for Onboarding" for cross-module items
    expect(onboardingResult.heading).toBe('Recent');
    expect(onboardingResult.hint).toBe('Cross-module search');
  });
});
