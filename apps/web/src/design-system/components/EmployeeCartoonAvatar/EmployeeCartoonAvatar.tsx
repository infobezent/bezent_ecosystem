import React, { useState } from 'react';
import './EmployeeCartoonAvatar.css';

export type CartoonAvatarVariant = 'male' | 'female' | 'neutral';

export interface EmployeeCartoonAvatarProps {
  /** Explicit avatar variant. Overrides gender/preference resolution if provided. */
  avatarVariant?: CartoonAvatarVariant;
  /** Size scale: sm (32px), md (48px), lg (80px), xl (104px), hero (120px, default), or 128 (128px) */
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'hero' | '128';
  /** Employee custom uploaded profile picture if available */
  src?: string | null;
  /** Employee full or first name used for accessibility alt/aria-label */
  employeeName?: string;
  /** Employee profile gender from authorized database record (used when no explicit preference) */
  gender?: string | null;
  /** Optional explicit employee avatar preference setting */
  avatarPreference?: string | null;
  /** Optional click handler for avatar customization or inspection */
  onClick?: () => void;
  /** Additional CSS class name */
  className?: string;
}

/**
 * Resolves the cartoon avatar variant according to official BEZENT priority:
 * 1. Explicit employee avatar preference, if supported.
 * 2. Employee profile gender, only when permitted by product rules.
 * 3. Neutral default avatar.
 *
 * (Never infers gender from employee names, pronouns, or photos).
 */
export function resolveCartoonAvatarVariant(
  preference?: string | null,
  gender?: string | null,
): CartoonAvatarVariant {
  if (preference) {
    const p = preference.trim().toLowerCase();
    if (p === 'male' || p === 'm') return 'male';
    if (p === 'female' || p === 'f') return 'female';
    if (p === 'neutral' || p === 'n') return 'neutral';
  }

  if (gender) {
    const g = gender.trim().toLowerCase();
    if (g === 'male' || g === 'm') return 'male';
    if (g === 'female' || g === 'f') return 'female';
  }

  return 'neutral';
}

