import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Button,
  Inline,
  Page,
  PageHeader,
  Select,
  Stack,
  Toolbar,
} from '../../../../design-system/components';
import { BezentIcon } from '../../../../design-system/icons';
import { INITIAL_JOB_OPENINGS } from '../data/mockJobOpenings';
import type { JobOpening, JobStatus, JobStatusFilter, WorkplaceType } from '../types/jobOpening';
import { JobOpeningsMetrics } from '../components/JobOpeningsMetrics';
import { JobOpeningsTable } from '../components/JobOpeningsTable';
import { JobDetailsModal } from '../components/JobDetailsModal';
import { CreateJobModal } from '../components/CreateJobModal';

export function JobOpeningsPage() {
  const navigate = useNavigate();

  // State
  const [jobs, setJobs] = useState<JobOpening[]>(INITIAL_JOB_OPENINGS);
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

  const handleStatusChange = (jobId: string, newStatus: JobStatus) => {
    setJobs((prev) =>
      prev.map((j) => (j.id === jobId ? { ...j, status: newStatus } : j)),
    );
    const updated = jobs.find((j) => j.id === jobId);
    if (updated) {
      setBannerNotice(
        `Job "${updated.title}" status changed to ${newStatus.replace('_', ' ').toUpperCase()}.`,
      );
    }
  };

  const handleCreateJob = (newJob: JobOpening) => {
    setJobs((prev) => [newJob, ...prev]);
    setBannerNotice(`Successfully created job opening "${newJob.title}" (${newJob.jobCode}).`);
  };

  return (
    <Page>
      <PageHeader
        title="Job Openings"
      />

      <Stack gap="lg">
        {bannerNotice && (
          <Alert variant="info" onDismiss={() => setBannerNotice(null)}>
            {bannerNotice}
          </Alert>
        )}

        {/* 1. 3D Clay Metrics Banner */}
        <JobOpeningsMetrics jobs={jobs} />

        {/* 2. Unified 3D Toolbar: Search, View Mode, Status Tabs & Actions */}
        <Toolbar
          left={
            <Inline align="center" gap="sm" wrap>
              {/* 3D Search Bar */}
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
              >
                <Inline align="center" gap="xs">
                  <BezentIcon name="filter" size="action" />
                  <span>Filter</span>
                </Inline>
              </Button>

              {/* View Mode Toggle: List vs Grid */}
              <div className="bezent-view-toggle" role="group" aria-label="View layout switcher">
                <button
                  type="button"
                  className={`bezent-view-toggle__btn ${viewMode === 'list' ? 'is-active' : ''}`}
                  onClick={() => setViewMode('list')}
                  title="List View"
                  aria-label="List View"
                >
                  <BezentIcon name="viewList" size={18} />
                </button>
                <button
                  type="button"
                  className={`bezent-view-toggle__btn ${viewMode === 'grid' ? 'is-active' : ''}`}
                  onClick={() => setViewMode('grid')}
                  title="Grid View"
                  aria-label="Grid View"
                >
                  <BezentIcon name="viewGrid" size={18} />
                </button>
              </div>

              {/* 3D Recessed Segmented Status Tabs */}
              <div className="bezent-filter-tabs">
                {tabItems.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
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
              <Button
                variant="dark"
                size="md"
                onClick={() => setIsCreateOpen(true)}
              >
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
        )}

        {/* 3. Table / Grid Area */}
        <JobOpeningsTable
          jobs={filteredJobs}
          onSelectJob={handleSelectJob}
          onStatusChange={handleStatusChange}
          viewMode={viewMode}
        />
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
