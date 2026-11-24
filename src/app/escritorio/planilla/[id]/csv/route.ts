import { NextResponse } from "next/server";

import { getStaff } from "@/lib/staff/context";
import { can } from "@/lib/staff/permissions";
import { PAY_TYPES, loadRun } from "@/lib/staff/payroll";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

/** Spreadsheet-safe cell: quoted, and never read as a formula. */
function cell(v: string | number | null | undefined): string {
  let s = v == null ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

/** A payroll run as CSV (UTF-8 with BOM so Excel reads the accents). */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const staff = await getStaff();
  if (!can(staff, "payroll.manage")) return new NextResponse("No autorizado", { status: 403 });
  const { id } = await params;
  if (!UUID_RE.test(id)) return new NextResponse("No encontrada", { status: 404 });
  const supabase = await createClient();
  const data = await loadRun(supabase, id);
  if (!data) return new NextResponse("No encontrada", { status: 404 });
  const { run, lines } = data;

  const [{ data: emp }] = await Promise.all([supabase.from("staff_employment").select("staff_id, cedula, iban")]);
  const ids = new Map(((emp ?? []) as { staff_id: string; cedula: string | null; iban: string | null }[]).map((e) => [e.staff_id, e]));

  const header = [
    "Nombre", "Cédula", "IBAN", "Forma de pago", "Cantidad", "Tarifa", "Extra", "Bruto",
    "CCSS trabajador", "Banco Popular", "Renta", "Otras deducciones", "Neto", "Cargas patrono", "Nota",
  ];
  const rows = lines.map((l) => [
    l.full_name,
    ids.get(l.staff_id)?.cedula ?? "",
    ids.get(l.staff_id)?.iban ?? "",
    PAY_TYPES[l.pay_type].label,
    Number(l.quantity_override ?? l.quantity),
    Number(l.rate),
    Number(l.bonus),
    Number(l.gross),
    Number(l.ccss_employee),
    Number(l.banco_popular),
    Number(l.income_tax),
    Number(l.other_deductions),
    Number(l.net),
    Number(l.employer_charges),
    l.note ?? "",
  ]);
  const csv = "﻿" + [header, ...rows].map((r) => r.map(cell).join(",")).join("\r\n") + "\r\n";
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="planilla-${run.period_start}-a-${run.period_end}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
