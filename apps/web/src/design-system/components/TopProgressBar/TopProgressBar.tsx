import type { HTMLAttributes } from 'react';
import './TopProgressBar.css';

export interface TopProgressBarProps extends HTMLAttributes<HTMLDivElement> {
  /** Whether the progress bar is active and visible */
  active?: boolean;
  className?: string;
}

export function TopProgressBar({ active = true, className = '', ...rest }: TopProgressBarProps) {
  return (
    <div
      className={`bezent-top-progress ${active ? 'is-active' : ''} ${className}`.trim()}
      role="progressbar"
      aria-hidden={!active}
      {...rest}
    >
      <div className="bezent-top-progress__bar" />
    </div>
  );
}
