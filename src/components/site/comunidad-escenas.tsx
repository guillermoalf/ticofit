"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";

import { landing } from "@/content/landing";
import { cn } from "@/lib/utils";

import { SmartLink } from "./smart-link";
import { WaitlistButton } from "./waitlist-modal";

const { video, escenas } = landing.comunidad;

/** Index of the scene that owns second `t` of the video. */
function escenaEn(t: number) {
  let i = 0;
  while (i + 1 < escenas.length && t >= escenas[i + 1].desde) i++;
  return i;
}

/**
 * Full-height video card for /comunidad. One continuous video runs through
 * three scenes; the title and its link swap with each scene and the bars at
 * the bottom show progress (tap one to jump to it). Plays only while on
 * screen. With reduced motion there is no video: the bars step through each
 * scene's still instead.
 */
export function ComunidadEscenas() {
  const ref = useRef<HTMLVideoElement>(null);
  const barras = useRef<(HTMLSpanElement | null)[]>([]);
  const [actual, setActual] = useState(0);
  const [quieto, setQuieto] = useState(false);
  const [pausado, setPausado] = useState(false);
  const pausadoRef = useRef(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setQuieto(true);
      return;
    }
    const v = ref.current;
    if (!v) return;
    // React doesn't always reflect `muted` after hydration, and browsers only
    // allow unattended playback when it is.
    v.muted = true;

    let raf = 0;
    const tick = () => {
      const t = v.currentTime;
      const fin = v.duration || t;
      const i = escenaEn(t);
      setActual(i);
      escenas.forEach((e, k) => {
        const desde = e.desde;
        const hasta = escenas[k + 1]?.desde ?? fin;
        const p = k < i ? 1 : k > i ? 0 : Math.min(1, Math.max(0, (t - desde) / (hasta - desde)));
        const b = barras.current[k];
        if (b) b.style.transform = `scaleX(${p})`;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && !pausadoRef.current) v.play().catch(() => {});
        else v.pause();
      },
      { threshold: 0.2 },
    );
    io.observe(v);
    const r = v.getBoundingClientRect();
    if (r.bottom > 0 && r.top < window.innerHeight) v.play().catch(() => {});

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
    };
  }, []);

  const ir = (i: number) => {
    setActual(i);
    const v = ref.current;
    if (!quieto && v) v.currentTime = escenas[i].desde;
  };

  const alternar = () => {
    const v = ref.current;
    if (!v) return;
    const pausar = !v.paused;
    pausadoRef.current = pausar;
    setPausado(pausar);
    if (pausar) v.pause();
    else v.play().catch(() => {});
  };

  const escena = escenas[actual];
  const poster = quieto ? escena.poster : escenas[0].poster;

  return (
    <section className="px-3 pb-3 lg:px-5 lg:pb-5">
      <div className="relative h-[calc(100svh-103px)] min-h-[540px] overflow-hidden rounded-[28px] bg-banda-salvia lg:h-[calc(100svh-137px)] lg:min-h-[600px]">
        <picture>
          <source media="(min-width: 768px)" srcSet={poster.horizontal} />
          <img src={poster.vertical} alt={video.alt} className="absolute inset-0 h-full w-full object-cover" />
        </picture>
        {!quieto && (
          <video
            ref={ref}
            muted
            loop
            playsInline
            preload="auto"
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-cover"
          >
            <source media="(min-width: 768px)" src={video.horizontal} type="video/mp4" />
            <source src={video.vertical} type="video/mp4" />
          </video>
        )}

        {/* Darkens only where the text sits (bottom on phones, left on desktop) so cream text holds AA. */}
        <div className="absolute inset-0 bg-gradient-to-t from-verde-profundo/85 via-verde-profundo/25 to-transparent md:bg-gradient-to-r md:from-verde-profundo/75 md:via-verde-profundo/25" />

        <div className="absolute inset-x-0 bottom-0 px-6 pb-20 text-crema-claro md:top-1/2 md:bottom-auto md:-translate-y-1/2 md:px-12 md:pb-0 lg:px-16">
          <div
            key={actual}
            className="max-w-[760px] motion-safe:animate-[tf-rise_700ms_cubic-bezier(0.16,1,0.3,1)_both]"
          >
            <h2 className="font-tf-serif text-[40px] leading-[1.04] font-normal md:text-[clamp(52px,5.4vw,84px)]">
              {escena.titulo}
            </h2>
            {escena.cta.tipo === "listaEspera" ? (
              <WaitlistButton sede="cafe" link label={escena.cta.label} className="mt-5 text-crema-claro" />
            ) : (
              <SmartLink
                href={escena.cta.href}
                className="group mt-5 inline-flex min-h-11 items-center gap-2 text-[16px] font-semibold text-crema-claro"
              >
                <span className="underline decoration-1 underline-offset-4 group-hover:decoration-2">
                  {escena.cta.label}
                </span>
                <span aria-hidden="true" className="transition-transform group-hover:translate-x-1">
                  →
                </span>
              </SmartLink>
            )}
          </div>
        </div>

        <div className="absolute inset-x-6 bottom-4 flex items-center gap-3 md:inset-x-12 md:bottom-6 lg:inset-x-16">
          {escenas.map((e, i) => (
            <button
              key={e.titulo}
              type="button"
              onClick={() => ir(i)}
              aria-label={e.titulo}
              aria-current={i === actual}
              className="group flex h-8 flex-1 cursor-pointer items-center"
            >
              <span className="relative block h-[2px] w-full overflow-hidden rounded-full bg-crema-claro/35 group-hover:bg-crema-claro/55">
                <span
                  ref={(el) => {
                    barras.current[i] = el;
                  }}
                  className={cn(
                    "absolute inset-0 origin-left bg-crema-claro",
                    quieto && (i === actual ? "scale-x-100" : "scale-x-0"),
                  )}
                  style={quieto ? undefined : { transform: "scaleX(0)" }}
                />
              </span>
            </button>
          ))}
          {!quieto && (
            <button
              type="button"
              onClick={alternar}
              aria-label={pausado ? "Reproducir video" : "Pausar video"}
              className="grid h-8 w-8 shrink-0 cursor-pointer place-items-center text-crema-claro"
            >
              {pausado ? <Play size={16} fill="currentColor" /> : <Pause size={16} fill="currentColor" />}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
