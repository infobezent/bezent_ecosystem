import type { HTMLAttributes } from 'react';
import './ProgressBar.css';

export interface ProgressBarProps extends HTMLAttributes<HTMLDivElement> {
  value: number;
  max?: number;
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'info';
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  showValue?: boolean;
  className?: string;
}

function resolvePctClass(pct: number): string {
  if (pct <= 0) return 'bezent-progress-pct-0';
  if (pct >= 100) return 'bezent-progress-pct-100';
  if (pct >= 31 && pct <= 35) return 'bezent-progress-pct-33';
  if (pct >= 64 && pct <= 68) return 'bezent-progress-pct-67';
  const rounded = Math.round(pct / 5) * 5;
  return `bezent-progress-pct-${rounded}`;
}

export function ProgressBar({
  value,
  max = 100,
  variant = 'primary',
  size = 'md',
  label,
  showValue = false,
  className = '',
  ...rest
}: ProgressBarProps) {
  const percentage = Math.min(100, Math.max(0, max > 0 ? (value / max) * 100 : 0));
  const rounded = Math.round(percentage);
  const pctClass = resolvePctClass(percentage);

  return (
    <div
      className={`bezent-progress-bar-wrapper bezent-progress-bar--${size} ${className}`.trim()}
      {...rest}
    >
      {(label || showValue) && (
        <div className="bezent-progress-bar__labels">
          {label && <span className="bezent-progress-bar__label">{label}</span>}
          {showValue && <span className="bezent-progress-bar__value">{rounded}%</span>}
        </div>
      )}
      <div
        className="bezent-progress-bar__track"
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={label || 'Progress'}
      >
        <div
          className={`bezent-progress-bar__fill bezent-progress-bar__fill--${variant} ${pctClass}`}
        />
      </div>
    </div>
  );
}

export default ProgressBar;