function MaleCartoonSvg({ title }: { title: string }) {
  return (
    <svg
      className="bezent-cartoon-avatar__svg"
      viewBox="0 0 128 128"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={title}
    >
      <title>{title}</title>
      <defs>
        <radialGradient id="male-bg-rad" cx="42%" cy="36%" r="68%">
          <stop offset="0%" stopColor="#EBF4FE" />
          <stop offset="70%" stopColor="#D4E7FD" />
          <stop offset="100%" stopColor="#C7E0FC" />
        </radialGradient>
        <clipPath id="male-avatar-clip">
          <circle cx="64" cy="64" r="64" />
        </clipPath>
      </defs>

      {/* Pastel Circular Background */}
      <circle cx="64" cy="64" r="64" fill="url(#male-bg-rad)" />

      {/* Inner Character Elements - Clipped cleanly to circle */}
      <g clipPath="url(#male-avatar-clip)">
        {/* Back Hair */}
        <path d="M32 54 C30 42 36 32 46 26 L30 48 C29 55 31 65 35 68 Z" fill="#241B16" />
        <path d="M96 54 C98 42 92 32 82 26 L98 48 C99 55 97 65 93 68 Z" fill="#241B16" />

        {/* Neck */}
        <rect x="52" y="74" width="24" height="20" rx="3" fill="#FBD8BA" />
        {/* Neck Chin Shadow */}
        <path
          d="M52 74 C58 84 70 84 76 74 L76 79 C70 89 58 89 52 79 Z"
          fill="#ECAE82"
          opacity="0.7"
        />

        {/* Torso & Collared Blue Shirt */}
        <path
          d="M10 128 C12 105 32 93 48 90 L56 93 L64 98 L72 93 L80 90 C96 93 116 105 118 128 Z"
          fill="#316AB8"
        />
        {/* White Inner Undershirt at Neck Opening */}
        <path d="M57 91 L64 105 L71 91 Z" fill="#FFFFFF" />
        <path d="M60 91 L64 100 L68 91 Z" fill="#E2EDF9" />

        {/* Left Shirt Collar Flap */}
        <path
          d="M45 89 L63 103 L55 92 Z"
          fill="#3E7BCE"
          stroke="#204F90"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
        {/* Right Shirt Collar Flap */}
        <path
          d="M83 89 L65 103 L73 92 Z"
          fill="#3E7BCE"
          stroke="#204F90"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
        {/* Placket Seam & Button */}
        <line x1="64" y1="105" x2="64" y2="128" stroke="#204F90" strokeWidth="1.4" />
        <circle cx="64" cy="116" r="1.4" fill="#FFFFFF" opacity="0.85" />

        {/* Ears */}
        {/* Left Ear */}
        <path d="M35 56 C29 56 28 67 36 69 Z" fill="#FBD8BA" />
        <path
          d="M34 59 C32 61 32 65 35 66"
          stroke="#DF9B6E"
          strokeWidth="1.2"
          strokeLinecap="round"
          fill="none"
        />
        {/* Right Ear */}
        <path d="M93 56 C99 56 100 67 92 69 Z" fill="#FBD8BA" />
        <path
          d="M94 59 C96 61 96 65 93 66"
          stroke="#DF9B6E"
          strokeWidth="1.2"
          strokeLinecap="round"
          fill="none"
        />

        {/* Face Base */}
        <path
          d="M35 52 C35 34 46 28 64 28 C82 28 93 34 93 52 C93 69 82 82 64 82 C46 82 35 69 35 52 Z"
          fill="#FCD8BA"
        />

        {/* Main Hair Volume (Modern side-parted with front bangs) */}
        <path
          d="M33 46 C32 26 46 19 64 19 C82 19 96 26 95 46 C95 49 94 54 94 54 C91 43 86 38 78 36 C70 34 58 35 48 40 C42 43 38 48 34 54 Z"
          fill="#241B16"
        />
        {/* Front Hair Bangs sweeping across forehead */}
        <path
          d="M34 48 C42 36 62 34 78 37 C84 38 90 41 94 48 C91 44 84 41 77 41 C67 41 55 45 44 52 C40 54 36 52 34 48 Z"
          fill="#2E221C"
        />
        {/* Sideburns */}
        <path d="M34 48 L35 57 L38 52 Z" fill="#241B16" />
        <path d="M94 48 L93 57 L90 52 Z" fill="#241B16" />
        {/* Hair Sheen */}
        <path
          d="M52 23 C62 22 74 24 82 28"
          stroke="#4D3B31"
          strokeWidth="1.8"
          strokeLinecap="round"
          fill="none"
        />

        {/* Eyebrows */}
        <path
          d="M43 51 C48 48 54 48 58 51"
          stroke="#241B16"
          strokeWidth="2.2"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M70 51 C74 48 80 48 85 51"
          stroke="#241B16"
          strokeWidth="2.2"
          strokeLinecap="round"
          fill="none"
        />

        {/* Eyes */}
        {/* Left Eye */}
        <ellipse cx="50.5" cy="59" rx="4.5" ry="5" fill="#241B16" />
        <circle cx="52" cy="57.5" r="1.6" fill="#FFFFFF" />
        <circle cx="49" cy="61" r="0.8" fill="#FFFFFF" opacity="0.75" />
        {/* Right Eye */}
        <ellipse cx="77.5" cy="59" rx="4.5" ry="5" fill="#241B16" />
        <circle cx="79" cy="57.5" r="1.6" fill="#FFFFFF" />
        <circle cx="76" cy="61" r="0.8" fill="#FFFFFF" opacity="0.75" />

        {/* Cheeks Soft Blush */}
        <ellipse cx="42" cy="65" rx="5.5" ry="3.5" fill="#F8A799" opacity="0.45" />
        <ellipse cx="86" cy="65" rx="5.5" ry="3.5" fill="#F8A799" opacity="0.45" />

        {/* Nose */}
        <path
          d="M63 64 Q64.5 68 66 67.5"
          stroke="#DF9B6E"
          strokeWidth="1.8"
          strokeLinecap="round"
          fill="none"
        />

        {/* Warm Smiling Mouth */}
        <path d="M56 71 Q64 79 72 71 Q64 75 56 71 Z" fill="#CF4E4E" />
        <path
          d="M58 71.5 Q64 74 70 71.5"
          stroke="#FFFFFF"
          strokeWidth="1.5"
          strokeLinecap="round"
          fill="none"
        />
        {/* Smile Dimples */}
        <path
          d="M54.5 70.5 Q55 72 56 71.5"
          stroke="#DF9B6E"
          strokeWidth="1"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M73.5 71.5 Q74.5 72 75 70.5"
          stroke="#DF9B6E"
          strokeWidth="1"
          strokeLinecap="round"
          fill="none"
        />
      </g>
    </svg>
  );
}

