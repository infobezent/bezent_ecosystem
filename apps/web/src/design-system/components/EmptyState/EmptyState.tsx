import type { ReactNode } from 'react';
import { EmptyStateIllustration, type EmptyStateIllustrationSize } from './EmptyStateIllustration';
import './EmptyState.css';

export interface EmptyStateAction {
  label: string;
  onClick?: () => void;
}

export interface EmptyStateProps {
  title: string;
  description?: string;
  primaryAction?: EmptyStateAction;
  /** Optional decoration inside the primary action button (e.g. an icon). */
  primaryActionIcon?: ReactNode;
  secondaryAction?: EmptyStateAction;
  size?: EmptyStateIllustrationSize;
  hideIllustration?: boolean;
  className?: string;
}

/**
 * The canonical BEZENT empty-state shell: illustration, title,
 * description, and up to two actions. Faithfully extracted from the old
 * approved UI's `BezentEmptyState.tsx` — but with its
 * `BEZENT_EMPTY_PRESETS` dictionary (~20 hardcoded per-HRMS-module
 * title/description/action strings) deliberately NOT migrated. That
 * dictionary was business copy (Leave/Attendance/Payroll/... messaging)
 * baked into what should be a domain-independent primitive — exactly
 * what `design-system` must never own (see
 * docs/architecture/DESIGN-SYSTEM-COMPONENTS.md and AGENTS.md, Article
 * 3). Every consumer (a future `platform/search` empty state, a future
 * HRMS empty state) supplies its own `title`/`description`/action copy.
 *
 * The old component's title/description defaulted to a hardcoded
 * "Let's get started" preset when nothing was passed — this version
 * requires `title` explicitly, so no BEZENT copy is invented here either.
 *
 * The old CTA button's trailing arrow icon came from `lucide-react`
 * (imported directly, not part of the BEZENT icon system) — not
 * hardcoded here, since `lucide-react` isn't yet a dependency of this
 * project and introducing one is a separate decision. `primaryActionIcon`
 * is an optional slot a consumer may fill instead.
 */
export function EmptyState({
  title,
  description,
  primaryAction,
  primaryActionIcon,
  secondaryAction,
  size = 'default',
  hideIllustration = false,
  className,
}: EmptyStateProps) {
  const isCompact = size === 'compact';

  return (
    <div
      className={`bezent-empty-state bezent-empty-state--${size} ${className || ''}`.trim()}
      role="region"
      aria-label={title}
    >
      {!hideIllustration && (
        <div className="bezent-empty-state__illustration">
          <EmptyStateIllustration size={size} />
        </div>
      )}

      <h3 className="bezent-empty-state__title">{title}</h3>

      {description && <p className="bezent-empty-state__description">{description}</p>}

      {(primaryAction || secondaryAction) && (
        <div className="bezent-empty-state__actions">
          {primaryAction && (
            <button
              type="button"
              className="bezent-empty-state__primary-action"
              onClick={primaryAction.onClick}
            >
              {primaryActionIcon}
              <span>{primaryAction.label}</span>
            </button>
          )}
          {secondaryAction && (
            <button
              type="button"
              className="bezent-empty-state__secondary-action"
              onClick={secondaryAction.onClick}
            >
              {secondaryAction.label}
            </button>
          )}
        </div>
      )}
      {!isCompact && (
        <div className="bezent-empty-state__tagline">
          <span className="bezent-empty-state__tagline-dash" aria-hidden="true" />
          People&nbsp;|&nbsp;Process&nbsp;|&nbsp;Progress
        </div>
      )}
    </div>
  );
}

export default EmptyState;
