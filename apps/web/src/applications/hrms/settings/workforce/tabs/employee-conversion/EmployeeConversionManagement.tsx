import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '../../../../../../design-system/components/Button/Button';
import { Card } from '../../../../../../design-system/components/Card/Card';
import { Badge } from '../../../../../../design-system/components/Badge/Badge';
import { Alert } from '../../../../../../design-system/components/Alert/Alert';
import { Skeleton } from '../../../../../../design-system/components/Skeleton/Skeleton';
import { Inline } from '../../../../../../design-system/components/Inline/Inline';
import { BezentIcon } from '../../../../../../design-system/icons';
import {
  fetchConversionConfig,
  updateConversionConfig,
  resetConversionConfig,
} from '../../../api/employeeConversionApi';
import type {
  EmployeeConversionConfig,
  ConversionSettingsConfig,
  FieldMappingItem,
  RequiredInfoItem,
  PostConversionActionsConfig,
  ConversionRulesConfig,
} from '../../../types/employeeConversion.types';
import { ConversionSettingsModal } from './ConversionSettingsModal';
import { FieldMappingModal } from './FieldMappingModal';
import { RequiredInformationModal } from './RequiredInformationModal';
import { PostConversionActionsModal } from './PostConversionActionsModal';
import { ConversionRulesModal } from './ConversionRulesModal';

interface EmployeeConversionManagementProps {
  isEmbedded?: boolean;
}

export const DEFAULT_CONVERSION_CONFIG: EmployeeConversionConfig = {
  tenantId: 'default',
  companyId: 'default',
  settings: {
    conversionMode: 'both',
    defaultMode: 'manual',
    conversionTriggerStage: 'completed',
    defaultEmploymentStatus: 'probation',
    effectiveDateType: 'joining_date',
    allowHrOverride: true,
  },
  fieldMappings: [
    {
      id: 'map_name',
      sourceField: 'fullName',
      destinationField: 'displayName',
      sourceLabel: 'Full Name',
      destinationLabel: 'Employee Name',
      isActive: true,
      isSystem: true,
    },
    {
      id: 'map_email',
      sourceField: 'email',
      destinationField: 'email',
      sourceLabel: 'Email',
      destinationLabel: 'Work Email',
      isActive: true,
      isSystem: true,
    },
    {
      id: 'map_phone',
      sourceField: 'phone',
      destinationField: 'phone',
      sourceLabel: 'Phone',
      destinationLabel: 'Mobile Number',
      isActive: true,
      isSystem: true,
    },
    {
      id: 'map_dept',
      sourceField: 'departmentId',
      destinationField: 'departmentId',
      sourceLabel: 'Department',
      destinationLabel: 'Department',
      isActive: true,
      isSystem: true,
    },
    {
      id: 'map_desig',
      sourceField: 'designationId',
      destinationField: 'designationId',
      sourceLabel: 'Designation',
      destinationLabel: 'Designation',
      isActive: true,
      isSystem: true,
    },
    {
      id: 'map_joining_date',
      sourceField: 'joiningDate',
      destinationField: 'joiningDate',
      sourceLabel: 'Joining Date',
      destinationLabel: 'Date of Joining',
      isActive: true,
      isSystem: true,
    },
  ],
  requiredInformation: [
    {
      id: 'req_name',
      fieldKey: 'fullName',
      fieldName: 'Full Name',
      group: 'personal',
      isRequired: true,
      isSystemMandatory: true,
    },
    {
      id: 'req_email',
      fieldKey: 'email',
      fieldName: 'Work Email',
      group: 'additional',
      isRequired: true,
      isSystemMandatory: true,
    },
    {
      id: 'req_dept',
      fieldKey: 'departmentId',
      fieldName: 'Department',
      group: 'employment',
      isRequired: true,
      isSystemMandatory: true,
    },
    {
      id: 'req_desig',
      fieldKey: 'designationId',
      fieldName: 'Designation',
      group: 'employment',
      isRequired: true,
      isSystemMandatory: true,
    },
    {
      id: 'req_joining_date',
      fieldKey: 'joiningDate',
      fieldName: 'Joining Date',
      group: 'employment',
      isRequired: true,
      isSystemMandatory: true,
    },
  ],
  postConversionActions: {
    createEmployeeProfile: true,
    applyChecklistTemplates: true,
    applyRequiredDocuments: true,
    enableEssAccess: true,
    sendNotifications: true,
  },
  conversionRules: {
    preventDuplicateEmployee: true,
    validateRequiredFields: true,
    preserveCandidateHistory: true,
    allowRetryFailedConversion: true,
    restrictedRoles: ['super_admin', 'company_admin', 'hr_manager', 'hr_executive'],
    recordAuditHistory: true,
  },
  updatedAt: 'Recently',
  updatedBy: 'system',
};

