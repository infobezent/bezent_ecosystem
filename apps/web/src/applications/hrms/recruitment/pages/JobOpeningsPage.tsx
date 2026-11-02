import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Button,
  Inline,
  LoadingState,
  Page,
  PageHeader,
  Select,
  Stack,
  Toolbar,
} from '../../../../design-system/components';
import { BezentIcon } from '../../../../design-system/icons';
import type { JobOpening, JobStatus, JobStatusFilter, WorkplaceType } from '../types/jobOpening';
import { JobOpeningsMetrics } from '../components/JobOpeningsMetrics';
import { JobOpeningsTable } from '../components/JobOpeningsTable';
import { JobDetailsModal } from '../components/JobDetailsModal';
import { CreateJobModal } from '../components/CreateJobModal';
import {
  fetchJobRequisitions,
  fetchApplications,
  createJobRequisition,
  updateJobRequisition,
  closeJobRequisition,
  adaptRequisitionToJobOpening,
  adaptFrontendToCreateJobDto,
} from '../api';
import type { CreateJobInput } from '../types/jobOpening';

export interface JobOpeningsPageProps {
  initialJobs?: JobOpening[];
}

export function JobOpeningsPage({ initialJobs }: JobOpeningsPageProps = {}) {
  const navigate = useNavigate();

  // State
  const [jobs, setJobs] = useState<JobOpening[]>(initialJobs ?? []);
  const [isLoading, setIsLoading] = useState<boolean>(!initialJobs);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<JobStatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [workplaceFilter, setWorkplaceFilter] = useState<'all' | WorkplaceType>('all');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedJob, setSelectedJob] = useState<JobOpening | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [bannerNotice, setBannerNotice] = useState<string | null>(null);

  const loadJobOpenings = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [reqsResponse, appsResponse] = await Promise.all([
        fetchJobRequisitions({ limit: 100 }),
        fetchApplications({ limit: 1000 }).catch(() => ({ items: [] })),
      ]);

      const appCounts: Record<string, { total: number; pipeline: Record<string, number> }> = {};
      for (const app of appsResponse.items) {
        const reqId = app.requisitionId;
        const entry = appCounts[reqId] ?? { total: 0, pipeline: {} };
        entry.total += 1;
        const stage = app.stage || 'applied';
        entry.pipeline[stage] = (entry.pipeline[stage] || 0) + 1;
        appCounts[reqId] = entry;
      }

      const adaptedJobs = reqsResponse.items.map((req) =>
        adaptRequisitionToJobOpening(req, {
          totalApplicants: appCounts[req.id]?.total ?? 0,
          pipeline: appCounts[req.id]?.pipeline,
        }),
      );

      setJobs(adaptedJobs);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load job openings';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!initialJobs) {
      void loadJobOpenings();
    }
  }, [initialJobs, loadJobOpenings]);

  // Status Tab Counts
  const counts = useMemo(() => {
    return {
      all: jobs.length,
      open: jobs.filter((j) => j.status === 'open').length,
      draft: jobs.filter((j) => j.status === 'draft').length,
      on_hold: jobs.filter((j) => j.status === 'on_hold').length,
      closed: jobs.filter((j) => j.status === 'closed').length,
    };
  }, [jobs]);

  const tabItems = useMemo(
    () => [
      { id: 'all', label: 'All Jobs', count: counts.all },
      { id: 'open', label: 'Open', count: counts.open },
      { id: 'draft', label: 'Draft', count: counts.draft },
      { id: 'on_hold', label: 'On Hold', count: counts.on_hold },
      { id: 'closed', label: 'Closed', count: counts.closed },
    ],
    [counts],
  );

  // Departments List
  const departments = useMemo(() => {
    const set = new Set(jobs.map((j) => j.department));
    return ['all', ...Array.from(set)];
  }, [jobs]);

  // Filtered Jobs
  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      // Status
      if (statusFilter !== 'all' && job.status !== statusFilter) {
        return false;
      }
      // Department
      if (departmentFilter !== 'all' && job.department !== departmentFilter) {
        return false;
      }
      // Workplace
      if (workplaceFilter !== 'all' && job.workplaceType !== workplaceFilter) {
        return false;
      }
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = job.title.toLowerCase().includes(q);
        const matchesCode = job.jobCode.toLowerCase().includes(q);
        const matchesDept = job.department.toLowerCase().includes(q);
        const matchesSkill = job.skills.some((s) => s.toLowerCase().includes(q));
        if (!matchesTitle && !matchesCode && !matchesDept && !matchesSkill) {
          return false;
        }
      }
      return true;
    });
  }, [jobs, statusFilter, departmentFilter, workplaceFilter, searchQuery]);

  // Actions
  const handleSelectJob = (job: JobOpening) => {
    setSelectedJob(job);
    setIsDetailsOpen(true);
  };

  const handleStatusChange = async (jobId: string, newStatus: JobStatus) => {
    try {
      if (newStatus === 'closed') {
        await closeJobRequisition(jobId, 'Closed from recruitment overview');
      } else {
        await updateJobRequisition(jobId, { status: newStatus });
      }
      setJobs((prev) => prev.map((j) => (j.id === jobId ? { ...j, status: newStatus } : j)));
      const updated = jobs.find((j) => j.id === jobId);
      if (updated) {
        setBannerNotice(
          `Job "${updated.title}" status changed to ${newStatus.replace('_', ' ').toUpperCase()}.`,
        );
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update job status';
      setBannerNotice(`Error: ${msg}`);
    }
  };

  const handleCreateJob = async (newJob: JobOpening) => {
    try {
      const dto = adaptFrontendToCreateJobDto({
        title: newJob.title,
        jobCode: newJob.jobCode,
        department: newJob.department,
        location: newJob.location,
        workplaceType: newJob.workplaceType,
        employmentType: newJob.employmentType,
        experienceLevel: newJob.experienceLevel,
        status: newJob.status,
        positionsCount: newJob.positionsCount,
        targetCloseDate: newJob.targetCloseDate,
        salaryMin: newJob.salaryMin,
        salaryMax: newJob.salaryMax,
        currency: newJob.currency,
        hiringManagerName: newJob.hiringManager.name,
        hiringManagerRole: newJob.hiringManager.role,
        recruiterName: newJob.recruiter.name,
        skillsRaw: newJob.skills.join(', '),
        description: newJob.description,
        responsibilitiesRaw: newJob.responsibilities.join('\n'),
        requirementsRaw: newJob.requirements.join('\n'),
      } as CreateJobInput);

      const created = await createJobRequisition(dto);
      const adapted = adaptRequisitionToJobOpening(created);
      setJobs((prev) => [adapted, ...prev]);
      setBannerNotice(`Successfully created job opening "${adapted.title}" (${adapted.jobCode}).`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create job opening';
      setBannerNotice(`Error: ${msg}`);
    }
  };

  return (
    <Page>
      <PageHeader title="Job Openings" />

      <Stack gap="lg">
        {bannerNotice && (
          <Alert variant="info" onDismiss={() => setBannerNotice(null)}>
            {bannerNotice}
          </Alert>
        )}

        {error && (
          <Alert variant="danger">
            <Inline justify="between" align="center">
              <span>{error}</span>
              <Button size="sm" variant="outline" onClick={loadJobOpenings}>
                Retry
              </Button>
            </Inline>
          </Alert>
        )}

        {/* 1. Metrics Banner */}
        <JobOpeningsMetrics jobs={jobs} />

        {/* 2. Unified Toolbar: Search, View Mode, Status Tabs & Actions */}
        <Toolbar
          left={
            <Inline align="center" gap="sm" wrap>
              {/* Search Bar */}
              <div className="bezent-search-bar">
                <BezentIcon name="search" size={16} color="var(--text-secondary, #64748b)" />
                <input
                  type="search"
                  placeholder="Search by title, code, department, skills..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bezent-search-bar__input"
                  aria-label="Search job openings"
                />
              </div>

              {/* Filter Button right next to Search */}
              <Button
                variant={showFilters ? 'dark' : 'outline'}
                size="md"
                onClick={() => setShowFilters((prev) => !prev)}
                aria-expanded={showFilters}
                aria-controls="jobs-filter-panel"
                aria-label="Toggle job filter options"
              >
                <Inline align="center" gap="xs">
                  <BezentIcon name="filter" size="action" />
                  <span>Filter</span>
                </Inline>
              </Button>

              {/* View Mode Toggle: List vs Grid */}
              <div className="bezent-view-toggle" role="group" aria-label="Job openings view layout switcher">
                <button
                  type="button"
                  className={`bezent-view-toggle__btn ${viewMode === 'list' ? 'is-active' : ''}`}
                  onClick={() => setViewMode('list')}
                  title="List View"
                  aria-label="List View"
                  aria-pressed={viewMode === 'list'}
                >
                  <BezentIcon name="viewList" size={18} />
                </button>
                <button
                  type="button"
                  className={`bezent-view-toggle__btn ${viewMode === 'grid' ? 'is-active' : ''}`}
                  onClick={() => setViewMode('grid')}
                  title="Grid View"
                  aria-label="Grid View"
                  aria-pressed={viewMode === 'grid'}
                >
                  <BezentIcon name="viewGrid" size={18} />
                </button>
              </div>

              {/* Segmented Status Tabs */}
              <div className="bezent-filter-tabs" role="tablist" aria-label="Filter job openings by status">
                {tabItems.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={statusFilter === tab.id}
                    className={`bezent-filter-tab ${statusFilter === tab.id ? 'is-active' : ''}`}
                    onClick={() => setStatusFilter(tab.id as JobStatusFilter)}
                  >
                    <span>{tab.label}</span>
                    {tab.count !== undefined && (
                      <span className="bezent-filter-tab-count">{tab.count}</span>
                    )}
                  </button>
                ))}
              </div>
            </Inline>
          }
          right={
            <Inline align="center" gap="sm">
              <Button variant="dark" size="md" onClick={() => setIsCreateOpen(true)}>
                <Inline align="center" gap="xs">
                  <BezentIcon name="add" size="action" />
                  <span>Create Job</span>
                </Inline>
              </Button>
            </Inline>
          }
        />

        {/* Collapsible Filter Row when "Filter" button is clicked */}
        {showFilters && (
          <div id="jobs-filter-panel" role="region" aria-label="Job filters">
            <Inline align="center" gap="md" wrap>
              <Select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                options={departments.map((d) => ({
                  value: d,
                  label: d === 'all' ? 'All Departments' : d,
                }))}
              />

              <Select
                value={workplaceFilter}
                onChange={(e) => setWorkplaceFilter(e.target.value as typeof workplaceFilter)}
                options={[
                  { value: 'all', label: 'All Workplace Types' },
                  { value: 'remote', label: 'Remote' },
                  { value: 'hybrid', label: 'Hybrid' },
                  { value: 'on_site', label: 'On-site' },
                ]}
              />
            </Inline>
          </div>
        )}

        {/* 3. Table / Grid Area */}
        {isLoading ? (
          <LoadingState label="Loading job openings…" />
        ) : (
          <JobOpeningsTable
            jobs={filteredJobs}
            onSelectJob={handleSelectJob}
            onStatusChange={handleStatusChange}
            viewMode={viewMode}
          />
        )}
      </Stack>

      {/* Details Modal */}
      <JobDetailsModal
        job={selectedJob}
        isOpen={isDetailsOpen}
        onClose={() => {
          setIsDetailsOpen(false);
          setSelectedJob(null);
        }}
        onNavigateToCandidates={(jobId) => {
          navigate(`/hrms/recruitment/candidates?jobId=${jobId}`);
        }}
      />

      {/* Create Modal */}
      <CreateJobModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreateJob={handleCreateJob}
        existingCount={jobs.length}
      />
    </Page>
  );
}

export default JobOpeningsPage;
