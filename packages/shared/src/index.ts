/**
 * @packageDocumentation
 *
 * Barrel export for the `@draw-it/shared` package — a pure TypeScript library
 * with zero runtime dependencies, shared between the web frontend and other
 * consumers that need shape definitions, color utilities, hit-testing helpers,
 * and application constants.
 *
 * All exports are re-exported from their respective domain modules:
 *   - `shapes`   — shape type system, type guards, runtime validation
 *   - `colors`   — deterministic author color palette and hash
 *   - `hitTest`  — eraser-tool hit detection for all shape types
 *   - `constants`— canvas size, throttling config, zoom limits, and more
 */

export * from './shapes';
export * from './colors';
export * from './hitTest';
export * from './constants';

