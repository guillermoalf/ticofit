import { AlertTriangle } from "lucide-react";

import { ageOn, bmi, formatDate, formatNumber, percentOfWeight, waistHip } from "@/lib/clients/body";
import { TAPE_FIELDS } from "@/lib/clients/fields";
import type { Measurement } from "@/lib/clients/types";
import type { Gender } from "@/types/profile";

const val = (n: number | null, unit = "") => (n === null ? "—" : `${formatNumber(n)}${unit}`);

/** One evaluation laid out like the paper sheet. */
export function MeasurementSheet({
  measurement: m,
  previous,
  gender,
  birthDate,
}: {
  measurement: Measurement;
  previous: Measurement | null;
  gender: Gender | null;
  birthDate: string | null;
}) {
  const ratio = waistHip(m, gender);
  const age = ageOn(birthDate, m.measured_on);

  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-surface">
      <header className="flex flex-wrap gap-x-6 gap-y-1 bg-surface-hover px-4 py-3 text-[15px] sm:px-5">
        <p className="font-semibold">Medición del {formatDate(m.measured_on)}</p>
        <p className="text-muted">Coach: {m.measured_by_name ?? "—"}</p>
        {age !== null && <p className="text-muted">Edad: {age}</p>}
      </header>

      <dl className="grid grid-cols-3 gap-3 border-b border-border px-4 py-4 sm:px-5">
        <Stat label="Estatura" value={val(m.height_cm, " cm")} />
        <Stat label="Peso" value={val(m.weight_kg, " kg")} />
        <Stat label="IMC" value={val(bmi(m))} />
      </dl>

      <div className="space-y-4 border-b border-border px-4 py-4 sm:px-5">
        <Compare
          label="Músculo"
          unit=" kg"
          now={m.muscle_kg}
          before={previous?.muscle_kg ?? null}
          max={m.weight_kg}
          share={percentOfWeight(m.muscle_kg, m.weight_kg)}
        />
        <Compare
          label="Grasa"
          unit=" kg"
          now={m.fat_kg}
          before={previous?.fat_kg ?? null}
          max={m.weight_kg}
          share={percentOfWeight(m.fat_kg, m.weight_kg)}
        />
        <Compare label="Agua" unit=" %" now={m.body_water_pct} before={previous?.body_water_pct ?? null} max={100} />
        {previous && (
          <p className="text-xs text-muted">La barra gris es la medición del {formatDate(previous.measured_on)}.</p>
        )}
      </div>

      <dl className="grid grid-cols-1 gap-3 border-b border-border px-4 py-4 sm:grid-cols-3 sm:px-5">
        <Stat label="Peso objetivo" value={val(m.target_weight_kg, " kg")} />
        <Stat label="Porcentaje de grasa objetivo" value={val(m.target_fat_pct, " %")} />
        <Stat label="Porcentaje de músculo objetivo" value={val(m.target_muscle_pct, " %")} />
      </dl>

      <div className="grid gap-x-8 gap-y-4 px-4 py-4 sm:px-5 md:grid-cols-2">
        <dl className="text-[15px]">
          {TAPE_FIELDS.map((f) => (
            <div key={f.name} className="flex justify-between gap-4 border-b border-border py-1.5">
              <dt className="text-muted">{f.label}</dt>
              <dd className="tabular-nums">{val(m[f.name as keyof Measurement] as number | null, " cm")}</dd>
            </div>
          ))}
        </dl>
        <div className="space-y-4">
          <dl>
            <dt className="text-sm text-muted">Cintura / cadera</dt>
            <dd className="flex flex-wrap items-center gap-2 text-xl font-semibold">
              {ratio ? formatNumber(ratio.ratio) : "—"}
              {ratio?.elevated && (
                <span className="inline-flex items-center gap-1 text-sm font-bold text-[var(--danger)]">
                  <AlertTriangle size={15} aria-hidden="true" /> ELEVADO
                </span>
              )}
            </dd>
          </dl>
          <dl className="grid grid-cols-2 gap-3">
            <Stat label="Edad metabólica" value={val(m.metabolic_age)} />
            <Stat label="Puntuación de salud" value={val(m.health_score)} />
          </dl>
          <div>
            <p className="text-sm text-muted">Observaciones</p>
            <p className="text-[15px] break-words whitespace-pre-line">{m.observations ?? "—"}</p>
          </div>
        </div>
      </div>
    </article>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="text-xl font-semibold">{value}</dd>
    </div>
  );
}

function Compare({
  label,
  unit,
  now,
  before,
  max,
  share,
}: {
  label: string;
  unit: string;
  now: number | null;
  before: number | null;
  max: number;
  share?: number | null;
}) {
  const width = (n: number) => `${Math.min(100, (n / max) * 100)}%`;
  return (
    <div>
      <p className="mb-1.5 flex flex-wrap justify-between gap-x-3 text-[15px]">
        <span className="font-semibold">{label}</span>
        <span>
          {val(now, unit)}
          {share !== undefined && share !== null && <span className="text-muted"> · {formatNumber(share)} %</span>}
          {before !== null && <span className="text-muted"> · antes {val(before, unit)}</span>}
        </span>
      </p>
      <div aria-hidden="true" className="space-y-[2px]">
        {before !== null && <div className="h-2.5 rounded-r-[4px] bg-[var(--bar-previous)]" style={{ width: width(before) }} />}
        {now !== null && <div className="h-2.5 rounded-r-[4px] bg-verde-profundo" style={{ width: width(now) }} />}
      </div>
    </div>
  );
}
