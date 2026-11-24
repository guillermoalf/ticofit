import { siteCssVars } from "@/config/brand";
import { displaySerif } from "@/lib/fonts";
import { SiteHeader } from "@/components/site/site-header";

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
