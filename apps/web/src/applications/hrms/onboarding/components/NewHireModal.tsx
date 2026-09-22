import { useState, type FormEvent, useEffect } from 'react';
import { Button } from '../../../../design-system/components/Button';
import { Modal } from '../../../../design-system/components/Modal';
import { Input } from '../../../../design-system/components/Input';
import { Select } from '../../../../design-system/components/Select';
import { Alert } from '../../../../design-system/components/Alert';
import type {
  OrganizationMasters,
  CreateNewHirePayload,
  EmploymentType,
} from '../api/onboardingApi';
import './NewHireModal.css';

interface NewHireModalProps {
  isOpen: boolean;
  onClose: () => void;
  masters: OrganizationMasters | null;
  onSubmit: (payload: CreateNewHirePayload) => Promise<void>;
}

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

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add New Hire"
      description="Initiate the onboarding process for a new employee."
      size="lg"
      footer={
        <>
          <Button variant="secondary" type="button" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" form="new-hire-form" loading={submitting}>
            Create New Hire
          </Button>
        </>
      }
    >
      <form id="new-hire-form" onSubmit={handleSubmit} className="new-hire-form">
        {errorMessage && (
          <Alert variant="danger" dismissible onDismiss={() => setErrorMessage(null)}>
            {errorMessage}
          </Alert>
        )}

        {/* Personal Details */}
        <div className="new-hire-modal__section">
          <h3 className="new-hire-modal__section-title">Personal Details</h3>
          <div className="new-hire-modal__row">
            <Input
              id="nh-first-name"
              label="First Name *"
              required
              placeholder="e.g. Arun"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
            <Input
              id="nh-last-name"
              label="Last Name"
              placeholder="e.g. Kumar"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </div>

          <div className="new-hire-modal__row">
            <Input
              id="nh-email"
              type="email"
              label="Email Address *"
              required
              placeholder="e.g. arun.kumar@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Input
              id="nh-phone"
              type="tel"
              label="Phone Number"
              placeholder="e.g. +91 98765 43210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
        </div>

        {/* Employment Details */}
        <div className="new-hire-modal__section">
          <h3 className="new-hire-modal__section-title">Employment Details</h3>

          <Input
            id="nh-company"
            label="Company *"
            disabled
            value={masters?.company?.name || 'Loading company...'}
          />

          <div className="new-hire-modal__row">
            <Select
              id="nh-department"
              label="Department *"
              required
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
            >
              {masters?.departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </Select>

            <Select
              id="nh-designation"
              label="Designation *"
              required
              value={designationId}
              onChange={(e) => setDesignationId(e.target.value)}
            >
              {masters?.designations.map((desig) => (
                <option key={desig.id} value={desig.id}>
                  {desig.name}
                </option>
              ))}
            </Select>
          </div>

          <div className="new-hire-modal__row">
            <Select
              id="nh-location"
              label="Location"
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
            >
              <option value="">None / Not Assigned</option>
              {masters?.locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name}
                </option>
              ))}
            </Select>

            <Input
              id="nh-joining-date"
              type="date"
              label="Joining Date *"
              required
              value={joiningDate}
              onChange={(e) => setJoiningDate(e.target.value)}
            />
          </div>

          <Select
            id="nh-emp-type"
            label="Employment Type *"
            required
            value={employmentType}
            onChange={(e) => setEmploymentType(e.target.value as EmploymentType)}
          >
            <option value="full_time">Full Time</option>
            <option value="part_time">Part Time</option>
            <option value="contract">Contract</option>
            <option value="intern">Intern</option>
          </Select>
        </div>
      </form>
    </Modal>
  );
}

export default NewHireModal;
