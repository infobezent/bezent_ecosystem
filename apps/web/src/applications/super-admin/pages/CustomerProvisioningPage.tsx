import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Page,
  PageHeader,
  Section,
  Card,
  Grid,
  Stack,
  Inline,
  Button,
  Input,
  Select,
  Switch,
  Alert,
  Badge,
  Divider,
} from '../../../design-system/components';
import {
  superAdminApi,
  type CustomerProvisioningPayload,
  type ProvisioningResponse,
} from '../api/superAdminApi';

export function CustomerProvisioningPage() {
  const navigate = useNavigate();

  const [step, setStep] = useState<number>(1);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ProvisioningResponse | null>(null);

  // Form State
  const [tenantName, setTenantName] = useState('');
  const [tenantCode, setTenantCode] = useState('');
  const [tenantEmail, setTenantEmail] = useState('');
  const [tenantPhone, setTenantPhone] = useState('');

  const [companyName, setCompanyName] = useState('');
  const [companyCode, setCompanyCode] = useState('');
  const [legalName, setLegalName] = useState('');
  const [businessEmail, setBusinessEmail] = useState('');
  const [country, setCountry] = useState('US');
  const [timeZone, setTimeZone] = useState('America/New_York');

  const [enableHrms, setEnableHrms] = useState(true);
  const [enableCrm, setEnableCrm] = useState(false);
  const [enablePm, setEnablePm] = useState(false);

  const [adminMode, setAdminMode] = useState<'create' | 'existing'>('create');
  const [adminUserId, setAdminUserId] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminFirstName, setAdminFirstName] = useState('');
  const [adminLastName, setAdminLastName] = useState('');
  const [adminPhone, setAdminPhone] = useState('');

  const [activateImmediately, setActivateImmediately] = useState(true);

  // Validation
  const canProceedStep1 = tenantName.trim().length > 1 && tenantCode.trim().length > 1;
  const canProceedStep2 = companyName.trim().length > 1 && companyCode.trim().length > 1;
  const canProceedStep3 = enableHrms || enableCrm || enablePm;
  const canProceedStep4 =
    adminMode === 'existing'
      ? adminUserId.trim().length > 0
      : adminEmail.trim().length > 4 &&
        adminFirstName.trim().length > 0 &&
        adminLastName.trim().length > 0;

  const handleNext = (e?: FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    if (step === 1 && !canProceedStep1) {
      setError('Please provide valid Tenant Name and Code');
      return;
    }
    if (step === 2 && !canProceedStep2) {
      setError('Please provide valid Company Name and Code');
      return;
    }
    if (step === 3 && !canProceedStep3) {
      setError('At least one application module must be selected');
      return;
    }
    if (step === 4 && !canProceedStep4) {
      setError('Please complete the Administrator configuration');
      return;
    }
    setStep((prev) => Math.min(prev + 1, 5));
  };

  const handleBack = () => {
    setError(null);
    setStep((prev) => Math.max(prev - 1, 1));
  };

  const handleProvision = async () => {
    setSubmitting(true);
    setError(null);

    const modules: Array<'hrms' | 'crm' | 'project_management'> = [];
    if (enableHrms) modules.push('hrms');
    if (enableCrm) modules.push('crm');
    if (enablePm) modules.push('project_management');

    const payload: CustomerProvisioningPayload = {
      tenant: {
        name: tenantName.trim(),
        code: tenantCode.trim().toUpperCase(),
        contactEmail: tenantEmail.trim() || undefined,
        contactPhone: tenantPhone.trim() || undefined,
      },
      company: {
        name: companyName.trim(),
        code: companyCode.trim().toUpperCase(),
        legalName: legalName.trim() || undefined,
        businessEmail: businessEmail.trim() || undefined,
        country: country.trim() || undefined,
        timeZone: timeZone.trim() || undefined,
      },
      modules,
      admin:
        adminMode === 'existing'
          ? { userId: adminUserId.trim() }
          : {
              newUser: {
                email: adminEmail.trim().toLowerCase(),
                firstName: adminFirstName.trim(),
                lastName: adminLastName.trim(),
                phone: adminPhone.trim() || undefined,
              },
            },
      activateImmediately,
    };

    try {
      const response = await superAdminApi.provisionCustomer(payload);
      setResult(response);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Provisioning failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Page>
      <PageHeader
        title="Customer Provisioning"
        subtitle="Guided, atomic multi-tenant customer onboarding workflow"
        actions={
          <Button variant="secondary" onClick={() => navigate('/super-admin/tenants')}>
            Cancel
          </Button>
        }
      />

      {error && (
        <Alert variant="error" title="Provisioning Validation / Execution Error">
          {error}
        </Alert>
      )}

      {/* Result view */}
      {result ? (
        <Stack gap="lg">
          <Alert variant="success" title="Customer Successfully Provisioned!">
            The customer tenant, primary company, module entitlements, and Company Admin were
            atomically created in MySQL.
          </Alert>

          <Card>
            <Section title="Provisioning Summary" subtitle="Created resources and sign-in">
              <Grid columns={2} gap="lg">
                <Stack gap="sm">
                  <strong>Tenant:</strong> {result.tenant.name} (<code>{result.tenant.code}</code>)
                  <br />
                  <strong>Company:</strong> {result.company.name} (
                  <code>{result.company.code}</code>)
                  <br />
                  <strong>Status:</strong>{' '}
                  <Badge status={result.tenant.status}>{result.tenant.status}</Badge>
                </Stack>

                <Stack gap="sm">
                  <strong>Assigned Company Admin:</strong> {result.admin.firstName}{' '}
                  {result.admin.lastName} ({result.admin.email})
                  <br />
                  <strong>Sign-in:</strong> Email one-time code (no password)
                  <br />
                  <span className="bezent-caption">{result.invitationDelivery.message}</span>
                </Stack>
              </Grid>
            </Section>
          </Card>

          <Inline gap="md">
            <Button
              variant="primary"
              onClick={() => navigate(`/super-admin/tenants/${result.tenant.id}`)}
            >
              Open Tenant Profile
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setResult(null);
                setStep(1);
                setTenantName('');
                setTenantCode('');
                setCompanyName('');
                setCompanyCode('');
                setAdminEmail('');
              }}
            >
              Provision Another Customer
            </Button>
          </Inline>
        </Stack>
      ) : (
        /* Multi-step Wizard */
        <Stack gap="lg">
          {/* Progress Indicators */}
          <Card>
            <Inline gap="md" justify="between" align="center">
              <Inline gap="sm">
                <Badge variant={step === 1 ? 'info' : step > 1 ? 'success' : 'neutral'}>
                  1. Tenant Details
                </Badge>
                <span>→</span>
                <Badge variant={step === 2 ? 'info' : step > 2 ? 'success' : 'neutral'}>
                  2. Primary Company
                </Badge>
                <span>→</span>
                <Badge variant={step === 3 ? 'info' : step > 3 ? 'success' : 'neutral'}>
                  3. Modules
                </Badge>
                <span>→</span>
                <Badge variant={step === 4 ? 'info' : step > 4 ? 'success' : 'neutral'}>
                  4. Administrator
                </Badge>
                <span>→</span>
                <Badge variant={step === 5 ? 'info' : 'neutral'}>5. Review & Execute</Badge>
              </Inline>
              <span className="bezent-caption">Step {step} of 5</span>
            </Inline>
          </Card>

          {/* Step 1: Tenant */}
          {step === 1 && (
            <Card>
              <Section
                title="Step 1: Customer Tenant Identity"
                subtitle="Establish customer isolation root and unique identifier"
              >
                <Stack gap="md">
                  <Input
                    label="Customer / Organization Name *"
                    placeholder="e.g. Apex Global Industries"
                    value={tenantName}
                    onChange={(e) => {
                      setTenantName(e.target.value);
                      if (!tenantCode) {
                        setTenantCode(
                          e.target.value
                            .toUpperCase()
                            .replace(/[^A-Z0-9]/g, '-')
                            .slice(0, 16),
                        );
                      }
                      if (!companyName) {
                        setCompanyName(e.target.value);
                      }
                    }}
                    required
                  />

                  <Input
                    label="Tenant Code *"
                    placeholder="e.g. APEX-GLOBAL"
                    value={tenantCode}
                    onChange={(e) => setTenantCode(e.target.value.toUpperCase())}
                    helperText="Unique uppercase tenant domain identifier"
                    required
                  />

                  <Input
                    label="Primary Contact Email"
                    type="email"
                    placeholder="contact@apex.com"
                    value={tenantEmail}
                    onChange={(e) => setTenantEmail(e.target.value)}
                  />

                  <Input
                    label="Primary Contact Phone"
                    placeholder="+1-555-0199"
                    value={tenantPhone}
                    onChange={(e) => setTenantPhone(e.target.value)}
                  />
                </Stack>
              </Section>
            </Card>
          )}

          {/* Step 2: Company */}
          {step === 2 && (
            <Card>
              <Section
                title="Step 2: Primary Company Entity"
                subtitle="Configure the initial legal business entity for this customer"
              >
                <Stack gap="md">
                  <Input
                    label="Company Name *"
                    placeholder="e.g. Apex Global US Inc."
                    value={companyName}
                    onChange={(e) => {
                      setCompanyName(e.target.value);
                      if (!companyCode) {
                        setCompanyCode(
                          e.target.value
                            .toUpperCase()
                            .replace(/[^A-Z0-9]/g, '-')
                            .slice(0, 16),
                        );
                      }
                    }}
                    required
                  />

                  <Input
                    label="Company Code *"
                    placeholder="e.g. APEX-US"
                    value={companyCode}
                    onChange={(e) => setCompanyCode(e.target.value.toUpperCase())}
                    required
                  />

                  <Input
                    label="Legal Entity Name"
                    placeholder="e.g. Apex Global Operations LLC"
                    value={legalName}
                    onChange={(e) => setLegalName(e.target.value)}
                  />

                  <Input
                    label="Business Email"
                    type="email"
                    placeholder="billing@apex.com"
                    value={businessEmail}
                    onChange={(e) => setBusinessEmail(e.target.value)}
                  />

                  <Inline gap="md">
                    <Input
                      label="Country"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                    />
                    <Input
                      label="Time Zone"
                      value={timeZone}
                      onChange={(e) => setTimeZone(e.target.value)}
                    />
                  </Inline>
                </Stack>
              </Section>
            </Card>
          )}

          {/* Step 3: Modules */}
          {step === 3 && (
            <Card>
              <Section
                title="Step 3: Application Module Entitlements"
                subtitle="Select which BEZENT applications to enable for this customer"
              >
                <Stack gap="md">
                  <Card>
                    <Inline justify="between" align="center">
                      <Stack gap="xs">
                        <strong>HRMS (Human Resource Management System)</strong>
                        <span className="bezent-caption">
                          Employee directory, onboarding, organization, attendance, leave and ESS.
                        </span>
                      </Stack>
                      <Switch
                        checked={enableHrms}
                        onChange={(e) => setEnableHrms(e.target.checked)}
                      />
                    </Inline>
                  </Card>

                  <Card>
                    <Inline justify="between" align="center">
                      <Stack gap="xs">
                        <strong>CRM (Customer Relationship Management)</strong>
                        <span className="bezent-caption">
                          Sales pipeline, accounts, contacts and business opportunity tracking.
                        </span>
                      </Stack>
                      <Switch
                        checked={enableCrm}
                        onChange={(e) => setEnableCrm(e.target.checked)}
                      />
                    </Inline>
                  </Card>

                  <Card>
                    <Inline justify="between" align="center">
                      <Stack gap="xs">
                        <strong>Project Management</strong>
                        <span className="bezent-caption">
                          Team projects, task boards, milestones and deliverable tracking.
                        </span>
                      </Stack>
                      <Switch checked={enablePm} onChange={(e) => setEnablePm(e.target.checked)} />
                    </Inline>
                  </Card>
                </Stack>
              </Section>
            </Card>
          )}

          {/* Step 4: Administrator */}
          {step === 4 && (
            <Card>
              <Section
                title="Step 4: Company Administrator Assignment"
                subtitle="Designate or create the primary administrator account for this tenant"
              >
                <Stack gap="md">
                  <Select
                    label="Administrator Assignment Mode"
                    value={adminMode}
                    onChange={(e) => setAdminMode(e.target.value as 'create' | 'existing')}
                    options={[
                      { value: 'create', label: 'Create New Company Administrator' },
                      { value: 'existing', label: 'Assign Existing User by User ID' },
                    ]}
                  />

                  {adminMode === 'existing' ? (
                    <Input
                      label="Existing Platform User ID *"
                      placeholder="e.g. usr_12345678"
                      value={adminUserId}
                      onChange={(e) => setAdminUserId(e.target.value)}
                      required
                    />
                  ) : (
                    <Stack gap="md">
                      <Input
                        label="Admin Email *"
                        type="email"
                        placeholder="admin@customer.com"
                        value={adminEmail}
                        onChange={(e) => setAdminEmail(e.target.value)}
                        required
                      />

                      <Inline gap="md">
                        <Input
                          label="First Name *"
                          placeholder="Sarah"
                          value={adminFirstName}
                          onChange={(e) => setAdminFirstName(e.target.value)}
                          required
                        />
                        <Input
                          label="Last Name *"
                          placeholder="Connor"
                          value={adminLastName}
                          onChange={(e) => setAdminLastName(e.target.value)}
                          required
                        />
                      </Inline>

                      <Input
                        label="Contact Phone"
                        placeholder="+1-555-0188"
                        value={adminPhone}
                        onChange={(e) => setAdminPhone(e.target.value)}
                      />

                      <span className="bezent-caption">
                        No password is created. The administrator is emailed sign-in instructions
                        and signs in with a one-time code sent to this email.
                      </span>
                    </Stack>
                  )}
                </Stack>
              </Section>
            </Card>
          )}

          {/* Step 5: Review & Execute */}
          {step === 5 && (
            <Card>
              <Section
                title="Step 5: Review & Execute Provisioning"
                subtitle="Verify configuration before executing atomic database transaction"
              >
                <Stack gap="md">
                  <Grid columns={2} gap="md">
                    <Stack gap="xs">
                      <span className="bezent-caption">Customer Tenant</span>
                      <strong>{tenantName}</strong> (<code>{tenantCode}</code>)
                    </Stack>
                    <Stack gap="xs">
                      <span className="bezent-caption">Primary Company</span>
                      <strong>{companyName}</strong> (<code>{companyCode}</code>)
                    </Stack>
                    <Stack gap="xs">
                      <span className="bezent-caption">Enabled Modules</span>
                      <Inline gap="xs">
                        {enableHrms && <Badge variant="success">HRMS</Badge>}
                        {enableCrm && <Badge variant="success">CRM</Badge>}
                        {enablePm && <Badge variant="success">Project Management</Badge>}
                      </Inline>
                    </Stack>
                    <Stack gap="xs">
                      <span className="bezent-caption">Administrator</span>
                      {adminMode === 'create' ? (
                        <span>
                          {adminFirstName} {adminLastName} ({adminEmail})
                        </span>
                      ) : (
                        <span>User ID: {adminUserId}</span>
                      )}
                    </Stack>
                  </Grid>

                  <Divider />

                  <Inline justify="between" align="center">
                    <Stack gap="xs">
                      <strong>Activate Customer Immediately</strong>
                      <span className="bezent-caption">
                        If disabled, customer tenant and company will be provisioned in suspended
                        state.
                      </span>
                    </Stack>
                    <Switch
                      checked={activateImmediately}
                      onChange={(e) => setActivateImmediately(e.target.checked)}
                    />
                  </Inline>
                </Stack>
              </Section>
            </Card>
          )}

          {/* Navigation Controls */}
          <Inline justify="between">
            <Button variant="secondary" onClick={handleBack} disabled={step === 1 || submitting}>
              Back
            </Button>

            {step < 5 ? (
              <Button variant="primary" onClick={handleNext}>
                Continue →
              </Button>
            ) : (
              <Button variant="primary" onClick={handleProvision} disabled={submitting}>
                {submitting ? 'Provisioning Customer...' : 'Execute Provisioning'}
              </Button>
            )}
          </Inline>
        </Stack>
      )}
    </Page>
  );
}
