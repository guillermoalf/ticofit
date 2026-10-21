import { Navbar } from "@/components/sections/navbar";
import { Hero } from "@/components/sections/hero";
import { Marquee } from "@/components/sections/marquee";
import { Servicios } from "@/components/sections/servicios";
import { SobreAndres } from "@/components/sections/sobre-andres";
import { Ubicacion } from "@/components/sections/ubicacion";
import { Contacto } from "@/components/sections/contacto";
import { Footer } from "@/components/sections/footer";

/**
 * The public marketing landing, composed. Rendered at `/` only when
 * `BRAND.showLanding` is true; otherwise the root route redirects to /login
 * and this never loads. Copy comes from `src/content/site.ts`.
 */
export function Landing() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <Marquee />
        <Servicios />
        <SobreAndres />
        <Ubicacion />
        <Contacto />
      </main>
      <Footer />
    </>
  );
}
