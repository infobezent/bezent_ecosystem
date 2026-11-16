import type { HTMLAttributes } from 'react';
import './Skeleton.css';

export type SkeletonVariant = 'text' | 'circular' | 'rectangular' | 'rounded';
export type SkeletonAnimation = 'wave' | 'pulse' | 'none';
export type SkeletonSize = '3xs' | '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'full';

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  /** Visual shape of the skeleton: text (line), circular (avatar), rectangular (card/box), rounded (pill) */
  variant?: SkeletonVariant;
  /** Shimmer wave, smooth pulse, or static */
  animation?: SkeletonAnimation;
  /** Predefined width modifier */
  width?: SkeletonSize | string;
  /** Predefined height modifier */
  height?: SkeletonSize | string;
  className?: string;
}

export function Skeleton({
  variant = 'rectangular',
  animation = 'wave',
  width,
  height,
  className = '',
  ...rest
}: SkeletonProps) {
  const isNamedSize = (s?: string): s is SkeletonSize =>
    ['3xs', '2xs', 'xs', 'sm', 'md', 'lg', 'xl', 'full'].includes(s ?? '');

  const classes = [
    'bezent-skeleton',
    `bezent-skeleton--${variant}`,
    animation !== 'none' ? `bezent-skeleton--${animation}` : '',
    width && isNamedSize(width) ? `bezent-skeleton--w-${width}` : '',
    height && isNamedSize(height) ? `bezent-skeleton--h-${height}` : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return <div className={classes} aria-hidden="true" {...rest} />;
}
