import type { Metadata } from "next";

import { BRAND, siteCssVars } from "@/config/brand";
import { displaySerif } from "@/lib/fonts";

export const metadata: Metadata = {
  title: "Ingresar",
  description: `Acceso a ${BRAND.name}.`,
  robots: { index: false, follow: false },
};

/** Site tokens and the display serif, like the public site: the login is its door. */
export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={siteCssVars()} className={`${displaySerif.variable} min-h-dvh bg-celeste font-tf-sans text-verde-profundo`}>
      {children}
    </div>
  );
}
