"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { logSet, parseSet } from "@/lib/weights";

type ActionResult = { ok: true } | { ok: false; error: string };

async function requireClientId(): Promise<
  { ok: true; clientId: string } | { ok: false; error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Tu sesión expiró. Iniciá sesión de nuevo." };

  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single<{ role: string }>();

  if (me?.role !== "client") return { ok: false, error: "No autorizado." };
  return { ok: true, clientId: user.id };
}

/**
 * Appends one set to the client's log for an exercise in their routine.
 *
 * `raw` is what they typed in the inline field — "275x4", "100 kg × 8", "60".
 * Parsing happens here rather than in the browser so a hand-crafted call can't
 * store something the UI would choke on.
 */
export async function logMySetAction(
  routineId: string,
  exerciseId: string,
  raw: string,
): Promise<ActionResult> {
  const auth = await requireClientId();
  if (!auth.ok) return auth;

  const parsed = parseSet(raw);
  if (parsed === null) return { ok: false, error: "Escribí el peso." };
  if (parsed === "invalid") {
    return { ok: false, error: "Escribilo como 60 o 60 x 8." };
  }

  const supabase = await createClient();

  // The exercise must really be in a routine assigned to this client, which
  // this single read proves on its own: routine_items' client policy is
  // routine_belongs_to_client(routine_id), so a row only comes back when the
  // routine is theirs AND the exercise is in it. A hand-crafted call with
  // someone else's ids gets null here.
  const { data: item } = await supabase
    .from("routine_items")
    .select("id")
    .eq("routine_id", routineId)
    .eq("exercise_id", exerciseId)
    .limit(1)
    .maybeSingle<{ id: string }>();

  if (!item) {
    return { ok: false, error: "Ese ejercicio no está en tu rutina." };
  }

  const { ok } = await logSet(supabase, {
    clientId: auth.clientId,
    exerciseId,
    routineId,
    set: parsed,
  });

  if (!ok) {
    return { ok: false, error: "No se pudo guardar. Intentá de nuevo." };
  }

  revalidatePath("/portal/rutina");
  return { ok: true };
}

/**
 * Removes one set the client logged. Scoped by client_id AND logged_by so a
 * stray id can only ever delete one of their own entries — the same pair the
 * "client deletes own weight logs" policy checks.
 */
export async function deleteMySetAction(logId: string): Promise<ActionResult> {
  const auth = await requireClientId();
  if (!auth.ok) return auth;

  const supabase = await createClient();
  const { error } = await supabase
    .from("exercise_weight_logs")
    .delete()
    .eq("id", logId)
    .eq("client_id", auth.clientId)
    .eq("logged_by", auth.clientId);

  if (error) return { ok: false, error: "No se pudo borrar. Intentá de nuevo." };

  revalidatePath("/portal/rutina");
  return { ok: true };
}
