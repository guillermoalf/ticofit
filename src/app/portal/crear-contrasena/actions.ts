"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ActionResult<T = undefined> =
  | ({ ok: true } & (T extends undefined ? object : T))
  | { ok: false; error: string };

/**
 * Remembers that the user has seen the "crear contraseña" step, so it stops
 * interrupting them on every visit. Purely a UI preference — it grants
 * nothing, and the step stays reachable from /portal/perfil afterwards.
 *
 * 0010's guard_protected_fields() leaves this column alone, so the user's own
 * "profile updates self" policy is enough; no service role involved.
 */
export async function dismissPasswordPromptAction(): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Tu sesión expiró. Iniciá sesión de nuevo." };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ password_prompt_dismissed: true })
    .eq("id", user.id);

  if (error) return { ok: false, error: "No se pudo guardar tu preferencia." };

  revalidatePath("/portal", "layout");
  return { ok: true };
}
