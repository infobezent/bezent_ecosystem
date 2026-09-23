import sleepingRaccoonImg from '../../../assets/sleeping_blue_raccoon.png';
import onboardingRaccoonImg from '../../../assets/raccoon_onboarding.png';
import leaveRaccoonImg from '../../../assets/raccoon_leave.png';
import attendanceRaccoonImg from '../../../assets/raccoon_attendance.png';
import timesheetsRaccoonImg from '../../../assets/raccoon_timesheets.png';
import performanceRaccoonImg from '../../../assets/raccoon_performance.png';
import employeesRaccoonImg from '../../../assets/raccoon_employees.png';
import { BezentIcon } from '../../icons';
import './EmptyStateIllustration.css';

export type EmptyStateIllustrationSize = 'default' | 'compact';

export type RaccoonVariant =
  | 'default'
  | 'onboarding'
  | 'attendance'
  | 'leave'
  | 'timesheets'
  | 'payroll'
  | 'performance'
  | 'employees'
  | 'employee'
  | 'organization'
  | 'recruitment'
  | 'documents'
  | 'learning'
  | 'career'
  | 'tasks'
  | 'calendar'
  | 'approvals'
  | 'notes'
  | 'dashboard';

export interface EmptyStateIllustrationProps {
  size?: EmptyStateIllustrationSize;
  className?: string;
  isDark?: boolean;
  /** Explicit custom image source override */
  imageSrc?: string;
  /** Page or module contextual mascot variant */
  variant?: RaccoonVariant | string;
  /**
   * Optional alt text for the illustration image.
   * Defaults to empty string (decorative illustration).
   */
  imageAlt?: string;
}

/** Registry of dedicated mascot illustrations mapped by page/module variant */
export const RACCOON_ILLUSTRATIONS: Record<string, string> = {
  default: sleepingRaccoonImg,
  onboarding: onboardingRaccoonImg,
  leave: leaveRaccoonImg,
  attendance: attendanceRaccoonImg,
  timesheets: timesheetsRaccoonImg,
  performance: performanceRaccoonImg,
  employees: employeesRaccoonImg,
  employee: employeesRaccoonImg,
};

/** Contextual badge accents for pages awaiting dedicated AI generation */
export const VARIANT_ACCENTS: Record<string, { icon: string; label: string; color: string }> = {
  timesheets: { icon: 'timesheets', label: 'Timesheets', color: '#0284c7' },
  performance: { icon: 'performance', label: 'Performance', color: '#d97706' },
  employees: { icon: 'employees', label: 'Employees', color: '#4f46e5' },
  payroll: { icon: 'payroll', label: 'Payroll', color: '#059669' },
  documents: { icon: 'documents', label: 'Documents', color: '#7c3aed' },
  learning: { icon: 'learning', label: 'Learning', color: '#2563eb' },
  career: { icon: 'career', label: 'Career', color: '#db2777' },
  recruitment: { icon: 'recruitment', label: 'Recruitment', color: '#0891b2' },
  organization: { icon: 'organization', label: 'Organization', color: '#6366f1' },
  reports: { icon: 'reports', label: 'Reports', color: '#854d0e' },
  tasks: { icon: 'tasks', label: 'Tasks', color: '#1a73e8' },
  calendar: { icon: 'calendar', label: 'Calendar', color: '#ea4335' },
  approvals: { icon: 'approvals', label: 'Approvals', color: '#9333ea' },
  notes: { icon: 'notes', label: 'Notes', color: '#f59e0b' },
};

/**
 * Contextual Blue Raccoon Empty-State Illustration.
 *
 * Vector graphic illustration of the BEZENT blue raccoon mascot with
 * gentle floating starlight sparkles and subtle breathing motion.
 * Renders page-specific variants (onboarding, attendance, leave, etc.)
 * with contextual theme badges for pages awaiting dedicated full-body art.
 * Supports generic custom illustration image sources while preserving the
 * synchronized breathing animation and starlight atmosphere.
 */
