/**
 * BEZENT Common Data Engine - Identifier Formatter & Parser
 */

import type { BusinessIdentifier, IdentifierPolicy } from '../contracts/identifier.types.js';

const DEFAULT_POLICY: IdentifierPolicy = {
  prefix: 'BEZ',
  includeYear: false,
  yearFormat: 'YYYY',
  separator: '-',
  padLength: 6,
  uppercase: true,
};

/**
 * Formats a human-readable business identifier using a policy and sequence number.
 * Example:
 *   formatBusinessIdentifier({ prefix: 'EMP', includeYear: true }, 42, new Date(2026, 0, 1))
 *   => "EMP-2026-000042"
 */
export function formatBusinessIdentifier(
  policy: Partial<IdentifierPolicy> & { prefix: string },
  sequence: number,
  date: Date = new Date(),
): string {
  if (sequence < 1) {
    throw new Error('Sequence number must be a positive integer');
  }

  const merged: IdentifierPolicy = { ...DEFAULT_POLICY, ...policy };
  const parts: string[] = [merged.prefix];

  if (merged.includeYear) {
    const fullYear = date.getFullYear();
    const yearStr =
      merged.yearFormat === 'YY' ? String(fullYear).slice(-2) : String(fullYear);
    parts.push(yearStr);
  }

  const paddedSequence = String(sequence).padStart(merged.padLength || 6, '0');
  parts.push(paddedSequence);

  const formatted = parts.join(merged.separator || '-');
  return merged.uppercase ? formatted.toUpperCase() : formatted;
}

/**
 * Parses a formatted business identifier into its components.
 */
export function parseBusinessIdentifier(
  raw: string,
  policy: Partial<IdentifierPolicy> = {},
): BusinessIdentifier | null {
  if (!raw || typeof raw !== 'string') return null;
  const separator = policy.separator || '-';
  const parts = raw.trim().split(separator);

  if (parts.length < 2) return null;

  const prefix = parts[0];
  if (!prefix) return null;
  let year: number | undefined = undefined;
  const seqStr = parts[parts.length - 1];
  if (!seqStr) return null;

  if (parts.length === 3) {
    const parsedYear = Number(parts[1]);
    if (!Number.isInteger(parsedYear)) return null;
    year = parsedYear;
  }

  const sequence = Number(seqStr);
  if (!Number.isInteger(sequence) || sequence <= 0) return null;

  return {
    raw: raw.trim(),
    prefix,
    year,
    sequence,
  };
}

/**
 * Validates whether an identifier conforms to a policy's structure.
 */
export function validateBusinessIdentifierStructure(
  raw: string,
  policy: Partial<IdentifierPolicy> = {},
): boolean {
  return parseBusinessIdentifier(raw, policy) !== null;
}
