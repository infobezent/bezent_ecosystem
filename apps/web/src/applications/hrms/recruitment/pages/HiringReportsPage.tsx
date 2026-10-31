import { useState } from 'react';
import {
  Alert,
  Button,
  Inline,
  Page,
  PageHeader,
  Select,
  Stack,
  Tabs,
  Toolbar,
} from '../../../../design-system/components';
import { BezentIcon } from '../../../../design-system/icons';
import {
  INITIAL_HIRING_KPIS,
  INITIAL_RECRUITER_WORKLOAD,
  INITIAL_SOURCE_EFFECTIVENESS,
  INITIAL_STAGE_FUNNEL,
} from '../data/mockReports';
import { HiringKpiCards } from '../components/HiringKpiCards';
import { SourceEffectivenessCard } from '../components/SourceEffectivenessCard';
import { StageConversionFunnel } from '../components/StageConversionFunnel';
import { RecruiterWorkloadTable } from '../components/RecruiterWorkloadTable';

export function HiringReportsPage() {
  const [activeTab, setActiveTab] = useState<'all' | 'sources' | 'funnel' | 'workload'>('all');
  const [period, setPeriod] = useState('q4_fy26');
  const [deptFilter, setDeptFilter] = useState('all');
  const [bannerNotice, setBannerNotice] = useState<string | null>(null);

  const handleExport = () => {
    setBannerNotice(
      'Export generated! Hiring Analytics Report (Q4-FY26-Executive-Summary.csv) ready for download.',
    );
  };

  return (
    <Page>
      <PageHeader
        title="Hiring Analytics &amp; Reports"
        subtitle="Track requisition velocity, sourcing channel ROI, pipeline conversion yield, and recruiter workload."
        actions={
          <Inline gap="sm">
            <Button variant="secondary" onClick={handleExport}>
              <Inline align="center" gap="xs">
                <BezentIcon name="reports" size="action" />
                <span>Export Report (.CSV)</span>
              </Inline>
            </Button>
          </Inline>
        }
      />

      <Stack gap="lg">
        {bannerNotice && (
          <Alert variant="info" onDismiss={() => setBannerNotice(null)}>
            {bannerNotice}
          </Alert>
        )}

        {/* 1. Executive KPIs */}
        <HiringKpiCards kpis={INITIAL_HIRING_KPIS} />

        {/* 2. Tabs */}
        <Tabs
          items={[
            { id: 'all', label: 'Executive Dashboard' },
            { id: 'sources', label: 'Source Channel Effectiveness' },
            { id: 'funnel', label: 'Stage Conversion Funnel' },
            { id: 'workload', label: 'Recruiter Workload & Throughput' },
          ]}
          activeId={activeTab}
          onChange={(id) => setActiveTab(id as typeof activeTab)}
        />

        {/* 3. Toolbar Filter */}
        <Toolbar>
          <Inline justify="between" align="center" className="w-full">
            <Inline align="center" gap="md">
              <Select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                options={[
                  { value: 'q4_fy26', label: 'Current Quarter (Q4 FY26: Oct - Dec)' },
                  { value: 'q3_fy26', label: 'Previous Quarter (Q3 FY26: Jul - Sep)' },
                  { value: 'ytd_fy26', label: 'Financial Year to Date (FY26 YTD)' },
                  { value: 'last_12m', label: 'Trailing 12 Months' },
                ]}
              />

              <Select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                options={[
                  { value: 'all', label: 'All Business Departments' },
                  { value: 'Engineering', label: 'Engineering' },
                  { value: 'Product & Design', label: 'Product & Design' },
                  { value: 'Core Platform', label: 'Core Platform' },
                  { value: 'Infrastructure', label: 'Infrastructure' },
                  { value: 'Human Resources', label: 'Human Resources' },
                ]}
              />
            </Inline>

            <span className="bezent-text-xs bezent-text-secondary">
              Updated today at 12:00 PM • Data refreshed from live ATS events
            </span>
          </Inline>
        </Toolbar>

        {/* 4. Tab Content */}
        {(activeTab === 'all' || activeTab === 'sources') && (
          <SourceEffectivenessCard sources={INITIAL_SOURCE_EFFECTIVENESS} />
        )}

        {(activeTab === 'all' || activeTab === 'funnel') && (
          <StageConversionFunnel steps={INITIAL_STAGE_FUNNEL} />
        )}

        {(activeTab === 'all' || activeTab === 'workload') && (
          <RecruiterWorkloadTable workload={INITIAL_RECRUITER_WORKLOAD} />
        )}
      </Stack>
    </Page>
  );
}

export default HiringReportsPage;
