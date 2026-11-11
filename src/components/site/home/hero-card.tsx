"use client";

import { landing, type SedeId } from "@/content/landing";
import { cn } from "@/lib/utils";
import { Star } from "../icons";
import { PillLink } from "../pill-link";
import { useHomeParams } from "./home-params";

const { tarjeta } = landing.home.hero;
const { sedes } = landing.home;

/** Live card: the sede selection is read from and written to the URL. */
export function HeroCard() {
  const { sede, set } = useHomeParams();
  return <HeroCardView sede={sede} onSelect={(id) => set({ sede: id })} />;
}

/**
 * Cream card that rides up over the bottom of the hero colour field. The two
 * sede cards pick the sede for the whole page (the schedule follows); the
 * selected one is dark and links down to its schedule. Also the static
 * Suspense fallback (default sede, not yet interactive).
 */
export function HeroCardView({ sede, onSelect }: { sede: SedeId; onSelect?: (id: SedeId) => void }) {
  return (
    <div className="tf-intro-cta relative z-10 mx-5 -mt-[72px] rounded-[28px] bg-crema-claro p-5 shadow-[0_-18px_40px_-28px] shadow-verde-profundo/25 md:p-7 lg:mx-10 lg:-mt-24 lg:flex lg:items-center lg:gap-8 lg:px-8 lg:py-6">
      <section aria-labelledby="hero-sedes-label" className="min-w-0 lg:flex-1">
        <h2 id="hero-sedes-label" className="mb-3 text-[12px] font-semibold tracking-[1.8px] text-salvia uppercase">
          {tarjeta.sedeLabel}
        </h2>
        <ul className="flex flex-col gap-2 sm:flex-row">
          {sedes.lista.map((s) => {
            const selected = s.id === sede;
            return (
              <li
                key={s.id}
                className={cn(
                  "flex min-h-14 flex-1 items-center gap-2 rounded-full border transition-colors",
                  selected
                    ? "border-verde-profundo bg-verde-profundo text-crema-claro"
                    : "border-linea-tag text-verde-profundo hover:border-verde-profundo",
                )}
              >
                <button
                  type="button"
                  aria-pressed={selected}
                  onClick={() => onSelect?.(s.id)}
                  className="flex min-h-14 min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-full py-2 pl-6 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-verde-profundo"
                >
                  <span className="min-w-0">
                    <span className="block text-[15px] leading-tight font-semibold">{s.nombre}</span>
                    {s.detalle && (
                      <span className={cn("block text-[13px] leading-tight", selected ? "text-niebla" : "text-musgo")}>
                        {s.detalle}
                      </span>
                    )}
                  </span>
                  {s.badge && (
                    <span
                      className={cn(
                        "ml-auto shrink-0 rounded-full border px-3 py-1 text-[11px] font-semibold tracking-[1.4px] uppercase",
                        selected
                          ? "border-crema-claro/50 text-crema-claro"
                          : "mr-4 border-verde-profundo/40 text-verde-profundo/80",
                      )}
                    >
                      {s.badge}
                    </span>
                  )}
                </button>
                {selected && (
                  <a
                    href={tarjeta.horarios.href}
                    onClick={(e) => {
                      const destino = document.getElementById("horario");
                      if (!destino) return;
                      e.preventDefault();
                      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
                      destino.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
                    }}
                    className="group mr-3 inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full px-3 text-[14px] font-semibold text-lima-claro no-underline focus-visible:outline-2 focus-visible:outline-lima-claro"
                  >
                    <span className="underline decoration-1 underline-offset-4 group-hover:decoration-2">
                      {tarjeta.horarios.label}
                    </span>
                    <span aria-hidden="true">→</span>
                  </a>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <div className="mt-5 flex items-center gap-4 lg:mt-0">
        <div className="flex items-center gap-2.5" aria-label={tarjeta.ratingLabel} role="img">
          <span className="font-tf-serif text-[40px] leading-none">{tarjeta.rating}</span>
          <span>
            <span className="flex text-verde-profundo">
              {Array.from({ length: 5 }, (_, i) => (
                <Star key={i} className="size-3.5" />
              ))}
            </span>
            <span className="mt-0.5 block text-[12px] text-salvia">{tarjeta.ratingDetalle}</span>
          </span>
        </div>

        <PillLink
          href={tarjeta.reservar.href}
          variant="verde"
          className="ml-auto min-h-[52px] px-8 text-[15px] font-semibold lg:ml-0"
        >
          {tarjeta.reservar.label}
        </PillLink>
      </div>
    </div>
  );
}
