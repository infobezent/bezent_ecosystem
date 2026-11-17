import React from 'react';
import { EmptyState } from '../../../../../design-system/components';

export interface ReportEmptyStateProps {
  searchQuery?: string;
  selectedCategory?: string;
  onClearFilters: () => void;
}

export function ReportEmptyState({
  searchQuery,
  selectedCategory,
  onClearFilters,
}: ReportEmptyStateProps) {
  let description = 'Clear filters to see all available reports.';
  if (searchQuery && selectedCategory && selectedCategory !== 'all') {
    description = `No reports match '${searchQuery}' in category '${selectedCategory}'. Clear filters to see all reports.`;
  } else if (searchQuery) {
    description = `No reports match '${searchQuery}'. Clear filters to see all reports.`;
  } else if (selectedCategory && selectedCategory !== 'all') {
    description = `No reports found for category '${selectedCategory}'. Clear filters to see all reports.`;
  }

  return (
    <div className="bezent-att-reports-empty-state">
      <EmptyState
        title="No reports match your filters"
        description={description}
        primaryAction={{
          label: 'Clear filters',
          onClick: onClearFilters,
        }}
      />
    </div>
  );
}
