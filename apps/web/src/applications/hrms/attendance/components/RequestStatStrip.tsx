import React from 'react';

export interface RequestStat {
  label: string;
  value: number | string;
  tone?: 'warning' | 'info' | 'success' | 'danger' | 'neutral';
  /** Makes the stat a quick filter when provided. */
  onClick?: () => void;
  hint?: string;
}

interface RequestStatStripProps {
  stats: RequestStat[];
  ariaLabel?: string;
}

/**
 * One slim summary row for the Attendance request pages. Replaces a wall of KPI cards
 * with a single card of counts that still work as quick filters.
 */
export const RequestStatStrip: React.FC<RequestStatStripProps> = ({
  stats,
  ariaLabel = 'Summary',
}) => (
  <div className="bezent-req-stats" role="group" aria-label={ariaLabel}>
    {stats.map((stat) => {
      const tone = stat.tone ?? 'neutral';
      const content = (
        <>
          <span className="bezent-req-stats__label">
            <span className={`bezent-req-stats__dot bezent-req-stats__dot--${tone}`} />
            {stat.label}
          </span>
          <span className="bezent-req-stats__value">
            {typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}
          </span>
        </>
      );
      return stat.onClick ? (
        <button
          key={stat.label}
          type="button"
          className="bezent-req-stats__item bezent-req-stats__item--action"
          title={stat.hint}
          onClick={stat.onClick}
        >
          {content}
        </button>
      ) : (
        <div key={stat.label} className="bezent-req-stats__item" title={stat.hint}>
          {content}
        </div>
      );
    })}
  </div>
);
