"use client";

import { useEffect } from "react";

import { INTRO_ATTR } from "@/lib/intro";

/**
 * Switches the home intro off once it has played.
 *
 * The intro is turned ON before first paint by the inline script in the root
 * layout (`introScript`), so the CSS can start at first paint without waiting
 * for hydration. This only turns it OFF: after the last hero element lands,
 * and when leaving the page, so a client-side navigation back to "/" doesn't
 * re-mount the hero into a replay. Removing the attribute after the animation
 * has finished is invisible — the resting CSS state is the finished state.
 */
export function IntroSession() {
  useEffect(() => {
    const root = document.documentElement;
    if (!root.hasAttribute(INTRO_ATTR)) return;
    const done = window.setTimeout(() => root.removeAttribute(INTRO_ATTR), 2900);
    return () => {
      window.clearTimeout(done);
      root.removeAttribute(INTRO_ATTR);
    };
  }, []);

  return null;
}
