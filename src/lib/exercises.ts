import type { createClient } from "@/lib/supabase/server";
import type { Exercise } from "@/types/db";

type ServerClient = Awaited<ReturnType<typeof createClient>>;

/**
 * The exercise library a coach builds routines from: the shared base library
 * (source 'system', owned by no coach) plus their own rows, sorted by name so
 * both origins interleave alphabetically instead of splitting into blocks.
 *
 * RLS already narrows the table to exactly this set for a coach, but the
 * filter is spelled out so the three call sites stay explicit about intent —
 * and so an admin session never picks up a foreign coach's rows.
 */
export async function fetchCoachLibrary(
  supabase: ServerClient,
  coachId: string,
): Promise<Exercise[]> {
  const { data } = await supabase
    .from("exercises")
    .select("*")
    .or(`coach_id.eq.${coachId},source.eq.system`)
    .order("name", { ascending: true });

  return (data ?? []) as Exercise[];
}
