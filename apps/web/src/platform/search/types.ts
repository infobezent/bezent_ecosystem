import type { BezentIconName } from '../../design-system/icons';

/**
 * Global Search contract. Deliberately small: only fields the approved
 * search UI actually renders. Business applications (HRMS today; CRM/PM
 * later) contribute results by supplying a `SearchProvider`; Global Search
 * never imports application internals. See
 * docs/architecture/GLOBAL-SEARCH.md.
 */

export type SearchBadgeTone = 'neutral' | 'success' | 'accent';

export interface SearchResultItem {
  id: string;
  title: string;
  subtitle?: string;
  icon?: BezentIconName;
  /** Which application/module contributed the result (compared with the search context key). */
  sourceKey: string;
  /** Tag shown at the right of the row, e.g. the contributing module's name. */
  sourceLabel: string;
  badge?: { text: string; tone?: SearchBadgeTone };
  metaRight?: string;
  /**
   * Opaque navigation hints, interpreted only by the `onSelectResult`
   * callback. Global Search never resolves routes itself.
   */
  targetRoute?: string;
  childId?: string;
}

export interface SearchSuggestion {
  id: string;
  label: string;
  sourceKey?: string;
  sourceLabel?: string;
  /** Query executed when the suggestion is chosen (defaults to `label`). */
  actionQuery?: string;
}

export interface FilterChipOption {
  label: string;
  value: string;
}

export interface FilterChipConfig {
  id: string;
  label: string;
  options: FilterChipOption[];
}

export interface SearchRequest {
  query: string;
  contextKey?: string;
  filterKey: string | null;
  filterValue: string | null;
  limit: number;
}

export interface SearchResponse {
  /** Results from the current context (e.g. the module being viewed). */
  currentItems: SearchResultItem[];
  /** Results from everywhere else. */
  otherItems: SearchResultItem[];
}

/** The data source Global Search renders. Synchronous, like the approved UI. */
export interface SearchProvider {
  getFilters: (contextKey?: string) => FilterChipConfig[];
  getSuggestions: (contextKey?: string) => SearchSuggestion[];
  search: (request: SearchRequest) => SearchResponse;
}
