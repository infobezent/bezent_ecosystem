import React from 'react';
import { Badge } from '../../../../../design-system/components';
import { BezentIcon } from '../../../../../design-system/icons';
import type { ReportDefinition } from '../../types/attendanceReports.types';
import type { ReportUiConfig } from './reportsConfig';

export interface ReportCardProps {
  report: ReportDefinition;
  config: ReportUiConfig;
  onOpen: (report: ReportDefinition, config: ReportUiConfig) => void;
  onSelectCategory?: (category: string) => void;
  lastExportedText?: string | null;
}

export function ReportCard({
  report,
  config,
  onOpen,
  onSelectCategory,
  lastExportedText,
}: ReportCardProps) {
  // Format human-readable effective period default
  const effectivePeriodLabel =
    config.id === 'R01'
      ? 'Today (Single Date)'
      : config.defaultPeriod === 'today'
        ? 'Today'
        : 'This Month';

  const isRestricted = report.sensitiveClassification === 'audit_restricted';
  const formattedId = config.id.replace(/^([A-Z]+)(\d+)$/, '$1-$2');

  return (
    <div
      role="button"
      tabIndex={0}
      className="bezent-att-report-card"
      onClick={() => onOpen(report, config)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen(report, config);
        }
      }}
      title={report.description}
      aria-label={`Open Report ${report.name}: ${report.description}`}
    >
      <span className="bezent-att-report-card__icon" aria-hidden="true">
        <BezentIcon name={config.iconName} size={22} />
      </span>

      <div className="bezent-att-report-card__text">
        <div className="bezent-att-report-card__meta-row">
          <span className="bezent-att-report-card__id">{formattedId}</span>
          <span className="bezent-att-report-card__dot" aria-hidden="true">
            ·
          </span>
          {onSelectCategory ? (
            <button
              type="button"
              className="bezent-att-report-card__category-btn"
              onClick={(e) => {
                e.stopPropagation();
                onSelectCategory(report.categoryLabel);
              }}
              aria-label={`Filter by category ${report.categoryLabel}`}
            >
              {report.categoryLabel}
            </button>
          ) : (
            <span className="bezent-att-report-card__category">{report.categoryLabel}</span>
          )}
          {isRestricted && (
            <Badge variant="warning" aria-label="Audit Restricted">
              Restricted
            </Badge>
          )}
        </div>

        <h3 className="bezent-att-report-card__title" title={report.name}>
          {report.name}
        </h3>

        <span className="bezent-att-report-card__subtitle">
          {config.shortSubtitle || report.categoryLabel}
        </span>

        {/* Visually hidden description for screen readers, SEO and unit test assertions */}
        <span className="bezent-sr-only">{report.description}</span>
      </div>

      <div className="bezent-att-report-card__bottom">
        <span className="bezent-status-pill bezent-status-pill--info">
          <span className="bezent-status-pill__dot" aria-hidden="true" />
          <span className="bezent-att-report-card__period">
            Period: <strong>{effectivePeriodLabel}</strong>
          </span>
        </span>

        <div className="bezent-att-report-card__action">
          <span>Open Report</span>
          <BezentIcon name="arrowRight" size={13} />
        </div>
      </div>
    </div>
  );
}
