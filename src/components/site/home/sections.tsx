import { landing } from "@/content/landing";
import { cn } from "@/lib/utils";
import { Star } from "../icons";
import { Photo } from "../photo";
import { PillLink } from "../pill-link";
import { SmartLink } from "../smart-link";

const { home } = landing;

const photoOverlay =
  "pointer-events-none absolute inset-0 bg-linear-to-t from-overlay-verde/72 to-overlay-verde/5";

export function Hero() {
  const { hero } = home;
  return (
    <section className="px-5 pb-[72px] lg:px-10">
      <Photo
        img={hero.img}
        sizes="100vw"
        priority
        className="flex min-h-[520px] items-end rounded-[20px] p-6 md:min-h-[620px] md:p-14"
      >
        <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-overlay-verde/82 via-overlay-verde/38 via-52% to-overlay-verde/12" />
        <div className="relative max-w-[700px]">
          <h1 className="font-tf-serif text-[44px] leading-[0.98] font-normal text-crema-claro md:text-[76px]">
            {hero.titulo}
            <br />
            <span className="italic">{hero.tituloItalico}</span>
          </h1>
          <p className="mt-5 max-w-[460px] text-[17px] leading-[1.55] text-texto-foto">{hero.subtitulo}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <PillLink href={hero.ctas[0].href} variant="lima" className="min-h-12 px-[30px] text-[15px]">
              {hero.ctas[0].label}
            </PillLink>
            <PillLink href={hero.ctas[1].href} variant="outlineCrema" className="min-h-12 px-[30px] text-[15px]">
              {hero.ctas[1].label}
            </PillLink>
          </div>
        </div>
      </Photo>
    </section>
  );
}

export function Intro() {
  const { intro } = home;
  return (
    <section className="flex flex-wrap gap-14 px-5 pb-14 lg:px-10">
      <div className="min-w-0 flex-[1_1_380px]">
        <h2 className="font-tf-serif text-[38px] leading-[1.06] font-normal md:text-[44px]">
          {intro.titulo[0]}
          <br />
          {intro.titulo[1]}
        </h2>
        <PillLink
          href={intro.cta.href}
          variant="outline"
          className="mt-[26px] min-h-[46px] px-[26px] text-[13px] tracking-[1.4px]"
        >
          {intro.cta.label}
        </PillLink>
      </div>
      <div className="min-w-0 flex-[1_1_420px]">
        <p className="mb-4 text-[13px] leading-normal font-semibold tracking-[1.2px] uppercase">{intro.kicker}</p>
        <p className="text-[16px] leading-[1.65] text-musgo">{intro.texto}</p>
      </div>
    </section>
  );
}

export function Tiles() {
  return (
    <section className="px-5 pb-[88px] lg:px-10">
      <div className="grid grid-cols-1 gap-[18px] md:grid-cols-2">
        {home.tiles.map((tile) => (
          <SmartLink key={tile.titulo} href={tile.href} className="group block no-underline">
            <Photo
              img={tile.img}
              sizes="(min-width: 768px) 50vw, 100vw"
              className="flex min-h-[300px] items-end rounded-2xl p-7 md:min-h-[360px]"
            >
              <div className={photoOverlay} />
              <div className="absolute top-5 left-5 flex flex-wrap gap-[7px]">
                {tile.chips.map((chip) => (
                  <span
                    key={chip}
                    className="rounded-full bg-crema-claro/92 px-3 py-[5px] text-[10px] tracking-[1.6px] text-verde-profundo"
                  >
                    {chip}
                  </span>
                ))}
              </div>
              <div className="relative">
                <h3 className="text-[22px] font-semibold tracking-[2.6px] text-crema-claro">{tile.titulo}</h3>
                <p className="mt-1.5 text-[14px] text-texto-foto">{tile.pie}</p>
              </div>
            </Photo>
          </SmartLink>
        ))}
      </div>
    </section>
  );
}

export function ClassesBand() {
  const { clases } = home;
  return (
    <section className="flex flex-wrap gap-12 bg-banda-salvia px-5 py-[72px] lg:px-10">
      <div className="min-w-0 flex-[1_1_320px]">
        <p className="mb-6 font-tf-serif text-[26px] text-banda-tinta">{clases.kicker}</p>
        <ul className="flex flex-col gap-1.5">
          {clases.lista.map((nombre) => (
            <li key={nombre}>
              <SmartLink
                href={clases.href}
                className="font-tf-serif text-[30px] leading-[1.22] tracking-[0.5px] text-banda-tinta no-underline hover:italic md:text-[40px]"
              >
                {nombre}
              </SmartLink>
            </li>
          ))}
        </ul>
        <PillLink
          href={clases.cta.href}
          variant="outlineTinta"
          className="mt-7 min-h-11 px-6 text-[13px] tracking-[1.2px]"
        >
          {clases.cta.label}
        </PillLink>
      </div>
      <div className="min-w-0 flex-[1_1_260px]">
        <p className="text-[15px] leading-[1.7] text-banda-tinta">{clases.texto}</p>
      </div>
      <Photo
        img={clases.img}
        sizes="(min-width: 1024px) 33vw, 100vw"
        className="min-h-[340px] min-w-0 flex-[1_1_320px] rounded-[14px]"
      />
    </section>
  );
}

