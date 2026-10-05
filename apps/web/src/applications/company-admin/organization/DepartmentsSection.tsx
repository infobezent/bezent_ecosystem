import { useState, useEffect, useCallback, useMemo } from 'react';
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
  Label,
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
  TableHead,
  TableHeaderCell,
  TableRow,
  Toolbar,
} from '../../../design-system/components';
import { BezentIcon } from '../../../design-system/icons';
import { useAuthorization } from '../../../platform/auth';
import {
  fetchDepartments,
  createDepartment,
  updateDepartment,
  deactivateDepartment,
  reactivateDepartment,
} from './api/departmentApi';
import {
  fetchBusinessUnits,
  fetchDivisions,
  fetchEligibleHeads,
} from './api/structureApi';
import type {
  DepartmentRecord,
  DepartmentStatus,
  CreateDepartmentPayload,
  UpdateDepartmentPayload,
} from './types/department';
import type {
  BusinessUnitRecord,
  DivisionRecord,
  EligibleHead,
} from './types/structure';

export interface DepartmentsSectionProps {
  onBack?: () => void;
  onNavigateToStructure?: () => void;
  onNavigateToProfile?: () => void;
}

export function DepartmentsSection({
  onBack,
  onNavigateToStructure: _onNavigateToStructure,
  onNavigateToProfile: _onNavigateToProfile,
}: DepartmentsSectionProps) {
  const { canAny } = useAuthorization();

  const canManage = canAny([
    'organization.departments.manage',
    'hrms.organization.manage',
    'hrms.settings.manage',
  ]);

  // Data state
  const [departments, setDepartments] = useState<DepartmentRecord[]>([]);
  const [businessUnits, setBusinessUnits] = useState<BusinessUnitRecord[]>([]);
  const [divisions, setDivisions] = useState<DivisionRecord[]>([]);
  const [heads, setHeads] = useState<EligibleHead[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [buFilter, setBuFilter] = useState<string>('');
  const [divFilter, setDivFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modal / Form state
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingDepartment, setEditingDepartment] = useState<DepartmentRecord | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const [formName, setFormName] = useState<string>('');
  const [formCode, setFormCode] = useState<string>('');
  const [formDescription, setFormDescription] = useState<string>('');
  const [formBusinessUnitId, setFormBusinessUnitId] = useState<string>('');
  const [formDivisionId, setFormDivisionId] = useState<string>('');
  const [formParentDepartmentId, setFormParentDepartmentId] = useState<string>('');
  const [formHeadEmployeeId, setFormHeadEmployeeId] = useState<string>('');
  const [formStatus, setFormStatus] = useState<DepartmentStatus>('active');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [deptList, buList, divList, headList] = await Promise.all([
        fetchDepartments({ status: 'all' }),
        fetchBusinessUnits().catch(() => []),
        fetchDivisions().catch(() => []),
        fetchEligibleHeads().catch(() => []),
      ]);
      setDepartments(deptList);
      setBusinessUnits(buList);
      setDivisions(divList);
      setHeads(headList);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load departments');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filter divisions reactive to selected Business Unit in modal form
  const modalDivisionOptions = useMemo(() => {
    const list = formBusinessUnitId
      ? divisions.filter((d) => d.businessUnitId === formBusinessUnitId && d.status === 'active')
      : divisions.filter((d) => d.status === 'active');
    return [
      { value: '', label: 'None' },
      ...list.map((d) => ({
        value: d.id,
        label: d.businessUnitName ? `${d.name} (${d.businessUnitName})` : d.name,
      })),
    ];
  }, [divisions, formBusinessUnitId]);

  // Parent department options (excluding current editing department)
  const modalParentDepartmentOptions = useMemo(() => {
    return [
      { value: '', label: 'None (Top-level Department)' },
      ...departments
        .filter((d) => d.status === 'active' && (!editingDepartment || d.id !== editingDepartment.id))
        .map((d) => ({ value: d.id, label: d.code ? `${d.name} (${d.code})` : d.name })),
    ];
  }, [departments, editingDepartment]);

  const openAddModal = () => {
    setEditingDepartment(null);
    setFormName('');
    setFormCode('');
    setFormDescription('');
    setFormBusinessUnitId('');
    setFormDivisionId('');
    setFormParentDepartmentId('');
    setFormHeadEmployeeId('');
    setFormStatus('active');
    setFormErrors({});
    setIsModalOpen(true);
  };

  const openEditModal = (dept: DepartmentRecord) => {
    setEditingDepartment(dept);
    setFormName(dept.name);
    setFormCode(dept.code ?? '');
    setFormDescription(dept.description ?? '');
    setFormBusinessUnitId(dept.businessUnitId ?? '');
    setFormDivisionId(dept.divisionId ?? '');
    setFormParentDepartmentId(dept.parentDepartmentId ?? '');
    setFormHeadEmployeeId(dept.headEmployeeId ?? '');
    setFormStatus(dept.status);
    setFormErrors({});
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingDepartment(null);
    setFormErrors({});
  };

  const handleBuChange = (buId: string) => {
    setFormBusinessUnitId(buId);
    // If current division doesn't belong to the newly selected BU, clear division
    if (formDivisionId && buId) {
      const match = divisions.find((d) => d.id === formDivisionId);
      if (match && match.businessUnitId !== buId) {
        setFormDivisionId('');
      }
    }
  };

  const handleDivisionChange = (divId: string) => {
    setFormDivisionId(divId);
    if (divId) {
      const match = divisions.find((d) => d.id === divId);
      if (match && match.businessUnitId && match.businessUnitId !== formBusinessUnitId) {
        setFormBusinessUnitId(match.businessUnitId);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};

    if (!formName.trim()) {
      errors.name = 'Department name is required';
    } else if (formName.trim().length > 255) {
      errors.name = 'Department name cannot exceed 255 characters';
    }

    if (formCode.trim().length > 50) {
      errors.code = 'Department code cannot exceed 50 characters';
    }

    if (formDescription.trim().length > 1000) {
      errors.description = 'Description cannot exceed 1000 characters';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    try {
      setActionLoading(true);
      setError(null);

      if (editingDepartment) {
        const payload: UpdateDepartmentPayload = {
          name: formName.trim(),
          code: formCode.trim() || null,
          description: formDescription.trim() || null,
          businessUnitId: formBusinessUnitId || null,
          divisionId: formDivisionId || null,
          parentDepartmentId: formParentDepartmentId || null,
          headEmployeeId: formHeadEmployeeId || null,
          status: formStatus,
        };
        await updateDepartment(editingDepartment.id, payload);
        setActionSuccess(`Department "${formName.trim()}" updated successfully.`);
      } else {
        const payload: CreateDepartmentPayload = {
          name: formName.trim(),
          code: formCode.trim() || null,
          description: formDescription.trim() || null,
          businessUnitId: formBusinessUnitId || null,
          divisionId: formDivisionId || null,
          parentDepartmentId: formParentDepartmentId || null,
          headEmployeeId: formHeadEmployeeId || null,
          status: formStatus,
        };
        await createDepartment(payload);
        setActionSuccess(`Department "${formName.trim()}" created successfully.`);
      }

      closeModal();
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Operation failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeactivate = async (dept: DepartmentRecord) => {
    if (dept.childDepartmentCount > 0) {
      setError(
        `Cannot deactivate department "${dept.name}" because it has ${dept.childDepartmentCount} sub-department(s). Deactivate or reassign child departments first.`,
      );
      return;
    }

    try {
      setActionLoading(true);
      setError(null);
      await deactivateDepartment(dept.id);
      setActionSuccess(`Department "${dept.name}" deactivated.`);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to deactivate department');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReactivate = async (dept: DepartmentRecord) => {
    try {
      setActionLoading(true);
      setError(null);
      await reactivateDepartment(dept.id);
      setActionSuccess(`Department "${dept.name}" reactivated.`);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reactivate department');
    } finally {
      setActionLoading(false);
    }
  };

  // Filtered department list for table
  const filteredDepartments = useMemo(() => {
    return departments.filter((d) => {
      if (statusFilter !== 'all' && d.status !== statusFilter) return false;
      if (buFilter && d.businessUnitId !== buFilter) return false;
      if (divFilter && d.divisionId !== divFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesName = d.name.toLowerCase().includes(q);
        const matchesCode = d.code ? d.code.toLowerCase().includes(q) : false;
        const matchesHead = d.headEmployeeName ? d.headEmployeeName.toLowerCase().includes(q) : false;
        if (!matchesName && !matchesCode && !matchesHead) return false;
      }
      return true;
    });
  }, [departments, statusFilter, buFilter, divFilter, searchQuery]);

  return (
    <Page maxWidth="full">
      <Stack gap="lg">
        {/* Navigation Breadcrumbs / Toolbar */}
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
              <strong>Departments</strong>
            </Inline>
          }
        />

        {/* Page Header */}
        <PageHeader
          title="Departments"
          subtitle="Define organizational departments, placements under Business Units and Divisions, and parent hierarchies."
          actions={
            canManage ? (
              <Button variant="primary" type="button" onClick={openAddModal}>
                <BezentIcon name="add" size={16} />
                Add Department
              </Button>
            ) : undefined
          }
        />

        {/* Alerts */}
        {error && (
          <Alert variant="danger">
            <Inline justify="between" align="center">
              <span>{error}</span>
              <Button variant="secondary" size="sm" onClick={() => setError(null)}>
                Dismiss
              </Button>
            </Inline>
          </Alert>
        )}

        {actionSuccess && (
          <Alert variant="success">
            <Inline justify="between" align="center">
              <span>{actionSuccess}</span>
              <Button variant="secondary" size="sm" onClick={() => setActionSuccess(null)}>
                Dismiss
              </Button>
            </Inline>
          </Alert>
        )}

        {/* Filters Toolbar */}
        <Card variant="flat" padding="md">
          <CardBody>
            <Inline gap="md" align="center" wrap justify="between">
              <Inline gap="sm" align="center" wrap>
                <SearchInput
                  placeholder="Search departments..."
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

                {businessUnits.length > 0 && (
                  <Select
                    aria-label="Filter by Business Unit"
                    value={buFilter}
                    onChange={(e) => setBuFilter(e.target.value)}
                    options={[
                      { value: '', label: 'All Business Units' },
                      ...businessUnits.map((b) => ({ value: b.id, label: b.name })),
                    ]}
                  />
                )}

                {divisions.length > 0 && (
                  <Select
                    aria-label="Filter by Division"
                    value={divFilter}
                    onChange={(e) => setDivFilter(e.target.value)}
                    options={[
                      { value: '', label: 'All Divisions' },
                      ...divisions.map((d) => ({ value: d.id, label: d.name })),
                    ]}
                  />
                )}
              </Inline>

              <Inline gap="xs" align="center">
                <Badge variant="neutral">Total: {departments.length}</Badge>
                <Badge variant="success">
                  Active: {departments.filter((d) => d.status === 'active').length}
                </Badge>
                {departments.some((d) => d.status === 'inactive') && (
                  <Badge variant="warning">
                    Inactive: {departments.filter((d) => d.status === 'inactive').length}
                  </Badge>
                )}
              </Inline>
            </Inline>
          </CardBody>
        </Card>

        {/* Department Table or Empty/Loading State */}
        {loading ? (
          <LoadingState label="Loading departments..." />
        ) : filteredDepartments.length === 0 ? (
          <EmptyState
            title="No departments found"
            description={
              searchQuery || statusFilter !== 'all' || buFilter || divFilter
                ? 'No departments match the selected filters.'
                : 'No departments have been configured for this company yet.'
            }
            primaryAction={
              canManage && !searchQuery && statusFilter === 'all' && !buFilter && !divFilter
                ? {
                    label: 'Add Department',
                    onClick: openAddModal,
                  }
                : undefined
            }
          />
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Department Name</TableHeaderCell>
                <TableHeaderCell>Code</TableHeaderCell>
                <TableHeaderCell>Business Unit</TableHeaderCell>
                <TableHeaderCell>Division</TableHeaderCell>
                <TableHeaderCell>Parent Department</TableHeaderCell>
                <TableHeaderCell>Department Head</TableHeaderCell>
                <TableHeaderCell>Status</TableHeaderCell>
                {canManage && <TableHeaderCell>Actions</TableHeaderCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredDepartments.map((dept) => (
                <TableRow key={dept.id}>
                  <TableCell>
                    <Stack gap="xs">
                      <strong>{dept.name}</strong>
                      {dept.description && (
                        <small>{dept.description}</small>
                      )}
                      {dept.childDepartmentCount > 0 && (
                        <small>↳ {dept.childDepartmentCount} sub-department(s)</small>
                      )}
                    </Stack>
                  </TableCell>
                  <TableCell>{dept.code ? <code>{dept.code}</code> : '—'}</TableCell>
                  <TableCell>{dept.businessUnitName ?? '—'}</TableCell>
                  <TableCell>{dept.divisionName ?? '—'}</TableCell>
                  <TableCell>{dept.parentDepartmentName ?? '—'}</TableCell>
                  <TableCell>
                    {dept.headEmployeeName ? (
                      <Inline gap="xs" align="center">
                        <BezentIcon name="user" size={14} />
                        <span>{dept.headEmployeeName}</span>
                      </Inline>
                    ) : (
                      '—'
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={dept.status === 'active' ? 'success' : 'neutral'}>
                      {dept.status === 'active' ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  {canManage && (
                    <TableCell>
                      <Inline gap="xs">
                        <Button
                          variant="secondary"
                          size="sm"
                          type="button"
                          onClick={() => openEditModal(dept)}
                          disabled={actionLoading}
                        >
                          Edit
                        </Button>
                        {dept.status === 'active' ? (
                          <Button
                            variant="outline"
                            size="sm"
                            type="button"
                            onClick={() => handleDeactivate(dept)}
                            disabled={actionLoading}
                          >
                            Deactivate
                          </Button>
                        ) : (
                          <Button
                            variant="secondary"
                            size="sm"
                            type="button"
                            onClick={() => handleReactivate(dept)}
                            disabled={actionLoading}
                          >
                            Reactivate
                          </Button>
                        )}
                      </Inline>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Stack>

      {/* Create / Edit Department Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingDepartment ? 'Edit Department' : 'Add Department'}
        size="lg"
      >
        <form onSubmit={handleSubmit}>
          <Stack gap="lg">
            {/* Section 1: BASIC */}
            <Stack gap="sm">
              <Label>
                <strong>BASIC DETAILS</strong>
              </Label>
              <FormGrid columns={2}>
                <FormField
                  label="Department Name"
                  required
                  error={formErrors.name}
                  htmlFor="dept-form-name"
                >
                  <Input
                    id="dept-form-name"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Technology & Engineering"
                    autoFocus
                  />
                </FormField>

                <FormField
                  label="Department Code"
                  error={formErrors.code}
                  htmlFor="dept-form-code"
                >
                  <Input
                    id="dept-form-code"
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    placeholder="e.g. TECH"
                  />
                </FormField>
              </FormGrid>

              <FormField
                label="Description"
                error={formErrors.description}
                htmlFor="dept-form-desc"
              >
                <Input
                  id="dept-form-desc"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Optional brief description of this department's function"
                />
              </FormField>
            </Stack>

            {/* Section 2: ORGANIZATION PLACEMENT */}
            <Stack gap="sm">
              <Label>
                <strong>ORGANIZATION PLACEMENT</strong>
              </Label>
              <FormGrid columns={3}>
                <FormField
                  label="Business Unit"
                  htmlFor="dept-form-bu"
                  helperText="Optional layer under Company"
                >
                  <Select
                    id="dept-form-bu"
                    value={formBusinessUnitId}
                    onChange={(e) => handleBuChange(e.target.value)}
                    options={[
                      { value: '', label: 'None (Direct to Company)' },
                      ...businessUnits
                        .filter((b) => b.status === 'active' || b.id === formBusinessUnitId)
                        .map((b) => ({ value: b.id, label: b.name })),
                    ]}
                  />
                </FormField>

                <FormField
                  label="Division"
                  htmlFor="dept-form-div"
                  helperText="Optional layer under BU"
                >
                  <Select
                    id="dept-form-div"
                    value={formDivisionId}
                    onChange={(e) => handleDivisionChange(e.target.value)}
                    options={modalDivisionOptions}
                  />
                </FormField>

                <FormField
                  label="Parent Department"
                  htmlFor="dept-form-parent"
                  helperText="Optional higher-level department"
                >
                  <Select
                    id="dept-form-parent"
                    value={formParentDepartmentId}
                    onChange={(e) => setFormParentDepartmentId(e.target.value)}
                    options={modalParentDepartmentOptions}
                  />
                </FormField>
              </FormGrid>
            </Stack>

            {/* Section 3: MANAGEMENT */}
            <Stack gap="sm">
              <Label>
                <strong>MANAGEMENT & STATUS</strong>
              </Label>
              <FormGrid columns={2}>
                <FormField
                  label="Department Head"
                  htmlFor="dept-form-head"
                  helperText="Active employee in company"
                >
                  <Select
                    id="dept-form-head"
                    value={formHeadEmployeeId}
                    onChange={(e) => setFormHeadEmployeeId(e.target.value)}
                    options={[
                      { value: '', label: 'None' },
                      ...heads.map((h) => ({
                        value: h.id,
                        label: `${h.fullName} (${h.employeeNumber}${h.designationName ? ` - ${h.designationName}` : ''})`,
                      })),
                    ]}
                  />
                </FormField>

                <FormField
                  label="Status"
                  htmlFor="dept-form-status"
                >
                  <Select
                    id="dept-form-status"
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as DepartmentStatus)}
                    options={[
                      { value: 'active', label: 'Active' },
                      { value: 'inactive', label: 'Inactive' },
                    ]}
                  />
                </FormField>
              </FormGrid>
            </Stack>

            {/* Action buttons */}
            <Inline gap="sm" justify="end">
              <Button variant="secondary" type="button" onClick={closeModal} disabled={actionLoading}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" disabled={actionLoading}>
                {actionLoading
                  ? 'Saving...'
                  : editingDepartment
                    ? 'Save Changes'
                    : 'Create Department'}
              </Button>
            </Inline>
          </Stack>
        </form>
      </Modal>
    </Page>
  );
}

export default DepartmentsSection;
