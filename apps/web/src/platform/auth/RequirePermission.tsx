import type { ReactNode } from 'react';
import { useAuth } from './AuthProvider';
import { Alert, Page, PageHeader } from '../../design-system/components';

export interface RequirePermissionProps {
  permission?: string;
  any?: readonly string[];
  all?: readonly string[];
  application?: string;
  children: ReactNode;
}

/**
 * Route-level or page-level permission guard (Section 14 RBAC Foundation).
 * Renders an access denied state if the current active company lacks the application
 * entitlement or the user lacks the required permission.
 */
export function RequirePermission({
  permission,
  any,
  all,
  application,
  children,
}: RequirePermissionProps) {
  const { can, canAny, canAll, hasApplicationAccess, status } = useAuth();

  if (status === 'loading') {
    return null;
  }

  const deniedApp = application && !hasApplicationAccess(application);
  const deniedPerm = permission && !can(permission);
  const deniedAny = any && any.length > 0 && !canAny(any);
  const deniedAll = all && all.length > 0 && !canAll(all);

  if (deniedApp || deniedPerm || deniedAny || deniedAll) {
    const detail = deniedApp
      ? `Application '${application}' is not enabled for your company.`
      : `You do not have permission to view or manage this resource.`;

    return (
      <Page>
        <PageHeader title="Access Denied" />
        <Alert variant="error" title="Unauthorized">
          {detail}
        </Alert>
      </Page>
    );
  }

  return <>{children}</>;
}
