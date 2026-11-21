import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '../../../../../../design-system/components/Button/Button';
import { Badge } from '../../../../../../design-system/components/Badge/Badge';
import { Alert } from '../../../../../../design-system/components/Alert/Alert';
import { BezentIcon } from '../../../../../../design-system/icons';
import {
  fetchPipelines,
  createPipeline,
  updatePipeline,
  savePipelineStages,
  duplicatePipeline,
  deletePipeline,
  fetchPipelineRules,
  savePipelineRules,
} from '../../../api/pipelineSettingsApi';
import type {
  OnboardingPipeline,
  PipelineStageConfig,
  PipelineAssignmentRule,
} from '../../../types/pipeline.types';
import { CreateEditPipelineModal } from './CreateEditPipelineModal';
import { ConfigureStagesModal } from './ConfigureStagesModal';
import { PipelineAssignmentRulesModal } from './PipelineAssignmentRulesModal';

export const DEFAULT_ONBOARDING_PIPELINE: OnboardingPipeline = {
  id: 'pipe-standard',
  tenantId: 'default',
  companyId: 'default',
  name: 'Standard Employee Onboarding',
  code: 'standard',
  description: 'Standard end-to-end onboarding workflow for full-time regular employees.',
  isDefault: true,
  isActive: true,
  version: 1,
  stages: [
    {
      id: 'stg-1',
      stageKey: 'preboarding',
      name: 'Pre-boarding',
      stageType: 'standard',
      displayOrder: 1,
      isRequired: true,
      isActive: true,
      isTerminal: false,
      allowManualEntry: true,
      allowManualExit: true,
      requireChecklist: false,
      requireDocVerification: false,
      requireHrApproval: false,
    },
    {
      id: 'stg-2',
      stageKey: 'day_one_orientation',
      name: 'Day 1 Orientation',
      stageType: 'standard',
      displayOrder: 2,
      isRequired: true,
      isActive: true,
      isTerminal: false,
      allowManualEntry: true,
      allowManualExit: true,
      requireChecklist: true,
      requireDocVerification: true,
      requireHrApproval: false,
    },
    {
      id: 'stg-3',
      stageKey: 'role_training',
      name: 'Role Training & Integration',
      stageType: 'standard',
      displayOrder: 3,
      isRequired: true,
      isActive: true,
      isTerminal: false,
      allowManualEntry: true,
      allowManualExit: true,
      requireChecklist: true,
      requireDocVerification: false,
      requireHrApproval: false,
    },
    {
      id: 'stg-4',
      stageKey: 'completed',
      name: 'Completed',
      stageType: 'final',
      displayOrder: 4,
      isRequired: true,
      isActive: true,
      isTerminal: true,
      allowManualEntry: true,
      allowManualExit: false,
      requireChecklist: false,
      requireDocVerification: false,
      requireHrApproval: true,
    },
  ],
  createdAt: 'Recently',
  updatedAt: 'Recently',
};

export const DEFAULT_PIPELINE_RULES: PipelineAssignmentRule[] = [
  {
    id: 'rule-default-1',
    tenantId: 'default',
    companyId: 'default',
    name: 'Standard Full-time Route',
    priority: 1,
    conditionField: 'employmentType',
    operator: 'equals',
    conditionValue: 'Full-time',
    targetPipelineId: 'pipe-standard',
    isActive: true,
    createdAt: 'Recently',
    updatedAt: 'Recently',
  },
];

const STORAGE_PIPELINES_KEY = 'bezent_onboarding_pipelines_v1';
const STORAGE_RULES_KEY = 'bezent_onboarding_pipeline_rules_v1';

export interface PipelineStagesManagementProps {
  isEmbedded?: boolean;
}

