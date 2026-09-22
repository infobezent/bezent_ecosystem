import { forwardRef, type InputHTMLAttributes } from 'react';
import './Switch.css';

export interface SwitchProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'size' | 'type' | 'className'
> {
  label?: string;
  size?: 'default' | 'compact';
  className?: string;
}

/**
 * Standard BEZENT toggle switch primitive. Accessible switch with
 * keyboard toggling, smooth slider animation, and token styling.
 */
export const Switch = forwardRef<HTMLInputElement, SwitchProps>(function Switch(
  { label, size = 'default', checked, disabled, id, className, ...rest },
  ref,
) {
  const switchId =
    id || (label ? `bezent-switch-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);

  return (
    <label
      htmlFor={switchId}
      className={`bezent-switch bezent-switch--${size} ${disabled ? 'is-disabled' : ''} ${className || ''}`.trim()}
    >
      <input
        ref={ref}
        id={switchId}
        type="checkbox"
        role="switch"
        checked={checked}
        disabled={disabled}
        aria-checked={checked}
        className="bezent-switch-input"
        {...rest}
      />
      <span className="bezent-switch-track" aria-hidden="true">
        <span className="bezent-switch-thumb" />
      </span>
      {label && <span className="bezent-switch-label">{label}</span>}
    </label>
  );
});

export default Switch;
