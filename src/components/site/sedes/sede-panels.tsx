import { landing } from "@/content/landing";
import { cn } from "@/lib/utils";
import { Photo } from "../photo";
import { PillLink } from "../pill-link";

const { pavas, cafe } = landing.sedes;

type Dato = { label: string; valor: string; serif: boolean };

function Datos({ datos }: { datos: ReadonlyArray<Dato> }) {
  return (
    <dl className="mt-9 grid grid-cols-2 gap-6">
      {datos.map((d) => (
        <div key={d.label}>
          <dt className="text-[12px] tracking-[2px] text-salvia">{d.label}</dt>
          <dd className={cn("mt-1.5", d.serif ? "font-tf-serif text-[26px] md:text-[30px]" : "text-[18px]")}>
            {d.valor}
          </dd>
        </div>
      ))}
    </dl>
  );
}

const sectionClass = "flex flex-wrap gap-12 px-5 pt-6 pb-[88px] lg:px-12";
const nameClass = "mt-[22px] font-tf-serif text-[40px] leading-[1.04] font-normal md:text-[52px]";
const descClass = "mt-3.5 text-[17px] leading-[1.6] text-musgo";
const pillClass = "min-h-[52px] px-8 text-[16px]";

export function PavasPanel() {
  return (
    <section className={sectionClass}>
      <div className="min-w-0 flex-[1_1_420px]">
        <span className="inline-block rounded-full border border-verde-profundo px-[18px] py-[7px] text-[11px] tracking-[2.4px]">
          {pavas.badge}
        </span>
        <h2 className={nameClass}>{pavas.nombre}</h2>
        <p className={descClass}>{pavas.descripcion}</p>
        <Datos datos={pavas.datos} />
        <div className="mt-9 flex flex-wrap gap-3.5">
          <PillLink href={pavas.ctas[0].href} variant="verde" className={cn(pillClass, "font-semibold")}>
            {pavas.ctas[0].label}
          </PillLink>
          <PillLink href={pavas.ctas[1].href} variant="outline" className={pillClass}>
            {pavas.ctas[1].label}
          </PillLink>
        </div>
      </div>
      <div className="flex min-w-0 flex-[1_1_380px] flex-col gap-4">
        <Photo img={pavas.img} sizes="(min-width: 1024px) 45vw, 100vw" className="h-[320px] rounded-3xl" />
        <div className="rounded-3xl bg-lima-claro p-7 text-verde-profundo">
          <h3 className="mb-3.5 font-tf-serif text-[26px] font-normal">{pavas.panel.titulo}</h3>
          <ul className="flex list-disc flex-col gap-[9px] pl-5 text-[15px]">
            {pavas.panel.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

export function CafePanel() {
  return (
    <section className={sectionClass}>
      <div className="min-w-0 flex-[1_1_420px]">
        <span className="inline-block rounded-full border border-teal px-[18px] py-[7px] text-[11px] tracking-[2.4px] text-teal">
          {cafe.badge}
        </span>
        <h2 className={nameClass}>{cafe.nombre}</h2>
        <p className={descClass}>{cafe.descripcion}</p>
        <Datos datos={cafe.datos} />
        <div className="mt-9 flex flex-wrap gap-3.5">
          <PillLink href={cafe.ctas[0].href} variant="teal" className={pillClass}>
            {cafe.ctas[0].label}
          </PillLink>
          <PillLink href={cafe.ctas[1].href} variant="outlineTeal" className={pillClass}>
            {cafe.ctas[1].label}
          </PillLink>
        </div>
      </div>
      <div className="flex min-w-0 flex-[1_1_380px] flex-col gap-4">
        <Photo img={cafe.img} sizes="(min-width: 1024px) 45vw, 100vw" className="h-[320px] rounded-3xl" />
        <div className="rounded-3xl bg-celeste p-7 text-teal">
          <h3 className="mb-3.5 font-tf-serif text-[26px] font-normal">{cafe.panel.titulo}</h3>
          <ul className="flex list-disc flex-col gap-[9px] pl-5 text-[15px]">
            {cafe.panel.items.map((item) => (
              <li key={item.texto}>
                {item.destacado && <strong>{item.destacado}</strong>}
                {item.texto}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
