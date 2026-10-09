/**
 * BEZENT Common Data Engine - Reference Data Service
 */

import type {
  CountryReference,
  CurrencyReference,
  DateFormatReference,
  IndustryReference,
  LanguageReference,
  LocaleReference,
  OrganizationTypeReference,
  RegionReference,
  TimezoneReference,
  WeekStartDayReference,
} from '../contracts/reference.types.js';
import {
  COUNTRIES,
  CURRENCIES,
  DATE_FORMATS,
  INDUSTRIES,
  LANGUAGES,
  LOCALES,
  ORGANIZATION_TYPES,
  REGIONS_BY_COUNTRY,
  TIMEZONES,
  WEEK_START_DAYS,
} from './datasets.js';

export class ReferenceDataService {
  getCountries(): readonly CountryReference[] {
    return COUNTRIES;
  }

  getCountry(code: string): CountryReference | null {
    if (!code) return null;
    const upper = code.trim().toUpperCase();
    return COUNTRIES.find((c) => c.code === upper || c.alpha3 === upper) || null;
  }

  getRegions(countryCode: string): readonly RegionReference[] {
    if (!countryCode) return [];
    const upper = countryCode.trim().toUpperCase();
    return REGIONS_BY_COUNTRY[upper] || [];
  }

  getCurrencies(): readonly CurrencyReference[] {
    return CURRENCIES;
  }

  getCurrency(code: string): CurrencyReference | null {
    if (!code) return null;
    const upper = code.trim().toUpperCase();
    return CURRENCIES.find((c) => c.code === upper) || null;
  }

  getTimezones(): readonly TimezoneReference[] {
    return TIMEZONES;
  }

  getTimezone(id: string): TimezoneReference | null {
    if (!id) return null;
    const trimmed = id.trim();
    return TIMEZONES.find((tz) => tz.id.toLowerCase() === trimmed.toLowerCase()) || null;
  }

  getLocales(): readonly LocaleReference[] {
    return LOCALES;
  }

  getLocale(code: string): LocaleReference | null {
    if (!code) return null;
    const trimmed = code.trim().toLowerCase();
    return LOCALES.find((l) => l.code.toLowerCase() === trimmed) || null;
  }

  getLanguages(): readonly LanguageReference[] {
    return LANGUAGES;
  }

  getDateFormats(): readonly DateFormatReference[] {
    return DATE_FORMATS;
  }

  getWeekStartDays(): readonly WeekStartDayReference[] {
    return WEEK_START_DAYS;
  }

  getIndustries(): readonly IndustryReference[] {
    return INDUSTRIES;
  }

  getOrganizationTypes(): readonly OrganizationTypeReference[] {
    return ORGANIZATION_TYPES;
  }
}

export const referenceDataService = new ReferenceDataService();
