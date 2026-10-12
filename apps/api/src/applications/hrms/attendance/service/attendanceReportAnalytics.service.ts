import type {
  ReportDefinition,
  ReportAnalyticsResult,
  ReportKpiItem,
  StatusDistributionSlice,
} from '../types/attendanceReports.types.js';

/**
 * Mathematically sound aggregation engine for Attendance Reports Visual Analytics.
 * Evaluates over 100% of the authorized, filtered dataset (not paginated slices).
 */
export function buildReportAnalytics(
  def: ReportDefinition,
  rawRows: Record<string, unknown>[],
  appliedFilters: Record<string, unknown>,
  timezone = 'UTC',
): ReportAnalyticsResult {
  const totalRows = rawRows.length;

  let kpis: ReportKpiItem[] = [];
  const charts: ReportAnalyticsResult['charts'] = {};
  const supportedDimensions: Array<{ field: string; label: string; targetFilterKey: string }> = [];

  // Helper safe number parser
  const num = (v: unknown): number => {
    if (typeof v === 'number') return isNaN(v) ? 0 : v;
    if (typeof v === 'string') {
      const parsed = parseFloat(v);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  };

  switch (def.id) {
    // ════════════════════════════════════════════════════════════════════════
    // R01 — DAILY ATTENDANCE REGISTER
    // ════════════════════════════════════════════════════════════════════════
    case 'R01': {
      let presentCount = 0;
      let absentCount = 0;
      let halfDayCount = 0;
      let leaveCount = 0;
      let lateCount = 0;
      let earlyExitCount = 0;

      const deptMap = new Map<string, { present: number; absent: number; total: number }>();
      const dateMap = new Map<string, { present: number; eligible: number }>();

      for (const r of rawRows) {
        const status = String(r.attendanceStatus || r.status || '').toLowerCase();
        const dept = String(r.department || 'Unassigned');
        const dateStr = String(r.date || '');
        const lateMin = num(r.lateMinutes);
        const earlyMin = num(r.earlyExitMinutes);

        if (lateMin > 0) lateCount++;
        if (earlyMin > 0) earlyExitCount++;

        const dStat = deptMap.get(dept) || { present: 0, absent: 0, total: 0 };
        dStat.total++;

        const dtStat = dateMap.get(dateStr) || { present: 0, eligible: 0 };

        if (status.includes('present')) {
          presentCount++;
          dStat.present++;
          dtStat.present++;
          dtStat.eligible++;
        } else if (status.includes('absent')) {
          absentCount++;
          dStat.absent++;
          dtStat.eligible++;
        } else if (status.includes('half')) {
          halfDayCount++;
          dtStat.present += 0.5;
          dtStat.eligible++;
        } else if (status.includes('leave')) {
          leaveCount++;
          dtStat.eligible++;
        }

        deptMap.set(dept, dStat);
        if (dateStr) dateMap.set(dateStr, dtStat);
      }

      const eligibleDays = presentCount + absentCount + halfDayCount + leaveCount;
      const attendanceRateStr =
        eligibleDays > 0
          ? `${(((presentCount + halfDayCount * 0.5) / eligibleDays) * 100).toFixed(1)}%`
          : 'N/A';

      kpis = [
        { id: 'total', label: 'Total Records', value: totalRows, variant: 'neutral' },
        { id: 'present', label: 'Present', value: presentCount, variant: 'success' },
        { id: 'absent', label: 'Absent', value: absentCount, variant: 'danger' },
        { id: 'late', label: 'Late Arrivals', value: lateCount, variant: 'warning' },
        { id: 'early', label: 'Early Exits', value: earlyExitCount, variant: 'warning' },
        { id: 'rate', label: 'Attendance Rate', value: attendanceRateStr, variant: 'info' },
      ];

      // Status Donut
      const slices: StatusDistributionSlice[] = [
        {
          label: 'Present',
          value: presentCount,
          colorToken: 'var(--status-success)',
          key: 'present',
        },
        { label: 'Absent', value: absentCount, colorToken: 'var(--status-danger)', key: 'absent' },
        {
          label: 'Half Day',
          value: halfDayCount,
          colorToken: 'var(--status-warning)',
          key: 'half_day',
        },
        { label: 'On Leave', value: leaveCount, colorToken: 'var(--status-info)', key: 'on_leave' },
      ];
      charts.statusDistribution = {
        title: 'Workforce Attendance Status',
        chartType: 'donut',
        slices,
        drillDownField: 'status',
      };

      // Department Comparison (Top 6)
      const topDepts = Array.from(deptMap.entries())
        .sort((a, b) => b[1].total - a[1].total)
        .slice(0, 6);
      charts.departmentComparison = {
        title: 'Department Attendance Comparison',
        chartType: 'grouped_bar',
        xAxisLabel: 'Department',
        yAxisLabel: 'Headcount',
        categories: topDepts.map((d) => d[0]),
        series: [
          {
            name: 'Present',
            colorToken: 'var(--status-success)',
            values: topDepts.map((d) => d[1].present),
          },
          {
            name: 'Absent',
            colorToken: 'var(--status-danger)',
            values: topDepts.map((d) => d[1].absent),
          },
        ],
        drillDownField: 'departmentId',
      };

      // Date Trend
      const sortedDates = Array.from(dateMap.keys()).sort();
      if (sortedDates.length > 1) {
        charts.dateTrend = {
          title: 'Daily Attendance Rate Trend',
          chartType: 'line',
          xAxisLabel: 'Date',
          yAxisLabel: 'Attendance Rate (%)',
          series: [
            {
              name: 'Attendance Rate (%)',
              colorToken: 'var(--accent-primary)',
              points: sortedDates.map((dt) => {
                const stat = dateMap.get(dt)!;
                const r =
                  stat.eligible > 0 ? Number(((stat.present / stat.eligible) * 100).toFixed(1)) : 0;
                return { label: dt, value: r };
              }),
            },
          ],
          drillDownField: 'startDate',
        };
      }

      supportedDimensions.push(
        { field: 'status', label: 'Attendance Status', targetFilterKey: 'status' },
        { field: 'department', label: 'Department', targetFilterKey: 'departmentId' },
      );
      break;
    }

    // ════════════════════════════════════════════════════════════════════════
    // R02 — MONTHLY ATTENDANCE REGISTER
    // ════════════════════════════════════════════════════════════════════════
    case 'R02': {
      let totalSched = 0;
      let totalPres = 0;
      let totalAbs = 0;
      let totalLeave = 0;
      let totalOd = 0;

      const deptMap = new Map<
        string,
        { present: number; absent: number; leave: number; od: number; total: number }
      >();
      const readinessMap = new Map<string, number>();

      for (const r of rawRows) {
        const s = num(r.scheduledDays);
        const p = num(r.presentDays);
        const a = num(r.absentDays);
        const l = num(r.leaveDays);
        const o = num(r.odDays);
        const dept = String(r.department || 'Unassigned');
        const readiness = String(r.payrollReadiness || 'Not Evaluated');

        totalSched += s;
        totalPres += p;
        totalAbs += a;
        totalLeave += l;
        totalOd += o;

        const dStat = deptMap.get(dept) || { present: 0, absent: 0, leave: 0, od: 0, total: 0 };
        dStat.present += p;
        dStat.absent += a;
        dStat.leave += l;
        dStat.od += o;
        dStat.total += p + a + l + o;
        deptMap.set(dept, dStat);

        readinessMap.set(readiness, (readinessMap.get(readiness) || 0) + 1);
      }

      const overallRateStr =
        totalSched > 0
          ? `${((totalPres / totalSched) * 100).toFixed(1)}%`
          : totalRows > 0
            ? '100%'
            : 'N/A';

      kpis = [
        { id: 'employees', label: 'Employees Summarized', value: totalRows, variant: 'neutral' },
        {
          id: 'present_days',
          label: 'Total Present Days',
          value: totalPres.toFixed(1),
          variant: 'success',
        },
        {
          id: 'absent_days',
          label: 'Total Absent Days',
          value: totalAbs.toFixed(1),
          variant: 'danger',
        },
        {
          id: 'leave_days',
          label: 'Total Leave Days',
          value: totalLeave.toFixed(1),
          variant: 'info',
        },
        { id: 'od_days', label: 'Total On-Duty Days', value: totalOd.toFixed(1), variant: 'info' },
        { id: 'rate', label: 'Attendance Rate', value: overallRateStr, variant: 'info' },
      ];

      // Readiness Donut
      const readinessSlices: StatusDistributionSlice[] = [
        {
          label: 'Ready',
          value: readinessMap.get('Ready') || 0,
          colorToken: 'var(--status-success)',
          key: 'Ready',
        },
        {
          label: 'Pending Exceptions',
          value: readinessMap.get('Pending Exceptions') || 0,
          colorToken: 'var(--status-warning)',
          key: 'Pending Exceptions',
        },
        {
          label: 'Blocked',
          value: readinessMap.get('Blocked') || 0,
          colorToken: 'var(--status-danger)',
          key: 'Blocked',
        },
        {
          label: 'Not Evaluated',
          value: readinessMap.get('Not Evaluated') || 0,
          colorToken: 'var(--text-muted)',
          key: 'Not Evaluated',
        },
      ].filter((s) => s.value > 0);

      charts.statusDistribution = {
        title: 'Payroll Readiness Status',
        chartType: 'donut',
        slices:
          readinessSlices.length > 0
            ? readinessSlices
            : [{ label: 'Evaluated', value: totalRows, colorToken: 'var(--accent-primary)' }],
        drillDownField: 'payrollReadiness',
      };

      // Top Departments Stacked Days
      const topDepts = Array.from(deptMap.entries())
        .sort((a, b) => b[1].total - a[1].total)
        .slice(0, 6);
      charts.comparisonOrComposition = {
        title: 'Department Working Days Composition',
        chartType: 'stacked_bar',
        xAxisLabel: 'Department',
        yAxisLabel: 'Employee-Days',
        categories: topDepts.map((d) => d[0]),
        series: [
          {
            name: 'Present Days',
            colorToken: 'var(--status-success)',
            values: topDepts.map((d) => Number(d[1].present.toFixed(1))),
          },
          {
            name: 'Absent Days',
            colorToken: 'var(--status-danger)',
            values: topDepts.map((d) => Number(d[1].absent.toFixed(1))),
          },
          {
            name: 'Leave Days',
            colorToken: 'var(--status-info)',
            values: topDepts.map((d) => Number(d[1].leave.toFixed(1))),
          },
          {
            name: 'On-Duty Days',
            colorToken: 'var(--accent-primary)',
            values: topDepts.map((d) => Number(d[1].od.toFixed(1))),
          },
        ],
        drillDownField: 'departmentId',
      };

      supportedDimensions.push({
        field: 'department',
        label: 'Department',
        targetFilterKey: 'departmentId',
      });
      break;
    }

    // ════════════════════════════════════════════════════════════════════════
    // R03 — ATTENDANCE TREND
    // ════════════════════════════════════════════════════════════════════════
    case 'R03': {
      let totalSchedDays = 0;
      let totalPresEquiv = 0;
      let totalAbsEquiv = 0;
      let totalLate = 0;

      const seriesPoints: Array<{ label: string; value: number }> = [];
      const deptRates = new Map<string, { present: number; scheduled: number }>();

      for (const r of rawRows) {
        const s = num(r.scheduledEmployeeDays);
        const p = num(r.presentEquivalentDays);
        const a = num(r.absentEquivalentDays);
        const l = num(r.lateOccurrences);
        const period = String(r.period || '');
        const dept = String(r.department || 'All');

        totalSchedDays += s;
        totalPresEquiv += p;
        totalAbsEquiv += a;
        totalLate += l;

        const rate = s > 0 ? Number(((p / s) * 100).toFixed(1)) : 0;
        if (period) {
          seriesPoints.push({ label: period, value: rate });
        }

        const dStat = deptRates.get(dept) || { present: 0, scheduled: 0 };
        dStat.present += p;
        dStat.scheduled += s;
        deptRates.set(dept, dStat);
      }

      const overallRateStr =
        totalSchedDays > 0 ? `${((totalPresEquiv / totalSchedDays) * 100).toFixed(1)}%` : 'N/A';
      const overallAbsRateStr =
        totalSchedDays > 0 ? `${((totalAbsEquiv / totalSchedDays) * 100).toFixed(1)}%` : 'N/A';

      kpis = [
        {
          id: 'scheduled',
          label: 'Scheduled Employee-Days',
          value: totalSchedDays,
          variant: 'neutral',
        },
        {
          id: 'present_equiv',
          label: 'Present Equivalents',
          value: totalPresEquiv.toFixed(1),
          variant: 'success',
        },
        {
          id: 'absent_equiv',
          label: 'Absent Equivalents',
          value: totalAbsEquiv.toFixed(1),
          variant: 'danger',
        },
        { id: 'rate', label: 'Cumulative Attendance Rate', value: overallRateStr, variant: 'info' },
        {
          id: 'abs_rate',
          label: 'Cumulative Absence Rate',
          value: overallAbsRateStr,
          variant: 'warning',
        },
        { id: 'late', label: 'Total Late Occurrences', value: totalLate, variant: 'warning' },
      ];

      charts.dateTrend = {
        title: 'Period Attendance Rate Trend',
        chartType: 'line',
        xAxisLabel: 'Period',
        yAxisLabel: 'Attendance Rate (%)',
        series: [
          {
            name: 'Attendance Rate (%)',
            colorToken: 'var(--accent-primary)',
            points: seriesPoints,
          },
        ],
      };

      const topDepts = Array.from(deptRates.entries()).slice(0, 6);
      charts.departmentComparison = {
        title: 'Department Attendance Performance',
        chartType: 'bar',
        xAxisLabel: 'Department',
        yAxisLabel: 'Attendance Rate (%)',
        categories: topDepts.map((d) => d[0]),
        series: [
          {
            name: 'Attendance Rate (%)',
            colorToken: 'var(--status-success)',
            values: topDepts.map((d) =>
              d[1].scheduled > 0 ? Number(((d[1].present / d[1].scheduled) * 100).toFixed(1)) : 0,
            ),
          },
        ],
      };
      break;
    }

    // ════════════════════════════════════════════════════════════════════════
    // R04 — WORKING HOURS
    // ════════════════════════════════════════════════════════════════════════
    case 'R04': {
      let schedMin = 0;
      let actualMin = 0;
      let policyMin = 0;
      let diffMin = 0;

      const deptMap = new Map<string, { sched: number; actual: number }>();

      for (const r of rawRows) {
        const sm = num(r.scheduledMinutes);
        const am = num(r.actualWorkedMinutes);
        const pm = num(r.policyCreditedMinutes);
        const dm = num(r.differenceMinutes);
        const dept = String(r.department || 'Unassigned');

        schedMin += sm;
        actualMin += am;
        policyMin += pm;
        diffMin += dm;

        const dStat = deptMap.get(dept) || { sched: 0, actual: 0 };
        dStat.sched += sm;
        dStat.actual += am;
        deptMap.set(dept, dStat);
      }

      kpis = [
        {
          id: 'scheduled',
          label: 'Total Scheduled Hours',
          value: (schedMin / 60).toFixed(1),
          variant: 'neutral',
        },
        {
          id: 'actual',
          label: 'Actual Worked Hours',
          value: (actualMin / 60).toFixed(1),
          variant: 'success',
        },
        {
          id: 'policy',
          label: 'Credited Hours',
          value: (policyMin / 60).toFixed(1),
          variant: 'info',
        },
        {
          id: 'variance',
          label: 'Difference / Variance Hours',
          value: (diffMin / 60).toFixed(1),
          variant: diffMin >= 0 ? 'success' : 'warning',
        },
      ];

      const topDepts = Array.from(deptMap.entries()).slice(0, 6);
      charts.comparisonOrComposition = {
        title: 'Actual vs Scheduled Hours by Department',
        chartType: 'grouped_bar',
        xAxisLabel: 'Department',
        yAxisLabel: 'Hours',
        categories: topDepts.map((d) => d[0]),
        series: [
          {
            name: 'Scheduled Hours',
            colorToken: 'var(--text-muted)',
            values: topDepts.map((d) => Number((d[1].sched / 60).toFixed(1))),
          },
          {
            name: 'Actual Worked Hours',
            colorToken: 'var(--accent-primary)',
            values: topDepts.map((d) => Number((d[1].actual / 60).toFixed(1))),
          },
        ],
        drillDownField: 'departmentId',
      };
      break;
    }

    // ════════════════════════════════════════════════════════════════════════
    // R05 — LATE ARRIVAL & EARLY EXIT
    // ════════════════════════════════════════════════════════════════════════
    case 'R05': {
      let lateCount = 0;
      let earlyCount = 0;
      let totalLateMin = 0;
      let totalEarlyMin = 0;
      let violationCount = 0;

      const deptLate = new Map<string, number>();

      for (const r of rawRows) {
        const lm = num(r.lateMinutes);
        const em = num(r.earlyExitMinutes);
        const violation = String(r.policyViolationStatus || '');
        const dept = String(r.department || 'Unassigned');

        if (lm > 0) lateCount++;
        if (em > 0) earlyCount++;
        totalLateMin += lm;
        totalEarlyMin += em;
        if (violation.toLowerCase().includes('violation')) violationCount++;

        deptLate.set(dept, (deptLate.get(dept) || 0) + lm);
      }

      kpis = [
        { id: 'late_count', label: 'Late Arrivals', value: lateCount, variant: 'warning' },
        { id: 'early_count', label: 'Early Exits', value: earlyCount, variant: 'warning' },
        { id: 'late_minutes', label: 'Total Late Minutes', value: totalLateMin, variant: 'danger' },
        {
          id: 'early_minutes',
          label: 'Total Early Minutes',
          value: totalEarlyMin,
          variant: 'warning',
        },
        { id: 'violations', label: 'Policy Violations', value: violationCount, variant: 'danger' },
      ];

      const topDepts = Array.from(deptLate.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6);
      charts.departmentComparison = {
        title: 'Department Late Arrival Impact',
        chartType: 'bar',
        xAxisLabel: 'Department',
        yAxisLabel: 'Late Minutes',
        categories: topDepts.map((d) => d[0]),
        series: [
          {
            name: 'Late Minutes',
            colorToken: 'var(--status-danger)',
            values: topDepts.map((d) => d[1]),
          },
        ],
        drillDownField: 'departmentId',
      };
      break;
    }

    // ════════════════════════════════════════════════════════════════════════
    // R06 — OVERTIME
    // ════════════════════════════════════════════════════════════════════════
    case 'R06': {
      let schedH = 0;
      let actualH = 0;
      let extraH = 0;

      const deptMap = new Map<string, { sched: number; actual: number; extra: number }>();
      const stateMap = new Map<string, number>();

      for (const r of rawRows) {
        const s = num(r.scheduledHours);
        const a = num(r.actualWorkedHours);
        const e = num(r.extraWorkedHours);
        const dept = String(r.department || 'Unassigned');
        const st = String(r.processingStatus || 'Completed');

        schedH += s;
        actualH += a;
        extraH += e;

        const dStat = deptMap.get(dept) || { sched: 0, actual: 0, extra: 0 };
        dStat.sched += s;
        dStat.actual += a;
        dStat.extra += e;
        deptMap.set(dept, dStat);

        stateMap.set(st, (stateMap.get(st) || 0) + 1);
      }

      kpis = [
        { id: 'scheduled', label: 'Scheduled Hours', value: schedH.toFixed(1), variant: 'neutral' },
        {
          id: 'actual',
          label: 'Actual Worked Hours',
          value: actualH.toFixed(1),
          variant: 'success',
        },
        { id: 'extra', label: 'Extra Worked Hours', value: extraH.toFixed(1), variant: 'warning' },
        {
          id: 'approved_ot',
          label: 'Approved OT Hours',
          value: 'N/A',
          subtext: 'OT workflow limitation',
          variant: 'neutral',
        },
        {
          id: 'approval_status',
          label: 'Approval Status',
          value: 'N/A',
          subtext: 'No OT approval source',
          variant: 'neutral',
        },
      ];

      const topDepts = Array.from(deptMap.entries()).slice(0, 6);
      charts.comparisonOrComposition = {
        title: 'Actual vs Extra Worked Hours by Department',
        chartType: 'grouped_bar',
        xAxisLabel: 'Department',
        yAxisLabel: 'Hours',
        categories: topDepts.map((d) => d[0]),
        series: [
          {
            name: 'Actual Worked',
            colorToken: 'var(--accent-primary)',
            values: topDepts.map((d) => Number(d[1].actual.toFixed(1))),
          },
          {
            name: 'Extra Worked',
            colorToken: 'var(--status-warning)',
            values: topDepts.map((d) => Number(d[1].extra.toFixed(1))),
          },
        ],
        drillDownField: 'departmentId',
      };

      charts.statusDistribution = {
        title: 'Processing Status',
        chartType: 'donut',
        slices: Array.from(stateMap.entries()).map(([k, v]) => ({
          label: k,
          value: v,
          colorToken: 'var(--status-info)',
        })),
        drillDownField: 'processingStatus',
      };
      break;
    }

    // ════════════════════════════════════════════════════════════════════════
    // R07 — ABSENTEEISM
    // ════════════════════════════════════════════════════════════════════════
    case 'R07': {
      let totalEligible = 0;
      let totalAbsent = 0;
      let chronicCount = 0;

      const deptMap = new Map<string, { absent: number; eligible: number }>();

      for (const r of rawRows) {
        const el = num(r.eligibleScheduledDays);
        const ab = num(r.absentEquivalentDays);
        const cons = num(r.consecutiveAbsenceDays);
        const dept = String(r.department || 'Unassigned');

        totalEligible += el;
        totalAbsent += ab;
        if (cons >= 3) chronicCount++;

        const dStat = deptMap.get(dept) || { absent: 0, eligible: 0 };
        dStat.absent += ab;
        dStat.eligible += el;
        deptMap.set(dept, dStat);
      }

      const overallAbsRate =
        totalEligible > 0 ? `${((totalAbsent / totalEligible) * 100).toFixed(1)}%` : 'N/A';

      kpis = [
        {
          id: 'scheduled',
          label: 'Eligible Scheduled Days',
          value: totalEligible,
          variant: 'neutral',
        },
        {
          id: 'absent_days',
          label: 'Absent Equivalent Days',
          value: totalAbsent.toFixed(1),
          variant: 'danger',
        },
        {
          id: 'abs_rate',
          label: 'Organization Absence Rate',
          value: overallAbsRate,
          variant: 'warning',
        },
        {
          id: 'chronic',
          label: 'Prolonged Absences (>=3 days)',
          value: chronicCount,
          variant: 'danger',
        },
      ];

      const topDepts = Array.from(deptMap.entries()).slice(0, 6);
      charts.departmentComparison = {
        title: 'Department Absence Rate Comparison',
        chartType: 'bar',
        xAxisLabel: 'Department',
        yAxisLabel: 'Absence Rate (%)',
        categories: topDepts.map((d) => d[0]),
        series: [
          {
            name: 'Absence Rate (%)',
            colorToken: 'var(--status-danger)',
            values: topDepts.map((d) =>
              d[1].eligible > 0 ? Number(((d[1].absent / d[1].eligible) * 100).toFixed(1)) : 0,
            ),
          },
        ],
        drillDownField: 'departmentId',
      };
      break;
    }

    // ════════════════════════════════════════════════════════════════════════
    // R08 — LEAVE IMPACT
    // ════════════════════════════════════════════════════════════════════════
    case 'R08': {
      let approvedDays = 0;
      let approvedCount = 0;
      let conflictCount = 0;

      const typeMap = new Map<string, number>();
      const deptMap = new Map<string, number>();

      for (const r of rawRows) {
        const days = num(r.approvedLeaveEquivalentDays);
        const st = String(r.approvalStatus || '').toLowerCase();
        const type = String(r.leaveType || 'General');
        const dept = String(r.department || 'Unassigned');
        const conflict = String(r.overlapConflictStatus || '');

        approvedDays += days;
        if (st.includes('approved')) approvedCount++;
        if (conflict && !conflict.includes('No Conflict') && conflict !== '—') conflictCount++;

        typeMap.set(type, (typeMap.get(type) || 0) + days);
        deptMap.set(dept, (deptMap.get(dept) || 0) + days);
      }

      kpis = [
        { id: 'requests', label: 'Total Leave Requests', value: totalRows, variant: 'neutral' },
        {
          id: 'days',
          label: 'Approved Leave Days',
          value: approvedDays.toFixed(1),
          variant: 'info',
        },
        { id: 'approved', label: 'Approved Requests', value: approvedCount, variant: 'success' },
        {
          id: 'conflicts',
          label: 'Overlap / Conflicts',
          value: conflictCount,
          variant: conflictCount > 0 ? 'warning' : 'neutral',
        },
      ];

      charts.statusDistribution = {
        title: 'Leave Days by Type',
        chartType: 'donut',
        slices: Array.from(typeMap.entries()).map(([k, v], i) => ({
          label: k,
          value: Number(v.toFixed(1)),
          colorToken: i % 2 === 0 ? 'var(--status-info)' : 'var(--accent-primary)',
          key: k,
        })),
        drillDownField: 'leaveType',
      };

      const topDepts = Array.from(deptMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6);
      charts.departmentComparison = {
        title: 'Department Leave Utilization',
        chartType: 'bar',
        xAxisLabel: 'Department',
        yAxisLabel: 'Leave Days',
        categories: topDepts.map((d) => d[0]),
        series: [
          {
            name: 'Leave Days',
            colorToken: 'var(--status-info)',
            values: topDepts.map((d) => Number(d[1].toFixed(1))),
          },
        ],
        drillDownField: 'departmentId',
      };
      break;
    }

    // ════════════════════════════════════════════════════════════════════════
    // R09 — MISSING PUNCH
    // ════════════════════════════════════════════════════════════════════════
    case 'R09': {
      let missingIn = 0;
      let missingOut = 0;
      let unresolved = 0;
      let totalAging = 0;

      const deptMap = new Map<string, number>();

      for (const r of rawRows) {
        const type = String(r.missingInOut || '').toLowerCase();
        const st = String(r.resolutionStatus || '').toLowerCase();
        const aging = num(r.agingDays);
        const dept = String(r.department || 'Unassigned');

        if (type.includes('check-in')) missingIn++;
        if (type.includes('check-out')) missingOut++;
        if (st.includes('unresolved') || st.includes('pending')) unresolved++;
        totalAging += aging;

        deptMap.set(dept, (deptMap.get(dept) || 0) + 1);
      }

      kpis = [
        { id: 'total', label: 'Total Missing Punches', value: totalRows, variant: 'warning' },
        { id: 'missing_in', label: 'Missing Check-In', value: missingIn, variant: 'warning' },
        { id: 'missing_out', label: 'Missing Check-Out', value: missingOut, variant: 'warning' },
        { id: 'unresolved', label: 'Unresolved Count', value: unresolved, variant: 'danger' },
        {
          id: 'avg_aging',
          label: 'Avg Aging (Days)',
          value: totalRows > 0 ? (totalAging / totalRows).toFixed(1) : 0,
          variant: 'neutral',
        },
      ];

      charts.statusDistribution = {
        title: 'Missing Punch Breakdown',
        chartType: 'donut',
        slices: [
          {
            label: 'Missing Check-In',
            value: missingIn,
            colorToken: 'var(--status-warning)',
            key: 'Check-in',
          },
          {
            label: 'Missing Check-Out',
            value: missingOut,
            colorToken: 'var(--status-danger)',
            key: 'Check-out',
          },
        ],
        drillDownField: 'missingInOut',
      };

      const topDepts = Array.from(deptMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6);
      charts.departmentComparison = {
        title: 'Missing Punches by Department',
        chartType: 'bar',
        xAxisLabel: 'Department',
        yAxisLabel: 'Incidents',
        categories: topDepts.map((d) => d[0]),
        series: [
          {
            name: 'Missing Punches',
            colorToken: 'var(--status-warning)',
            values: topDepts.map((d) => d[1]),
          },
        ],
        drillDownField: 'departmentId',
      };
      break;
    }

    // ════════════════════════════════════════════════════════════════════════
    // R10 — ATTENDANCE EXCEPTIONS
    // ════════════════════════════════════════════════════════════════════════
    case 'R10': {
      let pendingCount = 0;
      let resolvedCount = 0;
      let highCriticalCount = 0;

      const severityMap = new Map<string, number>();
      const typeMap = new Map<string, number>();

      for (const r of rawRows) {
        const sev = String(r.severity || 'Medium');
        const st = String(r.status || '').toLowerCase();
        const type = String(r.exceptionType || 'General');

        if (st.includes('pending') || st.includes('open')) pendingCount++;
        if (st.includes('resolved')) resolvedCount++;
        if (sev.toLowerCase().includes('high') || sev.toLowerCase().includes('critical'))
          highCriticalCount++;

        severityMap.set(sev, (severityMap.get(sev) || 0) + 1);
        typeMap.set(type, (typeMap.get(type) || 0) + 1);
      }

      kpis = [
        { id: 'total', label: 'Total Exceptions', value: totalRows, variant: 'neutral' },
        { id: 'pending', label: 'Open / Pending', value: pendingCount, variant: 'warning' },
        { id: 'resolved', label: 'Resolved', value: resolvedCount, variant: 'success' },
        {
          id: 'critical',
          label: 'High / Critical Severity',
          value: highCriticalCount,
          variant: highCriticalCount > 0 ? 'danger' : 'neutral',
        },
      ];

      charts.statusDistribution = {
        title: 'Exceptions by Severity',
        chartType: 'donut',
        slices: [
          {
            label: 'Critical',
            value: severityMap.get('Critical') || 0,
            colorToken: 'var(--status-danger)',
            key: 'Critical',
          },
          {
            label: 'High',
            value: severityMap.get('High') || 0,
            colorToken: 'var(--status-warning)',
            key: 'High',
          },
          {
            label: 'Medium',
            value: severityMap.get('Medium') || 0,
            colorToken: 'var(--status-info)',
            key: 'Medium',
          },
          {
            label: 'Low',
            value: severityMap.get('Low') || 0,
            colorToken: 'var(--text-muted)',
            key: 'Low',
          },
        ].filter((s) => s.value > 0),
        drillDownField: 'severity',
      };

      const topTypes = Array.from(typeMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
      charts.comparisonOrComposition = {
        title: 'Top Exception Categories',
        chartType: 'bar',
        xAxisLabel: 'Exception Type',
        yAxisLabel: 'Count',
        categories: topTypes.map((t) => t[0]),
        series: [
          {
            name: 'Incidents',
            colorToken: 'var(--accent-primary)',
            values: topTypes.map((t) => t[1]),
          },
        ],
        drillDownField: 'exceptionType',
      };
      break;
    }

    // ════════════════════════════════════════════════════════════════════════
    // R11 — REGULARIZATION
    // ════════════════════════════════════════════════════════════════════════
    case 'R11': {
      let approvedCount = 0;
      let pendingCount = 0;
      let rejectedCount = 0;

      const typeMap = new Map<string, number>();

      for (const r of rawRows) {
        const st = String(r.approvalStatus || '').toLowerCase();
        const type = String(r.requestType || 'Correction');

        if (st.includes('approved')) approvedCount++;
        else if (st.includes('pending')) pendingCount++;
        else if (st.includes('rejected')) rejectedCount++;

        typeMap.set(type, (typeMap.get(type) || 0) + 1);
      }

      kpis = [
        { id: 'total', label: 'Total Requests', value: totalRows, variant: 'neutral' },
        { id: 'approved', label: 'Approved', value: approvedCount, variant: 'success' },
        { id: 'pending', label: 'Pending Review', value: pendingCount, variant: 'warning' },
        { id: 'rejected', label: 'Rejected', value: rejectedCount, variant: 'danger' },
        {
          id: 'rate',
          label: 'Approval Rate',
          value: totalRows > 0 ? `${((approvedCount / totalRows) * 100).toFixed(1)}%` : 'N/A',
          variant: 'info',
        },
      ];

      charts.statusDistribution = {
        title: 'Regularization Decisions',
        chartType: 'donut',
        slices: [
          {
            label: 'Approved',
            value: approvedCount,
            colorToken: 'var(--status-success)',
            key: 'Approved',
          },
          {
            label: 'Pending',
            value: pendingCount,
            colorToken: 'var(--status-warning)',
            key: 'Pending',
          },
          {
            label: 'Rejected',
            value: rejectedCount,
            colorToken: 'var(--status-danger)',
            key: 'Rejected',
          },
        ].filter((s) => s.value > 0),
        drillDownField: 'approvalStatus',
      };

      const types = Array.from(typeMap.entries()).slice(0, 5);
      charts.comparisonOrComposition = {
        title: 'Requests by Correction Type',
        chartType: 'bar',
        xAxisLabel: 'Request Type',
        yAxisLabel: 'Count',
        categories: types.map((t) => t[0]),
        series: [
          { name: 'Requests', colorToken: 'var(--accent-primary)', values: types.map((t) => t[1]) },
        ],
        drillDownField: 'requestType',
      };
      break;
    }

    // ════════════════════════════════════════════════════════════════════════
    // R12 — ON-DUTY
    // ════════════════════════════════════════════════════════════════════════
    case 'R12': {
      let approvedHours = 0;
      let approvedCount = 0;
      let pendingCount = 0;
      let rejectedCount = 0;

      const deptMap = new Map<string, number>();

      for (const r of rawRows) {
        const hrs = num(r.approvedDuration);
        const st = String(r.approvalStatus || '').toLowerCase();
        const dept = String(r.department || 'Unassigned');

        if (st.includes('approved')) {
          approvedCount++;
          approvedHours += hrs;
        } else if (st.includes('pending')) {
          pendingCount++;
        } else if (st.includes('rejected')) {
          rejectedCount++;
        }

        deptMap.set(dept, (deptMap.get(dept) || 0) + hrs);
      }

      kpis = [
        { id: 'total', label: 'Total OD Requests', value: totalRows, variant: 'neutral' },
        {
          id: 'approved_hrs',
          label: 'Approved OD Hours',
          value: approvedHours.toFixed(1),
          variant: 'success',
        },
        { id: 'pending', label: 'Pending Requests', value: pendingCount, variant: 'warning' },
        { id: 'rejected', label: 'Rejected Requests', value: rejectedCount, variant: 'danger' },
        {
          id: 'rate',
          label: 'Approval Rate',
          value: totalRows > 0 ? `${((approvedCount / totalRows) * 100).toFixed(1)}%` : 'N/A',
          variant: 'info',
        },
      ];

      charts.statusDistribution = {
        title: 'On-Duty Request Decisions',
        chartType: 'donut',
        slices: [
          {
            label: 'Approved',
            value: approvedCount,
            colorToken: 'var(--status-success)',
            key: 'Approved',
          },
          {
            label: 'Pending',
            value: pendingCount,
            colorToken: 'var(--status-warning)',
            key: 'Pending',
          },
          {
            label: 'Rejected',
            value: rejectedCount,
            colorToken: 'var(--status-danger)',
            key: 'Rejected',
          },
        ].filter((s) => s.value > 0),
        drillDownField: 'approvalStatus',
      };

      const topDepts = Array.from(deptMap.entries()).slice(0, 6);
      charts.departmentComparison = {
        title: 'Approved On-Duty Hours by Department',
        chartType: 'bar',
        xAxisLabel: 'Department',
        yAxisLabel: 'Hours',
        categories: topDepts.map((d) => d[0]),
        series: [
          {
            name: 'Approved Hours',
            colorToken: 'var(--accent-primary)',
            values: topDepts.map((d) => Number(d[1].toFixed(1))),
          },
        ],
        drillDownField: 'departmentId',
      };
      break;
    }

    // ════════════════════════════════════════════════════════════════════════
    // R13 — PAYROLL READINESS
    // ════════════════════════════════════════════════════════════════════════
    case 'R13': {
      let readyCount = 0;
      let blockedCount = 0;
      let totalExceptions = 0;
      let totalCorrections = 0;

      const deptMap = new Map<string, { ready: number; blocked: number }>();

      for (const r of rawRows) {
        const st = String(r.readinessStatus || '').toLowerCase();
        const ex = num(r.unresolvedExceptions);
        const cr = num(r.pendingCorrections);
        const dept = String(r.department || 'Unassigned');

        if (st.includes('ready')) readyCount++;
        else blockedCount++;

        totalExceptions += ex;
        totalCorrections += cr;

        const dStat = deptMap.get(dept) || { ready: 0, blocked: 0 };
        if (st.includes('ready')) dStat.ready++;
        else dStat.blocked++;
        deptMap.set(dept, dStat);
      }

      kpis = [
        { id: 'total', label: 'Evaluated Staff', value: totalRows, variant: 'neutral' },
        { id: 'ready', label: 'Payroll Ready', value: readyCount, variant: 'success' },
        {
          id: 'blocked',
          label: 'Blocked / Action Needed',
          value: blockedCount,
          variant: blockedCount > 0 ? 'danger' : 'neutral',
        },
        {
          id: 'exceptions',
          label: 'Unresolved Exceptions',
          value: totalExceptions,
          variant: totalExceptions > 0 ? 'warning' : 'neutral',
        },
        {
          id: 'corrections',
          label: 'Pending Corrections',
          value: totalCorrections,
          variant: totalCorrections > 0 ? 'warning' : 'neutral',
        },
      ];

      charts.statusDistribution = {
        title: 'Payroll Readiness Split',
        chartType: 'donut',
        slices: [
          { label: 'Ready', value: readyCount, colorToken: 'var(--status-success)', key: 'Ready' },
          {
            label: 'Blocked / Pending',
            value: blockedCount,
            colorToken: 'var(--status-danger)',
            key: 'Blocked',
          },
        ].filter((s) => s.value > 0),
        drillDownField: 'readinessStatus',
      };

      const topDepts = Array.from(deptMap.entries()).slice(0, 6);
      charts.departmentComparison = {
        title: 'Department Readiness Comparison',
        chartType: 'grouped_bar',
        xAxisLabel: 'Department',
        yAxisLabel: 'Employees',
        categories: topDepts.map((d) => d[0]),
        series: [
          {
            name: 'Ready',
            colorToken: 'var(--status-success)',
            values: topDepts.map((d) => d[1].ready),
          },
          {
            name: 'Blocked',
            colorToken: 'var(--status-danger)',
            values: topDepts.map((d) => d[1].blocked),
          },
        ],
        drillDownField: 'departmentId',
      };
      break;
    }

    // ════════════════════════════════════════════════════════════════════════
    // R14 — MONTHLY REVIEW
    // ════════════════════════════════════════════════════════════════════════
    case 'R14': {
      let reviewedCount = 0;
      let inProgressCount = 0;
      let pendingCount = 0;
      let reopenedCount = 0;

      const reviewerMap = new Map<string, number>();

      for (const r of rawRows) {
        const st = String(r.reviewState || '').toLowerCase();
        const reviewer = String(r.assignedReviewer || 'Unassigned');

        if (st.includes('reviewed')) reviewedCount++;
        else if (st.includes('progress')) inProgressCount++;
        else if (st.includes('reopened')) reopenedCount++;
        else pendingCount++;

        reviewerMap.set(reviewer, (reviewerMap.get(reviewer) || 0) + 1);
      }

      kpis = [
        { id: 'total', label: 'Total Reviews', value: totalRows, variant: 'neutral' },
        { id: 'reviewed', label: 'Reviewed', value: reviewedCount, variant: 'success' },
        { id: 'in_progress', label: 'In Progress', value: inProgressCount, variant: 'warning' },
        { id: 'pending', label: 'Pending Review', value: pendingCount, variant: 'neutral' },
        {
          id: 'reopened',
          label: 'Reopened Reviews',
          value: reopenedCount,
          variant: reopenedCount > 0 ? 'danger' : 'neutral',
        },
      ];

      charts.statusDistribution = {
        title: 'Monthly Review States',
        chartType: 'donut',
        slices: [
          {
            label: 'Reviewed',
            value: reviewedCount,
            colorToken: 'var(--status-success)',
            key: 'Reviewed',
          },
          {
            label: 'In Progress',
            value: inProgressCount,
            colorToken: 'var(--status-warning)',
            key: 'In Progress',
          },
          {
            label: 'Pending',
            value: pendingCount,
            colorToken: 'var(--text-muted)',
            key: 'Pending',
          },
          {
            label: 'Reopened',
            value: reopenedCount,
            colorToken: 'var(--status-danger)',
            key: 'Reopened',
          },
        ].filter((s) => s.value > 0),
        drillDownField: 'reviewState',
      };

      const topReviewers = Array.from(reviewerMap.entries()).slice(0, 5);
      charts.departmentComparison = {
        title: 'Review Distribution by Reviewer',
        chartType: 'bar',
        xAxisLabel: 'Reviewer',
        yAxisLabel: 'Employees',
        categories: topReviewers.map((r) => r[0]),
        series: [
          {
            name: 'Assigned',
            colorToken: 'var(--accent-primary)',
            values: topReviewers.map((r) => r[1]),
          },
        ],
        drillDownField: 'assignedReviewer',
      };
      break;
    }

    // ════════════════════════════════════════════════════════════════════════
    // R15 — ATTENDANCE AUDIT
    // ════════════════════════════════════════════════════════════════════════
    case 'R15': {
      const actionMap = new Map<string, number>();
      const actorSet = new Set<string>();
      const dateMap = new Map<string, number>();

      for (const r of rawRows) {
        const act = String(r.action || 'Unknown');
        const actor = String(r.actor || 'system');
        const ts = String(r.timestamp || '').slice(0, 10);

        actionMap.set(act, (actionMap.get(act) || 0) + 1);
        actorSet.add(actor);
        if (ts) dateMap.set(ts, (dateMap.get(ts) || 0) + 1);
      }

      kpis = [
        { id: 'total', label: 'Audit Records', value: totalRows, variant: 'neutral' },
        { id: 'actors', label: 'Unique Actors', value: actorSet.size, variant: 'info' },
        { id: 'actions', label: 'Action Types', value: actionMap.size, variant: 'neutral' },
      ];

      charts.statusDistribution = {
        title: 'Audit Events by Action',
        chartType: 'donut',
        slices: Array.from(actionMap.entries()).map(([k, v], i) => ({
          label: k,
          value: v,
          colorToken: i % 2 === 0 ? 'var(--status-info)' : 'var(--accent-primary)',
          key: k,
        })),
        drillDownField: 'action',
      };

      const sortedDates = Array.from(dateMap.keys()).sort();
      if (sortedDates.length > 1) {
        charts.dateTrend = {
          title: 'Daily Audit Event Volume',
          chartType: 'line',
          xAxisLabel: 'Date',
          yAxisLabel: 'Events',
          series: [
            {
              name: 'Events',
              colorToken: 'var(--accent-primary)',
              points: sortedDates.map((dt) => ({ label: dt, value: dateMap.get(dt) || 0 })),
            },
          ],
        };
      }
      break;
    }
  }

  return {
    reportId: def.id,
    reportName: def.name,
    category: def.category,
    appliedFilters,
    generatedAt: new Date().toISOString(),
    timezone,
    totalDatasetRows: totalRows,
    kpis,
    charts,
    drillDownSupport: {
      supportedDimensions,
    },
    limitations: def.limitations,
  };
}
