/**
 * BEZENT Common Data Engine - Uniqueness Contracts
 */

export type UniquenessScope = 'platform' | 'tenant' | 'company';

export interface UniquenessCheckParams {
  /** Scope at which uniqueness is evaluated */
  readonly scope: UniquenessScope;
  /** Tenant ID required when scope is 'tenant' or 'company' */
  readonly tenantId?: string;
  /** Company ID required when scope is 'company' */
  readonly companyId?: string;
  /** Target entity/table identifier, e.g. 'company', 'employee', 'department' */
  readonly entity: string;
  /** Field name being checked, e.g. 'code', 'email', 'name' */
  readonly field: string;
  /** Value to test */
  readonly value: string;
  /** Optional ID of current record to exclude when checking uniqueness on update */
  readonly excludeId?: string;
}

export interface UniquenessCheckResult {
  readonly isUnique: boolean;
  readonly message?: string;
}

/**
 * Interface for server-authoritative uniqueness checking delegates.
 */
export interface UniquenessChecker {
  checkUnique(params: UniquenessCheckParams): Promise<UniquenessCheckResult>;
}