function FemaleCartoonSvg({ title }: { title: string }) {
  return (
    <svg
      className="bezent-cartoon-avatar__svg"
      viewBox="0 0 128 128"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={title}
    >
      <title>{title}</title>
      <defs>
        <radialGradient id="female-bg-rad" cx="42%" cy="36%" r="68%">
          <stop offset="0%" stopColor="#FDECEF" />
          <stop offset="70%" stopColor="#FBD7DE" />
          <stop offset="100%" stopColor="#F8C4CF" />
        </radialGradient>
        <clipPath id="female-avatar-clip">
          <circle cx="64" cy="64" r="64" />
        </clipPath>
      </defs>

      {/* Soft Rose Pastel Circular Background */}
      <circle cx="64" cy="64" r="64" fill="url(#female-bg-rad)" />

      {/* Inner Character Elements - Clipped cleanly to circle */}
      <g clipPath="url(#female-avatar-clip)">
        {/* Back Shoulder-Length Flowing Hair */}
        <path
          d="M28 52 C24 70 24 95 36 114 C38 102 39 85 39 78 C37 68 33 58 28 52 Z"
          fill="#201713"
        />
        <path
          d="M100 52 C104 70 104 95 92 114 C90 102 89 85 89 78 C91 68 95 58 100 52 Z"
          fill="#201713"
        />

        {/* Neck */}
        <rect x="53" y="74" width="22" height="20" rx="3" fill="#FDE1C8" />
        {/* Neck Chin Shadow */}
        <path
          d="M53 74 C59 84 69 84 75 74 L75 79 C69 89 59 89 53 79 Z"
          fill="#ECAE85"
          opacity="0.65"
        />

        {/* Inner White Blouse Collar */}
        <path d="M50 90 L64 108 L78 90 Z" fill="#FFFFFF" />
        <path d="M54 90 L64 103 L74 90 Z" fill="#F3F4F6" />

        {/* Corporate Berry-Rose Blazer */}
        <path
          d="M10 128 C12 105 32 93 48 90 L58 106 L64 116 L70 106 L80 90 C96 93 116 105 118 128 Z"
          fill="#B73859"
        />
        {/* Left Lapel */}
        <path
          d="M45 89 L59 108 L52 91 Z"
          fill="#CA4467"
          stroke="#922542"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
        {/* Right Lapel */}
        <path
          d="M83 89 L69 108 L76 91 Z"
          fill="#CA4467"
          stroke="#922542"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
        {/* Center Seam */}
        <line x1="64" y1="116" x2="64" y2="128" stroke="#922542" strokeWidth="1.4" />

        {/* Ears */}
        {/* Left Ear */}
        <path d="M35 58 C30 58 29 68 36 70 Z" fill="#FDE1C8" />
        <circle cx="35" cy="69" r="1.8" fill="#FFFFFF" />
        {/* Right Ear */}
        <path d="M93 58 C98 58 99 68 92 70 Z" fill="#FDE1C8" />
        <circle cx="93" cy="69" r="1.8" fill="#FFFFFF" />

        {/* Face Base */}
        <path
          d="M36 52 C36 34 47 28 64 28 C81 28 92 34 92 52 C92 68 81 81 64 81 C47 81 36 68 36 52 Z"
          fill="#FDE1C8"
        />

        {/* Front Hair Volume */}
        <path
          d="M32 46 C32 26 46 19 64 19 C82 19 96 26 96 46 C96 52 94 62 93 68 C90 56 87 46 80 43 C70 39 58 39 48 43 C41 46 38 56 35 68 C34 62 32 52 32 46 Z"
          fill="#201713"
        />
        {/* Parted Bangs framing temples */}
        <path d="M36 46 C44 38 56 39 63 43 C54 44 44 48 39 56 Z" fill="#291E19" />
        <path d="M92 46 C84 38 72 39 65 43 C74 44 84 48 89 56 Z" fill="#291E19" />
        {/* Hair Sheen */}
        <path
          d="M50 23 C60 22 72 23 78 27"
          stroke="#4A3830"
          strokeWidth="1.8"
          strokeLinecap="round"
          fill="none"
        />

        {/* Eyebrows */}
        <path
          d="M44 51 C48 48 54 48 58 51"
          stroke="#201713"
          strokeWidth="1.8"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M70 51 C74 48 80 48 84 51"
          stroke="#201713"
          strokeWidth="1.8"
          strokeLinecap="round"
          fill="none"
        />

        {/* Expressive Smiling Eyes with Lashes */}
        {/* Left Eye */}
        <path d="M44 57.5 L46 56" stroke="#201713" strokeWidth="1.2" strokeLinecap="round" />
        <ellipse cx="50.5" cy="59.5" rx="4.5" ry="5" fill="#201713" />
        <circle cx="52" cy="58" r="1.6" fill="#FFFFFF" />
        <circle cx="49" cy="61.5" r="0.8" fill="#FFFFFF" opacity="0.75" />

        {/* Right Eye */}
        <path d="M84 57.5 L82 56" stroke="#201713" strokeWidth="1.2" strokeLinecap="round" />
        <ellipse cx="77.5" cy="59.5" rx="4.5" ry="5" fill="#201713" />
        <circle cx="79" cy="58" r="1.6" fill="#FFFFFF" />
        <circle cx="76" cy="61.5" r="0.8" fill="#FFFFFF" opacity="0.75" />

        {/* Rosy Cheeks */}
        <ellipse cx="43" cy="65" rx="5.5" ry="3.5" fill="#F89CA7" opacity="0.5" />
        <ellipse cx="85" cy="65" rx="5.5" ry="3.5" fill="#F89CA7" opacity="0.5" />

        {/* Nose */}
        <path
          d="M63 64 Q64.5 68 66 67.5"
          stroke="#E19D70"
          strokeWidth="1.6"
          strokeLinecap="round"
          fill="none"
        />

        {/* Warm Smiling Lips */}
        <path d="M56 71.5 Q64 79 72 71.5 Q64 75 56 71.5 Z" fill="#D3455E" />
        <path
          d="M58 72 Q64 74.5 70 72"
          stroke="#FFFFFF"
          strokeWidth="1.4"
          strokeLinecap="round"
          fill="none"
        />
      </g>
    </svg>
  );
}

