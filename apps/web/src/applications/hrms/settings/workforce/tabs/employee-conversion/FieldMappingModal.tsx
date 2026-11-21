import React, { useState, useMemo } from 'react';
import { Button } from '../../../../../../design-system/components/Button/Button';
import { Modal } from '../../../../../../design-system/components/Modal/Modal';
import { Select } from '../../../../../../design-system/components/Select/Select';
import { Input } from '../../../../../../design-system/components/Input/Input';
import { Switch } from '../../../../../../design-system/components/Switch/Switch';
import { Badge } from '../../../../../../design-system/components/Badge/Badge';
import { Alert } from '../../../../../../design-system/components/Alert/Alert';
import { BezentIcon } from '../../../../../../design-system/icons';
import type { FieldMappingItem } from '../../../types/employeeConversion.types';

interface FieldMappingModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMappings: FieldMappingItem[];
  onSave: (mappings: FieldMappingItem[]) => Promise<void>;
}

const STANDARD_CANDIDATE_FIELDS = [
  { value: 'fullName', label: 'Full Name' },
  { value: 'email', label: 'Work / Personal Email' },
  { value: 'phone', label: 'Phone / Mobile' },
  { value: 'dateOfBirth', label: 'Date of Birth' },
  { value: 'gender', label: 'Gender' },
  { value: 'departmentId', label: 'Department' },
  { value: 'designationId', label: 'Designation' },
  { value: 'employmentType', label: 'Employment Type' },
  { value: 'joiningDate', label: 'Offer Joining Date' },
  { value: 'locationId', label: 'Work Location' },
  { value: 'reportingManagerId', label: 'Reporting Manager' },
  { value: 'address', label: 'Current Address' },
  { value: 'custom', label: '+ Custom Field...' },
];

const STANDARD_EMPLOYEE_FIELDS = [
  { value: 'displayName', label: 'Employee Name' },
  { value: 'email', label: 'Work Email' },
  { value: 'phone', label: 'Mobile Number' },
  { value: 'dateOfBirth', label: 'Date of Birth' },
  { value: 'gender', label: 'Gender' },
  { value: 'departmentId', label: 'Department' },
  { value: 'designationId', label: 'Designation' },
  { value: 'employmentType', label: 'Employment Type' },
  { value: 'joiningDate', label: 'Date of Joining' },
  { value: 'locationId', label: 'Work Location' },
  { value: 'reportingManagerId', label: 'Reporting Manager' },
  { value: 'address', label: 'Current Address' },
  { value: 'custom', label: '+ Custom Employee Field...' },
];

