import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, Button } from '../../../../design-system/components';
import { BezentIcon } from '../../../../design-system/icons';
import type { MonthlyPayrollReadinessOverview } from '../types/attendance.types';

export interface AttendancePayrollReadinessCardProps {
  monthlyReadiness?: MonthlyPayrollReadinessOverview;
  loading?: boolean;
}

function formatMonthLabel(monthIso?: string): string {
  if (!monthIso || !/^\d{4}-\d{2}$/.test(monthIso)) {
    return new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }
  const [yearStr, monthStr] = monthIso.split('-');
  const year = parseInt(yearStr || '2026', 10);
  const month = parseInt(monthStr || '1', 10) - 1;
  const d = new Date(year, month, 1);
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export const AttendancePayrollReadinessCard: React.FC<AttendancePayrollReadinessCardProps> = ({
  monthlyReadiness,
  loading = false,
}) => {
  const navigate = useNavigate();

  const total = monthlyReadiness?.totalInScope ?? 0;
  const ready = monthlyReadiness?.readyCount ?? 0;
  const review = monthlyReadiness?.needsReviewCount ?? 0;
  const blocked = monthlyReadiness?.blockedCount ?? 0;
  const locked = monthlyReadiness?.lockedCount ?? 0;
  const reviewed = monthlyReadiness?.reviewedCount ?? 0;

  const monthLabel = useMemo(
    () => formatMonthLabel(monthlyReadiness?.month),
    [monthlyReadiness?.month],
  );

  const readyPct = total > 0 ? Math.round((ready / total) * 100) : 0;
  const reviewPct = total > 0 ? Math.round((review / total) * 100) : 0;
  const blockedPct = total > 0 ? Math.round((blocked / total) * 100) : 0;

  // SVG Segment widths
  const readyW = total > 0 ? (ready / total) * 100 : 0;
  const reviewW = total > 0 ? (review / total) * 100 : 0;
  const blockedW = total > 0 ? (blocked / total) * 100 : 0;

  const isFullyReady = total > 0 && blocked === 0 && review === 0;
  const isFullyLocked = total > 0 && locked === total;

  return (
    <Card className="bezent-att-readiness-card">
      <CardHeader className="bezent-att-readiness-header">
        <div className="bezent-att-readiness-title-group">
          <div className="bezent-att-readiness-icon">
            <BezentIcon name="calendar" size={16} />
          </div>
          <div>
            <CardTitle className="bezent-att-readiness-title">Payroll Readiness</CardTitle>
            <p className="bezent-att-readiness-subtitle">
              Monthly cutoff, supervisor sign-offs, and lock status for {monthLabel}
            </p>
          </div>
        </div>

        <div className="bezent-att-readiness-header-badge">
          {blocked > 0 ? (
            <span className="bezent-att-readiness-pill is-danger">{blocked} Blocking</span>
          ) : review > 0 ? (
            <span className="bezent-att-readiness-pill is-warning">Review Pending</span>
          ) : isFullyReady ? (
            <span className="bezent-att-readiness-pill is-ready">100% Ready</span>
          ) : (
            <span className="bezent-att-readiness-pill is-neutral">In Progress</span>
          )}
        </div>
      </CardHeader>

      <div className="bezent-att-readiness-body">
        {loading ? (
          <div className="bezent-att-readiness-skeleton">
            <div className="bezent-att-readiness-skeleton-stats" />
            <div className="bezent-att-readiness-skeleton-bar" />
            <div className="bezent-att-readiness-skeleton-list" />
          </div>
        ) : (
          <>
            {/* 3-Part Metric Tiles Strip */}
            <div className="bezent-att-readiness-stats-grid">
              <div className="bezent-att-readiness-stat-tile is-ready">
                <div className="bezent-att-readiness-stat-top">
                  <span className="bezent-att-readiness-dot is-ready" />
                  <span className="bezent-att-readiness-stat-label">Ready</span>
                </div>
                <div className="bezent-att-readiness-stat-value">{ready}</div>
                <div className="bezent-att-readiness-stat-sub">{readyPct}% Unblocked</div>
              </div>

              <div className="bezent-att-readiness-stat-tile is-review">
                <div className="bezent-att-readiness-stat-top">
                  <span className="bezent-att-readiness-dot is-review" />
                  <span className="bezent-att-readiness-stat-label">In Review</span>
                </div>
                <div className="bezent-att-readiness-stat-value">{review}</div>
                <div className="bezent-att-readiness-stat-sub">{reviewPct}% Pending Sign-off</div>
              </div>

              <div className="bezent-att-readiness-stat-tile is-blocked">
                <div className="bezent-att-readiness-stat-top">
                  <span className="bezent-att-readiness-dot is-blocked" />
                  <span className="bezent-att-readiness-stat-label">Blocked</span>
                </div>
                <div className="bezent-att-readiness-stat-value">{blocked}</div>
                <div className="bezent-att-readiness-stat-sub">
                  {blockedPct > 0 ? `${blockedPct}% With Exceptions` : 'No Blockers'}
                </div>
              </div>
            </div>

            {/* SVG Multi-Segment Progress Track */}
            <div className="bezent-att-readiness-progress-container">
              <div className="bezent-att-readiness-bar-track">
                <svg
                  className="bezent-att-readiness-bar-svg"
                  viewBox="0 0 100 8"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                >
                  <rect
                    x={0}
                    y={0}
                    width={100}
                    height={8}
                    className="bezent-att-readiness-bar-bg"
                  />
                  {readyW > 0 && (
                    <rect
                      x={0}
                      y={0}
                      width={readyW}
                      height={8}
                      className="bezent-att-readiness-seg--ready"
                    />
                  )}
                  {reviewW > 0 && (
                    <rect
                      x={readyW}
                      y={0}
                      width={reviewW}
                      height={8}
                      className="bezent-att-readiness-seg--review"
                    />
                  )}
                  {blockedW > 0 && (
                    <rect
                      x={readyW + reviewW}
                      y={0}
                      width={blockedW}
                      height={8}
                      className="bezent-att-readiness-seg--blocked"
                    />
                  )}
                </svg>
              </div>

              <div className="bezent-att-readiness-legend">
                <div className="bezent-att-readiness-legend-item">
                  <span className="bezent-att-readiness-legend-dot is-ready" />
                  <span>Ready ({ready})</span>
                </div>
                <div className="bezent-att-readiness-legend-item">
                  <span className="bezent-att-readiness-legend-dot is-review" />
                  <span>Review ({review})</span>
                </div>
                <div className="bezent-att-readiness-legend-item">
                  <span className="bezent-att-readiness-legend-dot is-blocked" />
                  <span>Blocked ({blocked})</span>
                </div>
              </div>
            </div>

            {/* Governance & Cutoff Checklist */}
            <div className="bezent-att-readiness-checklist">
              <div className="bezent-att-readiness-check-item">
                <div className="bezent-att-readiness-check-left">
                  <div className="bezent-att-readiness-check-icon">
                    <BezentIcon name="lock" size={14} />
                  </div>
                  <div>
                    <div className="bezent-att-readiness-check-title">Attendance Lock</div>
                    <div className="bezent-att-readiness-check-sub">
                      {locked} of {total} records locked
                    </div>
                  </div>
                </div>
                <span
                  className={`bezent-att-readiness-check-badge ${isFullyLocked ? 'is-complete' : 'is-pending'}`}
                >
                  {isFullyLocked ? 'Locked' : 'Unlocked'}
                </span>
              </div>

              <div className="bezent-att-readiness-check-item">
                <div className="bezent-att-readiness-check-left">
                  <div className="bezent-att-readiness-check-icon">
                    <BezentIcon name="reports" size={14} />
                  </div>
                  <div>
                    <div className="bezent-att-readiness-check-title">Supervisor Reviews</div>
                    <div className="bezent-att-readiness-check-sub">
                      {reviewed} of {total} signed off
                    </div>
                  </div>
                </div>
                <span
                  className={`bezent-att-readiness-check-badge ${reviewed === total && total > 0 ? 'is-complete' : 'is-pending'}`}
                >
                  {reviewed === total && total > 0 ? 'Complete' : 'Pending'}
                </span>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="bezent-att-readiness-footer">
        <span className="bezent-att-readiness-footer-note">
          Standard monthly payroll cycle: 1st – End of Month
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="bezent-att-readiness-footer-link"
          onClick={() =>
            navigate(
              monthlyReadiness?.targetRoute ||
                `/hrms/attendance/monthly-summary?month=${monthlyReadiness?.month || ''}`,
            )
          }
        >
          <span>Open Monthly Summary</span>
          <BezentIcon name="chevronRight" size={13} />
        </Button>
      </div>
    </Card>
  );
};
