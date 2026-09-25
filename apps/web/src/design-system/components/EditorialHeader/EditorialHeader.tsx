import type { ReactNode } from 'react';
import './EditorialHeader.css';

export interface EditorialHeaderProps {
  chapterNumber?: string | number;
  kicker?: string;
  title: string;
  description?: string;
  badge?: ReactNode;
  actions?: ReactNode;
  className?: string;
  children?: ReactNode;
}

/**
 * Domain-neutral EditorialHeader primitive for editorial workflows,
 * chapter introductions, and high-end structured documentation/workspaces.
 */
export function EditorialHeader({
  chapterNumber,
  kicker,
  title,
  description,
  badge,
  actions,
  className,
  children,
}: EditorialHeaderProps) {
  const formattedChapter =
    typeof chapterNumber === 'number'
      ? String(chapterNumber).padStart(2, '0')
      : chapterNumber;

  return (
    <header className={`bezent-editorial-header ${className || ''}`.trim()}>
      <div className="bezent-editorial-header__main">
        {/* Editorial Numeral / Chapter Column */}
        {formattedChapter && (
          <div className="bezent-editorial-header__chapter-col">
            <span className="bezent-editorial-header__numeral">{formattedChapter}</span>
            <span className="bezent-editorial-header__numeral-sub">CHAPTER</span>
          </div>
        )}

        {/* Content Block */}
        <div className="bezent-editorial-header__content">
          {kicker && <div className="bezent-editorial-header__kicker">{kicker}</div>}

          <div className="bezent-editorial-header__title-row">
            <h2 className="bezent-editorial-header__title">{title}</h2>
            {badge && <div className="bezent-editorial-header__badge">{badge}</div>}
          </div>

          {description && (
            <p className="bezent-editorial-header__desc">{description}</p>
          )}

          {children}
        </div>

        {/* Right Actions Block */}
        {actions && (
          <div className="bezent-editorial-header__actions">{actions}</div>
        )}
      </div>

      {/* Architectural Accent Rule */}
      <div className="bezent-editorial-header__rule" aria-hidden="true">
        <div className="bezent-editorial-header__rule-accent" />
      </div>
    </header>
  );
}

export default EditorialHeader;
