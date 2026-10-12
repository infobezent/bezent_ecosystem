/**
 * BEZENT Common Data Engine - Frontend Reference Data Client
 */

import { appConfig } from '../../../app/config/env';
import { authorizedFetch } from '../../../platform/auth';
import type {
  AddressRules,
  CountryOption,
  CurrencyOption,
  DateFormatOption,
  IndustryOption,
  LocaleOption,
  OrganizationTypeOption,
  PostalLookupResult,
  RegionOption,
  TimezoneOption,
  WeekStartOption,
} from '../types';

const API_BASE = `${appConfig.apiBaseUrl}/platform/reference`;

async function fetchRef<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const res = await authorizedFetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    },
  });

  if (!res.ok) {
    throw new Error(`Reference data request failed for ${endpoint} (${res.status})`);
  }

  const json = (await res.json()) as { data: T };
  return json.data;
}

export const referenceDataApi = {
  async getCountries(): Promise<CountryOption[]> {
    return fetchRef<CountryOption[]>('/countries');
  },

  async getRegions(countryCode: string): Promise<RegionOption[]> {
    if (!countryCode) return [];
    return fetchRef<RegionOption[]>(`/countries/${encodeURIComponent(countryCode)}/regions`);
  },

  async getCurrencies(): Promise<CurrencyOption[]> {
    return fetchRef<CurrencyOption[]>('/currencies');
  },

  async getTimezones(): Promise<TimezoneOption[]> {
    return fetchRef<TimezoneOption[]>('/timezones');
  },

  async getLocales(): Promise<LocaleOption[]> {
    return fetchRef<LocaleOption[]>('/locales');
  },

  async getDateFormats(): Promise<DateFormatOption[]> {
    return fetchRef<DateFormatOption[]>('/date-formats');
  },

  async getWeekStartDays(): Promise<WeekStartOption[]> {
    return fetchRef<WeekStartOption[]>('/week-start-days');
  },

  async getIndustries(): Promise<IndustryOption[]> {
    return fetchRef<IndustryOption[]>('/industries');
  },

  async getOrganizationTypes(): Promise<OrganizationTypeOption[]> {
    return fetchRef<OrganizationTypeOption[]>('/organization-types');
  },

  async getAddressRules(countryCode: string): Promise<AddressRules> {
    return fetchRef<AddressRules>(`/address-rules/${encodeURIComponent(countryCode || 'IN')}`);
  },

  async postalLookup(countryCode: string, postalCode: string): Promise<PostalLookupResult> {
    return fetchRef<PostalLookupResult>('/postal-lookup', {
      method: 'POST',
      body: JSON.stringify({ countryCode, postalCode }),
    });
  },
};
