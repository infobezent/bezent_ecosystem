import type { ButtonHTMLAttributes, ReactNode } from 'react';
import './Button.css';

export type ButtonVariant = 'primary';

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className'> {
  /**
   * Only `primary` is evidenced in the approved old UI (the global
   * `.btn-primary` / `button[data-variant="primary"]` CSS rule — see
   * docs/architecture/DESIGN-SYSTEM-COMPONENTS.md). Additional variants
   * (secondary/ghost/danger) are not added speculatively — see that doc
   * for why the "BEZENT AI" button's bordered style was NOT generalized
   * into a second variant.
   */
  variant?: ButtonVariant;
  children: ReactNode;
}

/**
 * The canonical BEZENT button. Native `<button>` semantics (keyboard
 * activation, `:disabled`, focus) — no reinvented click/press handling.
 * Source: old approved UI's `.btn-primary` CSS class (`index.css`
 * lines 663-680), whose exact colors match the old `App.tsx` "Quick
 * Create" button's inline styles verbatim (background `#931CF5`, hover
 * `#8418DC`, active `#7114BD` + `scale(0.98)`) — confirming the class was
 * the intended reusable contract, even though nothing in the old UI
 * actually consumed it via `data-variant="primary"`.
 */
export function Button({ variant = 'primary', children, ...rest }: ButtonProps) {
  return (
    <button type="button" className={`bezent-btn bezent-btn--${variant}`} {...rest}>
      {children}
    </button>
  );
}

export default Button;
