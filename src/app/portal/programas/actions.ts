"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

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

function revalidateProgram(programId: string) {
  revalidatePath("/portal/programas");
  revalidatePath(`/portal/programas/${programId}`);
}

// ---------------------------------------------------------------------------
// Program CRUD
// ---------------------------------------------------------------------------

export type ProgramInput = {
  name: string;
  description: string;
};

export async function createProgramAction(
  input: ProgramInput,
): Promise<ActionResult<{ id: string }>> {
  const auth = await requireCoachId();
  if (!auth.ok) return auth;

  const name = input.name.trim();
  if (!name) return { ok: false, error: "El nombre es obligatorio." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("programs")
    .insert({
      coach_id: auth.coachId,
      name,
      description: input.description.trim() || null,
    })
    .select("id")
    .single<{ id: string }>();

  if (error || !data) {
    return { ok: false, error: "No se pudo crear el programa. Intentá de nuevo." };
  }

  revalidatePath("/portal/programas");
  return { ok: true, id: data.id };
}

export async function updateProgramAction(
  id: string,
  input: ProgramInput,
): Promise<ActionResult> {
  const auth = await requireCoachId();
  if (!auth.ok) return auth;

  const name = input.name.trim();
  if (!name) return { ok: false, error: "El nombre es obligatorio." };

  const supabase = await createClient();
  // RLS policy "coach manages own programs" enforces coach_id = auth.uid()
  const { error } = await supabase
    .from("programs")
    .update({ name, description: input.description.trim() || null })
    .eq("id", id);

  if (error) return { ok: false, error: "No se pudo guardar el programa. Intentá de nuevo." };

  revalidateProgram(id);
  return { ok: true };
}

export async function deleteProgramAction(id: string): Promise<ActionResult> {
  const auth = await requireCoachId();
  if (!auth.ok) return auth;

  const supabase = await createClient();
  // program_items cascade-delete with the program
  const { error } = await supabase.from("programs").delete().eq("id", id);

  if (error) return { ok: false, error: "No se pudo eliminar el programa. Intentá de nuevo." };

  revalidatePath("/portal/programas");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Program items
// ---------------------------------------------------------------------------

export async function addProgramItemAction(
  programId: string,
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
    .from("program_items")
    .select("order_index")
    .eq("program_id", programId)
    .eq("day_label", day)
    .order("order_index", { ascending: false })
    .limit(1)
    .maybeSingle<{ order_index: number }>();

  const { error } = await supabase.from("program_items").insert({
    program_id: programId,
    exercise_id: exerciseId,
    day_label: day,
    order_index: (last?.order_index ?? -1) + 1,
  });

  if (error) return { ok: false, error: "No se pudo agregar el ejercicio. Intentá de nuevo." };

  revalidateProgram(programId);
  return { ok: true };
}

export type ProgramItemInput = {
  sets: string;
  reps: string;
  notes: string;
};

export async function updateProgramItemAction(
  itemId: string,
  input: ProgramItemInput,
): Promise<ActionResult> {
  const auth = await requireCoachId();
  if (!auth.ok) return auth;

  const supabase = await createClient();
  const { error } = await supabase
    .from("program_items")
    .update({
      sets: input.sets.trim() || null,
      reps: input.reps.trim() || null,
      notes: input.notes.trim() || null,
    })
    .eq("id", itemId);

  if (error) return { ok: false, error: "No se pudo guardar el ejercicio. Intentá de nuevo." };

  revalidatePath("/portal/programas");
  return { ok: true };
}

export async function removeProgramItemAction(
  itemId: string,
  programId: string,
): Promise<ActionResult> {
  const auth = await requireCoachId();
  if (!auth.ok) return auth;

  const supabase = await createClient();
  const { error } = await supabase.from("program_items").delete().eq("id", itemId);

  if (error) return { ok: false, error: "No se pudo quitar el ejercicio. Intentá de nuevo." };

  revalidateProgram(programId);
  return { ok: true };
}

/**
 * Persists the full order of one day group. The client sends the item ids in
 * their new order; order_index is rewritten to match.
 */
export async function reorderDayItemsAction(
  programId: string,
  dayLabel: string,
  orderedItemIds: string[],
): Promise<ActionResult> {
  const auth = await requireCoachId();
  if (!auth.ok) return auth;

  const supabase = await createClient();
  const results = await Promise.all(
    orderedItemIds.map((id, index) =>
      supabase
        .from("program_items")
        .update({ order_index: index })
        .eq("id", id)
        .eq("program_id", programId)
        .eq("day_label", dayLabel),
    ),
  );

  if (results.some((r) => r.error)) {
    return { ok: false, error: "No se pudo reordenar. Intentá de nuevo." };
  }

  revalidateProgram(programId);
  return { ok: true };
}

export async function renameDayAction(
  programId: string,
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
    .from("program_items")
    .select("order_index")
    .eq("program_id", programId)
    .eq("day_label", next)
    .order("order_index", { ascending: false })
    .limit(1)
    .maybeSingle<{ order_index: number }>();

  const { data: moving, error: fetchError } = await supabase
    .from("program_items")
    .select("id")
    .eq("program_id", programId)
    .eq("day_label", oldLabel)
    .order("order_index", { ascending: true });

  if (fetchError) {
    return { ok: false, error: "No se pudo renombrar el día. Intentá de nuevo." };
  }

  const base = (existingLast?.order_index ?? -1) + 1;
  const results = await Promise.all(
    (moving ?? []).map((item, index) =>
      supabase
        .from("program_items")
        .update({ day_label: next, order_index: base + index })
        .eq("id", item.id),
    ),
  );

  if (results.some((r) => r.error)) {
    return { ok: false, error: "No se pudo renombrar el día. Intentá de nuevo." };
  }

  revalidateProgram(programId);
  return { ok: true };
}
