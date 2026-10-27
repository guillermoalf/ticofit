import type { Metadata } from "next";

import { landing } from "@/content/landing";
import { Photo } from "@/components/site/photo";
import { SiteFooter } from "@/components/site/site-footer";

const { comunidad } = landing;

export const metadata: Metadata = {
  title: landing.meta.comunidad.title,
  description: landing.meta.comunidad.description,
};

export default function ComunidadPage() {
  const equipo = Array.from({ length: comunidad.equipo.cantidad }, (_, i) => i);

  return (
    <>
      <section className="flex flex-wrap gap-12 px-5 py-[88px] lg:px-12">
        <div className="min-w-0 flex-[999_1_480px]">
          <h1 className="font-tf-serif text-[48px] leading-none font-normal md:text-[68px]">{comunidad.titulo}</h1>
          <p className="mt-6 max-w-[560px] text-[18px] leading-[1.6] text-musgo">{comunidad.texto}</p>
          <p className="mt-[18px] max-w-[560px] text-[16px] leading-[1.6] text-salvia">{comunidad.pendiente}</p>
        </div>
        <Photo
          img={comunidad.img}
          sizes="(min-width: 1024px) 40vw, 100vw"
          className="min-h-[380px] min-w-0 flex-[1_1_360px] rounded-[28px]"
        />
      </section>

      <section className="px-5 pb-[88px] lg:px-12">
        <h2 className="mb-8 font-tf-serif text-[36px] leading-[1.04] font-normal md:text-[44px]">
          {comunidad.equipo.titulo}
        </h2>
        <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
          {equipo.map((i) => (
            <article key={i}>
              <div className="flex h-[200px] items-center justify-center rounded-[20px] bg-crema-suave text-[13px] text-salvia md:h-[260px]">
                {comunidad.equipo.retrato}
              </div>
              <h3 className="mt-4 mb-1 font-tf-serif text-[24px] font-normal">{comunidad.equipo.nombre}</h3>
              <p className="text-[14px] text-salvia">{comunidad.equipo.rol}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="flex flex-wrap items-center gap-10 bg-amarillo-verde px-5 py-[72px] lg:px-12">
        <div className="min-w-0 flex-[1_1_280px]">
          <p className="font-tf-serif text-[72px] leading-none">{comunidad.resenas.rating}</p>
          <p className="mt-2 text-[16px] text-oliva">{comunidad.resenas.cantidadLabel}</p>
        </div>
        <p className="min-w-0 flex-[999_1_460px] font-tf-serif text-[26px] leading-[1.35] md:text-[30px]">
          {comunidad.resenas.pendiente}
        </p>
      </section>

      <SiteFooter />
    </>
  );
}
