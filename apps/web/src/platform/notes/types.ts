/**
 * Presentation contract for the global personal Notes utility (the rail's
 * "Notes" button opens this drawer). Persistence is
 * a future concern of whoever supplies and stores the notes.
 */
export interface NoteItem {
  id: string;
  title: string;
  content: string;
  /** Display text, e.g. "Today • 10:45 AM", "Yesterday". */
  updatedLabel: string;
  /** Drives the Today / Earlier grouping. */
  recency: 'today' | 'earlier';
  pinned: boolean;
  relatedTo?: string;
}

export interface NoteDraft {
  title: string;
  content: string;
  relatedTo?: string;
}
