import { useState, useEffect, useMemo, type FormEvent } from 'react';
import {
  Alert,
  Button,
  FormField,
  FormGrid,
  Inline,
  Input,
  Modal,
  Select,
  Stack,
  Textarea,
} from '../../../design-system/components';
import { BezentIcon } from '../../../design-system/icons';
import { tenantAdminApi } from '../api/tenantAdminApi';
import type {
  LocationType,
  TenantAdminCompanySummary,
  WorkLocationRecord,
  WorkLocationStatus,
} from '../types/tenantAdmin.types';

export interface NormalizedAddressInput {
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  country?: string | null;
}

/**
 * Normalizes and compares two address objects across canonical fields:
 * addressLine1, addressLine2, city, state, postalCode, country.
 * Safely handles trim, lowercase, null/undefined, and repeated whitespace.
 */
export function isSameNormalizedAddress(
  a: NormalizedAddressInput,
  b: NormalizedAddressInput,
): boolean {
  const norm = (s?: string | null) =>
    (s ?? '').trim().toLowerCase().replace(/\s+/g, ' ');

  const aAddr1 = norm(a.addressLine1);
  const bAddr1 = norm(b.addressLine1);
  const aCity = norm(a.city);
  const bCity = norm(b.city);
  const aState = norm(a.state);
  const bState = norm(b.state);

  // Both must have non-empty core address components
  if (!aAddr1 || !bAddr1 || !aCity || !bCity || !aState || !bState) {
    return false;
  }

  if (aAddr1 !== bAddr1 || aCity !== bCity || aState !== bState) {
    return false;
  }

  // addressLine2 (normalized empty string equals empty string)
  if (norm(a.addressLine2) !== norm(b.addressLine2)) {
    return false;
  }

  // postalCode (normalized empty string equals empty string)
  if (norm(a.postalCode) !== norm(b.postalCode)) {
    return false;
  }

  // country (default to 'india' if empty, or compare normalized)
  const aCountry = norm(a.country) || 'india';
  const bCountry = norm(b.country) || 'india';
  if (aCountry !== bCountry) {
    return false;
  }

  return true;
}

export interface AddLocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  company: TenantAdminCompanySummary;
  existingLocations?: WorkLocationRecord[];
  onSuccess: (newLocation: WorkLocationRecord) => Promise<void> | void;
}

const LOCATION_TYPE_OPTIONS: { value: LocationType; label: string }[] = [
  { value: 'office', label: 'Office' },
  { value: 'branch', label: 'Branch' },
  { value: 'plant_factory', label: 'Plant' },
  { value: 'client_site', label: 'Client Site' },
  { value: 'other', label: 'Other' },
];

