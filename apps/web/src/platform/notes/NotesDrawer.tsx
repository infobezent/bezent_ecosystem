import { useState } from 'react';
import { BezentIcon, type BezentIconName } from '../../design-system/icons';
import { EmptyState } from '../../design-system/components';
import {
  UtilityDrawerFooter,
  UtilityDrawerHeader,
  UtilityFooterLink,
  UtilityIconAction,
} from '../utility-drawer';
import type { NoteDraft, NoteItem } from './types';
import './NotesDrawer.css';

export interface NotesDrawerProps {
  notes: NoteItem[];
  onClose: () => void;
  onViewAll?: () => void;
  /** `id` is null when creating a note. */
  onSave?: (id: string | null, draft: NoteDraft) => void;
  onDelete?: (id: string) => void;
  onTogglePin?: (id: string) => void;
}

/**
 * The global Notes drawer body: grouped list, quick create, in-drawer
 * editor. Source: old approved UI `NotesDrawer` / `NoteCard` / `NoteEditor`
 * (`App.tsx` 5297-5638). Excluded: "Convert to Task" (needs the task
 * creation form) and the full notes page.
 */
export function NotesDrawer({
  notes,
  onClose,
  onViewAll,
  onSave,
  onDelete,
  onTogglePin,
}: NotesDrawerProps) {
  const [editingId, setEditingId] = useState<string | 'new' | null>(null);

  if (editingId !== null) {
    const note = editingId === 'new' ? null : (notes.find((n) => n.id === editingId) ?? null);
    return (
      <NoteEditor
        note={note}
        onBack={() => setEditingId(null)}
        onSave={onSave}
        onDelete={onDelete}
      />
    );
  }

  const groups: { label: string; icon?: BezentIconName; items: NoteItem[] }[] = [
    { label: 'Pinned', icon: 'pin', items: notes.filter((n) => n.pinned) },
    { label: 'Today', items: notes.filter((n) => !n.pinned && n.recency === 'today') },
    { label: 'Earlier', items: notes.filter((n) => !n.pinned && n.recency === 'earlier') },
  ];

  return (
    <div className="notes-drawer">
      <UtilityDrawerHeader
        title="Notes"
        description="Quick personal notes"
        onClose={onClose}
        actions={
          <UtilityIconAction icon="plusSign" label="New Note" onClick={() => setEditingId('new')} />
        }
      />

      <div className="notes-drawer__list">
        {groups.map(
          (group) =>
            group.items.length > 0 && (
              <section key={group.label} className="notes-drawer__group">
                <h3 className="notes-drawer__group-label">
                  {group.icon && <BezentIcon name={group.icon} size={11} color="currentColor" />}
                  {group.label}
                </h3>
                <div className="notes-drawer__cards">
                  {group.items.map((note) => (
                    <NoteCard
                      key={note.id}
                      note={note}
                      onOpen={() => setEditingId(note.id)}
                      onTogglePin={() => onTogglePin?.(note.id)}
                      onDelete={() => onDelete?.(note.id)}
                    />
                  ))}
                </div>
              </section>
            ),
        )}
        {notes.length === 0 && (
          <EmptyState
            size="compact"
            title="No notes yet"
            description="Notes you create will appear here."
            primaryAction={{ label: 'New Note', onClick: () => setEditingId('new') }}
          />
        )}
      </div>

      <UtilityDrawerFooter>
        <UtilityFooterLink onClick={onViewAll}>View all notes →</UtilityFooterLink>
      </UtilityDrawerFooter>
    </div>
  );
}

function NoteCard({
  note,
  onOpen,
  onTogglePin,
  onDelete,
}: {
  note: NoteItem;
  onOpen: () => void;
  onTogglePin: () => void;
  onDelete: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="note-card" onMouseLeave={() => setMenuOpen(false)}>
      <button type="button" className="note-card__open" onClick={onOpen}>
        <span className="note-card__title">{note.title}</span>
        <span className="note-card__content">{note.content}</span>
        <span className="note-card__meta">
          <span className="note-card__updated">{note.updatedLabel}</span>
          {note.relatedTo && (
            <>
              <span className="note-card__dot" aria-hidden="true" />
              <span className="note-card__related">{note.relatedTo}</span>
            </>
          )}
        </span>
      </button>

      <div className="note-card__tools">
        {note.pinned && (
          <span className="note-card__pin" role="img" aria-label="Pinned">
            <BezentIcon name="pin" size={14} color="currentColor" active />
          </span>
        )}
        <button
          type="button"
          className="note-card__menu-button"
          aria-label={`Actions for ${note.title}`}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
        >
          <BezentIcon name="more" size={14} color="currentColor" />
        </button>
      </div>

      {menuOpen && (
        <div className="note-card__menu" role="menu">
          <button
            type="button"
            role="menuitem"
            className="note-card__menu-item"
            onClick={() => {
              onTogglePin();
              setMenuOpen(false);
            }}
          >
            <BezentIcon name="pin" size={14} color="currentColor" />
            {note.pinned ? 'Unpin' : 'Pin'}
          </button>
          <button
            type="button"
            role="menuitem"
            className="note-card__menu-item note-card__menu-item--danger"
            onClick={() => {
              onDelete();
              setMenuOpen(false);
            }}
          >
            <BezentIcon name="delete" size={14} color="currentColor" />
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

/** In-drawer editor. Leaving it (Back) saves, as in the old UI ("Auto-saved"). */
function NoteEditor({
  note,
  onBack,
  onSave,
  onDelete,
}: {
  note: NoteItem | null;
  onBack: () => void;
  onSave?: NotesDrawerProps['onSave'];
  onDelete?: NotesDrawerProps['onDelete'];
}) {
  const [title, setTitle] = useState(note?.title ?? '');
  const [content, setContent] = useState(note?.content ?? '');
  const [relatedTo, setRelatedTo] = useState(note?.relatedTo ?? '');

  function saveAndBack() {
    onSave?.(note?.id ?? null, {
      title: title || 'Untitled',
      content,
      relatedTo: relatedTo || undefined,
    });
    onBack();
  }

  return (
    <div className="notes-drawer note-editor">
      <div className="note-editor__top">
        <button type="button" className="note-editor__back" onClick={saveAndBack}>
          <BezentIcon name="arrowLeft" size={16} color="currentColor" />
          Back
        </button>
        <span className="note-editor__spacer" />
        <span className="note-editor__saved">Auto-saved</span>
        {note && (
          <UtilityIconAction
            icon="delete"
            label="Delete note"
            onClick={() => {
              onDelete?.(note.id);
              onBack();
            }}
          />
        )}
      </div>

      <div className="note-editor__body">
        <input
          className="note-editor__title"
          aria-label="Note title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Note title"
        />
        <textarea
          className="note-editor__content"
          aria-label="Note content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write a note..."
        />
        <div className="note-editor__related">
          <label className="note-editor__related-label" htmlFor="note-related">
            Related To
          </label>
          <input
            id="note-related"
            className="note-editor__related-input"
            value={relatedTo}
            onChange={(e) => setRelatedTo(e.target.value)}
            placeholder="A related record"
          />
        </div>
        <div className="note-editor__private">
          <BezentIcon name="security" size={13} color="currentColor" />
          Private to you
        </div>
      </div>
    </div>
  );
}
