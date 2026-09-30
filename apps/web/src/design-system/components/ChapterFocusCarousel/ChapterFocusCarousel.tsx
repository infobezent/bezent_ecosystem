import { useRef, useEffect, useCallback, type KeyboardEvent } from 'react';
import './ChapterFocusCarousel.css';

export interface ChapterFocusStep {
  id: string;
  stepNumber: string | number;
  label: string;
  title?: string;
  description?: string;
  disabled?: boolean;
}

export interface ChapterFocusCarouselProps {
  chapters: ChapterFocusStep[];
  activeId: string;
  onSelectChapter: (id: string) => void;
  kickerLabel?: string;
  className?: string;
  ariaLabel?: string;
}

/**
 * BEZENT ChapterFocusCarousel Component
 *
 * Distinctive horizontal focus-carousel chapter navigation.
 * The active chapter is the visual center of attention (scale: 1, opacity: 1, elevated surface),
 * while neighboring chapters smoothly scale down and quiet as they move away from the active center.
 */
export function ChapterFocusCarousel({
  chapters,
  activeId,
  onSelectChapter,
  kickerLabel,
  className = '',
  ariaLabel = 'Registration Chapters',
}: ChapterFocusCarouselProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const cardRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const activeIndex = Math.max(
    0,
    chapters.findIndex((c) => c.id === activeId),
  );

  const centerActiveCard = useCallback(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const activeCard = cardRefs.current[activeId];

    if (activeCard) {
      const containerRect = container.getBoundingClientRect();
      const cardRect = activeCard.getBoundingClientRect();

      // If content fits comfortably within container, keep natural center alignment
      if (container.scrollWidth <= container.clientWidth + 4) {
        container.scrollTo({ left: 0, behavior: 'smooth' });
        return;
      }

      if (containerRect.width > 0 && cardRect.width > 0) {
        const currentScrollLeft = container.scrollLeft;
        const cardCenter = cardRect.left + cardRect.width / 2;
        const containerCenter = containerRect.left + containerRect.width / 2;
        const targetScrollLeft = currentScrollLeft + (cardCenter - containerCenter);

        container.scrollTo({
          left: Math.max(0, targetScrollLeft),
          behavior: 'smooth',
        });
      }
    }
  }, [activeId]);

  useEffect(() => {
    centerActiveCard();
    const rafId = requestAnimationFrame(() => {
      centerActiveCard();
    });
    const timerId = setTimeout(() => {
      centerActiveCard();
    }, 120);

    const handleResize = () => {
      centerActiveCard();
    };

    window.addEventListener('resize', handleResize);
    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(timerId);
      window.removeEventListener('resize', handleResize);
    };
  }, [centerActiveCard]);

  const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>, currentIndex: number) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      const nextIndex = Math.min(chapters.length - 1, currentIndex + 1);
      const nextChapter = chapters[nextIndex];
      if (nextChapter && !nextChapter.disabled) {
        onSelectChapter(nextChapter.id);
        cardRefs.current[nextChapter.id]?.focus();
      }
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const prevIndex = Math.max(0, currentIndex - 1);
      const prevChapter = chapters[prevIndex];
      if (prevChapter && !prevChapter.disabled) {
        onSelectChapter(prevChapter.id);
        cardRefs.current[prevChapter.id]?.focus();
      }
    } else if (e.key === 'Home') {
      e.preventDefault();
      const firstChapter = chapters[0];
      if (firstChapter && !firstChapter.disabled) {
        onSelectChapter(firstChapter.id);
        cardRefs.current[firstChapter.id]?.focus();
      }
    } else if (e.key === 'End') {
      e.preventDefault();
      const lastChapter = chapters[chapters.length - 1];
      if (lastChapter && !lastChapter.disabled) {
        onSelectChapter(lastChapter.id);
        cardRefs.current[lastChapter.id]?.focus();
      }
    }
  };

  const handlePrev = () => {
    if (activeIndex > 0) {
      const prev = chapters[activeIndex - 1];
      if (prev && !prev.disabled) onSelectChapter(prev.id);
    }
  };

  const handleNext = () => {
    if (activeIndex < chapters.length - 1) {
      const next = chapters[activeIndex + 1];
      if (next && !next.disabled) onSelectChapter(next.id);
    }
  };

  return (
    <nav
      className={`bezent-focus-carousel ${className}`.trim()}
      aria-label={ariaLabel}
      role="region"
    >
      {/* Top Editorial Kicker & Indicator */}
      <div className="bezent-focus-carousel__header">
        {kickerLabel ? (
          <div className="bezent-focus-carousel__kicker">{kickerLabel}</div>
        ) : (
          <div />
        )}
        <div className="bezent-focus-carousel__controls">
          <button
            type="button"
            className="bezent-focus-carousel__nav-btn"
            onClick={handlePrev}
            disabled={activeIndex === 0}
            aria-label="Previous chapter"
          >
            ‹
          </button>
          <div className="bezent-focus-carousel__counter">
            <span className="bezent-focus-carousel__counter-current">
              {String(activeIndex + 1).padStart(2, '0')}
            </span>
            <span className="bezent-focus-carousel__counter-divider">/</span>
            <span className="bezent-focus-carousel__counter-total">
              {String(chapters.length).padStart(2, '0')}
            </span>
          </div>
          <button
            type="button"
            className="bezent-focus-carousel__nav-btn"
            onClick={handleNext}
            disabled={activeIndex === chapters.length - 1}
            aria-label="Next chapter"
          >
            ›
          </button>
        </div>
      </div>

      {/* Viewport & Carousel Track */}
      <div className="bezent-focus-carousel__viewport" ref={containerRef}>
        {/* Moving Track */}
        <div role="tablist" aria-label={ariaLabel} className="bezent-focus-carousel__track">
          {chapters.map((chapter, index) => {
            const isActive = chapter.id === activeId;
            const distance = Math.abs(index - activeIndex);
            const formattedNumber =
              typeof chapter.stepNumber === 'number'
                ? String(chapter.stepNumber).padStart(2, '0')
                : chapter.stepNumber;

            // Compute focus depth level: active = 0, neighbor = 1, secondary = 2, far = 3+
            const depthClass =
              distance === 0
                ? 'is-focus-active'
                : distance === 1
                  ? 'is-focus-neighbor'
                  : distance === 2
                    ? 'is-focus-secondary'
                    : 'is-focus-far';

            return (
              <button
                key={chapter.id}
                ref={(el) => {
                  cardRefs.current[chapter.id] = el;
                }}
                id={`focus-chapter-${chapter.id}`}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-controls={`panel-${chapter.id}`}
                disabled={chapter.disabled}
                tabIndex={isActive ? 0 : -1}
                className={`bezent-focus-card ${depthClass}`}
                data-distance={distance}
                onClick={() => {
                  if (!chapter.disabled) {
                    onSelectChapter(chapter.id);
                  }
                }}
                onKeyDown={(e) => handleKeyDown(e, index)}
              >
                {/* Refined Number Marker */}
                <span className="bezent-focus-card__number">{formattedNumber}</span>

                {/* Chapter Title / Label */}
                <span className="bezent-focus-card__label">{chapter.label}</span>

                {/* Active Focus Glow & Border Indicator */}
                {isActive && (
                  <span className="bezent-focus-card__active-indicator" aria-hidden="true" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

export default ChapterFocusCarousel;