export function EmptyStateIllustration({
  size = 'default',
  className,
  isDark: isDarkProp,
  imageSrc,
  variant = 'default',
  imageAlt = '',
}: EmptyStateIllustrationProps) {
  const activeImage = imageSrc || RACCOON_ILLUSTRATIONS[variant] || sleepingRaccoonImg;
  const accent = VARIANT_ACCENTS[variant];
  const isDark =
    isDarkProp ??
    (typeof document !== 'undefined' &&
      document.documentElement.getAttribute('data-theme') === 'dark');

  return (
    <div
      className={`bezent-empty-illustration-container bezent-empty-illustration-container--${size} ${isDark ? 'is-dark' : ''} ${className || ''}`.trim()}
      aria-hidden="true"
    >
      <div className="bezent-sleeping-raccoon-stage">
        <img
          src={activeImage}
          alt={imageAlt}
          className={`bezent-sleeping-raccoon-img bezent-sleeping-raccoon-img--${variant}`}
          draggable={false}
        />

        {/* Floating Contextual Theme Badge for pages without dedicated full-body art */}
        {accent && activeImage === sleepingRaccoonImg && (
          <div
            className={`bezent-stage-accent-badge bezent-stage-accent-badge--${variant}`}
            title={accent.label}
          >
            <span className="bezent-stage-accent-badge__icon">
              <BezentIcon name={accent.icon} size={15} color={accent.color} strokeWidth={2} />
            </span>
            <span className="bezent-stage-accent-badge__label">{accent.label}</span>
          </div>
        )}

        {/* Floating Dream Sparkles Layer */}
        <div className="bezent-sparkles-layer" aria-hidden="true">
          <svg className="bezent-sparkle-defs" width="0" height="0" aria-hidden="true">
            <defs>
              <linearGradient id="bezent-sparkle-cyan" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#bae6fd" />
                <stop offset="50%" stopColor="#38bdf8" />
                <stop offset="100%" stopColor="#0284c7" />
              </linearGradient>
              <linearGradient id="bezent-sparkle-gold" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#fef08a" />
                <stop offset="60%" stopColor="#fde047" />
                <stop offset="100%" stopColor="#eab308" />
              </linearGradient>
            </defs>
          </svg>

          {/* Star 1: Primary Cyan Twinkle Star */}
          <div className="bezent-sparkle-item bezent-sparkle-star-1">
            <svg viewBox="0 0 24 24" fill="none" className="bezent-sparkle-svg">
              <path
                d="M 12 2 Q 12 12 2 12 Q 12 12 12 22 Q 12 12 22 12 Q 12 12 12 2 Z"
                fill="url(#bezent-sparkle-cyan)"
              />
              <circle cx="12" cy="12" r="2.2" fill="#ffffff" opacity="0.9" />
            </svg>
          </div>

          {/* Star 2: Gentle Gold Starlight */}
          <div className="bezent-sparkle-item bezent-sparkle-star-2">
            <svg viewBox="0 0 24 24" fill="none" className="bezent-sparkle-svg">
              <path
                d="M 12 2 Q 12 12 2 12 Q 12 12 12 22 Q 12 12 22 12 Q 12 12 12 2 Z"
                fill="url(#bezent-sparkle-gold)"
              />
              <circle cx="12" cy="12" r="2" fill="#ffffff" opacity="0.95" />
            </svg>
          </div>

          {/* Star 3: Delicate Distant Star */}
          <div className="bezent-sparkle-item bezent-sparkle-star-3">
            <svg viewBox="0 0 24 24" fill="none" className="bezent-sparkle-svg">
              <path
                d="M 12 2 Q 12 12 2 12 Q 12 12 12 22 Q 12 12 22 12 Q 12 12 12 2 Z"
                fill="url(#bezent-sparkle-cyan)"
              />
              <circle cx="12" cy="12" r="1.8" fill="#ffffff" opacity="0.85" />
            </svg>
          </div>

          {/* Stardust Micro-Orb 1 */}
          <div className="bezent-sparkle-item bezent-stardust-1" />

          {/* Stardust Micro-Orb 2 */}
          <div className="bezent-sparkle-item bezent-stardust-2" />
        </div>
      </div>
    </div>
  );
}

export default EmptyStateIllustration;
