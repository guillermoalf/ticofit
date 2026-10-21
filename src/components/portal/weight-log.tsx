"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Minus, TrendingDown, TrendingUp, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatSet, formatWeight, type Exercise, type ExerciseWeightLog } from "@/types/db";

/**
 * The client's training log UI — the notebook this replaces.
 *
 * `SetLogger` is the inline field that lives on an exercise row: one small box,
 * one line, "275x4". `SessionHistoryModal` is the record behind it, grouped by
 * session because that is the unit people compare ("last Monday I hit 275").
 */

export type LogResult = { ok: true } | { ok: false; error: string };

const dayFmt = new Intl.DateTimeFormat("es-CR", {
  weekday: "short",
  day: "numeric",
  month: "short",
});

const dayFmtWithYear = new Intl.DateTimeFormat("es-CR", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

/** Local calendar day, so "hoy" means what the client's phone says it means. */
function dayKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export type Session = {
  key: string;
  /** Sets in the order they were done. */
  sets: ExerciseWeightLog[];
  /** Heaviest load of the session — what progress gets measured on. */
  top: number;
  isToday: boolean;
};

/** Groups a newest-first entry list into sessions, newest session first. */
export function toSessions(entries: ExerciseWeightLog[]): Session[] {
  const today = dayKey(new Date().toISOString());
  const order: string[] = [];
  const byDay = new Map<string, ExerciseWeightLog[]>();

  for (const entry of entries) {
    const key = dayKey(entry.logged_at);
    if (!byDay.has(key)) {
      byDay.set(key, []);
      order.push(key);
    }
    byDay.get(key)!.push(entry);
  }

  return order.map((key) => {
    const sets = byDay.get(key)!;
    return {
      key,
      // entries arrive newest first; within a session, first set first reads
      // the way the session was actually done.
      sets: [...sets].reverse(),
      top: Math.max(...sets.map((s) => Number(s.weight))),
      isToday: key === today,
    };
  });
}

function sessionLabel(session: Session): string {
  if (session.isToday) return "Hoy";
  const date = new Date(session.sets[0].logged_at);
  const thisYear = date.getFullYear() === new Date().getFullYear();
  return (thisYear ? dayFmt : dayFmtWithYear).format(date);
}

// ---------------------------------------------------------------------------
// Inline set logger — the box on the exercise row
// ---------------------------------------------------------------------------

export function SetLogger({
  entries,
  onLog,
  onOpenHistory,
}: {
  /** This exercise's entries for this client, newest first. */
  entries: ExerciseWeightLog[];
  onLog: (raw: string) => Promise<LogResult>;
  onOpenHistory: () => void;
}) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  // Sets shown before the server round-trip lands. Actions here run for
  // seconds, and a set that vanishes until then reads as "it didn't save".
  const [optimistic, setOptimistic] = useState<string[]>([]);
  const [, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  const sessions = useMemo(() => toSessions(entries), [entries]);
  // Only today's line is worth the row: older sessions live in the history.
  const today = sessions[0]?.isToday ? sessions[0] : null;
  const lastSession = today ? sessions[1] : sessions[0];

  // The refreshed server data now includes what we were showing optimistically.
  useEffect(() => {
    setOptimistic([]);
  }, [entries]);

  async function submit() {
    const raw = value.trim();
    if (!raw || saving) return;

    setSaving(true);
    setOptimistic((prev) => [...prev, raw]);
    setValue("");

    const result = await onLog(raw);
    setSaving(false);

    if (!result.ok) {
      setOptimistic((prev) => prev.filter((p) => p !== raw));
      setValue(raw);
      toast.error(result.error);
      return;
    }
    startTransition(() => router.refresh());
    inputRef.current?.focus();
  }

  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1.5">
      <div className="relative">
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submit();
            }
          }}
          onBlur={submit}
          disabled={saving}
          aria-label="Registrar serie: peso por reps"
          placeholder="pesos"
          className="w-[104px] rounded-lg border border-border bg-base/60 py-1.5 pl-2.5 pr-7 text-xs tabular-nums text-ink outline-none transition-colors placeholder:text-muted-2 focus:border-primary disabled:opacity-60"
        />
        {saving && (
          <Loader2
            size={12}
            className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 animate-spin text-muted-2"
          />
        )}
      </div>

      {/* What is already down for today, plus whatever is still in flight. */}
      {today?.sets.map((set) => (
        <span
          key={set.id}
          className="rounded-lg border border-border-strong bg-surface px-2 py-1 text-xs tabular-nums text-ink"
        >
          {formatSet(Number(set.weight), set.reps)}
        </span>
      ))}
      {optimistic.map((raw, i) => (
        <span
          key={`pending-${i}`}
          className="rounded-lg border border-dashed border-border-strong px-2 py-1 text-xs tabular-nums text-muted-2"
        >
          {raw}
        </span>
      ))}

      {entries.length > 0 && (
        <button
          type="button"
          onClick={onOpenHistory}
          className="ml-auto text-xs text-muted-2 underline-offset-4 transition-colors hover:text-ink hover:underline"
        >
          {lastSession
            ? `Última: ${formatWeight(lastSession.top)}`
            : "Historial"}
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Session history — the record, newest session first
// ---------------------------------------------------------------------------

export function SessionHistoryModal({
  exercise,
  entries,
  onDelete,
  onClose,
}: {
  exercise: Exercise;
  /** Newest first, as fetchWeightHistory() returns them. */
  entries: ExerciseWeightLog[];
  /** Client only. Omit to render the record read-only (the coach's view). */
  onDelete?: (logId: string) => Promise<LogResult>;
  onClose: () => void;
}) {
  const router = useRouter();
  const [removing, setRemoving] = useState<string | null>(null);
  const sessions = useMemo(() => toSessions(entries), [entries]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  async function remove(logId: string) {
    if (!onDelete) return;
    setRemoving(logId);
    const result = await onDelete(logId);
    setRemoving(null);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
      <button
        aria-label="Cerrar"
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Historial: ${exercise.name}`}
        className="relative z-10 flex max-h-[85vh] w-full max-w-md flex-col rounded-t-2xl border border-border-strong bg-surface shadow-glow sm:rounded-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div className="min-w-0">
            <h2 className="truncate font-display text-lg font-semibold">
              {exercise.name}
            </h2>
            <p className="mt-0.5 text-xs text-muted-2">
              {entries.length} {entries.length === 1 ? "serie" : "series"} en{" "}
              {sessions.length}{" "}
              {sessions.length === 1 ? "sesión" : "sesiones"}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="shrink-0 rounded-full p-1.5 text-muted transition-colors hover:bg-surface-hover hover:text-ink"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {sessions.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-muted">
              Todavía no registraste series en este ejercicio.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {sessions.map((session, index) => {
                // Sessions are newest first, so the next one is the older
                // workout. Progress is the top set against the top set.
                const previous = sessions[index + 1];
                const diff = previous ? session.top - previous.top : null;
                return (
                  <li key={session.key} className="px-5 py-3">
                    <div className="flex items-baseline justify-between gap-3">
                      <span
                        className={cn(
                          "text-sm font-medium",
                          session.isToday ? "text-primary" : "text-ink",
                        )}
                      >
                        {sessionLabel(session)}
                      </span>
                      {diff !== null && (
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs tabular-nums",
                            diff > 0 && "border-primary/40 text-primary",
                            diff < 0 && "border-border-strong text-muted",
                            diff === 0 && "border-border text-muted-2",
                          )}
                        >
                          {diff > 0 ? (
                            <TrendingUp size={11} />
                          ) : diff < 0 ? (
                            <TrendingDown size={11} />
                          ) : (
                            <Minus size={11} />
                          )}
                          {diff > 0 ? "+" : ""}
                          {Math.round(diff * 100) / 100} kg
                        </span>
                      )}
                    </div>

                    <ul className="mt-1.5 flex flex-col gap-1">
                      {session.sets.map((set) => (
                        <li
                          key={set.id}
                          className="flex items-center justify-between gap-3"
                        >
                          <span className="text-sm tabular-nums text-muted">
                            {formatSet(Number(set.weight), set.reps)}
                          </span>
                          {onDelete && (
                            <button
                              type="button"
                              onClick={() => remove(set.id)}
                              disabled={removing === set.id}
                              aria-label={`Borrar ${formatSet(Number(set.weight), set.reps)}`}
                              className="rounded-lg p-1 text-muted-2 transition-colors hover:text-red-300 disabled:opacity-40"
                            >
                              {removing === set.id ? (
                                <Loader2 size={13} className="animate-spin" />
                              ) : (
                                <Trash2 size={13} />
                              )}
                            </button>
                          )}
                        </li>
                      ))}
                    </ul>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
