/**
 * BEZENT Common Data Engine - Frontend Types
 */

export interface CountryOption {
  code: string;
  alpha3: string;
  name: string;
  callingCode: string;
  defaultCurrency: string;
  defaultTimezone: string;
  flagEmoji?: string;
}

export interface RegionOption {
  countryCode: string;
  code: string;
  name: string;
  type: string;
}

export interface CurrencyOption {
  code: string;
  name: string;
  symbol: string;
  decimals: number;
}

export interface TimezoneOption {
  id: string;
  label: string;
  offset: string;
  abbreviation: string;
}

export interface LocaleOption {
  code: string;
  name: string;
  nativeName: string;
  languageCode: string;
  countryCode: string;
}

export interface DateFormatOption {
  id: string;
  pattern: string;
  label: string;
  example: string;
}

export interface WeekStartOption {
  id: string;
  dayIndex: number;
  label: string;
}

export interface IndustryOption {
  id: string;
  label: string;
  category?: string;
}

export interface OrganizationTypeOption {
  id: string;
  label: string;
  description?: string;
}

export interface AddressRules {
  countryCode: string;
  postalLabel: string;
  postalRequired: boolean;
  postalExample: string;
  postalPatternDescription: string;
  regionLabel: string;
  regionRequired: boolean;
  cityLabel: string;
  localityLabel: string;
  hasSubdivisions: boolean;
}

export interface PostalLookupMatch {
  locality?: string;
  city?: string;
  district?: string;
  region?: string;
  regionCode?: string;
  countryCode: string;
}

export interface PostalLookupResult {
  supported: boolean;
  provider?: string;
  matches: PostalLookupMatch[];
  error?: string;
}
