import { Skeleton } from './Skeleton';

export interface TableSkeletonProps {
  /** Number of placeholder rows to render (default: 5) */
  rows?: number;
  /** Number of columns per row (default: 6) */
  columns?: number;
  /** Whether the first column has an avatar/badge layout (default: true) */
  hasAvatarFirstCol?: boolean;
  /** Optional accessible status label for screen readers & testing */
  label?: string;
}

export function TableSkeleton({
  rows = 5,
  columns = 6,
  hasAvatarFirstCol = true,
  label,
}: TableSkeletonProps) {
  const rowList = Array.from({ length: rows }, (_, i) => i);
  const remainingCols = Array.from(
    { length: Math.max(1, columns - (hasAvatarFirstCol ? 1 : 0)) },
    (_, i) => i,
  );

  return (
    <tbody
      className="bezent-table-body bezent-table-skeleton-body"
      aria-busy="true"
      aria-label={label}
    >
      {label && (
        <tr className="bezent-sr-only">
          <td colSpan={columns}>{label}</td>
        </tr>
      )}
      {rowList.map((rowIndex) => (
        <tr key={`skel-row-${rowIndex}`} className="bezent-table-row bezent-table-skeleton-row">
          {hasAvatarFirstCol && (
            <td className="bezent-table-cell">
              <div className="bezent-table-skeleton-cell">
                <Skeleton variant="circular" width="2xs" height="lg" />
                <div className="bezent-table-skeleton-text-group">
                  <Skeleton variant="text" width={rowIndex % 2 === 0 ? 'md' : 'sm'} height="sm" />
                  <Skeleton variant="text" width="xs" height="xs" />
                </div>
              </div>
            </td>
          )}
          {remainingCols.map((colIndex) => {
            // Vary widths for realistic placeholder look
            const widths = ['sm', 'xs', 'md', 'sm', 'xs'];
            const chosenWidth = widths[(rowIndex + colIndex) % widths.length] as 'xs' | 'sm' | 'md';
            return (
              <td key={`skel-col-${rowIndex}-${colIndex}`} className="bezent-table-cell">
                <Skeleton variant="text" width={chosenWidth} height="sm" />
              </td>
            );
          })}
        </tr>
      ))}
    </tbody>
  );
}
