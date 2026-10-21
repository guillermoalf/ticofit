import { MapPin, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Section } from "@/components/ui/section";
import { Reveal } from "@/components/motion/reveal";
import { SITE, LOCATION, SOCIALS, mapsDirectionsUrl, mapsEmbedUrl } from "@/content/site";

/** Schema.org LocalBusiness / HealthClub structured data for SEO. */
const jsonLd = {
  "@context": "https://schema.org",
  "@type": ["HealthClub", "PhysicalTherapy"],
  name: SITE.name,
  description: SITE.description,
  url: SITE.url,
  image: `${SITE.url}/hero-poster.jpg`,
  telephone: `+${SITE.whatsapp}`,
  email: SITE.email,
  address: {
    "@type": "PostalAddress",
    streetAddress: LOCATION.street,
    addressLocality: LOCATION.city,
    addressRegion: LOCATION.region,
    addressCountry: LOCATION.country,
  },
  geo: {
    "@type": "GeoCoordinates",
    latitude: LOCATION.lat,
    longitude: LOCATION.lng,
  },
  sameAs: [SOCIALS.instagram, SOCIALS.tiktok],
};

export function Ubicacion() {
  return (
    <Section id="ubicacion">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="grid gap-10 md:grid-cols-2 md:items-center lg:grid-cols-[5fr_7fr]">
        <Reveal>
          <p className="text-sm font-medium uppercase tracking-widest text-primary">
            Ubicación
          </p>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-balance sm:text-4xl">
            Entrená en {LOCATION.city}
          </h2>
          <p className="mt-4 inline-flex items-center gap-2 text-muted">
            <MapPin size={18} className="text-primary" />
            {LOCATION.label}
          </p>
          <p className="mt-4 max-w-md text-muted">
            Fácil acceso y parqueo. Escribinos y coordinamos tu primera
            visita.
          </p>
          <div className="mt-8">
            <Button href={mapsDirectionsUrl} target="_blank" rel="noopener noreferrer">
              <Navigation size={18} />
              Cómo llegar
            </Button>
          </div>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="overflow-hidden rounded-card border border-border-strong bg-surface/60">
            <iframe
              title={`Mapa de ${SITE.name} en ${LOCATION.label}`}
              src={mapsEmbedUrl}
              className="h-[320px] w-full sm:h-[420px]"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </Reveal>
      </div>
    </Section>
  );
}
