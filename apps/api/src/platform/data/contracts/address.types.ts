/**
 * BEZENT Common Data Engine - Global Address Contracts
 */

export interface AddressDto {
  readonly countryCode: string;
  readonly addressLine1: string;
  readonly addressLine2?: string | null;
  readonly locality?: string | null;
  readonly city: string;
  readonly district?: string | null;
  readonly region?: string | null;
  readonly regionCode?: string | null;
  readonly postalCode: string;
}

export interface AddressRules {
  readonly countryCode: string;
  readonly postalLabel: string;
  readonly postalRequired: boolean;
  readonly postalExample: string;
  readonly postalPatternDescription: string;
  readonly regionLabel: string;
  readonly regionRequired: boolean;
  readonly cityLabel: string;
  readonly localityLabel: string;
  readonly hasSubdivisions: boolean;
}

export interface PostalLookupParams {
  readonly countryCode: string;
  readonly postalCode: string;
}

export interface PostalLookupMatch {
  readonly locality?: string;
  readonly city?: string;
  readonly district?: string;
  readonly region?: string;
  readonly regionCode?: string;
  readonly countryCode: string;
}

export interface PostalLookupResult {
  readonly supported: boolean;
  readonly provider?: string;
  readonly matches: readonly PostalLookupMatch[];
  readonly error?: string;
}

export interface PostalLookupProvider {
  readonly name: string;
  isSupported(countryCode: string): boolean;
  lookup(params: PostalLookupParams): Promise<PostalLookupResult>;
}
