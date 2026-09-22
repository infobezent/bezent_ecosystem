import { useState, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { BezentIcon } from '../../design-system/icons';
import type { NoteDraft, NoteItem } from './types';
import './NotesPage.css';

interface FullNoteItem extends NoteItem {
  color?: string;
  tags?: string[];
}

interface OutletContextData {
  notes?: NoteItem[];
  saveNote?: (id: string | null, draft: NoteDraft) => void;
  deleteNote?: (id: string) => void;
  toggleNotePin?: (id: string) => void;
}

const COLOR_PALETTES = [
  { id: 'default', label: 'Default' },
  { id: 'blue', label: 'Blue' },
  { id: 'green', label: 'Green' },
  { id: 'yellow', label: 'Yellow' },
  { id: 'purple', label: 'Purple' },
  { id: 'pink', label: 'Pink' },
] as const;

export function NotesPage() {
  const outlet = useOutletContext<OutletContextData | undefined>();
  const initialNotes: FullNoteItem[] = (outlet?.notes as FullNoteItem[] | undefined) ?? [
    {
      id: 'note-1',
      title: 'Q4 Recruitment Strategy Alignment',
      content:
        'Focus on scaling core backend engineering team. Prioritize distributed systems architects and senior UI platform engineers.',
      updatedLabel: '10 min ago',
      recency: 'today',
      tags: ['Recruitment', 'Planning'],
      pinned: true,
      color: 'blue',
    },
    {
      id: 'note-2',
      title: 'Design System Icon Review',
      content:
        'Verified Google Material Symbols alignment across LeftSidebar, RightRail, TopNav, and Utility Drawers.',
      updatedLabel: '1 hr ago',
      recency: 'today',
      tags: ['Design System', 'UI'],
      pinned: true,
      color: 'purple',
    },
    {
      id: 'note-3',
      title: 'Onboarding Checklist Revision',
      content:
        'Automate hardware provisioning requests when candidate accepts official offer letter.',
      updatedLabel: 'Yesterday',
      recency: 'earlier',
      tags: ['HRMS', 'Onboarding'],
      pinned: false,
      color: 'yellow',
    },
    {
      id: 'note-4',
      title: 'Payroll Compliance Notes',
      content:
        'Ensure tax withholding schedules match latest statutory guidelines across tenant regions.',
      updatedLabel: '2 days ago',
      recency: 'earlier',
      tags: ['Payroll'],
      pinned: false,
      color: 'green',
    },
  ];

  const [notes, setNotes] = useState<FullNoteItem[]>(initialNotes);
  const [activeTab, setActiveTab] = useState<'notes' | 'reminders' | 'archive'>('notes');
  const [activeTag, setActiveTag] = useState<string | null>(null);

  // Take Note Expandable Box State
  const [isTakingNote, setIsTakingNote] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newBody, setNewBody] = useState('');
  const [newColor, setNewColor] = useState<string>('default');
  const [newPinned, setNewPinned] = useState(false);

  function handleCreateNote() {
    if (!newTitle.trim() && !newBody.trim()) {
      setIsTakingNote(false);
      return;
    }

    const created: FullNoteItem = {
      id: `custom-note-${Date.now()}`,
      title: newTitle.trim() || 'Untitled Note',
      content: newBody.trim(),
      updatedLabel: 'Just now',
      recency: 'today',
      tags: ['General'],
      pinned: newPinned,
      color: newColor,
    };

    if (outlet?.saveNote) {
      outlet.saveNote(null, {
        title: created.title,
        content: created.content,
        relatedTo: created.relatedTo,
      });
    }

    setNotes((prev) => [created, ...prev]);
    setNewTitle('');
    setNewBody('');
    setNewColor('default');
    setNewPinned(false);
    setIsTakingNote(false);
  }

  function handleTogglePin(id: string) {
    if (outlet?.toggleNotePin) {
      outlet.toggleNotePin(id);
    }
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, pinned: !n.pinned } : n)));
  }

  function handleDeleteNote(id: string) {
    if (outlet?.deleteNote) {
      outlet.deleteNote(id);
    }
    setNotes((prev) => prev.filter((n) => n.id !== id));
  }

  const allTags = useMemo(() => {
    const tagsSet = new Set<string>();
    notes.forEach((n) => n.tags?.forEach((t) => tagsSet.add(t)));
    return Array.from(tagsSet);
  }, [notes]);

  const filteredNotes = useMemo(() => {
    let result = notes;
    if (activeTag) {
      result = result.filter((n) => n.tags?.includes(activeTag));
    }
    return result;
  }, [notes, activeTag]);

  const pinnedNotes = filteredNotes.filter((n) => n.pinned);
  const otherNotes = filteredNotes.filter((n) => !n.pinned);

  return (
    <div className="notes-page">
      {/* ── Main Layout (Sidebar + Content Canvas) ────────────────────── */}
      <div className="notes-page__body">
        {/* Left Sidebar */}
        <aside className="notes-page__sidebar">
          <nav className="notes-page__nav">
            <button
              type="button"
              className={`notes-page__nav-item ${activeTab === 'notes' && !activeTag ? 'is-active' : ''}`.trim()}
              onClick={() => {
                setActiveTab('notes');
                setActiveTag(null);
              }}
            >
              <BezentIcon name="notes" size={18} color="currentColor" />
              <span>Notes</span>
            </button>

            <button
              type="button"
              className={`notes-page__nav-item ${activeTab === 'reminders' ? 'is-active' : ''}`.trim()}
              onClick={() => {
                setActiveTab('reminders');
                setActiveTag(null);
              }}
            >
              <BezentIcon name="clock" size={18} color="currentColor" />
              <span>Reminders</span>
            </button>

            <div className="notes-page__nav-divider" />

            <div className="notes-page__nav-title">Labels</div>
            {allTags.map((tag) => (
              <button
                key={tag}
                type="button"
                className={`notes-page__nav-item ${activeTag === tag ? 'is-active' : ''}`.trim()}
                onClick={() => setActiveTag(tag)}
              >
                <BezentIcon name="documents" size={16} color="currentColor" />
                <span>{tag}</span>
              </button>
            ))}
          </nav>
        </aside>

        {/* Notes Canvas */}
        <main className="notes-page__content">
          <div className="notes-container">
            {/* Take a Note Box */}
            <div className="notes-take-box">
              {isTakingNote ? (
                <div className="notes-take-box__expanded">
                  <div className="notes-take-box__top-row">
                    <input
                      type="text"
                      placeholder="Title"
                      className="notes-take-box__title-input"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      autoFocus
                    />
                    <button
                      type="button"
                      className={`notes-take-box__pin-btn ${newPinned ? 'is-pinned' : ''}`.trim()}
                      aria-label="Pin note"
                      onClick={() => setNewPinned((v) => !v)}
                    >
                      <BezentIcon name="pin" size={18} color="currentColor" active={newPinned} />
                    </button>
                  </div>

                  <textarea
                    placeholder="Take a note..."
                    className="notes-take-box__body-input"
                    rows={3}
                    value={newBody}
                    onChange={(e) => setNewBody(e.target.value)}
                  />

                  <div className="notes-take-box__footer">
                    <div className="notes-take-box__colors">
                      {COLOR_PALETTES.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          className={`notes-take-box__color-dot notes-take-box__color-dot--${c.id} ${newColor === c.id ? 'is-active' : ''}`.trim()}
                          aria-label={`Color: ${c.label}`}
                          onClick={() => setNewColor(c.id)}
                        />
                      ))}
                    </div>

                    <button
                      type="button"
                      className="notes-take-box__close-btn"
                      onClick={handleCreateNote}
                    >
                      Done
                    </button>
                  </div>
                </div>
              ) : (
                <div className="notes-take-box__collapsed" onClick={() => setIsTakingNote(true)}>
                  <span>Take a note...</span>
                  <div className="notes-take-box__actions">
                    <button
                      type="button"
                      className="notes-take-box__action-btn"
                      aria-label="New checklist"
                    >
                      <BezentIcon name="check" size={18} color="currentColor" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Pinned Section */}
            {pinnedNotes.length > 0 && (
              <div className="notes-section">
                <div className="notes-section__title">PINNED</div>
                <div className="notes-grid">
                  {pinnedNotes.map((note) => (
                    <NoteCard
                      key={note.id}
                      note={note}
                      onTogglePin={() => handleTogglePin(note.id)}
                      onDelete={() => handleDeleteNote(note.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Other Notes Section */}
            {otherNotes.length > 0 && (
              <div className="notes-section">
                {pinnedNotes.length > 0 && <div className="notes-section__title">OTHERS</div>}
                <div className="notes-grid">
                  {otherNotes.map((note) => (
                    <NoteCard
                      key={note.id}
                      note={note}
                      onTogglePin={() => handleTogglePin(note.id)}
                      onDelete={() => handleDeleteNote(note.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {filteredNotes.length === 0 && !isTakingNote && (
              <div className="notes-empty">
                <span className="notes-empty__icon">
                  <BezentIcon name="notes" size={36} color="#1a73e8" active />
                </span>
                <h3 className="notes-empty__title">No notes here yet</h3>
                <p className="notes-empty__desc">
                  Capture thoughts, meeting records, and quick memos with BEZENT Notes.
                </p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

function NoteCard({
  note,
  onTogglePin,
  onDelete,
}: {
  note: FullNoteItem;
  onTogglePin: () => void;
  onDelete: () => void;
}) {
  return (
    <div className={`note-card note-card--${note.color ?? 'default'}`}>
      <div className="note-card__header">
        <h4 className="note-card__title">{note.title}</h4>
        <button
          type="button"
          className={`note-card__pin-btn ${note.pinned ? 'is-pinned' : ''}`.trim()}
          aria-label={note.pinned ? 'Unpin note' : 'Pin note'}
          onClick={onTogglePin}
        >
          <BezentIcon name="pin" size={16} color="currentColor" active={note.pinned} />
        </button>
      </div>

      <p className="note-card__body">{note.content}</p>

      {note.tags && note.tags.length > 0 && (
        <div className="note-card__tags">
          {note.tags.map((t) => (
            <span key={t} className="note-card__tag">
              {t}
            </span>
          ))}
        </div>
      )}

      <div className="note-card__footer">
        <span className="note-card__updated">{note.updatedLabel}</span>
        <button
          type="button"
          className="note-card__del-btn"
          aria-label="Delete note"
          onClick={onDelete}
        >
          <BezentIcon name="delete" size={15} color="currentColor" />
        </button>
      </div>
    </div>
  );
}

export default NotesPage;
