import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useLocation, useParams, Navigate } from 'react-router-dom';
import { EmployeeRegistration } from '../components/EmployeeRegistration';
import type { EmployeeRegistrationDraft } from '../components/DraftsModal';
import type { ReviewSectionData } from '../components/ReviewSection';
import { RegistrationConfigLoader } from '../registration/registrationConfig';
import { createEmployee } from '../../employees/api/employeesApi';
import {
  fetchOrganizationMasters,
  type OrganizationMasters,
} from '../../api/organizationMastersApi';
import { buildCreateEmployeePayload, type RegistrationFormData } from '../types/registration.types';
import { useOptionalAuth } from '../../../../platform/auth';
import { landingPath } from '../../../../platform/auth/landing';
import { LoadingState } from '../../../../design-system/components';

export function EmployeeRegistrationPage({ onCancel }: { onCancel?: () => void } = {}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { caseId } = useParams<{ caseId?: string }>();
  const auth = useOptionalAuth();

  const state = location.state as {
    draft?: EmployeeRegistrationDraft;
    caseId?: string;
    newHire?: { id: string; candidateName?: string; employeeName?: string };
  } | null;

  const directDraft = state?.draft || null;
  const candidateName = state?.newHire?.candidateName || state?.newHire?.employeeName;
  const effectiveCaseId = caseId || state?.caseId;

  const initialDraft: EmployeeRegistrationDraft | null = useMemo(() => {
    if (directDraft) return directDraft;
    if (effectiveCaseId || candidateName) {
      return {
        id: effectiveCaseId || 'case-draft',
        employeeId: effectiveCaseId ? `CASE-${effectiveCaseId.slice(-6).toUpperCase()}` : '',
        employeeName: candidateName || 'New Hire Case',
        activeSection: 'general',
        completedSectionsCount: 0,
        pendingSectionLabels: [],
        lastUpdated: new Date().toISOString(),
        reviewData: {
          personal: {},
          general: {},
          onboarding: {},
          skills: [],
          emergency: [],
          accounts: {},
          onlineAccess: {},
          workingHours: {},
          documents: [],
          documentsList: [],
          isExperiencedHire: false,
          passportPhoto: { fileName: '', filePreviewUrl: '' },
        } as unknown as ReviewSectionData,
      };
    }
    return null;
  }, [directDraft, effectiveCaseId, candidateName]);

  const [masters, setMasters] = useState<OrganizationMasters | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [createdEmployee, setCreatedEmployee] = useState<{
    id: string;
    employeeNumber?: string | null;
    name?: string;
  } | null>(null);

  useEffect(() => {
    let isMounted = true;
    fetchOrganizationMasters()
      .then((data) => {
        if (isMounted) setMasters(data);
      })
      .catch((err) => {
        // Masters are optional for code-to-ID mapping fallback
        console.warn('Could not load organization masters for employee registration:', err);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleCancel = useCallback(() => {
    if (onCancel) {
      onCancel();
    } else {
      navigate('/hrms/workforce/onboarding');
    }
  }, [onCancel, navigate]);

  const handleSubmit = useCallback(
    async (formData: RegistrationFormData) => {
      if (isSubmitting) return;

      setIsSubmitting(true);
      setSubmitError(null);

      try {
        const payload = buildCreateEmployeePayload(formData, masters ?? undefined);
        const record = await createEmployee(payload);
        const fullName = `${record.firstName} ${record.lastName ?? ''}`.trim();
        setCreatedEmployee({
          id: record.id,
          employeeNumber: record.employeeNumber ?? null,
          name: fullName || 'New Employee',
        });

        // Clean up draft from local storage if this registration was based on one
        if (initialDraft?.id) {
          try {
            const rawDrafts = localStorage.getItem('bezent_hrms_registration_drafts');
            if (rawDrafts) {
              const parsed: EmployeeRegistrationDraft[] = JSON.parse(rawDrafts);
              const remaining = parsed.filter((d) => d.id !== initialDraft.id);
              localStorage.setItem('bezent_hrms_registration_drafts', JSON.stringify(remaining));
            }
          } catch {
            // Non-critical local storage cleanup failure
          }
        }
      } catch (err: unknown) {
        const message =
          err instanceof Error
            ? err.message
            : 'Failed to create employee profile. Please review entered fields and try again.';
        setSubmitError(message);
        setCreatedEmployee(null);
      } finally {
        setIsSubmitting(false);
      }
    },
    [isSubmitting, masters, initialDraft?.id],
  );

  // RBAC workspace guard: If an active authenticated session exists, ensure the user has HRMS access.
  if (auth?.status === 'loading') {
    return <LoadingState label="Verifying access…" fill />;
  }
  if (auth?.status === 'authenticated' && auth.activeCompany) {
    const hasHrmsWorkspace = auth.activeCompany.workspaces.includes('hrms');
    if (!hasHrmsWorkspace && auth.access) {
      return <Navigate to={landingPath(auth.access)} replace />;
    }
  }

  // The form renders only once the company's resolved Registration configuration is loaded.
  return (
    <RegistrationConfigLoader>
      <EmployeeRegistration
        onCancel={handleCancel}
        initialDraft={initialDraft}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        submitError={submitError}
        createdEmployee={createdEmployee}
      />
    </RegistrationConfigLoader>
  );
}

export default EmployeeRegistrationPage;
