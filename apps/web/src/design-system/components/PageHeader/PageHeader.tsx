import type { ReactNode } from 'react';
import './PageHeader.css';

export interface PageHeaderProps {
  title: ReactNode;
  eyebrow?: ReactNode;
  subtitle?: ReactNode;
  badge?: ReactNode;
  actions?: ReactNode;
  breadcrumbs?: ReactNode;
  className?: string;
  children?: ReactNode;
}

/**
 * Standard BEZENT PageHeader primitive.
 * Canonical page header layout with title, eyebrow, subtitle, status/company badge, and actions.
 */
export function PageHeader({
  title,
  eyebrow,
  subtitle,
  badge,
  actions,
  breadcrumbs,
  className,
  children,
}: PageHeaderProps) {
  return (
    <header className={`bezent-page-header ${className || ''}`.trim()}>
      {breadcrumbs && <div className="bezent-page-header__breadcrumbs">{breadcrumbs}</div>}

      <div className="bezent-page-header__main">
        <div className="bezent-page-header__title-group">
          {eyebrow && <span className="bezent-page-header__eyebrow">{eyebrow}</span>}
          <div className="bezent-page-header__title-row">
            {typeof title === 'string' ? (
              <h1 className="bezent-page-header__title">{title}</h1>
            ) : (
              title
            )}
            {badge}
          </div>
          {subtitle && <p className="bezent-page-header__subtitle">{subtitle}</p>}
        </div>

        {actions && <div className="bezent-page-header__actions">{actions}</div>}
      </div>

      {children}
    </header>
  );
}

export default PageHeader;
