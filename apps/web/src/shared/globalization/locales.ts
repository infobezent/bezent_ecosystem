/**
 * BEZENT BCP 47 Locales, Languages & Date Formats
 */

import type { LocaleInfo, LanguageInfo, DateFormatOption } from './types';

export const LOCALES: readonly LocaleInfo[] = [
  { code: 'en-IN', name: 'English (India)', nativeName: 'English (India)', languageCode: 'en', countryCode: 'IN' },
  { code: 'en-US', name: 'English (United States)', nativeName: 'English (US)', languageCode: 'en', countryCode: 'US' },
  { code: 'en-GB', name: 'English (United Kingdom)', nativeName: 'English (UK)', languageCode: 'en', countryCode: 'GB' },
  { code: 'en-AU', name: 'English (Australia)', nativeName: 'English (Australia)', languageCode: 'en', countryCode: 'AU' },
  { code: 'en-CA', name: 'English (Canada)', nativeName: 'English (Canada)', languageCode: 'en', countryCode: 'CA' },
  { code: 'en-SG', name: 'English (Singapore)', nativeName: 'English (Singapore)', languageCode: 'en', countryCode: 'SG' },
  { code: 'en-AE', name: 'English (UAE)', nativeName: 'English (UAE)', languageCode: 'en', countryCode: 'AE' },
  { code: 'de-DE', name: 'German (Germany)', nativeName: 'Deutsch (Deutschland)', languageCode: 'de', countryCode: 'DE' },
  { code: 'fr-FR', name: 'French (France)', nativeName: 'Français (France)', languageCode: 'fr', countryCode: 'FR' },
  { code: 'es-ES', name: 'Spanish (Spain)', nativeName: 'Español (España)', languageCode: 'es', countryCode: 'ES' },
  { code: 'ja-JP', name: 'Japanese (Japan)', nativeName: '日本語 (日本)', languageCode: 'ja', countryCode: 'JP' },
  { code: 'ar-AE', name: 'Arabic (UAE)', nativeName: 'العربية (الإمارات)', languageCode: 'ar', countryCode: 'AE' },
  { code: 'hi-IN', name: 'Hindi (India)', nativeName: 'हिन्दी (भारत)', languageCode: 'hi', countryCode: 'IN' },
  { code: 'nl-NL', name: 'Dutch (Netherlands)', nativeName: 'Nederlands (Nederland)', languageCode: 'nl', countryCode: 'NL' },
  { code: 'pt-BR', name: 'Portuguese (Brazil)', nativeName: 'Português (Brasil)', languageCode: 'pt', countryCode: 'BR' },
];

export const LANGUAGES: readonly LanguageInfo[] = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語' },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
];

export const DATE_FORMAT_OPTIONS: readonly DateFormatOption[] = [
  { id: 'DD/MM/YYYY', pattern: 'DD/MM/YYYY', label: 'DD/MM/YYYY (e.g. 09/10/2026)', example: '09/10/2026' },
  { id: 'MM/DD/YYYY', pattern: 'MM/DD/YYYY', label: 'MM/DD/YYYY (e.g. 10/09/2026)', example: '10/09/2026' },
  { id: 'YYYY-MM-DD', pattern: 'YYYY-MM-DD', label: 'YYYY-MM-DD (ISO standard: 2026-10-09)', example: '2026-10-09' },
  { id: 'DD-MM-YYYY', pattern: 'DD-MM-YYYY', label: 'DD-MM-YYYY (e.g. 09-10-2026)', example: '09-10-2026' },
  { id: 'DD MMM YYYY', pattern: 'DD MMM YYYY', label: 'DD MMM YYYY (e.g. 09 Oct 2026)', example: '09 Oct 2026' },
];

const LOCALE_MAP = new Map<string, LocaleInfo>(
  LOCALES.map((l) => [l.code.toLowerCase(), l]),
);

export function getAllLocales(): readonly LocaleInfo[] {
  return LOCALES;
}

export function getLocale(code?: string | null): LocaleInfo | undefined {
  if (!code) return undefined;
  return LOCALE_MAP.get(code.trim().toLowerCase());
}

export function getAllLanguages(): readonly LanguageInfo[] {
  return LANGUAGES;
}

export function searchLanguages(query: string): LanguageInfo[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...LANGUAGES];
  return LANGUAGES.filter(
    (l) =>
      l.code.toLowerCase().includes(q) ||
      l.name.toLowerCase().includes(q) ||
      l.nativeName.toLowerCase().includes(q),
  );
}

export function isValidLocale(locale?: string | null): boolean {
  if (!locale) return false;
  try {
    return Intl.DateTimeFormat.supportedLocalesOf([locale]).length > 0;
  } catch {
    return false;
  }
}
