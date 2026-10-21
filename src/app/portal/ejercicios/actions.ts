"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { extractYouTubeId } from "@/components/portal/youtube-embed";

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

/** Validates and normalises a YouTube URL to its embed form. */
function validateYouTubeUrl(raw: string): { id: string } | { error: string } {
  const id = extractYouTubeId(raw.trim());
  if (!id) {
    return {
      error:
        "El enlace no es un URL válido de YouTube. Pegá un enlace de watch, youtu.be o embed.",
    };
  }
  return { id };
}

/** Base library rows belong to no coach — only their own rows are editable. */
const NOT_OWN_EXERCISE =
  "Los ejercicios de la biblioteca base no se pueden editar ni eliminar.";

export type ExerciseInput = {
  name: string;
  category: string;
  youtube_url: string;
  is_explainer: boolean;
};

export async function createExerciseAction(
  input: ExerciseInput,
): Promise<ActionResult> {
  const auth = await requireCoachId();
  if (!auth.ok) return auth;

  const name = input.name.trim();
  if (!name) return { ok: false, error: "El nombre es obligatorio." };

  const parsed = validateYouTubeUrl(input.youtube_url);
  if ("error" in parsed) return { ok: false, error: parsed.error };

  const supabase = await createClient();
  const { error } = await supabase.from("exercises").insert({
    coach_id: auth.coachId,
    name,
    category: input.category.trim() || null,
    youtube_url: `https://www.youtube.com/embed/${parsed.id}`,
    is_explainer: input.is_explainer,
  });

  if (error) return { ok: false, error: "No se pudo guardar el ejercicio. Intentá de nuevo." };

  revalidatePath("/portal/ejercicios");
  return { ok: true };
}

export async function updateExerciseAction(
  id: string,
  input: ExerciseInput,
): Promise<ActionResult> {
  const auth = await requireCoachId();
  if (!auth.ok) return auth;

  const name = input.name.trim();
  if (!name) return { ok: false, error: "El nombre es obligatorio." };

  const parsed = validateYouTubeUrl(input.youtube_url);
  if ("error" in parsed) return { ok: false, error: parsed.error };

  const supabase = await createClient();
  // coach_id is matched explicitly, not just left to the RLS policy: a base
  // library row (coach_id null) would otherwise match zero rows and return no
  // error, so the UI would report a save that never happened. select() lets us
  // tell "not yours" from "saved" without a second round trip.
  const { data: updated, error } = await supabase
    .from("exercises")
    .update({
      name,
      category: input.category.trim() || null,
      youtube_url: `https://www.youtube.com/embed/${parsed.id}`,
      is_explainer: input.is_explainer,
    })
    .eq("id", id)
    .eq("coach_id", auth.coachId)
    .select("id");

  if (error) return { ok: false, error: "No se pudo actualizar el ejercicio. Intentá de nuevo." };
  if (!updated || updated.length === 0) return { ok: false, error: NOT_OWN_EXERCISE };

  revalidatePath("/portal/ejercicios");
  return { ok: true };
}

export async function deleteExerciseAction(id: string): Promise<ActionResult> {
  const auth = await requireCoachId();
  if (!auth.ok) return auth;

  const supabase = await createClient();
  const { data: deleted, error } = await supabase
    .from("exercises")
    .delete()
    .eq("id", id)
    .eq("coach_id", auth.coachId)
    .select("id");

  if (error) {
    // Postgres restrict FK: exercise is referenced by an active routine
    if (error.code === "23503") {
      return {
        ok: false,
        error:
          "No se puede eliminar este ejercicio porque está siendo usado en una rutina activa.",
      };
    }
    return { ok: false, error: "No se pudo eliminar el ejercicio. Intentá de nuevo." };
  }

  if (!deleted || deleted.length === 0) return { ok: false, error: NOT_OWN_EXERCISE };

  revalidatePath("/portal/ejercicios");
  return { ok: true };
}
