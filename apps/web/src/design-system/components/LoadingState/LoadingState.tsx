/**
 * LoadingState — full-section or full-page loading placeholder.
 *
 * Composes Spinner with an optional label. Replaces the ad-hoc
 * `<div className="onboarding-page__loading bezent-table-loading">` pattern.
 *
 * Usage:
 *   <LoadingState />                          // centered spinner
 *   <LoadingState label="Loading employees" size="lg" />
 *   <LoadingState fill />                     // fills parent container
 */

import { Spinner, type SpinnerSize } from '../Spinner';
import './LoadingState.css';

export interface LoadingStateProps {
  /** Spinner size */
  size?: SpinnerSize;
  /** Descriptive label shown below the spinner and used as accessible text */
  label?: string;
  /** Stretches to fill the parent container (uses flex: 1) */
  fill?: boolean;
  /** Minimum height of the loading container */
  minHeight?: 'sm' | 'md' | 'lg' | 'none';
  className?: string;
}

export function LoadingState({
  size = 'md',
  label = 'Loading…',
  fill,
  minHeight,
  className,
}: LoadingStateProps) {
  const classes = [
    'bezent-loading-state',
    fill ? 'bezent-loading-state--fill' : '',
    minHeight && minHeight !== 'none' ? `bezent-loading-state--min-${minHeight}` : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classes} aria-busy="true">
      <Spinner size={size} label={label} />
      {label && (
        <p className="bezent-loading-state__label" aria-hidden="true">
          {label}
        </p>
      )}
    </div>
  );
}

export default LoadingState;
