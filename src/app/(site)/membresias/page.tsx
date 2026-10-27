import type { Metadata } from "next";

import { landing, type SedeId } from "@/content/landing";
import { CafePlans, PavasPlans } from "@/components/site/membresias/plan-panels";
import { PillLink } from "@/components/site/pill-link";
import { SedeTabs } from "@/components/site/sede-tabs";

const { membresias } = landing;

export const metadata: Metadata = {
  title: landing.meta.membresias.title,
  description: landing.meta.membresias.description,
};

export default async function MembresiasPage({
  searchParams,
}: {
  searchParams: Promise<{ sede?: string }>;
}) {
  const { sede } = await searchParams;
  const initial: SedeId = sede === "cafe" || sede === "pavas" ? sede : membresias.porDefecto;

  return (
    <div className="bg-verde-profundo text-crema-claro">
      <SedeTabs
        key={initial}
        label={membresias.tabsLabel}
        tabs={membresias.tabs}
        initial={initial}
        tone="dark"
        introClassName="px-5 pt-[72px] pb-12 text-center lg:px-10"
        intro={
          <>
            <p className="mb-[18px] text-[11px] tracking-[3px] text-lima-claro">{membresias.kicker}</p>
            <h1 className="mx-auto max-w-[760px] font-tf-serif text-[44px] leading-none font-normal md:text-[68px]">
              {membresias.titulo}
              <br />
              <span className="text-lima-claro italic">{membresias.tituloItalico}</span>
            </h1>
            <p className="mx-auto mt-[22px] mb-9 max-w-[540px] text-[17px] leading-[1.6] text-niebla-media">
              {membresias.texto}
            </p>
          </>
        }
        panels={{ pavas: <PavasPlans />, cafe: <CafePlans /> }}
      />

      <section className="flex flex-wrap items-center justify-center gap-6 bg-lima-claro px-5 py-16 text-center text-verde-profundo lg:px-10">
        <div className="min-w-0 flex-[999_1_460px]">
          <h2 className="font-tf-serif text-[34px] leading-[1.06] font-normal md:text-[42px]">{membresias.cta.titulo}</h2>
          <p className="mt-2.5 text-[16px] text-lima-sub">{membresias.cta.texto}</p>
        </div>
        <PillLink
          href={membresias.cta.boton.href}
          variant="verde"
          className="min-h-[52px] px-[34px] text-[15px] font-semibold"
        >
          {membresias.cta.boton.label}
        </PillLink>
      </section>
    </div>
  );
}
