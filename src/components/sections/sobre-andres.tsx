import { GraduationCap } from "lucide-react";
import { Section } from "@/components/ui/section";
import { Reveal } from "@/components/motion/reveal";
import { ANDRES } from "@/content/site";

export function SobreAndres() {
  return (
    <Section id="nosotros">
      <div className="grid items-center gap-12 md:grid-cols-2 md:gap-10 lg:grid-cols-[5fr_6fr] lg:gap-16">
        <Reveal>
          <div className="relative">
            <div
              aria-hidden
              className="absolute -inset-5 -z-10 rounded-[2rem] bg-gradient-to-br from-accent/25 to-primary/25 blur-2xl"
            />
            <div className="overflow-hidden rounded-card border border-border-strong">
              <video
                src="/about-reel.mp4"
                aria-label="Nuestras instalaciones y forma de entrenar"
                autoPlay
                loop
                muted
                playsInline
                className="h-full w-full object-cover"
              />
            </div>
          </div>
        </Reveal>

        <Reveal delay={0.1}>
          <p className="text-sm font-medium uppercase tracking-widest text-primary">
            Sobre {ANDRES.name}
          </p>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-balance sm:text-4xl">
            {ANDRES.role}
          </h2>
          <p className="mt-3 font-display text-lg text-primary-2">
            {ANDRES.headline}
          </p>

          <div className="mt-6 space-y-4 text-muted">
            {ANDRES.bio.map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </div>

          <ul className="mt-8 flex flex-wrap gap-3">
            {ANDRES.credentials.map((cred) => (
              <li
                key={cred}
                className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/60 px-4 py-2 text-sm text-ink"
              >
                <GraduationCap size={16} className="text-primary" />
                {cred}
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </Section>
  );
}
