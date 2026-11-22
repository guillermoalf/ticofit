import { redirect } from "next/navigation";

import { PaymentList, ReceiptList } from "@/components/billing/history";
import { MembershipCard } from "@/components/billing/membership-card";
import { todayCR } from "@/lib/clients/body";
import { signReceiptUrls } from "@/lib/billing/signed-urls";
import type { Overview, Payment, Receipt } from "@/lib/billing/types";
import { requireProfile } from "@/lib/portal";
import { createClient } from "@/lib/supabase/server";
import { ReceiptUpload } from "./receipt-upload";

export const dynamic = "force-dynamic";

/** The client's membership, their receipts and how each one went. */
export default async function PagosPage() {
  const { profile, userId } = await requireProfile();
  if (profile.role !== "client") redirect("/portal");

  const supabase = await createClient();
  const { data: file } = await supabase.from("clients").select("id").eq("user_id", userId).maybeSingle();

  if (!file) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
        <h1 className="mb-4 font-tf-serif text-[40px] leading-tight">Mis pagos</h1>
        <p className="text-muted">Tu cuenta todavía no tiene expediente. Consultá en recepción.</p>
      </main>
    );
  }

  const [{ data: overview, error }, { data: receipts }, { data: payments }] = await Promise.all([
    supabase.from("membership_overview").select("*").eq("client_id", file.id).maybeSingle<Overview>(),
    supabase.from("payment_receipts").select("*").eq("client_id", file.id).order("created_at", { ascending: false }).limit(24),
    supabase.from("payments").select("*").eq("client_id", file.id).order("paid_on", { ascending: false }).limit(24),
  ]);
  const list = (receipts ?? []) as Receipt[];
  const urls = await signReceiptUrls(list.map((r) => r.file_path));

  return (
    <main className="mx-auto max-w-3xl space-y-8 px-4 py-8 sm:px-6 sm:py-12">
      <h1 className="font-tf-serif text-[40px] leading-tight">Mis pagos</h1>
      {error || !overview ? (
        <p role="alert" className="font-semibold text-[var(--danger)]">
          No pudimos cargar tu membresía. Recargá la página.
        </p>
      ) : (
        <>
          <MembershipCard overview={overview} audience="client" />
          {overview.has_membership && (
            <ReceiptUpload clientId={file.id} suggested={overview.price_crc ? String(overview.price_crc) : ""} today={todayCR()} />
          )}
        </>
      )}
      <section>
        <h2 className="mb-3 text-lg font-semibold">Comprobantes</h2>
        <ReceiptList receipts={list} urls={urls} />
      </section>
      <section>
        <h2 className="mb-3 text-lg font-semibold">Pagos registrados</h2>
        <PaymentList payments={(payments ?? []) as Payment[]} />
      </section>
    </main>
  );
}
