/** Payroll (migration 0029): types, labels and the loader shared by the desk, CSV and print views. */

import type { SupabaseClient } from "@supabase/supabase-js";

import { formatDate } from "@/lib/clients/body";

export type PayType = "monthly" | "hourly" | "per_class";
export type RunStatus = "draft" | "approved" | "paid";
export type Period = "monthly" | "biweekly" | "weekly";

export const PAY_TYPES: Record<PayType, { label: string; unit: string; one: string; rate: string }> = {
  monthly: { label: "Salario mensual", unit: "meses", one: "mes", rate: "Salario mensual (₡)" },
  hourly: { label: "Por hora", unit: "horas", one: "hora", rate: "Pago por hora (₡)" },
  per_class: { label: "Por clase", unit: "clases", one: "clase", rate: "Pago por clase (₡)" },
};

/** "1 hora", "7,5 horas", "0,5 meses". */
export function quantityLabel(qty: number, type: PayType): string {
  const n = Number(qty);
  return `${n.toLocaleString("es-CR", { maximumFractionDigits: 2 })} ${n === 1 ? PAY_TYPES[type].one : PAY_TYPES[type].unit}`;
}

export const PERIODS: Record<Period, string> = {
  monthly: "Mensual",
  biweekly: "Quincenal (14 días)",
  weekly: "Semanal",
};

export const RUN_STATUS: Record<RunStatus, string> = {
  draft: "Borrador",
  approved: "Aprobada",
  paid: "Pagada",
};

export type Run = {
  id: string;
  period: Period;
  period_start: string;
  period_end: string;
  status: RunStatus;
  rates: Record<string, unknown>;
  note: string | null;
  computed_at: string | null;
  approved_at: string | null;
  approved_by_staff: string | null;
  paid_at: string | null;
  paid_by_staff: string | null;
};

export type Line = {
  id: string;
  staff_id: string;
  pay_type: PayType;
  rate: number;
  quantity: number;
  quantity_override: number | null;
  bonus: number;
  other_deductions: number;
  note: string | null;
  gross: number;
  ccss_employee: number;
  banco_popular: number;
  income_tax: number;
  net: number;
  employer_charges: number;
};

export type Person = {
  staff_id: string;
  full_name: string;
  active: boolean;
  job_title: string | null;
  hire_date: string | null;
  pay_type: PayType | null;
  rate: number | null;
  has_iban: boolean;
  aguinaldo_from: string;
  aguinaldo_to: string;
  aguinaldo: number;
  vacation_accrued: number | null;
  vacation_taken: number;
};

export const RUN_SELECT =
  "id, period, period_start, period_end, status, rates, note, computed_at, approved_at, approved_by_staff, paid_at, paid_by_staff";
const LINE_SELECT =
  "id, staff_id, pay_type, rate, quantity, quantity_override, bonus, other_deductions, note, gross, ccss_employee, banco_popular, income_tax, net, employer_charges";

export function periodLabel(run: Pick<Run, "period_start" | "period_end">): string {
  return `${formatDate(run.period_start)} al ${formatDate(run.period_end)}`;
}

/** Rates a run was computed with that are still empty: the screen warns about them. */
export function missingRates(rates: Record<string, unknown>): string[] {
  const out: string[] = [];
  if (rates.ccss_employee_pct == null) out.push("CCSS del trabajador");
  if (rates.ccss_employer_pct == null) out.push("cargas del patrono");
  if (rates.banco_popular_pct == null) out.push("Banco Popular");
  if (!Array.isArray(rates.income_tax_brackets) || rates.income_tax_brackets.length === 0) out.push("tramos de renta");
  return out;
}

export function totals(lines: Line[]) {
  const sum = (k: keyof Line) => lines.reduce((s, l) => s + Number(l[k] ?? 0), 0);
  return {
    gross: sum("gross"),
    deductions: sum("ccss_employee") + sum("banco_popular") + sum("income_tax") + sum("other_deductions"),
    net: sum("net"),
    employer: sum("employer_charges"),
  };
}

/** A run with its lines and everyone's name; null when not found or not allowed. */
export async function loadRun(supabase: SupabaseClient, id: string) {
  const [{ data: run }, { data: lines }, { data: people }] = await Promise.all([
    supabase.from("payroll_runs").select(RUN_SELECT).eq("id", id).maybeSingle(),
    supabase.from("payroll_lines").select(LINE_SELECT).eq("run_id", id),
    supabase.from("staff").select("id, full_name"),
  ]);
  if (!run) return null;
  const names = new Map(((people ?? []) as { id: string; full_name: string }[]).map((p) => [p.id, p.full_name]));
  const rows = ((lines ?? []) as Line[])
    .map((l) => ({ ...l, full_name: names.get(l.staff_id) ?? "—" }))
    .sort((a, b) => a.full_name.localeCompare(b.full_name, "es"));
  return { run: run as Run, lines: rows, names };
}
