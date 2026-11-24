"use client";

import { useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { PERIODS, type Period } from "@/lib/staff/payroll";
import { BUTTON, CONTROL, LABEL } from "../salones/class-form";
import { setRateAction } from "./actions";

type Bracket = { from: string; to: string; pct: string };

const PCTS = [
  { key: "ccss_employee_pct", label: "CCSS, parte del trabajador (%)" },
  { key: "ccss_employer_pct", label: "CCSS, cargas del patrono (%)" },
  { key: "banco_popular_pct", label: "Banco Popular, parte del trabajador (%)" },
  { key: "vacation_days_per_50_weeks", label: "Días de vacaciones por cada 50 semanas" },
];

const str = (v: unknown) => (v == null ? "" : String(v));

/**
 * The rates payroll uses. None is hardcoded: they come from the accountant.
 * Drafts take a change when they are recalculated; approved runs keep theirs.
 */
export function RatesForm({ rates }: { rates: Record<string, unknown> }) {
  const router = useRouter();
  const id = useId();
  const [pending, start] = useTransition();
  const [period, setPeriod] = useState<Period>((rates.period as Period) ?? "monthly");
  const [pcts, setPcts] = useState(Object.fromEntries(PCTS.map((p) => [p.key, str(rates[p.key])])));
  const [brackets, setBrackets] = useState<Bracket[]>(
    (Array.isArray(rates.income_tax_brackets) ? rates.income_tax_brackets : []).map((b: { from: number; to: number | null; pct: number }) => ({
      from: str(b.from),
      to: str(b.to),
      pct: str(b.pct),
    })),
  );

  const save = (key: string, value: string | Bracket[]) =>
    start(async () => {
      const res = await setRateAction(key, value);
      if (!res.ok) return void toast.error(res.error);
      toast.success(res.message);
      router.refresh();
    });

  return (
    <div className="space-y-8">
      <p className="text-[15px] text-muted">
        Estos números los tiene que confirmar el contador de ticofit. Vacío = no se aplica. Cambiarlos no toca las planillas ya
        aprobadas.
      </p>

      <section className="rounded-2xl border border-border bg-surface p-4">
        <label htmlFor={`${id}-p`} className={LABEL}>
          Frecuencia de la planilla (para las nuevas)
        </label>
        <div className="flex flex-wrap gap-3">
          <select id={`${id}-p`} value={period} onChange={(e) => setPeriod(e.target.value as Period)} className={`${CONTROL} max-w-xs`}>
            {(Object.keys(PERIODS) as Period[]).map((k) => (
              <option key={k} value={k}>
                {PERIODS[k]}
              </option>
            ))}
          </select>
          <button type="button" disabled={pending} onClick={() => save("period", period)} className={BUTTON}>
            Guardar
          </button>
        </div>
      </section>

      <section className="grid gap-3 rounded-2xl border border-border bg-surface p-4 sm:grid-cols-2">
        {PCTS.map((p) => (
          <form
            key={p.key}
            method="post"
            onSubmit={(e) => {
              e.preventDefault();
              save(p.key, pcts[p.key]);
            }}
          >
            <label htmlFor={`${id}-${p.key}`} className={LABEL}>
              {p.label}
            </label>
            <div className="flex gap-2">
              <input
                id={`${id}-${p.key}`}
                inputMode="decimal"
                value={pcts[p.key]}
                onChange={(e) => setPcts({ ...pcts, [p.key]: e.target.value })}
                className={CONTROL}
              />
              <button type="submit" disabled={pending} className={BUTTON}>
                Guardar
              </button>
            </div>
          </form>
        ))}
      </section>

      <section className="rounded-2xl border border-border bg-surface p-4">
        <p className="font-semibold">Impuesto sobre la renta: tramos mensuales</p>
        <p className="mb-3 text-sm text-muted">
          Sobre el salario mensual. Cada tramo cobra su porcentaje solo sobre la parte que cae dentro de él. «Hasta» vacío = sin
          límite.
        </p>
        {brackets.length > 0 && (
          <div className="mb-3 grid grid-cols-[1fr_1fr_100px_auto] items-end gap-2 text-sm">
            <span className="text-muted">Desde (₡)</span>
            <span className="text-muted">Hasta (₡)</span>
            <span className="text-muted">%</span>
            <span />
            {brackets.map((b, i) => (
              <BracketRow
                key={i}
                b={b}
                onChange={(nb) => setBrackets(brackets.map((x, j) => (j === i ? nb : x)))}
                onRemove={() => setBrackets(brackets.filter((_, j) => j !== i))}
              />
            ))}
          </div>
        )}
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setBrackets([...brackets, { from: brackets.at(-1)?.to ?? "0", to: "", pct: "" }])}
            className="cursor-pointer rounded-full border border-border-strong px-5 py-2.5 text-sm font-semibold hover:bg-surface-hover"
          >
            + Tramo
          </button>
          <button type="button" disabled={pending} onClick={() => save("income_tax_brackets", brackets)} className={BUTTON}>
            Guardar tramos
          </button>
        </div>
      </section>
    </div>
  );
}

function BracketRow({ b, onChange, onRemove }: { b: Bracket; onChange: (b: Bracket) => void; onRemove: () => void }) {
  return (
    <>
      <input aria-label="Desde" inputMode="decimal" value={b.from} onChange={(e) => onChange({ ...b, from: e.target.value })} className={CONTROL} />
      <input aria-label="Hasta" inputMode="decimal" value={b.to} onChange={(e) => onChange({ ...b, to: e.target.value })} className={CONTROL} />
      <input aria-label="Porcentaje" inputMode="decimal" value={b.pct} onChange={(e) => onChange({ ...b, pct: e.target.value })} className={CONTROL} />
      <button type="button" onClick={onRemove} className="cursor-pointer pb-3 font-semibold underline underline-offset-2">
        Quitar
      </button>
    </>
  );
}
