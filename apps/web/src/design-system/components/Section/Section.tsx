import type { HTMLAttributes, ReactNode } from 'react';
import './Section.css';

export interface SectionProps extends Omit<HTMLAttributes<HTMLElement>, 'className' | 'title'> {
  title?: ReactNode;
  subtitle?: ReactNode;
  badge?: ReactNode;
  actions?: ReactNode;
  variant?: 'card' | 'plain';
  className?: string;
  children?: ReactNode;
}

/**
 * Standard BEZENT Section primitive.
 * Container for a grouped block of information or form controls with standard header, badge, actions, and body.
 */
export function Section({
  title,
  subtitle,
  badge,
  actions,
  variant = 'card',
  className,
  children,
  ...rest
}: SectionProps) {
  const hasHeader = Boolean(title || subtitle || badge || actions);

  return (
    <section
      className={`bezent-section bezent-section--${variant} ${className || ''}`.trim()}
      {...rest}
    >
      {hasHeader && (
        <div className="bezent-section__header">
          <div className="bezent-section__title-group">
            <div className="bezent-section__title-row">
              {typeof title === 'string' ? (
                <h3 className="bezent-section__title">{title}</h3>
              ) : (
                title
              )}
              {badge}
            </div>
            {subtitle && <p className="bezent-section__subtitle">{subtitle}</p>}
          </div>

          {actions && <div className="bezent-section__actions">{actions}</div>}
        </div>
      )}

      <div className="bezent-section__body">{children}</div>
    </section>
  );
}

export default Section;
