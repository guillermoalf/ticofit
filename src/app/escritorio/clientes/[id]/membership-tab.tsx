import { PaymentList, ReceiptList } from "@/components/billing/history";
import { MembershipCard } from "@/components/billing/membership-card";
import { formatMoment, todayCR } from "@/lib/clients/body";
import { signReceiptUrls } from "@/lib/billing/signed-urls";
import type { Overview, Payment, Plan, Receipt } from "@/lib/billing/types";
import type { Client } from "@/lib/clients/types";
import { can, type StaffContext } from "@/lib/staff/permissions";
import { createClient } from "@/lib/supabase/server";
import { MembershipControls } from "./membership-controls";

const EVENT: Record<string, string> = {
  assigned: "Plan asignado",
  plan_changed: "Cambio de plan",
  restarted: "Membresía reiniciada",
  reactivated: "Reactivada",
};

export async function MembershipTab({ client, staff }: { client: Client; staff: StaffContext }) {
  const supabase = await createClient();
  const [{ data: overview, error }, { data: plans }, { data: receipts }, { data: payments }, { data: events }, { data: people }] =
    await Promise.all([
      supabase.from("membership_overview").select("*").eq("client_id", client.id).maybeSingle<Overview>(),
      supabase.from("plans").select("*").eq("sede_id", client.sede_id).eq("kind", "membership").eq("active", true).order("sort_order"),
      supabase.from("payment_receipts").select("*").eq("client_id", client.id).order("created_at", { ascending: false }).limit(24),
      supabase.from("payments").select("*").eq("client_id", client.id).order("paid_on", { ascending: false }).limit(24),
      supabase.from("membership_events").select("*").eq("client_id", client.id).order("created_at", { ascending: false }).limit(12),
      supabase.from("staff").select("id, full_name"),
    ]);
  if (error || !overview) {
    return (
      <p role="alert" className="font-semibold text-[var(--danger)]">
        No se pudo cargar la membresía. Recargá la página.
      </p>
    );
  }

  const names = Object.fromEntries((people ?? []).map((p) => [p.id as string, p.full_name as string]));
  const list = (receipts ?? []) as Receipt[];
  const urls = await signReceiptUrls(list.map((r) => r.file_path));

  return (
    <div className="max-w-4xl space-y-8">
      <MembershipCard overview={overview} audience="staff" />
      <MembershipControls
        // Remount after every change so the forms start from the saved state.
        key={[overview.plan_id, overview.start_date, overview.periods_paid, overview.reactivated_until].join("|")}
        clientId={client.id}
        overview={overview}
        plans={(plans ?? []) as Plan[]}
        today={todayCR()}
        canAssign={can(staff, "memberships.write")}
        canCash={can(staff, "payments.cash")}
      />
      <section>
        <h2 className="mb-3 text-lg font-semibold">Comprobantes</h2>
        <ReceiptList receipts={list} urls={urls} />
      </section>
      <section>
        <h2 className="mb-3 text-lg font-semibold">Pagos</h2>
        <PaymentList payments={(payments ?? []) as Payment[]} people={names} />
      </section>
      {!!events?.length && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">Movimientos</h2>
          <ul className="space-y-1 text-[15px]">
            {events.map((e) => (
              <li key={e.id}>
                {formatMoment(e.created_at)} · {EVENT[e.kind] ?? e.kind}
                {e.note && ` · ${e.note}`}
                {e.created_by_staff && names[e.created_by_staff] && <span className="text-muted"> · {names[e.created_by_staff]}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
