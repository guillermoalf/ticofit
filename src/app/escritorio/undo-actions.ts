"use server";

import { revalidatePath } from "next/cache";

import { staffForAction } from "@/lib/staff/context";
import type { UndoKind } from "@/lib/staff/undo";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type Result = { ok: true } | { ok: false; error: string };

const UUID_RE = /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

function undoError(message: string | undefined): string {
  if (message?.includes("NOT_ALLOWED")) return "Solo los dueños pueden borrar.";
  if (message?.includes("NOT_FOUND")) return "Ya no existe o no es de tu sede.";
  if (message?.includes("NOT_SELF")) return "No podés borrarte a vos mismo.";
  if (message?.includes("LAST_OWNER")) return "Tiene que quedar al menos un dueño activo.";
  if (message?.includes("STAFF_IN_PAYROLL")) return "Aparece en una planilla. Borrá primero esa planilla.";
  return "No se pudo borrar. Intentá de nuevo.";
}

/**
 * Owners only (data.delete): deletes a record and reverts what it caused, in
 * owner_delete() (migration 0030). The database hands back what SQL can't
 * remove itself: receipt files in storage and a client's login.
 */
export async function ownerDeleteAction(kind: UndoKind, id: string): Promise<Result> {
  const structure = kind === "salon" || kind === "discipline";
  const auth = await staffForAction(structure ? "salons.manage" : "data.delete");
  if (!auth.staff) return { ok: false, error: auth.error };
  if (!UUID_RE.test(id)) return { ok: false, error: "No se pudo borrar." };

  const supabase = await createClient();
  if (structure) {
    const { error } = await supabase.rpc("structure_delete", { p_kind: kind, p_id: id });
    if (error) return { ok: false, error: undoError(error.message) };
    revalidatePath("/escritorio", "layout");
    return { ok: true };
  }
  const { data, error } = await supabase.rpc("owner_delete", { p_kind: kind, p_id: id });
  if (error) return { ok: false, error: undoError(error.message) };

  const out = (data ?? {}) as { files?: string[] | null; user_id?: string | null };
  const admin = createAdminClient();
  if (out.files?.length) await admin.storage.from("receipts").remove(out.files);
  if (out.user_id) await admin.auth.admin.deleteUser(out.user_id);

  revalidatePath("/escritorio", "layout");
  return { ok: true };
}
