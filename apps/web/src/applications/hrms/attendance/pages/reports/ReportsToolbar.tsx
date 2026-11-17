import React from 'react';
import { SearchInput, Toolbar, Inline } from '../../../../../design-system/components';

export interface ReportsToolbarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onClearSearch?: () => void;
  totalCount: number;
  filteredCount: number;
}

export function ReportsToolbar({
  searchQuery,
  onSearchChange,
  onClearSearch,
  totalCount,
  filteredCount,
}: ReportsToolbarProps) {
  const isFiltered = filteredCount !== totalCount;
  const countText = isFiltered
    ? `${filteredCount} of ${totalCount} Available Reports`
    : `${totalCount} Available Reports`;

  return (
    <div className="bezent-att-reports-toolbar">
      <Toolbar
        left={
          <div className="bezent-att-reports-search-box">
            <SearchInput
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              onClear={onClearSearch}
              placeholder="Search reports by name or category…"
              aria-label="Search reports by name or category"
              shape="rounded"
              size="md"
            />
          </div>
        }
        right={
          <Inline align="center" gap="sm">
            <span className="bezent-att-reports-count-pill" aria-live="polite" aria-atomic="true">
              {countText}
            </span>
          </Inline>
        }
      />
    </div>
  );
}