export function FieldMappingModal({
  isOpen,
  onClose,
  initialMappings,
  onSave,
}: FieldMappingModalProps) {
  const [mappings, setMappings] = useState<FieldMappingItem[]>(
    () => (initialMappings ? [...initialMappings] : []),
  );

  const [searchTerm, setSearchTerm] = useState('');

  // New mapping form state
  const [isAdding, setIsAdding] = useState(false);
  const [sourceField, setSourceField] = useState('fullName');
  const [customSource, setCustomSource] = useState('');
  const [destinationField, setDestinationField] = useState('displayName');
  const [customDestination, setCustomDestination] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Computed values for Add Mapping Studio
  const finalSource = sourceField === 'custom' ? customSource.trim() : sourceField;
  const finalDest = destinationField === 'custom' ? customDestination.trim() : destinationField;
  const sourceObj = STANDARD_CANDIDATE_FIELDS.find((f) => f.value === sourceField);
  const destObj = STANDARD_EMPLOYEE_FIELDS.find((f) => f.value === destinationField);
  const sourceLabel = sourceField === 'custom' ? (customSource.trim() || 'Custom Field') : (sourceObj?.label || finalSource);
  const destLabel = destinationField === 'custom' ? (customDestination.trim() || 'Custom Field') : (destObj?.label || finalDest);
  const existingMapping = mappings.find((m) => m.destinationField === finalDest && m.isActive);

  // Duplicate destination detection
  const duplicateDestinations = useMemo(() => {
    const counts = new Map<string, number>();
    for (const m of mappings) {
      if (!m.isActive) continue;
      counts.set(m.destinationField, (counts.get(m.destinationField) || 0) + 1);
    }
    const dupes: string[] = [];
    counts.forEach((count, field) => {
      if (count > 1) dupes.push(field);
    });
    return dupes;
  }, [mappings]);

  // Unmapped mandatory employee fields detection
  const unmappedMandatoryFields = useMemo(() => {
    const mapped = new Set(
      mappings.filter((m) => m.isActive).map((m) => m.destinationField),
    );
    const mandatory = [
      { key: 'displayName', label: 'Employee Name' },
      { key: 'email', label: 'Work Email' },
      { key: 'departmentId', label: 'Department' },
      { key: 'designationId', label: 'Designation' },
      { key: 'joiningDate', label: 'Date of Joining' },
    ];
    return mandatory.filter((f) => !mapped.has(f.key));
  }, [mappings]);

  const handleToggleActive = (id: string) => {
    setMappings((prev) =>
      prev.map((m) => (m.id === id ? { ...m, isActive: !m.isActive } : m)),
    );
  };

  const handleRemove = (id: string) => {
    setMappings((prev) => prev.filter((m) => m.id !== id));
  };

  const handleAddMapping = () => {
    if (!finalSource || !finalDest) {
      setError('Both candidate and employee field names are required.');
      return;
    }

    const newMap: FieldMappingItem = {
      id: `map_${Date.now().toString(36)}`,
      sourceField: finalSource,
      destinationField: finalDest,
      sourceLabel,
      destinationLabel: destLabel,
      isActive: true,
      isCustom: sourceField === 'custom' || destinationField === 'custom',
    };

    setMappings((prev) => [...prev, newMap]);
    setIsAdding(false);
    setCustomSource('');
    setCustomDestination('');
    setError(null);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (duplicateDestinations.length > 0) {
      setError(
        `Duplicate mapping detected for: ${duplicateDestinations.join(', ')}. Each employee field can only be mapped once.`,
      );
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await onSave(mappings);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save field mappings');
    } finally {
      setSaving(false);
    }
  };

  const filteredMappings = useMemo(() => {
    if (!searchTerm.trim()) return mappings;
    const term = searchTerm.toLowerCase();
    return mappings.filter(
      (m) =>
        m.sourceLabel.toLowerCase().includes(term) ||
        m.sourceField.toLowerCase().includes(term) ||
        m.destinationLabel.toLowerCase().includes(term) ||
        m.destinationField.toLowerCase().includes(term),
    );
  }, [mappings, searchTerm]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Configure Field Mapping"
      size="lg"
      className="bezent-fieldmap-modal"
      footer={
        <div className="bezent-fieldmap-modal-footer">
          <div className="bezent-fieldmap-footer-summary">
            <span className="bezent-fieldmap-footer-dot" />
            <span>
              {mappings.filter((m) => m.isActive).length} of {mappings.length} Active Mappings
            </span>
          </div>

          <div className="bezent-fieldmap-footer-actions">
            <Button variant="secondary" size="sm" type="button" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              type="submit"
              form="field-mapping-form"
              loading={saving}
              disabled={saving || duplicateDestinations.length > 0}
              onClick={handleSubmit}
            >
              {saving ? 'Saving...' : 'Save Mappings'}
            </Button>
          </div>
        </div>
      }
    >
      <form id="field-mapping-form" onSubmit={handleSubmit} className="bezent-fieldmap-form">
        {error && <Alert variant="danger">{error}</Alert>}

        {duplicateDestinations.length > 0 && (
          <Alert variant="danger">
            Duplicate destination detected: <strong>{duplicateDestinations.join(', ')}</strong>.
            Each destination employee field must be unique.
          </Alert>
        )}

        {unmappedMandatoryFields.length > 0 && (
          <Alert variant="warning">
            Unmapped required fields:{' '}
            <strong>{unmappedMandatoryFields.map((f) => f.label).join(', ')}</strong>.
          </Alert>
        )}

        {/* Toolbar & Filter Header */}
        <div className="bezent-fieldmap-toolbar">
          <div className="bezent-fieldmap-toolbar-left">
            <div className="bezent-fieldmap-title-row">
              <h3 className="bezent-fieldmap-title">Mapped Fields</h3>
              <span className="bezent-fieldmap-count-badge">
                {mappings.filter((m) => m.isActive).length}/{mappings.length} Active
              </span>
            </div>
          </div>

          <div className="bezent-fieldmap-toolbar-right">
            <div className="bezent-fieldmap-search-wrap">
              <Input
                id="fieldmap-search-input"
                placeholder="Filter fields..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                size="sm"
              />
            </div>

            {!isAdding && (
              <Button
                variant="primary"
                size="sm"
                type="button"
                onClick={() => setIsAdding(true)}
                leftIcon={<BezentIcon name="add" size={14} />}
              >
                Add Mapping
              </Button>
            )}
          </div>
        </div>

        {/* Add specification card / Interactive Studio */}
        {isAdding && (
          <div className="bezent-fieldmap-add-card">
            <div className="bezent-fieldmap-add-top">
              <div className="bezent-fieldmap-add-title-wrap">
                <div className="bezent-fieldmap-add-icon">
                  <BezentIcon name="add" size={16} />
                </div>
                <h4 className="bezent-fieldmap-add-heading">Define New Field Mapping</h4>
              </div>
              <Button variant="ghost" size="sm" type="button" onClick={() => setIsAdding(false)}>
                Cancel
              </Button>
            </div>

            <div className="bezent-fieldmap-add-grid">
              {/* Source Panel */}
              <div className="bezent-fieldmap-panel">
                <div className="bezent-fieldmap-panel-header">
                  <span className="bezent-fieldmap-panel-label">Candidate Field</span>
                  <span className="bezent-fieldmap-panel-chip">candidate.{finalSource || 'source'}</span>
                </div>
                <Select
                  id="add-source-field"
                  label=""
                  value={sourceField}
                  onChange={(e) => setSourceField(e.target.value)}
                  options={STANDARD_CANDIDATE_FIELDS}
                />
                {sourceField === 'custom' && (
                  <Input
                    id="custom-source-input"
                    label="Custom Source Key"
                    placeholder="e.g. passportNumber, linkedInUrl"
                    value={customSource}
                    onChange={(e) => setCustomSource(e.target.value)}
                  />
                )}
              </div>

              {/* Connector */}
              <div className="bezent-fieldmap-connector-col" aria-hidden="true">
                <div className="bezent-fieldmap-connector-badge">
                  <BezentIcon name="arrowRight" size={16} />
                </div>
                <span className="bezent-fieldmap-connector-text">Maps To</span>
              </div>

              {/* Target Panel */}
              <div className="bezent-fieldmap-panel">
                <div className="bezent-fieldmap-panel-header">
                  <span className="bezent-fieldmap-panel-label">Employee Field</span>
                  <span className="bezent-fieldmap-panel-chip">employee.{finalDest || 'target'}</span>
                </div>
                <Select
                  id="add-dest-field"
                  label=""
                  value={destinationField}
                  onChange={(e) => setDestinationField(e.target.value)}
                  options={STANDARD_EMPLOYEE_FIELDS}
                />
                {destinationField === 'custom' && (
                  <Input
                    id="custom-dest-input"
                    label="Custom Destination Key"
                    placeholder="e.g. passportNumber, linkedInUrl"
                    value={customDestination}
                    onChange={(e) => setCustomDestination(e.target.value)}
                  />
                )}
              </div>
            </div>

            {/* Live Mapping Preview Strip */}
            <div
              className={`bezent-fieldmap-live-preview ${
                existingMapping ? 'bezent-fieldmap-live-preview--warning' : ''
              }`}
            >
              <div>
                {existingMapping ? (
                  <span>
                    ⚠️ Destination <strong>{destLabel}</strong> is already mapped to{' '}
                    <strong>{existingMapping.sourceLabel}</strong>. Duplicate mapping conflict.
                  </span>
                ) : (
                  <span>
                    ✓ Mapping Flow: <strong>{sourceLabel}</strong> (
                    <span className="bezent-fieldmap-preview-tag">candidate.{finalSource}</span>) ➔{' '}
                    <strong>{destLabel}</strong> (
                    <span className="bezent-fieldmap-preview-tag">employee.{finalDest}</span>)
                  </span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="bezent-fieldmap-add-actions">
              <Button variant="secondary" size="sm" type="button" onClick={() => setIsAdding(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                type="button"
                onClick={handleAddMapping}
                leftIcon={<BezentIcon name="add" size={14} />}
              >
                Add Mapping
              </Button>
            </div>
          </div>
        )}

        {/* Mapping Table */}
        <div className="bezent-fieldmap-table-container">
          <table className="bezent-fieldmap-table" aria-label="Field mappings table">
            <thead>
              <tr>
                <th scope="col" className="bezent-fieldmap-th bezent-fieldmap-th--source">Candidate Field</th>
                <th scope="col" className="bezent-fieldmap-th bezent-fieldmap-th--arrow" aria-label="Direction"></th>
                <th scope="col" className="bezent-fieldmap-th bezent-fieldmap-th--dest">Employee Field</th>
                <th scope="col" className="bezent-fieldmap-th bezent-fieldmap-th--status">Status</th>
                <th scope="col" className="bezent-fieldmap-th bezent-fieldmap-th--actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredMappings.length === 0 ? (
                <tr>
                  <td colSpan={5} className="bezent-fieldmap-empty-cell">
                    No mapped fields found matching &ldquo;{searchTerm}&rdquo;
                  </td>
                </tr>
              ) : (
                filteredMappings.map((m) => {
                  const isDupe = duplicateDestinations.includes(m.destinationField);
                  return (
                    <tr
                      key={m.id}
                      className={`bezent-fieldmap-row ${!m.isActive ? 'bezent-fieldmap-row--disabled' : ''}`}
                    >
                      <td className="bezent-fieldmap-td bezent-fieldmap-td--source">
                        <div className="bezent-fieldmap-field-title">{m.sourceLabel}</div>
                        <span className="bezent-fieldmap-prop-tag">{m.sourceField}</span>
                      </td>

                      <td className="bezent-fieldmap-td bezent-fieldmap-td--arrow">
                        <div className="bezent-fieldmap-arrow-badge" aria-hidden="true">
                          <BezentIcon name="arrowRight" size={13} color="var(--text-secondary, #64748b)" />
                        </div>
                      </td>

                      <td className="bezent-fieldmap-td bezent-fieldmap-td--dest">
                        <div className="bezent-fieldmap-field-title">
                          <span>{m.destinationLabel}</span>
                          {isDupe && (
                            <Badge variant="danger" size="sm">
                              Duplicate
                            </Badge>
                          )}
                        </div>
                        <span className="bezent-fieldmap-prop-tag">{m.destinationField}</span>
                      </td>

                      <td className="bezent-fieldmap-td bezent-fieldmap-td--status">
                        <Switch
                          checked={m.isActive}
                          onChange={() => handleToggleActive(m.id)}
                          aria-label={`Toggle active for ${m.sourceLabel}`}
                        />
                      </td>

                      <td className="bezent-fieldmap-td bezent-fieldmap-td--actions">
                        {m.isSystem ? (
                          <span className="bezent-fieldmap-core-tag" title="Core schema mapping (required)">
                            Core
                          </span>
                        ) : (
                          <button
                            type="button"
                            className="bezent-fieldmap-delete-btn"
                            title={`Remove mapping ${m.sourceLabel}`}
                            aria-label={`Remove mapping ${m.sourceLabel}`}
                            onClick={() => handleRemove(m.id)}
                          >
                            <BezentIcon name="delete" size={14} />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </form>
    </Modal>
  );
}
