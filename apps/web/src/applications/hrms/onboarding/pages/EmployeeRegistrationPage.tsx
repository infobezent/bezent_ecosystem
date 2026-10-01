import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { EmployeeRegistration } from '../components/EmployeeRegistration';
import type { EmployeeRegistrationDraft } from '../components/DraftsModal';
import { RegistrationConfigLoader } from '../registration/registrationConfig';
import { createEmployee } from '../../employees/api/employeesApi';
import { fetchOrganizationMasters, type OrganizationMasters } from '../../organization/api/organizationApi';
import { buildCreateEmployeePayload, type RegistrationFormData } from '../types/registration.types';

export function EmployeeRegistrationPage({ onCancel }: { onCancel?: () => void } = {}) {
  const navigate = useNavigate();
  const location = useLocation();
  const initialDraft = (location.state as { draft?: EmployeeRegistrationDraft })?.draft || null;

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

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      navigate('/hrms/administration/onboarding');
    }
  };

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

