"use client";

import { useEffect, useState } from "react";

import { landing, type SedeId } from "@/content/landing";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { PillLink } from "../pill-link";
import { WaitlistButton } from "../waitlist-modal";
import { useHomeParams } from "./home-params";
import { SedeUbicacion } from "./ubicacion";

const { horario, hero, sedes } = landing.home;
const NOMBRE: Record<string, string> = Object.fromEntries(hero.slides.map((s) => [s.id, s.nombre]));
const SERVICIOS = horario.cafe.servicios.map((id) => ({ id, nombre: NOMBRE[id] ?? id }));
const TZ = "America/Costa_Rica";
const DIAS = 7;

type Dia = { key: string; weekday: number; corto: string; numero: string; largo: string };
/** One row of `public_schedule()`: never the aforo, only the spots left. */
type Clase = { starts_at: string; discipline_slug: string; discipline_name: string; coach_name: string | null; spots_left: number };

/** The next 7 days in Costa Rica time, today first. */
function proximosDias(): Dia[] {
  const fmt = (opts: Intl.DateTimeFormatOptions, d: Date) =>
    new Intl.DateTimeFormat("es-CR", { timeZone: TZ, ...opts }).format(d);
  const weekdayOf = (d: Date) =>
    ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"].indexOf(fmt({ weekday: "short" }, d).replace(".", ""));
  const now = new Date();
  return Array.from({ length: DIAS }, (_, i) => {
    const d = new Date(now.getTime() + i * 86_400_000);
    return {
      key: diaCR(d),
      weekday: weekdayOf(d),
      corto: fmt({ weekday: "short" }, d).replace(".", ""),
      numero: fmt({ day: "numeric" }, d),
      largo: fmt({ weekday: "long", day: "numeric", month: "long" }, d),
    };
  });
}

/** YYYY-MM-DD of a moment in Costa Rica. */
const diaCR = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(d);

/** "6:00 a. m." in Costa Rica. */
const horaLegible = (ts: string) =>
  new Intl.DateTimeFormat("es-CR", { timeZone: TZ, hour: "numeric", minute: "2-digit" }).format(new Date(ts));

/**
 * Public schedule for the sede picked under the hero (`?sede=`). Parque Bellavista is open gym with nothing
 * to book, so it shows hours and prices; Parque del Café shows the next 7
 * days for one class at a time (`?servicio=`). Dates are computed after mount
 * in Costa Rica time, so the statically built page never shows a stale "Hoy".
 */
export function Horario() {
  const { sede, servicio, set } = useHomeParams();

  return (
    <div>
      {sedes.lista.find((s) => s.id === sede)?.estado === "proximamente" ? (
        <Proximamente sede={sede} />
      ) : sede === "bellavista" ? (
        <Bellavista />
      ) : (
        <Cafe servicio={servicio} onServicio={(id) => set({ sede: "cafe", servicio: id })} />
      )}

      <SedeUbicacion sede={sede} />
    </div>
  );
}

/**
 * A sede that hasn't opened: its schedule stays configured (see `Cafe`) but
 * hidden until its `estado` flips to "abierta" in landing.ts.
 */
function Proximamente({ sede }: { sede: SedeId }) {
  return (
    <div className="rounded-2xl border border-dashed border-linea-tag px-6 py-12 text-center">
      <p className="font-tf-serif text-[32px] leading-tight">{sedes.proximamente.titulo}</p>
      <p className="mx-auto mt-3 max-w-[460px] text-[16px] leading-[1.6] text-musgo">{sedes.proximamente.texto}</p>
      <WaitlistButton sede={sede} className="mt-6 min-h-12 px-7" />
    </div>
  );
}

