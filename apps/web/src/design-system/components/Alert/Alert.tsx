import type { ReactNode } from 'react';
import { BezentIcon, type BezentIconName } from '../../icons';
import './Alert.css';

export type AlertVariant = 'success' | 'warning' | 'error' | 'danger' | 'info';

export interface AlertProps {
  variant?: AlertVariant;
  title?: string;
  dismissible?: boolean;
  onDismiss?: () => void;
  children: ReactNode;
  className?: string;
}

const ALERT_ICONS: Record<AlertVariant, BezentIconName> = {
  success: 'check',
  warning: 'alertTriangle',
  error: 'alertCircle',
  danger: 'alertCircle',
  info: 'info',
};

/**
 * Standard BEZENT Alert banner component. Semantic colors,
 * standard iconography, and accessible alert role.
 */
export function Alert({ variant = 'info', title, onDismiss, children, className }: AlertProps) {
  const iconName = ALERT_ICONS[variant];

  return (
    <div role="alert" className={`bezent-alert bezent-alert--${variant} ${className || ''}`.trim()}>
      <span className="bezent-alert__icon" aria-hidden="true">
        <BezentIcon name={iconName} size={18} color="currentColor" />
      </span>

      <div className="bezent-alert__content">
        {title && <div className="bezent-alert__title">{title}</div>}
        <div className="bezent-alert__message">{children}</div>
      </div>

      {onDismiss && (
        <button
          type="button"
          className="bezent-alert__close"
          onClick={onDismiss}
          aria-label="Dismiss alert"
        >
          <BezentIcon name="close" size={14} color="currentColor" />
        </button>
      )}
    </div>
  );
}

export default Alert;
