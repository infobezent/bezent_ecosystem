import { useState, useEffect } from 'react';
import {
  Page,
  PageHeader,
  Section,
  Card,
  Grid,
  Stack,
  Inline,
  Badge,
  Button,
  Alert,
  LoadingState,
  ProgressBar,
} from '../../../design-system/components';
import { BezentIcon } from '../../../design-system/icons';
import { useTenantAdmin } from '../context/TenantAdminContext';
import { tenantAdminApi } from '../api/tenantAdminApi';
import {
  EditTenantProfileDrawer,
  type ProfileGeneralData,
} from '../components/EditTenantProfileDrawer';



interface CanonicalAppDef {
  code: string;
  name: string;
  shortName: string;
  description: string;
  icon: 'organization' | 'apps' | 'settings';
  variant: 'tint-blue' | 'tint-green' | 'tint-amber';
  iconBoxClass: string;
}

const CANONICAL_APPLICATIONS: readonly CanonicalAppDef[] = [
  {
    code: 'hrms',
    name: 'Human Resource Management (HRMS)',
    shortName: 'HRMS',
    description: 'Human Resource Management',
    icon: 'organization',
    variant: 'tint-blue',
    iconBoxClass: 'bezent-entitlement-icon-box--blue',
  },
  {
    code: 'crm',
    name: 'Customer Relationship Management (CRM)',
    shortName: 'CRM',
    description: 'Customer Relationship Management',
    icon: 'apps',
    variant: 'tint-green',
    iconBoxClass: 'bezent-entitlement-icon-box--green',
  },
  {
    code: 'project_management',
    name: 'Project Management',
    shortName: 'PM',
    description: 'Project Management',
    icon: 'settings',
    variant: 'tint-amber',
    iconBoxClass: 'bezent-entitlement-icon-box--amber',
  },
];

function formatDate(val: string | Date | undefined | null): string {
  if (!val) return '—';
  try {
    const d = new Date(val);
    if (Number.isNaN(d.getTime())) return String(val);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return String(val);
  }
}

