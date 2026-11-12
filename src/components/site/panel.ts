/**
 * Full-bleed colour section that rides up over the one before it with rounded
 * top corners — the same move as the hero's sede card over the slider. Each
 * panel needs bottom padding of its own for the next one to overlap.
 */
export const PANEL =
  "relative -mt-10 rounded-t-[36px] shadow-[0_-18px_40px_-28px] shadow-verde-profundo/25 lg:-mt-14 lg:rounded-t-[56px]";

/**
 * Remaps the muted text and rule tokens for content on lima or celeste, where
 * the default salvia/musgo greys fall under WCAG AA (4.5:1).
 */
export const TONOS_CLAROS =
  "[--color-salvia:var(--tf-oliva)] [--color-musgo:var(--tf-verde-profundo)] [--color-oliva:var(--tf-verde-profundo)] [--color-linea:color-mix(in_srgb,var(--tf-verde-profundo)_18%,transparent)] [--color-linea-tag:color-mix(in_srgb,var(--tf-verde-profundo)_35%,transparent)]";
