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
} from '../../../design-system/components';
import { tenantAdminApi } from '../api/tenantAdminApi';
import type {
  BusinessUnitRecord,
  DepartmentRecord,
  DivisionRecord,
  EligibleHead,
  StructuralStatus,
  TenantAdminCompanySummary,
} from '../types/tenantAdmin.types';

export interface SelectedUnitToEdit {
  type: 'business_unit' | 'division' | 'department';
  data: BusinessUnitRecord | DivisionRecord | DepartmentRecord;
}

export interface EditUnitModalProps {
  isOpen: boolean;
  onClose: () => void;
  company: TenantAdminCompanySummary;
  selectedUnit: SelectedUnitToEdit | null;
  businessUnits: BusinessUnitRecord[];
  divisions: DivisionRecord[];
  eligibleHeads: EligibleHead[];
  onSuccess: () => Promise<void> | void;
}

export function EditUnitModal({
  isOpen,
  onClose,
  company,
  selectedUnit,
  businessUnits,
  divisions,
  eligibleHeads,
  onSuccess,
}: EditUnitModalProps) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [parentId, setParentId] = useState('');
  const [headEmployeeId, setHeadEmployeeId] = useState('');
  const [status, setStatus] = useState<StructuralStatus>('active');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && selectedUnit) {
      setName(selectedUnit.data.name || '');
      setCode(selectedUnit.data.code || '');
      setDescription(selectedUnit.data.description || '');
      setHeadEmployeeId(selectedUnit.data.headEmployeeId || '');
      setStatus((selectedUnit.data.status as StructuralStatus) || 'active');
      setError(null);

      if (selectedUnit.type === 'division') {
        setParentId((selectedUnit.data as DivisionRecord).businessUnitId || '');
      } else if (selectedUnit.type === 'department') {
        setParentId((selectedUnit.data as DepartmentRecord).divisionId || '');
      } else {
        setParentId('');
      }
    }
  }, [isOpen, selectedUnit]);

  const buOptions = useMemo(
    () => [
      { value: '', label: 'Select Parent Business Unit' },
      ...businessUnits.map((bu) => ({
        value: bu.id,
        label: bu.code ? `${bu.name} (${bu.code})` : bu.name,
      })),
    ],
    [businessUnits],
  );

  const divisionOptions = useMemo(
    () => [
      { value: '', label: 'Select Parent Division' },
      ...divisions.map((div) => ({
        value: div.id,
        label: div.code ? `${div.name} (${div.code})` : div.name,
      })),
    ],
    [divisions],
  );

  const headOptions = useMemo(
    () => [
      { value: '', label: 'Select Head of Unit (Optional)' },
      ...eligibleHeads.map((h) => ({
        value: h.id,
        label: h.designationName
          ? `${h.fullName} (${h.designationName})`
          : `${h.fullName} (${h.employeeNumber})`,
      })),
    ],
    [eligibleHeads],
  );

  if (!selectedUnit) return null;

  const unitTypeName =
    selectedUnit.type === 'business_unit'
      ? 'Business Unit'
      : selectedUnit.type === 'division'
        ? 'Division'
        : 'Department';

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Unit name is required.');
      return;
    }

    if (selectedUnit.type === 'division' && !parentId) {
      setError('Please select a parent Business Unit.');
      return;
    }

    if (selectedUnit.type === 'department' && !parentId) {
      setError('Please select a parent Division.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (selectedUnit.type === 'business_unit') {
        await tenantAdminApi.updateCompanyBusinessUnit(company.id, selectedUnit.data.id, {
          name: name.trim(),
          code: code.trim() || null,
          description: description.trim() || null,
          headEmployeeId: headEmployeeId || null,
          status,
        });
      } else if (selectedUnit.type === 'division') {
        await tenantAdminApi.updateCompanyDivision(company.id, selectedUnit.data.id, {
          businessUnitId: parentId,
          name: name.trim(),
          code: code.trim() || null,
          description: description.trim() || null,
          headEmployeeId: headEmployeeId || null,
          status,
        });
      } else if (selectedUnit.type === 'department') {
        const selectedDivision = divisions.find((d) => d.id === parentId);
        await tenantAdminApi.updateCompanyDepartment(company.id, selectedUnit.data.id, {
          divisionId: parentId,
          businessUnitId: selectedDivision?.businessUnitId || null,
          name: name.trim(),
          code: code.trim() || null,
          description: description.trim() || null,
          headEmployeeId: headEmployeeId || null,
          status,
        });
      }

      await onSuccess();
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update organization unit';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Edit ${unitTypeName}`}
      description={`Update settings for ${selectedUnit.data.name}.`}
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

          {/* Parent field governed by canonical rules */}
          {selectedUnit.type === 'business_unit' && (
            <FormField label="Parent">
              <Input
                value={`${company.name} (Company)`}
                disabled
                readOnly
              />
            </FormField>
          )}

          {selectedUnit.type === 'division' && (
            <FormField label="Parent Business Unit" required>
              <Select
                value={parentId}
                onChange={(e) => setParentId(e.target.value)}
                options={buOptions}
                required
              />
            </FormField>
          )}

          {selectedUnit.type === 'department' && (
            <FormField label="Parent Division" required>
              <Select
                value={parentId}
                onChange={(e) => setParentId(e.target.value)}
                options={divisionOptions}
                required
              />
            </FormField>
          )}

          <FormField label="Unit Name" required>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </FormField>

          <FormGrid columns={2}>
            <FormField label="Unit Code">
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="e.g. CODE-01"
              />
            </FormField>

            <FormField label="Status" required>
              <Select
                value={status}
                onChange={(e) => setStatus(e.target.value as StructuralStatus)}
                options={[
                  { value: 'active', label: 'Active' },
                  { value: 'inactive', label: 'Inactive' },
                ]}
              />
            </FormField>
          </FormGrid>

          <FormField label="Head of Unit">
            <Select
              value={headEmployeeId}
              onChange={(e) => setHeadEmployeeId(e.target.value)}
              options={headOptions}
            />
          </FormField>

          <FormField label="Description">
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this unit's scope and function"
            />
          </FormField>
        </Stack>
      </form>
    </Modal>
  );
}
