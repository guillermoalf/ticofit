"use client";

import { useMemo, useState } from "react";
import { History, Play } from "lucide-react";
import {
  sortDayLabels,
  VideoModal,
  type PlanItemWithExercise,
} from "@/components/portal/plan-builder";
import {
  SessionHistoryModal,
  SetLogger,
  type LogResult,
} from "@/components/portal/weight-log";
import {
  formatWeight,
  type Exercise,
  type WeightHistoryByExercise,
} from "@/types/db";

/**
 * PlanSummary — the read-only face of a plan, used by the coach once a
 * routine is saved and by the client in their own portal.
 *
 * Deliberately thin: day, exercise, and the sets × reps in small type on the
 * right. Everything editable (per-item inputs, reorder, delete) belongs to
 * PlanDays behind an explicit "Editar". The client variant additionally
 * shows the coach's notes, which are instructions meant for them.
 *
 * When `weightHistory` is passed the prescribed weight is shown next to the
 * sets × reps and, where there is a record to look at, doubles as the tap
 * target for that exercise's history.
 *
 * `logging` additionally puts an inline field under each exercise where the
 * client writes down the set they just did. Only the client portal passes it —
 * the coach reviews the plan here, they do not train from it.
 */

export type PlanLogging = {
  routineId: string;
  /** Appends one set — "275x4" as typed — to the client's log. */
  logSet: (
    routineId: string,
    exerciseId: string,
    raw: string,
  ) => Promise<LogResult>;
  /** Removes one set the client logged. */
  deleteSet: (logId: string) => Promise<LogResult>;
};

/** "4 × 8-10", or just whichever half the coach filled in. */
function setsReps(item: PlanItemWithExercise): string | null {
  const sets = item.sets?.trim();
  const reps = item.reps?.trim();
  if (sets && reps) return `${sets} × ${reps}`;
  return sets || reps || null;
}

export function PlanSummary({
  items,
  showNotes = false,
  emptyMessage,
  weightHistory,
  logging,
}: {
  items: PlanItemWithExercise[];
  /** Client portal shows the coach's per-exercise notes; the coach view does not. */
  showNotes?: boolean;
  emptyMessage: string;
  /** Routines only. Omit for programs, which carry no per-client weight. */
  weightHistory?: WeightHistoryByExercise;
  /** Client portal only: lets the reader log the sets they just did. */
  logging?: PlanLogging;
}) {
  const [previewing, setPreviewing] = useState<Exercise | null>(null);
  const [historyFor, setHistoryFor] = useState<Exercise | null>(null);


  const days = useMemo(() => {
    const grouped = new Map<string, PlanItemWithExercise[]>();
    for (const item of items) {
      const list = grouped.get(item.day_label) ?? [];
      list.push(item);
      grouped.set(item.day_label, list);
    }
    for (const list of grouped.values()) {
      list.sort((a, b) => a.order_index - b.order_index);
    }
    return sortDayLabels(Array.from(grouped.keys())).map((label) => ({
      label,
      items: grouped.get(label)!,
    }));
  }, [items]);

  if (days.length === 0) {
    return (
      <p className="rounded-card border border-dashed border-border-strong px-4 py-10 text-center text-sm text-muted-2">
        {emptyMessage}
      </p>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-4">
        {days.map((day) => (
          <section
            key={day.label}
            className="overflow-hidden rounded-card border border-border bg-surface/60"
          >
            <header className="flex items-baseline justify-between gap-3 border-b border-border px-4 py-3">
              <h3 className="font-display text-base font-semibold text-ink">
                {day.label}
              </h3>
              <span className="shrink-0 text-xs tabular-nums text-muted-2">
                {day.items.length}{" "}
                {day.items.length === 1 ? "ejercicio" : "ejercicios"}
              </span>
            </header>

            <ul className="divide-y divide-border">
              {day.items.map((item) => {
                const load = setsReps(item);
                const hasVideo = Boolean(item.exercise.youtube_url);
                const entries = weightHistory?.[item.exercise.id] ?? [];
                const weight =
                  item.weight === null || item.weight === undefined
                    ? null
                    : formatWeight(Number(item.weight));
                return (
                  <li key={item.id} className="px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      {hasVideo ? (
                        <button
                          type="button"
                          onClick={() => setPreviewing(item.exercise)}
                          className="group flex min-w-0 flex-1 items-center gap-2 text-left"
                        >
                          <span className="truncate text-sm text-ink">
                            {item.exercise.name}
                          </span>
                          <Play
                            size={12}
                            className="shrink-0 text-muted-2 transition-colors group-hover:text-primary"
                          />
                        </button>
                      ) : (
                        <span className="min-w-0 flex-1 truncate text-sm text-ink">
                          {item.exercise.name}
                        </span>
                      )}

                      <span className="flex shrink-0 items-center gap-2 text-xs tabular-nums">
                        {load && <span className="text-muted-2">{load}</span>}
                        {weight &&
                          (!logging && entries.length > 0 ? (
                            <button
                              type="button"
                              onClick={() => setHistoryFor(item.exercise)}
                              aria-label={`Historial de ${item.exercise.name}`}
                              className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-0.5 font-medium text-ink transition-colors hover:border-primary hover:text-primary"
                            >
                              {weight}
                              <History size={11} className="shrink-0" />
                            </button>
                          ) : (
                            <span className="rounded-lg border border-border px-2 py-0.5 font-medium text-ink">
                              {weight}
                            </span>
                          ))}
                      </span>
                    </div>

                    {showNotes && item.notes?.trim() && (
                      <p className="mt-1 text-xs leading-relaxed text-muted">
                        {item.notes}
                      </p>
                    )}

                    {/*
                      Where the notebook used to be: one small box under the
                      exercise, and today's sets next to it.
                    */}
                    {logging && (
                      <SetLogger
                        entries={entries}
                        onLog={(raw) =>
                          logging.logSet(
                            logging.routineId,
                            item.exercise.id,
                            raw,
                          )
                        }
                        onOpenHistory={() => setHistoryFor(item.exercise)}
                      />
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>

      {previewing && (
        <VideoModal exercise={previewing} onClose={() => setPreviewing(null)} />
      )}

      {historyFor && (
        <SessionHistoryModal
          exercise={historyFor}
          entries={weightHistory?.[historyFor.id] ?? []}
          onDelete={logging?.deleteSet}
          onClose={() => setHistoryFor(null)}
        />
      )}

    </>
  );
}
