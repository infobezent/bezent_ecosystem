import type { ReactNode } from 'react';
import { useAuth } from './AuthProvider';

export interface CanProps {
  /** Single permission key required (e.g. 'hrms.employees.view') */
  permission?: string;
  /** Passes if ANY of these permissions are held */
  any?: readonly string[];
  /** Passes only if ALL of these permissions are held */
  all?: readonly string[];
  /** Requires the company to have this business application enabled ('hrms', 'crm', 'pm') */
  application?: string;
  /** Fallback content rendered when authorization check fails */
  fallback?: ReactNode;
  children: ReactNode;
}

/**
 * Reusable declarative permission check component (Section 14 RBAC Foundation).
 * Conditionally renders children if the active company and authenticated user hold
 * the required permission(s) and application access.
 */
export function Can({ permission, any, all, application, fallback = null, children }: CanProps) {
  const { can, canAny, canAll, hasApplicationAccess } = useAuth();

  if (application && !hasApplicationAccess(application)) {
    return <>{fallback}</>;
  }

  if (permission && !can(permission)) {
    return <>{fallback}</>;
  }

  if (any && any.length > 0 && !canAny(any)) {
    return <>{fallback}</>;
  }

  if (all && all.length > 0 && !canAll(all)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
