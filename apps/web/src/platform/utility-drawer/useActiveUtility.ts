import { useCallback, useState } from 'react';
import type { UtilityCapabilityId } from './registry';

/**
 * The single source of truth for which global utility is open. Exactly one
 * (or none) at a time — selecting another replaces it, selecting the active
 * one closes it (old `handleDrawerToggle`, which also closed the
 * notification panel and vice versa). The rail button, the top-nav bell and
 * every drawer's close button all go through this one state.
 */
export function useActiveUtility() {
  const [activeId, setActiveId] = useState<UtilityCapabilityId | null>(null);

  const toggle = useCallback((id: UtilityCapabilityId) => {
    setActiveId((current) => (current === id ? null : id));
  }, []);

  const close = useCallback(() => setActiveId(null), []);

  return { activeId, toggle, close };
}
