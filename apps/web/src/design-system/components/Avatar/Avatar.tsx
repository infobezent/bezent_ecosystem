import { useState, type ReactNode } from 'react';
import { resolveAvatar } from '../../avatar';
import './Avatar.css';

export type AvatarColor = 'default' | 'blue' | 'pink' | 'purple' | 'amber' | 'green' | 'cyan';

export interface AvatarProps {
  /** 1-2 letter initials, shown when no `src` or `icon` is given. */
  initials?: string;
  /** Profile image URL. When provided, takes direct precedence over catalog `avatarId`. */
  src?: string;
  /** Stable catalog avatar ID from BEZENT Avatar Studio (e.g. 'human-classic-male', 'male'). */
  avatarId?: string | null;
  /** Optional icon node to render inside avatar. */
  icon?: ReactNode;
  /** Required alongside `src` or `avatarId` — describes the person, not "avatar". */
  alt?: string;
  /** Size scale: sm (28px), md (34px, default), lg (56px), xl (104px) */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Geometry: circle (default) or square (rounded corners) */
  shape?: 'circle' | 'square';
  /** Color palette for initials avatars */
  color?: AvatarColor;
  /** Additional CSS class name */
  className?: string;
  /** Optional callback fired when the image source fails to load. */
  onImageError?: () => void;
}

/**
 * The canonical BEZENT avatar component.
 *
 * Supports:
 * - Pre-rendered catalog avatars via `avatarId`
 * - Direct custom image URLs via `src`
 * - Fallback icons via `icon`
 * - High-contrast accessible initials via `initials` and `color`
 */
export function Avatar({
  initials,
  src,
  avatarId,
  icon,
  alt,
  size = 'md',
  shape = 'circle',
  color = 'default',
  className = '',
  onImageError,
}: AvatarProps) {
  const currentSourceKey = `${src ?? ''}:${avatarId ?? ''}`;
  const [prevSourceKey, setPrevSourceKey] = useState<string>(() => currentSourceKey);
  const [imgFailed, setImgFailed] = useState(false);

  // Reset image load failure state whenever image source props change
  if (currentSourceKey !== prevSourceKey) {
    setPrevSourceKey(currentSourceKey);
    setImgFailed(false);
  }

  // Source resolution: direct custom `src` takes highest precedence.
  // If no direct `src` is specified, resolve the catalog `avatarId`.
  const resolvedCatalog = !src && avatarId ? resolveAvatar(avatarId) : null;
  const effectiveSrc = src || (resolvedCatalog?.src ?? undefined);

  const sizeClass = size !== 'md' ? `bezent-avatar--${size}` : '';
  const shapeClass = shape !== 'circle' ? `bezent-avatar--${shape}` : '';
  const colorClass = color !== 'default' ? `bezent-avatar--${color}` : '';
  const classes = `bezent-avatar ${sizeClass} ${shapeClass} ${colorClass} ${className}`.trim();

  if (effectiveSrc && !imgFailed) {
    return (
      <span className={classes}>
        <img
          className="bezent-avatar__image"
          src={effectiveSrc}
          alt={alt ?? initials ?? ''}
          loading="lazy"
          onError={() => {
            setImgFailed(true);
            onImageError?.();
          }}
        />
      </span>
    );
  }

  if (icon) {
    return (
      <span className={classes} role="img" aria-label={alt ?? initials ?? 'Avatar'}>
        {icon}
      </span>
    );
  }

  return (
    <span className={classes} role="img" aria-label={alt ?? initials ?? 'Avatar'}>
      {initials}
    </span>
  );
}

export default Avatar;
