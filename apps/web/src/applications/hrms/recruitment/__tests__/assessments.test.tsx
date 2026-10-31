import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { AssessmentsPage } from '../pages/AssessmentsPage';
import { AssessmentMetrics } from '../components/AssessmentMetrics';
import { AssessmentsTable } from '../components/AssessmentsTable';
import { AssessmentDetailModal } from '../components/AssessmentDetailModal';
import { AssignAssessmentModal } from '../components/AssignAssessmentModal';
import { INITIAL_ASSESSMENTS } from '../data/mockAssessments';
import { INITIAL_CANDIDATES } from '../data/mockCandidates';

describe('AssessmentsPage', () => {
  it('renders the Assessments page header, metrics, toolbar, and table', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <AssessmentsPage />
      </MemoryRouter>,
    );

    expect(html).toContain('Assessments');
    expect(html).toContain('Assign Assessment');
    expect(html).toContain('Total Assigned');
    expect(html).toContain('In Progress');
    expect(html).toContain('Under Review');
    expect(html).toContain('Passed &amp; Cleared');
    expect(html).toContain('Vignesh Balaji');
    expect(html).toContain('Enterprise Multi-Level Navigation Drawer');
  });

  it('renders AssessmentMetrics correctly', () => {
    const html = renderToStaticMarkup(<AssessmentMetrics assessments={INITIAL_ASSESSMENTS} />);

    expect(html).toContain('Total Assigned');
    expect(html).toContain('In Progress');
    expect(html).toContain('Under Review');
    expect(html).toContain('Passed &amp; Cleared');
  });

  it('renders AssessmentsTable with candidate assignments and actions', () => {
    const html = renderToStaticMarkup(
      <AssessmentsTable
        assessments={INITIAL_ASSESSMENTS}
        onSelectAssessment={() => {}}
        onGradeAssessment={() => {}}
      />,
    );

    expect(html).toContain('Vignesh Balaji');
    expect(html).toContain('Shreya Sengupta');
    expect(html).toContain('Enterprise Multi-Level Navigation Drawer');
    expect(html).toContain('View Details');
  });

  it('renders AssessmentDetailModal with evaluation details when open', () => {
    const assessment = INITIAL_ASSESSMENTS[0]!;
    const html = renderToStaticMarkup(
      <AssessmentDetailModal
        assessment={assessment}
        isOpen={true}
        onClose={() => {}}
        onSaveGrade={() => {}}
      />,
    );

    expect(html).toContain('Enterprise Multi-Level Navigation Drawer &amp; IA Challenge');
    expect(html).toContain('Candidate Submission');
    expect(html).toContain('Brief &amp; Instructions');
    expect(html).toContain('Vignesh Balaji');
  });

  it('renders AssignAssessmentModal with candidate options when open', () => {
    const html = renderToStaticMarkup(
      <AssignAssessmentModal
        isOpen={true}
        onClose={() => {}}
        onAssign={() => {}}
        candidates={INITIAL_CANDIDATES}
      />,
    );

    expect(html).toContain('Assign Practical Assessment');
    expect(html).toContain('Candidate');
    expect(html).toContain('Challenge Title');
    expect(html).toContain('Assign Assessment');
  });
});
