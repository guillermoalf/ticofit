"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { parseWeight } from "@/lib/weights";

type ActionResult<T = undefined> =
  | ({ ok: true } & (T extends undefined ? object : T))
  | { ok: false; error: string };

async function requireCoachId(): Promise<
  { ok: true; coachId: string } | { ok: false; error: string }
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

  if (me?.role !== "coach") return { ok: false, error: "No autorizado." };
  return { ok: true, coachId: user.id };
}

function revalidateRoutinePaths(clientId: string, routineId?: string) {
  revalidatePath(`/portal/clientes/${clientId}`);
  if (routineId) {
    revalidatePath(`/portal/clientes/${clientId}/rutinas/${routineId}`);
  }
}

/** Resolves the routine's client (RLS-scoped) to revalidate its pages. */
async function revalidateRoutine(routineId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("routines")
    .select("client_id")
    .eq("id", routineId)
    .maybeSingle<{ client_id: string }>();
  if (data) revalidateRoutinePaths(data.client_id, routineId);
}

// ---------------------------------------------------------------------------
// Routine CRUD
// ---------------------------------------------------------------------------

/**
 * Assigns a program to a client by DEEP-COPYING it into a routine snapshot:
 * a new `routines` row plus one `routine_items` copy per program item. The
 * copies only share exercise_id references with the source, so editing the
 * program afterwards never affects the routine, and vice versa.
 */
export async function assignProgramAsRoutineAction(
  clientId: string,
  programId: string,
): Promise<ActionResult<{ id: string }>> {
  const auth = await requireCoachId();
  if (!auth.ok) return auth;

  const supabase = await createClient();

  // RLS scopes programs to the coach's own rows, so a foreign id returns null.
  const { data: program } = await supabase
    .from("programs")
    .select("id, name")
    .eq("id", programId)
    .maybeSingle<{ id: string; name: string }>();

  if (!program) return { ok: false, error: "No se encontró el programa." };

  const { data: items, error: itemsError } = await supabase
    .from("program_items")
    .select("exercise_id, day_label, order_index, sets, reps, notes")
    .eq("program_id", programId);

  if (itemsError) {
    return { ok: false, error: "No se pudo leer el programa. Intentá de nuevo." };
  }

  // RLS ("coach manages own routines") also verifies the client is ours.
  const { data: routine, error: routineError } = await supabase
    .from("routines")
    .insert({
      client_id: clientId,
      coach_id: auth.coachId,
      name: program.name,
      source_program_id: programId,
    })
    .select("id")
    .single<{ id: string }>();

  if (routineError || !routine) {
    return { ok: false, error: "No se pudo asignar la rutina. Intentá de nuevo." };
  }

  if ((items ?? []).length > 0) {
    const { error: copyError } = await supabase.from("routine_items").insert(
      (items ?? []).map((item) => ({ ...item, routine_id: routine.id })),
    );

    if (copyError) {
      // Roll back the head row so the coach can retry cleanly.
      await supabase.from("routines").delete().eq("id", routine.id);
      return { ok: false, error: "No se pudo copiar el programa. Intentá de nuevo." };
    }
  }

  revalidateRoutinePaths(clientId);
  return { ok: true, id: routine.id };
}

/** Creates an empty routine the coach then fills in with the builder. */
export async function createRoutineAction(
  clientId: string,
  name: string,
): Promise<ActionResult<{ id: string }>> {
  const auth = await requireCoachId();
  if (!auth.ok) return auth;

  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: "El nombre es obligatorio." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("routines")
    .insert({ client_id: clientId, coach_id: auth.coachId, name: trimmed })
    .select("id")
    .single<{ id: string }>();

  if (error || !data) {
    return { ok: false, error: "No se pudo crear la rutina. Intentá de nuevo." };
  }

  revalidateRoutinePaths(clientId);
  return { ok: true, id: data.id };
}

export async function renameRoutineAction(
  routineId: string,
  name: string,
): Promise<ActionResult> {
  const auth = await requireCoachId();
  if (!auth.ok) return auth;

  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: "El nombre es obligatorio." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("routines")
    .update({ name: trimmed })
    .eq("id", routineId)
    .select("client_id")
    .single<{ client_id: string }>();

  if (error || !data) {
    return { ok: false, error: "No se pudo guardar la rutina. Intentá de nuevo." };
  }

  revalidateRoutinePaths(data.client_id, routineId);
  return { ok: true };
}

