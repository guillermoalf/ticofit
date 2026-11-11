"use client";

import { useEffect, useRef, useState } from "react";

import { landing } from "@/content/landing";
import { reviews } from "@/content/reviews";
import { cn } from "@/lib/utils";
import { Star } from "../icons";

const { resenas } = landing.home;
const SWIPE_PX = 40;

/**
 * Google rating on the left; on the right one review at a time as a large
 * italic pull quote, with story-style progress bars above it. The active bar
 * fills over 7s (globals.css `tf-story`) and its animationend advances, so
 * pausing the bar on hover also pauses the rotation. Tap/click the quote to
 * advance, swipe on touch. Reduced motion: no autoplay, manual only.
 */
export function Reviews() {
  const [active, setActive] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [reduced, setReduced] = useState(true);
  const startX = useRef<number | null>(null);
  const multiple = reviews.length > 1;

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const go = (delta: number) => setActive((i) => (i + delta + reviews.length) % reviews.length);

  if (reviews.length === 0) return null;

  return (
    <div className="flex flex-col gap-10 md:flex-row md:gap-16">
      <div className="shrink-0 md:w-[240px]">
        <p className="mb-5 text-[13px] font-semibold tracking-[1.2px] uppercase">{resenas.eyebrow}</p>
        <p className="font-tf-serif text-[72px] leading-none">{resenas.rating}</p>
        <div className="mt-3 flex gap-[3px]" role="img" aria-label={resenas.estrellasLabel}>
          {Array.from({ length: 5 }, (_, i) => (
            <Star key={i} />
          ))}
        </div>
        <p className="mt-2 text-[14px] text-musgo">{resenas.cantidadLabel}</p>
        <a
          href={resenas.verTodas.href}
          target="_blank"
          rel="noopener noreferrer"
          className="group mt-5 inline-flex min-h-11 items-center gap-1.5 text-[15px] font-semibold text-verde-profundo no-underline"
        >
          <span className="underline decoration-1 underline-offset-4 group-hover:decoration-2">
            {resenas.verTodas.label}
          </span>
          <span aria-hidden="true">→</span>
        </a>
      </div>

      <div
        className="min-w-0 flex-1"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {multiple && (
          <div className="mb-8 flex gap-1.5" role="group" aria-label={resenas.progresoLabel}>
            {reviews.map((r, i) => (
              <span key={r.nombre} className="h-[2px] flex-1 overflow-hidden rounded-full bg-verde-profundo/15">
                <span
                  key={i === active ? `on-${active}` : "off"}
                  className={cn(
                    "block h-full origin-left bg-verde-profundo",
                    i === active && !reduced
                      ? "tf-story"
                      : i <= active
                        ? "scale-x-100"
                        : "scale-x-0",
                  )}
                  style={i === active ? { animationPlayState: hovered ? "paused" : "running" } : undefined}
                  onAnimationEnd={i === active ? () => go(1) : undefined}
                />
              </span>
            ))}
          </div>
        )}

        <figure
          className={cn("grid select-none", multiple && "cursor-pointer")}
          onClick={multiple ? () => go(1) : undefined}
          onPointerDown={(e) => {
            if (e.pointerType !== "mouse") startX.current = e.clientX;
          }}
          onPointerUp={(e) => {
            if (startX.current === null) return;
            const dx = e.clientX - startX.current;
            startX.current = null;
            if (Math.abs(dx) > SWIPE_PX) go(dx < 0 ? 1 : -1);
          }}
          style={{ touchAction: "pan-y" }}
        >
          {reviews.map((r, i) => {
            const isActive = i === active;
            return (
              <div
                key={r.nombre}
                aria-hidden={!isActive}
                className={cn(
                  "col-start-1 row-start-1 transition-[opacity,translate] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-opacity motion-reduce:duration-300",
                  isActive ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0",
                )}
              >
                <blockquote className="font-tf-serif text-[30px] leading-[1.18] italic md:text-[clamp(36px,3.6vw,52px)]">
                  “{r.texto}”
                </blockquote>
                <figcaption className="mt-6 flex items-center gap-3 text-[14px]">
                  <span className="font-semibold">{r.nombre}</span>
                  <span className="flex gap-[2px]" role="img" aria-label={`${r.estrellas} de 5 estrellas`}>
                    {Array.from({ length: r.estrellas }, (_, k) => (
                      <Star key={k} className="size-3" />
                    ))}
                  </span>
                </figcaption>
              </div>
            );
          })}
        </figure>

        {multiple && (
          <button type="button" onClick={() => go(1)} className="sr-only focus:not-sr-only focus:mt-4">
            {resenas.siguiente}
          </button>
        )}
      </div>
    </div>
  );
}
