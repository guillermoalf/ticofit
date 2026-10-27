import { Figtree, Instrument_Serif } from "next/font/google";

import { siteCssVars } from "@/config/brand";
import { SiteHeader } from "@/components/site/site-header";

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  display: "swap",
});

const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

/**
 * Public site shell: brand fonts, colour tokens and the shared header.
 * Font options mirror BRAND.fonts (next/font needs literals here).
 */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={siteCssVars()}
      className={`site-root ${instrumentSerif.variable} ${figtree.variable} min-h-screen bg-crema-claro font-tf-sans text-verde-profundo`}
    >
      <SiteHeader />
      <main>{children}</main>
    </div>
  );
}
