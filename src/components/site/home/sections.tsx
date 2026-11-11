import { existsSync } from "node:fs";
import path from "node:path";
import { Suspense } from "react";

import { BRAND } from "@/config/brand";
import { landing } from "@/content/landing";
import { Photo } from "../photo";
import { PillLink } from "../pill-link";
import { SmartLink } from "../smart-link";
import { HeroCard } from "./hero-card";
import { HeroSlider } from "./hero-slider";
import { Horario } from "./horario";
import { IntroSession } from "./intro-session";
import { Reviews } from "./reviews";

const { home } = landing;

const photoOverlay =
  "pointer-events-none absolute inset-0 bg-linear-to-t from-overlay-verde/72 to-overlay-verde/5";

/**
 * Full-bleed service slider under a transparent header, with the cream sede
 * card riding up over its bottom edge. Figure PNGs are optional: the server
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
    <section className="pb-[72px]">
      <h1 className="sr-only">{BRAND.name}</h1>
      <HeroSlider figuras={figuras} />
      <HeroCard />
      <IntroSession />
    </section>
  );
}

export function Intro() {
  const { intro } = home;
  return (
    <section className="flex flex-wrap gap-14 px-5 pb-14 lg:px-10">
      <div className="min-w-0 flex-[1_1_380px]">
        <p className="mb-4 text-[13px] leading-normal font-semibold tracking-[1.2px] uppercase">{intro.eyebrow}</p>
        <h2 className="font-tf-serif text-[38px] leading-[1.06] font-normal md:text-[44px]">
          {intro.titulo} <span className="italic">{intro.tituloItalico}</span>
        </h2>
        <PillLink
          href={intro.cta.href}
          variant="outline"
          className="mt-[26px] min-h-[46px] px-[26px] text-[13px] tracking-[1.4px]"
        >
          {intro.cta.label}
        </PillLink>
      </div>
      <div className="min-w-0 flex-[1_1_420px] md:pt-[34px]">
        <p className="text-[16px] leading-[1.65] text-musgo">{intro.texto}</p>
      </div>
    </section>
  );
}

export function Tiles() {
  return (
    <section className="px-5 pb-[88px] lg:px-10">
      <div className="grid grid-cols-1 gap-[18px] md:grid-cols-2">
        {home.tiles.map((tile) => (
          <SmartLink key={tile.titulo} href={tile.href} className="group block no-underline">
            <Photo
              img={tile.img}
              sizes="(min-width: 768px) 50vw, 100vw"
              className="flex min-h-[300px] items-end rounded-2xl p-7 md:min-h-[360px]"
            >
              <div className={photoOverlay} />
              <div className="absolute top-5 left-5 flex flex-wrap gap-[7px]">
                {tile.chips.map((chip) => (
                  <span
                    key={chip}
                    className="rounded-full bg-crema-claro/92 px-3 py-[5px] text-[10px] tracking-[1.6px] text-verde-profundo"
                  >
                    {chip}
                  </span>
                ))}
              </div>
              <div className="relative">
                <h3 className="text-[22px] font-semibold tracking-[2.6px] text-crema-claro">{tile.titulo}</h3>
                <p className="mt-1.5 text-[14px] text-texto-foto">{tile.pie}</p>
              </div>
            </Photo>
          </SmartLink>
        ))}
      </div>
    </section>
  );
}

/** Public schedule, the target of every "Clases" / "Ver horarios" link. */
export function HorarioSection() {
  const { horario } = home;
  return (
    <section id={horario.id} className="scroll-mt-6 px-5 pb-[88px] lg:px-10">
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

export function Empezar() {
  const { empezar } = home;
  return (
    <section id={empezar.id} className="flex scroll-mt-6 flex-wrap gap-10 px-5 pb-[88px] lg:px-10">
      <div className="min-w-0 flex-[1_1_340px]">
        <h2 className="mb-3.5 font-tf-serif text-[34px] leading-[1.08] font-normal md:text-[38px]">
          {empezar.titulo}
        </h2>
        <p className="mb-6 max-w-[420px] text-[16px] leading-[1.6] text-musgo">{empezar.texto}</p>
        <PillLink
          href={empezar.cta.href}
          variant="outline"
          className="min-h-[46px] px-[26px] text-[13px] tracking-[1.2px]"
        >
          {empezar.cta.label}
        </PillLink>
      </div>
      <div className="flex min-w-0 flex-[999_1_460px] flex-wrap gap-[18px]">
        {empezar.ofertas.map((oferta) => (
          <article key={oferta.titulo} className="flex min-w-0 flex-[1_1_220px] flex-col rounded-2xl bg-crema-card p-7">
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
    <section className="border-t border-linea px-5 py-[88px] lg:px-10">
      <Reviews />
    </section>
  );
}
