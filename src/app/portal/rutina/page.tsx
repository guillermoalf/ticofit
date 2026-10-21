import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/portal";
import { createClient } from "@/lib/supabase/server";
import { PlanSummary } from "@/components/portal/plan-summary";
import { fetchWeightHistory } from "@/lib/weights";
import type { Routine, RoutineItemWithExercise } from "@/types/db";
import { deleteMySetAction, logMySetAction } from "./actions";

export const dynamic = "force-dynamic";

const assignedFmt = new Intl.DateTimeFormat("es-CR", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

/**
 * The client's own routine. Reads through the "client reads own routines" /
 * "client reads own routine items" policies from 0003 — no coach_id filter
 * here, RLS scopes the rows to auth.uid().
 *
 * This is also the client's training log: every exercise row carries an inline
 * field where they write the set they just did (see migrations 0020 / 0021).
 */
export default async function RutinaPage() {
  const { userId, profile } = await requireProfile();
  if (profile.role !== "client") redirect("/portal/clientes");

  const supabase = await createClient();

  const { data: routineRows } = await supabase
    .from("routines")
    .select("*")
    .order("assigned_at", { ascending: false });

  const routines = (routineRows ?? []) as Routine[];

  const { data: itemRows } = routines.length
    ? await supabase
        .from("routine_items")
        .select("*, exercise:exercises(*)")
        .in(
          "routine_id",
          routines.map((r) => r.id),
        )
        .order("day_label", { ascending: true })
        .order("order_index", { ascending: true })
    : { data: [] };

  const items = (itemRows ?? []) as RoutineItemWithExercise[];

  // Reads through "client reads own weight logs": the client sees the record
  // of what they have been lifting, exactly as the coach entered it.
  const weightHistory = await fetchWeightHistory(
    supabase,
    userId,
    items.map((item) => item.exercise_id),
  );

  return (
    <main className="mx-auto max-w-3xl px-5 py-10 sm:px-6 sm:py-12">
      <header>
        <p className="text-sm uppercase tracking-widest text-primary">
          Tu portal
        </p>
        <h1 className="mt-1 font-display text-3xl font-bold sm:text-4xl">
          Mi rutina
        </h1>
      </header>

      {routines.length === 0 ? (
        <p className="mt-8 rounded-card border border-dashed border-border-strong px-4 py-10 text-center text-sm text-muted-2">
          Tu entrenador todavía no te asignó una rutina.
        </p>
      ) : (
        <div className="mt-8 flex flex-col gap-8">
          {routines.map((routine) => (
            <section key={routine.id}>
              <div className="mb-3">
                <h2 className="font-display text-xl font-semibold text-ink">
                  {routine.name}
                </h2>
                <p className="mt-0.5 text-xs text-muted">
                  Asignada el{" "}
                  {assignedFmt.format(new Date(routine.assigned_at))}
                </p>
              </div>

              <PlanSummary
                items={items.filter((i) => i.routine_id === routine.id)}
                showNotes
                weightHistory={weightHistory}
                logging={{
                  routineId: routine.id,
                  logSet: logMySetAction,
                  deleteSet: deleteMySetAction,
                }}
                emptyMessage="Esta rutina todavía no tiene ejercicios."
              />
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
