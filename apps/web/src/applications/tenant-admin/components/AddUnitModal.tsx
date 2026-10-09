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
  DivisionRecord,
  EligibleHead,
  TenantAdminCompanySummary,
} from '../types/tenantAdmin.types';

export type UnitType = 'business_unit' | 'division' | 'department';

export interface AddUnitModalProps {
  isOpen: boolean;
  onClose: () => void;
  company: TenantAdminCompanySummary;
  businessUnits: BusinessUnitRecord[];
  divisions: DivisionRecord[];
  eligibleHeads: EligibleHead[];
  initialUnitType?: UnitType;
  initialParentId?: string;
  onSuccess: () => Promise<void> | void;
}

export function AddUnitModal({
  isOpen,
  onClose,
  company,
  businessUnits,
  divisions,
  eligibleHeads,
  initialUnitType = 'business_unit',
  initialParentId,
  onSuccess,
}: AddUnitModalProps) {
  const [unitType, setUnitType] = useState<UnitType>(initialUnitType);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [parentId, setParentId] = useState(initialParentId || '');
  const [headEmployeeId, setHeadEmployeeId] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync initial values when modal opens or initial props change
  useEffect(() => {
    if (isOpen) {
      setUnitType(initialUnitType);
      setName('');
      setCode('');
      setDescription('');
      setHeadEmployeeId('');
      setError(null);

      if (initialUnitType === 'division') {
        setParentId(initialParentId || (businessUnits[0]?.id ?? ''));
      } else if (initialUnitType === 'department') {
        setParentId(initialParentId || (divisions[0]?.id ?? ''));
      } else {
        setParentId('');
      }
    }
  }, [isOpen, initialUnitType, initialParentId, businessUnits, divisions]);

  // When unitType changes manually, reset/set sensible parentId default
  const handleUnitTypeChange = (newType: UnitType) => {
    setUnitType(newType);
    setError(null);
    if (newType === 'division') {
      setParentId(businessUnits[0]?.id ?? '');
    } else if (newType === 'department') {
      setParentId(divisions[0]?.id ?? '');
    } else {
      setParentId('');
    }
  };

  const buOptions = useMemo(
    () => [
      { value: '', label: 'Select Parent Business Unit' },
      ...businessUnits
        .filter((bu) => bu.status === 'active')
        .map((bu) => ({
          value: bu.id,
          label: bu.code ? `${bu.name} (${bu.code})` : bu.name,
        })),
    ],
    [businessUnits],
  );

  const divisionOptions = useMemo(
    () => [
      { value: '', label: 'Select Parent Division' },
      ...divisions
        .filter((div) => div.status === 'active')
        .map((div) => ({
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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Unit name is required.');
      return;
    }

    if (unitType === 'division' && !parentId) {
      setError('Please select a parent Business Unit.');
      return;
    }

    if (unitType === 'department' && !parentId) {
      setError('Please select a parent Division.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (unitType === 'business_unit') {
        await tenantAdminApi.createCompanyBusinessUnit(company.id, {
          name: name.trim(),
          code: code.trim() || null,
          description: description.trim() || null,
          headEmployeeId: headEmployeeId || null,
          status: 'active',
        });
      } else if (unitType === 'division') {
        await tenantAdminApi.createCompanyDivision(company.id, {
          businessUnitId: parentId,
          name: name.trim(),
          code: code.trim() || null,
          description: description.trim() || null,
          headEmployeeId: headEmployeeId || null,
          status: 'active',
        });
      } else if (unitType === 'department') {
        const selectedDivision = divisions.find((d) => d.id === parentId);
        await tenantAdminApi.createCompanyDepartment(company.id, {
          divisionId: parentId,
          businessUnitId: selectedDivision?.businessUnitId || null,
          name: name.trim(),
          code: code.trim() || null,
          description: description.trim() || null,
          headEmployeeId: headEmployeeId || null,
          status: 'active',
        });
      }

      await onSuccess();
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create organization unit';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Organization Unit"
      description={`Add a new organizational unit to ${company.name}.`}
      size="md"
      footer={
        <Inline gap="sm" justify="end">
          <Button variant="secondary" onClick={onClose} disabled={loading} type="button">
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} loading={loading} type="button">
            Add Unit
          </Button>
        </Inline>
      }
    >
      <form onSubmit={handleSubmit}>
        <Stack gap="md">
          {error && <Alert variant="danger">{error}</Alert>}

          <FormField label="Unit Type" required>
            <Select
              value={unitType}
              onChange={(e) => handleUnitTypeChange(e.target.value as UnitType)}
              disabled={businessUnits.length === 0}
              options={[
                { value: 'business_unit', label: 'Business Unit' },
                {
                  value: 'division',
                  label: 'Division',
                  disabled: businessUnits.filter((b) => b.status === 'active').length === 0,
                },
                {
                  value: 'department',
                  label: 'Department',
                  disabled: divisions.filter((d) => d.status === 'active').length === 0,
                },
              ]}
            />
          </FormField>

          {/* Parent field governed by canonical rules */}
          {unitType === 'business_unit' && (
            <FormField label="Parent">
              <Input
                value={`${company.name} (Company)`}
                disabled
                readOnly
              />
            </FormField>
          )}

          {unitType === 'division' && (
            <FormField label="Parent Business Unit" required>
              <Select
                value={parentId}
                onChange={(e) => setParentId(e.target.value)}
                options={buOptions}
                required
              />
            </FormField>
          )}

          {unitType === 'department' && (
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
              placeholder={
                unitType === 'business_unit'
                  ? 'e.g. Engineering, Corporate Operations'
                  : unitType === 'division'
                    ? 'e.g. Product Division, Services Division'
                    : 'e.g. Software, Quality Assurance, HR'
              }
              required
            />
          </FormField>

          <FormGrid columns={2}>
            <FormField label="Unit Code">
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder={
                  unitType === 'business_unit'
                    ? 'e.g. BU-ENG'
                    : unitType === 'division'
                      ? 'e.g. DIV-PROD'
                      : 'e.g. DEPT-SW'
                }
              />
            </FormField>

            <FormField label="Head of Unit">
              <Select
                value={headEmployeeId}
                onChange={(e) => setHeadEmployeeId(e.target.value)}
                options={headOptions}
              />
            </FormField>
          </FormGrid>

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
