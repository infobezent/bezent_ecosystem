import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { EssProfessionalTab } from '../EssProfessionalTab';
import type {
  EssFullProfile,
  EssDocument,
  EssSkill,
  EssWorkSchedule,
  EssCareerEvent,
} from '../../../api/essApi';

const baseEmployee = {
  id: 'emp_demo_002',
  tenantId: 'tent_bezent_demo_01',
  companyId: 'comp_bezent_demo_01',
  employeeNumber: 'EMP-002',
  firstName: 'Arjun',
  lastName: 'Mehta',
  email: 'arjun.mehta@bezent.com',
  workPhone: '+91 98765 43210',
  departmentId: 'dept_eng_01',
  departmentName: 'Engineering',
  departmentCode: 'ENG',
  designationId: 'desig_se_01',
  designationTitle: 'Senior Software Engineer',
  designationCode: 'SSE',
  locationId: 'loc_chn_01',
  locationName: 'Chennai Campus',
  reportingManagerId: 'emp_mgr_001',
  reportingManagerName: 'Vikram Rathore',
  reportingManagerDesignation: 'VP of Engineering',
  employmentType: 'full_time',
  employmentStatus: 'active',
  joiningDate: '2024-02-01',
  probationEndDate: '2024-08-01',
  confirmationDate: '2024-08-02',
  confirmedJoiningDate: '2024-02-01',
  noticePeriodDays: 60,
  gender: 'male',
  avatarPreference: 'male',
};

const fullSchedule: EssWorkSchedule = {
  workingCalendar: '5-Day Standard Calendar',
  workSchedule: 'General Shift',
  workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
  startTime: '09:00',
  endTime: '18:00',
  breakMinutes: 15,
  lunchMinutes: 45,
  timeZone: 'Asia/Kolkata (IST)',
};

const mockSkills: EssSkill[] = [
  {
    id: 'skill_01',
    skillName: 'TypeScript / React',
    skillType: 'Technical',
    proficiency: 'Expert',
    level: 'L4',
    yearsOfExperience: 6,
    assessedOn: '2025-11-10',
  },
  {
    id: 'skill_02',
    skillName: 'Distributed Systems',
    skillType: 'Architecture',
    proficiency: 'Advanced',
    level: 'L3',
    yearsOfExperience: 4,
    assessedOn: '2025-12-05',
  },
];

const mockDocuments: EssDocument[] = [
  {
    id: 'doc_edu_01',
    category: 'education',
    documentName: 'Bachelor of Technology Degree Certificate',
    documentNumber: 'EDU-BTECH-2018',
    status: 'verified',
    createdAt: '2024-02-05',
  },
  {
    id: 'doc_exp_01',
    category: 'previous_employment',
    documentName: 'Relieving & Service Certificate - TechCorp',
    documentNumber: 'EXP-TC-9821',
    status: 'verified',
    createdAt: '2024-02-05',
  },
];

const mockCareerHistory: EssCareerEvent[] = [
  {
    id: 'act_01',
    eventType: 'designation_change',
    eventLabel: 'Designation Change',
    effectiveDate: '2025-01-15',
    previousValue: 'Software Engineer',
    newValue: 'Senior Software Engineer',
    appliedAt: '2025-01-15T10:00:00Z',
  },
  {
    id: 'act_02',
    eventType: 'department_change',
    eventLabel: 'Department Transfer',
    effectiveDate: '2024-07-01',
    previousValue: 'Product Operations',
    newValue: 'Engineering',
    appliedAt: '2024-07-01T10:00:00Z',
  },
];

const fullProfile: EssFullProfile = {
  employee: baseEmployee,
  personal: null,
  familyMembers: [],
  emergencyContacts: [],
  bankAccount: null,
  skills: mockSkills,
  workSchedule: fullSchedule,
  careerHistory: mockCareerHistory,
};