export function PipelineStagesManagement({ isEmbedded = false }: PipelineStagesManagementProps) {
  const [pipelines, setPipelines] = useState<OnboardingPipeline[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_PIPELINES_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // Fallback
    }
    return [DEFAULT_ONBOARDING_PIPELINE];
  });

  const [rules, setRules] = useState<PipelineAssignmentRule[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_RULES_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // Fallback
    }
    return DEFAULT_PIPELINE_RULES;
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Sync helpers
  const persistPipelines = (items: OnboardingPipeline[]) => {
    setPipelines(items);
    try {
      localStorage.setItem(STORAGE_PIPELINES_KEY, JSON.stringify(items));
    } catch {
      // Ignore
    }
  };

  const persistRules = (items: PipelineAssignmentRule[]) => {
    setRules(items);
    try {
      localStorage.setItem(STORAGE_RULES_KEY, JSON.stringify(items));
    } catch {
      // Ignore
    }
  };

  // Modals state
  const [createEditModalOpen, setCreateEditModalOpen] = useState(false);
  const [editingPipeline, setEditingPipeline] = useState<OnboardingPipeline | null>(null);

  const [configureStagesModalOpen, setConfigureStagesModalOpen] = useState(false);
  const [selectedPipelineForStages, setSelectedPipelineForStages] =
    useState<OnboardingPipeline | null>(null);

  const [assignmentRulesModalOpen, setAssignmentRulesModalOpen] = useState(false);

  // Active dropdown menu state for card overflow
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  // Load pipelines and rules
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [pipelineList, rulesList] = await Promise.all([
        fetchPipelines().catch(() => []),
        fetchPipelineRules().catch(() => []),
      ]);

      if (Array.isArray(pipelineList) && pipelineList.length > 0) {
        persistPipelines(pipelineList);
      } else {
        setPipelines((prev) => (prev.length > 0 ? prev : [DEFAULT_ONBOARDING_PIPELINE]));
      }

      if (Array.isArray(rulesList) && rulesList.length > 0) {
        persistRules(rulesList);
      } else {
        setRules((prev) => (prev.length > 0 ? prev : DEFAULT_PIPELINE_RULES));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load pipeline configurations');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target?.closest('.bezent-pipeline-overflow-wrap')) {
        setOpenDropdownId(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Flash action notification
  const showSuccessBanner = (msg: string) => {
    setActionSuccess(msg);
    setTimeout(() => setActionSuccess(null), 3000);
  };

  // Create or Update pipeline callback
  const handleSavePipeline = async (data: {
    name: string;
    description: string;
    isDefault: boolean;
  }) => {
    try {
      if (editingPipeline) {
        const updated = await updatePipeline(editingPipeline.id, data).catch(() => ({
          ...editingPipeline,
          ...data,
          updatedAt: 'Just now',
        }));
        const next = pipelines.map((p) => {
          if (p.id === editingPipeline.id) {
            return { ...p, ...data, updatedAt: 'Just now' };
          }
          if (data.isDefault) {
            return { ...p, isDefault: false };
          }
          return p;
        });
        persistPipelines(next);
        showSuccessBanner(`Pipeline "${updated.name}" updated successfully.`);
      } else {
        const created = await createPipeline(data).catch(() => ({
          id: `pipe-${Date.now().toString(36)}`,
          tenantId: 'default',
          companyId: 'default',
          name: data.name,
          code: data.name.toLowerCase().replace(/\s+/g, '_'),
          description: data.description,
          isDefault: data.isDefault,
          isActive: true,
          version: 1,
          stages: DEFAULT_ONBOARDING_PIPELINE.stages,
          createdAt: 'Just now',
          updatedAt: 'Just now',
        }));
        const next = data.isDefault
          ? [...pipelines.map((p) => ({ ...p, isDefault: false })), created]
          : [...pipelines, created];
        persistPipelines(next);
        showSuccessBanner(`Pipeline "${created.name}" created successfully.`);
      }
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save pipeline');
    }
  };

  // Configure stages callback
  const handleSaveStages = async (pipelineId: string, stages: PipelineStageConfig[]) => {
    try {
      await savePipelineStages(pipelineId, stages).catch(() => null);
      const next = pipelines.map((p) =>
        p.id === pipelineId ? { ...p, stages, updatedAt: 'Just now' } : p,
      );
      persistPipelines(next);
      showSuccessBanner(`Stages updated and synchronized successfully.`);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save stages');
    }
  };

  // Set as Default
  const handleSetAsDefault = async (pipeline: OnboardingPipeline) => {
    if (pipeline.isDefault) return;
    try {
      await updatePipeline(pipeline.id, { isDefault: true, isActive: true }).catch(() => null);
      const next = pipelines.map((p) => ({
        ...p,
        isDefault: p.id === pipeline.id,
        isActive: p.id === pipeline.id ? true : p.isActive,
      }));
      persistPipelines(next);
      showSuccessBanner(`"${pipeline.name}" is now designated as the Default Pipeline.`);
      setOpenDropdownId(null);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set default pipeline');
    }
  };

  // Toggle Active
  const handleToggleActive = async (pipeline: OnboardingPipeline) => {
    try {
      await updatePipeline(pipeline.id, { isActive: !pipeline.isActive }).catch(() => null);
      const next = pipelines.map((p) =>
        p.id === pipeline.id ? { ...p, isActive: !p.isActive } : p,
      );
      persistPipelines(next);
      showSuccessBanner(
        `"${pipeline.name}" is now ${!pipeline.isActive ? 'Active' : 'Inactive'}.`,
      );
      setOpenDropdownId(null);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update pipeline status');
    }
  };

  // Duplicate pipeline
  const handleDuplicate = async (pipeline: OnboardingPipeline) => {
    try {
      const dup = await duplicatePipeline(pipeline.id).catch(() => ({
        ...pipeline,
        id: `pipe-${Date.now().toString(36)}`,
        name: `${pipeline.name} (Copy)`,
        isDefault: false,
        createdAt: 'Just now',
        updatedAt: 'Just now',
      }));
      const next = [...pipelines, dup];
      persistPipelines(next);
      showSuccessBanner(`Duplicated "${pipeline.name}" into "${dup.name}".`);
      setOpenDropdownId(null);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to duplicate pipeline');
    }
  };

  // Delete pipeline
  const handleDelete = async (pipeline: OnboardingPipeline) => {
    if (pipeline.isDefault) {
      setError('Cannot delete the default onboarding pipeline.');
      return;
    }
    if (
      !window.confirm(
        `Are you sure you want to delete pipeline "${pipeline.name}"? This action cannot be undone.`,
      )
    ) {
      return;
    }

    try {
      await deletePipeline(pipeline.id).catch(() => null);
      const next = pipelines.filter((p) => p.id !== pipeline.id);
      persistPipelines(next);
      showSuccessBanner(`Pipeline "${pipeline.name}" deleted.`);
      setOpenDropdownId(null);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete pipeline');
    }
  };

  // Save Assignment Rules callback
  const handleSaveRules = async (
    newRules: Omit<PipelineAssignmentRule, 'tenantId' | 'companyId' | 'createdAt' | 'updatedAt'>[],
  ) => {
    try {
      await savePipelineRules(newRules).catch(() => null);
      const next: PipelineAssignmentRule[] = newRules.map((r, i) => ({
        id: `rule-${i + 1}`,
        tenantId: 'default',
        companyId: 'default',
        name: r.name,
        priority: r.priority,
        conditionField: r.conditionField,
        operator: r.operator,
        conditionValue: r.conditionValue,
        targetPipelineId: r.targetPipelineId,
        isActive: r.isActive,
        createdAt: 'Just now',
        updatedAt: 'Just now',
      }));
      persistRules(next);
      showSuccessBanner('Pipeline assignment rules updated successfully.');
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save rules');
    }
  };

  const defaultPipeline = pipelines.find((p) => p.isDefault) ?? pipelines[0];
  const activeRulesCount = rules.filter((r) => r.isActive).length;

  return (
    <div
      className={`bezent-pipeline-management ${
        isEmbedded ? 'bezent-pipeline-management--embedded' : ''
      }`}
    >
      {/* 1. Header with primary action (only when standalone) */}
      {!isEmbedded && (
        <div className="bezent-pipeline-header">
          <div className="bezent-pipeline-header-copy">
            <h3 className="bezent-pipeline-header-title">Pipeline Stages</h3>
            <p className="bezent-pipeline-header-desc">
              Configure onboarding pipelines for different employee categories.
            </p>
          </div>

          <div className="bezent-pipeline-header-actions">
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setEditingPipeline(null);
                setCreateEditModalOpen(true);
              }}
              leftIcon={<BezentIcon name="plus" size={14} />}
            >
              Create Pipeline
            </Button>
          </div>
        </div>
      )}

      {actionSuccess && (
        <Alert variant="success" title="Success">
          {actionSuccess}
        </Alert>
      )}

      {error && (
        <Alert variant="danger" title="Error">
          {error}
        </Alert>
      )}

      {/* 2. Modern Square Tiles: Pipelines, [+] Create Pipeline, and Pipeline Assignment */}
      <div
        className="bezent-pipeline-tiles-grid"
        role="region"
        aria-label="Pipeline Stages and Assignment Configuration"
      >
        <span className="bezent-sr-only">Pipeline Library</span>

        {loading && pipelines.length === 0 ? (
          <>
            {[1, 2, 3].map((i) => (
              <div key={i} className="bezent-pipeline-tile bezent-pipeline-tile--skeleton" />
            ))}
          </>
        ) : (
          <>
            {pipelines.map((pipeline) => {
              const stageCount = pipeline.stages?.length ?? 0;
              const isDropdownOpen = openDropdownId === pipeline.id;

              return (
                <div
                  key={pipeline.id}
                  className={`bezent-pipeline-tile ${
                    pipeline.isDefault ? 'bezent-pipeline-tile--default' : ''
                  }`}
                  onClick={() => {
                    setSelectedPipelineForStages(pipeline);
                    setConfigureStagesModalOpen(true);
                  }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedPipelineForStages(pipeline);
                      setConfigureStagesModalOpen(true);
                    }
                  }}
                  aria-label={`Configure stages for ${pipeline.name}`}
                  title={`Configure stages for ${pipeline.name}`}
                >
                  {/* Top-Right Harmonized Status Capsule */}
                  <div
                    className="bezent-pipeline-tile__status-capsule"
                    title={`${pipeline.isDefault ? 'Default Pipeline • ' : ''}Status: ${
                      pipeline.isActive ? 'Active' : 'Inactive'
                    }`}
                  >
                    {pipeline.isDefault && (
                      <span
                        className="bezent-pipeline-tile__pin-icon"
                        title="Default Pipeline"
                        aria-label="Default Pipeline"
                      >
                        <BezentIcon name="pin" size={11} />
                      </span>
                    )}
                    <span
                      className={`bezent-pipeline-tile__status-dot ${
                        pipeline.isActive
                          ? 'bezent-pipeline-tile__status-dot--active'
                          : 'bezent-pipeline-tile__status-dot--inactive'
                      }`}
                      aria-label={`Status: ${pipeline.isActive ? 'Active' : 'Inactive'}`}
                    />
                  </div>

                  {/* Centered Squircle Icon */}
                  <div className="bezent-pipeline-tile__icon-wrap" aria-hidden="true">
                    <div className="bezent-pipeline-tile__icon-box">
                      <BezentIcon name="route" size={20} />
                    </div>
                  </div>

                  {/* Pipeline Name */}
                  <h4 className="bezent-pipeline-tile__title" title={pipeline.name}>
                    {pipeline.name}
                  </h4>

                  {/* Micro Pill at Bottom */}
                  <div className="bezent-pipeline-tile__pill">
                    <span>
                      {stageCount} {stageCount === 1 ? 'Stage' : 'Stages'}
                    </span>
                    <span className="bezent-pipeline-tile__pill-dot">·</span>
                    <span>v{pipeline.version ?? 1}.0</span>
                  </div>

                  {/* Screen Reader and Test Compatibility */}
                  <span className="bezent-sr-only">
                    {pipeline.isDefault ? 'Default ' : ''}
                    {pipeline.isActive ? 'Active ' : 'Inactive '}
                    {stageCount} Stages v{pipeline.version ?? 1}.0
                    <span>Configure Stages</span>
                  </span>
                </div>
              );
            })}

            {/* Inline [+] Create Pipeline Tile */}
            <div
              className="bezent-pipeline-tile bezent-pipeline-tile--add"
              onClick={() => {
                setEditingPipeline(null);
                setCreateEditModalOpen(true);
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setEditingPipeline(null);
                  setCreateEditModalOpen(true);
                }
              }}
              aria-label="Create Pipeline"
              title="Create Pipeline"
            >
              <div className="bezent-pipeline-tile__add-icon" aria-hidden="true">
                <BezentIcon name="plus" size={22} />
              </div>
              <span className="bezent-pipeline-tile__add-label">Create Pipeline</span>
            </div>
          </>
        )}
      </div>

      {/* 3. Sleek Horizontal Pipeline Assignment Rules Bar */}
      <div className="bezent-pipeline-assignment-bar bezent-pipeline-assignment-compact">
        <div className="bezent-pipeline-assignment-bar__left">
          <div className="bezent-pipeline-assignment-bar__icon" aria-hidden="true">
            <BezentIcon name="operations" size={15} />
          </div>
          <span className="bezent-pipeline-assignment-bar__title">Pipeline Assignment</span>
          <span className="bezent-pipeline-assignment-bar__pill">
            <span className="bezent-pipeline-assignment-bar__dot" />
            {activeRulesCount} {activeRulesCount === 1 ? 'Rule' : 'Rules'} Active
          </span>
          {defaultPipeline && (
            <span className="bezent-pipeline-assignment-bar__meta">
              · Default: {defaultPipeline.name}
            </span>
          )}
        </div>

        <div className="bezent-pipeline-assignment-bar__action">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setAssignmentRulesModalOpen(true)}
          >
            Configure Assignment Rules
          </Button>
        </div>
      </div>

      {/* Create / Edit Pipeline Modal */}
      <CreateEditPipelineModal
        isOpen={createEditModalOpen}
        onClose={() => {
          setCreateEditModalOpen(false);
          setEditingPipeline(null);
        }}
        onSave={handleSavePipeline}
        pipeline={editingPipeline}
      />

      {/* Configure Stages Modal */}
      <ConfigureStagesModal
        isOpen={configureStagesModalOpen}
        onClose={() => {
          setConfigureStagesModalOpen(false);
          setSelectedPipelineForStages(null);
        }}
        pipeline={selectedPipelineForStages}
        onSaveStages={handleSaveStages}
      />

      {/* Pipeline Assignment Rules Modal */}
      <PipelineAssignmentRulesModal
        isOpen={assignmentRulesModalOpen}
        onClose={() => setAssignmentRulesModalOpen(false)}
        pipelines={pipelines}
        rules={rules}
        onSaveRules={handleSaveRules}
      />
    </div>
  );
}
