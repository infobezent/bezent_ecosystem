/**
 * BEZENT Common Data Engine - Global Address Rules
 */

import type { AddressRules } from '../contracts/address.types.js';

const COUNTRY_ADDRESS_RULES: Record<string, AddressRules> = {
  IN: {
    countryCode: 'IN',
    postalLabel: 'PIN Code',
    postalRequired: true,
    postalExample: '560001',
    postalPatternDescription: '6-digit number (e.g. 560001)',
    regionLabel: 'State / Union Territory',
    regionRequired: true,
    cityLabel: 'City / Town',
    localityLabel: 'Area / Locality',
    hasSubdivisions: true,
  },
  US: {
    countryCode: 'US',
    postalLabel: 'ZIP Code',
    postalRequired: true,
    postalExample: '94103',
    postalPatternDescription: '5-digit number or ZIP+4 (e.g. 94103 or 94103-1234)',
    regionLabel: 'State',
    regionRequired: true,
    cityLabel: 'City',
    localityLabel: 'Neighborhood / Suite',
    hasSubdivisions: true,
  },
  GB: {
    countryCode: 'GB',
    postalLabel: 'Postcode',
    postalRequired: true,
    postalExample: 'SW1A 1AA',
    postalPatternDescription: 'Alphanumeric UK postcode (e.g. SW1A 1AA, EC1A 1BB)',
    regionLabel: 'County / Country',
    regionRequired: false,
    cityLabel: 'Post Town / City',
    localityLabel: 'Locality',
    hasSubdivisions: true,
  },
  CA: {
    countryCode: 'CA',
    postalLabel: 'Postal Code',
    postalRequired: true,
    postalExample: 'M5V 2T6',
    postalPatternDescription: '6-character alphanumeric code (e.g. M5V 2T6)',
    regionLabel: 'Province / Territory',
    regionRequired: true,
    cityLabel: 'City',
    localityLabel: 'Municipality',
    hasSubdivisions: true,
  },
  AU: {
    countryCode: 'AU',
    postalLabel: 'Postcode',
    postalRequired: true,
    postalExample: '2000',
    postalPatternDescription: '4-digit number (e.g. 2000, 3000)',
    regionLabel: 'State / Territory',
    regionRequired: true,
    cityLabel: 'Suburb / City',
    localityLabel: 'Locality',
    hasSubdivisions: true,
  },
  DE: {
    countryCode: 'DE',
    postalLabel: 'Postleitzahl (PLZ)',
    postalRequired: true,
    postalExample: '10115',
    postalPatternDescription: '5-digit number (e.g. 10115)',
    regionLabel: 'Bundesland (State)',
    regionRequired: true,
    cityLabel: 'Stadt (City)',
    localityLabel: 'Ortsteil',
    hasSubdivisions: true,
  },
  SG: {
    countryCode: 'SG',
    postalLabel: 'Postal Code',
    postalRequired: true,
    postalExample: '018989',
    postalPatternDescription: '6-digit number (e.g. 018989)',
    regionLabel: 'District / Region',
    regionRequired: false,
    cityLabel: 'Singapore',
    localityLabel: 'Area',
    hasSubdivisions: false,
  },
  AE: {
    countryCode: 'AE',
    postalLabel: 'Postal / PO Box Code',
    postalRequired: false,
    postalExample: '00000',
    postalPatternDescription: 'Optional PO Box code',
    regionLabel: 'Emirate',
    regionRequired: true,
    cityLabel: 'City',
    localityLabel: 'Area / District',
    hasSubdivisions: true,
  },
};

const DEFAULT_ADDRESS_RULES: AddressRules = {
  countryCode: 'GLOBAL',
  postalLabel: 'Postal Code',
  postalRequired: true,
  postalExample: '12345',
  postalPatternDescription: 'Postal code format according to country rules',
  regionLabel: 'State / Province / Region',
  regionRequired: true,
  cityLabel: 'City',
  localityLabel: 'Locality / Area',
  hasSubdivisions: false,
};

/**
 * Returns address labeling and field constraints tailored for the specified country.
 */
export function getAddressRules(countryCode: string | null | undefined): AddressRules {
  if (!countryCode) return DEFAULT_ADDRESS_RULES;
  const upper = countryCode.trim().toUpperCase();
  return COUNTRY_ADDRESS_RULES[upper] || { ...DEFAULT_ADDRESS_RULES, countryCode: upper };
}
