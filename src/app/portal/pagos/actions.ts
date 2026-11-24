"use server";

import { revalidatePath } from "next/cache";

import { isDate } from "@/lib/clients/parse";
import { requireProfile } from "@/lib/portal";
import { createClient } from "@/lib/supabase/server";

type Result = { ok: true } | { ok: false; error: string };

/** Registers a receipt the client already uploaded to their own folder. */
export async function submitReceiptAction(input: {
  path: string;
  amount: string;
  paid_on: string;
  reference: string;
}): Promise<Result> {
  const { userId, profile } = await requireProfile();
  if (profile.role !== "client") return { ok: false, error: "Solo los clientes suben comprobantes." };

  const supabase = await createClient();
  const { data: file } = await supabase.from("clients").select("id").eq("user_id", userId).maybeSingle();
  if (!file) return { ok: false, error: "Tu cuenta todavía no tiene expediente. Consultá en recepción." };
  if (!input.path.startsWith(`${file.id}/`) || input.path.includes("..")) return { ok: false, error: "Archivo inválido." };

  const amount = Number(input.amount.replace(/\D/g, ""));
  if (!Number.isInteger(amount) || amount < 1 || amount > 10_000_000) return { ok: false, error: "Revisá el monto." };
  if (!isDate(input.paid_on)) return { ok: false, error: "Revisá la fecha del pago." };

  const { error } = await supabase.from("payment_receipts").insert({
    client_id: file.id,
    file_path: input.path,
    amount_crc: amount,
    paid_on: input.paid_on,
    reference: input.reference.trim().slice(0, 60) || null,
  });
  if (error) {
    if (error.message.includes("DATE_OUT_OF_RANGE")) return { ok: false, error: "La fecha no puede ser futura ni de hace más de 4 meses." };
    if (error.message.includes("RECEIPT_FILE_MISSING")) return { ok: false, error: "No se subió el archivo. Intentá de nuevo." };
    return { ok: false, error: "No se pudo enviar. Intentá de nuevo." };
  }
  revalidatePath("/portal/pagos");
  return { ok: true };
}
