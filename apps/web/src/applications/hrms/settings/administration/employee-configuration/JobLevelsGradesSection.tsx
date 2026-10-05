import { useState, useEffect, useCallback, type FormEvent } from 'react';
import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  EmptyState,
  FormField,
  FormGrid,
  Inline,
  Input,
  LoadingState,
  Modal,
  Page,
  PageHeader,
  SearchInput,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHeaderCell,
  TableHead,
  TableRow,
  Tabs,
  Textarea,
  Toolbar,
} from '../../../../../design-system/components';
import { BezentIcon } from '../../../../../design-system/icons';

function extractErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === 'object') {
    if ('message' in err && typeof (err as { message: unknown }).message === 'string') {
      return (err as { message: string }).message;
    }
  }
  return fallback;
}
import { useAuthorization } from '../../../../../platform/auth';
import {
  fetchJobLevels,
  createJobLevel,
  updateJobLevel,
  deactivateJobLevel,
  reactivateJobLevel,
} from './api/jobLevelApi';
import {
  fetchGrades,
  createGrade,
  updateGrade,
  deactivateGrade,
  reactivateGrade,
} from './api/gradeApi';
import type { JobLevel, JobLevelStatus } from './types/jobLevel';
import type { Grade, GradeStatus } from './types/grade';

export interface JobLevelsGradesSectionProps {
  onBack?: () => void;
  onNavigateToDesignations?: () => void;
  onNavigateToStructure?: () => void;
}