function Bellavista() {
  const b = horario.bellavista;
  const { openGym, personal } = landing.membresias.bellavista;
  const { ivaMes } = landing.membresias;
  const card = "rounded-2xl bg-crema-claro p-7";
  const kicker = "mb-4 text-[12px] font-semibold tracking-[1.8px] text-salvia uppercase";

  return (
    <div className="grid gap-[18px] lg:grid-cols-[1.2fr_1fr_1fr]">
      <div className="flex flex-col pr-4 lg:pt-2">
        <h3 className="font-tf-serif text-[32px] leading-[1.08] font-normal md:text-[36px]">{b.titulo}</h3>
        <p className="mt-4 max-w-[460px] text-[16px] leading-[1.65] text-musgo">{b.texto}</p>
        <dl className="mt-6">
          <dt className={kicker.replace("mb-4", "mb-2")}>{b.horarioTitulo}</dt>
          {b.horario.map((h) => (
            <dd key={h.dias} className="flex flex-wrap justify-between gap-x-6 border-t border-linea py-2.5 text-[15px]">
              <span>{h.dias}</span>
              <span className="tabular-nums">{h.horas}</span>
            </dd>
          ))}
        </dl>
        <PillLink href={b.cta.href} variant="verde" className="mt-6 min-h-12 self-start px-7 text-[14px] font-semibold">
          {b.cta.label}
        </PillLink>
      </div>

      <div className={card}>
        <p className={kicker}>{b.membresiaTitulo}</p>
        <p className="text-[17px] font-semibold">{openGym.nombre}</p>
        <p className="mt-2 font-tf-serif text-[44px] leading-none">
          {openGym.precio} <span className="font-tf-sans text-[13px] text-musgo">{ivaMes}</span>
        </p>
      </div>

      <div className={card}>
        <p className={kicker}>{b.personalTitulo}</p>
        <p className="text-[14px] leading-[1.55] text-musgo">{b.personalTexto}</p>
        <ul className="mt-4">
          {personal.paquetes.map((p) => (
            <li key={p.label} className="flex items-baseline justify-between gap-4 border-t border-linea py-2.5">
              <span className="text-[15px]">{p.label}</span>
              <span>
                <span className="font-tf-serif text-[24px]">{p.precio}</span>{" "}
                <span className="text-[12px] text-musgo">{b.porSesion}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Cafe({ servicio, onServicio }: { servicio: string; onServicio: (id: string) => void }) {
  const [dias, setDias] = useState<Dia[] | null>(null);
  const [clases, setClases] = useState<Clase[] | null>(null);
  const [fallo, setFallo] = useState(false);
  const [diaIdx, setDiaIdx] = useState(0);

  useEffect(() => {
    const d = proximosDias();
    setDias(d);
    createClient()
      .rpc("public_schedule", { p_sede_id: "cafe", p_from: d[0].key, p_days: DIAS })
      .then(({ data, error }) => {
        if (error) setFallo(true);
        else setClases((data ?? []) as Clase[]);
      });
  }, []);

  const dia = dias?.[diaIdx];
  const filas = dia && clases ? clases.filter((c) => c.discipline_slug === servicio && diaCR(new Date(c.starts_at)) === dia.key) : [];
  const conCoach = filas.some((f) => f.coach_name);

  const onDiaKey = (e: React.KeyboardEvent, i: number) => {
    const next =
      e.key === "ArrowRight" ? Math.min(i + 1, DIAS - 1) : e.key === "ArrowLeft" ? Math.max(i - 1, 0) : null;
    if (next === null) return;
    e.preventDefault();
    setDiaIdx(next);
    document.getElementById(`horario-dia-${next}`)?.focus();
  };

  const vacio = !dia
    ? null
    : fallo
      ? horario.vacio.error
      : !clases
        ? horario.cargando
        : dia.weekday === 0
          ? horario.vacio.dia
          : diaIdx === 0
            ? horario.vacio.hoy
            : horario.vacio.servicio;
  const cols = conCoach ? "md:grid-cols-[120px_1.3fr_1fr_1fr_auto]" : "md:grid-cols-[120px_1.3fr_1fr_auto]";

  return (
    <>
      {/* Class chips: one class at a time, no "all" list */}
      <div role="group" aria-label={horario.filtroLabel} className="flex flex-wrap gap-2">
        {SERVICIOS.map((s) => {
          const selected = s.id === servicio;
          return (
            <button
              key={s.id}
              type="button"
              aria-pressed={selected}
              onClick={() => onServicio(s.id)}
              className={cn(
                "min-h-11 cursor-pointer rounded-full border px-5 text-[14px] font-medium transition-colors",
                selected
                  ? "border-verde-profundo bg-verde-profundo text-crema-claro"
                  : "border-linea-tag bg-transparent text-oliva hover:border-verde-profundo",
              )}
            >
              {s.nombre}
            </button>
          );
        })}
      </div>

      {/* Day tabs: scroll sideways on mobile */}
      <div
        role="tablist"
        aria-label={horario.diasLabel}
        className="-mx-5 mt-5 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] lg:mx-0 lg:px-0 [&::-webkit-scrollbar]:hidden"
      >
        {(dias ?? Array.from({ length: DIAS }, () => null)).map((d, i) => {
          const selected = i === diaIdx;
          return (
            <button
              key={d?.key ?? i}
              id={`horario-dia-${i}`}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls="horario-panel"
              aria-label={d ? `${i === 0 ? `${horario.hoy}, ` : ""}${d.largo}` : undefined}
              tabIndex={selected ? 0 : -1}
              disabled={!d}
              onClick={() => setDiaIdx(i)}
              onKeyDown={(e) => onDiaKey(e, i)}
              className={cn(
                "flex min-h-[68px] min-w-[72px] shrink-0 cursor-pointer flex-col items-center justify-center rounded-2xl border px-4 transition-colors",
                selected
                  ? "border-verde-profundo bg-verde-profundo text-crema-claro"
                  : "border-linea-tag bg-transparent text-verde-profundo hover:border-verde-profundo",
              )}
            >
              <span className="text-[12px] font-semibold tracking-[1.2px] uppercase">
                {d ? (i === 0 ? horario.hoy : d.corto) : " "}
              </span>
              <span className="font-tf-serif text-[26px] leading-none">{d?.numero ?? " "}</span>
            </button>
          );
        })}
      </div>

      <div id="horario-panel" role="tabpanel" aria-labelledby={`horario-dia-${diaIdx}`} className="mt-8">
        {dia && filas.length > 0 && (
          <>
            <div
              aria-hidden="true"
              className={cn(
                "hidden gap-6 border-b border-linea pb-3 text-[12px] font-semibold tracking-[1.4px] text-salvia uppercase md:grid",
                cols,
              )}
            >
              <span>{horario.columnas.hora}</span>
              <span>{horario.columnas.clase}</span>
              {conCoach && <span>{horario.columnas.coach}</span>}
              <span>{horario.columnas.cupos}</span>
              <span className="w-[132px]" />
            </div>
            <ul>
              {filas.map((f) => {
                const lleno = f.spots_left <= 0;
                return (
                  <li
                    key={f.starts_at}
                    className={cn(
                      "grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 border-b border-linea py-5 md:gap-6",
                      cols,
                    )}
                  >
                    <span className="col-span-2 text-[14px] font-semibold tracking-[0.4px] tabular-nums md:col-span-1 md:text-[16px]">
                      {horaLegible(f.starts_at)}
                    </span>
                    <span className="font-tf-serif text-[26px] leading-tight md:text-[30px]">{NOMBRE[servicio] ?? f.discipline_name}</span>
                    {conCoach && (
                      <span className="row-start-3 text-[14px] text-musgo md:row-start-auto md:text-[15px]">
                        <span className="sr-only">{horario.columnas.coach}: </span>
                        {f.coach_name}
                      </span>
                    )}
                    <span
                      className={cn(
                        "text-[14px] md:row-start-auto md:text-[15px]",
                        conCoach ? "row-start-4" : "row-start-3",
                        lleno ? "text-musgo" : "font-medium text-verde-profundo",
                      )}
                    >
                      {lleno ? horario.lleno : `${f.spots_left} ${f.spots_left === 1 ? horario.cupo : horario.cupos}`}
                    </span>
                    <span
                      className={cn(
                        "col-start-2 row-start-2 self-center md:col-start-auto md:row-span-1 md:row-start-auto",
                        conCoach ? "row-span-3" : "row-span-2",
                      )}
                    >
                      {lleno ? (
                        <span className="inline-flex min-h-11 w-[112px] items-center justify-center rounded-full border border-linea-tag text-[14px] text-musgo md:w-[132px]">
                          {horario.lleno}
                        </span>
                      ) : (
                        <PillLink
                          href={horario.reservar.href}
                          variant="verde"
                          className="min-h-11 w-[112px] text-[14px] font-semibold md:w-[132px]"
                        >
                          {horario.reservar.label}
                        </PillLink>
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
          </>
        )}

        {dia && filas.length === 0 && (
          <div className="rounded-2xl border border-dashed border-linea-tag px-6 py-12 text-center">
            <p className="font-tf-serif text-[28px] leading-tight">{vacio}</p>
          </div>
        )}
      </div>
    </>
  );
}
