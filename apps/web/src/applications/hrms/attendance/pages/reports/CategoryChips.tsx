import React from 'react';

export interface CategoryChipsProps {
  categories: string[];
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
}

export function CategoryChips({
  categories,
  selectedCategory,
  onSelectCategory,
}: CategoryChipsProps) {
  const allCategories = ['All', ...categories.filter((c) => c !== 'All')];

  return (
    <div className="bezent-att-category-chips" role="group" aria-label="Filter reports by category">
      {allCategories.map((cat) => {
        const isSelected =
          cat === 'All'
            ? selectedCategory === 'all' || selectedCategory === 'All'
            : selectedCategory.toLowerCase() === cat.toLowerCase();

        return (
          <button
            key={cat}
            type="button"
            className={`bezent-att-category-chip ${
              isSelected ? 'bezent-att-category-chip--active' : ''
            }`.trim()}
            onClick={() => onSelectCategory(cat === 'All' ? 'all' : cat)}
            aria-pressed={isSelected}
          >
            {cat}
          </button>
        );
      })}
    </div>
  );
}
