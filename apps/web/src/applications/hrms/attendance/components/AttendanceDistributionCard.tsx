import React, { useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardBody } from '../../../../design-system/components';
import type { DepartmentComparisonItem } from '../types/attendance.types';

export interface AttendanceDistributionCardProps {
  departments?: DepartmentComparisonItem[];
  departmentBreakdown?: Array<{
    departmentId: string;
    departmentName: string;
    present: number;
    total: number;
  }>;
  loading?: boolean;
}

interface ProcessedDepartmentItem {
  id: string;
  name: string;
  total: number;
  present: number;
  absent: number;
  leave: number;
  attendanceRate: number;
  presentPct: number;
  absentPct: number;
  leavePct: number;
}

export const AttendanceDistributionCard: React.FC<AttendanceDistributionCardProps> = ({
  departments,
  departmentBreakdown,
  loading = false,
}) => {
  // Normalize department distribution items
  const items: ProcessedDepartmentItem[] = useMemo(() => {
    if (departments && departments.length > 0) {
      return departments.map((d) => {
        const total = Math.max(1, d.eligibleEmployees || 1);
        const present = Math.round(d.presentEquivalents ?? 0);
        const absent = Math.round(d.absentEquivalents ?? 0);
        const leave = Math.round(d.leaveCoverage ?? 0);
        const rate =
          d.attendanceRate !== null && d.attendanceRate !== undefined
            ? Math.round(d.attendanceRate)
            : Math.round((present / total) * 100);

        return {
          id: d.departmentId,
          name: d.departmentName || 'General',
          total: d.eligibleEmployees,
          present,
          absent,
          leave,
          attendanceRate: rate,
          presentPct: Math.min(100, Math.round((present / total) * 100)),
          absentPct: Math.min(100, Math.round((absent / total) * 100)),
          leavePct: Math.min(100, Math.round((leave / total) * 100)),
        };
      });
    }

    if (departmentBreakdown && departmentBreakdown.length > 0) {
      return departmentBreakdown.map((db) => {
        const total = Math.max(1, db.total || 1);
        const present = Math.round(db.present ?? 0);
        const absent = Math.max(0, db.total - present);
        const rate = Math.round((present / total) * 100);

        return {
          id: db.departmentId,
          name: db.departmentName || 'General',
          total: db.total,
          present,
          absent,
          leave: 0,
          attendanceRate: rate,
          presentPct: Math.min(100, Math.round((present / total) * 100)),
          absentPct: Math.min(100, Math.round((absent / total) * 100)),
          leavePct: 0,
        };
      });
    }

    return [];
  }, [departments, departmentBreakdown]);

  // Aggregate stats across departments
  const totalEligible = items.reduce((sum, d) => sum + d.total, 0);
  const totalPresent = items.reduce((sum, d) => sum + d.present, 0);
  const overallRate = totalEligible > 0 ? Math.round((totalPresent / totalEligible) * 100) : 0;

  return (
    <Card className="bezent-att-trends-card bezent-att-dist-card">
      <CardHeader className="bezent-att-trends-header">
        <div className="bezent-att-trends-header-left">
          <CardTitle className="bezent-att-trends-title">Attendance Distribution</CardTitle>
          <span className="bezent-att-trends-subtitle">
            Workforce presence, absenteeism, and leave by department
          </span>
        </div>

        {/* Total Departments Count Badge */}
        <div className="bezent-att-dist-meta">
          <span className="bezent-att-dist-badge">
            {items.length} {items.length === 1 ? 'Department' : 'Departments'}
          </span>
        </div>
      </CardHeader>

      <CardBody className="bezent-att-trends-body">
        {/* Metric Summary Strip */}
        <div className="bezent-att-trends-summary-strip">
          <div className="bezent-att-summary-item">
            <span className="bezent-att-summary-label">Department Average</span>
            <span className="bezent-att-summary-val bezent-att-summary-val--present">
              {loading ? '—' : `${overallRate}%`}
            </span>
          </div>
          <div className="bezent-att-summary-divider" />
          <div className="bezent-att-summary-item">
            <span className="bezent-att-summary-label">Total Audited</span>
            <span className="bezent-att-summary-val">
              {loading ? '—' : `${totalPresent} / ${totalEligible}`}
            </span>
          </div>
        </div>

        {/* Department Breakdown List */}
        {loading ? (
          <div className="bezent-att-dist-skeleton-list" aria-label="Loading distribution...">
            <div className="bezent-att-dist-skeleton-row" />
            <div className="bezent-att-dist-skeleton-row" />
            <div className="bezent-att-dist-skeleton-row" />
            <div className="bezent-att-dist-skeleton-row" />
          </div>
        ) : items.length === 0 ? (
          <div className="bezent-att-dist-empty">No department attendance records available.</div>
        ) : (
          <div className="bezent-att-dist-list" role="list">
            {items.map((dept) => (
              <div key={dept.id} className="bezent-att-dist-item" role="listitem">
                <div className="bezent-att-dist-row-header">
                  <span className="bezent-att-dist-dept-name">{dept.name}</span>
                  <div className="bezent-att-dist-row-stats">
                    <span className="bezent-att-dist-counts">
                      {dept.present} / {dept.total} Present
                    </span>
                    <span
                      className={`bezent-att-dist-rate-chip ${
                        dept.attendanceRate >= 90
                          ? 'is-high'
                          : dept.attendanceRate >= 75
                            ? 'is-mid'
                            : 'is-low'
                      }`}
                    >
                      {dept.attendanceRate}%
                    </span>
                  </div>
                </div>

                {/* Horizontal Multi-Segment Progress Bar (SVG Vector) */}
                <div
                  className="bezent-att-dist-bar-track"
                  role="progressbar"
                  aria-valuenow={dept.attendanceRate}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${dept.name} attendance ${dept.attendanceRate}%`}
                >
                  <svg
                    className="bezent-att-dist-bar-svg"
                    viewBox="0 0 100 6"
                    preserveAspectRatio="none"
                    aria-hidden="true"
                  >
                    {/* Background Track */}
                    <rect
                      x="0"
                      y="0"
                      width="100"
                      height="6"
                      rx="3"
                      className="bezent-att-dist-bar-bg"
                    />
                    {/* Absent Segment (Base fill behind present/leave) */}
                    {dept.absentPct > 0 && (
                      <rect
                        x="0"
                        y="0"
                        width={Math.min(100, dept.presentPct + dept.leavePct + dept.absentPct)}
                        height="6"
                        rx="3"
                        className="bezent-att-dist-bar-seg--absent"
                      />
                    )}
                    {/* On Leave Segment */}
                    {dept.leavePct > 0 && (
                      <rect
                        x="0"
                        y="0"
                        width={Math.min(100, dept.presentPct + dept.leavePct)}
                        height="6"
                        rx="3"
                        className="bezent-att-dist-bar-seg--leave"
                      />
                    )}
                    {/* Present Segment */}
                    {dept.presentPct > 0 && (
                      <rect
                        x="0"
                        y="0"
                        width={dept.presentPct}
                        height="6"
                        rx="3"
                        className="bezent-att-dist-bar-seg--present"
                      />
                    )}
                  </svg>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  );
};
