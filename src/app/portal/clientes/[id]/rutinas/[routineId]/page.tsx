import { notFound, redirect } from "next/navigation";
import { requireProfile } from "@/lib/portal";
import { createClient } from "@/lib/supabase/server";
import { fetchCoachLibrary } from "@/lib/exercises";
import { fetchWeightHistory } from "@/lib/weights";
import type { Routine, RoutineItemWithExercise } from "@/types/db";
import { RoutineBuilder } from "./routine-builder";

export const dynamic = "force-dynamic";

export default async function RoutineDetailPage({
  params,
}: {
  params: Promise<{ id: string; routineId: string }>;
}) {
  const { id, routineId } = await params;
  const { userId, profile } = await requireProfile();

  if (profile.role !== "coach") redirect("/portal/inicio");

  const supabase = await createClient();

  // RLS scopes routines to the coach's own rows, so a foreign id returns null.
  const [{ data: routine }, { data: client }, { data: items }, exercises] =
    await Promise.all([
      supabase.from("routines").select("*").eq("id", routineId).single<Routine>(),
      supabase
        .from("profiles")
        .select("full_name")
        .eq("id", id)
        .single<{ full_name: string | null }>(),
      supabase
        .from("routine_items")
        .select("*, exercise:exercises(*)")
        .eq("routine_id", routineId)
        .order("day_label", { ascending: true })
        .order("order_index", { ascending: true }),
      fetchCoachLibrary(supabase, userId),
    ]);

  if (!routine || routine.client_id !== id) notFound();

  const routineItems = (items ?? []) as RoutineItemWithExercise[];

  // Depends on the item rows, so it cannot join the batch above.
  const weightHistory = await fetchWeightHistory(
    supabase,
    id,
    routineItems.map((item) => item.exercise_id),
  );

  return (
    <RoutineBuilder
      routine={routine}
      clientId={id}
      clientName={client?.full_name ?? null}
      items={routineItems}
      exercises={exercises}
      weightHistory={weightHistory}
    />
  );
}
