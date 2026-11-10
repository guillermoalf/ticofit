"use client";

import { useEffect } from "react";

import { INTRO_ATTR } from "@/lib/intro";

/**
 * Switches the home intro off once it has played.
 *
 * The intro is turned ON (and released on first paint) by the inline script
 * in the root layout (`introScript`). This only turns it OFF: when the last
 * hero element finishes rising, and when leaving the page, so a client-side
 * navigation back to "/" doesn't re-mount the hero into a replay. Removing
 * the attribute after the animation has finished is invisible — the resting
 * CSS state is the finished state.
 */
export function IntroSession() {
  useEffect(() => {
    const root = document.documentElement;
    if (!root.hasAttribute(INTRO_ATTR)) return;
    const end = () => root.removeAttribute(INTRO_ATTR);
    const onEnd = (e: AnimationEvent) => {
      if ((e.target as Element).classList?.contains("tf-intro-cta")) end();
    };
    document.addEventListener("animationend", onEnd);
    // Safety net: the sequence is 2.74s from release; never leave it on.
    const fallback = window.setTimeout(end, 8000);
    return () => {
      document.removeEventListener("animationend", onEnd);
      window.clearTimeout(fallback);
      end();
    };
  }, []);

  return null;
}
