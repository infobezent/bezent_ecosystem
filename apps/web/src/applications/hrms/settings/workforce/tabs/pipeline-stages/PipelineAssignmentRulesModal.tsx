import React, { useState, useEffect } from 'react';
import { Modal } from '../../../../../../design-system/components/Modal/Modal';
import { Button } from '../../../../../../design-system/components/Button/Button';
import { Input } from '../../../../../../design-system/components/Input/Input';
import { Select } from '../../../../../../design-system/components/Select/Select';
import { Switch } from '../../../../../../design-system/components/Switch/Switch';
import { Badge } from '../../../../../../design-system/components/Badge/Badge';
import { Alert } from '../../../../../../design-system/components/Alert/Alert';
import { EmptyState } from '../../../../../../design-system/components/EmptyState/EmptyState';
import { BezentIcon } from '../../../../../../design-system/icons';
import type {
  OnboardingPipeline,
  PipelineAssignmentRule,
  ConditionField,
  ConditionOperator,
} from '../../../types/pipeline.types';

interface PipelineAssignmentRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  pipelines: OnboardingPipeline[];
  rules: PipelineAssignmentRule[];
  onSaveRules: (
    rules: Omit<PipelineAssignmentRule, 'tenantId' | 'companyId' | 'createdAt' | 'updatedAt'>[],
  ) => Promise<void>;
}

