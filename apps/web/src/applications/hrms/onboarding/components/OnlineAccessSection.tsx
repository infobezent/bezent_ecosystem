import { useState } from 'react';
import {
  FormSection,
  FormGrid,
  FormField,
  Input,
  Select,
  Button,
  Badge,
  Card,
  CardDescription,
  Switch,
  Checkbox,
  Stack,
  Inline,
  Grid,
} from '../../../../design-system';

export interface ModulePermission {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
}

const DEFAULT_MODULES: ModulePermission[] = [
  {
    id: 'dashboard',
    name: 'Dashboard',
    description: 'Personal ESS dashboard & quick stats',
    enabled: true,
  },
  {
    id: 'attendance',
    name: 'Attendance',
    description: 'Clock in/out, shift roster & attendance logs',
    enabled: true,
  },
  { id: 'leave', name: 'Leave', description: 'Apply & view leave balances', enabled: true },
  {
    id: 'calendar',
    name: 'Calendar',
    description: 'Company & team events calendar',
    enabled: true,
  },
  { id: 'tasks', name: 'Tasks', description: 'Personal & assigned workspace tasks', enabled: true },
  {
    id: 'meetings',
    name: 'Meetings',
    description: 'Team meeting scheduling & notes',
    enabled: false,
  },
  {
    id: 'projects',
    name: 'Projects',
    description: 'Project management & task tracking',
    enabled: false,
  },
  {
    id: 'performance',
    name: 'Performance',
    description: 'Appraisals & 360 feedback reviews',
    enabled: false,
  },
  {
    id: 'documents',
    name: 'Documents',
    description: 'Employee document repository & vault',
    enabled: true,
  },
];

const INVITATION_STATUS_OPTIONS = [
  { value: 'Not Sent', label: 'Not Sent' },
  { value: 'Pending', label: 'Pending' },
  { value: 'Sent', label: 'Sent' },
  { value: 'Accepted', label: 'Accepted' },
  { value: 'Expired', label: 'Expired' },
];

const ROLE_OPTIONS = [
  { value: 'Employee', label: 'Employee (Standard ESS)' },
  { value: 'Team Lead', label: 'Team Lead' },
  { value: 'Department Manager', label: 'Department Manager' },
  { value: 'HR Admin', label: 'HR Administrator' },
  { value: 'Finance Manager', label: 'Finance Manager' },
  { value: 'System Admin', label: 'System Administrator' },
];

const SCOPE_OPTIONS = [
  { value: 'Employee', label: 'Employee Scope (Self-Service)' },
  { value: 'Team', label: 'Team Scope' },
  { value: 'Department', label: 'Department Scope' },
  { value: 'Organization', label: 'Organization Scope (All Entities)' },
  { value: 'Custom', label: 'Custom Scope Configuration' },
];

