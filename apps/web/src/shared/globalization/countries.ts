/**
 * BEZENT ISO 3166 Country Dataset and Helpers
 */

import type { CountryInfo } from './types';

/**
 * Computes flag emoji from ISO 3166-1 alpha-2 code using Unicode regional indicators.
 */
export function getCountryFlagEmoji(countryCode: string): string {
  if (!countryCode || countryCode.length !== 2) return '🌐';
  const upper = countryCode.toUpperCase();
  const first = upper.charCodeAt(0) - 65 + 0x1f1e6;
  const second = upper.charCodeAt(1) - 65 + 0x1f1e6;
  if (first < 0x1f1e6 || first > 0x1f1ff || second < 0x1f1e6 || second > 0x1f1ff) {
    return '🌐';
  }
  return String.fromCodePoint(first, second);
}

export const COUNTRIES: readonly CountryInfo[] = [
  {
    code: 'IN',
    alpha3: 'IND',
    name: 'India',
    nativeName: 'भारत',
    callingCode: '+91',
    defaultCurrency: 'INR',
    defaultTimezone: 'Asia/Kolkata',
    flagEmoji: '🇮🇳',
  },
  {
    code: 'US',
    alpha3: 'USA',
    name: 'United States',
    nativeName: 'United States',
    callingCode: '+1',
    defaultCurrency: 'USD',
    defaultTimezone: 'America/New_York',
    flagEmoji: '🇺🇸',
  },
  {
    code: 'GB',
    alpha3: 'GBR',
    name: 'United Kingdom',
    nativeName: 'United Kingdom',
    callingCode: '+44',
    defaultCurrency: 'GBP',
    defaultTimezone: 'Europe/London',
    flagEmoji: '🇬🇧',
  },
  {
    code: 'CA',
    alpha3: 'CAN',
    name: 'Canada',
    nativeName: 'Canada',
    callingCode: '+1',
    defaultCurrency: 'CAD',
    defaultTimezone: 'America/Toronto',
    flagEmoji: '🇨🇦',
  },
  {
    code: 'AU',
    alpha3: 'AUS',
    name: 'Australia',
    nativeName: 'Australia',
    callingCode: '+61',
    defaultCurrency: 'AUD',
    defaultTimezone: 'Australia/Sydney',
    flagEmoji: '🇦🇺',
  },
  {
    code: 'SG',
    alpha3: 'SGP',
    name: 'Singapore',
    nativeName: 'Singapore',
    callingCode: '+65',
    defaultCurrency: 'SGD',
    defaultTimezone: 'Asia/Singapore',
    flagEmoji: '🇸🇬',
  },
  {
    code: 'AE',
    alpha3: 'ARE',
    name: 'United Arab Emirates',
    nativeName: 'الإمارات العربية المتحدة',
    callingCode: '+971',
    defaultCurrency: 'AED',
    defaultTimezone: 'Asia/Dubai',
    flagEmoji: '🇦🇪',
  },
  {
    code: 'DE',
    alpha3: 'DEU',
    name: 'Germany',
    nativeName: 'Deutschland',
    callingCode: '+49',
    defaultCurrency: 'EUR',
    defaultTimezone: 'Europe/Berlin',
    flagEmoji: '🇩🇪',
  },
  {
    code: 'FR',
    alpha3: 'FRA',
    name: 'France',
    nativeName: 'France',
    callingCode: '+33',
    defaultCurrency: 'EUR',
    defaultTimezone: 'Europe/Paris',
    flagEmoji: '🇫🇷',
  },
  {
    code: 'JP',
    alpha3: 'JPN',
    name: 'Japan',
    nativeName: '日本',
    callingCode: '+81',
    defaultCurrency: 'JPY',
    defaultTimezone: 'Asia/Tokyo',
    flagEmoji: '🇯🇵',
  },
  {
    code: 'NL',
    alpha3: 'NLD',
    name: 'Netherlands',
    nativeName: 'Nederland',
    callingCode: '+31',
    defaultCurrency: 'EUR',
    defaultTimezone: 'Europe/Amsterdam',
    flagEmoji: '🇳🇱',
  },
  {
    code: 'SA',
    alpha3: 'SAU',
    name: 'Saudi Arabia',
    nativeName: 'المملكة العربية السعودية',
    callingCode: '+966',
    defaultCurrency: 'SAR',
    defaultTimezone: 'Asia/Riyadh',
    flagEmoji: '🇸🇦',
  },
  {
    code: 'IE',
    alpha3: 'IRL',
    name: 'Ireland',
    nativeName: 'Éire',
    callingCode: '+353',
    defaultCurrency: 'EUR',
    defaultTimezone: 'Europe/Dublin',
    flagEmoji: '🇮🇪',
  },
  {
    code: 'NZ',
    alpha3: 'NZL',
    name: 'New Zealand',
    nativeName: 'New Zealand',
    callingCode: '+64',
    defaultCurrency: 'NZD',
    defaultTimezone: 'Pacific/Auckland',
    flagEmoji: '🇳🇿',
  },
  {
    code: 'CH',
    alpha3: 'CHE',
    name: 'Switzerland',
    nativeName: 'Schweiz',
    callingCode: '+41',
    defaultCurrency: 'CHF',
    defaultTimezone: 'Europe/Zurich',
    flagEmoji: '🇨🇭',
  },
  {
    code: 'QA',
    alpha3: 'QAT',
    name: 'Qatar',
    nativeName: 'قطر',
    callingCode: '+974',
    defaultCurrency: 'QAR',
    defaultTimezone: 'Asia/Qatar',
    flagEmoji: '🇶🇦',
  },
  {
    code: 'OM',
    alpha3: 'OMN',
    name: 'Oman',
    nativeName: 'عمان',
    callingCode: '+968',
    defaultCurrency: 'OMR',
    defaultTimezone: 'Asia/Muscat',
    flagEmoji: '🇴🇲',
  },
  {
    code: 'KW',
    alpha3: 'KWT',
    name: 'Kuwait',
    nativeName: 'الكويت',
    callingCode: '+965',
    defaultCurrency: 'KWD',
    defaultTimezone: 'Asia/Kuwait',
    flagEmoji: '🇰🇼',
  },
  {
    code: 'BH',
    alpha3: 'BHR',
    name: 'Bahrain',
    nativeName: 'البحرين',
    callingCode: '+973',
    defaultCurrency: 'BHD',
    defaultTimezone: 'Asia/Bahrain',
    flagEmoji: '🇧🇭',
  },
  {
    code: 'MY',
    alpha3: 'MYS',
    name: 'Malaysia',
    nativeName: 'Malaysia',
    callingCode: '+60',
    defaultCurrency: 'MYR',
    defaultTimezone: 'Asia/Kuala_Lumpur',
    flagEmoji: '🇲🇾',
  },
  {
    code: 'ID',
    alpha3: 'IDN',
    name: 'Indonesia',
    nativeName: 'Indonesia',
    callingCode: '+62',
    defaultCurrency: 'IDR',
    defaultTimezone: 'Asia/Jakarta',
    flagEmoji: '🇮🇩',
  },
  {
    code: 'PH',
    alpha3: 'PHL',
    name: 'Philippines',
    nativeName: 'Pilipinas',
    callingCode: '+63',
    defaultCurrency: 'PHP',
    defaultTimezone: 'Asia/Manila',
    flagEmoji: '🇵🇭',
  },
  {
    code: 'ZA',
    alpha3: 'ZAF',
    name: 'South Africa',
    nativeName: 'South Africa',
    callingCode: '+27',
    defaultCurrency: 'ZAR',
    defaultTimezone: 'Africa/Johannesburg',
    flagEmoji: '🇿🇦',
  },
  {
    code: 'SE',
    alpha3: 'SWE',
    name: 'Sweden',
    nativeName: 'Sverige',
    callingCode: '+46',
    defaultCurrency: 'SEK',
    defaultTimezone: 'Europe/Stockholm',
    flagEmoji: '🇸🇪',
  },
  {
    code: 'NO',
    alpha3: 'NOR',
    name: 'Norway',
    nativeName: 'Norge',
    callingCode: '+47',
    defaultCurrency: 'NOK',
    defaultTimezone: 'Europe/Oslo',
    flagEmoji: '🇳🇴',
  },
  {
    code: 'DK',
    alpha3: 'DNK',
    name: 'Denmark',
    nativeName: 'Danmark',
    callingCode: '+45',
    defaultCurrency: 'DKK',
    defaultTimezone: 'Europe/Copenhagen',
    flagEmoji: '🇩🇰',
  },
  {
    code: 'FI',
    alpha3: 'FIN',
    name: 'Finland',
    nativeName: 'Suomi',
    callingCode: '+358',
    defaultCurrency: 'EUR',
    defaultTimezone: 'Europe/Helsinki',
    flagEmoji: '🇫🇮',
  },
  {
    code: 'ES',
    alpha3: 'ESP',
    name: 'Spain',
    nativeName: 'España',
    callingCode: '+34',
    defaultCurrency: 'EUR',
    defaultTimezone: 'Europe/Madrid',
    flagEmoji: '🇪🇸',
  },
  {
    code: 'IT',
    alpha3: 'ITA',
    name: 'Italy',
    nativeName: 'Italia',
    callingCode: '+39',
    defaultCurrency: 'EUR',
    defaultTimezone: 'Europe/Rome',
    flagEmoji: '🇮🇹',
  },
  {
    code: 'BR',
    alpha3: 'BRA',
    name: 'Brazil',
    nativeName: 'Brasil',
    callingCode: '+55',
    defaultCurrency: 'BRL',
    defaultTimezone: 'America/Sao_Paulo',
    flagEmoji: '🇧🇷',
  },
  {
    code: 'MX',
    alpha3: 'MEX',
    name: 'Mexico',
    nativeName: 'México',
    callingCode: '+52',
    defaultCurrency: 'MXN',
    defaultTimezone: 'America/Mexico_City',
    flagEmoji: '🇲🇽',
  },
];

const COUNTRY_MAP = new Map<string, CountryInfo>(
  COUNTRIES.flatMap((c) => [
    [c.code.toUpperCase(), c],
    [c.alpha3.toUpperCase(), c],
    [c.name.toLowerCase(), c],
  ]),
);

export function getCountry(codeOrName?: string | null): CountryInfo | undefined {
  if (!codeOrName) return undefined;
  const trimmed = codeOrName.trim();
  return COUNTRY_MAP.get(trimmed.toUpperCase()) || COUNTRY_MAP.get(trimmed.toLowerCase());
}

export function getAllCountries(): readonly CountryInfo[] {
  return COUNTRIES;
}

export function searchCountries(query: string): CountryInfo[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...COUNTRIES];
  return COUNTRIES.filter(
    (c) =>
      c.name.toLowerCase().includes(q) ||
      c.code.toLowerCase().includes(q) ||
      c.alpha3.toLowerCase().includes(q) ||
      c.callingCode.includes(q) ||
      (c.nativeName && c.nativeName.toLowerCase().includes(q)),
  );
}