function getInitials(name?: string | null): string {
  if (!name) return 'TN';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'TN';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

export interface TenantProfilePageProps {
  initialEditMode?: boolean;
}

export function TenantProfilePage({ initialEditMode = false }: TenantProfilePageProps = {}) {
  const handleNavigateToApps = () => {
    if (typeof window !== 'undefined') {
      window.location.href = '/tenant-admin/applications/access';
    }
  };
  const { tenant, capacity, entitlements = [], isLoading, error, refresh } = useTenantAdmin();

  // Canonical member count loaded from backend directory
  const [memberCount, setMemberCount] = useState<number | null>(null);

  // Edit Drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(initialEditMode);

  // Success banner after saving
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Profile state synced with tenant and branding state
  const [profileData, setProfileData] = useState<ProfileGeneralData>({
    name: tenant?.name || 'Acme Technologies Pvt Ltd',
    industry: 'Manufacturing',
    country: 'India',
    state: 'Karnataka',
    city: 'Bengaluru',
    contactName: 'Arjun Kumar',
    contactEmail: tenant?.contactEmail || 'arjun@acme.com',
    contactPhone: tenant?.contactPhone || '+91 98xxxxxx21',
    logoUrl: tenant?.logoUrl ?? null,
    bannerUrl: tenant?.bannerUrl ?? null,
  });

  // Sync profile data when tenant changes
  useEffect(() => {
    if (tenant) {
      setProfileData((prev) => ({
        ...prev,
        name: tenant.name || prev.name,
        contactEmail: tenant.contactEmail || prev.contactEmail,
        contactPhone: tenant.contactPhone || prev.contactPhone,
        logoUrl: tenant.logoUrl !== undefined ? tenant.logoUrl : prev.logoUrl,
        bannerUrl: tenant.bannerUrl !== undefined ? tenant.bannerUrl : prev.bannerUrl,
      }));
    }
  }, [tenant]);

  useEffect(() => {
    let active = true;
    tenantAdminApi
      .listMembers()
      .then((members) => {
        if (active && Array.isArray(members)) {
          setMemberCount(members.length);
        }
      })
      .catch(() => {
        if (active) {
          setMemberCount(null);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  if (isLoading) {
    return <LoadingState label="Loading tenant profile..." fill />;
  }

  // Graceful field fallbacks
  const tenantName = profileData.name || tenant?.name || 'Acme Technologies Pvt Ltd';
  const tenantCode = tenant?.code || 'ACME-IN-01';
  const tenantStatus = tenant?.status || 'active';
  const tenantId = tenant?.id || 'TEN-ACME-001';
  const tenantEmail = profileData.contactEmail || tenant?.contactEmail || 'arjun@acme.com';
  const tenantPhone = profileData.contactPhone || tenant?.contactPhone || '+91 98xxxxxx21';
  const tenantCreated = tenant?.createdAt ? formatDate(tenant.createdAt) : '18 Sep 2026';
  const locationString = profileData.city && profileData.country
    ? `${profileData.city}, ${profileData.country}`
    : 'Bengaluru, India';

  // Capacity calculations
  const capacityUsed = capacity?.used ?? 3;
  const capacityMax = capacity?.max ?? 5;
  const capacityRemaining = capacity?.remaining ?? Math.max(0, capacityMax - capacityUsed);

  const initials = getInitials(tenantName);
  const statusLabel = tenantStatus.toUpperCase();

  const handleSaveSuccess = (updated: ProfileGeneralData) => {
    setProfileData(updated);
    setSuccessMessage('Tenant profile updated successfully.');
    void refresh();
  };

  return (
    <Page>
      {/* 1. PAGE HEADER */}
      <PageHeader
        breadcrumbs={
          <Inline gap="xs" align="center">
            <BezentIcon name="organization" size={14} />
            <span>Tenant</span>
            <span>&gt;</span>
            <strong>Tenant Profile</strong>
          </Inline>
        }
        title="Tenant Profile"
        subtitle="Manage your BEZENT tenant account, subscription and organization setup. (Tenant Details)"
        actions={
          <Inline gap="sm" align="center">
            <Badge variant="info">Platform Governed</Badge>
            <Button
              variant="primary"
              size="md"
              onClick={() => {
                setSuccessMessage(null);
                setIsDrawerOpen(true);
              }}
              aria-label="Edit Profile"
            >
              <Inline gap="xs" align="center">
                <BezentIcon name="edit" size={16} />
                <span>Edit Profile</span>
              </Inline>
            </Button>
          </Inline>
        }
      />

      <Stack gap="xl">
        {successMessage && (
          <Alert variant="success" onDismiss={() => setSuccessMessage(null)}>
            {successMessage}
          </Alert>
        )}

        {error && (
          <Stack gap="sm">
            <Alert variant="error">{error}</Alert>
            <Inline>
              <Button variant="secondary" size="sm" onClick={() => void refresh()}>
                Retry
              </Button>
            </Inline>
          </Stack>
        )}

        {/* 2. TENANT IDENTITY HERO */}
        <Section
          title="Tenant Information"
          subtitle="Official tenant identity, organization profile, and workspace setup."
        >
          <Card variant="hero" padding="none">
            <div className="bezent-profile-hero">
              {/* Banner / Cover */}
              <div className="bezent-profile-banner">
                {profileData.bannerUrl && (
                  <img
                    src={profileData.bannerUrl}
                    alt="Tenant cover"
                  className="bezent-profile-banner__img"
                />
              )}
              <button
                type="button"
                className="bezent-profile-banner__action"
                onClick={() => setIsDrawerOpen(true)}
                aria-label="Change Cover"
              >
                <BezentIcon name="camera" size={16} />
                <span>Change Cover</span>
              </button>
            </div>

            {/* Hero Content Overlay */}
            <div className="bezent-profile-hero__content">
              {/* Left Identity Group */}
              <div className="bezent-profile-hero__identity">
                {/* Logo Box */}
                <div className="bezent-profile-logo-box">
                  {profileData.logoUrl ? (
                    <img
                      src={profileData.logoUrl}
                      alt={`${tenantName} logo`}
                      className="bezent-profile-logo-img"
                    />
                  ) : (
                    <span className="bezent-profile-logo-fallback">{initials}</span>
                  )}
                  <button
                    type="button"
                    className="bezent-profile-logo__badge-btn"
                    onClick={() => setIsDrawerOpen(true)}
                    title="Change Logo"
                    aria-label="Change Logo"
                  >
                    <BezentIcon name="camera" size={14} />
                  </button>
                </div>

                {/* Name & Metadata */}
                <div className="bezent-profile-hero__meta">
                  <div className="bezent-profile-hero__title-row">
                    <h2 className="bezent-profile-hero__title">{tenantName}</h2>
                    <Badge variant={tenantStatus === 'active' ? 'success' : 'neutral'} showDot>
                      {statusLabel}
                    </Badge>
                  </div>
                  <p className="bezent-profile-hero__subtitle">
                    Enterprise Workspace | {profileData.industry || 'Manufacturing'}
                  </p>
                  <div className="bezent-profile-hero__tags">
                    <span className="bezent-profile-hero__tag-item">
                      <BezentIcon name="organization" size={15} />
                      <strong>{tenantCode}</strong>
                      <span className="bezent-profile-hero__tag-label">Tenant Code</span>
                    </span>
                    <span className="bezent-profile-hero__tag-item">
                      <BezentIcon name="pin" size={15} />
                      <code>{tenantId}</code>
                      <span className="bezent-profile-hero__tag-label">Tenant ID</span>
                    </span>
                    <span className="bezent-profile-hero__tag-item">
                      <BezentIcon name="pin" size={15} />
                      <span>{locationString}</span>
                      <span className="bezent-profile-hero__tag-label">Location</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Workspace Setup Card */}
              <div className="bezent-workspace-setup-card">
                <div className="bezent-workspace-setup-card__header">Workspace Setup</div>
                <div className="bezent-workspace-setup-list">
                  <div className="bezent-workspace-setup-item">
                    <span className="bezent-workspace-setup-item__left">
                      <span className="bezent-workspace-setup-item__check">
                        <BezentIcon name="check" size={14} />
                      </span>
                      <span>Tenant Profile</span>
                    </span>
                    <span className="bezent-workspace-setup-item__val">Complete</span>
                  </div>

                  <div className="bezent-workspace-setup-item">
                    <span className="bezent-workspace-setup-item__left">
                      <span className="bezent-workspace-setup-item__check">
                        <BezentIcon name="check" size={14} />
                      </span>
                      <span>Companies</span>
                    </span>
                    <span className="bezent-workspace-setup-item__val">
                      {capacityUsed} configured
                    </span>
                  </div>

                  <div className="bezent-workspace-setup-item">
                    <span className="bezent-workspace-setup-item__left">
                      <span className="bezent-workspace-setup-item__check">
                        <BezentIcon name="check" size={14} />
                      </span>
                      <span>Applications</span>
                    </span>
                    <span className="bezent-workspace-setup-item__val">
                      {entitlements.length > 0 ? `${entitlements.length} available` : '3 available'}
                    </span>
                  </div>

                  <div className="bezent-workspace-setup-item">
                    <span className="bezent-workspace-setup-item__left">
                      <span className="bezent-workspace-setup-item__check">
                        <BezentIcon name="check" size={14} />
                      </span>
                      <span>Access</span>
                    </span>
                    <span className="bezent-workspace-setup-item__val">
                      {memberCount !== null ? `${memberCount} users` : '12 users'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </Section>

        {/* 3. FOUR SUMMARY CARDS */}
        <Grid columns={4} gap="md">
          {/* Card 1: Companies */}
          <Card padding="md">
            <div className="bezent-stat-card">
              <div className="bezent-stat-card__header">
                <span className="bezent-stat-card__title">
                  <BezentIcon name="organization" size={16} />
                  <span>Companies</span>
                </span>
              </div>
              <h3 className="bezent-stat-card__num">
                {capacityUsed} / {capacityMax}
              </h3>
              <ProgressBar value={capacityUsed} max={capacityMax} size="sm" variant="primary" />
              <span className="bezent-stat-card__subtext">
                {capacityUsed} companies used • {capacityRemaining} remaining capacity
              </span>
            </div>
          </Card>

          {/* Card 2: Users */}
          <Card padding="md">
            <div className="bezent-stat-card">
              <div className="bezent-stat-card__header">
                <span className="bezent-stat-card__title">
                  <BezentIcon name="user" size={16} />
                  <span>Users</span>
                </span>
              </div>
              <h3 className="bezent-stat-card__num">
                {memberCount !== null ? memberCount : 128}
              </h3>
              <span className="bezent-stat-card__subtext">
                <BezentIcon name="clock" size={14} />
                <span>Active members</span>
              </span>
            </div>
          </Card>

          {/* Card 3: Applications */}
          <Card padding="md">
            <div className="bezent-stat-card">
              <div className="bezent-stat-card__header">
                <span className="bezent-stat-card__title">
                  <BezentIcon name="apps" size={16} />
                  <span>Applications</span>
                </span>
              </div>
              <h3 className="bezent-stat-card__num">
                {entitlements.length > 0 ? entitlements.length : 3}
              </h3>
              <Inline gap="xs" align="center" wrap>
                <span className="bezent-stat-card__subtext">Enabled</span>
                <Badge variant="info" size="sm">
                  HRMS
                </Badge>
                <Badge variant="success" size="sm">
                  CRM
                </Badge>
                <Badge variant="warning" size="sm">
                  PM
                </Badge>
              </Inline>
            </div>
          </Card>

          {/* Card 4: Since */}
          <Card padding="md">
            <div className="bezent-stat-card">
              <div className="bezent-stat-card__header">
                <span className="bezent-stat-card__title">
                  <BezentIcon name="clock" size={16} />
                  <span>Since</span>
                </span>
              </div>
              <h3 className="bezent-stat-card__num">{tenantCreated}</h3>
              <span className="bezent-stat-card__subtext">Customer since</span>
            </div>
          </Card>
        </Grid>

        {/* 4. MIDDLE SECTION: PRIMARY CONTACT & ACCOUNT INFORMATION */}
        <Grid columns={2} gap="lg">
          {/* Left: Primary Contact */}
          <Card padding="lg">
            <Stack gap="md">
              <Inline gap="sm" align="center">
                <BezentIcon name="user" size={18} />
                <h3>Primary Contact</h3>
              </Inline>

              <Inline gap="md" align="center">
                <div className="bezent-contact-avatar">
                  {getInitials(profileData.contactName || 'Arjun Kumar')}
                </div>
                <Stack gap="xs">
                  <strong className="bezent-contact-name">
                    {profileData.contactName || 'Arjun Kumar'}
                  </strong>
                  <span className="bezent-contact-role">
                    Operations Manager
                  </span>
                </Stack>
              </Inline>

              <div className="bezent-info-list">
                <div className="bezent-info-item">
                  <span className="bezent-info-item__icon">
                    <BezentIcon name="mail" size={16} />
                  </span>
                  <span>{tenantEmail}</span>
                </div>

                <div className="bezent-info-item">
                  <span className="bezent-info-item__icon">
                    <BezentIcon name="phone" size={16} />
                  </span>
                  <span>{tenantPhone}</span>
                </div>

                <div className="bezent-info-item">
                  <span className="bezent-info-item__icon">
                    <BezentIcon name="pin" size={16} />
                  </span>
                  <span>{locationString}</span>
                </div>
              </div>
            </Stack>
          </Card>

          {/* Right: Account Information */}
          <Card padding="lg">
            <Stack gap="md">
              <Inline gap="sm" align="center">
                <BezentIcon name="documents" size={18} />
                <h3>Account Information</h3>
              </Inline>

              <div className="bezent-keyvalue-table">
                <div className="bezent-keyvalue-row">
                  <span className="bezent-keyvalue-key">Tenant Name</span>
                  <span className="bezent-keyvalue-val">{tenantName}</span>
                </div>

                <div className="bezent-keyvalue-row">
                  <span className="bezent-keyvalue-key">Tenant Code (Read-Only)</span>
                  <span className="bezent-keyvalue-val">
                    <strong>{tenantCode}</strong>
                    <span className="bezent-profile-hero__tag-label">Controlled by Super Admin</span>
                  </span>
                </div>

                <div className="bezent-keyvalue-row">
                  <span className="bezent-keyvalue-key">Tenant Status (Read-Only)</span>
                  <span className="bezent-keyvalue-val">
                    <Badge variant={tenantStatus === 'active' ? 'success' : 'neutral'} showDot>
                      {statusLabel}
                    </Badge>
                    <span className="bezent-profile-hero__tag-label">Platform provisioning state</span>
                  </span>
                </div>

                <div className="bezent-keyvalue-row">
                  <span className="bezent-keyvalue-key">Company Capacity (Read-Only)</span>
                  <span className="bezent-keyvalue-val">
                    {capacityUsed} of {capacityMax} used ({capacityRemaining} remaining)
                  </span>
                </div>

                <div className="bezent-keyvalue-row">
                  <span className="bezent-keyvalue-key">Tenant ID</span>
                  <span className="bezent-keyvalue-val">
                    <code>{tenantId}</code>
                  </span>
                </div>

                <div className="bezent-keyvalue-row">
                  <span className="bezent-keyvalue-key">Industry</span>
                  <span className="bezent-keyvalue-val">
                    {profileData.industry || 'Manufacturing'}
                  </span>
                </div>

                <div className="bezent-keyvalue-row">
                  <span className="bezent-keyvalue-key">Account Created</span>
                  <span className="bezent-keyvalue-val">{tenantCreated}</span>
                </div>

                <div className="bezent-keyvalue-row">
                  <span className="bezent-keyvalue-key">Status</span>
                  <span className="bezent-keyvalue-val">
                    <Badge variant={tenantStatus === 'active' ? 'success' : 'neutral'} showDot>
                      {statusLabel}
                    </Badge>
                  </span>
                </div>
              </div>

              <span className="bezent-profile-hero__tag-label">
                Platform Information (Super Admin Governed)
              </span>
            </Stack>
          </Card>
        </Grid>

        {/* 5. APPLICATION ENTITLEMENTS */}
        <Section
          title={
            <Inline gap="sm" align="center">
              <BezentIcon name="apps" size={20} />
              <span>Application Entitlements (Read-Only)</span>
            </Inline>
          }
          subtitle="Applications enabled for this tenant. Access and assignment can be managed from Application Access."
          actions={
            <Button
              variant="secondary"
              size="sm"
              onClick={handleNavigateToApps}
            >
              <Inline gap="xs" align="center">
                <BezentIcon name="openInNew" size={15} />
                <span>Manage Applications</span>
              </Inline>
            </Button>
          }
        >
          <Grid columns={3} gap="md">
            {CANONICAL_APPLICATIONS.map((app, index) => {
              const isEntitled =
                entitlements.length === 0 ? true : entitlements.includes(app.code);
              const companyCountText =
                index === 0
                  ? `${capacityUsed} Companies`
                  : index === 1
                    ? '2 Companies'
                    : '1 Company';

              return (
                <Card
                  key={app.code}
                  variant={app.variant}
                  padding="md"
                  hoverable
                  onClick={handleNavigateToApps}
                >
                  <Stack gap="md">
                    <Inline justify="between" align="start">
                      <div className="bezent-entitlement-box">
                        <div className={`bezent-entitlement-icon-box ${app.iconBoxClass}`}>
                          <BezentIcon name={app.icon} size={22} />
                        </div>
                        <Stack gap="xs">
                          <Inline gap="xs" align="center">
                            <h4>{app.shortName}</h4>
                            {isEntitled ? (
                              <Badge variant="success" size="sm" showDot>
                                Enabled
                              </Badge>
                            ) : (
                              <Badge variant="neutral" size="sm">
                                Not Entitled
                              </Badge>
                            )}
                          </Inline>
                          <span className="bezent-entitlement-desc">
                            {app.name}
                          </span>
                        </Stack>
                      </div>
                      <BezentIcon name="chevronRight" size={18} color="#94a3b8" />
                    </Inline>

                    <Inline justify="between" align="center">
                      <span className="bezent-entitlement-meta">
                        {companyCountText}
                      </span>
                      <span className="bezent-entitlement-status">
                        {isEntitled ? 'Entitled' : 'Not Entitled'}
                      </span>
                    </Inline>
                  </Stack>
                </Card>
              );
            })}
          </Grid>
        </Section>
      </Stack>

      {/* 6. EDIT TENANT PROFILE DRAWER */}
      <EditTenantProfileDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        tenant={tenant}
        capacity={capacity}
        initialData={profileData}
        onSaveSuccess={handleSaveSuccess}
      />
    </Page>
  );
}

export default TenantProfilePage;
