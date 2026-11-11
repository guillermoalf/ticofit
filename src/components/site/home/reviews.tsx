import { landing } from "@/content/landing";
import { reviews } from "@/content/reviews";
import { Star } from "../icons";

const { resenas } = landing.home;

/**
 * Google rating on the left; every review on the right, in full, as quiet
 * cards in a two-column masonry (CSS columns), so a long review never gets
 * truncated and a short one never leaves a hole. Static: no carousel.
 */
export function Reviews() {
  if (reviews.length === 0) return null;

  return (
    <div className="flex flex-col gap-10 md:flex-row md:gap-16">
      <div className="shrink-0 md:w-[220px]">
        <p className="mb-5 text-[13px] font-semibold tracking-[1.2px] uppercase">{resenas.eyebrow}</p>
        <p className="font-tf-serif text-[72px] leading-none">{resenas.rating}</p>
        <div className="mt-3 flex gap-[3px]" role="img" aria-label={resenas.estrellasLabel}>
          {Array.from({ length: 5 }, (_, i) => (
            <Star key={i} />
          ))}
        </div>
        <p className="mt-2 text-[14px] text-musgo">{resenas.cantidadLabel}</p>
        <a
          href={resenas.verTodas.href}
          target="_blank"
          rel="noopener noreferrer"
          className="group mt-5 inline-flex min-h-11 items-center gap-1.5 text-[15px] font-semibold text-verde-profundo no-underline"
        >
          <span className="underline decoration-1 underline-offset-4 group-hover:decoration-2">
            {resenas.verTodas.label}
          </span>
          <span aria-hidden="true">→</span>
        </a>
      </div>

      <ul className="min-w-0 flex-1 gap-[18px] md:columns-2">
        {reviews.map((r) => (
          <li key={r.nombre} className="mb-[18px] break-inside-avoid last:mb-0 md:last:mb-[18px]">
            <figure className="flex flex-col rounded-2xl bg-crema-card p-7">
              <span className="flex gap-[2px]" role="img" aria-label={`${r.estrellas} de 5 estrellas`}>
                {Array.from({ length: r.estrellas }, (_, k) => (
                  <Star key={k} className="size-3.5" />
                ))}
              </span>
              <blockquote className="mt-4 font-tf-serif text-[21px] leading-[1.35] italic md:text-[23px]">
                “{r.texto}”
              </blockquote>
              <figcaption className="mt-6 text-[14px]">
                <span className="block font-semibold">{r.nombre}</span>
                <span className="block text-[13px] text-musgo">{resenas.fuente}</span>
              </figcaption>
            </figure>
          </li>
        ))}
      </ul>
    </div>
  );
}
