/**
 * Spinner — animated loading indicator.
 *
 * Used standalone or composed inside LoadingState.
 * Accessible: uses role="status" with a screen-reader-only label.
 */

import './Spinner.css';

export type SpinnerSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface SpinnerProps {
  size?: SpinnerSize;
  /** Accessible label for screen readers */
  label?: string;
  className?: string;
}

export function Spinner({ size = 'md', label = 'Loading…', className }: SpinnerProps) {
  const classes = ['bezent-spinner', `bezent-spinner--${size}`, className ?? '']
    .filter(Boolean)
    .join(' ');

  return (
    <span className={classes} role="status" aria-label={label}>
      <span className="bezent-spinner__ring" aria-hidden="true" />
      <span className="bezent-sr-only">{label}</span>
    </span>
  );
}

export default Spinner;
