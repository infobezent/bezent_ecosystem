import { useState, useEffect, useMemo, useRef, type KeyboardEvent } from 'react';
import { Modal } from '../Modal';
import { Button } from '../Button';
import { BezentIcon } from '../../icons';
import { Avatar } from './Avatar';
import {
  getAvatarCatalog,
  getAvatarById,
  type AvatarMetadata,
  type AvatarCategory,
} from '../../avatar';
import './AvatarPicker.css';

export interface AvatarPickerProps {
  /** Controls dialog open/close state */
  isOpen: boolean;
  /** Callback fired when dialog is closed/cancelled */
  onClose: () => void;
  /** Currently selected avatar ID (canonical ID or alias) */
  selectedAvatarId?: string | null;
  /** Callback fired when user selects and confirms an avatar */
  onSelectAvatar: (avatarId: string) => void;
  /** Dialog title (default: "Choose an Avatar") */
  title?: string;
  /** Dialog subtitle/description */
  description?: string;
  /** Initial category filter ('all' | 'human' | 'ai' | 'neutral') */
  defaultCategory?: 'all' | AvatarCategory;
  /** Additional CSS class name */
  className?: string;
}

type FilterOption = 'all' | AvatarCategory;

/**
 * BEZENT AvatarPicker Component
 *
 * Provides a standardized, accessible modal dialog for browsing and selecting
 * verified avatar identities from the centralized BEZENT Avatar Catalog.
 *
 * Conforms to AGENTS.md Design System standards:
 * - Native keyboard navigation (Arrow keys, Home, End, Space, Enter)
 * - ARIA radiogroup / radio accessibility semantics
 * - Token-driven styling with zero application CSS
 * - Responds strictly to in-memory state and caller callbacks (zero persistence)
 */