const TIMEZONE_OPTIONS = [
  { value: '', label: 'Select Time Zone (Optional)' },
  { value: 'Asia/Kolkata', label: 'Asia/Kolkata (IST - India Standard Time)' },
  { value: 'Asia/Singapore', label: 'Asia/Singapore (SGT - Singapore)' },
  { value: 'Asia/Dubai', label: 'Asia/Dubai (GST - Gulf Standard Time)' },
  { value: 'Asia/Tokyo', label: 'Asia/Tokyo (JST - Japan Standard Time)' },
  { value: 'Europe/London', label: 'Europe/London (GMT/BST - United Kingdom)' },
  { value: 'Europe/Berlin', label: 'Europe/Berlin (CET/CEST - Central Europe)' },
  { value: 'America/New_York', label: 'America/New_York (EST/EDT - US Eastern)' },
  { value: 'America/Chicago', label: 'America/Chicago (CST/CDT - US Central)' },
  { value: 'America/Los_Angeles', label: 'America/Los_Angeles (PST/PDT - US Pacific)' },
  { value: 'Australia/Sydney', label: 'Australia/Sydney (AEST/AEDT - Sydney)' },
  { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
];

/**
 * Suggests a clean 3-letter alphanumeric company-scoped location code.
 * e.g. "Hosur Branch" -> "HSR-001", "Chennai Office" -> "CHN-001"
 */
function suggestLocationCode(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return '';
  const words = trimmed.split(/\s+/).filter(Boolean);
  const filteredWords = words.filter(
    (w) =>
      !['office', 'branch', 'plant', 'factory', 'site', 'hub', 'center', 'centre'].includes(
        w.toLowerCase(),
      ),
  );
  const primaryWord = filteredWords[0] || words[0] || '';
  const clean = primaryWord.replace(/[^a-zA-Z0-9]/g, '');
  if (!clean) return '';

  const consonants = clean.replace(/[aeiouAEIOU]/g, '');
  let prefix = '';
  if (consonants.length >= 3) {
    prefix = consonants.slice(0, 3).toUpperCase();
  } else if (clean.length >= 3) {
    prefix = clean.slice(0, 3).toUpperCase();
  } else {
    prefix = clean.padEnd(3, 'X').toUpperCase();
  }
  return `${prefix}-001`;
}

export function AddLocationModal({
  isOpen,
  onClose,
  company,
  existingLocations = [],
  onSuccess,
}: AddLocationModalProps) {
  // Primary Form State
  const [name, setName] = useState('');
  const [type, setType] = useState<LocationType>('office');
  const [addressLine1, setAddressLine1] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState(company.country || 'India');

  // Advanced Options State
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [code, setCode] = useState('');
  const [hasUserModifiedCode, setHasUserModifiedCode] = useState(false);
  const [addressLine2, setAddressLine2] = useState('');
  const [timezone, setTimezone] = useState(company.timeZone || 'Asia/Kolkata');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<WorkLocationStatus>('active');

  // Validation & Submission State
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Initialize defaults when modal opens
  useEffect(() => {
    if (isOpen) {
      setName('');
      setType('office');
      setAddressLine1('');
      setCity('');
      setState('');
      setPostalCode('');
      setCountry(company.country || 'India');

      setIsAdvancedOpen(false);
      setCode('');
      setHasUserModifiedCode(false);
      setAddressLine2('');
      setTimezone(company.timeZone || 'Asia/Kolkata');
      setDescription('');
      setStatus('active');

      setFieldErrors({});
      setSubmitError(null);
      setLoading(false);
    }
  }, [isOpen, company]);

  // Check if registered office is available on company
  const hasRegisteredOffice = useMemo(() => {
    return Boolean(
      company.addressLine1?.trim() &&
        company.city?.trim() &&
        company.state?.trim(),
    );
  }, [company]);

  // Check if an existing location already matches the company registered office
  const isRegisteredOfficeAlreadyUsed = useMemo(() => {
    if (!hasRegisteredOffice || !existingLocations || existingLocations.length === 0) {
      return false;
    }
    return existingLocations.some((loc) =>
      isSameNormalizedAddress(
        {
          addressLine1: company.addressLine1,
          addressLine2: company.addressLine2,
          city: company.city,
          state: company.state,
          postalCode: company.postalCode,
          country: company.country,
        },
        {
          addressLine1: loc.addressLine1,
          addressLine2: loc.addressLine2,
          city: loc.city,
          state: loc.state,
          postalCode: loc.postalCode,
          country: loc.country,
        },
      ),
    );
  }, [hasRegisteredOffice, existingLocations, company]);

  const showRegisteredOfficeShortcut = hasRegisteredOffice && !isRegisteredOfficeAlreadyUsed;

  const registeredOfficeSummary = useMemo(() => {
    return [
      company.addressLine1,
      company.addressLine2,
      company.city,
      company.state,
      company.postalCode,
      company.country,
    ]
      .filter(Boolean)
      .join(', ');
  }, [company]);

  // Copy registered office values once into form
  const handleUseRegisteredOffice = () => {
    if (company.addressLine1) setAddressLine1(company.addressLine1);
    if (company.addressLine2) setAddressLine2(company.addressLine2);
    if (company.city) setCity(company.city);
    if (company.state) setState(company.state);
    if (company.postalCode) setPostalCode(company.postalCode);
    if (company.country) setCountry(company.country);
    if (company.timeZone) setTimezone(company.timeZone);

    // Clear any field errors for populated fields
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next.addressLine1;
      delete next.city;
      delete next.state;
      delete next.postalCode;
      delete next.country;
      return next;
    });
  };

  const handleNameChange = (newName: string) => {
    setName(newName);
    if (fieldErrors.name) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next.name;
        return next;
      });
    }

    // Suggest location code if user hasn't explicitly customized it
    if (!hasUserModifiedCode) {
      setCode(suggestLocationCode(newName));
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (loading) return;

    // Validate fields
    const errors: Record<string, string> = {};

    if (!name.trim()) {
      errors.name = 'Location name is required.';
    }
    if (!addressLine1.trim()) {
      errors.addressLine1 = 'Address Line 1 is required.';
    }
    if (!city.trim()) {
      errors.city = 'City is required.';
    }
    if (!state.trim()) {
      errors.state = 'State / Province is required.';
    }
    if (!country.trim()) {
      errors.country = 'Country is required.';
    }
    if (!postalCode.trim()) {
      errors.postalCode = 'Postal Code is required.';
    } else if (country.trim().toLowerCase() === 'india' && !/^\d{6}$/.test(postalCode.trim())) {
      errors.postalCode = 'PIN code must be a 6-digit number.';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setSubmitError(null);
    setLoading(true);

    try {
      const created = await tenantAdminApi.createCompanyWorkLocation(company.id, {
        name: name.trim(),
        code: code.trim() ? code.trim().toUpperCase() : null,
        type,
        addressLine1: addressLine1.trim(),
        addressLine2: addressLine2.trim() || null,
        city: city.trim(),
        state: state.trim(),
        country: country.trim(),
        postalCode: postalCode.trim(),
        timezone: timezone.trim() || null,
        description: description.trim() || null,
        status,
      });

      await onSuccess(created);
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create work location';
      setSubmitError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Work Location"
      description={`Add a physical work location or facility for ${company.legalName || company.displayName || company.name}.`}
      size="md"
      footer={
        <Inline gap="sm" justify="end">
          <Button variant="secondary" onClick={onClose} disabled={loading} type="button">
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} loading={loading} type="button">
            Add Location
          </Button>
        </Inline>
      }
    >
      <form onSubmit={handleSubmit} noValidate>
        <Stack gap="md">
          {submitError && <Alert variant="danger">{submitError}</Alert>}

          {/* 1. Location Name */}
          <FormField label="Location Name" required error={fieldErrors.name}>
            <Input
              placeholder="e.g. Hosur Branch"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              required
            />
          </FormField>

          {/* 2. Location Type */}
          <FormField label="Location Type" required>
            <Select
              value={type}
              onChange={(e) => setType(e.target.value as LocationType)}
              options={LOCATION_TYPE_OPTIONS}
              required
            />
          </FormField>

          {/* 3. Registered Office Shortcut (if available and not already used) */}
          {showRegisteredOfficeShortcut && (
            <div className="bezent-reg-office-banner">
              <div className="bezent-reg-office-banner__info">
                <span className="bezent-reg-office-banner__title">
                  Registered office available
                </span>
                <span className="bezent-reg-office-banner__address" title={registeredOfficeSummary}>
                  {registeredOfficeSummary}
                </span>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleUseRegisteredOffice}
                type="button"
              >
                Use registered office
              </Button>
            </div>
          )}

          {/* 4. Primary Address Fields */}
          <FormField label="Address Line 1" required error={fieldErrors.addressLine1}>
            <Input
              placeholder="Building, street, or industrial plot"
              value={addressLine1}
              onChange={(e) => {
                setAddressLine1(e.target.value);
                if (fieldErrors.addressLine1) {
                  setFieldErrors((prev) => {
                    const next = { ...prev };
                    delete next.addressLine1;
                    return next;
                  });
                }
              }}
              required
            />
          </FormField>

          <FormGrid columns={2}>
            <FormField label="City" required error={fieldErrors.city}>
              <Input
                placeholder="City"
                value={city}
                onChange={(e) => {
                  setCity(e.target.value);
                  if (fieldErrors.city) {
                    setFieldErrors((prev) => {
                      const next = { ...prev };
                      delete next.city;
                      return next;
                    });
                  }
                }}
                required
              />
            </FormField>

            <FormField label="State / Province" required error={fieldErrors.state}>
              <Input
                placeholder="State or Province"
                value={state}
                onChange={(e) => {
                  setState(e.target.value);
                  if (fieldErrors.state) {
                    setFieldErrors((prev) => {
                      const next = { ...prev };
                      delete next.state;
                      return next;
                    });
                  }
                }}
                required
              />
            </FormField>
          </FormGrid>

          <FormGrid columns={2}>
            <FormField label="Postal Code" required error={fieldErrors.postalCode}>
              <Input
                placeholder="Postal or PIN Code"
                value={postalCode}
                onChange={(e) => {
                  setPostalCode(e.target.value);
                  if (fieldErrors.postalCode) {
                    setFieldErrors((prev) => {
                      const next = { ...prev };
                      delete next.postalCode;
                      return next;
                    });
                  }
                }}
                required
              />
            </FormField>

            <FormField label="Country" required error={fieldErrors.country}>
              <Input
                placeholder="Country"
                value={country}
                onChange={(e) => {
                  setCountry(e.target.value);
                  if (fieldErrors.country) {
                    setFieldErrors((prev) => {
                      const next = { ...prev };
                      delete next.country;
                      return next;
                    });
                  }
                }}
                required
              />
            </FormField>
          </FormGrid>

          {/* 5. Progressive Disclosure: Advanced Options */}
          <div>
            <button
              type="button"
              className="bezent-form-disclosure-btn"
              onClick={() => setIsAdvancedOpen((prev) => !prev)}
              aria-expanded={isAdvancedOpen}
            >
              <BezentIcon name={isAdvancedOpen ? 'chevronDown' : 'chevronRight'} size={14} />
              <span>{isAdvancedOpen ? 'Hide advanced options' : 'Advanced options'}</span>
            </button>
          </div>

          {/* Advanced Options Fields (Preserves values across collapse) */}
          {isAdvancedOpen && (
            <Stack gap="md">
              <FormField
                label="Location Code"
                helperText="Suggested business identifier within this company."
              >
                <Input
                  placeholder="e.g. HSR-001"
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value.toUpperCase());
                    setHasUserModifiedCode(true);
                  }}
                />
              </FormField>

              <FormField label="Address Line 2 (Optional)">
                <Input
                  placeholder="Suite, floor, or landmark"
                  value={addressLine2}
                  onChange={(e) => setAddressLine2(e.target.value)}
                />
              </FormField>

              <FormGrid columns={2}>
                <FormField label="Time Zone">
                  <Select
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    options={TIMEZONE_OPTIONS}
                  />
                </FormField>

                <FormField label="Status">
                  <Select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as WorkLocationStatus)}
                    options={[
                      { value: 'active', label: 'Active' },
                      { value: 'inactive', label: 'Inactive' },
                    ]}
                  />
                </FormField>
              </FormGrid>

              <FormField label="Description (Optional)">
                <Textarea
                  placeholder="Additional operational or regional details..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                />
              </FormField>
            </Stack>
          )}
        </Stack>
      </form>
    </Modal>
  );
}
