import type { Metadata } from "next";

import { landing, type SedeId } from "@/content/landing";
import { SedeTabs } from "@/components/site/sede-tabs";
import { CafePanel, PavasPanel } from "@/components/site/sedes/sede-panels";

const { sedes } = landing;

export const metadata: Metadata = {
  title: landing.meta.sedes.title,
  description: landing.meta.sedes.description,
};

export default async function SedesPage({
  searchParams,
}: {
  searchParams: Promise<{ sede?: string }>;
}) {
  const { sede } = await searchParams;
  const initial: SedeId = sede === "cafe" || sede === "pavas" ? sede : sedes.porDefecto;

  return (
    <SedeTabs
      key={initial}
      label={sedes.tabsLabel}
      tabs={sedes.tabs}
      initial={initial}
      tone="light"
      introClassName="px-5 pt-[72px] pb-10 lg:px-12"
      intro={
        <>
          <h1 className="mb-3 font-tf-serif text-[44px] leading-[1.02] font-normal md:text-[64px]">{sedes.titulo}</h1>
          <p className="mb-10 max-w-[580px] text-[17px] leading-[1.6] text-musgo">{sedes.texto}</p>
        </>
      }
      panels={{ pavas: <PavasPanel />, cafe: <CafePanel /> }}
    />
  );
}
