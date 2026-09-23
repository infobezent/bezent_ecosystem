import sleepingRaccoonImg from '../../../assets/sleeping_blue_raccoon.png';
import './EmptyStateIllustration.css';

export type EmptyStateIllustrationSize = 'default' | 'compact';

export interface EmptyStateIllustrationProps {
  size?: EmptyStateIllustrationSize;
  className?: string;
  isDark?: boolean;
  /**
   * Optional custom image source URL.
   * Defaults to the canonical BEZENT sleeping raccoon transparent PNG.
   */
  imageSrc?: string;
  /**
   * Optional alt text for the illustration image.
   * Defaults to empty string (decorative illustration).
   */
  imageAlt?: string;
}

/**
 * Sleeping Blue Raccoon Empty-State Illustration.
 *
 * Vector graphic illustration of a cozy sleeping blue raccoon with
 * gentle floating starlight sparkles and subtle breathing motion.
 * Supports generic custom illustration image sources while preserving the
 * synchronized breathing animation and starlight atmosphere.
 */
export function EmptyStateIllustration({
  size = 'default',
  className,
  isDark: isDarkProp,
  imageSrc,
  imageAlt = '',
}: EmptyStateIllustrationProps) {
  const activeImage = imageSrc || sleepingRaccoonImg;
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
          src={activeImage}
          alt={imageAlt}
          className="bezent-sleeping-raccoon-img"
          draggable={false}
        />

        {/* Floating Dream Sparkles Layer */}
        <div className="bezent-sparkles-layer" aria-hidden="true">
          <svg className="bezent-sparkle-defs" width="0" height="0" aria-hidden="true">
            <defs>
              <linearGradient id="bezent-sparkle-cyan" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#bae6fd" />
                <stop offset="50%" stopColor="#38bdf8" />
                <stop offset="100%" stopColor="#0284c7" />
              </linearGradient>
              <linearGradient id="bezent-sparkle-gold" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#fef08a" />
                <stop offset="60%" stopColor="#fde047" />
                <stop offset="100%" stopColor="#eab308" />
              </linearGradient>
            </defs>
          </svg>

          {/* Star 1: Primary Cyan Twinkle Star */}
          <div className="bezent-sparkle-item bezent-sparkle-star-1">
            <svg viewBox="0 0 24 24" fill="none" className="bezent-sparkle-svg">
              <path
                d="M 12 2 Q 12 12 2 12 Q 12 12 12 22 Q 12 12 22 12 Q 12 12 12 2 Z"
                fill="url(#bezent-sparkle-cyan)"
              />
              <circle cx="12" cy="12" r="2.2" fill="#ffffff" opacity="0.9" />
            </svg>
          </div>

          {/* Star 2: Gentle Gold Starlight */}
          <div className="bezent-sparkle-item bezent-sparkle-star-2">
            <svg viewBox="0 0 24 24" fill="none" className="bezent-sparkle-svg">
              <path
                d="M 12 2 Q 12 12 2 12 Q 12 12 12 22 Q 12 12 22 12 Q 12 12 12 2 Z"
                fill="url(#bezent-sparkle-gold)"
              />
              <circle cx="12" cy="12" r="2" fill="#ffffff" opacity="0.95" />
            </svg>
          </div>

          {/* Star 3: Delicate Distant Star */}
          <div className="bezent-sparkle-item bezent-sparkle-star-3">
            <svg viewBox="0 0 24 24" fill="none" className="bezent-sparkle-svg">
              <path
                d="M 12 2 Q 12 12 2 12 Q 12 12 12 22 Q 12 12 22 12 Q 12 12 12 2 Z"
                fill="url(#bezent-sparkle-cyan)"
              />
              <circle cx="12" cy="12" r="1.8" fill="#ffffff" opacity="0.85" />
            </svg>
          </div>

          {/* Stardust Micro-Orb 1 */}
          <div className="bezent-sparkle-item bezent-stardust-1" />

          {/* Stardust Micro-Orb 2 */}
          <div className="bezent-sparkle-item bezent-stardust-2" />
        </div>
      </div>
    </div>
  );
}

export default EmptyStateIllustration;
