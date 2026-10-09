/**
 * BEZENT Common Data Engine - Sequence Provider Foundation
 */

import type { SequenceProvider } from '../contracts/identifier.types.js';

/**
 * In-memory atomic sequence provider.
 * Used for unit tests, isolated simulation, and modular runtime environments.
 * Production persistent sequence provider (backed by MySQL atomic counter table)
 * will implement the same SequenceProvider interface.
 */
export class InMemorySequenceProvider implements SequenceProvider {
  private readonly sequences = new Map<string, number>();

  async nextSequence(scopeKey: string): Promise<number> {
    const current = this.sequences.get(scopeKey) || 0;
    const next = current + 1;
    this.sequences.set(scopeKey, next);
    return next;
  }

  getCurrent(scopeKey: string): number {
    return this.sequences.get(scopeKey) || 0;
  }

  reset(scopeKey?: string): void {
    if (scopeKey) {
      this.sequences.delete(scopeKey);
    } else {
      this.sequences.clear();
    }
  }
}

export const inMemorySequenceProvider = new InMemorySequenceProvider();