export async function deleteRoutineAction(
  routineId: string,
  clientId: string,
): Promise<ActionResult> {
  const auth = await requireCoachId();
  if (!auth.ok) return auth;

  const supabase = await createClient();
  // routine_items cascade-delete with the routine
  const { error } = await supabase.from("routines").delete().eq("id", routineId);

  if (error) {
    return { ok: false, error: "No se pudo eliminar la rutina. Intentá de nuevo." };
  }

  revalidateRoutinePaths(clientId);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Routine items — mirrors the program_items actions against routine_items
// ---------------------------------------------------------------------------

export async function addRoutineItemAction(
  routineId: string,
  exerciseId: string,
  dayLabel: string,
): Promise<ActionResult> {
  const auth = await requireCoachId();
  if (!auth.ok) return auth;

  const day = dayLabel.trim();
  if (!day) return { ok: false, error: "El día es obligatorio." };

  const supabase = await createClient();

  // Append at the end of the day group.
  const { data: last } = await supabase
    .from("routine_items")
    .select("order_index")
    .eq("routine_id", routineId)
    .eq("day_label", day)
    .order("order_index", { ascending: false })
    .limit(1)
    .maybeSingle<{ order_index: number }>();

  const { error } = await supabase.from("routine_items").insert({
    routine_id: routineId,
    exercise_id: exerciseId,
    day_label: day,
    order_index: (last?.order_index ?? -1) + 1,
  });

  if (error) return { ok: false, error: "No se pudo agregar el ejercicio. Intentá de nuevo." };

  await revalidateRoutine(routineId);
  return { ok: true };
}

export type RoutineItemInput = {
  sets: string;
  reps: string;
  notes: string;
  /** Free text as typed; "" clears the weight. Parsed by parseWeight(). */
  weight: string;
};

export async function updateRoutineItemAction(
  routineId: string,
  itemId: string,
  input: RoutineItemInput,
): Promise<ActionResult> {
  const auth = await requireCoachId();
  if (!auth.ok) return auth;

  const weight = parseWeight(input.weight);
  if (weight === "invalid") {
    return { ok: false, error: "El peso debe ser un número (ej. 60 o 22.5)." };
  }

  const supabase = await createClient();
  const { data: item, error } = await supabase
    .from("routine_items")
    .update({
      sets: input.sets.trim() || null,
      reps: input.reps.trim() || null,
      notes: input.notes.trim() || null,
      weight,
    })
    .eq("id", itemId)
    .eq("routine_id", routineId)
    .select("id")
    .maybeSingle<{ id: string }>();

  if (error || !item) {
    return { ok: false, error: "No se pudo guardar el ejercicio. Intentá de nuevo." };
  }

  // The prescribed load lives on the routine item and nowhere else. It is
  // deliberately NOT written into exercise_weight_logs: that table is the
  // client's training log, and a prescription mixed into it makes both harder
  // to read. The coach sees the client's real sets there instead.
  await revalidateRoutine(routineId);
  return { ok: true };
}

export async function removeRoutineItemAction(
  routineId: string,
  itemId: string,
): Promise<ActionResult> {
  const auth = await requireCoachId();
  if (!auth.ok) return auth;

  const supabase = await createClient();
  const { error } = await supabase
    .from("routine_items")
    .delete()
    .eq("id", itemId)
    .eq("routine_id", routineId);

  if (error) return { ok: false, error: "No se pudo quitar el ejercicio. Intentá de nuevo." };

  await revalidateRoutine(routineId);
  return { ok: true };
}

/**
 * Persists the full order of one day group. The client sends the item ids in
 * their new order; order_index is rewritten to match.
 */
export async function reorderRoutineDayAction(
  routineId: string,
  dayLabel: string,
  orderedItemIds: string[],
): Promise<ActionResult> {
  const auth = await requireCoachId();
  if (!auth.ok) return auth;

  const supabase = await createClient();
  const results = await Promise.all(
    orderedItemIds.map((id, index) =>
      supabase
        .from("routine_items")
        .update({ order_index: index })
        .eq("id", id)
        .eq("routine_id", routineId)
        .eq("day_label", dayLabel),
    ),
  );

  if (results.some((r) => r.error)) {
    return { ok: false, error: "No se pudo reordenar. Intentá de nuevo." };
  }

  await revalidateRoutine(routineId);
  return { ok: true };
}

export async function renameRoutineDayAction(
  routineId: string,
  oldLabel: string,
  newLabel: string,
): Promise<ActionResult> {
  const auth = await requireCoachId();
  if (!auth.ok) return auth;

  const next = newLabel.trim();
  if (!next) return { ok: false, error: "El nombre del día es obligatorio." };

  const supabase = await createClient();

  // If the target label already exists this rename merges two day groups:
  // re-index the moved items after the existing ones to keep order stable.
  const { data: existingLast } = await supabase
    .from("routine_items")
    .select("order_index")
    .eq("routine_id", routineId)
    .eq("day_label", next)
    .order("order_index", { ascending: false })
    .limit(1)
    .maybeSingle<{ order_index: number }>();

  const { data: moving, error: fetchError } = await supabase
    .from("routine_items")
    .select("id")
    .eq("routine_id", routineId)
    .eq("day_label", oldLabel)
    .order("order_index", { ascending: true });

  if (fetchError) {
    return { ok: false, error: "No se pudo renombrar el día. Intentá de nuevo." };
  }

  const base = (existingLast?.order_index ?? -1) + 1;
  const results = await Promise.all(
    (moving ?? []).map((item, index) =>
      supabase
        .from("routine_items")
        .update({ day_label: next, order_index: base + index })
        .eq("id", item.id),
    ),
  );

  if (results.some((r) => r.error)) {
    return { ok: false, error: "No se pudo renombrar el día. Intentá de nuevo." };
  }

  await revalidateRoutine(routineId);
  return { ok: true };
}
