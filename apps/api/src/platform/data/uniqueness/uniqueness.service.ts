/**
 * BEZENT Common Data Engine - Uniqueness Helpers & Assertions
 */

import { ConflictError } from '../../../app/errors/AppError.js';
import type {
  UniquenessChecker,
  UniquenessCheckParams,
  UniquenessCheckResult,
} from '../contracts/uniqueness.types.js';

/**
 * Builds a canonical uniqueness assertion key for tracing and caching.
 */
export function buildUniquenessKey(params: UniquenessCheckParams): string {
  const parts = [params.scope, params.entity, params.field, params.value.trim().toLowerCase()];
  if (params.tenantId) parts.splice(1, 0, `t:${params.tenantId}`);
  if (params.companyId) parts.splice(2, 0, `c:${params.companyId}`);
  return parts.join(':');
}

/**
 * Enforces uniqueness using a server-authoritative uniqueness checker.
 * Throws a ConflictError if a non-unique condition is detected.
 */
export async function assertUnique(
  checker: UniquenessChecker,
  params: UniquenessCheckParams,
): Promise<void> {
  const result: UniquenessCheckResult = await checker.checkUnique(params);
  if (!result.isUnique) {
    const scopeDesc =
      params.scope === 'tenant'
        ? 'this tenant'
        : params.scope === 'company'
          ? 'this company'
          : 'the platform';
    const message =
      result.message ||
      `${params.entity} with ${params.field} '${params.value}' already exists for ${scopeDesc}`;
    throw new ConflictError(message);
  }
}
