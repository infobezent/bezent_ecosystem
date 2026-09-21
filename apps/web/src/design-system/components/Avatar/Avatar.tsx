import './Avatar.css';

export interface AvatarProps {
  /** 1-2 letter initials, shown when no `src` is given. */
  initials?: string;
  /** Profile image URL. */
  src?: string;
  /** Required alongside `src` — describes the person, not "avatar". */
  alt?: string;
}

/**
 * The canonical BEZENT avatar. Source: the old approved UI's profile
 * avatar (`App.tsx` lines 471-497) — a solid `--accent-pressed` circle,
 * 34px, with white initials. Only that one 34px size was ever evidenced,
 * so no `size` prop is exposed here — inventing a size scale from a
 * single data point isn't a faithful extraction (see
 * docs/architecture/DESIGN-SYSTEM-COMPONENTS.md). Image support is added
 * as a standard, structural avatar affordance (not a new visual design
 * decision) since a real profile photo is a near-certain requirement once
 * `platform`/HRMS build the real thing. No employee-specific data or
 * behavior lives here — this renders whatever it's given.
 */
export function Avatar({ initials, src, alt }: AvatarProps) {
  if (src) {
    return (
      <span className="bezent-avatar">
        <img className="bezent-avatar__image" src={src} alt={alt ?? initials ?? ''} />
      </span>
    );
  }

  return (
    <span className="bezent-avatar" role="img" aria-label={alt ?? initials ?? 'Avatar'}>
      {initials}
    </span>
  );
}

export default Avatar;