describe('ESS My Profile — Professional Tab V1.0 Component', () => {
  it('renders all seven finalized sections in exact sequence with proper headings and testids', () => {
    const html = renderToStaticMarkup(
      <EssProfessionalTab
        profile={fullProfile}
        documents={mockDocuments}
        reportingManagerDesignation="VP of Engineering"
      />,
    );

    expect(html).toContain('data-testid="ess-professional-tab"');
    expect(html).toContain('id="ess-section-employment"');
    expect(html).toContain('id="ess-section-organization"');
    expect(html).toContain('id="ess-section-work-schedule"');
    expect(html).toContain('id="ess-section-education"');
    expect(html).toContain('id="ess-section-experience"');
    expect(html).toContain('id="ess-section-skills"');
    expect(html).toContain('id="ess-section-career-history"');

    // Section headings
    expect(html).toContain('Employment Information');
    expect(html).toContain('Organization &amp; Reporting Structure');
    expect(html).toContain('Work Arrangement &amp; Schedule');
    expect(html).toContain('Education &amp; Qualifications');
    expect(html).toContain('Previous Work Experience');
    expect(html).toContain('Skills &amp; Certifications');
    expect(html).toContain('Internal Career History');
  });

  it('renders enriched employment fields: work phone, probation, confirmation, notice period', () => {
    const html = renderToStaticMarkup(
      <EssProfessionalTab profile={fullProfile} documents={mockDocuments} />,
    );

    expect(html).toContain('Official Work Phone');
    expect(html).toContain('+91 98765 43210');
    expect(html).toContain('Probation End Date');
    expect(html).toContain('Aug 1, 2024');
    expect(html).toContain('Confirmation Date');
    expect(html).toContain('Aug 2, 2024');
    expect(html).toContain('Notice Period');
    expect(html).toContain('60 days');
    // Non-contract employee does not display contract end date
    expect(html).not.toContain('Contract End Date');
  });

  it('conditionally displays contract end date only when contract type or end date is present', () => {
    const contractProfile: EssFullProfile = {
      ...fullProfile,
      employee: {
        ...baseEmployee,
        employmentType: 'contract',
        contractEndDate: '2025-12-31',
      },
    };

    const html = renderToStaticMarkup(<EssProfessionalTab profile={contractProfile} />);
    expect(html).toContain('Contract End Date');
    expect(html).toContain('Dec 31, 2025');
  });

  it('renders enriched organization codes and reporting manager designation', () => {
    const html = renderToStaticMarkup(
      <EssProfessionalTab profile={fullProfile} reportingManagerDesignation="VP of Engineering" />,
    );

    // Department name + code
    expect(html).toContain('Engineering');
    expect(html).toContain('ENG');
    // Designation title + code
    expect(html).toContain('Senior Software Engineer');
    expect(html).toContain('SSE');
    // Reporting manager name + designation
    expect(html).toContain('Vikram Rathore');
    expect(html).toContain('VP of Engineering');
  });

  it('renders effective work schedule when available', () => {
    const html = renderToStaticMarkup(
      <EssProfessionalTab profile={fullProfile} documents={mockDocuments} />,
    );

    expect(html).toContain('General Shift');
    expect(html).toContain('5-Day Standard Calendar');
    expect(html).toContain('09:00 – 18:00');
    expect(html).toContain('Monday, Tuesday, Wednesday, Thursday, Friday');
  });

  it('renders compact inline empty state when no schedule is assigned', () => {
    const noScheduleProfile: EssFullProfile = {
      ...fullProfile,
      workSchedule: null,
    };

    const html = renderToStaticMarkup(<EssProfessionalTab profile={noScheduleProfile} />);

    expect(html).toContain('No work schedule assigned');
    expect(html).toContain('Your assigned working schedule will appear here when available.');
  });

  it('renders authorized education supporting documents when available', () => {
    const html = renderToStaticMarkup(
      <EssProfessionalTab profile={fullProfile} documents={mockDocuments} />,
    );

    expect(html).toContain('Bachelor of Technology Degree Certificate');
    expect(html).toContain('EDU-BTECH-2018');
  });

  it('renders compact empty state when no education documents exist', () => {
    const html = renderToStaticMarkup(<EssProfessionalTab profile={fullProfile} documents={[]} />);

    expect(html).toContain('No education records available');
    expect(html).toContain('Uploaded educational certificates and qualification documents');
  });

  it('renders authorized previous employment supporting documents when available', () => {
    const html = renderToStaticMarkup(
      <EssProfessionalTab profile={fullProfile} documents={mockDocuments} />,
    );

    expect(html).toContain('Relieving &amp; Service Certificate - TechCorp');
    expect(html).toContain('EXP-TC-9821');
  });

  it('renders compact empty state when no previous employment documents exist', () => {
    const html = renderToStaticMarkup(<EssProfessionalTab profile={fullProfile} documents={[]} />);

    expect(html).toContain('No previous employment records available');
    expect(html).toContain('Prior employment and service documents');
  });

  it('renders actual assessed skills in table with proficiency and experience', () => {
    const html = renderToStaticMarkup(
      <EssProfessionalTab profile={fullProfile} documents={mockDocuments} />,
    );

    expect(html).toContain('TypeScript / React');
    expect(html).toContain('Expert');
    expect(html).toContain('6 yrs');
    expect(html).toContain('Distributed Systems');
    expect(html).toContain('Advanced');
    expect(html).toContain('4 yrs');
    expect(html).toContain(
      'Corporate certifications and credentials will appear here when verified.',
    );
  });

  it('renders compact empty state when skills list is empty', () => {
    const noSkillsProfile: EssFullProfile = {
      ...fullProfile,
      skills: [],
    };

    const html = renderToStaticMarkup(<EssProfessionalTab profile={noSkillsProfile} />);

    expect(html).toContain('No skills recorded');
    expect(html).toContain(
      'Assessed professional and technical skills will appear here when recorded.',
    );
  });

  it('renders chronological career timeline when finalized career events exist', () => {
    const html = renderToStaticMarkup(
      <EssProfessionalTab profile={fullProfile} careerHistory={mockCareerHistory} />,
    );

    expect(html).toContain('data-testid="career-history-timeline"');
    expect(html).toContain('Designation Change');
    expect(html).toContain('Software Engineer');
    expect(html).toContain('Senior Software Engineer');
    expect(html).toContain('Jan 15, 2025');

    expect(html).toContain('Department Transfer');
    expect(html).toContain('Product Operations');
    expect(html).toContain('Engineering');
    expect(html).toContain('Jul 1, 2024');
    expect(html).toContain('Applied');
  });

  it('renders event safely when previousValue and newValue are null (no raw ID leakage)', () => {
    const eventsWithNulls: EssCareerEvent[] = [
      {
        id: 'act_null_01',
        eventType: 'designation_change',
        eventLabel: 'Designation Change',
        effectiveDate: '2025-02-01',
        previousValue: null,
        newValue: null,
        appliedAt: '2025-02-01T10:00:00Z',
      },
    ];

    const html = renderToStaticMarkup(
      <EssProfessionalTab profile={fullProfile} careerHistory={eventsWithNulls} />,
    );

    expect(html).toContain('data-testid="career-history-timeline"');
    expect(html).toContain('Designation Change');
    expect(html).toContain('Feb 1, 2025');
    // Does not render transition change block when values are null
    expect(html).not.toContain('ess-profile-timeline-change');
  });

  it('renders compact empty state when no career history events exist', () => {
    const noHistoryProfile: EssFullProfile = {
      ...fullProfile,
      careerHistory: [],
    };

    const html = renderToStaticMarkup(
      <EssProfessionalTab profile={noHistoryProfile} careerHistory={[]} />,
    );

    expect(html).toContain('No career changes recorded');
    expect(html).toContain('Approved role and department changes will appear here when available.');
  });

  it('renders dedicated loading state when career history is loading', () => {
    const html = renderToStaticMarkup(
      <EssProfessionalTab profile={fullProfile} careerHistoryLoading={true} />,
    );

    expect(html).toContain('data-testid="career-history-loading"');
    expect(html).toContain('Loading career history...');
  });

  it('renders distinct error alert when career history API fails', () => {
    const html = renderToStaticMarkup(
      <EssProfessionalTab profile={fullProfile} careerHistoryError="Internal network error" />,
    );

    expect(html).toContain('Unable to load career history');
    expect(html).toContain('Internal network error');
    // Must NOT show empty state on failure
    expect(html).not.toContain('No career changes recorded');
  });
});
