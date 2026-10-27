import type { Metadata } from "next";

import { landing } from "@/content/landing";
import { Photo } from "@/components/site/photo";
import { PillLink } from "@/components/site/pill-link";

const { numa } = landing;

export const metadata: Metadata = {
  title: landing.meta.numa.title,
  description: landing.meta.numa.description,
};

export default function NumaPage() {
  const filas = Array.from({ length: numa.menu.filasPorCategoria }, (_, i) => i);

  return (
    <>
      <section className="flex flex-wrap gap-12 bg-amarillo-verde px-5 py-[88px] lg:px-12">
        <div className="min-w-0 flex-[999_1_480px]">
          <span className="inline-block rounded-full border border-verde-profundo px-[18px] py-[7px] text-[11px] tracking-[2.4px]">
            {numa.badge}
          </span>
          <h1 className="mt-6 font-tf-serif text-[52px] leading-[0.98] font-normal md:text-[78px]">
            {numa.titulo}
            <br />
            <span className="italic">{numa.tituloItalico}</span>
          </h1>
          <p className="mt-[26px] max-w-[540px] text-[18px] leading-[1.6] text-oliva">{numa.texto}</p>
          <p className="mt-5 max-w-[540px] text-[15px] leading-[1.6] text-oliva">{numa.pendiente}</p>
        </div>
        <Photo
          img={numa.img}
          sizes="(min-width: 1024px) 40vw, 100vw"
          className="min-h-[420px] min-w-0 flex-[1_1_360px] rounded-[28px]"
        />
      </section>

      <section className="px-5 py-[88px] lg:px-12">
        <h2 className="mb-2.5 font-tf-serif text-[40px] leading-[1.04] font-normal md:text-[48px]">
          {numa.menu.titulo}
        </h2>
        <p className="mb-11 max-w-[560px] text-[16px] leading-[1.6] text-musgo">{numa.menu.texto}</p>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {numa.menu.categorias.map((cat) => (
            <article key={cat.nombre} className="flex min-h-[280px] flex-col rounded-3xl border border-linea p-8">
              <h3 className="font-tf-serif text-[30px] font-normal">{cat.nombre}</h3>
              <p className="mt-3 text-[15px] leading-[1.6] text-musgo">{cat.descripcion}</p>
              <div className="mt-[26px] flex flex-col gap-3.5">
                {filas.map((i) => (
                  <div
                    key={i}
                    className="flex justify-between gap-4 border-b border-crema-suave pb-3 text-[14px] text-salvia"
                  >
                    <span>{numa.menu.fila.producto}</span>
                    <span>{numa.menu.fila.precio}</span>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="flex flex-wrap items-center gap-8 bg-verde-profundo px-5 py-16 lg:px-12">
        <p className="min-w-0 flex-[999_1_460px] font-tf-serif text-[30px] leading-[1.3] text-crema-claro md:text-[34px]">
          {numa.cierre.texto}
        </p>
        <PillLink href={numa.cierre.cta.href} variant="lima" className="min-h-[52px] px-[34px] text-[16px]">
          {numa.cierre.cta.label}
        </PillLink>
      </section>
    </>
  );
}
