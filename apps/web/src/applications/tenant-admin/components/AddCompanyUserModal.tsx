import { useState, useEffect, type FormEvent } from 'react';
import {
  Alert,
  Button,
  FormField,
  FormGrid,
  Inline,
  Input,
  LoadingState,
  Modal,
  Select,
  Stack,
  Tabs,
} from '../../../design-system/components';
import { tenantAdminApi, TenantAdminApiError } from '../api/tenantAdminApi';
import type {
  AvailableTenantUserItem,
  CompanyAccessRole,
} from '../types/tenantAdmin.types';

export interface AddCompanyUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  companyId: string;
  companyName: string;
  onSuccess: (message: string) => void;
}

export function AddCompanyUserModal({
  isOpen,
  onClose,
  companyId,
  companyName,
  onSuccess,
}: AddCompanyUserModalProps) {
  const [activeTab, setActiveTab] = useState<'existing' | 'invite'>('existing');

  // Existing User State
  const [availableUsers, setAvailableUsers] = useState<AvailableTenantUserItem[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [existingRole, setExistingRole] = useState<CompanyAccessRole>('member');
  const [loadingUsers, setLoadingUsers] = useState<boolean>(false);

  // Invite User State
  const [email, setEmail] = useState<string>('');
  const [firstName, setFirstName] = useState<string>('');
  const [lastName, setLastName] = useState<string>('');
  const [inviteRole, setInviteRole] = useState<CompanyAccessRole>('member');

  // Shared Submitting / Error State
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Load available users when modal is opened and on "existing" tab
  useEffect(() => {
    if (!isOpen) {
      setError(null);
      return;
    }

    let cancelled = false;
    async function loadAvailable() {
      try {
        setLoadingUsers(true);
        setError(null);
        const users = await tenantAdminApi.getAvailableTenantUsers(companyId);
        if (!cancelled) {
          setAvailableUsers(users);
          if (users.length > 0) {
            setSelectedUserId(users[0]!.userId);
          } else {
            setSelectedUserId('');
          }
        }
      } catch (err) {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : 'Failed to load available tenant users';
          setError(msg);
        }
      } finally {
        if (!cancelled) {
          setLoadingUsers(false);
        }
      }
    }

    loadAvailable();
    return () => {
      cancelled = true;
    };
  }, [isOpen, companyId]);

  const handleAssignSubmit = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedUserId) {
      setError('Please select a user to assign');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      const res = await tenantAdminApi.assignTenantUserToCompany(companyId, {
        userId: selectedUserId,
        role: existingRole,
      });
      onSuccess(res.message || 'User assigned to company successfully');
      onClose();
    } catch (err) {
      const msg =
        err instanceof TenantAdminApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Failed to assign user to company';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleInviteSubmit = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setError('Email address is required');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      const res = await tenantAdminApi.inviteUserToCompany(companyId, {
        email: cleanEmail,
        firstName: firstName.trim() || undefined,
        lastName: lastName.trim() || undefined,
        role: inviteRole,
      });
      onSuccess(res.message || `Invitation dispatched to ${cleanEmail}`);
      onClose();
    } catch (err) {
      const msg =
        err instanceof TenantAdminApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Failed to invite user';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const userSelectOptions = availableUsers.map((u) => ({
    value: u.userId,
    label: `${u.name} (${u.email})${u.isTenantAdmin ? ' — [Tenant Admin]' : ''}`,
  }));

  const roleOptions = [
    { value: 'member', label: 'Member (Standard company workspace)' },
    { value: 'company_admin', label: 'Company Administrator (Delegated operational admin)' },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add User to Company"
      description={`Grant company access or invite a new user to ${companyName}.`}
      size="md"
      footer={
        <Inline gap="sm" justify="end">
          <Button variant="secondary" onClick={onClose} disabled={submitting} type="button">
            Cancel
          </Button>
          {activeTab === 'existing' ? (
            <Button
              variant="primary"
              onClick={handleAssignSubmit}
              loading={submitting}
              disabled={!selectedUserId || loadingUsers}
              type="button"
            >
              Assign User
            </Button>
          ) : (
            <Button
              variant="primary"
              onClick={handleInviteSubmit}
              loading={submitting}
              disabled={!email.trim()}
              type="button"
            >
              Send Invitation
            </Button>
          )}
        </Inline>
      }
    >
      <Stack gap="md">
        <Tabs
          items={[
            { id: 'existing', label: 'Existing Tenant User' },
            { id: 'invite', label: 'Invite New User' },
          ]}
          activeId={activeTab}
          onChange={(id) => {
            setError(null);
            setActiveTab(id as 'existing' | 'invite');
          }}
        />

        {error && <Alert variant="danger">{error}</Alert>}

        {activeTab === 'existing' ? (
          loadingUsers ? (
            <LoadingState label="Loading available tenant users..." />
          ) : availableUsers.length === 0 ? (
            <Stack gap="sm">
              <Alert variant="info">
                All existing tenant users currently belong to this company, or no other users exist in the organization.
              </Alert>
              <Inline justify="start">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setError(null);
                    setActiveTab('invite');
                  }}
                  type="button"
                >
                  Switch to Invite New User
                </Button>
              </Inline>
            </Stack>
          ) : (
            <form onSubmit={handleAssignSubmit} noValidate>
              <Stack gap="md">
                <FormField label="Select Tenant User" required>
                  <Select
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    options={userSelectOptions}
                    required
                  />
                </FormField>

                <FormField label="Company Role" required>
                  <Select
                    value={existingRole}
                    onChange={(e) => setExistingRole(e.target.value as CompanyAccessRole)}
                    options={roleOptions}
                    required
                  />
                </FormField>

                <Alert variant="info">
                  {existingRole === 'company_admin'
                    ? 'Company Administrators hold delegated operational authority to manage company profile, structure, work locations, and member directory for this company.'
                    : 'Members can access self-service capabilities and company workspaces. Business application permissions are assigned separately.'}
                </Alert>
              </Stack>
            </form>
          )
        ) : (
          <form onSubmit={handleInviteSubmit} noValidate>
            <Stack gap="md">
              <FormField label="Email Address" required>
                <Input
                  type="email"
                  placeholder="colleague@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </FormField>

              <FormGrid columns={2}>
                <FormField label="First Name">
                  <Input
                    placeholder="Jane"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                  />
                </FormField>
                <FormField label="Last Name">
                  <Input
                    placeholder="Doe"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </FormField>
              </FormGrid>

              <FormField label="Company Role" required>
                <Select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as CompanyAccessRole)}
                  options={roleOptions}
                  required
                />
              </FormField>

              <Alert variant="info">
                An invitation email will be dispatched immediately. The recipient will be provided passwordless sign-in directly into this company.
              </Alert>
            </Stack>
          </form>
        )}
      </Stack>
    </Modal>
  );
}