export function OnlineAccessSection() {
  // A. ACCOUNT INFORMATION STATE
  const [username, setUsername] = useState('arun.kumar');
  const [companyEmail, setCompanyEmail] = useState('arun.kumar@bezent.com');
  const [invitationStatus, setInvitationStatus] = useState<
    'Not Sent' | 'Pending' | 'Sent' | 'Accepted' | 'Expired'
  >('Not Sent');
  const [invitationSentDate, setInvitationSentDate] = useState<string>('—');

  // B. SECURITY STATE
  const [mfaRequired, setMfaRequired] = useState(true);
  const [forcePasswordSetup, setForcePasswordSetup] = useState(true);
  const [accountActive, setAccountActive] = useState(true);
  const [invitationSuccessMsg, setInvitationSuccessMsg] = useState('');

  // C. ROLE & ACCESS STATE
  const [employeeRole, setEmployeeRole] = useState('Employee');
  const [portalRoleScope, setPortalRoleScope] = useState('Employee');
  const [customScopeText, setCustomScopeText] = useState('');

  // D. MODULE ACCESS STATE
  const [modules, setModules] = useState<ModulePermission[]>(DEFAULT_MODULES);

  // AUTOMATION: Handle Send Welcome Invitation
  const handleSendInvitation = () => {
    const currentDateStr = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    setInvitationStatus('Sent');
    setInvitationSentDate(currentDateStr);
    setInvitationSuccessMsg(`Welcome invitation sent to ${companyEmail} on ${currentDateStr}`);
    setTimeout(() => setInvitationSuccessMsg(''), 6000);
  };

  // AUTOMATION: Role Selection -> Auto-set Module Access Defaults
  const handleRoleChange = (role: string) => {
    setEmployeeRole(role);
    if (role === 'HR Admin' || role === 'System Admin') {
      setPortalRoleScope('Organization');
      setModules((prev) => prev.map((m) => ({ ...m, enabled: true })));
    } else if (role === 'Department Manager' || role === 'Team Lead') {
      setPortalRoleScope('Department');
      setModules((prev) =>
        prev.map((m) => ({
          ...m,
          enabled: [
            'dashboard',
            'attendance',
            'leave',
            'calendar',
            'tasks',
            'meetings',
            'performance',
            'documents',
          ].includes(m.id),
        })),
      );
    } else {
      setPortalRoleScope('Employee');
      setModules((prev) =>
        prev.map((m) => ({
          ...m,
          enabled: ['dashboard', 'attendance', 'leave', 'calendar', 'tasks', 'documents'].includes(
            m.id,
          ),
        })),
      );
    }
  };

  const toggleModule = (id: string) => {
    setModules((prev) => prev.map((m) => (m.id === id ? { ...m, enabled: !m.enabled } : m)));
  };

  const getBadgeVariant = (status: string) => {
    switch (status) {
      case 'Accepted':
        return 'success';
      case 'Sent':
        return 'info';
      case 'Pending':
        return 'warning';
      case 'Expired':
        return 'danger';
      default:
        return 'neutral';
    }
  };

  return (
    <Stack gap="xl">
      {/* A. ACCOUNT INFORMATION */}
      <FormSection
        title="User Account & Credentials"
        description="Single sign-on username, corporate email, and invitation onboarding."
      >
        <FormGrid columns={2} layout="horizontal" labelWidth="md">
          {/* 1. Employee Username */}
          <FormField label="Username" required>
            <Input type="text" value={username} onChange={(e) => setUsername(e.target.value)} />
          </FormField>

          {/* 2. Official Company Email */}
          <FormField label="Company Email" required>
            <Input
              type="email"
              value={companyEmail}
              onChange={(e) => setCompanyEmail(e.target.value)}
            />
          </FormField>

          {/* 3. Invitation Status */}
          <FormField label="Invitation Status">
            <Inline gap="sm" align="center">
              <Badge variant={getBadgeVariant(invitationStatus)}>● {invitationStatus}</Badge>
              <Select
                options={INVITATION_STATUS_OPTIONS}
                value={invitationStatus}
                onChange={(e) =>
                  setInvitationStatus(
                    e.target.value as 'Not Sent' | 'Pending' | 'Sent' | 'Accepted' | 'Expired',
                  )
                }
              />
            </Inline>
          </FormField>

          {/* 4. Invitation Sent Date */}
          <FormField label="Sent Date">
            <Input type="text" value={invitationSentDate} readOnly />
          </FormField>
        </FormGrid>
      </FormSection>

      {/* B. SECURITY */}
      <FormSection
        title="Security & Authentication"
        description="Two-factor authentication requirements and password policies."
      >
        <Stack gap="md">
          <FormGrid columns={2} layout="horizontal" labelWidth="md">
            <FormField label="MFA Policy">
              <Switch
                checked={mfaRequired}
                onChange={(e) => setMfaRequired(e.target.checked)}
                label="Enforce Two-Factor Authentication"
              />
            </FormField>

            <FormField label="Password Setup">
              <Switch
                checked={forcePasswordSetup}
                onChange={(e) => setForcePasswordSetup(e.target.checked)}
                label="Force Password Setup on First Login"
              />
            </FormField>

            <FormField label="Account State">
              <Switch
                checked={accountActive}
                onChange={(e) => setAccountActive(e.target.checked)}
                label="Account Active & Enabled"
              />
            </FormField>

            <FormField label="Invitation">
              <Inline gap="md" align="center">
                <Button type="button" variant="primary" onClick={handleSendInvitation}>
                  ✉️ Send Welcome Invitation
                </Button>
                {invitationSuccessMsg && <Badge variant="success">{invitationSuccessMsg}</Badge>}
              </Inline>
            </FormField>
          </FormGrid>
        </Stack>
      </FormSection>

      {/* C. ROLE & ACCESS */}
      <FormSection
        title="Role & Scope Assignment"
        description="Portal access role and operational data scope."
      >
        <FormGrid columns={2} layout="horizontal" labelWidth="md">
          {/* 1. Employee Role */}
          <FormField label="Employee Role" required>
            <Select
              options={ROLE_OPTIONS}
              value={employeeRole}
              onChange={(e) => handleRoleChange(e.target.value)}
            />
          </FormField>

          {/* 2. Portal Role Scope */}
          <FormField label="Role Scope" required>
            <Stack gap="xs">
              <Select
                options={SCOPE_OPTIONS}
                value={portalRoleScope}
                onChange={(e) => setPortalRoleScope(e.target.value)}
              />
              {portalRoleScope === 'Custom' && (
                <Input
                  type="text"
                  placeholder="Describe custom scope boundaries..."
                  value={customScopeText}
                  onChange={(e) => setCustomScopeText(e.target.value)}
                />
              )}
            </Stack>
          </FormField>
        </FormGrid>
      </FormSection>

      {/* D. MODULE ACCESS */}
      <FormSection
        title="Module Access Permissions"
        description="Module permissions auto-configured based on selected role. Toggle individual items to customize access."
      >
        <Grid columns={3} gap="md">
          {modules.map((m) => (
            <Card key={m.id} variant="flat">
              <Stack gap="xs">
                <Checkbox checked={m.enabled} onChange={() => toggleModule(m.id)} label={m.name} />
                <CardDescription>{m.description}</CardDescription>
              </Stack>
            </Card>
          ))}
        </Grid>
      </FormSection>
    </Stack>
  );
}
