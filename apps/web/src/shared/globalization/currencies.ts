/**
 * BEZENT ISO 4217 Currency Dataset & Formatters
 */

import type { CurrencyInfo } from './types';

export const CURRENCIES: readonly CurrencyInfo[] = [
  { code: 'INR', name: 'Indian Rupee', symbol: '₹', decimals: 2 },
  { code: 'USD', name: 'US Dollar', symbol: '$', decimals: 2 },
  { code: 'EUR', name: 'Euro', symbol: '€', decimals: 2 },
  { code: 'GBP', name: 'British Pound', symbol: '£', decimals: 2 },
  { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ', decimals: 2 },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', decimals: 2 },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', decimals: 2 },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', decimals: 2 },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥', decimals: 0 },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF', decimals: 2 },
  { code: 'SAR', name: 'Saudi Riyal', symbol: '﷼', decimals: 2 },
  { code: 'QAR', name: 'Qatari Riyal', symbol: '﷼', decimals: 2 },
  { code: 'KWD', name: 'Kuwaiti Dinar', symbol: 'د.ك', decimals: 3 },
  { code: 'BHD', name: 'Bahraini Dinar', symbol: '.د.ب', decimals: 3 },
  { code: 'OMR', name: 'Omani Rial', symbol: '﷼', decimals: 3 },
  { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$', decimals: 2 },
  { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM', decimals: 2 },
  { code: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp', decimals: 2 },
  { code: 'PHP', name: 'Philippine Peso', symbol: '₱', decimals: 2 },
  { code: 'ZAR', name: 'South African Rand', symbol: 'R', decimals: 2 },
  { code: 'SEK', name: 'Swedish Krona', symbol: 'kr', decimals: 2 },
  { code: 'NOK', name: 'Norwegian Krone', symbol: 'kr', decimals: 2 },
  { code: 'DKK', name: 'Danish Krone', symbol: 'kr', decimals: 2 },
  { code: 'BRL', name: 'Brazilian Real', symbol: 'R$', decimals: 2 },
  { code: 'MXN', name: 'Mexican Peso', symbol: '$', decimals: 2 },
];

const CURRENCY_MAP = new Map<string, CurrencyInfo>(
  CURRENCIES.map((c) => [c.code.toUpperCase(), c]),
);

export function getAllCurrencies(): readonly CurrencyInfo[] {
  return CURRENCIES;
}

export function getCurrency(code?: string | null): CurrencyInfo | undefined {
  if (!code) return undefined;
  return CURRENCY_MAP.get(code.trim().toUpperCase());
}

export function searchCurrencies(query: string): CurrencyInfo[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...CURRENCIES];
  return CURRENCIES.filter(
    (c) =>
      c.code.toLowerCase().includes(q) ||
      c.name.toLowerCase().includes(q) ||
      c.symbol.toLowerCase().includes(q),
  );
}

/**
 * Formats a monetary amount using native Intl.NumberFormat according to currency and locale.
 */
export function formatCurrencyAmount(
  amount: number,
  currencyCode: string = 'INR',
  locale: string = 'en-IN',
): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currencyCode.toUpperCase(),
      currencyDisplay: 'symbol',
    }).format(amount);
  } catch {
    const curr = getCurrency(currencyCode);
    const sym = curr ? curr.symbol : currencyCode;
    return `${sym} ${amount.toFixed(curr?.decimals ?? 2)}`;
  }
}
