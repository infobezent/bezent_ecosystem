import type { BezentIconProps, BezentIconSizeToken } from '../types';
import { BEZENT_ICON_SIZES } from '../types';
import type { BezentIconName } from '../definitions';
import { getMaterialSymbolGlyph } from '../materialSymbolsMap';
import './icons.css';

/**
 * The canonical BEZENT icon renderer — the ONE way to render a BEZENT
 * icon across the platform. Powered by Google Material Symbols Outlined
 * under ADR-015 (docs/architecture/ADRs.md#adr-015).
 *
 * Resolves `name` (or historical alias) to its corresponding Material
 * Symbols Outlined glyph ligature and renders a semantic span styled with
 * design-system tokens.
 */
export interface BezentIconComponentProps extends Omit<BezentIconProps, 'name'> {
  name: BezentIconName;
}

function resolveColorAttr(color?: string): string | undefined {
  if (!color) return undefined;
  if (color === 'currentColor') return 'current';
  if (color.includes('--top-utility-icon')) return 'top-utility';
  if (color.includes('--accent-primary')) return 'accent';
  if (color.includes('--right-rail-icon-default')) return 'right-rail';
  if (color.includes('--bezent-logo-text')) return 'logo-text';
  if (color.includes('--nav-icon-active')) return 'nav-active';
  if (color.includes('--nav-icon-default')) return 'nav-default';
  if (color.includes('--text-primary')) return 'primary';
  if (color.includes('--text-secondary')) return 'secondary';
  return undefined;
}

export function BezentIcon({
  name,
  variant = 'outline',
  size = 20,
  color,
  active,
  className,
  title,
  'aria-label': ariaLabel,
  'aria-hidden': ariaHidden = true,
}: BezentIconComponentProps) {
  const pixelSize =
    typeof size === 'number'
      ? size
      : ((BEZENT_ICON_SIZES as Record<string, number>)[size as BezentIconSizeToken] ?? 20);

  const isSolid = variant === 'solid' || active === true;
  const isSelected = active ?? isSolid;
  const glyph = getMaterialSymbolGlyph(name);
  const colorAttr = resolveColorAttr(color);

  return (
    <span
      className={`material-symbols-outlined bezent-material-icon bezent-icon-sz-${pixelSize} ${isSolid ? 'is-solid' : ''} ${isSelected ? 'is-active' : ''} ${className || ''}`.trim()}
      data-size={pixelSize}
      data-variant={isSolid ? 'solid' : 'outline'}
      data-color={colorAttr}
      title={title}
      aria-label={ariaLabel}
      aria-hidden={ariaHidden}
    >
      {glyph}
    </span>
  );
}

export default BezentIcon;
