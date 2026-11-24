import { notFound, redirect } from "next/navigation";

import { appCssVars } from "@/config/brand";
import { formatMoment } from "@/lib/clients/body";
import { displaySerif } from "@/lib/fonts";
import { requireProfile } from "@/lib/portal";
import { colones } from "@/lib/staff/clock";
import { getStaff, isDeskRole } from "@/lib/staff/context";
import { can } from "@/lib/staff/permissions";
import { PAY_TYPES, PERIODS, RUN_STATUS, loadRun, periodLabel, totals } from "@/lib/staff/payroll";
import { createClient } from "@/lib/supabase/server";
import { PrintButton } from "../../rutina/[id]/print-button";

export const dynamic = "force-dynamic";
export const metadata = { title: "Planilla" };

const UUID_RE = /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

/** Printable payroll run ("Guardar como PDF" from the print dialog). Payroll holders only. */
export default async function PrintPayrollPage({ params }: { params: Promise<{ id: string }> }) {
  const { profile } = await requireProfile();
  if (!isDeskRole(profile.role)) redirect("/portal");
  const staff = await getStaff();
  if (!staff) redirect("/bloqueo");
  if (!can(staff, "payroll.manage")) redirect("/escritorio");
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();
  const supabase = await createClient();
  const data = await loadRun(supabase, id);
  if (!data) notFound();
  const { run, lines, names } = data;
  const t = totals(lines);
  const th = "px-2 py-1.5 text-left font-semibold";
  const td = "px-2 py-1.5 tabular-nums";

  return (
    <div style={appCssVars()} className={`${displaySerif.variable} min-h-screen bg-base text-ink print:bg-white`}>
      <main className="mx-auto max-w-5xl px-5 py-8 print:max-w-none print:p-0">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <a href={`/escritorio/planilla/${run.id}`} className="text-sm text-muted hover:text-ink">
            ← Volver
          </a>
          <PrintButton />
        </div>
        <header className="mb-5 border-b border-border pb-4">
          <p className="text-sm text-muted">ticofit wellness club</p>
          <h1 className="font-tf-serif text-[32px] leading-tight">Planilla del {periodLabel(run)}</h1>
          <p className="text-[14px]">
            {PERIODS[run.period]} · {RUN_STATUS[run.status]}
            {run.approved_at && ` · aprobada por ${names.get(run.approved_by_staff ?? "") ?? "—"} el ${formatMoment(run.approved_at)}`}
            {run.paid_at && ` · pagada el ${formatMoment(run.paid_at)}`}
          </p>
        </header>
        <table className="w-full border-collapse text-[12px]">
          <thead className="border-b border-border-strong">
            <tr>
              <th className={th}>Nombre</th>
              <th className={th}>Pago</th>
              <th className={th}>Bruto</th>
              <th className={th}>CCSS</th>
              <th className={th}>B. Popular</th>
              <th className={th}>Renta</th>
              <th className={th}>Otras</th>
              <th className={th}>Neto</th>
              <th className={th}>Patrono</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l) => (
              <tr key={l.id} className="border-b border-border break-inside-avoid">
                <td className="px-2 py-1.5">{l.full_name}</td>
                <td className={td}>
                  {Number(l.quantity_override ?? l.quantity).toLocaleString("es-CR", { maximumFractionDigits: 2 })} {PAY_TYPES[l.pay_type].unit}
                </td>
                <td className={td}>{colones(l.gross)}</td>
                <td className={td}>{colones(l.ccss_employee)}</td>
                <td className={td}>{colones(l.banco_popular)}</td>
                <td className={td}>{colones(l.income_tax)}</td>
                <td className={td}>{colones(l.other_deductions)}</td>
                <td className={`${td} font-semibold`}>{colones(l.net)}</td>
                <td className={td}>{colones(l.employer_charges)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="font-semibold">
              <td className="px-2 py-2" colSpan={2}>
                Total
              </td>
              <td className={td}>{colones(t.gross)}</td>
              <td className={td} colSpan={4}>
                Deducciones {colones(t.deductions)}
              </td>
              <td className={td}>{colones(t.net)}</td>
              <td className={td}>{colones(t.employer)}</td>
            </tr>
          </tfoot>
        </table>
      </main>
    </div>
  );
}
