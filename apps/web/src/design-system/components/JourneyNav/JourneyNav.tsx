import { useRef, useEffect } from 'react';
import './JourneyNav.css';

export interface JourneyStep {
  id: string;
  stepNumber: string | number;
  label: string;
  shortLabel?: string;
  caption?: string;
  status?: 'completed' | 'active' | 'upcoming' | 'disabled';
  disabled?: boolean;
}

export interface JourneyNavProps {
  steps: JourneyStep[];
  activeId: string;
  onStepSelect?: (stepId: string) => void;
  className?: string;
  variant?: 'editorial' | 'compact';
  ariaLabel?: string;
}

/**
 * Domain-neutral JourneyNav primitive for multi-stage workflows,
 * registration journeys, onboarding pipelines, and editorial step sequences.
 */
export function JourneyNav({
  steps,
  activeId,
  onStepSelect,
  className,
  variant = 'editorial',
  ariaLabel = 'Registration Journey',
}: JourneyNavProps) {
  const activeStepRef = useRef<HTMLButtonElement | null>(null);
  const navListRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll active step into view on mobile / narrow viewports
  useEffect(() => {
    if (activeStepRef.current && navListRef.current) {
      const container = navListRef.current;
      const element = activeStepRef.current;
      const elementLeft = element.offsetLeft;
      const elementWidth = element.offsetWidth;
      const containerWidth = container.offsetWidth;
      const scrollLeft = container.scrollLeft;

      if (
        elementLeft < scrollLeft ||
        elementLeft + elementWidth > scrollLeft + containerWidth
      ) {
        container.scrollTo({
          left: elementLeft - containerWidth / 2 + elementWidth / 2,
          behavior: 'smooth',
        });
      }
    }
  }, [activeId]);

  const activeIndex = steps.findIndex((s) => s.id === activeId);

  return (
    <nav
      className={`bezent-journey-nav bezent-journey-nav--${variant} ${className || ''}`.trim()}
      aria-label={ariaLabel}
    >
      <div className="bezent-journey-nav__track-container">
        {/* Continuous journey guide track */}
        <div className="bezent-journey-nav__guide-track" aria-hidden="true" />

        <div
          ref={navListRef}
          role="tablist"
          aria-label={ariaLabel}
          className="bezent-journey-nav__list"
        >
          {steps.map((step, idx) => {
            const isActive = step.id === activeId;
            const isCompleted =
              step.status === 'completed' || (step.status === undefined && idx < activeIndex);
            const isUpcoming =
              step.status === 'upcoming' || (step.status === undefined && idx > activeIndex);
            const isDisabled = step.disabled || step.status === 'disabled';

            const formattedNumber =
              typeof step.stepNumber === 'number'
                ? String(step.stepNumber).padStart(2, '0')
                : step.stepNumber;

            return (
              <button
                key={step.id}
                ref={isActive ? activeStepRef : null}
                id={`journey-step-${step.id}`}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-controls={`panel-${step.id}`}
                disabled={isDisabled}
                tabIndex={isActive ? 0 : -1}
                className={`bezent-journey-step ${
                  isActive
                    ? 'is-active'
                    : isCompleted
                      ? 'is-completed'
                      : isUpcoming
                        ? 'is-upcoming'
                        : ''
                }`.trim()}
                onClick={() => {
                  if (!isDisabled && onStepSelect) {
                    onStepSelect(step.id);
                  }
                }}
              >
                {/* Step Connector Line Fragment */}
                <div className="bezent-journey-step__connector" aria-hidden="true" />

                {/* Number & Indicator Ring */}
                <div className="bezent-journey-step__indicator">
                  <span className="bezent-journey-step__number">{formattedNumber}</span>
                  {isActive && <span className="bezent-journey-step__pulse" aria-hidden="true" />}
                </div>

                {/* Step Label & Caption */}
                <div className="bezent-journey-step__meta">
                  <span className="bezent-journey-step__label">{step.label}</span>
                  {step.caption && (
                    <span className="bezent-journey-step__caption">{step.caption}</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

export default JourneyNav;