function NeutralCartoonSvg({ title }: { title: string }) {
  return (
    <svg
      className="bezent-cartoon-avatar__svg"
      viewBox="0 0 128 128"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={title}
    >
      <title>{title}</title>
      <defs>
        <radialGradient id="neutral-bg-rad" cx="42%" cy="36%" r="68%">
          <stop offset="0%" stopColor="#E2F6F0" />
          <stop offset="70%" stopColor="#C9EFE4" />
          <stop offset="100%" stopColor="#B3E6D8" />
        </radialGradient>
        <clipPath id="neutral-avatar-clip">
          <circle cx="64" cy="64" r="64" />
        </clipPath>
      </defs>

      {/* Pastel Soft Mint Circular Background */}
      <circle cx="64" cy="64" r="64" fill="url(#neutral-bg-rad)" />

      {/* Inner Character Elements - Clipped cleanly to circle */}
      <g clipPath="url(#neutral-avatar-clip)">
        {/* Neck */}
        <rect x="52" y="74" width="24" height="20" rx="3" fill="#FCD8BA" />
        {/* Neck Chin Shadow */}
        <path
          d="M52 74 C58 84 70 84 76 74 L76 79 C70 89 58 89 52 79 Z"
          fill="#ECAE82"
          opacity="0.7"
        />

        {/* Torso & Collared Teal-Emerald Office Shirt */}
        <path
          d="M10 128 C12 105 32 93 48 90 L56 93 L64 98 L72 93 L80 90 C96 93 116 105 118 128 Z"
          fill="#20756B"
        />
        {/* Inner Light Collar */}
        <path d="M57 91 L64 105 L71 91 Z" fill="#F8FAFC" />
        <path d="M60 91 L64 100 L68 91 Z" fill="#E2E8F0" />

        {/* Left Teal Collar Flap */}
        <path
          d="M45 89 L63 103 L55 92 Z"
          fill="#2C8B80"
          stroke="#165A52"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
        {/* Right Teal Collar Flap */}
        <path
          d="M83 89 L65 103 L73 92 Z"
          fill="#2C8B80"
          stroke="#165A52"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
        {/* Placket Seam & Button */}
        <line x1="64" y1="105" x2="64" y2="128" stroke="#165A52" strokeWidth="1.4" />
        <circle cx="64" cy="116" r="1.4" fill="#FFFFFF" opacity="0.85" />

        {/* Ears */}
        {/* Left Ear */}
        <path d="M35 56 C29 56 28 67 36 69 Z" fill="#FCD8BA" />
        <path
          d="M34 59 C32 61 32 65 35 66"
          stroke="#DF9B6E"
          strokeWidth="1.2"
          strokeLinecap="round"
          fill="none"
        />
        {/* Right Ear */}
        <path d="M93 56 C99 56 100 67 92 69 Z" fill="#FCD8BA" />
        <path
          d="M94 59 C96 61 96 65 93 66"
          stroke="#DF9B6E"
          strokeWidth="1.2"
          strokeLinecap="round"
          fill="none"
        />

        {/* Face Base */}
        <path
          d="M35 52 C35 34 46 28 64 28 C82 28 93 34 93 52 C93 69 82 82 64 82 C46 82 35 69 35 52 Z"
          fill="#FCD8BA"
        />

        {/* Unisex Modern Hairstyle */}
        <path
          d="M33 46 C32 26 46 19 64 19 C82 19 96 26 95 46 C95 49 94 54 94 54 C91 43 86 38 78 36 C70 34 58 35 48 40 C42 43 38 48 34 54 Z"
          fill="#2A1F18"
        />
        <path
          d="M34 48 C42 36 62 35 78 37 C84 38 90 41 94 48 C91 44 84 41 77 41 C67 41 55 45 44 52 C40 54 36 52 34 48 Z"
          fill="#352820"
        />
        {/* Sideburns */}
        <path d="M34 48 L35 56 L38 52 Z" fill="#2A1F18" />
        <path d="M94 48 L93 56 L90 52 Z" fill="#2A1F18" />
        {/* Hair Sheen */}
        <path
          d="M52 23 C62 22 74 24 82 28"
          stroke="#4D3B31"
          strokeWidth="1.8"
          strokeLinecap="round"
          fill="none"
        />

        {/* Eyebrows */}
        <path
          d="M43 51 C48 48 54 48 58 51"
          stroke="#2A1F18"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M70 51 C74 48 80 48 85 51"
          stroke="#2A1F18"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />

        {/* Eyes */}
        {/* Left Eye */}
        <ellipse cx="50.5" cy="59" rx="4.5" ry="5" fill="#2A1F18" />
        <circle cx="52" cy="57.5" r="1.6" fill="#FFFFFF" />
        <circle cx="49" cy="61" r="0.8" fill="#FFFFFF" opacity="0.75" />
        {/* Right Eye */}
        <ellipse cx="77.5" cy="59" rx="4.5" ry="5" fill="#2A1F18" />
        <circle cx="79" cy="57.5" r="1.6" fill="#FFFFFF" />
        <circle cx="76" cy="61" r="0.8" fill="#FFFFFF" opacity="0.75" />

        {/* Cheeks Soft Blush */}
        <ellipse cx="42" cy="65" rx="5.5" ry="3.5" fill="#F8A799" opacity="0.45" />
        <ellipse cx="86" cy="65" rx="5.5" ry="3.5" fill="#F8A799" opacity="0.45" />

        {/* Nose */}
        <path
          d="M63 64 Q64.5 68 66 67.5"
          stroke="#DF9B6E"
          strokeWidth="1.8"
          strokeLinecap="round"
          fill="none"
        />

        {/* Warm Smiling Mouth */}
        <path d="M56 71 Q64 79 72 71 Q64 75 56 71 Z" fill="#CF4E4E" />
        <path
          d="M58 71.5 Q64 74 70 71.5"
          stroke="#FFFFFF"
          strokeWidth="1.5"
          strokeLinecap="round"
          fill="none"
        />
      </g>
    </svg>
  );
}

