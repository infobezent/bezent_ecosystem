import { useNavigate } from 'react-router-dom';
import {
  Badge,
  Button,
  Inline,
  Stack,
  Tabs,
} from '../../../design-system/components';
import { BezentIcon } from '../../../design-system/icons';
import type { TenantAdminCompanySummary } from '../types/tenantAdmin.types';

export interface CompanyWorkspaceHeaderProps {
  company: TenantAdminCompanySummary;
  activeSection: 'overview' | 'organization' | 'access' | 'applications';
  onEditCompany?: () => void;
}

function getCompanyInitials(name?: string | null): string {
  if (!name) return 'CO';
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return 'CO';
  const first = words[0] || '';
  if (words.length === 1) return first.slice(0, 2).toUpperCase();
  const second = words[1] || '';
  return ((first[0] || '') + (second[0] || '')).toUpperCase() || 'CO';
}

/**
 * Canonical Selected-Company Workspace Header.
 *
 * Renders lightweight breadcrumbs, company identity with registered office,
 * contextual "Edit Company" CTA, and the 4 canonical workspace sections:
 * Overview, Organization, Access, and Applications.
 */
export function CompanyWorkspaceHeader({
  company,
  activeSection,
  onEditCompany,
}: CompanyWorkspaceHeaderProps) {
  const navigate = useNavigate();

  const handleTabChange = (id: string) => {
    if (id === 'overview') {
      navigate(`/tenant-admin/tenant/companies/${encodeURIComponent(company.id)}/overview`);
    } else if (id === 'organization') {
      navigate(
        `/tenant-admin/tenant/companies/${encodeURIComponent(company.id)}/organization/structure`,
      );
    } else if (id === 'access') {
      navigate(`/tenant-admin/tenant/companies/${encodeURIComponent(company.id)}/access`);
    } else if (id === 'applications') {
      navigate(`/tenant-admin/tenant/companies/${encodeURIComponent(company.id)}/applications`);
    }
  };

  const isActive = company.status?.toLowerCase() === 'active';

  const locationDisplay =
    [company.city, company.state, company.country].filter(Boolean).join(', ') ||
    company.location ||
    company.country ||
    '';

  return (
    <Stack gap="xs">
      {/* 1. Lightweight Breadcrumb (not inside card) */}
      <nav className="bezent-company-overview-breadcrumb" aria-label="Breadcrumb">
        <button
          type="button"
          className="bezent-company-overview-breadcrumb__link"
          onClick={() => navigate('/tenant-admin/tenant/companies')}
          aria-label="Back to Companies"
        >
          Companies
        </button>
        <span className="bezent-company-overview-breadcrumb__separator" aria-hidden="true">
          &gt;
        </span>
        <span className="bezent-company-overview-breadcrumb__current">
          {company.legalName || company.displayName || company.name}
        </span>
      </nav>

      {/* 2. Company Identity Header */}
      <div className="bezent-company-overview-header">
        <div className="bezent-company-overview-header__left">
          <div className="bezent-company-overview-header__logo">
            {company.logoUrl ? (
              <img
                src={company.logoUrl}
                alt={`${company.name} logo`}
                className="bezent-company-overview-header__logo-img"
              />
            ) : (
              <span>{getCompanyInitials(company.name)}</span>
            )}
          </div>
          <div className="bezent-company-overview-header__info">
            <h1 className="bezent-company-overview-header__title">
              {company.legalName || company.displayName || company.name}
            </h1>
            <div className="bezent-company-overview-header__meta">
              <span>{company.displayName || company.name}</span>
              <span className="bezent-company-overview-header__dot" aria-hidden="true">
                •
              </span>
              <span>{company.code}</span>
              <span className="bezent-company-overview-header__dot" aria-hidden="true">
                •
              </span>
              <Badge variant={isActive ? 'success' : 'neutral'} size="sm">
                {isActive ? 'Active' : (company.status ? company.status.toUpperCase() : 'INACTIVE')}
              </Badge>
            </div>
            {locationDisplay ? (
              <div className="bezent-company-overview-header__location">
                <BezentIcon name="pin" size={13} />
                <span>{locationDisplay}</span>
              </div>
            ) : null}
          </div>
        </div>

        {activeSection === 'overview' && (
          <div className="bezent-company-overview-header__right">
            <Button
              variant="primary"
              size="md"
              onClick={() => onEditCompany?.()}
            >
              <Inline gap="xs" align="center">
                <BezentIcon name="edit" size={14} />
                <span>Edit Company</span>
              </Inline>
            </Button>
          </div>
        )}
      </div>

      {/* 3. Company Workspace Navigation (4 canonical sections) */}
      <div className="bezent-company-overview-tabs">
        <Tabs
          activeId={activeSection}
          onChange={handleTabChange}
          items={[
            { id: 'overview', label: 'Overview' },
            { id: 'organization', label: 'Organization' },
            { id: 'access', label: 'Access' },
            { id: 'applications', label: 'Applications' },
          ]}
        />
      </div>
    </Stack>
  );
}
