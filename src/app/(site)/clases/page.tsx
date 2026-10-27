import type { Metadata } from "next";

import { landing } from "@/content/landing";
import { ClassFilter } from "@/components/site/clases/class-filter";
import { PillLink } from "@/components/site/pill-link";

const { clases } = landing;

export const metadata: Metadata = {
  title: landing.meta.clases.title,
  description: landing.meta.clases.description,
};

export default function ClasesPage() {
  return (
    <>
      <section className="flex flex-wrap items-end gap-12 px-5 pt-14 pb-11 lg:px-10">
        <h1 className="min-w-0 flex-[1_1_420px] font-tf-serif text-[46px] leading-[0.98] font-normal md:text-[72px]">
          {clases.titulo}
          <br />
          <span className="italic">{clases.tituloItalico}</span>
        </h1>
        <p className="mb-2.5 min-w-0 flex-[1_1_360px] text-[17px] leading-[1.65] text-musgo">{clases.texto}</p>
      </section>

      <ClassFilter />

      <section className="mt-10 flex flex-wrap items-center gap-10 bg-banda-salvia px-5 py-[72px] lg:px-10">
        <div className="min-w-0 flex-[999_1_480px]">
          <h2 className="mb-3 font-tf-serif text-[36px] leading-[1.04] font-normal text-banda-tinta md:text-[44px]">
            {clases.cierre.titulo}
          </h2>
          <p className="max-w-[560px] text-[16px] leading-[1.65] text-banda-tinta">{clases.cierre.texto}</p>
        </div>
        <PillLink href={clases.cierre.cta.href} variant="tinta" className="min-h-[50px] px-8 text-[15px]">
          {clases.cierre.cta.label}
        </PillLink>
      </section>
    </>
  );
}
