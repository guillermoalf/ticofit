import { formatDate, todayCR } from "@/lib/clients/body";
import { formatCRC, type Overview } from "@/lib/billing/types";
import { StatusBadge } from "./status-badge";

/** Plan, status and dates, the same for the client and the desk. */
export function MembershipCard({ overview: o, audience }: { overview: Overview; audience: "client" | "staff" }) {
  if (!o.has_membership) {
    return (
      <section className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
        <StatusBadge status="none" />
        <p className="mt-2 text-[15px] text-muted">
          {audience === "client" ? "Todavía no tenés un plan asignado. Consultá en recepción." : "Todavía no tiene un plan asignado."}
        </p>
      </section>
    );
  }

  const until =
    o.status !== "active"
      ? `Venció el ${formatDate(o.due_date!)}`
      : o.due_date === todayCR()
        ? "Vence hoy"
        : `Pagado hasta el ${formatDate(o.paid_through!)}`;
  return (
    <section className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xl font-semibold">{o.plan_name}</p>
        <StatusBadge status={o.status} />
      </div>
      <p className="mt-1 text-[15px] text-muted">
        {o.price_crc !== null && `${formatCRC(o.price_crc)} + IVA al mes · `}
        {until}
        {o.status !== "active" && o.days_overdue > 0 && ` · ${o.days_overdue} ${o.days_overdue === 1 ? "día" : "días"} de atraso`}
      </p>
      {o.status === "suspended" && (
        <p className="mt-3 text-[15px] font-semibold text-[var(--danger)]">
          {audience === "client"
            ? "Tu membresía está suspendida: tu rutina queda bloqueada hasta que se apruebe tu pago."
            : "Suspendido: la rutina está bloqueada y no puede reservar."}
        </p>
      )}
      {o.status === "overdue" && o.reactivated_until && o.reactivated_until >= todayCR() && (
        <p className="mt-2 text-sm text-muted">Reactivado hasta el {formatDate(o.reactivated_until)}.</p>
      )}
    </section>
  );
}
