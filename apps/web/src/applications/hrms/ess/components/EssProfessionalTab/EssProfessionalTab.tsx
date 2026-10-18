import type { ReactNode } from 'react';
import {
  Alert,
  Badge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  type BadgeVariant,
} from '../../../../../design-system/components';
import { BezentIcon } from '../../../../../design-system/icons';
import type { EssFullProfile, EssDocument, EssSkill, EssCareerEvent } from '../../api/essApi';

export interface EssProfessionalTabProps {
  profile: EssFullProfile;
  documents?: EssDocument[];
  reportingManagerDesignation?: string | null;
  careerHistory?: EssCareerEvent[];
  careerHistoryLoading?: boolean;
  careerHistoryError?: string | null;
}

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr.includes('T') ? dateStr : `${dateStr}T00:00:00Z`);
    if (Number.isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC',
    });
  } catch {
    return dateStr;
  }
}

function formatLabel(s?: string | null): string {
  if (!s) return '—';
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function getEmploymentStatusVariant(status?: string | null): BadgeVariant {
  switch (status) {
    case 'active':
      return 'success';
    case 'probation':
    case 'notice':
      return 'warning';
    case 'terminated':
    case 'suspended':
      return 'danger';
    default:
      return 'neutral';
  }
}

function getDocStatusVariant(status?: string | null): BadgeVariant {
  switch (status) {
    case 'verified':
      return 'success';
    case 'under_review':
    case 'pending':
      return 'info';
    case 'resubmission_required':
      return 'warning';
    case 'rejected':
    case 'expired':
      return 'danger';
    default:
      return 'neutral';
  }
}

function getProficiencyVariant(proficiency?: string | null): BadgeVariant {
  switch (proficiency) {
    case 'Expert':
      return 'success';
    case 'Advanced':
      return 'info';
    default:
      return 'neutral';
  }
}

interface SectionPanelProps {
  id: string;
  iconName: string;
  title: string;
  description: string;
  action?: ReactNode;
  children: ReactNode;
}

function SectionPanel({ id, iconName, title, description, action, children }: SectionPanelProps) {
  return (
    <div id={id} className="ess-profile-section-panel">
      <div className="ess-profile-section-header">
        <div className="ess-profile-section-title-wrap">
          <div className="ess-profile-section-icon-badge">
            <BezentIcon name={iconName} size={16} />
          </div>
          <div>
            <h3 className="ess-profile-section-heading">{title}</h3>
            <p className="ess-profile-section-desc">{description}</p>
          </div>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

interface FieldItemProps {
  label: string;
  value: ReactNode;
  badge?: ReactNode;
  empty?: boolean;
}

function FieldItem({ label, value, badge, empty }: FieldItemProps) {
  return (
    <div className="ess-profile-field-item">
      <div className="ess-profile-field-label-row">
        <span className="ess-profile-field-label">{label}</span>
        {badge}
      </div>
      <span className={`ess-profile-field-value${empty ? ' is-empty' : ''}`}>{value ?? '—'}</span>
    </div>
  );
}

interface CompactEmptyInlineProps {
  iconName: string;
  title: string;
  description: string;
}

function CompactEmptyInline({ iconName, title, description }: CompactEmptyInlineProps) {
  return (
    <div className="ess-profile-empty-inline">
      <div className="ess-profile-empty-inline-icon">
        <BezentIcon name={iconName} size={16} />
      </div>
      <div className="ess-profile-empty-inline-content">
        <span className="ess-profile-empty-inline-title">{title}</span>
        <span className="ess-profile-empty-inline-desc">{description}</span>
      </div>
    </div>
  );
}

export function EssProfessionalTab({
  profile,
  documents = [],
  reportingManagerDesignation,
  careerHistory,
  careerHistoryLoading = false,
  careerHistoryError = null,
}: EssProfessionalTabProps) {
  const { employee: emp, skills = [], workSchedule } = profile;

  // Filter verified documents for education and previous employment
  const educationDocs = documents.filter((d) => d.category === 'education');
  const experienceDocs = documents.filter((d) => d.category === 'previous_employment');

  // Verify whether an effective schedule exists
  const hasEffectiveSchedule = Boolean(
    workSchedule &&
    (workSchedule.workSchedule ||
      workSchedule.workingCalendar ||
      workSchedule.startTime ||
      workSchedule.endTime),
  );

  const effectiveCareerHistory = careerHistory ?? profile.careerHistory ?? [];
  const effectiveMgrDesignation = reportingManagerDesignation ?? emp.reportingManagerDesignation;
  const isContractApplicable = emp.employmentType === 'contract' || Boolean(emp.contractEndDate);

  return (
    <div className="ess-profile-sections-stack" data-testid="ess-professional-tab">
      {/* ── 1. Employment Information ──────────────────────────────── */}
      <SectionPanel
        id="ess-section-employment"
        iconName="workforce"
        title="Employment Information"
        description="Official workforce engagement parameters and contractual standing"
      >
        <div className="ess-profile-field-grid">
          <FieldItem
            label="Legal Full Name"
            value={`${emp.firstName} ${emp.lastName ?? ''}`.trim()}
          />
          <FieldItem
            label="Employee ID"
            value={emp.employeeNumber}
            badge={
              <Badge variant="neutral" size="sm">
                Read-Only
              </Badge>
            }
          />
          <FieldItem
            label="Employment Status"
            value={
              <Badge variant={getEmploymentStatusVariant(emp.employmentStatus)} size="sm">
                {formatLabel(emp.employmentStatus)}
              </Badge>
            }
          />
          <FieldItem label="Employment Type" value={formatLabel(emp.employmentType)} />
          <FieldItem label="Date of Joining" value={formatDate(emp.joiningDate)} />
          <FieldItem label="Official Work Email" value={emp.email} />
          <FieldItem
            label="Official Work Phone"
            value={emp.workPhone || '—'}
            empty={!emp.workPhone}
          />
          <FieldItem
            label="Probation End Date"
            value={formatDate(emp.probationEndDate)}
            empty={!emp.probationEndDate}
          />
          <FieldItem
            label="Confirmation Date"
            value={formatDate(emp.confirmationDate)}
            empty={!emp.confirmationDate}
          />
          <FieldItem
            label="Notice Period"
            value={emp.noticePeriodDays ? `${emp.noticePeriodDays} days` : '—'}
            empty={!emp.noticePeriodDays}
          />
          {isContractApplicable && (
            <FieldItem
              label="Contract End Date"
              value={formatDate(emp.contractEndDate)}
              empty={!emp.contractEndDate}
            />
          )}
        </div>
      </SectionPanel>

      {/* ── 2. Organization & Reporting Structure ──────────────────── */}
      <SectionPanel
        id="ess-section-organization"
        iconName="organization"
        title="Organization & Reporting Structure"
        description="Corporate unit placement, functional designation, and operational reporting line"
      >
        <div className="ess-profile-field-grid">
          <FieldItem
            label="Department"
            value={
              emp.departmentName ? (
                <span>
                  {emp.departmentName}
                  {emp.departmentCode && (
                    <span className="ess-profile-code-pill">{emp.departmentCode}</span>
                  )}
                </span>
              ) : (
                'Not set'
              )
            }
            empty={!emp.departmentName}
          />
          <FieldItem
            label="Designation / Title"
            value={
              emp.designationTitle ? (
                <span>
                  {emp.designationTitle}
                  {emp.designationCode && (
                    <span className="ess-profile-code-pill">{emp.designationCode}</span>
                  )}
                </span>
              ) : (
                'Not set'
              )
            }
            empty={!emp.designationTitle}
          />
          <FieldItem
            label="Work Location"
            value={emp.locationName || 'Not set'}
            empty={!emp.locationName}
          />
          <FieldItem
            label="Reporting Manager"
            value={
              emp.reportingManagerName ? (
                <span>
                  {emp.reportingManagerName}
                  {effectiveMgrDesignation && (
                    <span className="ess-profile-doc-sub"> ({effectiveMgrDesignation})</span>
                  )}
                </span>
              ) : (
                'Not assigned'
              )
            }
            empty={!emp.reportingManagerName}
          />
        </div>
      </SectionPanel>

      {/* ── 3. Work Arrangement & Schedule ─────────────────────────── */}
      <SectionPanel
        id="ess-section-work-schedule"
        iconName="shifts"
        title="Work Arrangement & Schedule"
        description="Assigned operational schedule, calendar cycle, and designated working hours"
      >
        {hasEffectiveSchedule && workSchedule ? (
          <div className="ess-profile-field-grid">
            <FieldItem
              label="Work Schedule"
              value={workSchedule.workSchedule || 'Standard General Shift'}
            />
            <FieldItem
              label="Working Calendar"
              value={workSchedule.workingCalendar || '5-Day Standard Calendar'}
            />
            <FieldItem
              label="Working Days"
              value={
                Array.isArray(workSchedule.workingDays) && workSchedule.workingDays.length > 0
                  ? workSchedule.workingDays.join(', ')
                  : 'Monday – Friday'
              }
            />
            <FieldItem
              label="Working Hours"
              value={
                workSchedule.startTime && workSchedule.endTime
                  ? `${workSchedule.startTime} – ${workSchedule.endTime}`
                  : '09:00 – 18:00'
              }
            />
            <FieldItem
              label="Break Duration"
              value={
                workSchedule.breakMinutes !== null && workSchedule.breakMinutes !== undefined
                  ? `${workSchedule.breakMinutes} mins`
                  : '—'
              }
            />
            <FieldItem
              label="Lunch Duration"
              value={
                workSchedule.lunchMinutes !== null && workSchedule.lunchMinutes !== undefined
                  ? `${workSchedule.lunchMinutes} mins`
                  : '—'
              }
            />
            <FieldItem label="Time Zone" value={workSchedule.timeZone || 'Asia/Kolkata (IST)'} />
          </div>
        ) : (
          <CompactEmptyInline
            iconName="shifts"
            title="No work schedule assigned"
            description="Your assigned working schedule will appear here when available."
          />
        )}
      </SectionPanel>

      {/* ── 4. Education & Qualifications ──────────────────────────── */}
      <SectionPanel
        id="ess-section-education"
        iconName="learning"
        title="Education & Qualifications"
        description="Academic qualifications and verified educational certificates on corporate record"
      >
        {educationDocs.length > 0 ? (
          <div className="ess-profile-doc-list">
            {educationDocs.map((doc) => (
              <div key={doc.id} className="ess-profile-doc-card">
                <div className="ess-profile-doc-meta">
                  <span className="ess-profile-doc-name">{doc.documentName}</span>
                  <span className="ess-profile-doc-sub">
                    {doc.documentNumber ? `ID: ${doc.documentNumber} · ` : ''}
                    Recorded {formatDate(doc.createdAt)}
                  </span>
                </div>
                <Badge variant={getDocStatusVariant(doc.status)} size="sm">
                  {formatLabel(doc.status)}
                </Badge>
              </div>
            ))}
          </div>
        ) : (
          <CompactEmptyInline
            iconName="learning"
            title="No education records available"
            description="Uploaded educational certificates and qualification documents will appear here when available."
          />
        )}
      </SectionPanel>

      {/* ── 5. Previous Work Experience ────────────────────────────── */}
      <SectionPanel
        id="ess-section-experience"
        iconName="recruitment"
        title="Previous Work Experience"
        description="Prior employment credentials, service letters, and verified external experience"
      >
        {experienceDocs.length > 0 ? (
          <div className="ess-profile-doc-list">
            {experienceDocs.map((doc) => (
              <div key={doc.id} className="ess-profile-doc-card">
                <div className="ess-profile-doc-meta">
                  <span className="ess-profile-doc-name">{doc.documentName}</span>
                  <span className="ess-profile-doc-sub">
                    {doc.documentNumber ? `ID: ${doc.documentNumber} · ` : ''}
                    Recorded {formatDate(doc.createdAt)}
                  </span>
                </div>
                <Badge variant={getDocStatusVariant(doc.status)} size="sm">
                  {formatLabel(doc.status)}
                </Badge>
              </div>
            ))}
          </div>
        ) : (
          <CompactEmptyInline
            iconName="recruitment"
            title="No previous employment records available"
            description="Prior employment and service documents will appear here when available."
          />
        )}
      </SectionPanel>

      {/* ── 6. Skills & Certifications ─────────────────────────────── */}
      <SectionPanel
        id="ess-section-skills"
        iconName="sparkles"
        title="Skills & Certifications"
        description="Assessed professional competencies, domain skills, and technical proficiency"
      >
        {skills.length > 0 ? (
          <Table hoverable aria-label="Assessed Professional Skills">
            <TableHead>
              <TableRow>
                <TableHeaderCell>Skill</TableHeaderCell>
                <TableHeaderCell>Category / Type</TableHeaderCell>
                <TableHeaderCell>Proficiency</TableHeaderCell>
                <TableHeaderCell>Level</TableHeaderCell>
                <TableHeaderCell>Experience</TableHeaderCell>
                <TableHeaderCell>Assessed Date</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {skills.map((skill: EssSkill, idx: number) => (
                <TableRow key={skill.id || idx}>
                  <TableCell>
                    <strong>{skill.skillName}</strong>
                  </TableCell>
                  <TableCell>{skill.skillType || 'Technical'}</TableCell>
                  <TableCell>
                    <Badge variant={getProficiencyVariant(skill.proficiency)} size="sm">
                      {skill.proficiency}
                    </Badge>
                  </TableCell>
                  <TableCell>{skill.level ?? '—'}</TableCell>
                  <TableCell>
                    {skill.yearsOfExperience !== null && skill.yearsOfExperience !== undefined
                      ? `${skill.yearsOfExperience} yrs`
                      : '—'}
                  </TableCell>
                  <TableCell>{formatDate(skill.assessedOn)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <CompactEmptyInline
            iconName="sparkles"
            title="No skills recorded"
            description="Assessed professional and technical skills will appear here when recorded."
          />
        )}

        <div className="ess-profile-subtle-note">
          <BezentIcon name="information" size={14} />
          <span>Corporate certifications and credentials will appear here when verified.</span>
        </div>
      </SectionPanel>

      {/* ── 7. Internal Career History ─────────────────────────────── */}
      <SectionPanel
        id="ess-section-career-history"
        iconName="career"
        title="Internal Career History"
        description="Historical record of appointments, internal role transitions, and department movements"
      >
        {careerHistoryLoading ? (
          <div className="ess-profile-empty-inline" data-testid="career-history-loading">
            <div className="ess-profile-empty-inline-icon">
              <BezentIcon name="clock" size={16} />
            </div>
            <div className="ess-profile-empty-inline-content">
              <span className="ess-profile-empty-inline-title">Loading career history...</span>
              <span className="ess-profile-empty-inline-desc">
                Retrieving authorized career records
              </span>
            </div>
          </div>
        ) : careerHistoryError ? (
          <Alert variant="danger" title="Unable to load career history">
            {careerHistoryError}
          </Alert>
        ) : effectiveCareerHistory.length > 0 ? (
          <div className="ess-profile-timeline" data-testid="career-history-timeline">
            {effectiveCareerHistory.map((item) => (
              <div key={item.id} className="ess-profile-timeline-item">
                <div className="ess-profile-timeline-marker" />
                <div className="ess-profile-timeline-body">
                  <div className="ess-profile-timeline-header">
                    <span className="ess-profile-timeline-title">{item.eventLabel}</span>
                    <Badge variant="success" size="sm">
                      Applied
                    </Badge>
                    <span className="ess-profile-timeline-date">
                      Effective: {formatDate(item.effectiveDate)}
                    </span>
                  </div>
                  {(item.previousValue || item.newValue) && (
                    <div className="ess-profile-timeline-change">
                      {item.previousValue && (
                        <span className="ess-profile-timeline-from">{item.previousValue}</span>
                      )}
                      {item.previousValue && item.newValue && (
                        <span className="ess-profile-timeline-arrow">→</span>
                      )}
                      {item.newValue && (
                        <span className="ess-profile-timeline-to">{item.newValue}</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <CompactEmptyInline
            iconName="career"
            title="No career changes recorded"
            description="Approved role and department changes will appear here when available."
          />
        )}
      </SectionPanel>
    </div>
  );
}

export default EssProfessionalTab;
