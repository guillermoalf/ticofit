import { createClient } from "@/lib/supabase/server";
import { EXERCISE_COLUMNS, ROUTINE_SELECT, normalizeRoutine, type Exercise, type Routine } from "./library";

type Supabase = Awaited<ReturnType<typeof createClient>>;

/** Library and favorites for the routine builder (archived exercises left out). */
export async function builderLibrary(supabase: Supabase, staffId: string) {
  const [{ data: exercises }, { data: favs }] = await Promise.all([
    supabase.from("exercises").select(EXERCISE_COLUMNS).in("source", ["system", "staff"]).eq("archived", false).order("name"),
    supabase.from("staff_exercise_favorites").select("exercise_id").eq("staff_id", staffId),
  ]);
  return {
    exercises: (exercises ?? []) as unknown as Exercise[],
    favoriteIds: (favs ?? []).map((f) => f.exercise_id as string),
  };
}

export async function loadRoutine(supabase: Supabase, id: string): Promise<Routine | null> {
  const { data } = await supabase.from("client_routines").select(ROUTINE_SELECT).eq("id", id).maybeSingle();
  return data ? normalizeRoutine(data as never) : null;
}

/** Exercises used by a routine, by id (readable by staff and by the routine's client). */
export async function routineExercises(supabase: Supabase, routine: Routine): Promise<Map<string, Exercise>> {
  const ids = [...new Set(routine.days.flatMap((d) => d.items.map((i) => i.exercise_id)))];
  if (!ids.length) return new Map();
  const { data } = await supabase.from("exercises").select(EXERCISE_COLUMNS).in("id", ids);
  return new Map(((data ?? []) as unknown as Exercise[]).map((e) => [e.id, e]));
}
