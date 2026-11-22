import type { Metadata } from "next";

import { landing } from "@/content/landing";
import { ComunidadEscenas } from "@/components/site/comunidad-escenas";
import { SiteFooter } from "@/components/site/site-footer";

export const metadata: Metadata = {
  title: landing.meta.comunidad.title,
  description: landing.meta.comunidad.description,
};

export default function ComunidadPage() {
  return (
    <>
      <h1 className="sr-only">{landing.comunidad.titulo}</h1>
      <ComunidadEscenas />
      <SiteFooter />
    </>
  );
}
