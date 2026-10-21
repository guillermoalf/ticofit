import { ArrowUpRight } from "lucide-react";
import { Section, SectionHead } from "@/components/ui/section";
import { Card } from "@/components/ui/card";
import { Reveal } from "@/components/motion/reveal";
import { SERVICES, formatCRC, waLink } from "@/content/site";

export function Servicios() {
  return (
    <Section id="servicios">
      <SectionHead
        eyebrow="Servicios"
        title="Planes pensados alrededor de tu objetivo"
        description="Precios de referencia. La propuesta final se define tras tu evaluación inicial — escribinos y la ajustamos a vos."
      />

      <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {SERVICES.map((service, i) => (
          <Reveal key={service.id} delay={i * 0.06}>
            <Card
              href={waLink(`¡Hola! Me interesa: ${service.title}.`)}
              interactive
              className="group flex h-full flex-col"
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-display text-xl font-semibold">
                  {service.title}
                </h3>
                <ArrowUpRight
                  size={18}
                  className="mt-1 shrink-0 text-muted-2 transition-colors group-hover:text-primary"
                />
              </div>
              <p className="mt-3 flex-1 text-sm leading-relaxed text-muted">
                {service.description}
              </p>
              <div className="mt-6 border-t border-border pt-4">
                <p>
                  <span className="text-xs text-muted-2">Desde </span>
                  <span className="font-display text-2xl font-bold text-ink">
                    {formatCRC(service.price)}
                  </span>
                  <span className="text-muted-2"> / {service.unit}</span>
                </p>
                <p className="mt-1 text-xs text-muted-2">
                  Consultá tu plan a medida
                </p>
              </div>
            </Card>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
