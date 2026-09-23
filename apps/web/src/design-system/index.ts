/**
 * BEZENT Design System — Public Root Entry Point
 *
 * This is the single import surface for all reusable BEZENT UI.
 *
 * Usage:
 *   import { Button, Input, Card, BezentIcon } from '@design-system';
 *
 * Rules (see AGENTS.md, Article 7-10):
 *   - Business modules MUST import from this barrel, not from deep internals.
 *   - All new components MUST be exported here before being used.
 *   - Never create a local replacement of a component that exists here.
 */

/** Generic UI primitives */
export * from './components/index';

/** Design tokens (JS-accessible) */
export * from './tokens/tokens';

/** Icon system */
export * from './icons/index';