/**
 * BEZENT EmployeeCartoonAvatar
 * Premium 2D vector cartoon character avatar for ESS Dashboard & profile experiences.
 */
export function EmployeeCartoonAvatar({
  avatarVariant,
  size = 'hero',
  src,
  employeeName,
  gender,
  avatarPreference,
  onClick,
  className = '',
}: EmployeeCartoonAvatarProps) {
  // Resolve variant according to Step 3 hierarchy: preference > gender > neutral
  const resolvedVariant: CartoonAvatarVariant =
    avatarVariant ?? resolveCartoonAvatarVariant(avatarPreference, gender);

  const title = employeeName
    ? `${employeeName}'s avatar (${resolvedVariant})`
    : `Employee avatar (${resolvedVariant})`;

  // When no custom profile image is provided, display the actual high-res cartoon avatar:
  // Male -> /assets/avatars/avatar-male.png
  // Female -> /assets/avatars/avatar-female.png
  const defaultCartoonImg =
    resolvedVariant === 'female'
      ? '/assets/avatars/avatar-female.png'
      : '/assets/avatars/avatar-male.png';

  const activeSrc = src || defaultCartoonImg;
  const [imageError, setImageError] = useState(false);

  // Size calculation
  const sizeClass =
    size !== 'hero' ? `bezent-cartoon-avatar--${size}` : 'bezent-cartoon-avatar--hero';
  const isInteractive = Boolean(onClick);
  const interactiveClass = isInteractive ? 'bezent-cartoon-avatar--interactive' : '';
  const classes = `bezent-cartoon-avatar ${sizeClass} ${interactiveClass} ${className}`.trim();

  return (
    <div
      className={classes}
      role={isInteractive ? 'button' : 'img'}
      tabIndex={isInteractive ? 0 : undefined}
      onKeyDown={
        isInteractive
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
      onClick={onClick}
      aria-label={title}
      title={isInteractive ? `${title} (Click to customize)` : title}
    >
      {!imageError ? (
        <img
          className="bezent-cartoon-avatar__image"
          src={activeSrc}
          alt={title}
          loading="eager"
          onError={() => setImageError(true)}
        />
      ) : (
        <>
          {resolvedVariant === 'male' && <MaleCartoonSvg title={title} />}
          {resolvedVariant === 'female' && <FemaleCartoonSvg title={title} />}
          {resolvedVariant === 'neutral' && <NeutralCartoonSvg title={title} />}
        </>
      )}
    </div>
  );
}

export default EmployeeCartoonAvatar;
