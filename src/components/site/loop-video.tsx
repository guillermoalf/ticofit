"use client";

import { useEffect, useRef } from "react";

import { cn } from "@/lib/utils";

type Fuente = { video: string; poster: string };

/**
 * Muted, looping background video. Plays only while on screen and never for
 * people who ask for reduced motion; they see the poster. Pass `ancho` to
 * swap in a different cut on wide screens (a 16:9 crop for desktop next to
 * the vertical one for phones).
 */
export function LoopVideo({
  movil,
  ancho,
  alt,
  className,
}: {
  movil: Fuente;
  ancho?: Fuente;
  alt: string;
  className?: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // React doesn't always reflect `muted` onto the element after hydration,
    // and browsers only allow unattended playback when it is.
    v.muted = true;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) v.play().catch(() => {});
        else v.pause();
      },
      { threshold: 0.15 },
    );
    io.observe(v);
    // Start right away if already on screen; the observer handles the rest.
    const r = v.getBoundingClientRect();
    if (r.bottom > 0 && r.top < window.innerHeight) v.play().catch(() => {});
    return () => io.disconnect();
  }, []);

  return (
    <div className={cn("relative overflow-hidden bg-banda-salvia", className)}>
      <picture>
        {ancho && <source media="(min-width: 768px)" srcSet={ancho.poster} />}
        <img src={movil.poster} alt={alt} className="absolute inset-0 h-full w-full object-cover" />
      </picture>
      <video
        ref={ref}
        muted
        loop
        playsInline
        preload="metadata"
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover"
      >
        {ancho && <source media="(min-width: 768px)" src={ancho.video} type="video/mp4" />}
        <source src={movil.video} type="video/mp4" />
      </video>
    </div>
  );
}
