import type { Metadata } from "next";

import { landing } from "@/content/landing";
import { LoopVideo } from "@/components/site/loop-video";
import { PANEL } from "@/components/site/panel";
import { SiteFooter } from "@/components/site/site-footer";
import { SmartLink } from "@/components/site/smart-link";
import { cn } from "@/lib/utils";

const { comunidad } = landing;
const { hero, momentos, resenas, cierre } = comunidad;

export const metadata: Metadata = {
  title: landing.meta.comunidad.title,
  description: landing.meta.comunidad.description,
};

export default function ComunidadPage() {
  return (
    <>
      <section className="relative h-[86svh] min-h-[520px] md:h-[min(88svh,56.25vw)]">
        <LoopVideo
          movil={hero.vertical}
          ancho={hero.horizontal}
          alt={hero.alt}
          className="absolute inset-0"
        />
        {/* Darkens only the bottom, where the title sits, so cream text holds AA. */}
        <div className="absolute inset-0 bg-gradient-to-t from-verde-profundo/85 via-verde-profundo/25 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 px-5 pb-10 text-crema-claro lg:px-10 lg:pb-14">
          <p className="mb-3 text-[12px] font-semibold tracking-[2.4px] uppercase">{hero.kicker}</p>
          <h1 className="font-tf-serif text-[52px] leading-[0.95] font-normal md:text-[clamp(64px,8vw,120px)]">
            {hero.titulo} <span className="italic">{hero.tituloItalico}</span>
          </h1>
        </div>
      </section>

      <section className={cn(PANEL, "bg-crema-claro")}>
        <p className="max-w-[760px] font-tf-serif text-[28px] leading-[1.3] md:text-[38px]">{comunidad.texto}</p>

        <div className="mt-14 grid gap-12 md:grid-cols-3 md:gap-6 lg:mt-20">
          {momentos.map((m) => (
            <article key={m.titulo}>
              <LoopVideo movil={{ video: m.video, poster: m.poster }} alt={m.alt} className="aspect-[4/5] rounded-2xl" />
              <p className="mt-5 text-[12px] font-semibold tracking-[1.8px] text-salvia uppercase">{m.kicker}</p>
              <h2 className="mt-2 font-tf-serif text-[30px] leading-[1.08] font-normal lg:text-[34px]">{m.titulo}</h2>
              <p className="mt-2 text-[16px] leading-[1.55] text-musgo">{m.texto}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={cn(PANEL, "flex flex-wrap items-center gap-10 bg-amarillo-verde")}>
        <div className="min-w-0 flex-[1_1_280px]">
          <p className="font-tf-serif text-[72px] leading-none">{resenas.rating}</p>
          <p className="mt-2 text-[16px] text-oliva">{resenas.cantidadLabel}</p>
        </div>
        <p className="min-w-0 flex-[999_1_460px] font-tf-serif text-[26px] leading-[1.35] md:text-[30px]">
          {resenas.pendiente}
        </p>
      </section>

      <section className={cn(PANEL, "bg-verde-profundo text-crema-claro")}>
        <p className="font-tf-serif text-[40px] leading-[1.05] md:text-[clamp(48px,6vw,80px)]">
          {cierre.titulo} <span className="text-lima-claro italic">{cierre.tituloItalico}</span>
        </p>
        <SmartLink
          href={cierre.link.href}
          className="group mt-8 inline-flex items-center gap-2 text-[17px] font-semibold text-lima-claro"
        >
          <span className="underline decoration-1 underline-offset-[6px]">{cierre.link.label}</span>
          <span aria-hidden="true" className="transition-transform group-hover:translate-x-1">
            →
          </span>
        </SmartLink>
      </section>

      <SiteFooter />
    </>
  );
}
