import { existsSync } from "node:fs";
import path from "node:path";
import { Suspense } from "react";

import { BRAND } from "@/config/brand";
import { cn } from "@/lib/utils";
import { landing } from "@/content/landing";
import { PANEL, TONOS_CLAROS } from "../panel";
import { PillLink } from "../pill-link";
import { HeroSlider } from "./hero-slider";
import { Horario } from "./horario";
import { IntroSession } from "./intro-session";
import { Reviews } from "./reviews";
import { SedeSelector } from "./sede-selector";
import { SoloSede } from "./ubicacion";

const { home } = landing;

/**
 * Full-bleed service slider under a transparent header, then the sede picker
 * that filters the rest of the page. Figure PNGs are optional: the server
 * checks public/hero so a missing file renders a placeholder, not a 404.
 */
export function Hero() {
  const figuras = Object.fromEntries(
    home.hero.slides.map((slide) => [
      slide.id,
      existsSync(path.join(process.cwd(), "public", slide.figura.src)),
    ]),
  );
  return (
    <section>
      <h1 className="sr-only">{BRAND.name}</h1>
      <HeroSlider figuras={figuras} />
      {/* Last element of the intro sequence: its animationend ends the intro. */}
      <div className="tf-intro-cta px-5 pt-14 pb-16 lg:px-10 lg:pt-20 lg:pb-24">
        {/* useSearchParams needs a boundary to keep the page static. */}
        <Suspense>
          <SedeSelector />
        </Suspense>
      </div>
      <IntroSession />
    </section>
  );
}

/** Public schedule, the target of every "Clases" / "Ver horarios" link. */
export function HorarioSection() {
  const { horario } = home;
  return (
    <section id={horario.id} className={cn(PANEL, TONOS_CLAROS, "scroll-mt-6 bg-crema-card text-verde-profundo")}>
      <div className="mb-6">
        <div>
          <p className="mb-4 text-[13px] leading-normal font-semibold tracking-[1.2px] uppercase">{horario.eyebrow}</p>
          <h2 className="font-tf-serif text-[38px] leading-[1.06] font-normal md:text-[44px]">
            {horario.titulo} <span className="italic">{horario.tituloItalico}</span>
          </h2>
        </div>
      </div>
      {/* useSearchParams needs a boundary to keep the page static. */}
      <Suspense>
        <Horario />
      </Suspense>
    </section>
  );
}

/** Single-class offers: classes only exist at Parque del Café, so it follows the sede switch. */
export function Empezar() {
  return (
    <Suspense>
      <SoloSede sede="cafe">
        <EmpezarContenido />
      </SoloSede>
    </Suspense>
  );
}

function EmpezarContenido() {
  const { empezar } = home;
  return (
    <section id={empezar.id} className={cn(PANEL, "flex scroll-mt-6 flex-wrap gap-10 bg-verde-profundo text-crema-claro")}>
      <div className="min-w-0 flex-[1_1_340px]">
        <h2 className="mb-3.5 font-tf-serif text-[34px] leading-[1.08] font-normal md:text-[38px]">
          {empezar.titulo}
        </h2>
        <p className="max-w-[420px] text-[16px] leading-[1.6] text-niebla">{empezar.texto}</p>
      </div>
      <div className="flex min-w-0 flex-[999_1_460px] flex-wrap gap-[18px]">
        {empezar.ofertas.map((oferta) => (
          <article key={oferta.titulo} className="flex min-w-0 flex-[1_1_220px] flex-col rounded-2xl bg-crema-claro p-7 text-verde-profundo">
            <h3 className="text-[13px] font-semibold tracking-[2px]">{oferta.titulo}</h3>
            <p className="mt-3.5 text-[15px] leading-[1.55] text-musgo">{oferta.texto}</p>
            <p className="mt-[22px] font-tf-serif text-[32px]">
              {oferta.precio}{" "}
              <span className="font-tf-sans text-[13px] text-musgo">{empezar.ivaLabel}</span>
            </p>
            <PillLink
              href={oferta.cta.href}
              variant="verde"
              className="mt-5 min-h-11 text-[13px] tracking-[1.2px]"
            >
              {oferta.cta.label}
            </PillLink>
          </article>
        ))}
      </div>
    </section>
  );
}

export function ResenasSection() {
  return (
    <section className={cn(PANEL, "bg-crema-claro text-verde-profundo")}>
      <Reviews />
    </section>
  );
}
