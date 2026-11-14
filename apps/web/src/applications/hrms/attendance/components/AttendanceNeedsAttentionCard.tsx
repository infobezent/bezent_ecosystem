import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, Button } from '../../../../design-system/components';
import { BezentIcon, type BezentIconName } from '../../../../design-system/icons';
import type { ActionQueueItem, ActionQueueType } from '../types/attendance.types';

export interface AttendanceNeedsAttentionCardProps {
  actionQueue?: ActionQueueItem[];
  loading?: boolean;
}

function resolveQueueIcon(actionType: ActionQueueType): {
  icon: BezentIconName;
  toneClass: string;
} {
  switch (actionType) {
    case 'pending_regularization':
      return { icon: 'requests', toneClass: 'tone-amber' };
    case 'pending_on_duty':
      return { icon: 'operations', toneClass: 'tone-blue' };
    case 'unresolved_exceptions':
      return { icon: 'warning', toneClass: 'tone-rose' };
    case 'missing_punch_issues':
      return { icon: 'clock', toneClass: 'tone-amber' };
    case 'pending_monthly_review':
      return { icon: 'reports', toneClass: 'tone-purple' };
    case 'payroll_readiness_blockers':
      return { icon: 'lock', toneClass: 'tone-rose' };
    case 'pending_overtime_claims':
      return { icon: 'timeTracker', toneClass: 'tone-cyan' };
    default:
      return { icon: 'warning', toneClass: 'tone-slate' };
  }
}

export const AttendanceNeedsAttentionCard: React.FC<AttendanceNeedsAttentionCardProps> = ({
  actionQueue = [],
  loading = false,
}) => {
  const navigate = useNavigate();

  // Filter items that have pending work
  const activeItems = actionQueue.filter((item) => item.authorizedPendingCount > 0);
  const totalPending = activeItems.reduce((acc, item) => acc + item.authorizedPendingCount, 0);

  return (
    <Card className="bezent-att-action-card">
      <CardHeader className="bezent-att-action-header">
        <div className="bezent-att-action-title-group">
          <div className="bezent-att-action-icon">
            <BezentIcon name="warning" size={16} />
          </div>
          <div>
            <CardTitle className="bezent-att-action-title">Needs Attention</CardTitle>
            <p className="bezent-att-action-subtitle">
              Prioritized triage queue of exceptions, missed punches, and approvals
            </p>
          </div>
        </div>

        <div className="bezent-att-action-header-badge">
          {totalPending > 0 ? (
            <span className="bezent-att-action-count-pill is-active">
              {totalPending} {totalPending === 1 ? 'Action Required' : 'Actions Required'}
            </span>
          ) : (
            <span className="bezent-att-action-count-pill is-clear">All Clear</span>
          )}
        </div>
      </CardHeader>

      <div className="bezent-att-action-body">
        {loading ? (
          <div className="bezent-att-action-skeleton-list">
            <div className="bezent-att-action-skeleton-row" />
            <div className="bezent-att-action-skeleton-row" />
            <div className="bezent-att-action-skeleton-row" />
          </div>
        ) : activeItems.length === 0 ? (
          <div className="bezent-att-action-empty">
            <div className="bezent-att-action-empty-icon">
              <BezentIcon name="check" size={20} />
            </div>
            <div className="bezent-att-action-empty-title">All Attendance Queues Clear</div>
            <p className="bezent-att-action-empty-desc">
              No pending regularization requests, unresolved exceptions, or unreviewed records
              blocking workforce operations.
            </p>
          </div>
        ) : (
          <div className="bezent-att-action-list">
            {activeItems.map((item) => {
              const { icon, toneClass } = resolveQueueIcon(item.actionType);
              const isBlocking =
                item.severity === 'danger' || item.actionType === 'payroll_readiness_blockers';

              return (
                <div key={item.actionType} className="bezent-att-action-item">
                  <div className="bezent-att-action-item-left">
                    <div className={`bezent-att-action-item-icon ${toneClass}`}>
                      <BezentIcon name={icon} size={15} />
                    </div>
                    <div className="bezent-att-action-item-details">
                      <div className="bezent-att-action-item-headline">
                        <span className="bezent-att-action-item-title">{item.title}</span>
                        {item.oldestPendingAgeDays !== null && item.oldestPendingAgeDays > 0 && (
                          <span className="bezent-att-action-item-age">
                            Oldest: {item.oldestPendingAgeDays}d
                          </span>
                        )}
                      </div>
                      <p className="bezent-att-action-item-desc">{item.description}</p>
                    </div>
                  </div>

                  <div className="bezent-att-action-item-right">
                    <span
                      className={`bezent-att-action-item-badge ${isBlocking ? 'is-danger' : 'is-warning'}`}
                    >
                      {item.authorizedPendingCount} Pending
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="bezent-att-action-btn"
                      onClick={() => navigate(item.targetRoute)}
                      title={`Triage ${item.title}`}
                    >
                      Triage →
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="bezent-att-action-footer">
        <span className="bezent-att-action-footer-note">
          Ranked by operational severity & payroll impact
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="bezent-att-action-footer-link"
          onClick={() => navigate('/hrms/attendance/exceptions')}
        >
          <span>View Exceptions Hub</span>
          <BezentIcon name="chevronRight" size={13} />
        </Button>
      </div>
    </Card>
  );
};
