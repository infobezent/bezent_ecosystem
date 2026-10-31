import type { ButtonHTMLAttributes, ReactNode } from 'react';
import './Button.css';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'text' | 'danger' | 'ghost' | 'dark';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'control';

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  shape?: 'rounded' | 'pill';
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  className?: string;
  children?: ReactNode;
}

/**
 * The canonical BEZENT button primitive. Native `<button>` semantics,
 * full keyboard accessibility, token-driven states, and zero inline CSS.
 */
export function Button({
  variant = 'primary',
  size = 'md',
  shape = 'rounded',
  loading = false,
  leftIcon,
  rightIcon,
  disabled,
  className,
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const shapeClass = shape === 'pill' ? 'bezent-btn--pill' : '';

  return (
    <button
      type={type}
      disabled={isDisabled}
      aria-busy={loading}
      className={`bezent-btn bezent-btn--${variant} bezent-btn--${size} ${shapeClass} ${loading ? 'bezent-btn--loading' : ''} ${className || ''}`.trim()}
      {...rest}
    >
      {loading && <span className="bezent-btn__spinner" aria-hidden="true" />}
      {!loading && leftIcon && (
        <span className="bezent-btn__icon bezent-btn__icon--left" aria-hidden="true">
          {leftIcon}
        </span>
      )}
      {children && <span className="bezent-btn__label">{children}</span>}
      {!loading && rightIcon && (
        <span className="bezent-btn__icon bezent-btn__icon--right" aria-hidden="true">
          {rightIcon}
        </span>
      )}
    </button>
  );
}

export default Button;