export function AvatarPicker({
  isOpen,
  onClose,
  selectedAvatarId,
  onSelectAvatar,
  title = 'Choose an Avatar',
  description = 'Select a character or classic avatar to personalize your profile.',
  defaultCategory = 'all',
  className = '',
}: AvatarPickerProps) {
  // Normalize initial selection against catalog: unknown IDs resolve to empty string
  const initialResolved = selectedAvatarId ? (getAvatarById(selectedAvatarId)?.id ?? '') : '';
  const [selectedId, setSelectedId] = useState<string>(initialResolved);
  const [activeCategory, setActiveCategory] = useState<FilterOption>(defaultCategory);
  const optionRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const previousActiveElementRef = useRef<HTMLElement | null>(null);

  // Sync selection if selectedAvatarId changes externally while open
  useEffect(() => {
    const resolved = selectedAvatarId ? (getAvatarById(selectedAvatarId)?.id ?? '') : '';
    setSelectedId(resolved);
  }, [selectedAvatarId]);

  // Dynamic catalog retrieval
  const catalog = useMemo(() => getAvatarCatalog(), []);

  // Filtered catalog by selected category
  const filteredAvatars = useMemo(() => {
    if (activeCategory === 'all') return catalog;
    return catalog.filter((item) => item.category === activeCategory);
  }, [catalog, activeCategory]);

  // Categories present in catalog
  const availableCategories = useMemo<FilterOption[]>(() => {
    const cats = new Set<AvatarCategory>(catalog.map((item) => item.category));
    return ['all', ...Array.from(cats)];
  }, [catalog]);

  // Currently highlighted or selected metadata
  const selectedMeta = useMemo(() => {
    return selectedId ? getAvatarById(selectedId) : undefined;
  }, [selectedId]);

  // Focus management: initial focus on target avatar & focus restoration on close
  useEffect(() => {
    if (!isOpen) return;

    if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
      previousActiveElementRef.current = document.activeElement;
    }

    const focusTarget = () => {
      const targetId = selectedId || filteredAvatars[0]?.id;
      if (targetId) {
        optionRefs.current.get(targetId)?.focus();
      }
    };

    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(focusTarget);
    } else {
      focusTarget();
    }

    return () => {
      if (
        previousActiveElementRef.current &&
        typeof previousActiveElementRef.current.focus === 'function'
      ) {
        previousActiveElementRef.current.focus();
        previousActiveElementRef.current = null;
      }
    };
  }, [isOpen]);

  // Keyboard navigation within the options grid
  const handleKeyDown = (
    e: KeyboardEvent<HTMLButtonElement>,
    currentId: string,
    currentIndex: number,
  ) => {
    let nextIndex: number | null = null;
    const total = filteredAvatars.length;

    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        e.preventDefault();
        nextIndex = (currentIndex + 1) % total;
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        e.preventDefault();
        nextIndex = (currentIndex - 1 + total) % total;
        break;
      case 'Home':
        e.preventDefault();
        nextIndex = 0;
        break;
      case 'End':
        e.preventDefault();
        nextIndex = total - 1;
        break;
      case ' ':
      case 'Enter':
        e.preventDefault();
        setSelectedId(currentId);
        break;
      default:
        break;
    }

    if (nextIndex !== null) {
      const targetAvatar = filteredAvatars[nextIndex];
      if (targetAvatar) {
        setSelectedId(targetAvatar.id);
        optionRefs.current.get(targetAvatar.id)?.focus();
      }
    }
  };

  const handleConfirm = () => {
    if (selectedId) {
      onSelectAvatar(selectedId);
      onClose();
    }
  };

  const footer = (
    <div className="bezent-avatar-picker__footer">
      <div className="bezent-avatar-picker__selection-preview">
        {selectedMeta ? (
          <>
            <Avatar avatarId={selectedMeta.id} size="sm" alt={selectedMeta.label} />
            <span>
              Selected: <strong>{selectedMeta.label}</strong>
            </span>
          </>
        ) : (
          <span>No avatar selected</span>
        )}
      </div>

      <div className="bezent-avatar-picker__actions">
        <Button variant="secondary" size="md" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="primary" size="md" disabled={!selectedId} onClick={handleConfirm}>
          Select Avatar
        </Button>
      </div>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      description={description}
      size="lg"
      footer={footer}
      className={`bezent-avatar-picker-modal ${className}`.trim()}
    >
      <div className="bezent-avatar-picker">
        <div className="bezent-avatar-picker__toolbar">
          <div
            className="bezent-avatar-picker__filters"
            role="tablist"
            aria-label="Avatar categories"
          >
            {availableCategories.map((cat) => (
              <button
                key={cat}
                type="button"
                role="tab"
                aria-selected={activeCategory === cat}
                className={`bezent-avatar-picker__filter-btn ${
                  activeCategory === cat ? 'bezent-avatar-picker__filter-btn--active' : ''
                }`}
                onClick={() => setActiveCategory(cat)}
              >
                {cat === 'all'
                  ? 'All Avatars'
                  : cat === 'ai'
                    ? 'AI Identities'
                    : cat.charAt(0).toUpperCase() + cat.slice(1)}
              </button>
            ))}
          </div>

          <span className="bezent-avatar-picker__count">
            {filteredAvatars.length} {filteredAvatars.length === 1 ? 'avatar' : 'avatars'}
          </span>
        </div>

        {filteredAvatars.length === 0 ? (
          <div className="bezent-avatar-picker__empty" role="status">
            <BezentIcon name="search" size={28} color="currentColor" />
            <p>No avatars available in this category.</p>
          </div>
        ) : (
          <div
            className="bezent-avatar-picker__grid"
            role="radiogroup"
            aria-label="Available avatars"
          >
            {filteredAvatars.map((item, index) => {
              const isSelected = selectedId === item.id;
              return (
                <button
                  key={item.id}
                  ref={(el) => {
                    if (el) optionRefs.current.set(item.id, el);
                    else optionRefs.current.delete(item.id);
                  }}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  aria-label={`${item.label} (${item.category})`}
                  tabIndex={isSelected || (!selectedId && index === 0) ? 0 : -1}
                  className={`bezent-avatar-picker__option ${
                    isSelected ? 'bezent-avatar-picker__option--selected' : ''
                  }`}
                  onClick={() => setSelectedId(item.id)}
                  onKeyDown={(e) => handleKeyDown(e, item.id, index)}
                >
                  {isSelected && (
                    <span className="bezent-avatar-picker__check" aria-hidden="true">
                      ✓
                    </span>
                  )}
                  <Avatar avatarId={item.id} size="lg" alt={item.label} />
                  <span className="bezent-avatar-picker__label">{item.label}</span>
                  <span className="bezent-avatar-picker__category-badge">{item.category}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </Modal>
  );
}

export default AvatarPicker;
