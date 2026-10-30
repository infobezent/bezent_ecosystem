import type { ImgHTMLAttributes } from 'react';
import { BezentWordmark } from './BezentWordmark';
import bezentLogoSrc from '../../../assets/bezent_logo.png';
import './BezentLogo.css';

export interface BezentLogoProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'size'> {
  /** Size in pixels (default: 32) */
  size?: number | 'sm' | 'md' | 'lg' | 'xl';
  /** 'mark' = icon badge only (default); 'full' = icon badge + BEZENT wordmark */
  variant?: 'mark' | 'full';
  /** Accessible title for screen readers */
  title?: string;
  /** Additional CSS class */
  className?: string;
}

const SIZE_MAP = {
  sm: 24,
  md: 32,
  lg: 48,
  xl: 64,
};

/**
 * Official BEZENT Ecosystem Brand Logo.
 * Displays the authentic 3D circular purple badge with the white 'b + z' monogram,
 * representing "BEZENT" (Business Ecosystem Zentram).
 */
export function BezentLogo({
  size = 32,
  variant = 'mark',
  title = 'BEZENT',
  className = '',
  ...props
}: BezentLogoProps) {
  const pixelSize = typeof size === 'string' ? SIZE_MAP[size] || 32 : size;

  const imgMark = (
    <img
      src={bezentLogoSrc}
      width={pixelSize}
      height={pixelSize}
      alt={title}
      className={`bezent-logo__mark ${className}`.trim()}
      loading="eager"
      decoding="async"
      {...props}
    />
  );

  if (variant === 'full') {
    return (
      <div className={`bezent-logo ${className}`.trim()}>
        {imgMark}
        <BezentWordmark
          height={typeof pixelSize === 'number' ? Math.round(pixelSize * 0.65) : 20}
          className="bezent-logo__wordmark"
        />
      </div>
    );
  }

  return imgMark;
}

export { bezentLogoSrc };
export default BezentLogo;
