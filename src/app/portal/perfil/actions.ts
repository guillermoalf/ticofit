"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ActionResult = { ok: true } | { ok: false; error: string };

/**
 * Updates the signed-in user's own contact details.
 *
 * Deliberately narrow: name and phone only. The email is the account's
 * identity (and the pre-authorization key from 0009/0010), so it is never
 * editable from here. Runs on the user's own client, so the "update own
 * profile" policy from 0001 is what authorizes the write.
 */
export async function updateOwnProfileAction(input: {
  full_name: string;
  phone: string;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, error: "Tu sesión expiró. Entrá de nuevo." };

  const full_name = input.full_name.trim();
  if (!full_name) return { ok: false, error: "El nombre es obligatorio." };

  const { error } = await supabase
    .from("profiles")
    .update({ full_name, phone: input.phone.trim() || null })
    .eq("id", user.id);

  if (error) return { ok: false, error: "No se pudo guardar. Intentá de nuevo." };

  revalidatePath("/portal/perfil");
  return { ok: true };
}
