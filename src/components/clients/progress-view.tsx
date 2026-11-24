"use client";

import { useId, useState } from "react";

import { formatNumber, percentOfWeight } from "@/lib/clients/body";
import { TAPE_FIELDS } from "@/lib/clients/fields";
import type { Measurement } from "@/lib/clients/types";
import { cn } from "@/lib/utils";
import { LineChart, type Point } from "./line-chart";

const TABS = ["Grasa", "Músculo", "Agua", "Perímetros", "Peso"] as const;
type Tab = (typeof TABS)[number];

type Series = { label: string; unit: string; get: (m: Measurement) => number | null; target?: number | null };

/** "Progreso": one tab per metric, every past measurement. `measurements` is oldest first. */
export function ProgressView({ measurements }: { measurements: Measurement[] }) {
  const [tab, setTab] = useState<Tab>("Grasa");
  const [part, setPart] = useState("waist_cm");
  const id = useId();

  if (measurements.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-border-strong bg-surface px-5 py-10 text-center text-muted">
        Todavía no hay mediciones. Cuando el coach registre la primera, el progreso aparece acá.
      </p>
    );
  }

  const latest = measurements[measurements.length - 1];
  // Two small charts, never two y-axes: kg and % have different scales.
  const series: Record<Tab, Series[]> = {
    Grasa: [
      { label: "Porcentaje de grasa", unit: "%", get: (m) => percentOfWeight(m.fat_kg, m.weight_kg), target: latest.target_fat_pct },
      { label: "Grasa en kilos", unit: "kg", get: (m) => m.fat_kg },
    ],
    Músculo: [
      { label: "Porcentaje de músculo", unit: "%", get: (m) => percentOfWeight(m.muscle_kg, m.weight_kg), target: latest.target_muscle_pct },
      { label: "Músculo en kilos", unit: "kg", get: (m) => m.muscle_kg },
    ],
    Agua: [{ label: "Porcentaje de agua", unit: "%", get: (m) => m.body_water_pct }],
    Perímetros: [
      {
        label: TAPE_FIELDS.find((f) => f.name === part)?.label ?? "",
        unit: "cm",
        get: (m) => m[part as keyof Measurement] as number | null,
      },
    ],
    Peso: [{ label: "Peso", unit: "kg", get: (m) => m.weight_kg, target: latest.target_weight_kg }],
  };

  return (
    <div>
      <div role="group" aria-label="Métrica" className="mb-4 flex flex-wrap gap-x-5 gap-y-1 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            aria-pressed={t === tab}
            onClick={() => setTab(t)}
            className={cn(
              "-mb-px min-h-11 cursor-pointer border-b-2 text-[15px]",
              t === tab ? "border-primary font-semibold text-ink" : "border-transparent text-muted hover:text-ink",
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Perímetros" && (
        <div className="mb-4 max-w-xs">
          <label htmlFor={id} className="mb-1.5 block text-sm text-muted">
            Parte del cuerpo
          </label>
          <select
            id={id}
            value={part}
            onChange={(e) => setPart(e.target.value)}
            className="w-full rounded-xl border border-border-strong bg-surface px-3 py-2.5 text-[16px] text-ink"
          >
            {TAPE_FIELDS.map((f) => (
              <option key={f.name} value={f.name}>
                {f.label}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className={cn("grid gap-4", series[tab].length > 1 && "xl:grid-cols-2")}>
        {series[tab].map((s) => (
          <SeriesCard key={`${tab}-${s.label}`} series={s} measurements={measurements} />
        ))}
      </div>
    </div>
  );
}

function SeriesCard({ series: s, measurements }: { series: Series; measurements: Measurement[] }) {
  const points: Point[] = measurements.flatMap((m) => {
    const value = s.get(m);
    return value === null ? [] : [{ date: m.measured_on, value }];
  });
  const last = points.at(-1);
  const previous = points.at(-2);

  return (
    <section className="min-w-0 rounded-2xl border border-border bg-surface p-4">
      <h3 className="text-sm text-muted">{s.label}</h3>
      {last ? (
        <>
          <p className="mt-1 text-[32px] leading-tight font-semibold">
            {formatNumber(last.value)} <span className="text-lg font-normal text-muted">{s.unit}</span>
          </p>
          <p className="mb-3 text-sm text-muted">
            {previous
              ? `${delta(last.value - previous.value, s.unit)} vs. la anterior · ${delta(last.value - points[0].value, s.unit)} vs. la primera`
              : "Primera medición"}
          </p>
          <LineChart points={points} unit={s.unit} label={s.label} target={s.target} />
        </>
      ) : (
        <p className="py-8 text-center text-sm text-muted">Sin datos todavía.</p>
      )}
    </section>
  );
}

function delta(n: number, unit: string): string {
  const v = Math.round(n * 10) / 10;
  // A difference between two percentages is in points, not percent.
  const u = unit === "%" ? (Math.abs(v) === 1 ? "punto" : "puntos") : unit;
  return `${v > 0 ? "+" : v < 0 ? "−" : ""}${formatNumber(Math.abs(v))} ${u}`;
}
