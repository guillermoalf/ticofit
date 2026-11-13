/**
 * Full-bleed colour section with a straight cut: edge to edge, no rounding,
 * no overlap, no shadow. The colour change alone marks the new section.
 */
export const PANEL = "relative px-5 py-16 lg:px-10 lg:py-24";

/**
 * Remaps the muted text and rule tokens for content on lima or celeste, where
 * the default salvia/musgo greys fall under WCAG AA (4.5:1).
 */
export const TONOS_CLAROS =
  "[--color-salvia:var(--tf-oliva)] [--color-musgo:var(--tf-verde-profundo)] [--color-oliva:var(--tf-verde-profundo)] [--color-linea:color-mix(in_srgb,var(--tf-verde-profundo)_18%,transparent)] [--color-linea-tag:color-mix(in_srgb,var(--tf-verde-profundo)_35%,transparent)]";
