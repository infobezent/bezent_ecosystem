/**
 * BEZENT Common Data Engine - Reference Data Contracts
 */

export interface CountryReference {
  /** ISO 3166-1 alpha-2 code, e.g. "IN", "US", "GB" */
  readonly code: string;
  /** ISO 3166-1 alpha-3 code, e.g. "IND", "USA", "GBR" */
  readonly alpha3: string;
  /** Official common name in English */
  readonly name: string;
  /** International telecommunication calling code prefix, e.g. "+91" */
  readonly callingCode: string;
  /** Primary ISO 4217 currency code, e.g. "INR", "USD" */
  readonly defaultCurrency: string;
  /** Primary representative IANA timezone, e.g. "Asia/Kolkata" */
  readonly defaultTimezone: string;
  /** Emoji flag presentation if available */
  readonly flagEmoji?: string;
}

export interface RegionReference {
  /** Canonical country code, e.g. "IN" */
  readonly countryCode: string;
  /** Subdivision code, e.g. "KA", "CA", "ENG" */
  readonly code: string;
  /** Subdivision name, e.g. "Karnataka", "California" */
  readonly name: string;
  /** Subdivision type, e.g. "State", "Province", "County", "Emirate" */
  readonly type: string;
}

export interface CurrencyReference {
  /** ISO 4217 3-letter currency code, e.g. "INR", "USD", "EUR" */
  readonly code: string;
  /** Currency name, e.g. "Indian Rupee" */
  readonly name: string;
  /** Currency display symbol, e.g. "₹", "$", "€" */
  readonly symbol: string;
  /** Number of minor units / decimals (typically 2, or 0 for JPY) */
  readonly decimals: number;
}

export interface TimezoneReference {
  /** IANA timezone identifier, e.g. "Asia/Kolkata", "America/New_York" */
  readonly id: string;
  /** User-friendly label with UTC offset */
  readonly label: string;
  /** UTC offset string, e.g. "+05:30", "-05:00", "+00:00" */
  readonly offset: string;
  /** Timezone abbreviation, e.g. "IST", "EST", "UTC" */
  readonly abbreviation: string;
}

export interface LocaleReference {
  /** BCP 47 locale code, e.g. "en-IN", "en-US", "en-GB" */
  readonly code: string;
  /** English label, e.g. "English (India)" */
  readonly name: string;
  /** Endonym / native name */
  readonly nativeName: string;
  /** Primary language code */
  readonly languageCode: string;
  /** Associated country code */
  readonly countryCode: string;
}

export interface LanguageReference {
  /** ISO 639-1 two-letter language code, e.g. "en", "es", "fr", "hi" */
  readonly code: string;
  /** English name, e.g. "English" */
  readonly name: string;
  /** Native endonym, e.g. "English" */
  readonly nativeName: string;
}

export interface DateFormatReference {
  readonly id: string;
  readonly pattern: string;
  readonly label: string;
  readonly example: string;
}

export interface WeekStartDayReference {
  readonly id: string;
  readonly dayIndex: number; // 0 for Sunday, 1 for Monday, 6 for Saturday
  readonly label: string;
}

export interface IndustryReference {
  readonly id: string;
  readonly label: string;
  readonly category?: string;
}

export interface OrganizationTypeReference {
  readonly id: string;
  readonly label: string;
  readonly description?: string;
}
