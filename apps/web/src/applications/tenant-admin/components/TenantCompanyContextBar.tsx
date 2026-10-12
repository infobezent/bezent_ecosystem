import { useNavigate } from 'react-router-dom';
import { useTenantAdmin } from '../context/TenantAdminContext';
import { Card, Inline, Select, Badge, FormField } from '../../../design-system/components';

interface TenantCompanyContextBarProps {
  currentCompanyId?: string;
  onCompanyChange?: (companyId: string) => void;
  baseNavigatePath?: string;
}

export function TenantCompanyContextBar({
  currentCompanyId,
  onCompanyChange,
  baseNavigatePath,
}: TenantCompanyContextBarProps) {
  const navigate = useNavigate();
  const { companies, selectedCompanyId, selectCompany, isSingleCompany, isLoading } =
    useTenantAdmin();

  if (isLoading || companies.length === 0) {
    return null;
  }

  const effectiveCompanyId = currentCompanyId || selectedCompanyId || companies[0]?.id || '';
  const currentCompany = companies.find((c) => c.id === effectiveCompanyId) || null;

  const handleSelect = (companyId: string) => {
    selectCompany(companyId);
    if (onCompanyChange) {
      onCompanyChange(companyId);
    }
    if (baseNavigatePath) {
      navigate(`${baseNavigatePath}/${encodeURIComponent(companyId)}`);
    }
  };

  return (
    <Card variant="flat">
      <Inline justify="between" wrap gap="md">
        <Inline gap="md" align="center">
          {isSingleCompany ? (
            <Inline gap="sm" align="center">
              <strong>Company:</strong>
              <span>
                {companies[0]?.name} ({companies[0]?.code})
              </span>
            </Inline>
          ) : (
            <FormField label="Managed Company Context" htmlFor="tenant-company-context-switcher">
              <Select
                id="tenant-company-context-switcher"
                value={effectiveCompanyId}
                onChange={(e) => handleSelect(e.target.value)}
                options={companies.map((c) => ({
                  value: c.id,
                  label: `${c.name} (${c.code})`,
                }))}
              />
            </FormField>
          )}
        </Inline>

        {currentCompany && (
          <Inline gap="sm" align="center">
            <Badge variant={currentCompany.status === 'active' ? 'success' : 'danger'} size="sm">
              {currentCompany.status.toUpperCase()}
            </Badge>
            {currentCompany.country && (
              <Badge variant="neutral" size="sm">
                {currentCompany.country}
              </Badge>
            )}
            {currentCompany.timeZone && (
              <Badge variant="neutral" size="sm">
                {currentCompany.timeZone}
              </Badge>
            )}
          </Inline>
        )}
      </Inline>
    </Card>
  );
}
