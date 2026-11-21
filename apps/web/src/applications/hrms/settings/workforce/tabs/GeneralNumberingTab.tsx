import React, { useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Card,
  CardHeader,
  CardTitle,
  FormGrid,
  FormSection,
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
import { DesignationsSection } from '../../administration/employee-configuration/DesignationsSection';
import { JobLevelsGradesSection } from '../../administration/employee-configuration/JobLevelsGradesSection';

export type CatalogTabId = 'types' | 'designations' | 'job-levels';

export interface GeneralNumberingTabProps {
  initialSettings: WorkforceGeneralSettings;
  initialEmploymentTypes: WorkforceEmploymentType[];
  onReload: () => void;
  initialCatalog?: CatalogTabId;
}

export function GeneralNumberingTab({
  initialSettings,
  initialEmploymentTypes,
  onReload,
  initialCatalog = 'types',
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

  // Active Master Catalog state for the right column
  const [activeCatalog, setActiveCatalog] = useState<CatalogTabId>(initialCatalog);

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
    <div className="bezent-settings-2col-layout">
      {/* ── LEFT COLUMN: Auto-Numbering Engine & ID Visualizer ───────────── */}
      <Stack gap="md" className="bezent-settings-col-left">
        {statusMessage && (
          <Alert variant={statusMessage.type === 'success' ? 'success' : 'error'}>
            {statusMessage.text}
          </Alert>
        )}

        <Card variant="default" padding="md" className="bezent-settings-equal-card">
          <Stack gap="sm" className="bezent-settings-card-content">
            <CardHeader>
              <CardTitle>Employee Auto-Numbering Engine</CardTitle>
            </CardHeader>

            {/* Live ID Visualizer Badge Compact */}
            <div className="bezent-settings-live-badge-compact">
              <div className="bezent-settings-live-badge-compact__left">
                <div className="bezent-settings-live-badge-compact__avatar">KR</div>
                <div>
                  <div className="bezent-settings-live-badge-compact__name">Kaviarasu Rao</div>
                  <div className="bezent-settings-live-badge-compact__sub">Live Preview</div>
                </div>
              </div>
              <div className="bezent-settings-live-badge-compact__id">
                <span className="bezent-settings-live-badge-mockup__dot" aria-hidden="true" />
                <span className="bezent-sr-only">Next ID Preview: </span>
                {livePreviewId}
              </div>
            </div>

            <FormSection title="Numbering Rules">
              <FormGrid columns={3}>
                <Select
                  label="Generation Mode"
                  value={generationMode}
                  onChange={(e) => setGenerationMode(e.target.value as 'automatic' | 'manual')}
                  options={[
                    {
                      label: 'Automatic (System sequence)',
                      triggerLabel: 'Automatic',
                      description: 'System-generated sequential employee ID numbers',
                      value: 'automatic',
                    },
                    {
                      label: 'Manual (User assigned)',
                      triggerLabel: 'Manual',
                      description: 'HR enters ID numbers manually upon registration',
                      value: 'manual',
                    },
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
                  label="Sequence Length"
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
                  align="right"
                  onChange={(e) =>
                    setResetFrequency(
                      e.target.value as 'never' | 'calendar_year' | 'financial_year',
                    )
                  }
                  options={[
                    {
                      label: 'Never (Continuous)',
                      triggerLabel: 'Never',
                      description: 'Continuous sequence without annual reset',
                      value: 'never',
                    },
                    {
                      label: 'Calendar Year',
                      triggerLabel: 'Calendar Year',
                      description: 'Resets counter to start number every Jan 1',
                      value: 'calendar_year',
                    },
                    {
                      label: 'Financial Year',
                      triggerLabel: 'Financial Year',
                      description: 'Resets counter to start number every Apr 1',
                      value: 'financial_year',
                    },
                  ]}
                />
              </FormGrid>
            </FormSection>

            <FormSection title="Controls & Identity">
              <FormGrid columns={2}>
                <Switch
                  label="Allow Manual Override"
                  checked={allowManualOverride}
                  onChange={(e) => setAllowManualOverride(e.target.checked)}
                />
                <Switch
                  label="Prevent ID Reuse"
                  checked={preventIdReuse}
                  onChange={(e) => setPreventIdReuse(e.target.checked)}
                />
                <Switch
                  label="Auto-provision User Account"
                  checked={autoProvisionUser}
                  onChange={(e) => setAutoProvisionUser(e.target.checked)}
                />
                <Select
                  label="Activation Timing"
                  value={activationTiming}
                  align="right"
                  onChange={(e) =>
                    setActivationTiming(e.target.value as 'instant' | 'joining_date' | 'manual')
                  }
                  options={[
                    {
                      label: 'Instant (Immediately on hire)',
                      triggerLabel: 'Instant',
                      description: 'Platform identity created immediately upon hire',
                      value: 'instant',
                    },
                    {
                      label: 'On Joining Date (Scheduled)',
                      triggerLabel: 'On Joining Date',
                      description: 'Account created automatically on employee joining date',
                      value: 'joining_date',
                    },
                    {
                      label: 'Manual Activation (HR triggers invite)',
                      triggerLabel: 'Manual Activation',
                      description: 'HR sends manual invitation link when ready',
                      value: 'manual',
                    },
                  ]}
                />
              </FormGrid>
            </FormSection>
          </Stack>

          <Toolbar
            className="bezent-settings-save-toolbar"
            right={
              <Button variant="primary" onClick={handleSaveSettings} disabled={savingSettings}>
                {savingSettings ? 'Saving...' : 'Save'}
              </Button>
            }
          />
        </Card>
      </Stack>

      {/* ── RIGHT COLUMN: Master Catalogs Hub ─────────────────────────────── */}
      <Card variant="default" padding="md" className="bezent-settings-equal-card">
        <Stack gap="sm" className="bezent-settings-card-content">
          <CardHeader>
            <CardTitle>Master Catalogs</CardTitle>
            <div className="bezent-settings-catalog-segments" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={activeCatalog === 'types'}
                className={`bezent-settings-catalog-segment-btn ${
                  activeCatalog === 'types' ? 'bezent-settings-catalog-segment-btn--active' : ''
                }`}
                onClick={() => setActiveCatalog('types')}
              >
                Employment Types
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeCatalog === 'designations'}
                className={`bezent-settings-catalog-segment-btn ${
                  activeCatalog === 'designations'
                    ? 'bezent-settings-catalog-segment-btn--active'
                    : ''
                }`}
                onClick={() => setActiveCatalog('designations')}
              >
                Designations
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeCatalog === 'job-levels'}
                className={`bezent-settings-catalog-segment-btn ${
                  activeCatalog === 'job-levels'
                    ? 'bezent-settings-catalog-segment-btn--active'
                    : ''
                }`}
                onClick={() => setActiveCatalog('job-levels')}
              >
                Job Levels &amp; Grades
              </button>
            </div>
          </CardHeader>

          {/* Catalog View 1: Employment Types Master */}
          {activeCatalog === 'types' && (
            <Stack gap="md">
              <Toolbar
                left={<CardTitle>Employment Types Master</CardTitle>}
                right={
                  <Button
                    variant="primary"
                    size="sm"
                    className="bezent-settings-add-btn"
                    aria-label="Add Employment Type"
                    title="Add Employment Type"
                    onClick={() => setShowAddTypeModal(true)}
                  >
                    <BezentIcon name="add" size={16} />
                  </Button>
                }
              />

              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>Code</TableHeaderCell>
                    <TableHeaderCell>Name</TableHeaderCell>
                    <TableHeaderCell>Weekly Hours</TableHeaderCell>
                    <TableHeaderCell>Notice Period</TableHeaderCell>
                    <TableHeaderCell>Benefits Eligible</TableHeaderCell>
                    <TableHeaderCell>Status</TableHeaderCell>
                    <TableHeaderCell align="right">Actions</TableHeaderCell>
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
                      <TableCell align="right">
                        <Inline gap="xs" justify="end">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="bezent-settings-row-action-btn bezent-settings-row-action-btn--danger"
                            aria-label={`Delete ${et.name}`}
                            title="Delete Employment Type"
                            onClick={() => handleDeleteEmploymentType(et.id, et.code)}
                          >
                            <BezentIcon name="trash" size={14} />
                            <span className="bezent-sr-only">Delete</span>
                          </Button>
                        </Inline>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Stack>
          )}

          {/* Catalog View 2: Designations */}
          {activeCatalog === 'designations' && (
            <div className="bezent-settings-smart-catalog">
              <DesignationsSection />
            </div>
          )}

          {/* Catalog View 3: Job Levels & Grades */}
          {activeCatalog === 'job-levels' && (
            <div className="bezent-settings-smart-catalog">
              <JobLevelsGradesSection />
            </div>
          )}
        </Stack>
      </Card>

      {/* ── Add Employment Type Modal ─────────────────────────────────────── */}
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
    </div>
  );
}
