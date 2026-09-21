/**
 * Shared outline-stroke prop builder used by every "duotone-lite" icon
 * (the majority of the set). Returns SVG presentation attributes, not a
 * `style` object — these are read by React as attributes on the `<path>`
 * element itself, the same as `viewBox` or `d`; they carry no CSS-styling
 * semantics and are unaffected by the no-inline-CSS rule (see
 * docs/architecture/UI-RULES.md).
 */
export function strokeProps(color: string, strokeWidth = 1.75) {
  return {
    stroke: color,
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: 'none' as const,
  };
}
