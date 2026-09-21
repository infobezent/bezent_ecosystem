import type {
  SearchProvider,
  SearchRequest,
  SearchResponse,
  SearchResultItem,
  SearchSuggestion,
} from '../../platform/search';

/**
 * DEVELOPMENT-ONLY search data used to verify the Global Search UI. It is
 * a fixture, not production knowledge: names are obviously fake, nothing
 * here describes real HRMS/CRM entities, and it must never be imported by
 * production code. The real provider is contributed by business
 * applications through the search contract in a later phase; delete this
 * file then.
 */
const DEV_RECORDS: SearchResultItem[] = [
  {
    id: 'dev-1',
    title: 'Sample Person One',
    subtitle: 'DEV-001 • Fixture • Sample Role',
    icon: 'employees',
    sourceKey: 'dashboard',
    sourceLabel: 'Dashboard',
    badge: { text: 'Active', tone: 'success' },
    metaRight: 'Location A',
  },
  {
    id: 'dev-2',
    title: 'Sample Person Two',
    subtitle: 'DEV-002 • Fixture • Sample Role',
    icon: 'employees',
    sourceKey: 'dashboard',
    sourceLabel: 'Dashboard',
    badge: { text: 'Pending', tone: 'accent' },
  },
  {
    id: 'dev-3',
    title: 'Sample Report Alpha',
    subtitle: 'Quarterly summary • Fixture',
    icon: 'reports',
    sourceKey: 'dashboard',
    sourceLabel: 'Dashboard',
  },
  {
    id: 'dev-4',
    title: 'Sample Unit Structure',
    subtitle: 'Organization chart • Fixture',
    icon: 'organization',
    sourceKey: 'organization',
    sourceLabel: 'Organization',
    metaRight: 'Updated today',
  },
  {
    id: 'dev-5',
    title: 'Sample Policy Document',
    subtitle: 'Document • Fixture',
    icon: 'documents',
    sourceKey: 'organization',
    sourceLabel: 'Organization',
    badge: { text: 'Draft' },
  },
  {
    id: 'dev-6',
    title: 'Sample Calendar Entry',
    subtitle: 'Event • Fixture',
    icon: 'calendar',
    sourceKey: 'leave',
    sourceLabel: 'Leave',
  },
];

function scoreOf(item: SearchResultItem, q: string, inContext: boolean): number {
  const title = item.title.toLowerCase();
  const subtitle = (item.subtitle ?? '').toLowerCase();
  const boost = inContext ? 2 : 1;
  if (title === q) return 1200 * boost;
  if (title.startsWith(q)) return 1000 * boost;
  if (title.includes(q)) return 800 * boost;
  if (subtitle.includes(q)) return 600 * boost;
  return 0;
}

function search({ query, contextKey, filterValue, limit }: SearchRequest): SearchResponse {
  const q = query.trim().toLowerCase();
  const filter = filterValue && filterValue !== 'all' ? filterValue.toLowerCase() : null;

  const ranked = DEV_RECORDS.filter((item) =>
    filter ? `${item.title} ${item.subtitle ?? ''}`.toLowerCase().includes(filter) : true,
  )
    .map((item) => ({ item, score: q ? scoreOf(item, q, item.sourceKey === contextKey) : 1 }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((r) => r.item);

  return {
    currentItems: ranked.filter((i) => i.sourceKey === contextKey),
    otherItems: ranked.filter((i) => i.sourceKey !== contextKey),
  };
}

const DEV_SUGGESTIONS: SearchSuggestion[] = [
  {
    id: 'dev-sug-1',
    label: 'Recently viewed samples',
    sourceKey: 'dashboard',
    sourceLabel: 'Dashboard',
    actionQuery: 'Sample',
  },
  {
    id: 'dev-sug-2',
    label: 'Sample reports',
    sourceKey: 'dashboard',
    sourceLabel: 'Dashboard',
    actionQuery: 'Report',
  },
  {
    id: 'dev-sug-3',
    label: 'Sample documents',
    sourceKey: 'organization',
    sourceLabel: 'Organization',
    actionQuery: 'Policy',
  },
  {
    id: 'dev-sug-4',
    label: 'Unit structure chart',
    sourceKey: 'organization',
    sourceLabel: 'Organization',
    actionQuery: 'Unit',
  },
  {
    id: 'dev-sug-5',
    label: 'Recent leave requests',
    sourceKey: 'leave',
    sourceLabel: 'Leave',
    actionQuery: 'Leave',
  },
];

export const DEV_SEARCH_PROVIDER: SearchProvider = {
  getFilters: () => [
    {
      id: 'kind',
      label: 'Kind',
      options: [
        { label: 'All Kinds', value: 'all' },
        { label: 'Person', value: 'Person' },
        { label: 'Report', value: 'Report' },
      ],
    },
    {
      id: 'status',
      label: 'Status',
      options: [
        { label: 'Any Status', value: 'all' },
        { label: 'Fixture', value: 'Fixture' },
      ],
    },
  ],
  getSuggestions: (contextKey?: string) => {
    if (contextKey) {
      const moduleMatches = DEV_SUGGESTIONS.filter((s) => s.sourceKey === contextKey);
      if (moduleMatches.length > 0) {
        return moduleMatches;
      }
    }
    // Cross-module fallback when current view has no module-specific suggestions
    return DEV_SUGGESTIONS.slice(0, 3);
  },
  search,
};