export function JobLevelsGradesSection({
  onBack,
  onNavigateToDesignations: _onNavigateToDesignations,
  onNavigateToStructure: _onNavigateToStructure,
}: JobLevelsGradesSectionProps) {
  const { canAny } = useAuthorization();

  const canManage = canAny([
    'organization.jobLevels.manage',
    'organization.grades.manage',
    'hrms.jobLevels.manage',
    'hrms.grades.manage',
    'hrms.organization.manage',
    'hrms.settings.manage',
  ]);

  // Master Selector: 'job-levels' | 'grades'
  const [activeMaster, setActiveMaster] = useState<'job-levels' | 'grades'>('job-levels');

  // Job Levels State
  const [jobLevels, setJobLevels] = useState<JobLevel[]>([]);
  const [loadingJl, setLoadingJl] = useState(true);
  const [errorJl, setErrorJl] = useState<string | null>(null);
  const [searchJl, setSearchJl] = useState('');
  const [statusFilterJl, setStatusFilterJl] = useState<'all' | 'active' | 'inactive'>('all');

  // Grades State
  const [grades, setGrades] = useState<Grade[]>([]);
  const [loadingGrd, setLoadingGrd] = useState(true);
  const [errorGrd, setErrorGrd] = useState<string | null>(null);
  const [searchGrd, setSearchGrd] = useState('');
  const [statusFilterGrd, setStatusFilterGrd] = useState<'all' | 'active' | 'inactive'>('all');

  // Modal State for Job Levels
  const [isJlModalOpen, setIsJlModalOpen] = useState(false);
  const [editingJl, setEditingJl] = useState<JobLevel | null>(null);
  const [jlFormName, setJlFormName] = useState('');
  const [jlFormCode, setJlFormCode] = useState('');
  const [jlFormRank, setJlFormRank] = useState('');
  const [jlFormDesc, setJlFormDesc] = useState('');
  const [jlFormStatus, setJlFormStatus] = useState<JobLevelStatus>('active');
  const [jlModalSubmitting, setJlModalSubmitting] = useState(false);
  const [jlModalError, setJlModalError] = useState<string | null>(null);

  // Modal State for Grades
  const [isGrdModalOpen, setIsGrdModalOpen] = useState(false);
  const [editingGrd, setEditingGrd] = useState<Grade | null>(null);
  const [grdFormName, setGrdFormName] = useState('');
  const [grdFormCode, setGrdFormCode] = useState('');
  const [grdFormRank, setGrdFormRank] = useState('');
  const [grdFormDesc, setGrdFormDesc] = useState('');
  const [grdFormStatus, setGrdFormStatus] = useState<GradeStatus>('active');
  const [grdModalSubmitting, setGrdModalSubmitting] = useState(false);
  const [grdModalError, setGrdModalError] = useState<string | null>(null);

  // Deactivate confirmation modal
  const [deactivatingTarget, setDeactivatingTarget] = useState<{
    type: 'job-level' | 'grade';
    item: JobLevel | Grade;
  } | null>(null);
  const [deactivatingSubmitting, setDeactivatingSubmitting] = useState(false);
  const [deactivateError, setDeactivateError] = useState<string | null>(null);

  // Load Job Levels
  const loadJobLevels = useCallback(async () => {
    setLoadingJl(true);
    setErrorJl(null);
    try {
      const data = await fetchJobLevels({
        search: searchJl || undefined,
        status: statusFilterJl !== 'all' ? statusFilterJl : undefined,
      });
      setJobLevels(data);
    } catch (err: unknown) {
      setErrorJl(extractErrorMessage(err, 'Failed to load job levels'));
    } finally {
      setLoadingJl(false);
    }
  }, [searchJl, statusFilterJl]);

  // Load Grades
  const loadGrades = useCallback(async () => {
    setLoadingGrd(true);
    setErrorGrd(null);
    try {
      const data = await fetchGrades({
        search: searchGrd || undefined,
        status: statusFilterGrd !== 'all' ? statusFilterGrd : undefined,
      });
      setGrades(data);
    } catch (err: unknown) {
      setErrorGrd(extractErrorMessage(err, 'Failed to load grades'));
    } finally {
      setLoadingGrd(false);
    }
  }, [searchGrd, statusFilterGrd]);

  useEffect(() => {
    loadJobLevels();
  }, [loadJobLevels]);

  useEffect(() => {
    loadGrades();
  }, [loadGrades]);

  // Open Create Job Level Modal
  const handleOpenCreateJl = () => {
    setEditingJl(null);
    setJlFormName('');
    setJlFormCode('');
    // Auto-suggest next rank (highest rank + 10)
    const maxRank = jobLevels.reduce((max, jl) => (jl.rank > max ? jl.rank : max), 0);
    setJlFormRank(String(maxRank > 0 ? maxRank + 10 : 10));
    setJlFormDesc('');
    setJlFormStatus('active');
    setJlModalError(null);
    setIsJlModalOpen(true);
  };

  // Open Edit Job Level Modal
  const handleOpenEditJl = (jl: JobLevel) => {
    setEditingJl(jl);
    setJlFormName(jl.name);
    setJlFormCode(jl.code);
    setJlFormRank(String(jl.rank));
    setJlFormDesc(jl.description ?? '');
    setJlFormStatus(jl.status);
    setJlModalError(null);
    setIsJlModalOpen(true);
  };

  // Submit Job Level Modal
  const handleSubmitJl = async (e: FormEvent) => {
    e.preventDefault();
    setJlModalError(null);

    if (!jlFormName.trim()) {
      setJlModalError('Job level name is required.');
      return;
    }
    if (!jlFormCode.trim()) {
      setJlModalError('Job level code is required.');
      return;
    }
    const rankNum = Number(jlFormRank);
    if (!jlFormRank || isNaN(rankNum) || !Number.isInteger(rankNum) || rankNum <= 0) {
      setJlModalError('Rank must be a positive integer.');
      return;
    }

    setJlModalSubmitting(true);
    try {
      if (editingJl) {
        await updateJobLevel(editingJl.id, {
          name: jlFormName.trim(),
          code: jlFormCode.trim().toUpperCase(),
          rank: rankNum,
          description: jlFormDesc.trim() || null,
          status: jlFormStatus,
        });
      } else {
        await createJobLevel({
          name: jlFormName.trim(),
          code: jlFormCode.trim().toUpperCase(),
          rank: rankNum,
          description: jlFormDesc.trim() || null,
          status: jlFormStatus,
        });
      }
      setIsJlModalOpen(false);
      await loadJobLevels();
    } catch (err: unknown) {
      setJlModalError(extractErrorMessage(err, 'Failed to save job level'));
    } finally {
      setJlModalSubmitting(false);
    }
  };

  // Open Create Grade Modal
  const handleOpenCreateGrd = () => {
    setEditingGrd(null);
    setGrdFormName('');
    setGrdFormCode('');
    // Auto-suggest next rank (highest rank + 10)
    const maxRank = grades.reduce((max, g) => (g.rank > max ? g.rank : max), 0);
    setGrdFormRank(String(maxRank > 0 ? maxRank + 10 : 10));
    setGrdFormDesc('');
    setGrdFormStatus('active');
    setGrdModalError(null);
    setIsGrdModalOpen(true);
  };

  // Open Edit Grade Modal
  const handleOpenEditGrd = (g: Grade) => {
    setEditingGrd(g);
    setGrdFormName(g.name);
    setGrdFormCode(g.code);
    setGrdFormRank(String(g.rank));
    setGrdFormDesc(g.description ?? '');
    setGrdFormStatus(g.status);
    setGrdModalError(null);
    setIsGrdModalOpen(true);
  };

  // Submit Grade Modal
  const handleSubmitGrd = async (e: FormEvent) => {
    e.preventDefault();
    setGrdModalError(null);

    if (!grdFormName.trim()) {
      setGrdModalError('Grade name is required.');
      return;
    }
    if (!grdFormCode.trim()) {
      setGrdModalError('Grade code is required.');
      return;
    }
    const rankNum = Number(grdFormRank);
    if (!grdFormRank || isNaN(rankNum) || !Number.isInteger(rankNum) || rankNum <= 0) {
      setGrdModalError('Rank must be a positive integer.');
      return;
    }

    setGrdModalSubmitting(true);
    try {
      if (editingGrd) {
        await updateGrade(editingGrd.id, {
          name: grdFormName.trim(),
          code: grdFormCode.trim().toUpperCase(),
          rank: rankNum,
          description: grdFormDesc.trim() || null,
          status: grdFormStatus,
        });
      } else {
        await createGrade({
          name: grdFormName.trim(),
          code: grdFormCode.trim().toUpperCase(),
          rank: rankNum,
          description: grdFormDesc.trim() || null,
          status: grdFormStatus,
        });
      }
      setIsGrdModalOpen(false);
      await loadGrades();
    } catch (err: unknown) {
      setGrdModalError(extractErrorMessage(err, 'Failed to save grade'));
    } finally {
      setGrdModalSubmitting(false);
    }
  };

  // Toggle Reactivate
  const handleReactivate = async (type: 'job-level' | 'grade', id: string) => {
    try {
      if (type === 'job-level') {
        await reactivateJobLevel(id);
        await loadJobLevels();
      } else {
        await reactivateGrade(id);
        await loadGrades();
      }
    } catch (err: unknown) {
      alert(extractErrorMessage(err, 'Failed to reactivate'));
    }
  };

  // Confirm Deactivation
  const handleConfirmDeactivate = async () => {
    if (!deactivatingTarget) return;
    setDeactivatingSubmitting(true);
    setDeactivateError(null);
    try {
      if (deactivatingTarget.type === 'job-level') {
        await deactivateJobLevel(deactivatingTarget.item.id);
        await loadJobLevels();
      } else {
        await deactivateGrade(deactivatingTarget.item.id);
        await loadGrades();
      }
      setDeactivatingTarget(null);
    } catch (err: unknown) {
      setDeactivateError(extractErrorMessage(err, 'Failed to deactivate item'));
    } finally {
      setDeactivatingSubmitting(false);
    }
  };

  const statusOptions = [
    { value: 'all', label: 'All Statuses' },
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
  ];

  return (
    <Page maxWidth="default">
      <Stack gap="lg">
        {/* Navigation Breadcrumb Toolbar */}
        <Toolbar
          left={
            onBack ? (
              <Button variant="secondary" type="button" onClick={onBack}>
                <BezentIcon name="chevronLeft" size={16} />
                Back to Settings
              </Button>
            ) : undefined
          }
          right={
            <Inline gap="xs" align="center">
              <span>Settings</span>
              <span>/</span>
              <span>Organization</span>
              <span>/</span>
              <strong>Job Levels / Grades</strong>
            </Inline>
          }
        />

        {/* Page Header */}
        <PageHeader
          title="Job Levels & Grades"
          subtitle="Manage company-wide organizational seniority tiers and employment classification grades."
        />

        {/* Master Switcher Tabs */}
        <Tabs
          variant="pills"
          items={[
            {
              id: 'job-levels',
              label: 'Job Levels',
              count: jobLevels.length,
            },
            {
              id: 'grades',
              label: 'Grades',
              count: grades.length,
            },
          ]}
          activeId={activeMaster}
          onChange={(id) => setActiveMaster(id as 'job-levels' | 'grades')}
        />

        {/* ==================================================== */}
        {/* VIEW 1: JOB LEVELS MASTER                            */}
        {/* ==================================================== */}
        {activeMaster === 'job-levels' && (
          <Stack gap="md">
            {/* Filter & Action Toolbar */}
            <Toolbar
              left={
                <Inline gap="md" align="center">
                  <SearchInput
                    id="jl-search"
                    placeholder="Search by name or code..."
                    value={searchJl}
                    onChange={(e) => setSearchJl(e.target.value)}
                  />
                  <Select
                    id="jl-status-filter"
                    value={statusFilterJl}
                    onChange={(e) =>
                      setStatusFilterJl(e.target.value as 'all' | 'active' | 'inactive')
                    }
                    options={statusOptions}
                  />
                </Inline>
              }
              right={
                canManage ? (
                  <Button
                    variant="primary"
                    type="button"
                    onClick={handleOpenCreateJl}
                    id="add-job-level-btn"
                  >
                    <BezentIcon name="add" size={16} />
                    Add Job Level
                  </Button>
                ) : undefined
              }
            />

            {/* Error Message */}
            {errorJl && (
              <Alert variant="error">
                <Inline justify="between" align="center">
                  <span>{errorJl}</span>
                  <Button variant="secondary" onClick={loadJobLevels}>
                    Retry
                  </Button>
                </Inline>
              </Alert>
            )}

            {/* Table or States */}
            <Card>
              <CardBody>
                {loadingJl ? (
                  <LoadingState label="Loading job levels..." />
                ) : jobLevels.length === 0 ? (
                  <EmptyState
                    title="No Job Levels Found"
                    description={
                      searchJl || statusFilterJl !== 'all'
                        ? 'No job levels match the selected search or filter criteria.'
                        : 'No organizational job levels have been defined for this company yet.'
                    }
                    primaryAction={
                      canManage && !searchJl && statusFilterJl === 'all'
                        ? {
                            label: 'Add First Job Level',
                            onClick: handleOpenCreateJl,
                          }
                        : undefined
                    }
                  />
                ) : (
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableHeaderCell>Rank / Order</TableHeaderCell>
                        <TableHeaderCell>Code</TableHeaderCell>
                        <TableHeaderCell>Name</TableHeaderCell>
                        <TableHeaderCell>Description</TableHeaderCell>
                        <TableHeaderCell>Status</TableHeaderCell>
                        <TableHeaderCell align="right">Actions</TableHeaderCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {jobLevels.map((jl) => (
                        <TableRow key={jl.id}>
                          <TableCell>
                            <strong>#{jl.rank}</strong>
                          </TableCell>
                          <TableCell>
                            <code>{jl.code}</code>
                          </TableCell>
                          <TableCell>
                            <strong>{jl.name}</strong>
                          </TableCell>
                          <TableCell>
                            {jl.description ? <span>{jl.description}</span> : <span>—</span>}
                          </TableCell>
                          <TableCell>
                            <Badge variant={jl.status === 'active' ? 'success' : 'neutral'}>
                              {jl.status === 'active' ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell align="right">
                            <Inline gap="xs" justify="end" align="center">
                              {canManage && (
                                <>
                                  <Button
                                    variant="secondary"
                                    type="button"
                                    onClick={() => handleOpenEditJl(jl)}
                                    title="Edit Job Level"
                                  >
                                    <BezentIcon name="edit" size={14} />
                                    Edit
                                  </Button>
                                  {jl.status === 'active' ? (
                                    <Button
                                      variant="secondary"
                                      type="button"
                                      onClick={() =>
                                        setDeactivatingTarget({ type: 'job-level', item: jl })
                                      }
                                      title="Deactivate Job Level"
                                    >
                                      Deactivate
                                    </Button>
                                  ) : (
                                    <Button
                                      variant="secondary"
                                      type="button"
                                      onClick={() => handleReactivate('job-level', jl.id)}
                                      title="Reactivate Job Level"
                                    >
                                      Reactivate
                                    </Button>
                                  )}
                                </>
                              )}
                            </Inline>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardBody>
            </Card>
          </Stack>
        )}

        {/* ==================================================== */}
        {/* VIEW 2: GRADES MASTER                                */}
        {/* ==================================================== */}
        {activeMaster === 'grades' && (
          <Stack gap="md">
            {/* Filter & Action Toolbar */}
            <Toolbar
              left={
                <Inline gap="md" align="center">
                  <SearchInput
                    id="grd-search"
                    placeholder="Search by name or code..."
                    value={searchGrd}
                    onChange={(e) => setSearchGrd(e.target.value)}
                  />
                  <Select
                    id="grd-status-filter"
                    value={statusFilterGrd}
                    onChange={(e) =>
                      setStatusFilterGrd(e.target.value as 'all' | 'active' | 'inactive')
                    }
                    options={statusOptions}
                  />
                </Inline>
              }
              right={
                canManage ? (
                  <Button
                    variant="primary"
                    type="button"
                    onClick={handleOpenCreateGrd}
                    id="add-grade-btn"
                  >
                    <BezentIcon name="add" size={16} />
                    Add Grade
                  </Button>
                ) : undefined
              }
            />

            {/* Error Message */}
            {errorGrd && (
              <Alert variant="error">
                <Inline justify="between" align="center">
                  <span>{errorGrd}</span>
                  <Button variant="secondary" onClick={loadGrades}>
                    Retry
                  </Button>
                </Inline>
              </Alert>
            )}

            {/* Table or States */}
            <Card>
              <CardBody>
                {loadingGrd ? (
                  <LoadingState label="Loading grades..." />
                ) : grades.length === 0 ? (
                  <EmptyState
                    title="No Grades Found"
                    description={
                      searchGrd || statusFilterGrd !== 'all'
                        ? 'No grades match the selected search or filter criteria.'
                        : 'No employment classification grades have been defined for this company yet.'
                    }
                    primaryAction={
                      canManage && !searchGrd && statusFilterGrd === 'all'
                        ? {
                            label: 'Add First Grade',
                            onClick: handleOpenCreateGrd,
                          }
                        : undefined
                    }
                  />
                ) : (
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableHeaderCell>Rank / Order</TableHeaderCell>
                        <TableHeaderCell>Code</TableHeaderCell>
                        <TableHeaderCell>Name</TableHeaderCell>
                        <TableHeaderCell>Description</TableHeaderCell>
                        <TableHeaderCell>Status</TableHeaderCell>
                        <TableHeaderCell align="right">Actions</TableHeaderCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {grades.map((g) => (
                        <TableRow key={g.id}>
                          <TableCell>
                            <strong>#{g.rank}</strong>
                          </TableCell>
                          <TableCell>
                            <code>{g.code}</code>
                          </TableCell>
                          <TableCell>
                            <strong>{g.name}</strong>
                          </TableCell>
                          <TableCell>
                            {g.description ? <span>{g.description}</span> : <span>—</span>}
                          </TableCell>
                          <TableCell>
                            <Badge variant={g.status === 'active' ? 'success' : 'neutral'}>
                              {g.status === 'active' ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell align="right">
                            <Inline gap="xs" justify="end" align="center">
                              {canManage && (
                                <>
                                  <Button
                                    variant="secondary"
                                    type="button"
                                    onClick={() => handleOpenEditGrd(g)}
                                    title="Edit Grade"
                                  >
                                    <BezentIcon name="edit" size={14} />
                                    Edit
                                  </Button>
                                  {g.status === 'active' ? (
                                    <Button
                                      variant="secondary"
                                      type="button"
                                      onClick={() =>
                                        setDeactivatingTarget({ type: 'grade', item: g })
                                      }
                                      title="Deactivate Grade"
                                    >
                                      Deactivate
                                    </Button>
                                  ) : (
                                    <Button
                                      variant="secondary"
                                      type="button"
                                      onClick={() => handleReactivate('grade', g.id)}
                                      title="Reactivate Grade"
                                    >
                                      Reactivate
                                    </Button>
                                  )}
                                </>
                              )}
                            </Inline>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardBody>
            </Card>
          </Stack>
        )}

        {/* ==================================================== */}
        {/* MODAL: ADD / EDIT JOB LEVEL                          */}
        {/* ==================================================== */}
        <Modal
          isOpen={isJlModalOpen}
          onClose={() => !jlModalSubmitting && setIsJlModalOpen(false)}
          title={editingJl ? 'Edit Job Level' : 'Add Job Level'}
        >
          <form onSubmit={handleSubmitJl}>
            <Stack gap="md">
              {jlModalError && <Alert variant="error">{jlModalError}</Alert>}

              <FormField label="Job Level Name" htmlFor="jl-form-name" required>
                <Input
                  id="jl-form-name"
                  value={jlFormName}
                  onChange={(e) => setJlFormName(e.target.value)}
                  placeholder="e.g. Senior Professional"
                  disabled={jlModalSubmitting}
                  required
                />
              </FormField>

              <FormGrid columns={2}>
                <FormField
                  label="Code"
                  htmlFor="jl-form-code"
                  required
                  helperText="Unique uppercase identifier within company"
                >
                  <Input
                    id="jl-form-code"
                    value={jlFormCode}
                    onChange={(e) => setJlFormCode(e.target.value)}
                    placeholder="e.g. L3"
                    disabled={jlModalSubmitting}
                    required
                  />
                </FormField>

                <FormField
                  label="Rank / Order"
                  htmlFor="jl-form-rank"
                  required
                  helperText="Positive integer determining seniority order"
                >
                  <Input
                    id="jl-form-rank"
                    type="number"
                    min="1"
                    step="1"
                    value={jlFormRank}
                    onChange={(e) => setJlFormRank(e.target.value)}
                    placeholder="e.g. 30"
                    disabled={jlModalSubmitting}
                    required
                  />
                </FormField>
              </FormGrid>

              <FormField
                label="Description"
                htmlFor="jl-form-desc"
                helperText="Optional details about seniority level requirements"
              >
                <Textarea
                  id="jl-form-desc"
                  value={jlFormDesc}
                  onChange={(e) => setJlFormDesc(e.target.value)}
                  placeholder="Briefly describe scope and responsibilities..."
                  rows={3}
                  disabled={jlModalSubmitting}
                />
              </FormField>

              {editingJl && (
                <FormField label="Status" htmlFor="jl-form-status">
                  <Select
                    id="jl-form-status"
                    value={jlFormStatus}
                    onChange={(e) => setJlFormStatus(e.target.value as JobLevelStatus)}
                    options={[
                      { value: 'active', label: 'Active' },
                      { value: 'inactive', label: 'Inactive' },
                    ]}
                    disabled={jlModalSubmitting}
                  />
                </FormField>
              )}

              <Inline gap="sm" justify="end">
                <Button
                  variant="secondary"
                  type="button"
                  onClick={() => setIsJlModalOpen(false)}
                  disabled={jlModalSubmitting}
                >
                  Cancel
                </Button>
                <Button variant="primary" type="submit" disabled={jlModalSubmitting}>
                  {jlModalSubmitting
                    ? 'Saving...'
                    : editingJl
                      ? 'Save Changes'
                      : 'Create Job Level'}
                </Button>
              </Inline>
            </Stack>
          </form>
        </Modal>

        {/* ==================================================== */}
        {/* MODAL: ADD / EDIT GRADE                              */}
        {/* ==================================================== */}
        <Modal
          isOpen={isGrdModalOpen}
          onClose={() => !grdModalSubmitting && setIsGrdModalOpen(false)}
          title={editingGrd ? 'Edit Grade' : 'Add Grade'}
        >
          <form onSubmit={handleSubmitGrd}>
            <Stack gap="md">
              {grdModalError && <Alert variant="error">{grdModalError}</Alert>}

              <FormField label="Grade Name" htmlFor="grd-form-name" required>
                <Input
                  id="grd-form-name"
                  value={grdFormName}
                  onChange={(e) => setGrdFormName(e.target.value)}
                  placeholder="e.g. Grade 3"
                  disabled={grdModalSubmitting}
                  required
                />
              </FormField>

              <FormGrid columns={2}>
                <FormField
                  label="Code"
                  htmlFor="grd-form-code"
                  required
                  helperText="Unique uppercase identifier within company"
                >
                  <Input
                    id="grd-form-code"
                    value={grdFormCode}
                    onChange={(e) => setGrdFormCode(e.target.value)}
                    placeholder="e.g. G3"
                    disabled={grdModalSubmitting}
                    required
                  />
                </FormField>

                <FormField
                  label="Rank / Order"
                  htmlFor="grd-form-rank"
                  required
                  helperText="Positive integer determining grade order"
                >
                  <Input
                    id="grd-form-rank"
                    type="number"
                    min="1"
                    step="1"
                    value={grdFormRank}
                    onChange={(e) => setGrdFormRank(e.target.value)}
                    placeholder="e.g. 30"
                    disabled={grdModalSubmitting}
                    required
                  />
                </FormField>
              </FormGrid>

              <FormField
                label="Description"
                htmlFor="grd-form-desc"
                helperText="Optional details about classification grade"
              >
                <Textarea
                  id="grd-form-desc"
                  value={grdFormDesc}
                  onChange={(e) => setGrdFormDesc(e.target.value)}
                  placeholder="Briefly describe the employment grade..."
                  rows={3}
                  disabled={grdModalSubmitting}
                />
              </FormField>

              {editingGrd && (
                <FormField label="Status" htmlFor="grd-form-status">
                  <Select
                    id="grd-form-status"
                    value={grdFormStatus}
                    onChange={(e) => setGrdFormStatus(e.target.value as GradeStatus)}
                    options={[
                      { value: 'active', label: 'Active' },
                      { value: 'inactive', label: 'Inactive' },
                    ]}
                    disabled={grdModalSubmitting}
                  />
                </FormField>
              )}

              <Inline gap="sm" justify="end">
                <Button
                  variant="secondary"
                  type="button"
                  onClick={() => setIsGrdModalOpen(false)}
                  disabled={grdModalSubmitting}
                >
                  Cancel
                </Button>
                <Button variant="primary" type="submit" disabled={grdModalSubmitting}>
                  {grdModalSubmitting ? 'Saving...' : editingGrd ? 'Save Changes' : 'Create Grade'}
                </Button>
              </Inline>
            </Stack>
          </form>
        </Modal>

        {/* ==================================================== */}
        {/* MODAL: DEACTIVATE CONFIRMATION                       */}
        {/* ==================================================== */}
        <Modal
          isOpen={deactivatingTarget !== null}
          onClose={() => !deactivatingSubmitting && setDeactivatingTarget(null)}
          title={
            deactivatingTarget?.type === 'job-level' ? 'Deactivate Job Level' : 'Deactivate Grade'
          }
        >
          <Stack gap="md">
            {deactivateError && <Alert variant="error">{deactivateError}</Alert>}

            <Alert variant="warning">
              <Stack gap="xs">
                <strong>Deactivation Impact Notice</strong>
                <span>
                  Existing employee or designation references will remain unchanged. This{' '}
                  {deactivatingTarget?.type === 'job-level' ? 'job level' : 'grade'} will no longer
                  be available for new assignments.
                </span>
              </Stack>
            </Alert>

            <p>
              Are you sure you want to deactivate <strong>{deactivatingTarget?.item.name}</strong> (
              {deactivatingTarget?.item.code})?
            </p>

            <Inline gap="sm" justify="end">
              <Button
                variant="secondary"
                onClick={() => setDeactivatingTarget(null)}
                disabled={deactivatingSubmitting}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleConfirmDeactivate}
                disabled={deactivatingSubmitting}
              >
                {deactivatingSubmitting ? 'Deactivating...' : 'Confirm Deactivate'}
              </Button>
            </Inline>
          </Stack>
        </Modal>
      </Stack>
    </Page>
  );
}