export function Sedes() {
  const { sedes } = home;
  return (
    <section className="px-5 py-[88px] lg:px-10">
      <h2 className="mb-2.5 text-center font-tf-serif text-[38px] leading-[1.05] font-normal md:text-[46px]">
        {sedes.titulo}
      </h2>
      <p className="mx-auto mb-10 max-w-[540px] text-center text-[16px] leading-[1.6] text-musgo">
        {sedes.textoAntes}
        <strong>{sedes.textoDestacado}</strong>
        {sedes.textoDespues}
      </p>
      <div className="grid grid-cols-1 gap-[18px] md:grid-cols-2">
        {sedes.cards.map((card) => (
          <SmartLink key={card.nombre} href={card.href} className="block no-underline">
            <Photo
              img={card.img}
              sizes="(min-width: 768px) 50vw, 100vw"
              className="flex min-h-[320px] items-end rounded-2xl p-7 md:min-h-[400px]"
            >
              <div
                className={cn(
                  "pointer-events-none absolute inset-0 bg-linear-to-t",
                  card.tono === "teal"
                    ? "from-overlay-teal/72 to-overlay-teal/5"
                    : "from-overlay-verde/72 to-overlay-verde/5",
                )}
              />
              <div className="relative">
                {card.badge && (
                  <span className="mb-2.5 inline-block rounded-full bg-crema-claro/92 px-[13px] py-[5px] text-[10px] tracking-[1.6px] text-teal">
                    {card.badge}
                  </span>
                )}
                <h3 className="text-[20px] font-semibold tracking-[2.4px] text-crema-claro">{card.nombre}</h3>
              </div>
            </Photo>
          </SmartLink>
        ))}
      </div>
    </section>
  );
}

export function Empezar() {
  const { empezar } = home;
  return (
    <section className="flex flex-wrap gap-10 px-5 pb-[88px] lg:px-10">
      <div className="min-w-0 flex-[1_1_340px]">
        <h2 className="mb-3.5 font-tf-serif text-[34px] leading-[1.08] font-normal md:text-[38px]">
          {empezar.titulo}
        </h2>
        <p className="mb-6 max-w-[420px] text-[16px] leading-[1.6] text-musgo">{empezar.texto}</p>
        <PillLink
          href={empezar.cta.href}
          variant="outline"
          className="min-h-[46px] px-[26px] text-[13px] tracking-[1.2px]"
        >
          {empezar.cta.label}
        </PillLink>
      </div>
      <div className="flex min-w-0 flex-[999_1_460px] flex-wrap gap-[18px]">
        {empezar.ofertas.map((oferta) => (
          <article key={oferta.titulo} className="flex min-w-0 flex-[1_1_220px] flex-col rounded-2xl bg-crema-card p-7">
            <h3 className="text-[13px] font-semibold tracking-[2px]">{oferta.titulo}</h3>
            <p className="mt-3.5 text-[15px] leading-[1.55] text-musgo">{oferta.texto}</p>
            <p className="mt-[22px] font-tf-serif text-[32px]">
              {oferta.precio}{" "}
              <span className="font-tf-sans text-[13px] text-musgo">{empezar.ivaLabel}</span>
            </p>
            <PillLink
              href={oferta.cta.href}
              variant="verde"
              className="mt-5 min-h-11 text-[13px] tracking-[1.2px]"
            >
              {oferta.cta.label}
            </PillLink>
          </article>
        ))}
      </div>
    </section>
  );
}

export function WideCta() {
  const { ctaAncho } = home;
  return (
    <section className="px-5 pb-[88px] lg:px-10">
      <Photo
        img={ctaAncho.img}
        sizes="100vw"
        className="flex min-h-[440px] flex-col items-center justify-center rounded-[20px] p-6 text-center md:p-12"
      >
        <div className="pointer-events-none absolute inset-0 bg-overlay-verde/58" />
        <h2 className="relative font-tf-serif text-[40px] leading-[1.04] font-normal text-crema-claro md:text-[52px]">
          {ctaAncho.titulo}
        </h2>
        <p className="relative mt-3.5 text-[17px] text-texto-foto">{ctaAncho.texto}</p>
        <PillLink href={ctaAncho.cta.href} variant="lima" className="relative mt-7 min-h-12 px-8 text-[15px]">
          {ctaAncho.cta.label}
        </PillLink>
      </Photo>
    </section>
  );
}

export function Reviews() {
  const { resenas } = home;
  return (
    <section className="px-5 pb-[88px] lg:px-10">
      <div className="mb-[26px] flex flex-wrap items-center gap-7">
        <p className="font-tf-serif text-[56px] leading-none">{resenas.rating}</p>
        <div>
          <div className="flex gap-[3px]" role="img" aria-label={resenas.estrellasLabel}>
            {[0, 1, 2, 3, 4].map((i) => (
              <Star key={i} />
            ))}
          </div>
          <p className="mt-1.5 text-[14px] text-musgo">{resenas.cantidadLabel}</p>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-[18px] md:grid-cols-3">
        {resenas.placeholders.map((r, i) => (
          <article key={i} className="rounded-2xl border border-linea p-[26px]">
            <p className="text-[15px] leading-[1.6] text-musgo">{r.texto}</p>
            <p className="mt-[18px] text-[14px] font-semibold">{r.autor}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
