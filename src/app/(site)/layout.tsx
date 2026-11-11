import { Instrument_Serif } from "next/font/google";

import { siteCssVars } from "@/config/brand";
import { SiteHeader } from "@/components/site/site-header";

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  display: "swap",
});

/**
 * Public site shell: display font, colour tokens and the shared header.
 * Google Sans (body) is loaded once in the root layout. Instrument Serif is a
 * stand-in until the Trendsetter Prestige files arrive.
 */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={siteCssVars()}
      className={`site-root ${instrumentSerif.variable} min-h-screen bg-crema-claro font-tf-sans text-verde-profundo`}
    >
      <SiteHeader />
      <main>{children}</main>
    </div>
  );
}
