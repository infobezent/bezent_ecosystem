import { useState, useEffect, useMemo, useCallback, type FormEvent } from 'react';
import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  EmptyState,
  FormField,
  FormGrid,
  Inline,
  Input,
  LoadingState,
  Modal,
  Page,
  PageHeader,
  SearchInput,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHeaderCell,
  TableHead,
  TableRow,
  Textarea,
  Toolbar,
} from '../../../design-system/components';
import { BezentIcon } from '../../../design-system/icons';
import { useAuthorization } from '../../../platform/auth';
import {
  fetchWorkLocations,
  createWorkLocation,
  updateWorkLocation,
  deactivateWorkLocation,
  reactivateWorkLocation,
} from './api/workLocationApi';
import {
  type WorkLocationRecord,
  type LocationType,
  type WorkLocationStatus,
  LOCATION_TYPE_OPTIONS,
  LOCATION_TYPE_LABELS,
} from './types/workLocation';

export interface WorkLocationsSectionProps {
  onBack?: () => void;
  onNavigateToDepartments?: () => void;
  onNavigateToStructure?: () => void;
}

const COMMON_TIMEZONE_OPTIONS = [
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

export function WorkLocationsSection({
  onBack,
  onNavigateToDepartments: _onNavigateToDepartments,
  onNavigateToStructure: _onNavigateToStructure,
}: WorkLocationsSectionProps) {
  const { canAny } = useAuthorization();

  const canManage = canAny([
    'organization.workLocations.manage',
    'organization.locations.manage',
    'hrms.organization.manage',
    'hrms.settings.manage',
  ]);

  // State
  const [locations, setLocations] = useState<WorkLocationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [typeFilter, setTypeFilter] = useState<LocationType | 'all'>('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<WorkLocationRecord | null>(null);
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Form State
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formType, setFormType] = useState<LocationType>('office');
  const [formAddressLine1, setFormAddressLine1] = useState('');
  const [formAddressLine2, setFormAddressLine2] = useState('');
  const [formCountry, setFormCountry] = useState('India');
  const [formState, setFormState] = useState('');
  const [formCity, setFormCity] = useState('');
  const [formPostalCode, setFormPostalCode] = useState('');
  const [formTimezone, setFormTimezone] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formStatus, setFormStatus] = useState<WorkLocationStatus>('active');

  // Deactivation confirmation modal state
  const [deactivateTarget, setDeactivateTarget] = useState<WorkLocationRecord | null>(null);
  const [deactivateSubmitting, setDeactivateSubmitting] = useState(false);
  const [deactivateError, setDeactivateError] = useState<string | null>(null);

  // Load Data
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchWorkLocations();
      setLocations(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to load work locations. Please check your network connection.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Counts
  const counts = useMemo(() => {
    const total = locations.length;
    const active = locations.filter((l) => l.status === 'active').length;
    const inactive = locations.filter((l) => l.status === 'inactive').length;
    const physical = locations.filter((l) => l.type !== 'remote').length;
    const remote = locations.filter((l) => l.type === 'remote').length;
    return { total, active, inactive, physical, remote };
  }, [locations]);

  // Filtered Locations
  const filteredLocations = useMemo(() => {
    return locations.filter((loc) => {
      // Status
      if (statusFilter !== 'all' && loc.status !== statusFilter) return false;

      // Type
      if (typeFilter !== 'all' && loc.type !== typeFilter) return false;

      // Search (Name, Code, City, Country)
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        const matchesName = loc.name.toLowerCase().includes(query);
        const matchesCode = loc.code ? loc.code.toLowerCase().includes(query) : false;
        const matchesCity = loc.city ? loc.city.toLowerCase().includes(query) : false;
        const matchesCountry = loc.country ? loc.country.toLowerCase().includes(query) : false;
        if (!matchesName && !matchesCode && !matchesCity && !matchesCountry) return false;
      }

      return true;
    });
  }, [locations, statusFilter, typeFilter, searchQuery]);

  // Open Add Modal
  const openAddModal = () => {
    setEditingLocation(null);
    setFormName('');
    setFormCode('');
    setFormType('office');
    setFormAddressLine1('');
    setFormAddressLine2('');
    setFormCountry('India');
    setFormState('');
    setFormCity('');
    setFormPostalCode('');
    setFormTimezone('Asia/Kolkata');
    setFormDescription('');
    setFormStatus('active');
    setModalError(null);
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (loc: WorkLocationRecord) => {
    setEditingLocation(loc);
    setFormName(loc.name);
    setFormCode(loc.code ?? '');
    setFormType(loc.type);
    setFormAddressLine1(loc.addressLine1 ?? '');
    setFormAddressLine2(loc.addressLine2 ?? '');
    setFormCountry(loc.country ?? 'India');
    setFormState(loc.state ?? '');
    setFormCity(loc.city ?? '');
    setFormPostalCode(loc.postalCode ?? '');
    setFormTimezone(loc.timezone ?? '');
    setFormDescription(loc.description ?? '');
    setFormStatus(loc.status);
    setModalError(null);
    setIsModalOpen(true);
  };

  // Handle Save (Create / Update)
  const handleSaveLocation = async (e: FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setModalError('Location name is required');
      return;
    }

    const isRemote = formType === 'remote';
    if (!isRemote) {
      if (
        !formAddressLine1.trim() ||
        !formCountry.trim() ||
        !formState.trim() ||
        !formCity.trim() ||
        !formPostalCode.trim()
      ) {
        setModalError(
          'Physical locations require Address Line 1, Country, State, City, and Postal Code.',
        );
        return;
      }
      if (formCountry.trim().toLowerCase() === 'india' && !/^\d{6}$/.test(formPostalCode.trim())) {
        setModalError('PIN code must be a 6-digit number for India');
        return;
      }
    }

    try {
      setModalSubmitting(true);
      setModalError(null);

      const payload = {
        name: formName.trim(),
        code: formCode.trim() ? formCode.trim().toUpperCase() : null,
        type: formType,
        addressLine1: formAddressLine1.trim() ? formAddressLine1.trim() : null,
        addressLine2: formAddressLine2.trim() ? formAddressLine2.trim() : null,
        country: formCountry.trim() ? formCountry.trim() : null,
        state: formState.trim() ? formState.trim() : null,
        city: formCity.trim() ? formCity.trim() : null,
        postalCode: formPostalCode.trim() ? formPostalCode.trim() : null,
        timezone: formTimezone.trim() ? formTimezone.trim() : null,
        description: formDescription.trim() ? formDescription.trim() : null,
        status: formStatus,
      };

      if (editingLocation) {
        await updateWorkLocation(editingLocation.id, payload);
      } else {
        await createWorkLocation(payload);
      }

      setIsModalOpen(false);
      await loadData();
    } catch (err) {
      setModalError(err instanceof Error ? err.message : 'Failed to save work location.');
    } finally {
      setModalSubmitting(false);
    }
  };

  // Handle Deactivate Confirm
  const handleConfirmDeactivate = async () => {
    if (!deactivateTarget) return;
    try {
      setDeactivateSubmitting(true);
      setDeactivateError(null);
      await deactivateWorkLocation(deactivateTarget.id);
      setDeactivateTarget(null);
      await loadData();
    } catch (err) {
      setDeactivateError(err instanceof Error ? err.message : 'Failed to deactivate work location.');
    } finally {
      setDeactivateSubmitting(false);
    }
  };

  // Handle Reactivate Direct
  const handleReactivate = async (loc: WorkLocationRecord) => {
    try {
      setLoading(true);
      await reactivateWorkLocation(loc.id);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reactivate work location.');
      setLoading(false);
    }
  };

  const isFormRemote = formType === 'remote';

  return (
    <Page maxWidth="full">
      <Stack gap="lg">
        {/* Navigation Breadcrumb Toolbar */}
        <Toolbar
          left={
            onBack ? (
              <Button variant="secondary" type="button" onClick={onBack}>
                <BezentIcon name="chevronLeft" size={16} />
                Back to Settings
              </Button>
            ) : undefined
          }
          right={
            <Inline gap="xs" align="center">
              <span>Settings</span>
              <span>/</span>
              <span>Organization</span>
              <span>/</span>
              <strong>Work Locations</strong>
            </Inline>
          }
        />

        {/* Section Header */}
        <PageHeader
          title="Work Locations"
          subtitle="Define organizational work locations, physical facilities, branch offices, plants, and remote work hubs."
          actions={
            canManage ? (
              <Button variant="primary" type="button" onClick={openAddModal}>
                <BezentIcon name="add" size={16} />
                Add Work Location
              </Button>
            ) : undefined
          }
        />

        {/* Error Alert */}
        {error && (
          <Alert variant="error">
            <Inline gap="sm" align="center" justify="between">
              <span>{error}</span>
              <Button variant="outline" size="sm" onClick={() => void loadData()}>
                Retry
              </Button>
            </Inline>
          </Alert>
        )}

        {/* Filters and Summary Card */}
        <Card variant="flat" padding="md">
          <CardBody>
            <Inline gap="md" align="center" justify="between" wrap>
              <Inline gap="sm" align="center" wrap>
                <SearchInput
                  placeholder="Search work locations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onClear={() => setSearchQuery('')}
                />

                <Select
                  aria-label="Filter by Status"
                  value={statusFilter}
                  onChange={(e) =>
                    setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')
                  }
                  options={[
                    { value: 'all', label: 'All Statuses' },
                    { value: 'active', label: 'Active Only' },
                    { value: 'inactive', label: 'Inactive Only' },
                  ]}
                />

                <Select
                  aria-label="Filter by Location Type"
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value as LocationType | 'all')}
                  options={[
                    { value: 'all', label: 'All Types' },
                    ...LOCATION_TYPE_OPTIONS,
                  ]}
                />
              </Inline>

              <Inline gap="xs" align="center" wrap>
                <Badge variant="neutral">Total: {counts.total}</Badge>
                <Badge variant="success">Active: {counts.active}</Badge>
                {counts.inactive > 0 && <Badge variant="warning">Inactive: {counts.inactive}</Badge>}
                <Badge variant="neutral">Physical: {counts.physical}</Badge>
                <Badge variant="neutral">Remote: {counts.remote}</Badge>
              </Inline>
            </Inline>
          </CardBody>
        </Card>

        {/* Work Locations Table or Empty/Loading State */}
        {loading ? (
          <LoadingState label="Loading work locations..." />
        ) : filteredLocations.length === 0 ? (
          <EmptyState
            title="No work locations found"
            description={
              searchQuery || statusFilter !== 'all' || typeFilter !== 'all'
                ? 'No work locations match the selected filters.'
                : 'No work locations have been configured for this company yet.'
            }
            primaryAction={
              canManage && !searchQuery && statusFilter === 'all' && typeFilter === 'all'
                ? {
                    label: 'Add Work Location',
                    onClick: openAddModal,
                  }
                : undefined
            }
          />
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Location Name</TableHeaderCell>
                <TableHeaderCell>Code</TableHeaderCell>
                <TableHeaderCell>Type</TableHeaderCell>
                <TableHeaderCell>Address / City</TableHeaderCell>
                <TableHeaderCell>Time Zone</TableHeaderCell>
                <TableHeaderCell>Active Employees</TableHeaderCell>
                <TableHeaderCell>Status</TableHeaderCell>
                <TableHeaderCell align="right">Actions</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredLocations.map((loc) => (
                <TableRow key={loc.id}>
                  <TableCell>
                    <Stack gap="xs">
                      <strong>{loc.name}</strong>
                      {loc.description && <small>{loc.description}</small>}
                    </Stack>
                  </TableCell>
                  <TableCell>{loc.code ? <code>{loc.code}</code> : '—'}</TableCell>
                  <TableCell>
                    <Badge variant={loc.type === 'remote' ? 'info' : 'neutral'}>
                      {LOCATION_TYPE_LABELS[loc.type]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {loc.type === 'remote' && !loc.city ? (
                      <Inline gap="xs" align="center">
                        <BezentIcon name="globe" size={14} />
                        <span>Remote / Virtual</span>
                      </Inline>
                    ) : (
                      <Stack gap="xs">
                        <span>
                          {[loc.city, loc.state].filter(Boolean).join(', ')}
                        </span>
                        {loc.country && <small>{loc.country} {loc.postalCode ? `(${loc.postalCode})` : ''}</small>}
                      </Stack>
                    )}
                  </TableCell>
                  <TableCell>{loc.timezone || '—'}</TableCell>
                  <TableCell>
                    <Badge variant={loc.activeEmployeeCount > 0 ? 'success' : 'neutral'}>
                      {loc.activeEmployeeCount} employee{loc.activeEmployeeCount === 1 ? '' : 's'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={loc.status === 'active' ? 'success' : 'neutral'}>
                      {loc.status === 'active' ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell align="right">
                    {canManage && (
                      <Inline gap="xs" align="center" justify="end">
                        <Button
                          variant="ghost"
                          size="sm"
                          type="button"
                          onClick={() => openEditModal(loc)}
                        >
                          Edit
                        </Button>
                        {loc.status === 'active' ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            type="button"
                            onClick={() => {
                              setDeactivateError(null);
                              setDeactivateTarget(loc);
                            }}
                          >
                            Deactivate
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            type="button"
                            onClick={() => void handleReactivate(loc)}
                          >
                            Reactivate
                          </Button>
                        )}
                      </Inline>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Stack>

      {/* Add / Edit Work Location Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => !modalSubmitting && setIsModalOpen(false)}
        title={editingLocation ? 'Edit Work Location' : 'Add Work Location'}
        size="lg"
      >
        <form onSubmit={(e) => void handleSaveLocation(e)}>
          <Stack gap="lg">
            {modalError && <Alert variant="error">{modalError}</Alert>}

            {/* Form Group 1: BASIC INFORMATION */}
            <Stack gap="sm">
              <strong>BASIC INFORMATION</strong>
              <FormGrid columns={2}>
                <FormField label="Location Name *" required>
                  <Input
                    name="name"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Hosur Office, Chennai Branch, India Remote"
                    disabled={modalSubmitting}
                    required
                  />
                </FormField>

                <FormField label="Location Code" helperText="Company-scoped unique identifier (optional)">
                  <Input
                    name="code"
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                    placeholder="e.g. HSR, CHN-HQ, REM-IN"
                    disabled={modalSubmitting}
                  />
                </FormField>
              </FormGrid>

              <FormField label="Location Type *" required>
                <Select
                  name="type"
                  value={formType}
                  onChange={(e) => setFormType(e.target.value as LocationType)}
                  options={LOCATION_TYPE_OPTIONS}
                  disabled={modalSubmitting}
                />
              </FormField>
            </Stack>

            {/* Form Group 2: ADDRESS */}
            <Stack gap="sm">
              <Inline gap="sm" align="center" justify="between">
                <strong>ADDRESS</strong>
                {isFormRemote ? (
                  <Badge variant="info">Optional for Remote</Badge>
                ) : (
                  <Badge variant="warning">Required for Physical</Badge>
                )}
              </Inline>

              <Alert variant="info">
                {isFormRemote
                  ? 'Physical address is optional for remote work locations. You may provide a reference office address if desired.'
                  : 'Physical address is required for on-site / facility work locations.'}
              </Alert>

              <FormField label={`Address Line 1 ${!isFormRemote ? '*' : ''}`} required={!isFormRemote}>
                <Input
                  name="addressLine1"
                  value={formAddressLine1}
                  onChange={(e) => setFormAddressLine1(e.target.value)}
                  placeholder="Street address, building, suite"
                  disabled={modalSubmitting}
                />
              </FormField>

              <FormField label="Address Line 2 (Optional)">
                <Input
                  name="addressLine2"
                  value={formAddressLine2}
                  onChange={(e) => setFormAddressLine2(e.target.value)}
                  placeholder="Apartment, industrial sector, unit"
                  disabled={modalSubmitting}
                />
              </FormField>

              <FormGrid columns={2}>
                <FormField label={`Country ${!isFormRemote ? '*' : ''}`} required={!isFormRemote}>
                  <Input
                    name="country"
                    value={formCountry}
                    onChange={(e) => setFormCountry(e.target.value)}
                    placeholder="e.g. India, Singapore, United States"
                    disabled={modalSubmitting}
                  />
                </FormField>

                <FormField label={`State / Province ${!isFormRemote ? '*' : ''}`} required={!isFormRemote}>
                  <Input
                    name="state"
                    value={formState}
                    onChange={(e) => setFormState(e.target.value)}
                    placeholder="e.g. Tamil Nadu, Karnataka"
                    disabled={modalSubmitting}
                  />
                </FormField>

                <FormField label={`City ${!isFormRemote ? '*' : ''}`} required={!isFormRemote}>
                  <Input
                    name="city"
                    value={formCity}
                    onChange={(e) => setFormCity(e.target.value)}
                    placeholder="e.g. Hosur, Chennai, Bengaluru"
                    disabled={modalSubmitting}
                  />
                </FormField>

                <FormField
                  label={`Postal Code ${!isFormRemote ? '*' : ''}`}
                  helperText={formCountry.trim().toLowerCase() === 'india' ? '6-digit PIN code' : 'Postal / Zip code'}
                  required={!isFormRemote}
                >
                  <Input
                    name="postalCode"
                    value={formPostalCode}
                    onChange={(e) => setFormPostalCode(e.target.value)}
                    placeholder="e.g. 635126"
                    disabled={modalSubmitting}
                  />
                </FormField>
              </FormGrid>
            </Stack>

            {/* Form Group 3: REGIONAL */}
            <Stack gap="sm">
              <strong>REGIONAL</strong>
              <FormField label="Time Zone" helperText="Canonical IANA timezone identifier (e.g. Asia/Kolkata)">
                <Select
                  name="timezone"
                  value={formTimezone}
                  onChange={(e) => setFormTimezone(e.target.value)}
                  options={COMMON_TIMEZONE_OPTIONS}
                  disabled={modalSubmitting}
                />
              </FormField>
            </Stack>

            {/* Form Group 4: ADDITIONAL & STATUS */}
            <Stack gap="sm">
              <strong>ADDITIONAL INFORMATION</strong>
              <FormField label="Description">
                <Textarea
                  name="description"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Notes, facility type, or landmark details"
                  rows={2}
                  disabled={modalSubmitting}
                />
              </FormField>

              <FormField label="Status">
                <Select
                  name="status"
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value as WorkLocationStatus)}
                  options={[
                    { value: 'active', label: 'Active (Available for assignments)' },
                    { value: 'inactive', label: 'Inactive (Excluded from new assignments)' },
                  ]}
                  disabled={modalSubmitting}
                />
              </FormField>
            </Stack>

            {/* Form Actions */}
            <Inline gap="sm" justify="end">
              <Button
                variant="secondary"
                type="button"
                onClick={() => setIsModalOpen(false)}
                disabled={modalSubmitting}
              >
                Cancel
              </Button>
              <Button variant="primary" type="submit" disabled={modalSubmitting}>
                {modalSubmitting ? 'Saving...' : editingLocation ? 'Update Location' : 'Create Location'}
              </Button>
            </Inline>
          </Stack>
        </form>
      </Modal>

      {/* Deactivate Confirmation Modal with Employee Impact Warning */}
      <Modal
        isOpen={Boolean(deactivateTarget)}
        onClose={() => !deactivateSubmitting && setDeactivateTarget(null)}
        title="Deactivate Work Location"
        size="md"
      >
        {deactivateTarget && (
          <Stack gap="md">
            <span>
              Are you sure you want to deactivate work location{' '}
              <strong>&ldquo;{deactivateTarget.name}&rdquo;</strong>?
            </span>

            {deactivateTarget.activeEmployeeCount > 0 ? (
              <Alert variant="warning">
                <strong>Employee Impact Notice:</strong> {deactivateTarget.activeEmployeeCount}{' '}
                active employee(s) are currently assigned to this work location. Deactivating will not
                modify or reassign them, but will prevent this location from being chosen for new
                employee assignments.
              </Alert>
            ) : (
              <p>This work location will be marked inactive and excluded from new employee assignments.</p>
            )}

            {deactivateError && <Alert variant="error">{deactivateError}</Alert>}

            <Inline gap="sm" justify="end">
              <Button
                variant="secondary"
                type="button"
                onClick={() => setDeactivateTarget(null)}
                disabled={deactivateSubmitting}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                type="button"
                onClick={() => void handleConfirmDeactivate()}
                disabled={deactivateSubmitting}
              >
                {deactivateSubmitting ? 'Deactivating...' : 'Confirm Deactivation'}
              </Button>
            </Inline>
          </Stack>
        )}
      </Modal>
    </Page>
  );
}
