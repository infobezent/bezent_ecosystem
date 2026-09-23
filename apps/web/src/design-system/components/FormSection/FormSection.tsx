import type { HTMLAttributes, ReactNode } from 'react';
import './FormSection.css';

export interface FormSectionProps extends HTMLAttributes<HTMLDivElement> {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}

/**
 * Domain-neutral FormSection primitive for structuring multi-part forms,
 * configuration sections, or settings groups.
 */
export function FormSection({
  title,
  description,
  actions,
  className,
  children,
  ...rest
}: FormSectionProps) {
  return (
    <div className={`bezent-form-section ${className || ''}`.trim()} {...rest}>
      {(title || description || actions) && (
        <div className="bezent-form-section__header">
          <div className="bezent-form-section__header-content">
            {title && <h3 className="bezent-form-section__title">{title}</h3>}
            {description && <p className="bezent-form-section__desc">{description}</p>}
          </div>
          {actions && <div className="bezent-form-section__actions">{actions}</div>}
        </div>
      )}
      <div className="bezent-form-section__body">{children}</div>
    </div>
  );
}

export default FormSection;
