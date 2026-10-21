"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Logo } from "@/components/ui/logo";
import { SITE, LOCATION, ANDRES, waLink } from "@/content/site";

gsap.registerPlugin(useGSAP, ScrollTrigger);

/**
 * Full-bleed video hero. The training loop covers the whole viewport;
 * copy enters from the side with a staggered GSAP timeline, and on scroll
 * the video slowly zooms + dims while the text drifts up (scrubbed).
 * All motion is skipped under prefers-reduced-motion.
 */
export function Hero() {
  const scope = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

      // Entrance: video settles from a slight zoom, copy slides in from the side.
      gsap.fromTo(
        "[data-hero-video]",
        { scale: 1.12 },
        { scale: 1, duration: 1.8, ease: "power2.out" },
      );
      gsap.fromTo(
        "[data-hero-item]",
        { autoAlpha: 0, x: -44 },
        { autoAlpha: 1, x: 0, duration: 1, stagger: 0.09, ease: "power3.out", delay: 0.15 },
      );
      gsap.fromTo(
        "[data-hero-cue]",
        { autoAlpha: 0 },
        { autoAlpha: 1, duration: 0.8, delay: 1.1 },
      );

      // Scroll: gentle zoom + darken on the video, copy drifts up and fades.
      const scrub = {
        trigger: scope.current,
        start: "top top",
        end: "bottom top",
        scrub: true,
      } as const;
      gsap.to("[data-hero-zoom]", { scale: 1.1, ease: "none", scrollTrigger: scrub });
      gsap.to("[data-hero-dim]", { autoAlpha: 0.75, ease: "none", scrollTrigger: scrub });
      gsap.to("[data-hero-content]", {
        yPercent: -22,
        autoAlpha: 0,
        ease: "none",
        scrollTrigger: { ...scrub, end: "75% top" },
      });
    },
    { scope },
  );

  return (
    <section
      ref={scope}
      id="top"
      className="relative flex min-h-[100svh] items-end overflow-hidden pb-24 pt-28 sm:pb-28 md:items-center md:py-32"
    >
      {/* video backdrop — decorative; poster shows if autoplay is blocked */}
      <div data-hero-zoom className="absolute inset-0 -z-20">
        <video
          data-hero-video
          src="/hero-loop.mp4"
          poster="/hero-poster.jpg"
          autoPlay
          loop
          muted
          playsInline
          aria-hidden="true"
          className="h-full w-full object-cover"
        />
      </div>

      {/* legibility overlays: side wash on desktop, bottom wash on mobile,
          plus a fade into the page background so the section blends out */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-gradient-to-t from-base via-base/45 to-base/20 md:bg-gradient-to-r md:from-base/90 md:via-base/45 md:to-base/10"
      />
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 -z-10 h-32 bg-gradient-to-t from-base to-transparent"
      />
      {/* top wash so navbar links stay readable over bright frames */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 -z-10 h-28 bg-gradient-to-b from-base/70 to-transparent"
      />
      {/* scroll-driven darkening layer */}
      <div data-hero-dim aria-hidden className="absolute inset-0 -z-10 bg-base opacity-0" />

      <Container>
        <div data-hero-content className="max-w-2xl">
          <p
            data-hero-item
            className="mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-base/40 px-3 py-1 text-xs font-medium uppercase tracking-widest text-muted backdrop-blur-sm"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-primary shadow-glow-soft" />
            {LOCATION.label}
          </p>

          <div data-hero-item>
            <Logo className="h-10 sm:h-14" priority />
          </div>

          <h1
            data-hero-item
            className="mt-5 font-display text-4xl font-bold leading-[1.08] tracking-tight text-balance text-ink sm:text-6xl sm:leading-[1.04] lg:text-7xl"
          >
            {SITE.tagline}
          </h1>

          <p data-hero-item className="mt-6 max-w-lg text-lg text-muted">
            {SITE.description}
          </p>

          <div data-hero-item className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button href={waLink("¡Hola! Quiero agendar mi evaluación.")} size="lg">
              Agendá tu evaluación
            </Button>
            <Button href="#servicios" variant="ghost" size="lg">
              Ver servicios
            </Button>
          </div>

          <p data-hero-item className="mt-6 text-sm text-muted-2">
            {ANDRES.credentials.join(" · ")}
          </p>
        </div>
      </Container>

      {/* scroll cue */}
      <a
        data-hero-cue
        href="#servicios"
        aria-label="Bajar a servicios"
        className="absolute bottom-6 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 text-[11px] uppercase tracking-widest text-muted-2 transition-colors hover:text-ink sm:flex"
      >
        Deslizá
        <span className="scroll-cue-line" aria-hidden />
      </a>
    </section>
  );
}
