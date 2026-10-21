import type { createClient } from "@/lib/supabase/server";
import type { ExerciseWeightLog, WeightHistoryByExercise } from "@/types/db";

type ServerClient = Awaited<ReturnType<typeof createClient>>;

/** How many past entries per exercise the history panel shows. */
const MAX_ENTRIES_PER_EXERCISE = 12;

/**
 * A client's weight record for a set of exercises, grouped by exercise id and
 * newest first — what powers the "última vez" hint and the history panel.
 *
 * RLS ("coach manages client weight logs" / "client reads own weight logs")
 * already scopes the table, so this is safe to call from either portal; the
 * client_id filter is spelled out anyway to keep the intent explicit.
 */
export async function fetchWeightHistory(
  supabase: ServerClient,
  clientId: string,
  exerciseIds: string[],
): Promise<WeightHistoryByExercise> {
  const unique = Array.from(new Set(exerciseIds));
  if (unique.length === 0) return {};

  const { data } = await supabase
    .from("exercise_weight_logs")
    .select("*")
    .eq("client_id", clientId)
    .in("exercise_id", unique)
    .order("logged_at", { ascending: false });

  const grouped: WeightHistoryByExercise = {};
  for (const row of (data ?? []) as ExerciseWeightLog[]) {
    const list = grouped[row.exercise_id] ?? [];
    if (list.length < MAX_ENTRIES_PER_EXERCISE) list.push(row);
    grouped[row.exercise_id] = list;
  }
  return grouped;
}

/** Reads one number: "60", "22.5", "22,5". Null when it isn't a usable load. */
function readNumber(raw: string): number | null {
  const value = Number(raw.replace(",", "."));
  if (!Number.isFinite(value) || value < 0 || value > 9999.99) return null;
  // Match the column's scale so what we store is what the user sees back.
  return Math.round(value * 100) / 100;
}

/**
 * Reads a weight typed on a phone: "60", "22.5", "22,5 kg".
 * Returns null for an empty field (weight cleared) and `invalid` for anything
 * that isn't a sane, non-negative number the numeric(6,2) column can hold.
 * Used by the coach's prescription field, which has no rep count.
 */
export function parseWeight(raw: string): number | null | "invalid" {
  const trimmed = raw.trim().replace(/\s*kg$/i, "");
  if (!trimmed) return null;
  return readNumber(trimmed) ?? "invalid";
}

export type ParsedSet = { weight: number; reps: number | null };

/**
 * Reads a set the way it gets written in a training notebook — one field, one
 * line: "275x4", "275 × 4", "100*8", "60 12", or just "60" with no rep count.
 *
 * Returns null for an empty field, `invalid` for anything else, so the caller
 * can tell "nothing typed" apart from "typed wrong".
 */
export function parseSet(raw: string): ParsedSet | null | "invalid" {
  const cleaned = raw.trim().toLowerCase().replace(/kg|reps?/g, " ").trim();
  if (!cleaned) return null;

  // Any of the separators people reach for, or plain whitespace between the
  // two numbers.
  const parts = cleaned.split(/\s*[x×*\/@-]\s*|\s+/).filter(Boolean);
  if (parts.length > 2) return "invalid";

  const weight = readNumber(parts[0]);
  if (weight === null) return "invalid";

  if (parts.length === 1) return { weight, reps: null };

  const reps = Number(parts[1]);
  if (!Number.isInteger(reps) || reps < 1 || reps > 999) return "invalid";
  return { weight, reps };
}

/**
 * Appends one set to a client's log.
 *
 * Always an INSERT — never a "same weight, skip it" or a silent replace of a
 * recent entry. Both would be wrong now that a session is several sets: 275×4
 * followed by 220×12 two minutes later are two records, and 60×10 done again
 * next week is exactly the record worth keeping. Removing a mistyped set is a
 * separate, explicit delete.
 */
export async function logSet(
  supabase: ServerClient,
  params: {
    clientId: string;
    exerciseId: string;
    routineId: string;
    set: ParsedSet;
  },
): Promise<{ ok: boolean }> {
  const { error } = await supabase.from("exercise_weight_logs").insert({
    client_id: params.clientId,
    exercise_id: params.exerciseId,
    routine_id: params.routineId,
    weight: params.set.weight,
    reps: params.set.reps,
    logged_by: params.clientId,
  });
  return { ok: !error };
}
