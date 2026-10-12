import { memo } from 'react';
import { getCountry, getCountryFlagEmoji } from '../../../shared/globalization';
import './CountryFlag.css';

export type CountryFlagSize = 'sm' | 'md' | 'lg';

export interface CountryFlagProps {
  countryCode: string; // ISO 3166-1 alpha-2 (e.g. "IN", "US")
  size?: CountryFlagSize;
  showLabel?: boolean;
  className?: string;
  title?: string;
}

/**
 * Standard BEZENT CountryFlag component.
 * Displays standards-based Unicode flag emoji with accessible semantics.
 */
export const CountryFlag = memo(function CountryFlag({
  countryCode,
  size = 'md',
  showLabel = false,
  className = '',
  title,
}: CountryFlagProps) {
  const country = getCountry(countryCode);
  const codeLower = (country?.code || countryCode || '').toLowerCase();
  const accessibleName = title || (country ? `${country.name} (${country.code})` : countryCode);

  return (
    <span
      className={`bezent-country-flag bezent-country-flag--${size} ${className}`}
      role="img"
      aria-label={accessibleName}
      title={accessibleName}
    >
      {codeLower ? (
        <span className={`fi fi-${codeLower} bezent-country-flag__icon`} aria-hidden="true">
          {country?.flagEmoji || getCountryFlagEmoji(countryCode)}
        </span>
      ) : (
        <span className="bezent-country-flag__emoji" aria-hidden="true">
          🌐
        </span>
      )}
      {showLabel && country && <span className="bezent-country-flag__label">{country.name}</span>}
    </span>
  );
});
