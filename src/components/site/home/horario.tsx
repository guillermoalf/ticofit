"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { landing } from "@/content/landing";
import { cn } from "@/lib/utils";
import { PillLink } from "../pill-link";

const { horario, hero } = landing.home;
const SERVICIOS = hero.slides.map(({ id, nombre }) => ({ id, nombre }));
const NOMBRE = Object.fromEntries(SERVICIOS.map((s) => [s.id, s.nombre]));
const TZ = "America/Costa_Rica";
const DIAS = 7;

type Dia = { key: string; weekday: number; corto: string; numero: string; largo: string };

/** The next 7 days in Costa Rica time, today first. */
function proximosDias(): Dia[] {
  const fmt = (opts: Intl.DateTimeFormatOptions, d: Date) =>
    new Intl.DateTimeFormat("es-CR", { timeZone: TZ, ...opts }).format(d);
  const weekdayOf = (d: Date) =>
    ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"].indexOf(fmt({ weekday: "short" }, d).replace(".", ""));
  const now = Date.now();
  return Array.from({ length: DIAS }, (_, i) => {
    const d = new Date(now + i * 86_400_000);
    return {
      key: fmt({ year: "numeric", month: "2-digit", day: "2-digit" }, d),
      weekday: weekdayOf(d),
      corto: fmt({ weekday: "short" }, d).replace(".", ""),
      numero: fmt({ day: "numeric" }, d),
      largo: fmt({ weekday: "long", day: "numeric", month: "long" }, d),
    };
  });
}

/** "06:00" → "6:00 a. m." */
function horaLegible(hora: string) {
  const [h, m] = hora.split(":").map(Number);
  const sufijo = h < 12 ? "a. m." : h === 12 ? "m. d." : "p. m.";
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${sufijo}`;
}

const isServicio = (v: string | null): v is string => !!v && v in NOMBRE;

/**
 * Public schedule: day tabs for the next 7 days and service chips. The chip
 * lives in the URL (`?servicio=`), so the hero's "Ver horarios" links and the
 * /clases redirect land here pre-filtered. Dates are computed after mount in
 * Costa Rica time, so a statically built page never shows a stale "Hoy".
 */
export function Horario() {
  const pathname = usePathname();
  const params = useSearchParams();
  const servicio = isServicio(params.get("servicio")) ? params.get("servicio") : null;
  const [dias, setDias] = useState<Dia[] | null>(null);
  const [diaIdx, setDiaIdx] = useState(0);

  useEffect(() => setDias(proximosDias()), []);

  const filtrar = (id: string | null) => {
    const q = new URLSearchParams(params.toString());
    if (id) q.set("servicio", id);
    else q.delete("servicio");
    const qs = q.toString();
    window.history.replaceState(null, "", `${pathname}${qs ? `?${qs}` : ""}${window.location.hash}`);
  };

  const dia = dias?.[diaIdx];
  const delDia = dia ? (horario.semana[dia.weekday] ?? []) : [];
  const filas = servicio ? delDia.filter((c) => c.servicio === servicio) : delDia;

  const onDiaKey = (e: React.KeyboardEvent, i: number) => {
    const next =
      e.key === "ArrowRight" ? Math.min(i + 1, DIAS - 1) : e.key === "ArrowLeft" ? Math.max(i - 1, 0) : null;
    if (next === null) return;
    e.preventDefault();
    setDiaIdx(next);
    document.getElementById(`horario-dia-${next}`)?.focus();
  };

  return (
    <div>
      {/* Day tabs: scroll sideways on mobile */}
      <div
        role="tablist"
        aria-label={horario.diasLabel}
        className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] lg:mx-0 lg:px-0 [&::-webkit-scrollbar]:hidden"
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

      {/* Service chips */}
      <div role="group" aria-label={horario.filtroLabel} className="mt-5 flex flex-wrap gap-2">
        {[{ id: null, nombre: horario.todos }, ...SERVICIOS].map((s) => {
          const selected = s.id === servicio;
          return (
            <button
              key={s.id ?? "todos"}
              type="button"
              aria-pressed={selected}
              onClick={() => filtrar(s.id)}
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

      <div
        id="horario-panel"
        role="tabpanel"
        aria-labelledby={`horario-dia-${diaIdx}`}
        aria-live="polite"
        className="mt-8"
      >
        {dia && filas.length > 0 && (
          <>
            <div
              aria-hidden="true"
              className="hidden grid-cols-[120px_1.4fr_1fr_1fr_auto] gap-6 border-b border-linea pb-3 text-[12px] font-semibold tracking-[1.4px] text-salvia uppercase md:grid"
            >
              <span>{horario.columnas.hora}</span>
              <span>{horario.columnas.clase}</span>
              <span>{horario.columnas.coach}</span>
              <span>{horario.columnas.cupos}</span>
              <span className="w-[132px]" />
            </div>
            <ul>
              {filas.map((c) => {
                const lleno = c.cupos <= 0;
                return (
                  <li
                    key={`${c.hora}-${c.servicio}`}
                    className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 border-b border-linea py-5 md:grid-cols-[120px_1.4fr_1fr_1fr_auto] md:gap-6"
                  >
                    <span className="col-span-2 text-[14px] font-semibold tracking-[0.4px] tabular-nums md:col-span-1 md:text-[16px]">
                      {horaLegible(c.hora)}
                    </span>
                    <span className="font-tf-serif text-[26px] leading-tight md:text-[30px]">{NOMBRE[c.servicio]}</span>
                    <span className="row-start-3 text-[14px] text-musgo md:row-start-auto md:text-[15px]">
                      <span className="sr-only">{horario.columnas.coach}: </span>
                      {c.coach}
                    </span>
                    <span
                      className={cn(
                        "row-start-4 text-[14px] md:row-start-auto md:text-[15px]",
                        lleno ? "text-musgo" : "font-medium text-verde-profundo",
                      )}
                    >
                      {`${Math.max(c.cupos, 0)} ${c.cupos === 1 ? horario.cupo : horario.cupos}`}
                    </span>
                    <span className="col-start-2 row-span-3 row-start-2 self-center md:col-start-auto md:row-span-1 md:row-start-auto">
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
            <p className="font-tf-serif text-[28px] leading-tight">
              {servicio && delDia.length > 0 ? horario.vacio.filtro : horario.vacio.dia}
            </p>
            {servicio && (
              <button
                type="button"
                onClick={() => filtrar(null)}
                className="mt-4 min-h-11 cursor-pointer text-[15px] font-semibold text-verde-profundo underline decoration-1 underline-offset-4 hover:decoration-2"
              >
                {horario.vacio.accion}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
