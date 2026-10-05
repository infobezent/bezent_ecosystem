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
  Toolbar,
} from '../../../../../design-system/components';
import { BezentIcon } from '../../../../../design-system/icons';
import { useAuthorization } from '../../../../../platform/auth';
import {
  fetchDesignations,
  createDesignation,
  updateDesignation,
  deactivateDesignation,
  reactivateDesignation,
} from './api/designationApi';
import { fetchDepartments } from '../../../../company-admin/organization/api/departmentApi';
import type { DesignationRecord, DesignationStatus } from './types/designation';
import type { DepartmentRecord } from '../../../../company-admin/organization/types/department';

export interface DesignationsSectionProps {
  onBack?: () => void;
  onNavigateToDepartments?: () => void;
  onNavigateToStructure?: () => void;
}

export function DesignationsSection({
  onBack,
  onNavigateToDepartments: _onNavigateToDepartments,
  onNavigateToStructure: _onNavigateToStructure,
}: DesignationsSectionProps) {
  const { canAny } = useAuthorization();

  const canManage = canAny([
    'organization.designations.manage',
    'hrms.organization.manage',
    'hrms.settings.manage',
  ]);

  // Data state
  const [designations, setDesignations] = useState<DesignationRecord[]>([]);
  const [departments, setDepartments] = useState<DepartmentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [deptFilter, setDeptFilter] = useState<string>('all');

  // Modal / Form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDesignation, setEditingDesignation] = useState<DesignationRecord | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form input fields
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formDepartmentId, setFormDepartmentId] = useState('');
  const [formStatus, setFormStatus] = useState<DesignationStatus>('active');
  const [confirmStructuralMove, setConfirmStructuralMove] = useState(false);

  // Deactivate confirmation modal
  const [deactivateTarget, setDeactivateTarget] = useState<DesignationRecord | null>(null);

  // Load designations and departments
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [desigList, deptList] = await Promise.all([
        fetchDesignations({ status: 'all' }),
        fetchDepartments({ status: 'all' }),
      ]);
      setDesignations(desigList);
      setDepartments(deptList);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load designations data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Filtered designations
  const filteredDesignations = useMemo(() => {
    return designations.filter((d) => {
      // Status filter
      if (statusFilter !== 'all' && d.status !== statusFilter) return false;

      // Department filter
      if (deptFilter === 'company-wide' && d.departmentId !== null) return false;
      if (deptFilter !== 'all' && deptFilter !== 'company-wide' && d.departmentId !== deptFilter) {
        return false;
      }

      // Search query filter
      if (searchQuery.trim().length > 0) {
        const query = searchQuery.trim().toLowerCase();
        const matchesName = d.name.toLowerCase().includes(query);
        const matchesCode = d.code ? d.code.toLowerCase().includes(query) : false;
        const matchesDept = d.departmentName
          ? d.departmentName.toLowerCase().includes(query)
          : false;
        if (!matchesName && !matchesCode && !matchesDept) return false;
      }

      return true;
    });
  }, [designations, statusFilter, deptFilter, searchQuery]);

  // Counts
  const counts = useMemo(() => {
    const total = designations.length;
    const active = designations.filter((d) => d.status === 'active').length;
    const inactive = designations.filter((d) => d.status === 'inactive').length;
    const companyWide = designations.filter((d) => d.departmentId === null).length;
    const deptSpecific = designations.filter((d) => d.departmentId !== null).length;
    return { total, active, inactive, companyWide, deptSpecific };
  }, [designations]);

  // Open modal for Create
  const openAddModal = () => {
    setEditingDesignation(null);
    setFormName('');
    setFormCode('');
    setFormDescription('');
    setFormDepartmentId('');
    setFormStatus('active');
    setConfirmStructuralMove(false);
    setFormError(null);
    setIsModalOpen(true);
  };

  // Open modal for Edit
  const openEditModal = (desig: DesignationRecord) => {
    setEditingDesignation(desig);
    setFormName(desig.name);
    setFormCode(desig.code ?? '');
    setFormDescription(desig.description ?? '');
    setFormDepartmentId(desig.departmentId ?? '');
    setFormStatus(desig.status);
    setConfirmStructuralMove(false);
    setFormError(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingDesignation(null);
    setFormError(null);
    setConfirmStructuralMove(false);
  };

  // Check if current edit form constitutes a structural move
  const isStructuralMove = useMemo(() => {
    if (!editingDesignation) return false;
    const currentDept = editingDesignation.departmentId ?? '';
    const newDept = formDepartmentId.trim();
    return currentDept !== newDept;
  }, [editingDesignation, formDepartmentId]);

  // Form submit handler
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setFormError('Designation name is required.');
      return;
    }

    if (
      isStructuralMove &&
      editingDesignation &&
      editingDesignation.activeEmployeeCount > 0 &&
      !confirmStructuralMove
    ) {
      setFormError(
        `${editingDesignation.activeEmployeeCount} active employee(s) use this designation. You must confirm this structural move before saving.`,
      );
      return;
    }

    try {
      setActionLoading(true);
      setFormError(null);

      if (editingDesignation) {
        await updateDesignation(editingDesignation.id, {
          name: formName.trim(),
          code: formCode.trim() || null,
          description: formDescription.trim() || null,
          departmentId: formDepartmentId.trim() || null,
          status: formStatus,
          confirmStructuralMove: isStructuralMove ? confirmStructuralMove : undefined,
        });
        setActionSuccess(`Designation "${formName.trim()}" updated successfully.`);
      } else {
        await createDesignation({
          name: formName.trim(),
          code: formCode.trim() || null,
          description: formDescription.trim() || null,
          departmentId: formDepartmentId.trim() || null,
          status: formStatus,
        });
        setActionSuccess(`Designation "${formName.trim()}" created successfully.`);
      }

      closeModal();
      await loadData();
    } catch (err: unknown) {
      const errorObj = err as { code?: string; message?: string };
      if (errorObj?.code === 'STRUCTURAL_MOVE_CONFIRMATION_REQUIRED') {
        setFormError(
          errorObj.message ??
            'Active employees currently use this designation. Explicit confirmation required.',
        );
      } else {
        setFormError(errorObj?.message ?? 'Failed to save designation.');
      }
    } finally {
      setActionLoading(false);
    }
  };

  // Deactivate handler
  const handleConfirmDeactivate = async () => {
    if (!deactivateTarget) return;
    try {
      setActionLoading(true);
      const res = await deactivateDesignation(deactivateTarget.id);
      setActionSuccess(res.message);
      setDeactivateTarget(null);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to deactivate designation.');
    } finally {
      setActionLoading(false);
    }
  };

  // Reactivate handler
  const handleReactivate = async (desig: DesignationRecord) => {
    try {
      setActionLoading(true);
      await reactivateDesignation(desig.id);
      setActionSuccess(`Designation "${desig.name}" reactivated successfully.`);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reactivate designation.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <Page maxWidth="full" gap="md">
      <Stack gap="lg" align="stretch">
        {/* Navigation Breadcrumb Toolbar */}
        <Toolbar align="center">
          <div className="bezent-toolbar__right">
            <Inline gap="xs" align="center">
              {onBack && (
                <Button variant="ghost" size="sm" onClick={onBack}>
                  <BezentIcon name="arrow_back" size={16} />
                  Settings
                </Button>
              )}
              <span>Settings</span>
              <span>/</span>
              <span>Organization</span>
              <span>/</span>
              <strong>Designations</strong>
            </Inline>
          </div>
        </Toolbar>

        {/* Page Header */}
        <PageHeader
          title="Designations"
          subtitle="Define organizational job titles, company-wide roles, and department-specific designations."
          actions={
            canManage ? (
              <Button variant="primary" onClick={openAddModal}>
                <BezentIcon name="add" size={16} />
                Add Designation
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
                  placeholder="Search designations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onClear={() => setSearchQuery('')}
                />

                <Select
                  aria-label="Filter by Status"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
                  options={[
                    { value: 'all', label: 'All Statuses' },
                    { value: 'active', label: 'Active Only' },
                    { value: 'inactive', label: 'Inactive Only' },
                  ]}
                />

                <Select
                  aria-label="Filter by Scope or Department"
                  value={deptFilter}
                  onChange={(e) => setDeptFilter(e.target.value)}
                  options={[
                    { value: 'all', label: 'All Scopes' },
                    { value: 'company-wide', label: 'Company-wide Only' },
                    ...departments.map((d) => ({
                      value: d.id,
                      label: `${d.name} (${d.code ?? 'Dept'})`,
                    })),
                  ]}
                />
              </Inline>

              <Inline gap="xs" align="center" wrap>
                <Badge variant="neutral">Total: {counts.total}</Badge>
                <Badge variant="success">Active: {counts.active}</Badge>
                {counts.inactive > 0 && (
                  <Badge variant="warning">Inactive: {counts.inactive}</Badge>
                )}
                <Badge variant="neutral">Company-wide: {counts.companyWide}</Badge>
                <Badge variant="neutral">Department-specific: {counts.deptSpecific}</Badge>
              </Inline>
            </Inline>
          </CardBody>
        </Card>

        {/* Designations Table or Empty/Loading State */}
        {loading ? (
          <LoadingState label="Loading designations..." />
        ) : filteredDesignations.length === 0 ? (
          <EmptyState
            title="No designations found"
            description={
              searchQuery || statusFilter !== 'all' || deptFilter !== 'all'
                ? 'No designations match the selected filters.'
                : 'No designations have been configured for this company yet.'
            }
            primaryAction={
              canManage && !searchQuery && statusFilter === 'all' && deptFilter === 'all'
                ? {
                    label: 'Add Designation',
                    onClick: openAddModal,
                  }
                : undefined
            }
          />
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Designation</TableHeaderCell>
                <TableHeaderCell>Code</TableHeaderCell>
                <TableHeaderCell>Organizational Scope</TableHeaderCell>
                <TableHeaderCell>Active Employees</TableHeaderCell>
                <TableHeaderCell>Status</TableHeaderCell>
                <TableHeaderCell align="right">Actions</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredDesignations.map((desig) => (
                <TableRow key={desig.id}>
                  <TableCell>
                    <Stack gap="xs">
                      <strong>{desig.name}</strong>
                      {desig.description && <small>{desig.description}</small>}
                    </Stack>
                  </TableCell>
                  <TableCell>{desig.code ? <code>{desig.code}</code> : '—'}</TableCell>
                  <TableCell>
                    {desig.departmentName ? (
                      <Inline gap="xs" align="center">
                        <Badge variant="neutral">{desig.departmentName}</Badge>
                      </Inline>
                    ) : (
                      <Badge variant="neutral">Company-wide</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={desig.activeEmployeeCount > 0 ? 'success' : 'neutral'}>
                      {desig.activeEmployeeCount} employee
                      {desig.activeEmployeeCount === 1 ? '' : 's'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={desig.status === 'active' ? 'success' : 'neutral'}>
                      {desig.status === 'active' ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell align="right">
                    {canManage && (
                      <Inline gap="xs" justify="end">
                        <Button variant="secondary" size="sm" onClick={() => openEditModal(desig)}>
                          <BezentIcon name="edit" size={14} />
                          Edit
                        </Button>

                        {desig.status === 'active' ? (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setDeactivateTarget(desig)}
                          >
                            Deactivate
                          </Button>
                        ) : (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleReactivate(desig)}
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

      {/* Add / Edit Designation Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingDesignation ? 'Edit Designation' : 'Add Designation'}
        size="lg"
      >
        <form onSubmit={handleSubmit}>
          <Stack gap="md">
            {formError && <Alert variant="danger">{formError}</Alert>}

            {/* Section 1: DESIGNATION DETAILS */}
            <Stack gap="sm">
              <Inline gap="xs" align="center">
                <strong>DESIGNATION DETAILS</strong>
              </Inline>

              <FormGrid columns={2}>
                <FormField
                  label="Designation Name"
                  htmlFor="desig-form-name"
                  required
                  helperText="Official job title (e.g. Software Engineer, Financial Analyst)"
                >
                  <Input
                    id="desig-form-name"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Senior Software Engineer"
                    required
                  />
                </FormField>

                <FormField
                  label="Designation Code"
                  htmlFor="desig-form-code"
                  helperText="Optional identifier unique within this company"
                >
                  <Input
                    id="desig-form-code"
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                    placeholder="e.g. SSE"
                  />
                </FormField>
              </FormGrid>

              <FormField
                label="Description"
                htmlFor="desig-form-desc"
                helperText="Optional functional summary or role scope"
              >
                <Input
                  id="desig-form-desc"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Optional brief description of role expectations"
                />
              </FormField>
            </Stack>

            {/* Section 2: ORGANIZATION MAPPING */}
            <Stack gap="sm">
              <Inline gap="xs" align="center">
                <strong>ORGANIZATION MAPPING</strong>
              </Inline>

              <FormGrid columns={2}>
                <FormField
                  label="Department"
                  htmlFor="desig-form-dept"
                  helperText="Optional: Leave blank for company-wide designations"
                >
                  <Select
                    id="desig-form-dept"
                    value={formDepartmentId}
                    onChange={(e) => setFormDepartmentId(e.target.value)}
                    options={[
                      { value: '', label: 'Company-wide (No department)' },
                      ...departments
                        .filter(
                          (d) =>
                            d.status === 'active' ||
                            (editingDesignation && d.id === editingDesignation.departmentId),
                        )
                        .map((d) => ({
                          value: d.id,
                          label: `${d.name} (${d.code ?? 'Dept'})`,
                        })),
                    ]}
                  />
                </FormField>

                <FormField
                  label="Job Level / Grade"
                  htmlFor="desig-form-joblevel"
                  helperText="Not yet configured — Job Level master pending"
                  disabled
                >
                  <Select
                    id="desig-form-joblevel"
                    value=""
                    disabled
                    options={[{ value: '', label: 'None (Job Level master pending)' }]}
                  />
                </FormField>
              </FormGrid>

              {/* Structural Move Warning Alert */}
              {isStructuralMove &&
                editingDesignation &&
                editingDesignation.activeEmployeeCount > 0 && (
                  <Alert variant="warning">
                    <Stack gap="xs">
                      <strong>Structural Move Impact</strong>
                      <span>
                        {editingDesignation.activeEmployeeCount} active employee(s) currently use
                        this designation. Changing the department mapping will not move or modify
                        those employees.
                      </span>
                      <Inline gap="xs" align="center">
                        <input
                          type="checkbox"
                          id="desig-confirm-move"
                          checked={confirmStructuralMove}
                          onChange={(e) => setConfirmStructuralMove(e.target.checked)}
                        />
                        <label htmlFor="desig-confirm-move">
                          I confirm this structural mapping change without altering employee
                          assignments.
                        </label>
                      </Inline>
                    </Stack>
                  </Alert>
                )}
            </Stack>

            {/* Section 3: STATUS */}
            <Stack gap="sm">
              <Inline gap="xs" align="center">
                <strong>STATUS</strong>
              </Inline>
              <FormGrid columns={2}>
                <FormField label="Status" htmlFor="desig-form-status">
                  <Select
                    id="desig-form-status"
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as DesignationStatus)}
                    options={[
                      { value: 'active', label: 'Active' },
                      { value: 'inactive', label: 'Inactive' },
                    ]}
                  />
                </FormField>
              </FormGrid>
            </Stack>

            {/* Modal Actions */}
            <Inline gap="sm" justify="end">
              <Button
                variant="secondary"
                type="button"
                onClick={closeModal}
                disabled={actionLoading}
              >
                Cancel
              </Button>
              <Button variant="primary" type="submit" disabled={actionLoading}>
                {actionLoading
                  ? 'Saving...'
                  : editingDesignation
                    ? 'Save Changes'
                    : 'Create Designation'}
              </Button>
            </Inline>
          </Stack>
        </form>
      </Modal>

      {/* Deactivate Confirmation Modal */}
      <Modal
        isOpen={Boolean(deactivateTarget)}
        onClose={() => setDeactivateTarget(null)}
        title="Confirm Deactivation"
        size="md"
      >
        {deactivateTarget && (
          <Stack gap="md">
            <span>
              Are you sure you want to deactivate designation{' '}
              <strong>&ldquo;{deactivateTarget.name}&rdquo;</strong>?
            </span>

            {deactivateTarget.activeEmployeeCount > 0 ? (
              <Alert variant="warning">
                <strong>Employee Impact Notice:</strong> {deactivateTarget.activeEmployeeCount}{' '}
                active employee(s) currently hold this designation. Deactivating will not unassign
                or change them, but will prevent this designation from being chosen for new
                assignments.
              </Alert>
            ) : (
              <span>This designation has no active employees attached.</span>
            )}

            <Inline gap="sm" justify="end">
              <Button
                variant="secondary"
                onClick={() => setDeactivateTarget(null)}
                disabled={actionLoading}
              >
                Cancel
              </Button>
              <Button variant="primary" onClick={handleConfirmDeactivate} disabled={actionLoading}>
                {actionLoading ? 'Deactivating...' : 'Confirm Deactivation'}
              </Button>
            </Inline>
          </Stack>
        )}
      </Modal>
    </Page>
  );
}

export default DesignationsSection;
