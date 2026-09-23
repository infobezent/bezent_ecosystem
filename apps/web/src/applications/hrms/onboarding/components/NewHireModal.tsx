import { useState, type FormEvent, useEffect } from 'react';
import {
  Button,
  Modal,
  Input,
  Select,
  Alert,
  FormGrid,
  Stack,
  Actions,
} from '../../../../design-system/components';
import type {
  OrganizationMasters,
  CreateNewHirePayload,
  EmploymentType,
} from '../api/onboardingApi';

interface NewHireModalProps {
  isOpen: boolean;
  onClose: () => void;
  masters: OrganizationMasters | null;
  onSubmit: (payload: CreateNewHirePayload) => Promise<void>;
}

const EMPLOYMENT_TYPE_OPTIONS = [
  { value: 'full_time', label: 'Full Time' },
  { value: 'part_time', label: 'Part Time' },
  { value: 'contract', label: 'Contract' },
  { value: 'intern', label: 'Intern' },
];

export function NewHireModal({ isOpen, onClose, masters, onSubmit }: NewHireModalProps) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [designationId, setDesignationId] = useState('');
  const [locationId, setLocationId] = useState('');
  const [joiningDate, setJoiningDate] = useState('');
  const [employmentType, setEmploymentType] = useState<EmploymentType>('full_time');

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Set default selections once masters load
  useEffect(() => {
    if (masters) {
      if (masters.departments.length > 0 && !departmentId && masters.departments[0]) {
        setDepartmentId(masters.departments[0].id);
      }
      if (masters.designations.length > 0 && !designationId && masters.designations[0]) {
        setDesignationId(masters.designations[0].id);
      }
      if (masters.locations.length > 0 && !locationId && masters.locations[0]) {
        setLocationId(masters.locations[0].id);
      }
    }
  }, [masters, departmentId, designationId, locationId]);

  if (!isOpen) {
    return null;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!masters?.company) {
      setErrorMessage('Company master data not available');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      await onSubmit({
        firstName,
        lastName: lastName || undefined,
        email,
        phone: phone || undefined,
        companyId: masters.company.id,
        departmentId,
        designationId,
        locationId: locationId || undefined,
        joiningDate,
        employmentType,
      });

      // Reset fields upon success
      setFirstName('');
      setLastName('');
      setEmail('');
      setPhone('');
      setJoiningDate('');
      onClose();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to create new hire');
    } finally {
      setSubmitting(false);
    }
  };

  const departmentOptions = masters?.departments.map((d) => ({ value: d.id, label: d.name })) || [];
  const designationOptions =
    masters?.designations.map((d) => ({ value: d.id, label: d.name })) || [];
  const locationOptions = [
    { value: '', label: 'None / Not Assigned' },
    ...(masters?.locations.map((l) => ({ value: l.id, label: l.name })) || []),
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add New Hire"
      description="Initiate the onboarding process for a new employee."
      size="lg"
      footer={
        <Actions align="end" gap="sm">
          <Button variant="secondary" type="button" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={submitting} form="new-hire-form">
            {submitting ? 'Creating...' : 'Create New Hire'}
          </Button>
        </Actions>
      }
    >
      <form id="new-hire-form" onSubmit={handleSubmit}>
        <Stack gap="lg">
          {errorMessage && <Alert variant="danger">{errorMessage}</Alert>}

          {/* Personal Information */}
          <Stack gap="md">
            <h3 className="bezent-card__title">Personal Details</h3>
            <FormGrid columns={2}>
              <Input
                id="nh-first-name"
                label="First Name *"
                type="text"
                required
                placeholder="e.g. Arun"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
              <Input
                id="nh-last-name"
                label="Last Name"
                type="text"
                placeholder="e.g. Kumar"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </FormGrid>

            <FormGrid columns={2}>
              <Input
                id="nh-email"
                label="Email Address *"
                type="email"
                required
                placeholder="e.g. arun.kumar@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Input
                id="nh-phone"
                label="Phone Number"
                type="tel"
                placeholder="e.g. +91 98765 43210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </FormGrid>
          </Stack>

          {/* Employment Details */}
          <Stack gap="md">
            <h3 className="bezent-card__title">Employment Details</h3>

            <Input
              id="nh-company"
              label="Company *"
              type="text"
              disabled
              value={masters?.company?.name || 'Loading company...'}
            />

            <FormGrid columns={2}>
              <Select
                id="nh-department"
                label="Department *"
                required
                value={departmentId}
                options={departmentOptions}
                onChange={(e) => setDepartmentId(e.target.value)}
              />
              <Select
                id="nh-designation"
                label="Designation *"
                required
                value={designationId}
                options={designationOptions}
                onChange={(e) => setDesignationId(e.target.value)}
              />
            </FormGrid>

            <FormGrid columns={2}>
              <Select
                id="nh-location"
                label="Location"
                value={locationId}
                options={locationOptions}
                onChange={(e) => setLocationId(e.target.value)}
              />
              <Input
                id="nh-joining-date"
                label="Joining Date *"
                type="date"
                required
                value={joiningDate}
                onChange={(e) => setJoiningDate(e.target.value)}
              />
            </FormGrid>

            <Select
              id="nh-emp-type"
              label="Employment Type *"
              value={employmentType}
              options={EMPLOYMENT_TYPE_OPTIONS}
              onChange={(e) => setEmploymentType(e.target.value as EmploymentType)}
            />
          </Stack>
        </Stack>
      </form>
    </Modal>
  );
}

export default NewHireModal;
