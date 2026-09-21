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
      <img
        src={sleepingRaccoonImg}
        alt=""
        className="bezent-sleeping-raccoon-img"
        draggable={false}
      />
    </div>
  );
}

export default EmptyStateIllustration;
