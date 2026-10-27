import { landing } from "@/content/landing";
import { cn } from "@/lib/utils";
import { Check } from "../icons";
import { Photo } from "../photo";
import { PillLink } from "../pill-link";

const { membresias } = landing;
const { pavas, cafe } = membresias;

const PLAN_TONES = {
  oscuro: {
    card: "bg-verde-noche border-linea-oscura",
    texto: "text-niebla-clara",
    sub: "text-niebla-suave",
    acento: "text-lima-claro",
    boton: "lima",
  },
  medio: {
    card: "bg-verde-medio border-linea-plan",
    texto: "text-niebla-clara",
    sub: "text-niebla-suave",
    acento: "text-lima-claro",
    boton: "lima",
  },
  lima: {
    card: "bg-lima-claro border-lima-claro",
    texto: "text-verde-profundo",
    sub: "text-lima-sub",
    acento: "text-verde-profundo",
    boton: "verde",
  },
} as const;

const kicker = "text-[11px] tracking-[2.4px]";
const sectionTitle = "font-tf-serif text-[36px] leading-[1.04] font-normal md:text-[44px]";

export function PavasPlans() {
  const { openGym, personal } = pavas;
  return (
    <section className="px-5 pb-[72px] lg:px-10">
      <div className="flex flex-wrap gap-[18px]">
        <article className="flex min-w-0 flex-[1_1_380px] flex-col rounded-[18px] bg-lima-claro p-7 text-verde-profundo md:p-10">
          <p className={kicker}>{openGym.kicker}</p>
          <h2 className="mt-3.5 font-tf-serif text-[38px] leading-none font-normal md:text-[44px]">{openGym.nombre}</h2>
          <p className="mt-[22px] font-tf-serif text-[56px] leading-none md:text-[68px]">{openGym.precio}</p>
          <p className="mt-1 text-[14px] text-lima-sub">{membresias.ivaMes}</p>
          <ul className="mt-[30px] flex flex-col gap-[13px] text-[16px]">
            {openGym.incluye.map((item) => (
              <li key={item} className="flex gap-[11px]">
                <Check className="mt-[3px] flex-none" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <PillLink href={openGym.cta.href} variant="verde" className="mt-9 min-h-[52px] text-[15px] font-semibold">
            {openGym.cta.label}
          </PillLink>
        </article>

        <article className="flex min-w-0 flex-[1_1_380px] flex-col rounded-[18px] border border-linea-oscura p-7 md:p-10">
          <p className={cn(kicker, "text-lima-claro")}>{personal.kicker}</p>
          <h2 className="mt-3.5 font-tf-serif text-[38px] leading-none font-normal md:text-[44px]">{personal.nombre}</h2>
          <p className="mt-[18px] text-[16px] leading-[1.6] text-niebla-media">{personal.texto}</p>
          <div className="mt-[26px] mb-9">
            {personal.paquetes.map((p) => (
              <div
                key={p.label}
                className="flex items-baseline justify-between gap-4 border-t border-linea-oscura py-[17px]"
              >
                <span className="text-[16px] text-niebla-clara">{p.label}</span>
                <span className="font-tf-serif text-[28px] whitespace-nowrap text-lima-claro">
                  {p.precio}
                  <span className="font-tf-sans text-[12px] text-niebla-suave">{personal.sufijo}</span>
                </span>
              </div>
            ))}
          </div>
          <PillLink href={personal.cta.href} variant="outlineLima" className="mt-auto min-h-[52px] text-[15px]">
            {personal.cta.label}
          </PillLink>
        </article>
      </div>
    </section>
  );
}

export function CafePlans() {
  const { planes, comparativa, recovery, sueltas } = cafe;
  return (
    <>
      <section className="px-5 pb-16 lg:px-10">
        <div className="grid grid-cols-1 items-stretch gap-[18px] lg:grid-cols-3">
          {planes.map((plan) => {
            const t = PLAN_TONES[plan.tono];
            return (
              <article key={plan.nombre} className={cn("flex flex-col rounded-[18px] border px-8 py-[38px]", t.card)}>
                {plan.badge && (
                  <span className="mb-4 self-start rounded-full bg-lima-claro px-[15px] py-1.5 text-[10px] font-semibold tracking-[2px] text-verde-profundo">
                    {plan.badge}
                  </span>
                )}
                <p className={cn(kicker, t.sub)}>{plan.kicker}</p>
                <h2 className={cn("mt-3 font-tf-serif text-[38px] leading-[1.02] font-normal", t.texto)}>
                  {plan.nombre}
                </h2>
                <p className={cn("mt-5 font-tf-serif text-[52px] leading-none md:text-[58px]", t.acento)}>
                  {plan.precio}
                </p>
                <p className={cn("mt-1 text-[13px]", t.sub)}>{membresias.ivaMes}</p>
                <ul className="mt-7 flex flex-col gap-3">
                  {plan.incluye.map((item) => (
                    <li key={item} className={cn("flex gap-[11px] text-[15px] leading-[1.45]", t.texto)}>
                      <Check size={15} className={cn("mt-[3px] flex-none", t.acento)} />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <PillLink
                  href={plan.cta.href}
                  variant={t.boton}
                  className="mt-[34px] min-h-[50px] text-[15px] font-semibold"
                >
                  {plan.cta.label}
                </PillLink>
              </article>
            );
          })}
        </div>
      </section>

      <section className="px-5 pb-[72px] lg:px-10">
        <h2 className={cn(sectionTitle, "mb-7 text-center")}>
          {comparativa.titulo} <span className="text-lima-claro italic">{comparativa.tituloItalico}</span>
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse">
            <thead>
              <tr>
                <th
                  scope="col"
                  className="border-b border-linea-oscura px-3.5 py-4 text-left text-[11px] font-medium tracking-[2px] text-niebla-suave"
                >
                  {comparativa.encabezado}
                </th>
                {comparativa.columnas.map((col, i) => (
                  <th
                    key={col}
                    scope="col"
                    className={cn(
                      "border-b border-linea-oscura px-3.5 py-4 text-center text-[13px] font-semibold",
                      i === 2 ? "text-lima-claro" : "text-crema-claro",
                    )}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {comparativa.filas.map((f) => (
                <tr key={f.fila}>
                  <th
                    scope="row"
                    className="border-b border-linea-oscura-suave px-3.5 py-[17px] text-left text-[15px] font-normal text-niebla-clara"
                  >
                    {f.fila}
                  </th>
                  {f.valores.map((v, i) => (
                    <td
                      key={i}
                      className={cn(
                        "border-b border-linea-oscura-suave px-3.5 py-[17px] text-center text-[15px]",
                        i === 2 ? "text-lima-claro" : "text-niebla-media",
                      )}
                    >
                      {v}
                    </td>
                  ))}
                </tr>
              ))}
              <tr>
                <th
                  scope="row"
                  className="px-3.5 py-5 text-left text-[13px] font-normal tracking-[1.6px] text-niebla-suave"
                >
                  {comparativa.filaPrecio.label}
                </th>
                {comparativa.filaPrecio.valores.map((v, i) => (
                  <td
                    key={v}
                    className={cn("px-3.5 py-5 text-center font-tf-serif text-[28px]", i === 2 && "text-lima-claro")}
                  >
                    {v}{" "}
                    <span className="font-tf-sans text-[12px] text-niebla-suave">{comparativa.filaPrecio.sufijo}</span>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="mx-5 mb-[72px] flex flex-wrap overflow-hidden rounded-[18px] lg:mx-10">
        <Photo
          img={recovery.img}
          sizes="(min-width: 1024px) 45vw, 100vw"
          className="min-h-[300px] min-w-0 flex-[1_1_380px] md:min-h-[400px]"
        />
        <div className="flex min-w-0 flex-[1_1_420px] flex-col justify-center bg-verde-noche p-7 md:p-12">
          <p className="mb-3.5 text-[11px] tracking-[2.6px] text-lima-claro">{recovery.kicker}</p>
          <h2 className="font-tf-serif text-[36px] leading-[1.02] font-normal md:text-[44px]">
            {recovery.titulo[0]}
            <br />
            {recovery.titulo[1]}
          </h2>
          <p className="mt-[18px] max-w-[460px] text-[16px] leading-[1.65] text-niebla-media">{recovery.texto}</p>
          <div className="mt-7 max-w-[420px]">
            {recovery.precios.map((r) => (
              <div
                key={r.label}
                className="flex items-baseline justify-between gap-4 border-t border-linea-oscura py-[15px]"
              >
                <span className="text-[15px] text-niebla-clara">{r.label}</span>
                <span className="font-tf-serif text-[26px] whitespace-nowrap text-lima-claro">
                  {r.precio}
                  <span className="font-tf-sans text-[12px] text-niebla-suave">{r.sufijo}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 pb-[72px] lg:px-10">
        <h2 className={cn(sectionTitle, "mb-2.5 text-center")}>
          {sueltas.titulo}
          <br />
          <span className="text-lima-claro italic">{sueltas.tituloItalico}</span>
        </h2>
        <p className="mx-auto mb-9 max-w-[520px] text-center text-[16px] leading-[1.6] text-niebla-media">
          {sueltas.texto}
        </p>
        <div className="grid grid-cols-1 gap-[18px] md:grid-cols-3">
          {sueltas.paquetes.map((q) => (
            <article
              key={q.titulo}
              className="flex flex-col rounded-[18px] border border-linea-oscura bg-verde-noche p-[34px]"
            >
              <h3 className="text-[13px] font-normal tracking-[2px] text-lima-claro">{q.titulo}</h3>
              <p className="mt-[18px] font-tf-serif text-[52px] leading-none">{q.precio}</p>
              <p className="mt-1 text-[13px] text-niebla-suave">{sueltas.sufijo}</p>
              <p className="mt-[18px] mb-7 text-[15px] leading-[1.6] text-niebla-media">{q.nota}</p>
              <PillLink href={sueltas.cta.href} variant="outlineLima" className="mt-auto min-h-12 text-[14px]">
                {sueltas.cta.label}
              </PillLink>
            </article>
          ))}
        </div>
        <p className="mt-[22px] text-center text-[14px] text-niebla-suave">{sueltas.nota}</p>
      </section>
    </>
  );
}
