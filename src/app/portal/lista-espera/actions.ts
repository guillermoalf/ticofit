"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ActionResult = { ok: true } | { ok: false; error: string };

/**
 * Marks a waitlist row as notified (or back to pending). Runs through the
 * staff member's own session, so RLS ("staff updates waitlist") decides.
 */
export async function setNotificadoAction(id: string, notificado: boolean): Promise<ActionResult> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("waitlist")
    .update({ notificado })
    .eq("id", id)
    .select("id");

  if (error) return { ok: false, error: "No se pudo actualizar. Intentá de nuevo." };
  if (!data || data.length === 0) return { ok: false, error: "No autorizado." };

  revalidatePath("/portal/lista-espera");
  return { ok: true };
}
