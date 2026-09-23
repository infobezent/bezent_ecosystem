/**
 * Checkbox — accessible checkbox control styled to BEZENT tokens.
 *
 * Consistent with Switch in visual language. Supports indeterminate state
 * for parent-row select-all patterns.
 */

import {
  forwardRef,
  useEffect,
  useRef,
  type InputHTMLAttributes,
  type MutableRefObject,
} from 'react';
import './Checkbox.css';

export interface CheckboxProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'className' | 'type' | 'size'
> {
  /** Visual label rendered beside the checkbox */
  label?: string;
  /** Puts the checkbox into an indeterminate (mixed) visual state */
  indeterminate?: boolean;
  /** Visual size */
  size?: 'sm' | 'md';
  className?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { label, indeterminate, size = 'md', disabled, className, id, ...rest },
  externalRef,
) {
  const internalRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const el = internalRef.current;
    if (el) el.indeterminate = Boolean(indeterminate);
  }, [indeterminate]);

  const combinedRef = (node: HTMLInputElement | null) => {
    (internalRef as MutableRefObject<HTMLInputElement | null>).current = node;
    if (typeof externalRef === 'function') {
      externalRef(node);
    } else if (externalRef) {
      externalRef.current = node;
    }
  };

  const wrapperClass = [
    'bezent-checkbox-wrapper',
    `bezent-checkbox-wrapper--${size}`,
    disabled ? 'bezent-checkbox-wrapper--disabled' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <label className={wrapperClass} htmlFor={id}>
      <span className="bezent-checkbox__track">
        <input
          ref={combinedRef}
          type="checkbox"
          id={id}
          disabled={disabled}
          className="bezent-checkbox__input"
          {...rest}
        />
        <span className="bezent-checkbox__box" aria-hidden="true">
          <svg
            className="bezent-checkbox__checkmark"
            viewBox="0 0 12 10"
            fill="none"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="1,5 4.5,9 11,1" />
          </svg>
          <span className="bezent-checkbox__indeterminate" />
        </span>
      </span>
      {label && <span className="bezent-checkbox__label">{label}</span>}
    </label>
  );
});

export default Checkbox;
