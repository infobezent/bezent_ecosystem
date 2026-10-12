/**
 * BEZENT Common Data Engine - Postal Lookup Service
 */

import type {
  PostalLookupParams,
  PostalLookupProvider,
  PostalLookupResult,
} from '../contracts/address.types.js';

export class PostalLookupService {
  private readonly providers: PostalLookupProvider[] = [];

  /**
   * Registers a lookup provider (e.g. enterprise postal database provider).
   */
  registerProvider(provider: PostalLookupProvider): void {
    this.providers.push(provider);
  }

  /**
   * Performs a postal code lookup across registered providers.
   * If no provider supports the given country or no provider is registered,
   * returns a clean { supported: false, matches: [] } result rather than failing or returning fake data.
   */
  async lookup(params: PostalLookupParams): Promise<PostalLookupResult> {
    const { countryCode, postalCode } = params;
    if (!countryCode || !postalCode) {
      return {
        supported: false,
        matches: [],
        error: 'Both countryCode and postalCode are required for lookup',
      };
    }

    const upperCountry = countryCode.trim().toUpperCase();
    const cleanPostal = postalCode.trim();

    // Find supporting provider
    const provider = this.providers.find((p) => p.isSupported(upperCountry));
    if (!provider) {
      return {
        supported: false,
        matches: [],
      };
    }

    try {
      return await provider.lookup({ countryCode: upperCountry, postalCode: cleanPostal });
    } catch (err) {
      return {
        supported: true,
        provider: provider.name,
        matches: [],
        error: err instanceof Error ? err.message : 'Postal lookup failed',
      };
    }
  }

  /**
   * Indicates whether an automated lookup provider is available for the given country.
   */
  isCountrySupported(countryCode: string): boolean {
    if (!countryCode) return false;
    const upper = countryCode.trim().toUpperCase();
    return this.providers.some((p) => p.isSupported(upper));
  }
}

export const postalLookupService = new PostalLookupService();
