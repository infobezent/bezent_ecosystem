import { useState, useEffect, useMemo } from 'react';
import {
  Page,
  PageHeader,
  Card,
  Grid,
  Stack,
  Inline,
  Button,
  Input,
  Select,
  Badge,
  Alert,
  Modal,
  Tabs,
  EmptyState,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeaderCell,
  TableCell,
} from '../../../../design-system/components';
import { BezentIcon } from '../../../../design-system/icons';
import {
  fetchReportCatalog,
  fetchReportPreview,
  fetchReportAnalytics,
  downloadReportExport,
  fetchSavedReports,
  createSavedReport,
  deleteSavedReport,
  fetchReportHistory,
  downloadHistoryFile,
} from '../api/attendanceReportsApi';
import type {
  ReportDefinition,
  ReportId,
  ReportPreviewResult,
  ReportAnalyticsResult,
  StatusDistributionSlice,
  SavedReportConfiguration,
  ReportGenerationHistoryItem,
  ReportSortingOption,
} from '../types/attendanceReports.types';
import {
  KpiSummaryGrid,
  DonutChart,
  BarChart,
  StackedBarChart,
  LineChart,
  ActiveDrillDownBanner,
} from '../components/analytics/AttendanceReportCharts';

export function AttendanceReportsPage() {
  const [activeTab, setActiveTab] = useState<'catalog' | 'runner' | 'saved' | 'history'>('catalog');
  const [catalog, setCatalog] = useState<ReportDefinition[]>([]);
  const [selectedReportId, setSelectedReportId] = useState<ReportId>('R01');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  // Runner state
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const currentMonthStr = now.toISOString().slice(0, 7);

  const [filterValues, setFilterValues] = useState<Record<string, unknown>>({
    startDate: todayStr,
    endDate: todayStr,
    month: currentMonthStr,
  });
  const [sorting, setSorting] = useState<ReportSortingOption>({ column: '', direction: 'desc' });
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  const [previewResult, setPreviewResult] = useState<ReportPreviewResult | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [exportingFormat, setExportingFormat] = useState<string | null>(null);

  // Visual Analytics state
  const [analyticsResult, setAnalyticsResult] = useState<ReportAnalyticsResult | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [activeDrillDown, setActiveDrillDown] = useState<{
    dimension: string;
    value: string | number;
  } | null>(null);
  const [showVisualAnalytics, setShowVisualAnalytics] = useState(true);

  // Saved configs state
  const [savedConfigs, setSavedConfigs] = useState<SavedReportConfiguration[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(false);
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [newConfigName, setNewConfigName] = useState('');
  const [savingConfig, setSavingConfig] = useState(false);

  // History state
  const [historyList, setHistoryList] = useState<ReportGenerationHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [downloadingHistoryId, setDownloadingHistoryId] = useState<string | null>(null);

  // Load Catalog on mount
  useEffect(() => {
    loadCatalog();
  }, []);

  async function loadCatalog() {
    setLoadingCatalog(true);
    setCatalogError(null);
    try {
      const data = await fetchReportCatalog();
      setCatalog(data);
    } catch (err: unknown) {
      setCatalogError(err instanceof Error ? err.message : 'Failed to load report catalog');
    } finally {
      setLoadingCatalog(false);
    }
  }

  // Load saved configurations when tab changes
  useEffect(() => {
    if (activeTab === 'saved') {
      loadSavedConfigs();
    } else if (activeTab === 'history') {
      loadHistory();
    }
  }, [activeTab]);

  async function loadSavedConfigs() {
    setLoadingSaved(true);
    try {
      const data = await fetchSavedReports();
      setSavedConfigs(data);
    } catch {
      // non-blocking
    } finally {
      setLoadingSaved(false);
    }
  }

  async function loadHistory() {
    setLoadingHistory(true);
    try {
      const data = await fetchReportHistory();
      setHistoryList(data);
    } catch {
      // non-blocking
    } finally {
      setLoadingHistory(false);
    }
  }

  const selectedReportDef = useMemo(() => {
    return catalog.find((r) => r.id === selectedReportId) || catalog[0];
  }, [catalog, selectedReportId]);

  // Set default sorting when report changes
  useEffect(() => {
    if (selectedReportDef) {
      setSorting(selectedReportDef.defaultSorting);
      setPreviewResult(null);
      setCurrentPage(1);
    }
  }, [selectedReportDef]);

  const filteredCatalog = useMemo(() => {
    if (categoryFilter === 'all') return catalog;
    return catalog.filter((r) => r.category === categoryFilter);
  }, [catalog, categoryFilter]);

  function handleSelectReport(reportId: ReportId) {
    setSelectedReportId(reportId);
    setActiveTab('runner');
  }

  function handleFilterChange(key: string, value: unknown) {
    setFilterValues((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  async function handleLoadAnalytics(overrideFilters?: Record<string, unknown>) {
    if (!selectedReportDef) return;
    setAnalyticsLoading(true);
    try {
      const data = await fetchReportAnalytics(
        selectedReportDef.id,
        overrideFilters || filterValues,
      );
      setAnalyticsResult(data);
    } catch {
      // non-blocking
    } finally {
      setAnalyticsLoading(false);
    }
  }

  async function handleRunPreview(pageToLoad = 1, overrideFilters?: Record<string, unknown>) {
    if (!selectedReportDef) return;
    const activeFilters = overrideFilters || filterValues;
    setPreviewLoading(true);
    setPreviewError(null);
    try {
      const result = await fetchReportPreview(selectedReportDef.id, {
        filters: activeFilters,
        sorting: sorting.column ? sorting : undefined,
        pagination: { page: pageToLoad, pageSize },
      });
      setPreviewResult(result);
      setCurrentPage(pageToLoad);
      handleLoadAnalytics(activeFilters);
    } catch (err: unknown) {
      setPreviewError(err instanceof Error ? err.message : 'Failed to generate report preview');
    } finally {
      setPreviewLoading(false);
    }
  }

  function handleSliceClick(slice: StatusDistributionSlice) {
    if (!slice.key && !slice.label) return;
    const filterKey = analyticsResult?.charts.statusDistribution?.drillDownField || 'status';
    const val = slice.key || slice.label;
    setActiveDrillDown({ dimension: 'Status', value: val });
    const updated = { ...filterValues, [filterKey]: val };
    setFilterValues(updated);
    handleRunPreview(1, updated);
  }

  function handleBarClick(category: string) {
    const filterKey =
      analyticsResult?.charts.departmentComparison?.drillDownField || 'departmentId';
    setActiveDrillDown({ dimension: 'Department / Segment', value: category });
    const updated = { ...filterValues, [filterKey]: category };
    setFilterValues(updated);
    handleRunPreview(1, updated);
  }

  function handleTrendClick(point: { label: string; value: number }) {
    setActiveDrillDown({ dimension: 'Date', value: point.label });
    const updated = { ...filterValues, startDate: point.label, endDate: point.label };
    setFilterValues(updated);
    handleRunPreview(1, updated);
  }

  function handleClearDrillDown() {
    setActiveDrillDown(null);
    const cleaned = { ...filterValues };
    delete cleaned.status;
    delete cleaned.departmentId;
    delete cleaned.payrollReadiness;
    delete cleaned.approvalStatus;
    delete cleaned.severity;
    delete cleaned.exceptionType;
    delete cleaned.missingInOut;
    delete cleaned.reviewState;
    delete cleaned.action;
    setFilterValues(cleaned);
    handleRunPreview(1, cleaned);
  }

  async function handleExport(format: 'csv' | 'xlsx' | 'pdf') {
    if (!selectedReportDef) return;
    setExportingFormat(format);
    setPreviewError(null);
    try {
      await downloadReportExport(selectedReportDef.id, {
        format,
        filters: filterValues,
        sorting: sorting.column ? sorting : undefined,
      });
      if (activeTab === 'history') {
        loadHistory();
      }
    } catch (err: unknown) {
      setPreviewError(
        err instanceof Error ? err.message : `Failed to export ${format.toUpperCase()}`,
      );
    } finally {
      setExportingFormat(null);
    }
  }

  async function handleSaveConfig() {
    if (!newConfigName.trim() || !selectedReportDef) return;
    setSavingConfig(true);
    try {
      await createSavedReport({
        reportId: selectedReportDef.id,
        configurationName: newConfigName.trim(),
        filters: filterValues,
        sorting: sorting.column ? sorting : undefined,
      });
      setSaveModalOpen(false);
      setNewConfigName('');
      loadSavedConfigs();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to save configuration');
    } finally {
      setSavingConfig(false);
    }
  }

  async function handleDeleteConfig(id: string) {
    if (!confirm('Are you sure you want to delete this saved configuration?')) return;
    try {
      await deleteSavedReport(id);
      loadSavedConfigs();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to delete configuration');
    }
  }

  function handleApplySavedConfig(config: SavedReportConfiguration) {
    setSelectedReportId(config.reportId);
    setFilterValues(config.filters);
    if (config.sorting) setSorting(config.sorting);
    setActiveTab('runner');
  }

  async function handleDownloadHistory(historyId: string) {
    setDownloadingHistoryId(historyId);
    try {
      await downloadHistoryFile(historyId);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to download report file');
    } finally {
      setDownloadingHistoryId(null);
    }
  }

  function handleSortClick(columnId: string) {
    setSorting((prev) => {
      if (prev.column === columnId) {
        return {
          column: columnId,
          direction: prev.direction === 'asc' ? 'desc' : 'asc',
        };
      }
      return { column: columnId, direction: 'asc' };
    });
  }

  return (
    <Page>
      <PageHeader
        title="Attendance Reporting Center"
        subtitle="15 Authoritative statutory muster registers, punctuality, workflows, and compliance audits"
      />

      <Stack gap="lg">
        {/* Navigation Tabs */}
        <Tabs
          items={[
            { id: 'catalog', label: 'Report Catalog' },
            {
              id: 'runner',
              label: selectedReportDef
                ? `Report Center (${selectedReportDef.code})`
                : 'Report Center',
            },
            { id: 'saved', label: 'Saved Configurations' },
            { id: 'history', label: 'Generation History' },
          ]}
          activeId={activeTab}
          onChange={(id) => setActiveTab(id as 'catalog' | 'runner' | 'saved' | 'history')}
        />

        {catalogError ? (
          <Alert variant="danger" title="Catalog Error">
            {catalogError}
          </Alert>
        ) : null}

        {/* ══════════════════════════════════════════════════════════════════
            TAB 1: REPORT CATALOG
            ══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'catalog' && (
          <Stack gap="md">
            {/* Category Filter Toolbar */}
            <Card padding="md">
              <Inline justify="between" align="center">
                <Inline gap="sm" align="center">
                  <Select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    options={[
                      { label: 'All Categories (15 Reports)', value: 'all' },
                      { label: 'Daily Operations', value: 'daily_operations' },
                      { label: 'Monthly Registers', value: 'monthly_registers' },
                      { label: 'Trends & Analytics', value: 'trends_analytics' },
                      { label: 'Exceptions & Compliance', value: 'exceptions_compliance' },
                      { label: 'Operational Workflows', value: 'operational_workflows' },
                      { label: 'Payroll Handover', value: 'payroll_handover' },
                      { label: 'Audit & Security', value: 'audit_security' },
                    ]}
                  />
                  <Badge variant="neutral">
                    {filteredCatalog.length} {filteredCatalog.length === 1 ? 'Report' : 'Reports'}{' '}
                    Available
                  </Badge>
                </Inline>
                <Button variant="secondary" onClick={loadCatalog} disabled={loadingCatalog}>
                  <BezentIcon name="refresh" size={14} /> Refresh Catalog
                </Button>
              </Inline>
            </Card>

            {/* Catalog Grid */}
            <Grid columns={3} gap="md">
              {filteredCatalog.map((report) => (
                <Card key={report.id} padding="md">
                  <Stack gap="sm">
                    <Inline justify="between" align="center">
                      <Badge variant="info">{report.code}</Badge>
                      <Badge
                        variant={
                          report.sensitiveClassification === 'audit_restricted'
                            ? 'danger'
                            : report.sensitiveClassification === 'sensitive'
                              ? 'warning'
                              : 'neutral'
                        }
                      >
                        {report.sensitiveClassification.replace(/_/g, ' ')}
                      </Badge>
                    </Inline>

                    <div>
                      <h4 className="bezent-card__title">{report.name}</h4>
                      <p className="bezent-card__desc">{report.description}</p>
                    </div>

                    <Inline gap="xs" wrap>
                      <Badge variant="neutral">
                        Source: {report.authoritativeSource.split(' ')[0]}
                      </Badge>
                      {report.supportedExportFormats.map((fmt) => (
                        <Badge key={fmt} variant="neutral">
                          {fmt.toUpperCase()}
                        </Badge>
                      ))}
                    </Inline>

                    <Button
                      variant={report.id === selectedReportId ? 'primary' : 'secondary'}
                      onClick={() => handleSelectReport(report.id)}
                    >
                      <BezentIcon name="table" size={14} /> Configure & Run
                    </Button>
                  </Stack>
                </Card>
              ))}
            </Grid>
          </Stack>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            TAB 2: REPORT CENTER & RUNNER
            ══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'runner' && selectedReportDef && (
          <Stack gap="md">
            {/* Header / Config Card */}
            <Card padding="lg">
              <Stack gap="md">
                <Inline justify="between" align="start">
                  <div>
                    <Inline gap="sm" align="center">
                      <Badge variant="info">{selectedReportDef.code}</Badge>
                      <h3 className="bezent-card__title">{selectedReportDef.name}</h3>
                    </Inline>
                    <p className="bezent-card__desc">{selectedReportDef.description}</p>
                    <p className="bezent-card__desc">
                      <strong>Authoritative Source:</strong> {selectedReportDef.authoritativeSource}
                    </p>
                  </div>
                  <Inline gap="sm">
                    <Button variant="secondary" onClick={() => setActiveTab('catalog')}>
                      <BezentIcon name="arrow-left" size={14} /> Catalog
                    </Button>
                    <Button variant="secondary" onClick={() => setSaveModalOpen(true)}>
                      <BezentIcon name="bookmark" size={14} /> Save Config
                    </Button>
                  </Inline>
                </Inline>

                {selectedReportDef.limitations && selectedReportDef.limitations.length > 0 ? (
                  <Alert variant="warning" title="Authoritative Source Notice">
                    {selectedReportDef.limitations.join(' ')}
                  </Alert>
                ) : null}

                {/* Filter Controls Grid */}
                <Grid columns={3} gap="md">
                  {selectedReportDef.allowedFilters.map((filter) => {
                    const val = (filterValues[filter.id] as string) ?? '';
                    if (filter.type === 'date' || filter.type === 'month') {
                      return (
                        <Input
                          key={filter.id}
                          label={filter.label}
                          type={filter.type}
                          value={val}
                          onChange={(e) => handleFilterChange(filter.id, e.target.value)}
                        />
                      );
                    }
                    if (filter.type === 'select' && filter.options) {
                      return (
                        <Select
                          key={filter.id}
                          label={filter.label}
                          value={val}
                          onChange={(e) => handleFilterChange(filter.id, e.target.value)}
                          options={[{ label: `All ${filter.label}`, value: '' }, ...filter.options]}
                        />
                      );
                    }
                    return (
                      <Input
                        key={filter.id}
                        label={filter.label}
                        placeholder={filter.placeholder}
                        value={val}
                        onChange={(e) => handleFilterChange(filter.id, e.target.value)}
                      />
                    );
                  })}
                </Grid>

                {/* Action Buttons */}
                <Inline justify="between" align="center">
                  <Inline gap="sm">
                    <Button
                      variant="primary"
                      onClick={() => handleRunPreview(1)}
                      disabled={previewLoading || analyticsLoading}
                    >
                      <BezentIcon name="refresh" size={14} />{' '}
                      {previewLoading || analyticsLoading
                        ? 'Evaluating Data...'
                        : 'Preview Report & Analytics'}
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => setShowVisualAnalytics((prev) => !prev)}
                    >
                      <BezentIcon name="analytics" size={14} />{' '}
                      {showVisualAnalytics ? 'Hide Visual Analytics' : 'Show Visual Analytics'}
                    </Button>
                  </Inline>

                  <Inline gap="sm">
                    <Button
                      variant="secondary"
                      onClick={() => handleExport('csv')}
                      disabled={exportingFormat !== null}
                    >
                      <BezentIcon name="download" size={14} />{' '}
                      {exportingFormat === 'csv' ? 'Exporting...' : 'Export CSV'}
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => handleExport('xlsx')}
                      disabled={exportingFormat !== null}
                    >
                      <BezentIcon name="download" size={14} />{' '}
                      {exportingFormat === 'xlsx' ? 'Exporting...' : 'Export Excel'}
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => handleExport('pdf')}
                      disabled={exportingFormat !== null}
                    >
                      <BezentIcon name="download" size={14} />{' '}
                      {exportingFormat === 'pdf' ? 'Exporting...' : 'Export PDF (with Analytics)'}
                    </Button>
                  </Inline>
                </Inline>
              </Stack>
            </Card>

            {previewError ? (
              <Alert variant="danger" title="Report Generation Error">
                {previewError}
              </Alert>
            ) : null}

            {/* Active Chart Drill-Down Banner */}
            {activeDrillDown && (
              <ActiveDrillDownBanner
                dimension={activeDrillDown.dimension}
                value={activeDrillDown.value}
                onClear={handleClearDrillDown}
              />
            )}

            {/* Visual Analytics KPI Grid & Charts */}
            {showVisualAnalytics && analyticsResult && (
              <Stack gap="md">
                {/* 1. KPIs */}
                <KpiSummaryGrid kpis={analyticsResult.kpis} />

                {/* 2. Interactive Charts Grid */}
                <Grid columns={2} gap="md">
                  {/* Status / Category Distribution */}
                  {analyticsResult.charts.statusDistribution && (
                    <DonutChart
                      data={analyticsResult.charts.statusDistribution}
                      onSliceClick={handleSliceClick}
                    />
                  )}

                  {/* Department / Category Comparison or Composition */}
                  {analyticsResult.charts.departmentComparison && (
                    <BarChart
                      data={analyticsResult.charts.departmentComparison}
                      onBarClick={handleBarClick}
                    />
                  )}

                  {/* Stacked Composition if available and no bar */}
                  {!analyticsResult.charts.departmentComparison &&
                    analyticsResult.charts.comparisonOrComposition && (
                      <StackedBarChart
                        data={analyticsResult.charts.comparisonOrComposition}
                        onSegmentClick={(cat) => handleBarClick(cat)}
                      />
                    )}

                  {/* Date Trend Line Chart */}
                  {analyticsResult.charts.dateTrend && (
                    <LineChart
                      data={analyticsResult.charts.dateTrend}
                      onPointClick={handleTrendClick}
                    />
                  )}
                </Grid>
              </Stack>
            )}

            {/* Results Table Section */}
            {previewResult && (
              <Card padding="md">
                <Stack gap="md">
                  <Inline justify="between" align="center">
                    <Inline gap="sm" align="center">
                      <Badge variant="neutral">Total Rows: {previewResult.totalRows}</Badge>
                      <Badge variant="neutral">Timezone: {previewResult.timezone}</Badge>
                      <Badge variant="neutral">
                        Generated: {previewResult.generatedAt.slice(0, 19).replace('T', ' ')}
                      </Badge>
                    </Inline>
                    <Inline gap="xs" align="center">
                      <Button
                        variant="secondary"
                        onClick={() => handleRunPreview(Math.max(1, currentPage - 1))}
                        disabled={currentPage <= 1 || previewLoading}
                      >
                        Previous
                      </Button>
                      <Badge variant="info">
                        Page {previewResult.page} of{' '}
                        {Math.max(1, Math.ceil(previewResult.totalRows / pageSize))}
                      </Badge>
                      <Button
                        variant="secondary"
                        onClick={() => handleRunPreview(currentPage + 1)}
                        disabled={
                          currentPage >= Math.ceil(previewResult.totalRows / pageSize) ||
                          previewLoading
                        }
                      >
                        Next
                      </Button>
                    </Inline>
                  </Inline>

                  {previewResult.rows.length === 0 ? (
                    <EmptyState
                      variant="attendance"
                      title="No records found"
                      description="No attendance records match the selected date bounds and filters."
                    />
                  ) : (
                    <Table hoverable striped>
                      <TableHead>
                        <TableRow>
                          {previewResult.columns.map((col) => (
                            <TableHeaderCell key={col.id} onClick={() => handleSortClick(col.id)}>
                              {col.label}
                              {sorting.column === col.id
                                ? sorting.direction === 'asc'
                                  ? ' ↑'
                                  : ' ↓'
                                : ''}
                            </TableHeaderCell>
                          ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {previewResult.rows.map((row, idx) => (
                          <TableRow key={idx}>
                            {previewResult.columns.map((col) => {
                              const val = row[col.id];
                              const displayVal =
                                val !== null && val !== undefined ? String(val) : '—';
                              return (
                                <TableCell key={col.id}>
                                  {col.type === 'badge' ? (
                                    <Badge variant="neutral">{displayVal}</Badge>
                                  ) : (
                                    displayVal
                                  )}
                                </TableCell>
                              );
                            })}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </Stack>
              </Card>
            )}
          </Stack>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            TAB 3: SAVED CONFIGURATIONS
            ══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'saved' && (
          <Stack gap="md">
            <Card padding="md">
              <Inline justify="between" align="center">
                <Inline gap="sm" align="center">
                  <Badge variant="neutral">
                    {savedConfigs.length}{' '}
                    {savedConfigs.length === 1 ? 'Configuration' : 'Configurations'}
                  </Badge>
                </Inline>
                <Button variant="secondary" onClick={loadSavedConfigs} disabled={loadingSaved}>
                  <BezentIcon name="refresh" size={14} /> Refresh
                </Button>
              </Inline>
            </Card>

            {savedConfigs.length === 0 ? (
              <EmptyState
                title="No saved configurations"
                description="Save filter configurations in the Report Center to quickly rerun recurring reports."
              />
            ) : (
              <Grid columns={2} gap="md">
                {savedConfigs.map((cfg) => {
                  const rDef = catalog.find((r) => r.id === cfg.reportId);
                  return (
                    <Card key={cfg.id} padding="md">
                      <Stack gap="sm">
                        <Inline justify="between" align="center">
                          <Badge variant="info">{cfg.reportId}</Badge>
                          <Badge variant="neutral">{cfg.createdAt.slice(0, 10)}</Badge>
                        </Inline>
                        <div>
                          <h4 className="bezent-card__title">{cfg.configurationName}</h4>
                          <p className="bezent-card__desc">{rDef?.name ?? cfg.reportId}</p>
                        </div>
                        <Inline gap="sm">
                          <Button variant="primary" onClick={() => handleApplySavedConfig(cfg)}>
                            <BezentIcon name="table" size={14} /> Open & Run
                          </Button>
                          <Button variant="secondary" onClick={() => handleDeleteConfig(cfg.id)}>
                            <BezentIcon name="trash" size={14} /> Delete
                          </Button>
                        </Inline>
                      </Stack>
                    </Card>
                  );
                })}
              </Grid>
            )}
          </Stack>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            TAB 4: GENERATION HISTORY
            ══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'history' && (
          <Stack gap="md">
            <Card padding="md">
              <Inline justify="between" align="center">
                <Inline gap="sm" align="center">
                  <Badge variant="neutral">
                    {historyList.length} {historyList.length === 1 ? 'Record' : 'Records'} Logged
                  </Badge>
                </Inline>
                <Button variant="secondary" onClick={loadHistory} disabled={loadingHistory}>
                  <BezentIcon name="refresh" size={14} /> Refresh
                </Button>
              </Inline>
            </Card>

            {historyList.length === 0 ? (
              <EmptyState
                title="No generation history"
                description="Exported reports will appear here with downloadable files and generation metadata."
              />
            ) : (
              <Card padding="md">
                <Table hoverable striped>
                  <TableHead>
                    <TableRow>
                      <TableHeaderCell>Generated At</TableHeaderCell>
                      <TableHeaderCell>Report</TableHeaderCell>
                      <TableHeaderCell>Format</TableHeaderCell>
                      <TableHeaderCell>Rows</TableHeaderCell>
                      <TableHeaderCell>Status</TableHeaderCell>
                      <TableHeaderCell>Action</TableHeaderCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {historyList.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.generatedAt.slice(0, 19).replace('T', ' ')}</TableCell>
                        <TableCell>
                          <strong>{item.reportId}</strong> — {item.reportName}
                        </TableCell>
                        <TableCell>
                          <Badge variant="neutral">{item.outputFormat.toUpperCase()}</Badge>
                        </TableCell>
                        <TableCell>{item.rowCount}</TableCell>
                        <TableCell>
                          <Badge variant="success">Completed</Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="secondary"
                            onClick={() => handleDownloadHistory(item.id)}
                            disabled={downloadingHistoryId === item.id}
                          >
                            <BezentIcon name="download" size={14} />{' '}
                            {downloadingHistoryId === item.id ? 'Downloading...' : 'Download'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            )}
          </Stack>
        )}
      </Stack>

      {/* Save Configuration Modal */}
      {saveModalOpen && (
        <Modal
          title="Save Report Configuration"
          isOpen={saveModalOpen}
          onClose={() => setSaveModalOpen(false)}
        >
          <Stack gap="md">
            <p>
              Save the current filter configuration for <strong>{selectedReportDef?.name}</strong>{' '}
              to your private saved reports list.
            </p>
            <Input
              label="Configuration Name"
              placeholder="e.g. Monthly Muster - Engineering"
              value={newConfigName}
              onChange={(e) => setNewConfigName(e.target.value)}
            />
            <Inline justify="end" gap="sm">
              <Button variant="secondary" onClick={() => setSaveModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleSaveConfig}
                disabled={savingConfig || !newConfigName.trim()}
              >
                {savingConfig ? 'Saving...' : 'Save Configuration'}
              </Button>
            </Inline>
          </Stack>
        </Modal>
      )}
    </Page>
  );
}
