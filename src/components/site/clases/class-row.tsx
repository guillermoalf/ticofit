import { landing, type Landing } from "@/content/landing";
import { cn } from "@/lib/utils";
import { PillLink } from "../pill-link";
import { Photo } from "../photo";

type Clase = Landing["clases"]["items"][number];

/** One editorial row on /clases; `reverse` alternates the image side. */
export function ClassRow({ clase, reverse }: { clase: Clase; reverse: boolean }) {
  return (
    <article
      className={cn(
        "flex flex-wrap gap-11 border-t border-linea py-9",
        reverse ? "flex-row-reverse" : "flex-row",
      )}
    >
      <Photo
        img={clase.img}
        sizes="(min-width: 1024px) 50vw, 100vw"
        className="min-h-[320px] min-w-0 flex-[1_1_420px] rounded-2xl md:min-h-[440px]"
      />
      <div className="flex min-w-0 flex-[1_1_360px] flex-col justify-center">
        <p className="mb-3.5 text-[11px] tracking-[2.6px] text-salvia">{clase.sedeLabel}</p>
        <h2 className="font-tf-serif text-[40px] leading-[1.02] font-normal md:text-[52px]">{clase.nombre}</h2>
        <p className="mt-[18px] max-w-[460px] text-[17px] leading-[1.65] text-musgo">{clase.descripcion}</p>
        <div className="mt-6 flex flex-wrap gap-2">
          {clase.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-linea-tag px-4 py-[7px] text-[12px] tracking-[1.2px] text-oliva"
            >
              {tag}
            </span>
          ))}
        </div>
        <PillLink
          href={landing.clases.cta.href}
          variant="outline"
          className="mt-7 min-h-[46px] self-start px-7 text-[13px] tracking-[1.2px]"
        >
          {landing.clases.cta.label}
        </PillLink>
      </div>
    </article>
  );
}
