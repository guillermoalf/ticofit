import localFont from "next/font/local";

import { siteCssVars } from "@/config/brand";
import { SiteHeader } from "@/components/site/site-header";

/**
 * Display serif — TRIAL: Antic Didone (SIL OFL), subset to Latin from
 * public/fonts. It ships Regular only, so italics are synthesised.
 */
const displaySerif = localFont({
  variable: "--font-tf-display",
  src: [{ path: "../../fonts/antic-didone.woff2", weight: "400", style: "normal" }],
  display: "swap",
});

/**
 * Public site shell: display font, colour tokens and the shared header.
 * Google Sans (body) is loaded once in the root layout; the display serif is
 * the only other typeface on the site (the logo is an image).
 */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={siteCssVars()}
      className={`site-root ${displaySerif.variable} min-h-screen bg-crema-claro font-tf-sans text-verde-profundo`}
    >
      <SiteHeader />
      <main>{children}</main>
    </div>
  );
}
