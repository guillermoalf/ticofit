"use client";

import Image from "next/image";
import { useCallback, useEffect, useId, useRef, useState } from "react";

import { landing } from "@/content/landing";
import { cn } from "@/lib/utils";

const { hero } = landing.home;

type Slide = (typeof hero.slides)[number];
type Fondo = Slide["fondo"];

/** Literal class names so Tailwind generates them. */
const FONDOS: Record<Fondo, string> = {
  limaClaro: "bg-lima-claro",
  celeste: "bg-celeste",
  amarilloVerde: "bg-amarillo-verde",
  bandaSalvia: "bg-banda-salvia",
  lineaTag: "bg-linea-tag",
  niebla: "bg-niebla",
};

const AUTOPLAY_MS = 6000;

/**
 * Full-bleed service slider. Each slide is a flat palette field with its
 * number, the service name in the display serif and a cut-out figure laid
 * over the word. The next slide's field wipes in right-to-left (clip-path,
 * globals.css `tf-curtain`); its figure follows 150ms later. Autoplays every
 * 6s, pauses on hover and focus, and never autoplays under reduced motion
 * (where the curtain becomes a plain crossfade).
 *
 * `figuras` says which PNGs exist in public/hero (checked on the server), so
 * a missing file renders a neutral placeholder instead of a broken image.
 */
export function HeroSlider({ figuras }: { figuras: Record<string, boolean> }) {
  const slides = hero.slides;
  const [active, setActive] = useState(0);
  const [prev, setPrev] = useState<number | null>(null);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [reduced, setReduced] = useState(true);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const baseId = useId();

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const go = useCallback(
    (next: number) => {
      if (next === active) return;
      setPrev(active);
      setActive(next);
    },
    [active],
  );

  const paused = hovered || focused || reduced;

  useEffect(() => {
    if (paused) return;
    const t = window.setTimeout(() => go((active + 1) % slides.length), AUTOPLAY_MS);
    return () => window.clearTimeout(t);
  }, [active, paused, go, slides.length]);

  const onTabKey = (e: React.KeyboardEvent, i: number) => {
    let next: number | null = null;
    if (e.key === "ArrowRight") next = (i + 1) % slides.length;
    else if (e.key === "ArrowLeft") next = (i - 1 + slides.length) % slides.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = slides.length - 1;
    if (next === null) return;
    e.preventDefault();
    go(next);
    tabRefs.current[next]?.focus();
  };

  return (
    <div
      role="region"
      aria-roledescription="carrusel"
      aria-label={hero.sliderLabel}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocused(false);
      }}
      className="relative"
    >
      {/* Slides share one grid cell, so the stack is as tall as the tallest. */}
      <div className="tf-intro-media grid" aria-live={paused ? "polite" : "off"}>
        {slides.map((slide, i) => {
          const isActive = i === active;
          const isPrev = i === prev;
          return (
            <div
              key={slide.id}
              id={`${baseId}-panel-${i}`}
              role="tabpanel"
              aria-roledescription="diapositiva"
              aria-labelledby={`${baseId}-tab-${i}`}
              aria-hidden={!isActive}
              inert={!isActive}
              className={cn(
                "tf-slide col-start-1 row-start-1",
                FONDOS[slide.fondo],
                isActive ? "z-[2]" : isPrev ? "z-[1]" : "invisible z-0",
                // Only animate once something has changed — not on first paint.
                isActive && prev !== null && "tf-slide-in",
              )}
            >
              <SlideBody slide={slide} index={i} hasFigura={figuras[slide.id] ?? false} priority={i === 0} />
            </div>
          );
        })}
      </div>

      {/* Fixed chrome, above every slide */}
      <p className="tf-intro-lead pointer-events-none absolute top-[92px] left-5 z-10 text-[12px] md:top-[128px] font-semibold tracking-[2.2px] text-verde-profundo uppercase lg:left-10">
        {hero.eyebrow}
      </p>

      <div
        role="tablist"
        aria-label={hero.tabsLabel}
        className="tf-intro-lead absolute right-5 bottom-[92px] z-10 flex gap-1 md:bottom-[112px] lg:right-10 lg:bottom-[192px]"
      >
        {slides.map((slide, i) => {
          const selected = i === active;
          return (
            <button
              key={slide.id}
              ref={(el) => {
                tabRefs.current[i] = el;
              }}
              id={`${baseId}-tab-${i}`}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={`${baseId}-panel-${i}`}
              aria-label={`${String(i + 1).padStart(2, "0")} · ${slide.nombre}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => go(i)}
              onKeyDown={(e) => onTabKey(e, i)}
              className={cn(
                "group relative inline-flex min-h-11 min-w-11 cursor-pointer flex-col items-center justify-center bg-transparent px-1.5 text-[13px] tracking-[1px] text-verde-profundo tabular-nums",
                "focus-visible:rounded-md focus-visible:outline-2 focus-visible:outline-verde-profundo",
              )}
            >
              <span className={cn("transition-opacity", selected ? "font-semibold" : "font-medium")}>
                {String(i + 1).padStart(2, "0")}
              </span>
              <span
                aria-hidden="true"
                className={cn(
                  "mt-1 h-[2px] w-6 origin-left rounded-full bg-verde-profundo transition-transform duration-500",
                  selected ? "scale-x-100" : "scale-x-0",
                )}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SlideBody({
  slide,
  index,
  hasFigura,
  priority,
}: {
  slide: Slide;
  index: number;
  hasFigura: boolean;
  priority: boolean;
}) {
  return (
    <div className="relative flex min-h-[640px] flex-col px-5 pt-[124px] pb-[168px] text-verde-profundo md:pt-[160px] lg:h-[clamp(680px,calc(100svh-24px),900px)] lg:px-10 lg:pb-[200px]">
      <p aria-hidden="true" className="font-tf-serif text-[64px] leading-none md:text-[96px]">
        {String(index + 1).padStart(2, "0")}
      </p>

      {/* Word behind, figure in front: the figure covers part of the word. */}
      <div className="relative flex flex-1 flex-col items-center justify-center lg:block">
        <h2 className="relative z-0 w-full text-center font-tf-serif text-[clamp(52px,13vw,224px)] leading-[0.88] font-normal tracking-[-0.01em] text-balance break-words lg:absolute lg:inset-x-0 lg:top-1/2 lg:-translate-y-1/2">
          {slide.nombre}
        </h2>
        <div className="tf-figure relative z-[1] -mt-6 h-[300px] w-full max-w-[350px] md:h-[380px] md:max-w-[460px] lg:absolute lg:bottom-[-104px] lg:left-1/2 lg:mt-0 lg:h-[88%] lg:w-[min(36vw,520px)] lg:-translate-x-1/2">
          {hasFigura ? (
            <Image
              src={slide.figura.src}
              alt={slide.figura.alt}
              fill
              priority={priority}
              sizes="(min-width: 1024px) 36vw, 460px"
              className="object-contain object-bottom"
            />
          ) : (
            <div
              role="img"
              aria-label={slide.figura.alt}
              className="absolute inset-x-[12%] top-[6%] bottom-0 rounded-t-full bg-verde-profundo/12"
            />
          )}
        </div>
      </div>

      <p className="relative z-[2] mt-6 max-w-[340px] text-[16px] leading-[1.5] md:text-[17px] lg:absolute lg:bottom-[192px] lg:left-10 lg:mt-0 lg:max-w-[300px]">
        {slide.descripcion}
      </p>
    </div>
  );
}