export function EmployeeConversionManagement({
  isEmbedded = false,
}: EmployeeConversionManagementProps) {
  const [config, setConfig] = useState<EmployeeConversionConfig>(DEFAULT_CONVERSION_CONFIG);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modal visibility states
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [fieldMappingModalOpen, setFieldMappingModalOpen] = useState(false);
  const [requiredInfoModalOpen, setRequiredInfoModalOpen] = useState(false);
  const [postActionsModalOpen, setPostActionsModalOpen] = useState(false);
  const [rulesModalOpen, setRulesModalOpen] = useState(false);

  const loadConfig = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchConversionConfig();
      setConfig(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load conversion settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const showSuccessBanner = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  // ==================== Save Handlers ====================

  const handleSaveSettings = async (settings: ConversionSettingsConfig) => {
    try {
      const updated = await updateConversionConfig({ settings });
      setConfig(updated);
      showSuccessBanner('Conversion settings updated successfully.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update settings');
    }
  };

  const handleSaveMappings = async (fieldMappings: FieldMappingItem[]) => {
    try {
      const updated = await updateConversionConfig({ fieldMappings });
      setConfig(updated);
      showSuccessBanner('Field mappings updated successfully.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update mappings');
    }
  };

  const handleSaveRequiredInfo = async (requiredInformation: RequiredInfoItem[]) => {
    try {
      const updated = await updateConversionConfig({ requiredInformation });
      setConfig(updated);
      showSuccessBanner('Required information rules updated successfully.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update required info');
    }
  };

  const handleSavePostActions = async (postConversionActions: PostConversionActionsConfig) => {
    try {
      const updated = await updateConversionConfig({ postConversionActions });
      setConfig(updated);
      showSuccessBanner('Post-conversion actions updated successfully.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update post actions');
    }
  };

  const handleSaveRules = async (conversionRules: ConversionRulesConfig) => {
    try {
      const updated = await updateConversionConfig({ conversionRules });
      setConfig(updated);
      showSuccessBanner('Conversion rules and safeguards updated successfully.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update rules');
    }
  };

  const handleResetToDefaults = async () => {
    if (!window.confirm('Are you sure you want to reset all conversion settings to system defaults?')) {
      return;
    }
    try {
      setLoading(true);
      const reset = await resetConversionConfig();
      setConfig(reset);
      showSuccessBanner('Conversion configuration reset to system defaults.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset conversion settings');
    } finally {
      setLoading(false);
    }
  };

  // Calculated summaries
  const activeMappingsCount = config.fieldMappings.filter((m) => m.isActive).length;
  const mandatoryFieldsCount = config.requiredInformation.filter((r) => r.isRequired).length;
  const optionalFieldsCount = config.requiredInformation.filter((r) => !r.isRequired).length;
  const activePostActionsCount = Object.values(config.postConversionActions).filter(Boolean).length;

  return (
    <div
      className={`bezent-empconv-management ${
        isEmbedded ? 'bezent-empconv-management--embedded' : ''
      }`}
    >
      {/* 1. Header (Clean & Embedded-Aware) */}
      <div
        className={`bezent-empconv-header ${
          isEmbedded ? 'bezent-empconv-header--embedded' : ''
        }`}
      >
        <div
          className={`bezent-empconv-header-copy ${
            isEmbedded ? 'bezent-sr-only' : ''
          }`}
        >
          <h2 className="bezent-empconv-header-title">Employee Conversion</h2>
          <p className="bezent-empconv-header-sub">
            Configure criteria, field mappings, mandatory prerequisites, and post-conversion handoffs for promoting candidates into active employees.
          </p>
        </div>

        <div className="bezent-empconv-header-actions">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleResetToDefaults}
            leftIcon={<BezentIcon name="refresh" size={14} />}
            disabled={loading}
          >
            Reset to Defaults
          </Button>
        </div>
      </div>

      {/* Notifications */}
      {successMessage && (
        <Alert variant="success" title="Success">
          {successMessage}
        </Alert>
      )}

      {error && (
        <Alert variant="danger" title="Error">
          {error}
        </Alert>
      )}

      {/* Loading Skeleton */}
      {loading ? (
        <div className="bezent-empconv-tiles-grid bezent-empconv-grid">
          {[1, 2, 3, 4, 5].map((idx) => (
            <div
              key={idx}
              className="bezent-empconv-tile bezent-empconv-card bezent-empconv-tile--skeleton"
            >
              <div className="bezent-empconv-skeleton-icon">
                <Skeleton width="100%" height="100%" />
              </div>
              <div className="bezent-empconv-skeleton-text-group">
                <Skeleton width="75%" height="16px" />
              </div>
              <div className="bezent-empconv-skeleton-pill">
                <Skeleton width="100%" height="100%" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Five Configuration Section Cards in Modern Square/Proportional Tiles Grid */
        <div className="bezent-empconv-tiles-grid bezent-empconv-grid">
          {/* Card 1: Conversion Settings */}
          <div
            className="bezent-empconv-tile bezent-empconv-card"
            onClick={() => setSettingsModalOpen(true)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setSettingsModalOpen(true)}
            title="Configure Conversion Settings"
            aria-label="Conversion Settings"
          >
            <div
              className="bezent-empconv-tile__icon bezent-empconv-tile__icon--settings"
              aria-hidden="true"
            >
              <BezentIcon name="settings" size={22} />
            </div>

            <div className="bezent-empconv-tile__content">
              <h3 className="bezent-empconv-card__title bezent-empconv-tile__title">
                Conversion Settings
              </h3>
              <span className="bezent-empconv-card__subtitle bezent-empconv-tile__subtitle bezent-sr-only">
                Mode, default trigger stage, and status defaults
              </span>
            </div>

            <div className="bezent-empconv-tile__badge bezent-empconv-tile__badge--settings">
              <span className="bezent-empconv-tile__badge-dot" />
              <span className="bezent-empconv-tile__badge-text">
                {config.settings.conversionMode.toUpperCase()}
              </span>
            </div>
          </div>

          {/* Card 2: Field Mapping */}
          <div
            className="bezent-empconv-tile bezent-empconv-card"
            onClick={() => setFieldMappingModalOpen(true)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setFieldMappingModalOpen(true)}
            title="Configure Field Mapping"
            aria-label="Field Mapping"
          >
            <div
              className="bezent-empconv-tile__icon bezent-empconv-tile__icon--mapping"
              aria-hidden="true"
            >
              <BezentIcon name="sync" size={22} />
            </div>

            <div className="bezent-empconv-tile__content">
              <h3 className="bezent-empconv-card__title bezent-empconv-tile__title">
                Field Mapping
              </h3>
              <span className="bezent-empconv-card__subtitle bezent-empconv-tile__subtitle bezent-sr-only">
                Candidate intake to employee directory mappings
              </span>
            </div>

            <div className="bezent-empconv-tile__badge bezent-empconv-tile__badge--mapping">
              <span className="bezent-empconv-tile__badge-dot" />
              <span className="bezent-empconv-tile__badge-text">
                {activeMappingsCount} Active Mappings
              </span>
            </div>
          </div>

          {/* Card 3: Required Information */}
          <div
            className="bezent-empconv-tile bezent-empconv-card"
            onClick={() => setRequiredInfoModalOpen(true)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setRequiredInfoModalOpen(true)}
            title="Configure Required Information"
            aria-label="Required Information"
          >
            <div
              className="bezent-empconv-tile__icon bezent-empconv-tile__icon--required"
              aria-hidden="true"
            >
              <BezentIcon name="checklist" size={22} />
            </div>

            <div className="bezent-empconv-tile__content">
              <h3 className="bezent-empconv-card__title bezent-empconv-tile__title">
                Required Information
              </h3>
              <span className="bezent-empconv-card__subtitle bezent-empconv-tile__subtitle bezent-sr-only">
                Prerequisite fields validated before conversion
              </span>
            </div>

            <div className="bezent-empconv-tile__badge bezent-empconv-tile__badge--required">
              <span className="bezent-empconv-tile__badge-dot" />
              <span className="bezent-empconv-tile__badge-text">
                {mandatoryFieldsCount} Mandatory
              </span>
            </div>
          </div>

          {/* Card 4: Post-Conversion Actions */}
          <div
            className="bezent-empconv-tile bezent-empconv-card"
            onClick={() => setPostActionsModalOpen(true)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setPostActionsModalOpen(true)}
            title="Configure Post-Conversion Actions"
            aria-label="Post-Conversion Actions"
          >
            <div
              className="bezent-empconv-tile__icon bezent-empconv-tile__icon--post"
              aria-hidden="true"
            >
              <BezentIcon name="arrowForward" size={22} />
            </div>

            <div className="bezent-empconv-tile__content">
              <h3 className="bezent-empconv-card__title bezent-empconv-tile__title">
                Post-Conversion Actions
              </h3>
              <span className="bezent-empconv-card__subtitle bezent-empconv-tile__subtitle bezent-sr-only">
                Automated workflows triggered on employee creation
              </span>
            </div>

            <div className="bezent-empconv-tile__badge bezent-empconv-tile__badge--post">
              <span className="bezent-empconv-tile__badge-dot" />
              <span className="bezent-empconv-tile__badge-text">
                {activePostActionsCount} Actions Active
              </span>
            </div>
          </div>

          {/* Card 5: Conversion Rules */}
          <div
            className="bezent-empconv-tile bezent-empconv-card"
            onClick={() => setRulesModalOpen(true)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setRulesModalOpen(true)}
            title="Configure Conversion Rules & Safeguards"
            aria-label="Conversion Rules & Safeguards"
          >
            <div
              className="bezent-empconv-tile__icon bezent-empconv-tile__icon--rules"
              aria-hidden="true"
            >
              <BezentIcon name="organization" size={22} />
            </div>

            <div className="bezent-empconv-tile__content">
              <h3 className="bezent-empconv-card__title bezent-empconv-tile__title">
                Conversion Rules &amp; Safeguards
              </h3>
              <span className="bezent-empconv-card__subtitle bezent-empconv-tile__subtitle bezent-sr-only">
                Duplicate prevention, transactional integrity, and authorized roles
              </span>
            </div>

            <div className="bezent-empconv-tile__badge bezent-empconv-tile__badge--rules">
              <span className="bezent-empconv-tile__badge-dot" />
              <span className="bezent-empconv-tile__badge-text">
                Safeguards Protected
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 5 Modals */}
      {settingsModalOpen && (
        <ConversionSettingsModal
          isOpen={settingsModalOpen}
          onClose={() => setSettingsModalOpen(false)}
          initialSettings={config.settings}
          onSave={handleSaveSettings}
        />
      )}

      {fieldMappingModalOpen && (
        <FieldMappingModal
          isOpen={fieldMappingModalOpen}
          onClose={() => setFieldMappingModalOpen(false)}
          initialMappings={config.fieldMappings}
          onSave={handleSaveMappings}
        />
      )}

      {requiredInfoModalOpen && (
        <RequiredInformationModal
          isOpen={requiredInfoModalOpen}
          onClose={() => setRequiredInfoModalOpen(false)}
          initialItems={config.requiredInformation}
          onSave={handleSaveRequiredInfo}
        />
      )}

      {postActionsModalOpen && (
        <PostConversionActionsModal
          isOpen={postActionsModalOpen}
          onClose={() => setPostActionsModalOpen(false)}
          initialActions={config.postConversionActions}
          onSave={handleSavePostActions}
        />
      )}

      {rulesModalOpen && (
        <ConversionRulesModal
          isOpen={rulesModalOpen}
          onClose={() => setRulesModalOpen(false)}
          initialRules={config.conversionRules}
          onSave={handleSaveRules}
        />
      )}
    </div>
  );
}
