import { useState, useEffect, useCallback } from 'react';
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
  EmptyState,
  Modal,
  FormSection,
  FormGrid,
} from '../../../design-system/components';
import { BezentIcon } from '../../../design-system/icons';
import { essApi, type EssFullProfile } from '../api/essApi';

export function EssProfilePage() {
  const [profile, setProfile] = useState<EssFullProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [changeModalOpen, setChangeModalOpen] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Change request form state
  const [section, setSection] = useState<
    'personal' | 'emergency_contact' | 'bank_account' | 'address'
  >('personal');
  const [subject, setSubject] = useState('');
  const [reason, setReason] = useState('');
  const [changes, setChanges] = useState('');

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await essApi.getProfile();
      setProfile(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleSubmitChangeRequest = async () => {
    setSubmitLoading(true);
    setSubmitError(null);
    try {
      let parsedChanges: Record<string, unknown> = {};
      try {
        parsedChanges = JSON.parse(changes || '{}');
      } catch {
        parsedChanges = { freeText: changes };
      }

      await essApi.submitProfileChangeRequest({
        subject,
        section,
        reason,
        changes: parsedChanges,
      });
      setSubmitSuccess(true);
      setChangeModalOpen(false);
      setSubject('');
      setReason('');
      setChanges('');
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to submit change request');
    } finally {
      setSubmitLoading(false);
    }
  };

  if (loading) return <LoadingState label="Loading your profile..." />;
  if (error)
    return (
      <Alert variant="error" title="Failed to Load Profile">
        {error}
      </Alert>
    );
  if (!profile)
    return (
      <EmptyState
        title="Profile Unavailable"
        description="Your employee profile data could not be retrieved."
      />
    );

  const { employee: emp, personal, bankAccount, skills, emergencyContacts } = profile;
  const pd = personal as Record<string, string> | null;

  return (
    <Page>
      <PageHeader
        title="My Profile"
        subtitle={`${emp.employeeNumber} · ${emp.employmentStatus}`}
        actions={
          <Button
            id="ess-profile-change-request-btn"
            variant="primary"
            leftIcon={<BezentIcon name="edit" size={16} />}
            onClick={() => setChangeModalOpen(true)}
          >
            Request Profile Change
          </Button>
        }
      />

      {submitSuccess && (
        <Alert variant="success" title="Request Submitted">
          Your profile change request has been submitted for HR review.
        </Alert>
      )}

      {/* Employment Details */}
      <Section title="Employment Details">
        <Card>
          <Grid columns={3} gap="md">
            <Stack gap="xs">
              <span>Employee ID</span>
              <strong>{emp.employeeNumber}</strong>
            </Stack>
            <Stack gap="xs">
              <span>Full Name</span>
              <strong>
                {emp.firstName} {emp.lastName ?? ''}
              </strong>
            </Stack>
            <Stack gap="xs">
              <span>Email</span>
              <strong>{emp.email}</strong>
            </Stack>
            <Stack gap="xs">
              <span>Department</span>
              <strong>{emp.departmentName ?? '—'}</strong>
            </Stack>
            <Stack gap="xs">
              <span>Designation</span>
              <strong>{emp.designationTitle ?? '—'}</strong>
            </Stack>
            <Stack gap="xs">
              <span>Location</span>
              <strong>{emp.locationName ?? '—'}</strong>
            </Stack>
            <Stack gap="xs">
              <span>Employment Type</span>
              <strong>{formatLabel(emp.employmentType)}</strong>
            </Stack>
            <Stack gap="xs">
              <span>Status</span>
              <Badge variant={emp.employmentStatus === 'active' ? 'success' : 'warning'}>
                {formatLabel(emp.employmentStatus)}
              </Badge>
            </Stack>
            <Stack gap="xs">
              <span>Joining Date</span>
              <strong>{emp.joiningDate}</strong>
            </Stack>
          </Grid>
        </Card>
      </Section>

      {/* Personal Details */}
      {pd && (
        <Section title="Personal Details">
          <Card>
            <Grid columns={3} gap="md">
              {[
                'dateOfBirth',
                'gender',
                'maritalStatus',
                'bloodGroup',
                'nationality',
                'personalEmail',
                'homePhone',
              ].map((key) =>
                pd[key] ? (
                  <Stack key={key} gap="xs">
                    <span>{camelToLabel(key)}</span>
                    <strong>{String(pd[key])}</strong>
                  </Stack>
                ) : null,
              )}
            </Grid>
          </Card>
        </Section>
      )}

      {/* Emergency Contacts */}
      {emergencyContacts.length > 0 && (
        <Section title="Emergency Contacts">
          <Grid columns={2} gap="md">
            {emergencyContacts.map((ec, idx) => {
              const contact = ec as Record<string, string>;
              return (
                <Card key={idx}>
                  <Stack gap="xs">
                    <Inline gap="sm" align="center">
                      <BezentIcon name="employees" size={16} />
                      <strong>{contact['name'] ?? 'Contact'}</strong>
                      <Badge variant="neutral">{formatLabel(contact['priority'] ?? '')}</Badge>
                    </Inline>
                    <span>
                      {contact['relationship']} · {contact['phone']}
                    </span>
                    {contact['email'] && <span>{contact['email']}</span>}
                  </Stack>
                </Card>
              );
            })}
          </Grid>
        </Section>
      )}

      {/* Bank Account */}
      {bankAccount && (
        <Section title="Salary Bank Account">
          <Card>
            <Grid columns={3} gap="md">
              <Stack gap="xs">
                <span>Bank Name</span>
                <strong>{bankAccount.bankName}</strong>
              </Stack>
              <Stack gap="xs">
                <span>Account Holder</span>
                <strong>{bankAccount.accountHolderName}</strong>
              </Stack>
              <Stack gap="xs">
                <span>Account Number</span>
                <strong>{bankAccount.maskedAccountNumber}</strong>
              </Stack>
              <Stack gap="xs">
                <span>IFSC Code</span>
                <strong>{bankAccount.ifscCode}</strong>
              </Stack>
              {bankAccount.branchName && (
                <Stack gap="xs">
                  <span>Branch</span>
                  <strong>{bankAccount.branchName}</strong>
                </Stack>
              )}
            </Grid>
          </Card>
        </Section>
      )}

      {/* Skills */}
      {skills.length > 0 && (
        <Section title="Skills">
          <Card>
            <Grid columns={3} gap="sm">
              {skills.map((sk, idx) => {
                const skill = sk as Record<string, string>;
                return (
                  <Inline key={idx} gap="sm" align="center">
                    <BezentIcon name="sparkles" size={14} />
                    <Stack gap="xs">
                      <strong>{skill['skillName']}</strong>
                      <Inline gap="xs">
                        <Badge variant="neutral">{skill['proficiency'] ?? ''}</Badge>
                        <Badge variant="neutral">{skill['skillType'] ?? ''}</Badge>
                      </Inline>
                    </Stack>
                  </Inline>
                );
              })}
            </Grid>
          </Card>
        </Section>
      )}

      {/* Profile Change Request Modal */}
      <Modal
        isOpen={changeModalOpen}
        title="Request Profile Change"
        onClose={() => setChangeModalOpen(false)}
        footer={
          <Inline gap="sm">
            <Button
              id="ess-profile-change-cancel"
              variant="secondary"
              onClick={() => setChangeModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              id="ess-profile-change-submit"
              variant="primary"
              onClick={handleSubmitChangeRequest}
              loading={submitLoading}
            >
              Submit Request
            </Button>
          </Inline>
        }
      >
        <Stack gap="md">
          {submitError && (
            <Alert variant="error" title="Error">
              {submitError}
            </Alert>
          )}
          <FormSection title="Change Details">
            <FormGrid columns={1}>
              <label>
                Section to Update
                <select
                  value={section}
                  onChange={(e) => setSection(e.target.value as typeof section)}
                >
                  <option value="personal">Personal Info</option>
                  <option value="emergency_contact">Emergency Contact</option>
                  <option value="bank_account">Bank Account</option>
                  <option value="address">Address</option>
                </select>
              </label>
              <label>
                Subject
                <input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Briefly describe what needs to change"
                />
              </label>
              <label>
                What Changes Are Needed
                <textarea
                  value={changes}
                  onChange={(e) => setChanges(e.target.value)}
                  placeholder="Describe the changes (e.g. new phone number, corrected name spelling)"
                  rows={3}
                />
              </label>
              <label>
                Reason
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Why is this change needed?"
                  rows={2}
                />
              </label>
            </FormGrid>
          </FormSection>
        </Stack>
      </Modal>
    </Page>
  );
}

function formatLabel(s: string): string {
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function camelToLabel(s: string): string {
  return s.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase());
}
