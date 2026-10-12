/**
 * BEZENT Shared Preferences Context
 * Manages company regional preferences and user display preferences.
 */

import {
  createContext,
  useContext,
  useState,
  useMemo,
  useCallback,
  type ReactNode,
} from 'react';
import {
  formatDate as formatBaseDate,
  formatTime as formatBaseTime,
  formatDateTime as formatBaseDateTime,
  formatPolicyTimestamp as formatBasePolicyTime,
  formatCurrencyAmount,
} from '../globalization';

export interface CompanyPreferences {
  country: string; // ISO 3166-1 alpha-2 (e.g. "IN")
  timezone: string; // IANA timezone (e.g. "Asia/Kolkata")
  currency: string; // ISO 4217 code (e.g. "INR")
  locale: string; // BCP 47 (e.g. "en-IN")
  dateFormat: string; // Pattern (e.g. "DD/MM/YYYY")
  weekStartsOn: string; // "monday" | "sunday" | "saturday"
}

export interface UserPreferences {
  preferredLocale: string; // e.g. "en-US"
  preferredDisplayTimezone: string; // e.g. "Asia/Kolkata"
  preferredDateFormat: string; // e.g. "DD/MM/YYYY"
}

export interface PreferencesContextValue {
  companyPreferences: CompanyPreferences;
  userPreferences: UserPreferences;
  setCompanyPreferences: (prefs: Partial<CompanyPreferences>) => void;
  setUserPreferences: (prefs: Partial<UserPreferences>) => void;

  // Convenient bound formatting helpers
  formatDate: (date: Date | string | number, options?: { dateStyle?: 'full' | 'long' | 'medium' | 'short' }) => string;
  formatTime: (date: Date | string | number, options?: { timeStyle?: 'full' | 'long' | 'medium' | 'short' }) => string;
  formatDateTime: (date: Date | string | number) => string;
  formatCurrency: (amount: number, currencyCode?: string) => string;

  /**
   * Strictly evaluates date in company/policy timezone (e.g. for attendance logs).
   * Invariant: Never overrides policy timezone with user browser timezone!
   */
  formatPolicyTimestamp: (
    date: Date | string | number,
    policyTimezone?: string,
  ) => string;
}

const DEFAULT_COMPANY_PREFERENCES: CompanyPreferences = {
  country: 'IN',
  timezone: 'Asia/Kolkata',
  currency: 'INR',
  locale: 'en-IN',
  dateFormat: 'DD/MM/YYYY',
  weekStartsOn: 'monday',
};

function getInitialUserPreferences(): UserPreferences {
  let browserTz = 'Asia/Kolkata';
  let browserLocale = 'en-US';
  try {
    if (typeof Intl !== 'undefined' && Intl.DateTimeFormat) {
      browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata';
    }
    if (typeof navigator !== 'undefined' && navigator.language) {
      browserLocale = navigator.language;
    }
  } catch {
    // Fallbacks
  }

  return {
    preferredLocale: browserLocale,
    preferredDisplayTimezone: browserTz,
    preferredDateFormat: 'DD/MM/YYYY',
  };
}

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

export interface PreferencesProviderProps {
  children: ReactNode;
  initialCompanyPreferences?: Partial<CompanyPreferences>;
  initialUserPreferences?: Partial<UserPreferences>;
}

export function PreferencesProvider({
  children,
  initialCompanyPreferences,
  initialUserPreferences,
}: PreferencesProviderProps) {
  const [companyPreferences, setCompanyPrefsState] = useState<CompanyPreferences>(() => ({
    ...DEFAULT_COMPANY_PREFERENCES,
    ...initialCompanyPreferences,
  }));

  const [userPreferences, setUserPrefsState] = useState<UserPreferences>(() => ({
    ...getInitialUserPreferences(),
    ...initialUserPreferences,
  }));

  const setCompanyPreferences = useCallback((prefs: Partial<CompanyPreferences>) => {
    setCompanyPrefsState((prev) => ({ ...prev, ...prefs }));
  }, []);

  const setUserPreferences = useCallback((prefs: Partial<UserPreferences>) => {
    setUserPrefsState((prev) => ({ ...prev, ...prefs }));
  }, []);

  const formatDate = useCallback(
    (date: Date | string | number, options?: { dateStyle?: 'full' | 'long' | 'medium' | 'short' }) => {
      return formatBaseDate(date, {
        locale: userPreferences.preferredLocale,
        timeZone: userPreferences.preferredDisplayTimezone,
        dateStyle: options?.dateStyle || 'medium',
      });
    },
    [userPreferences.preferredLocale, userPreferences.preferredDisplayTimezone],
  );

  const formatTime = useCallback(
    (date: Date | string | number, options?: { timeStyle?: 'full' | 'long' | 'medium' | 'short' }) => {
      return formatBaseTime(date, {
        locale: userPreferences.preferredLocale,
        timeZone: userPreferences.preferredDisplayTimezone,
        timeStyle: options?.timeStyle || 'short',
      });
    },
    [userPreferences.preferredLocale, userPreferences.preferredDisplayTimezone],
  );

  const formatDateTime = useCallback(
    (date: Date | string | number) => {
      return formatBaseDateTime(date, {
        locale: userPreferences.preferredLocale,
        timeZone: userPreferences.preferredDisplayTimezone,
      });
    },
    [userPreferences.preferredLocale, userPreferences.preferredDisplayTimezone],
  );

  const formatCurrency = useCallback(
    (amount: number, currencyCode?: string) => {
      const code = currencyCode || companyPreferences.currency || 'INR';
      const loc = companyPreferences.locale || 'en-IN';
      return formatCurrencyAmount(amount, code, loc);
    },
    [companyPreferences.currency, companyPreferences.locale],
  );

  const formatPolicyTimestamp = useCallback(
    (date: Date | string | number, policyTimezone?: string) => {
      const tz = policyTimezone || companyPreferences.timezone || 'Asia/Kolkata';
      return formatBasePolicyTime(date, tz);
    },
    [companyPreferences.timezone],
  );

  const value = useMemo<PreferencesContextValue>(
    () => ({
      companyPreferences,
      userPreferences,
      setCompanyPreferences,
      setUserPreferences,
      formatDate,
      formatTime,
      formatDateTime,
      formatCurrency,
      formatPolicyTimestamp,
    }),
    [
      companyPreferences,
      userPreferences,
      setCompanyPreferences,
      setUserPreferences,
      formatDate,
      formatTime,
      formatDateTime,
      formatCurrency,
      formatPolicyTimestamp,
    ],
  );

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences(): PreferencesContextValue {
  const context = useContext(PreferencesContext);
  if (!context) {
    // Fallback safe value if rendered outside provider
    const userPrefs = getInitialUserPreferences();
    return {
      companyPreferences: DEFAULT_COMPANY_PREFERENCES,
      userPreferences: userPrefs,
      setCompanyPreferences: () => {},
      setUserPreferences: () => {},
      formatDate: (d) => formatBaseDate(d, { locale: userPrefs.preferredLocale }),
      formatTime: (d) => formatBaseTime(d, { locale: userPrefs.preferredLocale }),
      formatDateTime: (d) => formatBaseDateTime(d, { locale: userPrefs.preferredLocale }),
      formatCurrency: (amount, code) => formatCurrencyAmount(amount, code || 'INR'),
      formatPolicyTimestamp: (d, tz) => formatBasePolicyTime(d, tz || 'Asia/Kolkata'),
    };
  }
  return context;
}
