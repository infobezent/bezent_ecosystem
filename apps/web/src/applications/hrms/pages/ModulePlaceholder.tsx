import { Link } from 'react-router-dom';
import { EmptyState } from '../../../design-system/components/EmptyState';
import './ModulePlaceholder.css';

export interface ModulePlaceholderProps {
  application: string;
  destinationId?: string;
  /** Destination title, e.g. "Attendance". Omitted for the not-found state. */
  title?: string;
  /** Sub-navigation title, e.g. "Daily Log". */
  section?: string;
  sectionId?: string;
  /** Where the not-found state links back to. */
  homePath?: string;
}

interface EmptyStateCopy {
  emptyTitle: string;
  emptyDescription: string;
}

/**
 * Data-driven copy for unimplemented HRMS destination empty states.
 * Keeps domain copy out of the generic design-system EmptyState primitive.
 */
const HRMS_EMPTY_COPY: Record<string, EmptyStateCopy> = {
  employees: {
    emptyTitle: 'No employees yet',
    emptyDescription:
      'Employee records will appear here once people are added to your organization.',
  },
  onboarding: {
    emptyTitle: 'No onboarding records yet',
    emptyDescription:
      'New hires and their onboarding progress will appear here once onboarding begins.',
  },
  leave: {
    emptyTitle: 'No leave records yet',
    emptyDescription: 'Leave requests, holiday calendars, and time-off balances will appear here.',
  },
  attendance: {
    emptyTitle: 'No attendance logs yet',
    emptyDescription:
      'Daily check-ins, monthly summaries, and regularization requests will appear here.',
  },
  timesheets: {
    emptyTitle: 'No timesheet entries yet',
    emptyDescription: 'Time logs, weekly time cards, and project hour approvals will appear here.',
  },
  performance: {
    emptyTitle: 'No performance cycles yet',
    emptyDescription: 'Goals, OKRs, appraisal cycles, and 360 feedback reviews will appear here.',
  },
  organization: {
    emptyTitle: 'No organization data yet',
    emptyDescription: 'Company departments, teams, and reporting structures will appear here.',
  },
  recruitment: {
    emptyTitle: 'No active job openings yet',
    emptyDescription: 'Job listings, candidate pipelines, and hiring workflows will appear here.',
  },
  shifts: {
    emptyTitle: 'No shift schedules yet',
    emptyDescription:
      'Shift patterns, employee rosters, and schedule assignments will appear here.',
  },
  payroll: {
    emptyTitle: 'No payroll runs yet',
    emptyDescription: 'Salary structures, pay slips, and disbursement records will appear here.',
  },
  learning: {
    emptyTitle: 'No learning programs yet',
    emptyDescription:
      'Training courses, compliance certifications, and skill modules will appear here.',
  },
  career: {
    emptyTitle: 'No career paths defined yet',
    emptyDescription:
      'Competency frameworks, promotion ladders, and succession plans will appear here.',
  },
  documents: {
    emptyTitle: 'No documents uploaded yet',
    emptyDescription:
      'Organizational policies, company templates, and employee files will appear here.',
  },
  assets: {
    emptyTitle: 'No company assets assigned yet',
    emptyDescription: 'Hardware, software licenses, and office asset allocations will appear here.',
  },
  'employee-requests': {
    emptyTitle: 'No employee requests yet',
    emptyDescription: 'General inquiries, letters, and administrative requests will appear here.',
  },
  reports: {
    emptyTitle: 'No reports generated yet',
    emptyDescription: 'Workforce analytics, headcount metrics, and HR reports will appear here.',
  },
  settings: {
    emptyTitle: 'No settings configured yet',
    emptyDescription: 'Configuration options, access rules, and module settings will appear here.',
  },
  dashboard: {
    emptyTitle: 'No dashboard activity yet',
    emptyDescription:
      'Overview summaries, recent activity, and organization metrics will appear here.',
  },
};

/**
 * Development placeholder rendered for every HRMS destination until its
 * module is implemented (and, with no `title`, for unknown HRMS routes).
 * Integrates the canonical global EmptyState primitive over the workspace canvas.
 */
export function ModulePlaceholder({
  application,
  destinationId,
  title,
  section,
  homePath,
}: ModulePlaceholderProps) {
  if (!title) {
    return (
      <div className="module-placeholder module-placeholder--not-found" role="status">
        <span className="module-placeholder__eyebrow">{application}</span>
        <h1 className="module-placeholder__title">Page not available</h1>
        <p className="module-placeholder__text">
          This {application} address does not match any destination.
        </p>
        {homePath && (
          <Link className="module-placeholder__link" to={homePath}>
            Go to {application} home
          </Link>
        )}
      </div>
    );
  }

  const destinationCopy = destinationId ? HRMS_EMPTY_COPY[destinationId] : undefined;

  let emptyTitle: string;
  let emptyDescription: string;

  if (section) {
    emptyTitle = `No ${section.toLowerCase()} yet`;
    emptyDescription = `${section} records for ${title} will appear here once activity begins.`;
  } else if (destinationCopy) {
    emptyTitle = destinationCopy.emptyTitle;
    emptyDescription = destinationCopy.emptyDescription;
  } else {
    emptyTitle = `No ${title.toLowerCase()} records yet`;
    emptyDescription = `${title} records and workflows will appear here once configured.`;
  }

  return (
    <div className="module-placeholder">
      <div className="module-placeholder__header">
        <span className="module-placeholder__eyebrow">{application}</span>
        <h1 className="module-placeholder__title">{section ? `${title} · ${section}` : title}</h1>
      </div>
      <div className="module-placeholder__body">
        <EmptyState title={emptyTitle} description={emptyDescription} size="default" />
      </div>
    </div>
  );
}
