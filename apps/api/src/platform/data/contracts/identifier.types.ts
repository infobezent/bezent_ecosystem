/**
 * BEZENT Common Data Engine - Identifier Contracts
 */

export interface IdentifierPolicy {
  /** Prefix for the identifier, e.g. "CMP", "EMP", "TEN", "PRJ" */
  readonly prefix: string;
  /** Whether to embed the year (e.g. EMP-2026-000001) */
  readonly includeYear?: boolean;
  /** Year format: 4-digit 'YYYY' or 2-digit 'YY' */
  readonly yearFormat?: 'YYYY' | 'YY';
  /** Separator between components, defaults to '-' */
  readonly separator?: string;
  /** Number of digits to pad sequential number to, defaults to 6 */
  readonly padLength?: number;
  /** Whether the resulting identifier must be uppercase, defaults to true */
  readonly uppercase?: boolean;
}

export interface BusinessIdentifier {
  readonly raw: string;
  readonly prefix: string;
  readonly year?: number;
  readonly sequence: number;
}

/**
 * Concurrency-safe sequence generator contract.
 * Concrete persistence implementations (e.g. DB atomic increment) implement this.
 */
export interface SequenceProvider {
  /**
   * Atomically acquires and increments the next sequence number for a given scope and key.
   */
  nextSequence(scopeKey: string): Promise<number>;
}
