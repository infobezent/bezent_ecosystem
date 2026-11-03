import React, { useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  FormGrid,
  FormSection,
  Grid,
  Inline,
  Input,
  Modal,
  Select,
  Stack,
  Switch,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeaderCell,
  TableCell,
  Toolbar,
} from '../../../../../design-system/components';
import { BezentIcon } from '../../../../../design-system/icons';
import type {
  WorkforceGeneralSettings,
  WorkforceEmploymentType,
  CreateEmploymentTypeDto,
} from '../types/workforceSettings.types';
import {
  updateGeneralSettings,
  createEmploymentType,
  deleteEmploymentType,
} from '../api/workforceSettingsApi';

export interface GeneralNumberingTabProps {
  initialSettings: WorkforceGeneralSettings;
  initialEmploymentTypes: WorkforceEmploymentType[];
  onReload: () => void;
}

export function GeneralNumberingTab({
  initialSettings,
  initialEmploymentTypes,
  onReload,
}: GeneralNumberingTabProps) {
  // General settings form state
  const [generationMode, setGenerationMode] = useState<'automatic' | 'manual'>(
    initialSettings.generationMode,
  );
  const [idPrefix, setIdPrefix] = useState(initialSettings.idPrefix);
  const [idSuffix, setIdSuffix] = useState(initialSettings.idSuffix || '');
  const [sequenceLength, setSequenceLength] = useState(initialSettings.sequenceLength);
  const [startingNumber, setStartingNumber] = useState(initialSettings.startingNumber);
  const [resetFrequency, setResetFrequency] = useState(initialSettings.resetFrequency);
  const [allowManualOverride, setAllowManualOverride] = useState(
    initialSettings.allowManualOverride,
  );
  const [preventIdReuse, setPreventIdReuse] = useState(initialSettings.preventIdReuse);
  const [autoProvisionUser, setAutoProvisionUser] = useState(initialSettings.autoProvisionUser);
  const [activationTiming, setActivationTiming] = useState(initialSettings.activationTiming);

  const [savingSettings, setSavingSettings] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Employment types modal state
  const [showAddTypeModal, setShowAddTypeModal] = useState(false);
  const [newTypeCode, setNewTypeCode] = useState('');
  const [newTypeName, setNewTypeName] = useState('');
  const [newTypeHours, setNewTypeHours] = useState('40.0');
  const [newTypeNoticeDays, setNewTypeNoticeDays] = useState('60');
  const [newTypeBenefits, setNewTypeBenefits] = useState(true);
  const [savingType, setSavingType] = useState(false);
  const [typeModalError, setTypeModalError] = useState<string | null>(null);

  // Calculate live preview of next employee ID
  const previewNumber = Math.max(initialSettings.currentCounter + 1, startingNumber);
  const formattedPreviewNum = String(previewNumber).padStart(sequenceLength, '0');
  const livePreviewId = `${idPrefix}${formattedPreviewNum}${idSuffix ? idSuffix : ''}`;

  const handleSaveSettings = async () => {
    try {
      setSavingSettings(true);
      setStatusMessage(null);
      await updateGeneralSettings({
        generationMode,
        idPrefix,
        idSuffix: idSuffix.trim() ? idSuffix.trim() : null,
        sequenceLength,
        startingNumber,
        resetFrequency,
        allowManualOverride,
        preventIdReuse,
        autoProvisionUser,
        activationTiming,
      });
      setStatusMessage({
        type: 'success',
        text: 'Workforce auto-numbering and general settings saved successfully.',
      });
      onReload();
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to save general settings',
      });
    } finally {
      setSavingSettings(false);
    }
  };

  const handleCreateEmploymentType = async () => {
    try {
      setSavingType(true);
      setTypeModalError(null);
      const dto: CreateEmploymentTypeDto = {
        code: newTypeCode.trim().toUpperCase(),
        name: newTypeName.trim(),
        workHoursPerWeek: parseFloat(newTypeHours) || 40.0,
        defaultNoticeDays: parseInt(newTypeNoticeDays, 10) || 60,
        isBenefitsEligible: newTypeBenefits,
        isActive: true,
      };
      await createEmploymentType(dto);
      setShowAddTypeModal(false);
      setNewTypeCode('');
      setNewTypeName('');
      onReload();
    } catch (err) {
      setTypeModalError(err instanceof Error ? err.message : 'Failed to create employment type');
    } finally {
      setSavingType(false);
    }
  };

  const handleDeleteEmploymentType = async (id: string, code: string) => {
    if (!window.confirm(`Are you sure you want to delete employment type "${code}"?`)) return;
    try {
      await deleteEmploymentType(id);
      onReload();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete employment type');
    }
  };

  return (
    <Stack gap="lg">
      {statusMessage && (
        <Alert variant={statusMessage.type === 'success' ? 'success' : 'error'}>
          {statusMessage.text}
        </Alert>
      )}

      {/* Auto-Numbering Engine Card */}
      <Card variant="default" padding="lg">
        <Stack gap="md">
          <CardHeader>
            <div>
              <CardTitle>Employee Auto-Numbering Engine</CardTitle>
              <CardDescription>
                Configure how unique employee identification numbers are formatted and sequenced.
              </CardDescription>
            </div>
            <Badge variant="info">
              Next ID Preview: <strong>{livePreviewId}</strong>
            </Badge>
          </CardHeader>

          <FormSection title="Numbering Rules">
            <FormGrid columns={3}>
              <Select
                label="Generation Mode"
                value={generationMode}
                onChange={(e) => setGenerationMode(e.target.value as 'automatic' | 'manual')}
                options={[
                  { label: 'Automatic (System sequence)', value: 'automatic' },
                  { label: 'Manual (User assigned)', value: 'manual' },
                ]}
              />
              <Input
                label="ID Prefix"
                value={idPrefix}
                onChange={(e) => setIdPrefix(e.target.value)}
                placeholder="e.g. EMP-, BEZ-"
              />
              <Input
                label="ID Suffix (Optional)"
                value={idSuffix}
                onChange={(e) => setIdSuffix(e.target.value)}
                placeholder="e.g. -HQ, /2026"
              />
              <Input
                label="Sequence Length (Digits)"
                type="number"
                min={3}
                max={10}
                value={sequenceLength}
                onChange={(e) => setSequenceLength(parseInt(e.target.value, 10) || 4)}
              />
              <Input
                label="Starting Number"
                type="number"
                min={1}
                value={startingNumber}
                onChange={(e) => setStartingNumber(parseInt(e.target.value, 10) || 1001)}
              />
              <Select
                label="Reset Frequency"
                value={resetFrequency}
                onChange={(e) =>
                  setResetFrequency(e.target.value as 'never' | 'calendar_year' | 'financial_year')
                }
                options={[
                  { label: 'Never (Continuous)', value: 'never' },
                  { label: 'Calendar Year', value: 'calendar_year' },
                  { label: 'Financial Year', value: 'financial_year' },
                ]}
              />
            </FormGrid>
          </FormSection>

          <FormSection title="Controls & Overrides">
            <Grid columns={2} gap="md">
              <Switch
                label="Allow Manual Override (Permit HR managers to type custom ID numbers on registration)"
                checked={allowManualOverride}
                onChange={(e) => setAllowManualOverride(e.target.checked)}
              />
              <Switch
                label="Prevent ID Reuse (Prevent reassigning retired or terminated employee IDs)"
                checked={preventIdReuse}
                onChange={(e) => setPreventIdReuse(e.target.checked)}
              />
            </Grid>
          </FormSection>
        </Stack>
      </Card>

      {/* User Provisioning & Identity Card */}
      <Card variant="default" padding="lg">
        <Stack gap="md">
          <CardHeader>
            <div>
              <CardTitle>User Account Auto-Provisioning</CardTitle>
              <CardDescription>
                Synchronize workforce hires with platform User accounts for portal access.
              </CardDescription>
            </div>
          </CardHeader>

          <Grid columns={2} gap="md">
            <Switch
              label="Auto-provision User Account (Create platform identity on hire or conversion)"
              checked={autoProvisionUser}
              onChange={(e) => setAutoProvisionUser(e.target.checked)}
            />
            <Select
              label="Activation Timing"
              value={activationTiming}
              onChange={(e) =>
                setActivationTiming(e.target.value as 'instant' | 'joining_date' | 'manual')
              }
              options={[
                { label: 'Instant (Immediately on hire)', value: 'instant' },
                { label: 'On Joining Date (Scheduled)', value: 'joining_date' },
                { label: 'Manual Activation (HR triggers invite)', value: 'manual' },
              ]}
            />
          </Grid>
        </Stack>
      </Card>

      {/* Save Settings Toolbar */}
      <Toolbar
        right={
          <Button variant="primary" onClick={handleSaveSettings} disabled={savingSettings}>
            <BezentIcon name="check" size={16} />
            {savingSettings ? 'Saving Settings...' : 'Save General Settings'}
          </Button>
        }
      />

      {/* Employment Types Master Card */}
      <Card variant="default" padding="lg">
        <Stack gap="md">
          <CardHeader>
            <div>
              <CardTitle>Employment Types Master</CardTitle>
              <CardDescription>
                Define employment classifications, weekly working hour standards, and default notice
                periods.
              </CardDescription>
            </div>
            <Button variant="secondary" onClick={() => setShowAddTypeModal(true)}>
              <BezentIcon name="plus" size={16} />
              Add Employment Type
            </Button>
          </CardHeader>

          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Code</TableHeaderCell>
                <TableHeaderCell>Name</TableHeaderCell>
                <TableHeaderCell>Weekly Hours</TableHeaderCell>
                <TableHeaderCell>Notice Period</TableHeaderCell>
                <TableHeaderCell>Benefits Eligible</TableHeaderCell>
                <TableHeaderCell>Status</TableHeaderCell>
                <TableHeaderCell>Actions</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {initialEmploymentTypes.map((et) => (
                <TableRow key={et.id}>
                  <TableCell>
                    <strong>{et.code}</strong>
                  </TableCell>
                  <TableCell>{et.name}</TableCell>
                  <TableCell>{et.workHoursPerWeek} hrs</TableCell>
                  <TableCell>{et.defaultNoticeDays} days</TableCell>
                  <TableCell>
                    {et.isBenefitsEligible ? (
                      <Badge variant="success">Eligible</Badge>
                    ) : (
                      <Badge variant="neutral">Ineligible</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {et.isActive ? (
                      <Badge variant="success">Active</Badge>
                    ) : (
                      <Badge variant="neutral">Inactive</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Inline gap="xs">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteEmploymentType(et.id, et.code)}
                      >
                        <BezentIcon name="trash" size={14} />
                        Delete
                      </Button>
                    </Inline>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Stack>
      </Card>

      {/* Add Employment Type Modal */}
      {showAddTypeModal && (
        <Modal
          isOpen={showAddTypeModal}
          onClose={() => setShowAddTypeModal(false)}
          title="Add Employment Type"
          footer={
            <Inline gap="sm" justify="end">
              <Button variant="secondary" onClick={() => setShowAddTypeModal(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleCreateEmploymentType}
                disabled={savingType || !newTypeCode.trim() || !newTypeName.trim()}
              >
                {savingType ? 'Creating...' : 'Create Type'}
              </Button>
            </Inline>
          }
        >
          <Stack gap="md">
            {typeModalError && <Alert variant="error">{typeModalError}</Alert>}
            <Input
              label="Type Code (e.g. FT, PT, CT)"
              value={newTypeCode}
              onChange={(e) => setNewTypeCode(e.target.value)}
              placeholder="2-4 uppercase characters"
            />
            <Input
              label="Display Name"
              value={newTypeName}
              onChange={(e) => setNewTypeName(e.target.value)}
              placeholder="e.g. Full Time Regular, Contract"
            />
            <Input
              label="Standard Work Hours / Week"
              type="number"
              value={newTypeHours}
              onChange={(e) => setNewTypeHours(e.target.value)}
            />
            <Input
              label="Default Notice Period (Days)"
              type="number"
              value={newTypeNoticeDays}
              onChange={(e) => setNewTypeNoticeDays(e.target.value)}
            />
            <Switch
              label="Benefits Eligible (Accrue leaves & healthcare coverage)"
              checked={newTypeBenefits}
              onChange={(e) => setNewTypeBenefits(e.target.checked)}
            />
          </Stack>
        </Modal>
      )}
    </Stack>
  );
}
