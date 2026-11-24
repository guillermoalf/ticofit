import Link from "next/link";

import { DeskPageHeader } from "@/components/desk/page-header";
import { formatDate, todayCR } from "@/lib/clients/body";
import { colones } from "@/lib/staff/clock";
import { requireStaff } from "@/lib/staff/context";
import {
  PERIODS,
  RUN_SELECT,
  RUN_STATUS,
  missingRates,
  periodLabel,
  totals,
  type Line,
  type PayType,
  type Period,
  type Person,
  type Run,
} from "@/lib/staff/payroll";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { NewRun } from "./new-run";
import { PersonRow, type Vacation } from "./people";
import { RatesForm } from "./rates";

export const dynamic = "force-dynamic";

const TABS = [
  { id: "planillas", label: "Planillas" },
  { id: "personas", label: "Personas" },
  { id: "tarifas", label: "Tarifas" },
];

/** Payroll: runs, each person's payroll data (aguinaldo, vacations) and the rates. Payroll holders only. */
export default async function PayrollPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  await requireStaff("payroll.manage");
  const query = await searchParams;
  const tab = TABS.find((t) => t.id === query.tab)?.id ?? "planillas";
  const supabase = await createClient();
  const { data: rateRows } = await supabase.from("payroll_rates").select("key, value");
  const rates = Object.fromEntries(((rateRows ?? []) as { key: string; value: unknown }[]).map((r) => [r.key, r.value]));
  const missing = missingRates(rates);

  return (
    <>
      <DeskPageHeader
        title="Planilla"
        description="Solo la ven quienes tienen permiso de planilla. Las horas salen del reloj y las clases del horario; el aguinaldo y las vacaciones se calculan solos y no se pagan automáticamente."
      />
      <nav aria-label="Planilla" className="mb-6 flex flex-wrap gap-x-5 border-b border-border">
        {TABS.map((t) => (
          <Link
            key={t.id}
            href={`/escritorio/planilla?tab=${t.id}`}
            aria-current={t.id === tab ? "page" : undefined}
            className={cn(
              "-mb-px inline-flex min-h-11 items-center border-b-2 text-[15px]",
              t.id === tab ? "border-primary font-semibold text-ink" : "border-transparent text-muted hover:text-ink",
            )}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {missing.length > 0 && tab !== "tarifas" && (
        <p className="mb-6 rounded-2xl border border-border-strong bg-surface px-5 py-4 text-[15px]">
          <strong>Faltan tarifas:</strong> {missing.join(", ")}. Hasta que el contador las confirme, las planillas salen sin esas
          deducciones.{" "}
          <Link href="/escritorio/planilla?tab=tarifas" className="font-semibold underline underline-offset-2">
            Ponerlas
          </Link>
        </p>
      )}

      {tab === "planillas" && <Runs period={(rates.period as Period) ?? "monthly"} />}
      {tab === "personas" && <People />}
      {tab === "tarifas" && <RatesForm rates={rates} />}
    </>
  );
}

async function Runs({ period }: { period: Period }) {
  const supabase = await createClient();
  const [{ data: runs }, { data: lines }] = await Promise.all([
    supabase.from("payroll_runs").select(RUN_SELECT).order("period_start", { ascending: false }).limit(36),
    supabase.from("payroll_lines").select("run_id, gross, ccss_employee, banco_popular, income_tax, other_deductions, net, employer_charges"),
  ]);
  const byRun = new Map<string, Line[]>();
  for (const l of (lines ?? []) as (Line & { run_id: string })[]) byRun.set(l.run_id, [...(byRun.get(l.run_id) ?? []), l]);
  const list = (runs ?? []) as Run[];

  return (
    <>
      <NewRun period={period} periodLabel={PERIODS[period]} today={todayCR()} />
      {list.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border-strong bg-surface px-5 py-10 text-center text-muted">
          Todavía no hay planillas.
        </p>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
          {list.map((r) => {
            const t = totals(byRun.get(r.id) ?? []);
            return (
              <li key={r.id}>
                <Link href={`/escritorio/planilla/${r.id}`} className="flex flex-wrap items-center gap-x-6 gap-y-1 px-5 py-4 hover:bg-surface-hover">
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{periodLabel(r)}</span>
                    <span className="text-sm text-muted">
                      {PERIODS[r.period]} · {RUN_STATUS[r.status]}
                    </span>
                  </span>
                  <span className="text-right text-sm tabular-nums">
                    Bruto {colones(t.gross)} · Neto <strong>{colones(t.net)}</strong>
                  </span>
                  <span aria-hidden="true">→</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

async function People() {
  const supabase = await createClient();
  const [{ data: people }, { data: employment }, { data: vacations }] = await Promise.all([
    supabase.rpc("payroll_people"),
    supabase.from("staff_employment").select("staff_id, cedula, job_title, hire_date, iban, pay_type, rate"),
    supabase.from("staff_vacations").select("id, staff_id, start_date, days, note").order("start_date", { ascending: false }),
  ]);
  const emp = new Map(
    ((employment ?? []) as { staff_id: string; cedula: string | null; job_title: string | null; hire_date: string | null; iban: string | null; pay_type: string; rate: number | null }[]).map(
      (e) => [e.staff_id, e],
    ),
  );
  const vac = new Map<string, Vacation[]>();
  for (const v of (vacations ?? []) as (Vacation & { staff_id: string })[]) vac.set(v.staff_id, [...(vac.get(v.staff_id) ?? []), v]);
  const list = (people ?? []) as Person[];
  const range = list[0] ? `${formatDate(list[0].aguinaldo_from)} al ${formatDate(list[0].aguinaldo_to)}` : "";

  return (
    <>
      <p className="mb-4 text-[15px] text-muted">
        Aguinaldo acumulado del {range}: lo ganado en planillas aprobadas o pagadas, entre 12. Se agregan personas desde Personal.
      </p>
      <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
        {list.map((p) => {
          const e = emp.get(p.staff_id);
          return (
            <PersonRow
              key={p.staff_id}
              person={p}
              employment={{
                cedula: e?.cedula ?? "",
                job_title: e?.job_title ?? "",
                hire_date: e?.hire_date ?? "",
                iban: e?.iban ?? "",
                pay_type: (e?.pay_type as PayType | undefined) ?? "monthly",
                rate: e?.rate != null ? String(Number(e.rate)) : "",
              }}
              vacations={vac.get(p.staff_id) ?? []}
            />
          );
        })}
      </ul>
    </>
  );
}
