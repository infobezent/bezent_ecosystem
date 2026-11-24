import React from 'react';
import { BezentIcon, type BezentIconName } from '../../../../../design-system/icons';
import { PipelineStagesManagement } from './pipeline-stages/PipelineStagesManagement';
import { ChecklistTemplatesManagement } from './checklist-templates/ChecklistTemplatesManagement';
import { RequiredDocumentsManagement } from './required-documents/RequiredDocumentsManagement';
import { EmployeeConversionManagement } from './employee-conversion/EmployeeConversionManagement';
import { NotificationsRemindersManagement } from './notifications-reminders/NotificationsRemindersManagement';
import { OnboardingGeneralSettingsManagement } from './general-settings/OnboardingGeneralSettingsManagement';

interface SectionConfig {
  id: string;
  title: string;
  description: string;
  icon: BezentIconName;
  placeholderTitle: string;
  placeholderHint: string;
  fullWidth?: boolean;
}

const ONBOARDING_LAYOUT_SECTIONS: SectionConfig[] = [
  {
    id: 'general-settings',
    title: 'General Settings',
    description:
      'Configure system-wide onboarding toggles, default SLA durations, and branch applicability.',
    icon: 'settings',
    placeholderTitle: 'General Settings Workspace',
    placeholderHint:
      'Space reserved for module enablement, target duration thresholds, and operational defaults.',
    fullWidth: true,
  },
  {
    id: 'notifications-reminders',
    title: 'Notifications & Reminders',
    description:
      'Automate email notifications, welcome announcements, and task reminder schedules.',
    icon: 'notifications',
    placeholderTitle: 'Notifications & Reminders Workspace',
    placeholderHint:
      'Space reserved for email templates, automated reminder intervals, and stakeholder alert rules.',
    fullWidth: true,
  },
  {
    id: 'employee-conversion',
    title: 'Employee Conversion',
    description:
      'Set criteria and policies for converting completed onboarding cases into active workforce employees.',
    icon: 'sync',
    placeholderTitle: 'Employee Conversion Rules',
    placeholderHint:
      'Space reserved for auto-conversion triggers, prerequisite checks, and initial employment status rules.',
    fullWidth: true,
  },
  {
    id: 'required-documents',
    title: 'Required Documents',
    description:
      'Specify mandatory and optional credentials, identity proofs, and verification rules.',
    icon: 'documents',
    placeholderTitle: 'Document Requirements Workspace',
    placeholderHint:
      'Space reserved for document requirement rules, verification authorities, and validity tracking settings.',
    fullWidth: true,
  },
  {
    id: 'pipeline-stages',
    title: 'Pipeline Stages',
    description: 'Configure onboarding pipelines for different employee categories.',
    icon: 'route',
    placeholderTitle: 'Pipeline Stages Configuration',
    placeholderHint:
      'Configure onboarding stages, ordering, gating rules, and category assignment.',
    fullWidth: true,
  },
  {
    id: 'checklist-templates',
    title: 'Checklist Templates',
    description:
      'Create and assign onboarding task checklists for HR, IT, managers, and new hires.',
    icon: 'checklist',
    placeholderTitle: 'Checklist Templates Workspace',
    placeholderHint:
      'Space reserved for task templates, role assignees, due offsets, and completion tracking controls.',
    fullWidth: true,
  },
];

export function FormsOnboardingTab() {
  const fullWidthSections = ONBOARDING_LAYOUT_SECTIONS.filter((s) => s.fullWidth);
  const gridSections = ONBOARDING_LAYOUT_SECTIONS.filter((s) => !s.fullWidth);

  return (
    <div className="bezent-forms-onboarding-page">
      {/* Visually hidden heading for accessibility */}
      <h2 className="bezent-sr-only">Onboarding Settings</h2>

      {/* 1. Full-Width Sections */}
      {fullWidthSections.map((sec) => (
        <section
          key={sec.id}
          className="bezent-forms-onboarding-card bezent-forms-onboarding-card--full"
          aria-labelledby={`section-heading-${sec.id}`}
        >
          <div className="bezent-forms-onboarding-card__header">
            <div className="bezent-forms-onboarding-card__header-top">
              <div className="bezent-forms-onboarding-card__title-row">
                <BezentIcon name={sec.icon} size={18} />
                <h2
                  id={`section-heading-${sec.id}`}
                  className="bezent-forms-onboarding-card__title"
                >
                  {sec.title}
                </h2>
              </div>
            </div>
            {sec.id !== 'employee-conversion' &&
              sec.id !== 'notifications-reminders' &&
              sec.id !== 'general-settings' &&
              sec.id !== 'pipeline-stages' &&
              sec.id !== 'checklist-templates' &&
              sec.id !== 'required-documents' && (
                <p className="bezent-forms-onboarding-card__desc">{sec.description}</p>
              )}
          </div>

          {sec.id === 'pipeline-stages' ? (
            <PipelineStagesManagement isEmbedded={true} />
          ) : sec.id === 'checklist-templates' ? (
            <ChecklistTemplatesManagement isEmbedded={true} />
          ) : sec.id === 'required-documents' ? (
            <RequiredDocumentsManagement isEmbedded={true} />
          ) : sec.id === 'employee-conversion' ? (
            <EmployeeConversionManagement isEmbedded={true} />
          ) : sec.id === 'notifications-reminders' ? (
            <NotificationsRemindersManagement isEmbedded={true} />
          ) : sec.id === 'general-settings' ? (
            <OnboardingGeneralSettingsManagement isEmbedded={true} />
          ) : null}
        </section>
      ))}

      {/* 2. Remaining Sections Grid */}
      <div className="bezent-forms-onboarding-grid">
        {gridSections.map((sec) => (
          <section
            key={sec.id}
            className="bezent-forms-onboarding-card"
            aria-labelledby={`section-heading-${sec.id}`}
          >
            <div className="bezent-forms-onboarding-card__header">
              <div className="bezent-forms-onboarding-card__header-top">
                <div className="bezent-forms-onboarding-card__title-row">
                  <BezentIcon name={sec.icon} size={18} />
                  <h2
                    id={`section-heading-${sec.id}`}
                    className="bezent-forms-onboarding-card__title"
                  >
                    {sec.title}
                  </h2>
                </div>
              </div>
              <p className="bezent-forms-onboarding-card__desc">{sec.description}</p>
            </div>

            {sec.id === 'pipeline-stages' ? (
              <PipelineStagesManagement isEmbedded={true} />
            ) : sec.id === 'checklist-templates' ? (
              <ChecklistTemplatesManagement isEmbedded={true} />
            ) : sec.id === 'required-documents' ? (
              <RequiredDocumentsManagement isEmbedded={true} />
            ) : sec.id === 'employee-conversion' ? (
              <EmployeeConversionManagement isEmbedded={true} />
            ) : sec.id === 'general-settings' ? (
              <OnboardingGeneralSettingsManagement isEmbedded={true} />
            ) : (
              <div className="bezent-forms-onboarding-placeholder">
                <div className="bezent-forms-onboarding-placeholder__icon" aria-hidden="true">
                  <BezentIcon name={sec.icon} size={24} />
                </div>
                <span className="bezent-forms-onboarding-placeholder__title">
                  {sec.placeholderTitle}
                </span>
                <span className="bezent-forms-onboarding-placeholder__sub">
                  {sec.placeholderHint}
                </span>
              </div>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}

export default FormsOnboardingTab;
