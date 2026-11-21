import React, { useState, useEffect } from 'react';
import {
  Modal,
  Button,
  Switch,
  FormField,
  Stack,
  Inline,
} from '../../../../../../design-system';
import type {
  DocumentRequirement,
  SaveDocumentApplicabilityDto,
} from '../../../types/documentRequirement.types';

export interface ApplicabilityRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (docId: string, rules: SaveDocumentApplicabilityDto) => Promise<void>;
  document: DocumentRequirement | null;
}

const EMPLOYMENT_TYPES = [
  { id: 'full_time', label: 'Full-Time / Permanent' },
  { id: 'part_time', label: 'Part-Time' },
  { id: 'contract', label: 'Contractor / Fixed-Term' },
  { id: 'intern', label: 'Intern / Graduate Trainee' },
];

const DEPARTMENTS = [
  { id: 'dept_eng', label: 'Engineering & Technology' },
  { id: 'dept_hr', label: 'Human Resources' },
  { id: 'dept_fin', label: 'Finance & Accounting' },
  { id: 'dept_sales', label: 'Sales & Business Development' },
  { id: 'dept_ops', label: 'Operations & Facilities' },
  { id: 'dept_prod', label: 'Product & Design' },
  { id: 'dept_legal', label: 'Legal & Compliance' },
];

const LOCATIONS = [
  { id: 'loc_hq', label: 'Corporate Headquarters' },
  { id: 'loc_remote', label: 'Remote / Work From Home' },
  { id: 'loc_reg_north', label: 'Regional Office (North)' },
  { id: 'loc_reg_south', label: 'Regional Office (South)' },
];

const PIPELINES = [
  { id: 'pipe-standard', label: 'Standard Employee Onboarding' },
  { id: 'pipe-executive', label: 'Executive & Leadership Pipeline' },
  { id: 'pipe-intern-onboarding', label: 'Intern & Campus Graduate Pipeline' },
];

const STAGES = [
  { id: 'preboarding', label: 'Pre-boarding' },
  { id: 'day_one_orientation', label: 'Day 1 Orientation' },
  { id: 'documents', label: 'Document Collection' },
  { id: 'role_training', label: 'Role Training & Integration' },
  { id: 'induction', label: 'HR Induction' },
];

