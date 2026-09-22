import './Avatar.css';

export interface AvatarProps {
  /** 1-2 letter initials, shown when no `src` is given. */
  initials?: string;
  /** Profile image URL. */
  src?: string;
  /** Required alongside `src` — describes the person, not "avatar". */
  alt?: string;
  /** Size scale: sm (28px), md (34px, default), lg (56px) */
  size?: 'sm' | 'md' | 'lg';
  /** Additional CSS class name */
  className?: string;
}

/**
 * The canonical BEZENT avatar with light sky blue surface and deep navy initials.
 */
export function Avatar({ initials, src, alt, size = 'md', className = '' }: AvatarProps) {
  const sizeClass = size !== 'md' ? `bezent-avatar--${size}` : '';
  const classes = `bezent-avatar ${sizeClass} ${className}`.trim();

  if (src) {
    return (
      <span className={classes}>
        <img className="bezent-avatar__image" src={src} alt={alt ?? initials ?? ''} />
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
