import sleepingRaccoonImg from '../../../assets/sleeping_blue_raccoon.jpg';
import './EmptyStateIllustration.css';

export type EmptyStateIllustrationSize = 'default' | 'compact';

export interface EmptyStateIllustrationProps {
  size?: EmptyStateIllustrationSize;
  className?: string;
  isDark?: boolean;
}

/**
 * Sleeping Blue Raccoon Empty-State Illustration.
 *
 * Vector graphic illustration of a cozy sleeping blue raccoon with floating 'Z's.
 */
export function EmptyStateIllustration({
  size = 'default',
  className,
  isDark: isDarkProp,
}: EmptyStateIllustrationProps) {
  const isDark =
    isDarkProp ??
    (typeof document !== 'undefined' &&
      document.documentElement.getAttribute('data-theme') === 'dark');

  return (
    <div
      className={`bezent-empty-illustration-container bezent-empty-illustration-container--${size} ${isDark ? 'is-dark' : ''} ${className || ''}`.trim()}
      aria-hidden="true"
    >
      <div className="bezent-sleeping-raccoon-stage">
        <img
          src={sleepingRaccoonImg}
          alt=""
          className="bezent-sleeping-raccoon-img"
          draggable={false}
        />

        {/* Animated Floating Z Letters */}
        <div className="bezent-z-layer" aria-hidden="true">
          <div className="bezent-z-float bezent-z1">
            <svg viewBox="0 0 64 64" fill="none" className="bezent-z-svg">
              <defs>
                <linearGradient id="bezent-z-grad-1" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#67e8f9" />
                  <stop offset="45%" stopColor="#38bdf8" />
                  <stop offset="100%" stopColor="#0284c7" />
                </linearGradient>
              </defs>
              <path
                d="M 15 16 L 47 16 L 20 48 L 49 48"
                stroke="url(#bezent-z-grad-1)"
                strokeWidth="11"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M 17 16 L 43 16"
                stroke="#cffafe"
                strokeWidth="4"
                strokeLinecap="round"
                opacity="0.8"
              />
            </svg>
          </div>

          <div className="bezent-z-float bezent-z2">
            <svg viewBox="0 0 64 64" fill="none" className="bezent-z-svg">
              <defs>
                <linearGradient id="bezent-z-grad-2" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#67e8f9" />
                  <stop offset="45%" stopColor="#38bdf8" />
                  <stop offset="100%" stopColor="#0284c7" />
                </linearGradient>
              </defs>
              <path
                d="M 15 16 L 47 16 L 20 48 L 49 48"
                stroke="url(#bezent-z-grad-2)"
                strokeWidth="11"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M 17 16 L 43 16"
                stroke="#cffafe"
                strokeWidth="4"
                strokeLinecap="round"
                opacity="0.8"
              />
            </svg>
          </div>

          <div className="bezent-z-float bezent-z3">
            <svg viewBox="0 0 64 64" fill="none" className="bezent-z-svg">
              <defs>
                <linearGradient id="bezent-z-grad-3" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#67e8f9" />
                  <stop offset="45%" stopColor="#38bdf8" />
                  <stop offset="100%" stopColor="#0284c7" />
                </linearGradient>
              </defs>
              <path
                d="M 15 16 L 47 16 L 20 48 L 49 48"
                stroke="url(#bezent-z-grad-3)"
                strokeWidth="11"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M 17 16 L 43 16"
                stroke="#cffafe"
                strokeWidth="4"
                strokeLinecap="round"
                opacity="0.8"
              />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EmptyStateIllustration;