export function ApplicabilityRulesModal({
  isOpen,
  onClose,
  onSave,
  document,
}: ApplicabilityRulesModalProps) {
  const [allEmployees, setAllEmployees] = useState(
    () => (document?.applicability ? document.applicability.allEmployees : true),
  );
  const [selectedEmpTypes, setSelectedEmpTypes] = useState<string[]>(
    () => document?.applicability?.employmentTypes || [],
  );
  const [selectedDeptIds, setSelectedDeptIds] = useState<string[]>(
    () => document?.applicability?.departmentIds || [],
  );
  const [selectedLocIds, setSelectedLocIds] = useState<string[]>(
    () => document?.applicability?.locationIds || [],
  );
  const [selectedPipelineIds, setSelectedPipelineIds] = useState<string[]>(
    () => document?.applicability?.pipelineIds || [],
  );
  const [selectedStageKeys, setSelectedStageKeys] = useState<string[]>(
    () => document?.applicability?.stageKeys || [],
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (document) {
      const app = document.applicability;
      setAllEmployees(app ? app.allEmployees : true);
      setSelectedEmpTypes(app?.employmentTypes || []);
      setSelectedDeptIds(app?.departmentIds || []);
      setSelectedLocIds(app?.locationIds || []);
      setSelectedPipelineIds(app?.pipelineIds || []);
      setSelectedStageKeys(app?.stageKeys || []);
    } else {
      setAllEmployees(true);
      setSelectedEmpTypes([]);
      setSelectedDeptIds([]);
      setSelectedLocIds([]);
      setSelectedPipelineIds([]);
      setSelectedStageKeys([]);
    }
    setError(null);
  }, [document, isOpen]);

  const toggleItem = (list: string[], setList: (next: string[]) => void, id: string) => {
    setList(list.includes(id) ? list.filter((item) => item !== id) : [...list, id]);
  };

  const handleSave = async () => {
    if (!document) return;

    if (!allEmployees && selectedEmpTypes.length === 0 && selectedDeptIds.length === 0 && selectedLocIds.length === 0 && selectedPipelineIds.length === 0 && selectedStageKeys.length === 0) {
      setError('Please select at least one criteria or enable "All Employees"');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      await onSave(document.id, {
        allEmployees,
        employmentTypes: allEmployees ? [] : selectedEmpTypes,
        departmentIds: allEmployees ? [] : selectedDeptIds,
        locationIds: allEmployees ? [] : selectedLocIds,
        pipelineIds: selectedPipelineIds,
        stageKeys: selectedStageKeys,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save applicability rules');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Configure Applicability Rules"
      size="lg"
      footer={
        <Inline gap="sm" justify="end">
          <Button variant="secondary" onClick={onClose} disabled={saving} type="button">
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave} loading={saving} type="button">
            Apply Rules
          </Button>
        </Inline>
      }
    >
      <div className="bezent-reqdocs-form-compact">
        {/* Document Header Context */}
        {document && (
          <div className="bezent-reqdocs-applicability-header">
            <div className="bezent-reqdocs-applicability-title">{document.name}</div>
            <div className="bezent-reqdocs-applicability-sub">
              Specify employee types, departments, locations, and onboarding pipelines where this
              requirement applies.
            </div>
          </div>
        )}

        {error && (
          <div className="bezent-reqdocs-chip bezent-reqdocs-chip--required" role="alert">
            {error}
          </div>
        )}

        {/* Global vs Targeted Scope */}
        <FormField label="Applicability Scope">
          <Switch
            checked={allEmployees}
            onChange={(e) => {
              const val = e.target.checked;
              setAllEmployees(val);
              if (val) {
                setSelectedEmpTypes([]);
                setSelectedDeptIds([]);
                setSelectedLocIds([]);
              }
            }}
            label={
              allEmployees
                ? 'Applies to All Employees across the organization'
                : 'Targeted Applicability (Filter by employment type, department, location)'
            }
          />
        </FormField>

        {/* Conditional Targeted Filters */}
        {!allEmployees && (
          <Stack gap="md" className="bezent-reqdocs-conditional-box">
            {/* Employment Types */}
            <div>
              <FormField label="Employment Type">
                <div className="bezent-reqdocs-pills-container">
                  {EMPLOYMENT_TYPES.map((type) => {
                    const isSelected = selectedEmpTypes.includes(type.id);
                    return (
                      <button
                        key={type.id}
                        type="button"
                        className={`bezent-reqdocs-pill ${
                          isSelected ? 'bezent-reqdocs-pill--selected' : ''
                        }`}
                        onClick={() => toggleItem(selectedEmpTypes, setSelectedEmpTypes, type.id)}
                      >
                        {type.label}
                      </button>
                    );
                  })}
                </div>
              </FormField>
            </div>

            {/* Departments */}
            <div>
              <FormField label="Departments (Leave empty to apply to all departments)">
                <div className="bezent-reqdocs-pills-container">
                  {DEPARTMENTS.map((dept) => {
                    const isSelected = selectedDeptIds.includes(dept.id);
                    return (
                      <button
                        key={dept.id}
                        type="button"
                        className={`bezent-reqdocs-pill ${
                          isSelected ? 'bezent-reqdocs-pill--selected' : ''
                        }`}
                        onClick={() => toggleItem(selectedDeptIds, setSelectedDeptIds, dept.id)}
                      >
                        {dept.label}
                      </button>
                    );
                  })}
                </div>
              </FormField>
            </div>

            {/* Work Locations */}
            <div>
              <FormField label="Work Locations (Leave empty to apply to all locations)">
                <div className="bezent-reqdocs-pills-container">
                  {LOCATIONS.map((loc) => {
                    const isSelected = selectedLocIds.includes(loc.id);
                    return (
                      <button
                        key={loc.id}
                        type="button"
                        className={`bezent-reqdocs-pill ${
                          isSelected ? 'bezent-reqdocs-pill--selected' : ''
                        }`}
                        onClick={() => toggleItem(selectedLocIds, setSelectedLocIds, loc.id)}
                      >
                        {loc.label}
                      </button>
                    );
                  })}
                </div>
              </FormField>
            </div>
          </Stack>
        )}

        {/* Pipeline & Stage Targeting (Reusable across pipelines and stages) */}
        <h3 className="bezent-reqdocs-section-heading">Pipeline &amp; Stage Assignment</h3>
        <Stack gap="sm">
          <div>
            <FormField label="Specific Onboarding Pipelines (Leave empty to apply across all pipelines)">
              <div className="bezent-reqdocs-pills-container">
                {PIPELINES.map((pipe) => {
                  const isSelected = selectedPipelineIds.includes(pipe.id);
                  return (
                    <button
                      key={pipe.id}
                      type="button"
                      className={`bezent-reqdocs-pill ${
                        isSelected ? 'bezent-reqdocs-pill--selected' : ''
                      }`}
                      onClick={() => toggleItem(selectedPipelineIds, setSelectedPipelineIds, pipe.id)}
                    >
                      {pipe.label}
                    </button>
                  );
                })}
              </div>
            </FormField>
          </div>

          <div>
            <FormField label="Applicable Pipeline Stages (Leave empty to collect in any stage)">
              <div className="bezent-reqdocs-pills-container">
                {STAGES.map((stg) => {
                  const isSelected = selectedStageKeys.includes(stg.id);
                  return (
                    <button
                      key={stg.id}
                      type="button"
                      className={`bezent-reqdocs-pill ${
                        isSelected ? 'bezent-reqdocs-pill--selected' : ''
                      }`}
                      onClick={() => toggleItem(selectedStageKeys, setSelectedStageKeys, stg.id)}
                    >
                      {stg.label}
                    </button>
                  );
                })}
              </div>
            </FormField>
          </div>
        </Stack>
      </div>
    </Modal>
  );
}