export function PipelineAssignmentRulesModal({
  isOpen,
  onClose,
  pipelines,
  rules: initialRules,
  onSaveRules,
}: PipelineAssignmentRulesModalProps) {
  const [rules, setRules] = useState<PipelineAssignmentRule[]>(() =>
    [...initialRules].sort((a, b) => a.priority - b.priority),
  );
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);

  // Form states for adding/editing a rule
  const [ruleName, setRuleName] = useState('');
  const [conditionField, setConditionField] = useState<ConditionField>('employmentType');
  const [operator, setOperator] = useState<ConditionOperator>('equals');
  const [conditionValue, setConditionValue] = useState('');
  const [targetPipelineId, setTargetPipelineId] = useState('');
  const [isRuleActive, setIsRuleActive] = useState(true);

  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const activePipelines = pipelines.filter((p) => p.isActive);

  useEffect(() => {
    setRules([...initialRules].sort((a, b) => a.priority - b.priority));
    setError(null);
    setSuccess(null);
    setIsEditorOpen(false);
  }, [initialRules, isOpen]);

  const resetForm = () => {
    setRuleName('');
    setConditionField('employmentType');
    setOperator('equals');
    setConditionValue('');
    setTargetPipelineId(activePipelines[0]?.id || '');
    setIsRuleActive(true);
    setEditingRuleId(null);
    setIsEditorOpen(false);
    setError(null);
  };

  const handleOpenAdd = () => {
    resetForm();
    setTargetPipelineId(activePipelines[0]?.id || '');
    setIsEditorOpen(true);
  };

  const handleOpenEdit = (rule: PipelineAssignmentRule) => {
    setRuleName(rule.name);
    setConditionField(rule.conditionField);
    setOperator(rule.operator);
    setConditionValue(rule.conditionValue);
    setTargetPipelineId(rule.targetPipelineId);
    setIsRuleActive(rule.isActive);
    setEditingRuleId(rule.id);
    setIsEditorOpen(true);
    setError(null);
  };

  const handleSaveRule = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = ruleName.trim();
    if (!trimmedName) {
      setError('Rule name is required.');
      return;
    }
    if (!targetPipelineId) {
      setError('An active target pipeline must be assigned.');
      return;
    }
    if (operator !== 'is_not_empty' && !conditionValue.trim()) {
      setError('Condition value cannot be empty.');
      return;
    }

    if (editingRuleId) {
      setRules((prev) =>
        prev.map((r) =>
          r.id === editingRuleId
            ? {
                ...r,
                name: trimmedName,
                conditionField,
                operator,
                conditionValue: conditionValue.trim(),
                targetPipelineId,
                isActive: isRuleActive,
              }
            : r,
        ),
      );
    } else {
      const newRule: PipelineAssignmentRule = {
        id: `rule_${Date.now()}`,
        tenantId: '',
        companyId: '',
        name: trimmedName,
        priority: rules.length + 1,
        conditionField,
        operator,
        conditionValue: conditionValue.trim(),
        targetPipelineId,
        isActive: isRuleActive,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setRules((prev) => [...prev, newRule]);
    }

    resetForm();
  };

  const handleDeleteRule = (ruleId: string) => {
    const updated = rules
      .filter((r) => r.id !== ruleId)
      .map((r, idx) => ({ ...r, priority: idx + 1 }));
    setRules(updated);
    if (editingRuleId === ruleId) {
      resetForm();
    }
  };

  const handleMoveUp = (index: number) => {
    if (index <= 0) return;
    const newRules = [...rules];
    const prev = newRules[index - 1]!;
    const curr = newRules[index]!;
    newRules[index - 1] = curr;
    newRules[index] = prev;
    const reindexed = newRules.map((r, idx) => ({ ...r, priority: idx + 1 }));
    setRules(reindexed);
  };

  const handleMoveDown = (index: number) => {
    if (index >= rules.length - 1) return;
    const newRules = [...rules];
    const curr = newRules[index]!;
    const next = newRules[index + 1]!;
    newRules[index] = next;
    newRules[index + 1] = curr;
    const reindexed = newRules.map((r, idx) => ({ ...r, priority: idx + 1 }));
    setRules(reindexed);
  };

  const handleToggleActive = (ruleId: string, active: boolean) => {
    setRules((prev) =>
      prev.map((r) => (r.id === ruleId ? { ...r, isActive: active } : r)),
    );
  };

  // Check for duplicate condition conflicts
  const conflictingRules = React.useMemo(() => {
    const conflicts: string[] = [];
    const seen = new Map<string, string>();

    for (const rule of rules.filter((r) => r.isActive)) {
      const key = `${rule.conditionField}:${rule.operator}:${rule.conditionValue.toLowerCase().trim()}`;
      if (seen.has(key)) {
        conflicts.push(`"${rule.name}" conflicts with earlier rule "${seen.get(key)}"`);
      } else {
        seen.set(key, rule.name);
      }
    }
    return conflicts;
  }, [rules]);

  const handleSaveAll = async () => {
    try {
      setSaving(true);
      setError(null);
      await onSaveRules(
        rules.map((r, idx) => ({
          id: r.id,
          name: r.name,
          priority: idx + 1,
          conditionField: r.conditionField,
          operator: r.operator,
          conditionValue: r.conditionValue,
          targetPipelineId: r.targetPipelineId,
          isActive: r.isActive,
        })),
      );
      setSuccess('Pipeline assignment rules saved successfully.');
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save rules');
    } finally {
      setSaving(false);
    }
  };

  const getPipelineName = (pipelineId: string) => {
    const match = pipelines.find((p) => p.id === pipelineId);
    return match ? match.name : 'Unknown Pipeline';
  };

  const formatCondition = (rule: PipelineAssignmentRule) => {
    const fieldMap: Record<ConditionField, string> = {
      employmentType: 'Employment Type',
      departmentId: 'Department',
      locationId: 'Work Location',
      hiringCategory: 'Hiring Category',
    };
    const opMap: Record<ConditionOperator, string> = {
      equals: 'equals',
      not_equals: 'does not equal',
      in: 'is in',
      is_not_empty: 'is provided',
    };

    const fieldLabel = fieldMap[rule.conditionField] || rule.conditionField;
    const opLabel = opMap[rule.operator] || rule.operator;

    if (rule.operator === 'is_not_empty') {
      return `${fieldLabel} ${opLabel}`;
    }
    return `${fieldLabel} ${opLabel} "${rule.conditionValue}"`;
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      title="Pipeline Assignment Rules"
      description="Route candidates automatically into tailored onboarding pipelines based on employment type, hiring category, or department."
      headerActions={
        !isEditorOpen && (
          <Button
            variant="secondary"
            size="sm"
            onClick={handleOpenAdd}
            leftIcon={<BezentIcon name="plus" size={14} />}
          >
            Add Assignment Rule
          </Button>
        )
      }
      footer={
        <div className="bezent-cif-modal-footer">
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSaveAll} loading={saving}>
            Save Rules
          </Button>
        </div>
      }
    >
      <div className="bezent-pipeline-rules-modal-body">
        {error && (
          <Alert variant="danger" title="Error">
            {error}
          </Alert>
        )}

        {success && (
          <Alert variant="success" title="Success">
            {success}
          </Alert>
        )}

        {conflictingRules.length > 0 && (
          <Alert variant="warning" title="Potential Overlap Detected">
            Multiple rules evaluate the same condition criteria. Higher priority rules will evaluate first:{' '}
            {conflictingRules.join('; ')}.
          </Alert>
        )}

        {/* Rule Editor (Add / Edit Form) */}
        {isEditorOpen && (
          <div className="bezent-pipeline-rule-editor-card">
            <h4 className="bezent-pipeline-rule-editor-title">
              {editingRuleId ? 'Edit Assignment Rule' : 'New Assignment Rule'}
            </h4>
            <form onSubmit={handleSaveRule} className="bezent-pipeline-modal-form">
              <div className="bezent-pipeline-modal-field">
                <label htmlFor="rule-name-input" className="bezent-pipeline-label">
                  Rule Name <span className="bezent-pipeline-required">*</span>
                </label>
                <Input
                  id="rule-name-input"
                  value={ruleName}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRuleName(e.target.value)}
                  placeholder="e.g. Interns &amp; Co-op Route"
                  autoFocus
                />
              </div>

              <div className="bezent-pipeline-rule-conditions-grid">
                <div className="bezent-pipeline-modal-field">
                  <label htmlFor="rule-field-select" className="bezent-pipeline-label">
                    Condition Field
                  </label>
                  <Select
                    id="rule-field-select"
                    value={conditionField}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                      setConditionField(e.target.value as ConditionField)
                    }
                  >
                    <option value="employmentType">Employment Type</option>
                    <option value="hiringCategory">Hiring Category</option>
                    <option value="departmentId">Department</option>
                    <option value="locationId">Work Location</option>
                  </Select>
                </div>

                <div className="bezent-pipeline-modal-field">
                  <label htmlFor="rule-op-select" className="bezent-pipeline-label">
                    Operator
                  </label>
                  <Select
                    id="rule-op-select"
                    value={operator}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                      setOperator(e.target.value as ConditionOperator)
                    }
                  >
                    <option value="equals">Equals</option>
                    <option value="not_equals">Does Not Equal</option>
                    <option value="in">In List (comma separated)</option>
                    <option value="is_not_empty">Is Provided / Not Empty</option>
                  </Select>
                </div>

                {operator !== 'is_not_empty' && (
                  <div className="bezent-pipeline-modal-field">
                    <label htmlFor="rule-val-input" className="bezent-pipeline-label">
                      Condition Value <span className="bezent-pipeline-required">*</span>
                    </label>
                    <Input
                      id="rule-val-input"
                      value={conditionValue}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setConditionValue(e.target.value)
                      }
                      placeholder={
                        conditionField === 'employmentType'
                          ? 'e.g. contract, intern, part_time'
                          : 'e.g. executive, campus'
                      }
                    />
                  </div>
                )}
              </div>

              <div className="bezent-pipeline-modal-row">
                <div className="bezent-pipeline-modal-field">
                  <label htmlFor="rule-pipeline-select" className="bezent-pipeline-label">
                    Assigned Pipeline <span className="bezent-pipeline-required">*</span>
                  </label>
                  <Select
                    id="rule-pipeline-select"
                    value={targetPipelineId}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                      setTargetPipelineId(e.target.value)
                    }
                  >
                    {activePipelines.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} {p.isDefault ? '(Default)' : ''}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="bezent-pipeline-modal-field bezent-pipeline-rule-active-col">
                  <label className="bezent-pipeline-label">Rule Active</label>
                  <div className="bezent-pipeline-rule-switch-wrap">
                    <Switch
                      checked={isRuleActive}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setIsRuleActive(e.target.checked)
                      }
                      aria-label="Toggle rule active"
                    />
                    <span className="bezent-pipeline-switch-hint">
                      {isRuleActive ? 'Evaluating' : 'Disabled'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bezent-pipeline-rule-editor-actions">
                <Button variant="secondary" size="sm" onClick={resetForm}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" onClick={handleSaveRule}>
                  {editingRuleId ? 'Update Rule' : 'Add Rule to Table'}
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Rules Table / List */}
        <div className="bezent-pipeline-rules-list">
          {rules.length === 0 ? (
            <EmptyState
              title="No Assignment Rules Configured"
              description="Candidates will automatically default to the primary organization onboarding pipeline."
              primaryAction={{
                label: 'Create First Rule',
                onClick: handleOpenAdd,
              }}
            />
          ) : (
            <div className="bezent-pipeline-rules-table-wrap">
              <table className="bezent-pipeline-rules-table">
                <thead>
                  <tr>
                    <th scope="col" className="bezent-pipeline-rules-th-priority">
                      Priority
                    </th>
                    <th scope="col">Rule Name</th>
                    <th scope="col">Condition Expression</th>
                    <th scope="col">Assigned Pipeline</th>
                    <th scope="col">Status</th>
                    <th scope="col" className="bezent-pipeline-rules-th-actions">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rules.map((rule, idx) => (
                    <tr key={rule.id} className="bezent-pipeline-rule-tr">
                      <td className="bezent-pipeline-td-priority">
                        <div className="bezent-pipeline-reorder-inline">
                          <button
                            type="button"
                            className="bezent-pipeline-reorder-btn"
                            onClick={() => handleMoveUp(idx)}
                            disabled={idx === 0}
                            aria-label={`Move rule ${rule.name} up`}
                          >
                            <BezentIcon name="chevronUp" size={12} />
                          </button>
                          <span className="bezent-pipeline-priority-number">{idx + 1}</span>
                          <button
                            type="button"
                            className="bezent-pipeline-reorder-btn"
                            onClick={() => handleMoveDown(idx)}
                            disabled={idx === rules.length - 1}
                            aria-label={`Move rule ${rule.name} down`}
                          >
                            <BezentIcon name="chevronDown" size={12} />
                          </button>
                        </div>
                      </td>
                      <td className="bezent-pipeline-td-name">
                        <strong>{rule.name}</strong>
                      </td>
                      <td className="bezent-pipeline-td-condition">
                        <code className="bezent-pipeline-condition-code">
                          {formatCondition(rule)}
                        </code>
                      </td>
                      <td>
                        <Badge variant="info">{getPipelineName(rule.targetPipelineId)}</Badge>
                      </td>
                      <td>
                        <Switch
                          checked={rule.isActive}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            handleToggleActive(rule.id, e.target.checked)
                          }
                          aria-label={`Toggle active for ${rule.name}`}
                        />
                      </td>
                      <td className="bezent-pipeline-td-actions">
                        <div className="bezent-pipeline-inline-actions">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleOpenEdit(rule)}
                            leftIcon={<BezentIcon name="edit" size={13} />}
                            aria-label={`Edit ${rule.name}`}
                          />
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => handleDeleteRule(rule.id)}
                            leftIcon={<BezentIcon name="trash" size={13} />}
                            aria-label={`Delete ${rule.name}`}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Precedence Policy Explainer Footer */}
        <div className="bezent-pipeline-precedence-footer">
          <h5 className="bezent-pipeline-precedence-title">Assignment Precedence Order</h5>
          <ol className="bezent-pipeline-precedence-list">
            <li>
              <strong>1. Priority Matching Rule:</strong> Evaluated in ascending priority order (1 takes precedence over 2).
            </li>
            <li>
              <strong>2. Manual HR Selection:</strong> Explicit operator override takes precedence for custom hiring cases.
            </li>
            <li>
              <strong>3. Organization Default:</strong> Falls back directly to the designated Default Pipeline when no rules match.
            </li>
          </ol>
        </div>
      </div>
    </Modal>
  );
}
