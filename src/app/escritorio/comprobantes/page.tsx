import { DeskPageHeader } from "@/components/desk/page-header";
import { signReceiptUrls } from "@/lib/billing/signed-urls";
import type { Overview, Receipt } from "@/lib/billing/types";
import { activeSedeIds, requireStaff } from "@/lib/staff/context";
import { createClient } from "@/lib/supabase/server";
import { ReviewCard } from "./review-card";

export const dynamic = "force-dynamic";

/** SINPE receipts waiting at the desk, oldest first. */
export default async function ComprobantesPage() {
  const staff = await requireStaff("payments.review");
  const supabase = await createClient();
  const sedeIds = await activeSedeIds(staff);

  const { data: clients } = await supabase.from("membership_overview").select("client_id, full_name, price_crc").in("sede_id", sedeIds);
  const byClient = new Map(((clients ?? []) as Pick<Overview, "client_id" | "full_name" | "price_crc">[]).map((c) => [c.client_id, c]));

  const { data, error } = await supabase
    .from("payment_receipts")
    .select("*")
    .eq("status", "pending")
    .order("created_at")
    .limit(100);
  const pending = ((data ?? []) as Receipt[]).filter((r) => byClient.has(r.client_id));
  const urls = await signReceiptUrls(pending.map((r) => r.file_path));

  return (
    <>
      <DeskPageHeader
        title="Comprobantes"
        description="Al aprobar uno, la membresía del cliente se extiende un mes. Si lo rechazás, el cliente ve el motivo."
      />
      {error ? (
        <p role="alert" className="font-semibold text-[var(--danger)]">
          No se pudieron cargar los comprobantes. Recargá la página.
        </p>
      ) : pending.length ? (
        <ul className="max-w-4xl space-y-4">
          {pending.map((r) => {
            const c = byClient.get(r.client_id)!;
            return <ReviewCard key={r.id} receipt={r} clientName={c.full_name} planPrice={c.price_crc} url={urls[r.file_path] ?? null} />;
          })}
        </ul>
      ) : (
        <p className="rounded-2xl border border-dashed border-border-strong bg-surface px-5 py-10 text-center text-muted">
          No hay comprobantes por revisar.
        </p>
      )}
    </>
  );
}
