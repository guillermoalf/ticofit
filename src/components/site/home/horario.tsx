"use client";

import { useEffect, useState } from "react";

import { landing, type CafeServicio, type Turno } from "@/content/landing";
import { cn } from "@/lib/utils";
import { PillLink } from "../pill-link";
import { useHomeParams } from "./home-params";

const { horario, hero, sedes } = landing.home;
const { cafe } = horario;
const NOMBRE: Record<string, string> = Object.fromEntries(hero.slides.map((s) => [s.id, s.nombre]));
const SERVICIOS = Object.keys(cafe.servicios).map((id) => ({ id, nombre: NOMBRE[id] ?? id }));
const TZ = "America/Costa_Rica";
const DIAS = 7;

type Dia = { key: string; weekday: number; corto: string; numero: string; largo: string };
type Fila = Turno & { cupos: number };

/** The next 7 days in Costa Rica time, today first, plus the current minute of the day. */
function ahora(): { dias: Dia[]; minuto: number } {
  const fmt = (opts: Intl.DateTimeFormatOptions, d: Date) =>
    new Intl.DateTimeFormat("es-CR", { timeZone: TZ, ...opts }).format(d);
  const weekdayOf = (d: Date) =>
    ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"].indexOf(fmt({ weekday: "short" }, d).replace(".", ""));
  const now = new Date();
  const [h, m] = fmt({ hour: "2-digit", minute: "2-digit", hourCycle: "h23" }, now).split(":").map(Number);
  const dias = Array.from({ length: DIAS }, (_, i) => {
    const d = new Date(now.getTime() + i * 86_400_000);
    return {
      key: fmt({ year: "numeric", month: "2-digit", day: "2-digit" }, d),
      weekday: weekdayOf(d),
      corto: fmt({ weekday: "short" }, d).replace(".", ""),
      numero: fmt({ day: "numeric" }, d),
      largo: fmt({ weekday: "long", day: "numeric", month: "long" }, d),
    };
  });
  return { dias, minuto: h * 60 + m };
}

const minutos = (hora: string) => {
  const [h, m] = hora.split(":").map(Number);
  return h * 60 + m;
};

/** "06:00" → "6:00 a. m." */
function horaLegible(hora: string) {
  const [h, m] = hora.split(":").map(Number);
  const sufijo = h < 12 ? "a. m." : h === 12 && m === 0 ? "m. d." : "p. m.";
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${sufijo}`;
}

/** Slots of one service on one weekday (0 = domingo). */
function turnos(servicio: CafeServicio, weekday: number): readonly Turno[] {
  if (weekday === 0) return [];
  const tramo = weekday === 6 ? "sabado" : "lunVie";
  if ("cadaHora" in servicio) {
    const [abre, cierra] = cafe.abierto[tramo];
    return Array.from({ length: cierra - abre }, (_, i) => ({
      hora: `${String(abre + i).padStart(2, "0")}:00`,
      coach: servicio.coach ?? "",
    }));
  }
  return servicio[tramo];
}

/**
 * SAMPLE occupancy until bookings exist: a stable pseudo-random count per
 * slot, so the layout shows a mix of open, nearly full and full classes.
 */
function cuposMuestra(seed: string, aforo: number) {
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const r = (h % 1000) / 1000;
  return r < 0.12 ? 0 : Math.max(1, Math.round(aforo * r));
}

/**
 * Public schedule. "Estás viendo" shows and switches the sede (shared with
 * the hero card through `?sede=`). Parque Bellavista is open gym with nothing
 * to book, so it shows hours and prices; Parque del Café shows the next 7
 * days for one class at a time (`?servicio=`). Dates are computed after mount
 * in Costa Rica time, so the statically built page never shows a stale "Hoy".
 */
export function Horario() {
  const { sede, servicio, set } = useHomeParams();

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-center gap-3">
        <span className="text-[13px] font-semibold tracking-[1.2px] text-salvia uppercase">{horario.sedeLabel}</span>
        <div role="group" aria-label={horario.sedeLabel} className="inline-flex rounded-full border border-linea-tag p-1">
          {sedes.lista.map((s) => {
            const selected = s.id === sede;
            return (
              <button
                key={s.id}
                type="button"
                aria-pressed={selected}
                onClick={() => set({ sede: s.id })}
                className={cn(
                  "min-h-10 cursor-pointer rounded-full px-4 text-[14px] font-medium transition-colors md:px-5",
                  selected ? "bg-verde-profundo text-crema-claro" : "text-verde-profundo hover:bg-verde-profundo/8",
                )}
              >
                {s.corto}
              </button>
            );
          })}
        </div>
      </div>

      {sede === "bellavista" ? (
        <Bellavista />
      ) : (
        <Cafe servicio={servicio} onServicio={(id) => set({ sede: "cafe", servicio: id })} />
      )}
    </div>
  );
}

function Bellavista() {
  const b = horario.bellavista;
  const { openGym, personal } = landing.membresias.bellavista;
  const { ivaMes } = landing.membresias;
  const card = "rounded-2xl bg-crema-card p-7";
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
  const [reloj, setReloj] = useState<ReturnType<typeof ahora> | null>(null);
  const [diaIdx, setDiaIdx] = useState(0);
  useEffect(() => setReloj(ahora()), []);

  const dias = reloj?.dias;
  const dia = dias?.[diaIdx];
  const config = cafe.servicios[servicio];
  const delDia = dia ? turnos(config, dia.weekday) : [];
  const filas: Fila[] = delDia
    .filter((t) => diaIdx > 0 || !reloj || minutos(t.hora) > reloj.minuto)
    .map((t) => ({ ...t, cupos: cuposMuestra(`${dia?.key}${t.hora}${servicio}`, config.aforo) }));
  const conCoach = filas.some((f) => f.coach);

  const onDiaKey = (e: React.KeyboardEvent, i: number) => {
    const next =
      e.key === "ArrowRight" ? Math.min(i + 1, DIAS - 1) : e.key === "ArrowLeft" ? Math.max(i - 1, 0) : null;
    if (next === null) return;
    e.preventDefault();
    setDiaIdx(next);
    document.getElementById(`horario-dia-${next}`)?.focus();
  };

  const vacio = !dia ? null : delDia.length === 0 ? (dia.weekday === 0 ? horario.vacio.dia : horario.vacio.servicio) : horario.vacio.hoy;
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
                const lleno = f.cupos <= 0;
                return (
                  <li
                    key={f.hora}
                    className={cn(
                      "grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 border-b border-linea py-5 md:gap-6",
                      cols,
                    )}
                  >
                    <span className="col-span-2 text-[14px] font-semibold tracking-[0.4px] tabular-nums md:col-span-1 md:text-[16px]">
                      {horaLegible(f.hora)}
                    </span>
                    <span className="font-tf-serif text-[26px] leading-tight md:text-[30px]">{NOMBRE[servicio]}</span>
                    {conCoach && (
                      <span className="row-start-3 text-[14px] text-musgo md:row-start-auto md:text-[15px]">
                        <span className="sr-only">{horario.columnas.coach}: </span>
                        {f.coach}
                      </span>
                    )}
                    <span
                      className={cn(
                        "text-[14px] md:row-start-auto md:text-[15px]",
                        conCoach ? "row-start-4" : "row-start-3",
                        lleno ? "text-musgo" : "font-medium text-verde-profundo",
                      )}
                    >
                      {`${f.cupos} ${f.cupos === 1 ? horario.cupo : horario.cupos}`}
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
