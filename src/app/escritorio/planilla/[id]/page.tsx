import Link from "next/link";
import { notFound } from "next/navigation";

import { DeskPageHeader } from "@/components/desk/page-header";
import { formatMoment } from "@/lib/clients/body";
import { colones } from "@/lib/staff/clock";
import { requireStaff } from "@/lib/staff/context";
import { PAY_TYPES, PERIODS, RUN_STATUS, loadRun, missingRates, periodLabel, totals } from "@/lib/staff/payroll";
import { createClient } from "@/lib/supabase/server";
import { LineRow } from "./line-row";
import { RunActions } from "./run-actions";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

/** One payroll run: a line per person, editable while it is a draft. */
export default async function RunPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff("payroll.manage");
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();
  const supabase = await createClient();
  const data = await loadRun(supabase, id);
  if (!data) notFound();
  const { run, lines, names } = data;
  const t = totals(lines);
  const missing = missingRates(run.rates);
  const draft = run.status === "draft";

  return (
    <>
      <p className="mb-2 text-sm">
        <Link href="/escritorio/planilla" className="font-semibold underline underline-offset-2">
          ← Planillas
        </Link>
      </p>
      <DeskPageHeader
        title={`Planilla del ${periodLabel(run)}`}
        description={`${PERIODS[run.period]} · ${RUN_STATUS[run.status]}${
          run.approved_at ? ` · aprobada por ${names.get(run.approved_by_staff ?? "") ?? "—"} el ${formatMoment(run.approved_at)}` : ""
        }${run.paid_at ? ` · pagada el ${formatMoment(run.paid_at)}` : ""}`}
      />

      <RunActions id={run.id} status={run.status} />

      {draft && missing.length > 0 && (
        <p className="mb-6 rounded-2xl border border-border-strong bg-surface px-5 py-4 text-[15px]">
          Calculada sin: {missing.join(", ")}. Ponelas en Tarifas y tocá «Recalcular».
        </p>
      )}

      <dl className="mb-6 grid gap-3 sm:grid-cols-4">
        {[
          ["Bruto", t.gross],
          ["Deducciones", t.deductions],
          ["Neto a pagar", t.net],
          ["Cargas del patrono", t.employer],
        ].map(([label, value]) => (
          <div key={label as string} className="rounded-2xl border border-border bg-surface px-4 py-3">
            <dt className="text-sm text-muted">{label}</dt>
            <dd className="font-tf-serif text-[26px] tabular-nums">{colones(value as number)}</dd>
          </div>
        ))}
      </dl>

      {lines.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border-strong bg-surface px-5 py-10 text-center text-muted">
          Nadie entra en esta planilla. Poné la forma de pago y el monto de cada persona en la pestaña Personas.
        </p>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
          {lines.map((l) => (
            <LineRow
              key={l.id}
              line={l}
              name={l.full_name}
              unit={PAY_TYPES[l.pay_type].unit}
              editable={draft}
            />
          ))}
        </ul>
      )}
    </>
  );
}
