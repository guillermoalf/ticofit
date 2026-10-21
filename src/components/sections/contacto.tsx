import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Section } from "@/components/ui/section";
import { Reveal } from "@/components/motion/reveal";
import { WhatsAppIcon, InstagramIcon, TikTokIcon } from "@/components/icons";
import { SITE, SOCIALS, waLink } from "@/content/site";

const socials = [
  { href: SOCIALS.instagram, label: "Instagram", Icon: InstagramIcon },
  { href: SOCIALS.tiktok, label: "TikTok", Icon: TikTokIcon },
  { href: SOCIALS.whatsapp, label: "WhatsApp", Icon: WhatsAppIcon },
];

export function Contacto() {
  return (
    <Section id="contacto">
      <Reveal>
        <div className="relative overflow-hidden rounded-card border border-border-strong bg-surface/60 px-6 py-14 text-center sm:px-12">
          <div
            aria-hidden
            className="absolute inset-x-0 -top-24 -z-10 mx-auto h-48 w-[80%] bg-gradient-to-r from-primary/30 via-primary-2/20 to-accent/30 blur-3xl"
          />
          <h2 className="mx-auto max-w-2xl font-display text-3xl font-bold tracking-tight text-balance sm:text-4xl">
            ¿Listo para empezar a entrenar con un plan real?
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-muted">
            Agendá tu evaluación inicial por WhatsApp y armemos juntos el camino
            hacia tu objetivo.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button
              href={waLink("¡Hola! Quiero agendar mi evaluación.")}
              size="lg"
            >
              <WhatsAppIcon className="h-5 w-5" />
              Escribinos por WhatsApp
            </Button>
            <Button href={`mailto:${SITE.email}`} variant="ghost" size="lg">
              <Mail size={18} />
              {SITE.email}
            </Button>
          </div>

          <div className="mt-10 flex items-center justify-center gap-3">
            {socials.map(({ href, label, Icon }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-border text-muted transition-colors hover:border-primary hover:text-ink"
              >
                <Icon className="h-[18px] w-[18px]" />
              </a>
            ))}
          </div>
        </div>
      </Reveal>
    </Section>
  );
}
