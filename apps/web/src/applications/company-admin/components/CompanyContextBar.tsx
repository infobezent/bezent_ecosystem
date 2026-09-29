import { useCompanyAdmin } from '../context/CompanyAdminContext';
import { Card, Inline, Select, Badge, FormField } from '../../../design-system/components';

interface CompanyContextBarProps {
  onCompanyChange?: (companyId: string) => void;
}

export function CompanyContextBar({ onCompanyChange }: CompanyContextBarProps) {
  const {
    activeCompanyId,
    activeCompany,
    authorizedCompanies,
    switchCompany,
    isLoadingCompanies,
  } = useCompanyAdmin();

  if (isLoadingCompanies || authorizedCompanies.length === 0) {
    return null;
  }

  const handleSelect = (val: string) => {
    switchCompany(val);
    if (onCompanyChange) {
      onCompanyChange(val);
    }
  };

  return (
    <Card variant="flat">
      <Inline justify="between" wrap gap="md">
        <Inline gap="md" align="center">
          <FormField label="Active Company Workspace" htmlFor="company-context-switcher">
            <Select
              id="company-context-switcher"
              value={activeCompanyId || ''}
              onChange={(e) => handleSelect(e.target.value)}
              options={authorizedCompanies.map((c) => ({
                value: c.id,
                label: `${c.name} (${c.code}) — ${c.tenantName}`,
              }))}
            />
          </FormField>
        </Inline>

        {activeCompany && (
          <Inline gap="sm" align="center">
            <Badge
              variant={activeCompany.status === 'active' ? 'success' : 'danger'}
              size="sm"
            >
              {activeCompany.status.toUpperCase()}
            </Badge>
            <Badge variant="neutral" size="sm">
              Role: {activeCompany.role}
            </Badge>
            <Badge variant="info" size="sm">
              Tenant: {activeCompany.tenantName}
            </Badge>
          </Inline>
        )}
      </Inline>
    </Card>
  );
}
