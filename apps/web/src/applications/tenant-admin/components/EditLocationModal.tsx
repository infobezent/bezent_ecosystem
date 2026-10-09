import { useState, useEffect, type FormEvent } from 'react';
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
import { tenantAdminApi } from '../api/tenantAdminApi';
import type {
  LocationType,
  TenantAdminCompanySummary,
  WorkLocationRecord,
  WorkLocationStatus,
} from '../types/tenantAdmin.types';

export interface EditLocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  company: TenantAdminCompanySummary;
  location: WorkLocationRecord | null;
  onSuccess: (updatedLocation: WorkLocationRecord) => Promise<void> | void;
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

export function EditLocationModal({
  isOpen,
  onClose,
  company,
  location,
  onSuccess,
}: EditLocationModalProps) {
  const [name, setName] = useState(location?.name || '');
  const [code, setCode] = useState(location?.code || '');
  const [type, setType] = useState<LocationType>(location?.type || 'office');
  const [addressLine1, setAddressLine1] = useState(location?.addressLine1 || '');
  const [addressLine2, setAddressLine2] = useState(location?.addressLine2 || '');
  const [city, setCity] = useState(location?.city || '');
  const [state, setState] = useState(location?.state || '');
  const [country, setCountry] = useState(location?.country || company.country || 'India');
  const [postalCode, setPostalCode] = useState(location?.postalCode || '');
  const [timezone, setTimezone] = useState(location?.timezone || company.timeZone || 'Asia/Kolkata');
  const [description, setDescription] = useState(location?.description || '');
  const [status, setStatus] = useState<WorkLocationStatus>(location?.status || 'active');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && location) {
      setName(location.name || '');
      setCode(location.code || '');
      setType(location.type || 'office');
      setAddressLine1(location.addressLine1 || '');
      setAddressLine2(location.addressLine2 || '');
      setCity(location.city || '');
      setState(location.state || '');
      setCountry(location.country || company.country || 'India');
      setPostalCode(location.postalCode || '');
      setTimezone(location.timezone || company.timeZone || 'Asia/Kolkata');
      setDescription(location.description || '');
      setStatus(location.status || 'active');
      setError(null);
    }
  }, [isOpen, location, company]);

  if (!location) {
    return null;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError('Location name is required.');
      return;
    }
    if (!addressLine1.trim()) {
      setError('Address Line 1 is required.');
      return;
    }
    if (!city.trim()) {
      setError('City is required.');
      return;
    }
    if (!state.trim()) {
      setError('State / Province is required.');
      return;
    }
    if (!country.trim()) {
      setError('Country is required.');
      return;
    }
    if (!postalCode.trim()) {
      setError('Postal Code is required.');
      return;
    }
    if (country.trim().toLowerCase() === 'india' && !/^\d{6}$/.test(postalCode.trim())) {
      setError('PIN code must be a 6-digit number for India.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const updated = await tenantAdminApi.updateCompanyWorkLocation(company.id, location.id, {
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

      await onSuccess(updated);
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update work location';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Work Location"
      description={`Update details for ${location.name}.`}
      size="md"
      footer={
        <Inline gap="sm" justify="end">
          <Button variant="secondary" onClick={onClose} disabled={loading} type="button">
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} loading={loading} type="button">
            Save Changes
          </Button>
        </Inline>
      }
    >
      <form onSubmit={handleSubmit}>
        <Stack gap="md">
          {error && <Alert variant="danger">{error}</Alert>}

          <FormGrid columns={2}>
            <FormField label="Location Name" required>
              <Input
                placeholder="e.g. Hosur Office"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </FormField>

            <FormField label="Location Code">
              <Input
                placeholder="e.g. HSR-001"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
              />
            </FormField>
          </FormGrid>

          <FormField label="Location Type" required>
            <Select
              value={type}
              onChange={(e) => setType(e.target.value as LocationType)}
              options={LOCATION_TYPE_OPTIONS}
              required
            />
          </FormField>

          <FormField label="Address Line 1" required>
            <Input
              placeholder="Building, street, or industrial plot"
              value={addressLine1}
              onChange={(e) => setAddressLine1(e.target.value)}
              required
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
            <FormField label="City" required>
              <Input
                placeholder="City"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                required
              />
            </FormField>

            <FormField label="State / Province" required>
              <Input
                placeholder="State or Province"
                value={state}
                onChange={(e) => setState(e.target.value)}
                required
              />
            </FormField>
          </FormGrid>

          <FormGrid columns={2}>
            <FormField label="Postal Code" required>
              <Input
                placeholder="Postal or PIN Code"
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                required
              />
            </FormField>

            <FormField label="Country" required>
              <Input
                placeholder="Country"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                required
              />
            </FormField>
          </FormGrid>

          <FormGrid columns={2}>
            <FormField label="Time Zone">
              <Select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                options={TIMEZONE_OPTIONS}
              />
            </FormField>

            <FormField label="Status" required>
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
      </form>
    </Modal>
  );
}
