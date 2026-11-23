import Link from "next/link";

import { StatusBadge } from "@/components/billing/status-badge";
import { DeskPageHeader } from "@/components/desk/page-header";
import { formatDate } from "@/lib/clients/body";
import { STATUS_LABEL, whatsappLink, type MembershipStatus, type Overview } from "@/lib/billing/types";
import { activeSedeIds, requireStaff } from "@/lib/staff/context";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const FILTERS: ("todos" | MembershipStatus)[] = ["todos", "overdue", "suspended", "active", "none"];
const ORDER: Record<MembershipStatus, number> = { suspended: 0, overdue: 1, none: 2, active: 3 };

/** Who is paid up, who is late and who is suspended. */
export default async function AlDiaPage({ searchParams }: { searchParams: Promise<{ estado?: string }> }) {
  const staff = await requireStaff("clients.read");
  const { estado } = await searchParams;
  const filter = FILTERS.find((f) => f === estado) ?? "todos";
  const supabase = await createClient();
  const sedeIds = await activeSedeIds(staff);

  const { data, error } = await supabase.from("membership_overview").select("*").in("sede_id", sedeIds).limit(2000);
  const rows = ((data ?? []) as Overview[]).sort(
    (a, b) => ORDER[a.status] - ORDER[b.status] || b.days_overdue - a.days_overdue || a.full_name.localeCompare(b.full_name, "es"),
  );
  const count = (s: MembershipStatus) => rows.filter((r) => r.status === s).length;
  const shown = filter === "todos" ? rows : rows.filter((r) => r.status === filter);

  return (
    <>
      <DeskPageHeader title="Quién está al día" />
      <nav aria-label="Filtrar" className="mb-5 flex flex-wrap gap-x-5 gap-y-1 border-b border-border">
        {FILTERS.map((f) => (
          <Link
            key={f}
            href={f === "todos" ? "/escritorio/al-dia" : `/escritorio/al-dia?estado=${f}`}
            aria-current={f === filter ? "page" : undefined}
            className={cn(
              "-mb-px inline-flex min-h-11 items-center border-b-2 text-[15px]",
              f === filter ? "border-primary font-semibold text-ink" : "border-transparent text-muted hover:text-ink",
            )}
          >
            {f === "todos" ? `Todos (${rows.length})` : `${STATUS_LABEL[f]} (${count(f)})`}
          </Link>
        ))}
      </nav>

      {error ? (
        <p role="alert" className="font-semibold text-[var(--danger)]">
          No se pudo cargar la lista. Recargá la página.
        </p>
      ) : shown.length ? (
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
          {shown.map((r) => {
            const late = r.status === "overdue" || r.status === "suspended";
            const wa =
              late && r.due_date
                ? whatsappLink(
                    r.phone,
                    `Hola ${r.full_name.split(" ")[0]}, te escribimos de ticofit. Tu mensualidad venció el ${formatDate(r.due_date)}. Podés subir el comprobante del SINPE en tu portal o pagar en recepción. ¡Gracias!`,
                  )
                : null;
            return (
              <li key={r.client_id} className="flex flex-wrap items-center gap-x-6 gap-y-1.5 px-5 py-3">
                <div className="min-w-0 basis-full sm:basis-0 sm:flex-1">
                  <Link href={`/escritorio/clientes/${r.client_id}?tab=pagos`} className="font-semibold hover:underline">
                    {r.full_name}
                  </Link>
                  <p className="text-sm text-muted">
                    {r.plan_name ?? "Sin plan"}
                    {r.due_date && (late ? ` · venció el ${formatDate(r.due_date)}` : ` · vence el ${formatDate(r.due_date)}`)}
                    {late && r.days_overdue > 0 && ` · ${r.days_overdue} ${r.days_overdue === 1 ? "día" : "días"}`}
                    {r.last_paid_on && ` · último pago ${formatDate(r.last_paid_on)}`}
                  </p>
                </div>
                <StatusBadge status={r.status} className="text-sm" />
                {wa && (
                  <a href={wa} target="_blank" rel="noreferrer" className="text-sm font-semibold underline underline-offset-2">
                    Recordar por WhatsApp
                  </a>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="rounded-2xl border border-dashed border-border-strong bg-surface px-5 py-10 text-center text-muted">
          No hay clientes en esta lista.
        </p>
      )}
    </>
  );
}
