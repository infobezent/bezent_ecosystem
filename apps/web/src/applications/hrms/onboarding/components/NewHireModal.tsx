import { useState, type FormEvent, useEffect } from 'react';
import { Button } from '../../../../design-system/components/Button';
import { BezentIcon } from '../../../../design-system/icons';
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

  return (
    <div
      className="new-hire-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-hire-title"
    >
      <div className="new-hire-modal">
        <div className="new-hire-modal__header">
          <div className="new-hire-modal__title-group">
            <h2 id="new-hire-title" className="new-hire-modal__title">
              Add New Hire
            </h2>
            <p className="new-hire-modal__subtitle">
              Initiate the onboarding process for a new employee.
            </p>
          </div>
          <button
            type="button"
            className="new-hire-modal__close-btn"
            onClick={onClose}
            aria-label="Close modal"
          >
            <BezentIcon name="close" size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="new-hire-modal__body">
          {errorMessage && (
            <div className="new-hire-modal__error-alert" role="alert">
              {errorMessage}
            </div>
          )}

          {/* Personal Information */}
          <div className="new-hire-modal__section">
            <h3 className="new-hire-modal__section-title">Personal Details</h3>
            <div className="new-hire-modal__row">
              <div className="new-hire-modal__field">
                <label className="new-hire-modal__label" htmlFor="nh-first-name">
                  First Name <span className="new-hire-modal__required">*</span>
                </label>
                <input
                  id="nh-first-name"
                  type="text"
                  required
                  className="new-hire-modal__input"
                  placeholder="e.g. Arun"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </div>
              <div className="new-hire-modal__field">
                <label className="new-hire-modal__label" htmlFor="nh-last-name">
                  Last Name
                </label>
                <input
                  id="nh-last-name"
                  type="text"
                  className="new-hire-modal__input"
                  placeholder="e.g. Kumar"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>
            </div>

            <div className="new-hire-modal__row">
              <div className="new-hire-modal__field">
                <label className="new-hire-modal__label" htmlFor="nh-email">
                  Email Address <span className="new-hire-modal__required">*</span>
                </label>
                <input
                  id="nh-email"
                  type="email"
                  required
                  className="new-hire-modal__input"
                  placeholder="e.g. arun.kumar@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="new-hire-modal__field">
                <label className="new-hire-modal__label" htmlFor="nh-phone">
                  Phone Number
                </label>
                <input
                  id="nh-phone"
                  type="tel"
                  className="new-hire-modal__input"
                  placeholder="e.g. +91 98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Employment Details */}
          <div className="new-hire-modal__section">
            <h3 className="new-hire-modal__section-title">Employment Details</h3>

            <div className="new-hire-modal__field">
              <label className="new-hire-modal__label" htmlFor="nh-company">
                Company <span className="new-hire-modal__required">*</span>
              </label>
              <input
                id="nh-company"
                type="text"
                disabled
                className="new-hire-modal__input"
                value={masters?.company?.name || 'Loading company...'}
              />
            </div>

            <div className="new-hire-modal__row">
              <div className="new-hire-modal__field">
                <label className="new-hire-modal__label" htmlFor="nh-department">
                  Department <span className="new-hire-modal__required">*</span>
                </label>
                <select
                  id="nh-department"
                  required
                  className="new-hire-modal__select"
                  value={departmentId}
                  onChange={(e) => setDepartmentId(e.target.value)}
                >
                  {masters?.departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="new-hire-modal__field">
                <label className="new-hire-modal__label" htmlFor="nh-designation">
                  Designation <span className="new-hire-modal__required">*</span>
                </label>
                <select
                  id="nh-designation"
                  required
                  className="new-hire-modal__select"
                  value={designationId}
                  onChange={(e) => setDesignationId(e.target.value)}
                >
                  {masters?.designations.map((desig) => (
                    <option key={desig.id} value={desig.id}>
                      {desig.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="new-hire-modal__row">
              <div className="new-hire-modal__field">
                <label className="new-hire-modal__label" htmlFor="nh-location">
                  Location
                </label>
                <select
                  id="nh-location"
                  className="new-hire-modal__select"
                  value={locationId}
                  onChange={(e) => setLocationId(e.target.value)}
                >
                  <option value="">None / Not Assigned</option>
                  {masters?.locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="new-hire-modal__field">
                <label className="new-hire-modal__label" htmlFor="nh-joining-date">
                  Joining Date <span className="new-hire-modal__required">*</span>
                </label>
                <input
                  id="nh-joining-date"
                  type="date"
                  required
                  className="new-hire-modal__input"
                  value={joiningDate}
                  onChange={(e) => setJoiningDate(e.target.value)}
                />
              </div>
            </div>

            <div className="new-hire-modal__field">
              <label className="new-hire-modal__label" htmlFor="nh-emp-type">
                Employment Type <span className="new-hire-modal__required">*</span>
              </label>
              <select
                id="nh-emp-type"
                className="new-hire-modal__select"
                value={employmentType}
                onChange={(e) => setEmploymentType(e.target.value as EmploymentType)}
              >
                <option value="full_time">Full Time</option>
                <option value="part_time">Part Time</option>
                <option value="contract">Contract</option>
                <option value="intern">Intern</option>
              </select>
            </div>
          </div>

          <div className="new-hire-modal__footer">
            <button
              type="button"
              className="new-hire-modal__cancel-btn"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>
            <Button variant="primary" type="submit" disabled={submitting}>
              {submitting ? 'Creating...' : 'Create New Hire'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
