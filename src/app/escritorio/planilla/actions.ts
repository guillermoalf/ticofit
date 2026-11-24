"use server";

import { revalidatePath } from "next/cache";

import { clockError } from "@/lib/staff/clock";
import { staffForAction } from "@/lib/staff/context";
import type { PayType, RunStatus } from "@/lib/staff/payroll";
import { createClient } from "@/lib/supabase/server";

type Result = { ok: true; message: string; id?: string } | { ok: false; error: string };

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MONEY_RE = /^\d{1,9}(\.\d{1,2})?$/;

function refresh() {
  revalidatePath("/escritorio/planilla", "layout");
}

async function payroll() {
  const auth = await staffForAction("payroll.manage");
  if (!auth.staff) return { error: auth.error } as const;
  return { supabase: await createClient() } as const;
}

/** "600.000,50" or "600000.5" → "600000.50"; "" stays "". */
function money(raw: string): string | null {
  const s = raw.trim().replace(/\s|₡/g, "");
  if (!s) return "";
  // Costa Rica writes 600.000,50; a dot followed by exactly three digits is thousands.
  const n = s.includes(",")
    ? s.replace(/\./g, "").replace(",", ".")
    : /^\d{1,3}(\.\d{3})+$/.test(s)
      ? s.replace(/\./g, "")
      : s;
  return MONEY_RE.test(n) ? n : null;
}

export type EmploymentInput = {
  cedula: string;
  job_title: string;
  hire_date: string;
  iban: string;
  pay_type: PayType;
  rate: string;
};

export async function saveEmploymentAction(staffId: string, input: EmploymentInput): Promise<Result> {
  const p = await payroll();
  if ("error" in p) return { ok: false, error: p.error! };
  const rate = money(input.rate);
  if (rate === null) return { ok: false, error: "Revisá el monto: solo números." };
  if (input.hire_date && !DATE_RE.test(input.hire_date)) return { ok: false, error: "Revisá la fecha de ingreso." };
  const { error } = await p.supabase.rpc("employment_save", {
    p_staff_id: staffId,
    p_data: { ...input, rate },
  });
  if (error) return { ok: false, error: clockError(error) };
  refresh();
  return { ok: true, message: "Datos de planilla guardados." };
}

export async function addVacationAction(staffId: string, start: string, days: string, note: string): Promise<Result> {
  const p = await payroll();
  if ("error" in p) return { ok: false, error: p.error! };
  const n = Number(days.replace(",", "."));
  if (!DATE_RE.test(start)) return { ok: false, error: "Poné la fecha en que empezó." };
  if (!(n > 0 && n <= 60)) return { ok: false, error: "Los días van de 0,5 a 60." };
  const { error } = await p.supabase.rpc("vacation_save", { p_staff_id: staffId, p_start: start, p_days: n, p_note: note });
  if (error) return { ok: false, error: clockError(error) };
  refresh();
  return { ok: true, message: "Vacaciones anotadas." };
}

export async function deleteVacationAction(id: string): Promise<Result> {
  const p = await payroll();
  if ("error" in p) return { ok: false, error: p.error! };
  const { error } = await p.supabase.rpc("vacation_delete", { p_id: id });
  if (error) return { ok: false, error: clockError(error) };
  refresh();
  return { ok: true, message: "Borrado." };
}

/** One rate. Percentages arrive as text ("10,67" or ""); brackets as rows. */
export async function setRateAction(
  key: string,
  value: string | { from: string; to: string; pct: string }[],
): Promise<Result> {
  const p = await payroll();
  if ("error" in p) return { ok: false, error: p.error! };
  let json: unknown;
  if (key === "period") {
    json = value;
  } else if (Array.isArray(value)) {
    const rows = [];
    for (const r of value) {
      const from = money(r.from);
      const to = money(r.to);
      const pct = Number(r.pct.replace(",", "."));
      if (from === null || from === "" || to === null || !(pct >= 0 && pct <= 100))
        return { ok: false, error: "Revisá los tramos: desde, hasta (vacío = sin límite) y porcentaje." };
      rows.push({ from: Number(from), to: to === "" ? null : Number(to), pct });
    }
    json = rows;
  } else {
    const s = value.trim().replace(",", ".");
    if (s === "") json = null;
    else {
      const n = Number(s);
      if (!(n >= 0 && n <= (key === "vacation_days_per_50_weeks" ? 60 : 100))) return { ok: false, error: "Revisá el número." };
      json = n;
    }
  }
  const { error } = await p.supabase.rpc("payroll_rate_set", { p_key: key, p_value: json });
  if (error) return { ok: false, error: clockError(error) };
  refresh();
  return { ok: true, message: "Guardado. Las planillas en borrador toman el cambio al recalcularlas." };
}

export async function createRunAction(start: string): Promise<Result> {
  const p = await payroll();
  if ("error" in p) return { ok: false, error: p.error! };
  if (!DATE_RE.test(start)) return { ok: false, error: "Elegí el inicio del periodo." };
  const { data, error } = await p.supabase.rpc("payroll_run_create", { p_period_start: start });
  if (error) return { ok: false, error: clockError(error) };
  refresh();
  return { ok: true, message: "Planilla creada.", id: data as string };
}

export async function computeRunAction(id: string): Promise<Result> {
  const p = await payroll();
  if ("error" in p) return { ok: false, error: p.error! };
  const { error } = await p.supabase.rpc("payroll_run_compute", { p_run_id: id });
  if (error) return { ok: false, error: clockError(error) };
  refresh();
  return { ok: true, message: "Recalculada con las horas, clases y tarifas de hoy." };
}

export async function setRunStatusAction(id: string, status: RunStatus): Promise<Result> {
  const p = await payroll();
  if ("error" in p) return { ok: false, error: p.error! };
  const { error } = await p.supabase.rpc("payroll_run_set_status", { p_run_id: id, p_status: status });
  if (error) return { ok: false, error: clockError(error) };
  refresh();
  const msg: Record<RunStatus, string> = { draft: "Volvió a borrador.", approved: "Planilla aprobada.", paid: "Marcada como pagada." };
  return { ok: true, message: msg[status] };
}

export async function deleteRunAction(id: string): Promise<Result> {
  const p = await payroll();
  if ("error" in p) return { ok: false, error: p.error! };
  const { error } = await p.supabase.rpc("payroll_run_delete", { p_run_id: id });
  if (error) return { ok: false, error: clockError(error) };
  refresh();
  return { ok: true, message: "Borrador eliminado." };
}

export type LineInput = { quantity_override: string; bonus: string; other_deductions: string; note: string };

export async function updateLineAction(id: string, input: LineInput): Promise<Result> {
  const p = await payroll();
  if ("error" in p) return { ok: false, error: p.error! };
  const bonus = money(input.bonus);
  const other = money(input.other_deductions);
  const qty = input.quantity_override.trim().replace(",", ".");
  if (bonus === null || other === null) return { ok: false, error: "Revisá los montos: solo números." };
  if (qty && !(Number(qty) >= 0 && Number(qty) <= 999)) return { ok: false, error: "Revisá la cantidad." };
  const { error } = await p.supabase.rpc("payroll_line_update", {
    p_line_id: id,
    p_data: { quantity_override: qty, bonus, other_deductions: other, note: input.note },
  });
  if (error) return { ok: false, error: clockError(error) };
  refresh();
  return { ok: true, message: "Línea actualizada." };
}
