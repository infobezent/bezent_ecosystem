import { Alert, Avatar, Badge, Button, Stack } from '../../../../design-system/components';
import { BezentIcon } from '../../../../design-system/icons';
import type { EmployeeActionDetail as EmployeeActionDetailData } from '../api/employeeAdministrationApi';
import {
  EMPLOYMENT_STATUS_LABELS,
  FIELD_LABELS,
  actionTypeLabel,
  changeValueLabel,
  employmentStatusVariant,
  formatDate,
} from '../model/actionCatalog';

const HISTORY_EVENT_LABELS: Record<EmployeeActionDetailData['history'][number]['event'], string> = {
  created: 'Action created',
  updated: 'Action updated',
  applied: 'Action applied',
  cancelled: 'Action cancelled',
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0]?.[0] ?? ''}${parts[1]?.[0] ?? ''}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export interface EmployeeActionDetailProps {
  action: EmployeeActionDetailData;
  /** Today's date (YYYY-MM-DD), to explain when a pending action can be applied. */
  today: string;
  /** Navigates to the canonical Employee Profile. */
  onOpenEmployee?: (employeeId: string) => void;
}

/** Read-only detail of one employee action: employee, change, status, and history. */
export function EmployeeActionDetail({ action, today, onOpenEmployee }: EmployeeActionDetailProps) {
  const { employee } = action;
  const isSeparation = action.category === 'separation';

  return (
    <Stack gap="md">
      {action.status === 'pending' && action.effectiveDate > today && (
        <Alert variant="info" title="Scheduled">
          This action becomes effective on {formatDate(action.effectiveDate)} and can be applied
          from that date.
        </Alert>
      )}

      {/* Employee Identity Hero */}
      <div className="bezent-wf-action-hero">
        <Avatar
          initials={getInitials(employee.fullName)}
          size="md"
          shape="circle"
          alt={employee.fullName}
        />
        <div className="bezent-wf-action-hero__body">
          <div className="bezent-wf-action-hero__name-row">
            {onOpenEmployee ? (
              <Button
                variant="text"
                size="sm"
                onClick={() => onOpenEmployee(employee.id)}
                aria-label={`Open profile of ${employee.fullName}`}
                className="bezent-wf-action-hero__name-btn"
              >
                {employee.fullName}
              </Button>
            ) : (
              <span className="bezent-wf-action-hero__name">{employee.fullName}</span>
            )}
            <Badge variant={employmentStatusVariant(employee.employmentStatus)} size="sm">
              {EMPLOYMENT_STATUS_LABELS[employee.employmentStatus]}
            </Badge>
          </div>
          <div className="bezent-wf-action-hero__meta">
            <span className="bezent-wf-action-hero__id">{employee.employeeNumber}</span>
            {employee.designationName && (
              <>
                <span className="bezent-wf-action-hero__sep">•</span>
                <span>{employee.designationName}</span>
              </>
            )}
            {employee.departmentName && (
              <>
                <span className="bezent-wf-action-hero__sep">•</span>
                <span>{employee.departmentName}</span>
              </>
            )}
            {employee.locationName && (
              <>
                <span className="bezent-wf-action-hero__sep">•</span>
                <span>{employee.locationName}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Changes / Visual Diff Card */}
      <div className="bezent-wf-action-section">
        <div className="bezent-wf-action-section__header">
          <span className="bezent-wf-action-section__title">
            Requested Change · {actionTypeLabel(action.actionType)}
          </span>
        </div>
        <div className="bezent-wf-action-diff-list">
          {action.changes.map((change) => (
            <div key={change.field} className="bezent-wf-action-diff-card">
              <div className="bezent-wf-action-diff-field">{FIELD_LABELS[change.field]}</div>
              <div className="bezent-wf-action-diff-compare">
                <div className="bezent-wf-action-diff-box bezent-wf-action-diff-box--current">
                  <span className="bezent-wf-action-diff-tag">Current Value</span>
                  <span className="bezent-wf-action-diff-val">
                    {changeValueLabel(change, 'from')}
                  </span>
                </div>
                <div className="bezent-wf-action-diff-arrow" aria-hidden="true">
                  <BezentIcon name="arrowRight" size={16} />
                </div>
                <div className="bezent-wf-action-diff-box bezent-wf-action-diff-box--new">
                  <span className="bezent-wf-action-diff-tag">New Value</span>
                  <span className="bezent-wf-action-diff-val">
                    {changeValueLabel(change, 'to')}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Request Details */}
      <div className="bezent-wf-action-section">
        <div className="bezent-wf-action-section__header">
          <span className="bezent-wf-action-section__title">Request Details</span>
        </div>
        <div className="bezent-wf-action-meta-card">
          <div className="bezent-wf-action-meta-grid">
            <div className="bezent-wf-action-meta-item">
              <span className="bezent-wf-action-meta-label">Effective Date</span>
              <span className="bezent-wf-action-meta-val">{formatDate(action.effectiveDate)}</span>
            </div>
            {isSeparation && (
              <div className="bezent-wf-action-meta-item">
                <span className="bezent-wf-action-meta-label">
                  {action.actionType === 'resignation' ? 'Resignation Date' : 'Notice Date'}
                </span>
                <span className="bezent-wf-action-meta-val">{formatDate(action.requestDate)}</span>
              </div>
            )}
            <div className="bezent-wf-action-meta-item">
              <span className="bezent-wf-action-meta-label">Requested By</span>
              <span className="bezent-wf-action-meta-val">
                {action.requestedBy ?? 'Not recorded'}
              </span>
            </div>
            <div className="bezent-wf-action-meta-item">
              <span className="bezent-wf-action-meta-label">Requested On</span>
              <span className="bezent-wf-action-meta-val">{formatDate(action.createdAt)}</span>
            </div>
            {action.appliedAt && (
              <div className="bezent-wf-action-meta-item">
                <span className="bezent-wf-action-meta-label">Applied On</span>
                <span className="bezent-wf-action-meta-val">{formatDate(action.appliedAt)}</span>
              </div>
            )}
            {action.cancelledAt && (
              <div className="bezent-wf-action-meta-item">
                <span className="bezent-wf-action-meta-label">Cancelled On</span>
                <span className="bezent-wf-action-meta-val">{formatDate(action.cancelledAt)}</span>
              </div>
            )}
          </div>

          {action.reason && (
            <div className="bezent-wf-action-reason-box">
              <span className="bezent-wf-action-meta-label">Reason</span>
              <p className="bezent-wf-action-reason-val">{action.reason}</p>
            </div>
          )}

          {action.cancellationReason && (
            <div className="bezent-wf-action-reason-box bezent-wf-action-reason-box--cancelled">
              <span className="bezent-wf-action-meta-label">Cancellation Reason</span>
              <p className="bezent-wf-action-reason-val">{action.cancellationReason}</p>
            </div>
          )}
        </div>
      </div>

      {/* Activity Timeline */}
      {action.history && action.history.length > 0 && (
        <div className="bezent-wf-action-section">
          <div className="bezent-wf-action-section__header">
            <span className="bezent-wf-action-section__title">Activity History</span>
          </div>
          <div className="bezent-wf-action-timeline">
            {action.history.map((entry, idx) => (
              <div key={entry.id} className="bezent-wf-action-timeline-item">
                <div className="bezent-wf-action-timeline-marker">
                  <span
                    className={`bezent-wf-action-timeline-dot bezent-wf-action-timeline-dot--${entry.event}`}
                  />
                  {idx < action.history.length - 1 && (
                    <span className="bezent-wf-action-timeline-line" />
                  )}
                </div>
                <div className="bezent-wf-action-timeline-content">
                  <div className="bezent-wf-action-timeline-row">
                    <span className="bezent-wf-action-timeline-event">
                      {HISTORY_EVENT_LABELS[entry.event]}
                    </span>
                    <span className="bezent-wf-action-timeline-date">
                      {formatDate(entry.createdAt)}
                    </span>
                  </div>
                  <div className="bezent-wf-action-timeline-sub">
                    <span className="bezent-wf-action-timeline-status">
                      {entry.fromStatus && entry.fromStatus !== entry.toStatus
                        ? `${entry.fromStatus} → ${entry.toStatus}`
                        : entry.toStatus}
                    </span>
                    {entry.actor && (
                      <span className="bezent-wf-action-timeline-actor">· {entry.actor}</span>
                    )}
                  </div>
                  {entry.notes && <p className="bezent-wf-action-timeline-notes">{entry.notes}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Stack>
  );
}
