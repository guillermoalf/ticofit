"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  CalendarPlus,
  Dumbbell,
  History,
  Loader2,
  Pencil,
  Play,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { YouTubeEmbed } from "@/components/portal/youtube-embed";
import { SessionHistoryModal } from "@/components/portal/weight-log";
import { cn } from "@/lib/utils";
import {
  formatWeight,
  type Exercise,
  type WeightHistoryByExercise,
} from "@/types/db";

/**
 * PlanDays — the shared day-by-day plan builder used by both the program
 * builder (program_items) and the routine builder (routine_items). The host
 * screen owns the entity header/delete UI and binds its server actions via
 * `PlanItemActions`; this component renders the day groups, item editing,
 * reorder, the exercise picker and the video preview.
 */

export type PlanActionResult = { ok: true } | { ok: false; error: string };

export type PlanItemInput = {
  sets: string;
  reps: string;
  notes: string;
  /** Free text as typed, "" to clear. Always "" where weight tracking is off. */
  weight: string;
};

export type PlanItemActions = {
  addItem: (exerciseId: string, dayLabel: string) => Promise<PlanActionResult>;
  updateItem: (itemId: string, input: PlanItemInput) => Promise<PlanActionResult>;
  removeItem: (itemId: string) => Promise<PlanActionResult>;
  reorderDay: (
    dayLabel: string,
    orderedItemIds: string[],
  ) => Promise<PlanActionResult>;
  renameDay: (oldLabel: string, newLabel: string) => Promise<PlanActionResult>;
};

export type PlanItemWithExercise = {
  id: string;
  day_label: string;
  order_index: number;
  sets: string | null;
  reps: string | null;
  notes: string | null;
  /** Routine items only — programs are templates and carry no per-client load. */
  weight?: number | null;
  exercise: Exercise;
};

/**
 * Turns weight tracking on. Only routines pass it: a program is a template
 * reused across clients, so a working weight has no meaning there.
 * `history` holds the client's past entries per exercise id, newest first.
 */
export type PlanWeightTracking = { history: WeightHistoryByExercise };

/** The field shows the stored number, not "60.00". */
function weightToInput(weight: number | null | undefined): string {
  return weight === null || weight === undefined ? "" : String(Number(weight));
}

// ---------------------------------------------------------------------------
// Day helpers
// ---------------------------------------------------------------------------

export function sortDayLabels(labels: string[]): string[] {
  return [...labels].sort((a, b) => a.localeCompare(b, "es", { numeric: true }));
}

/** Next default label: "Día N" past the highest number already used. */
function nextDayLabel(labels: string[]): string {
  let max = 0;
  for (const label of labels) {
    const match = label.match(/(\d+)/);
    if (match) max = Math.max(max, parseInt(match[1], 10));
  }
  return `Día ${max + 1}`;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function PlanDays({
  items,
  exercises,
  actions,
  empty,
  weights,
}: {
  items: PlanItemWithExercise[];
  exercises: Exercise[];
  actions: PlanItemActions;
  empty: { title: string; description: string };
  /** Omit to hide the weight field entirely (program builder). */
  weights?: PlanWeightTracking;
}) {
  const router = useRouter();
  // Days created before they have items exist only client-side: day_label
  // lives on the items, so an empty group has no row to persist.
  const [extraDays, setExtraDays] = useState<string[]>([]);
  const [pickerDay, setPickerDay] = useState<string | null>(null);
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
    for (const label of extraDays) {
      if (!grouped.has(label)) grouped.set(label, []);
    }
    return sortDayLabels(Array.from(grouped.keys())).map((label) => ({
      label,
      items: grouped.get(label)!,
    }));
  }, [items, extraDays]);

  const allLabels = days.map((d) => d.label);

  function addDay() {
    setExtraDays((prev) => [...prev, nextDayLabel(allLabels)]);
  }

  function renameEmptyDay(oldLabel: string, newLabel: string) {
    setExtraDays((prev) => prev.map((l) => (l === oldLabel ? newLabel : l)));
  }

  function removeEmptyDay(label: string) {
    setExtraDays((prev) => prev.filter((l) => l !== label));
  }

  return (
    <>
      <section className="mt-8 flex flex-col gap-6">
        {days.length === 0 ? (
          <div className="rounded-card border border-dashed border-border-strong bg-surface/40 px-6 py-14 text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-border-strong">
              <Dumbbell size={24} className="text-primary" />
            </span>
            <h2 className="mt-5 font-display text-xl font-semibold">
              {empty.title}
            </h2>
            <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
              {empty.description}
            </p>
            <div className="mt-6 flex justify-center">
              <Button onClick={addDay}>
                <CalendarPlus size={18} />
                Agregar día
              </Button>
            </div>
          </div>
        ) : (
          <>
            {days.map((day) => (
              <DaySection
                key={day.label}
                label={day.label}
                items={day.items}
                otherLabels={allLabels.filter((l) => l !== day.label)}
                actions={actions}
                weights={weights}
                onAddExercise={() => setPickerDay(day.label)}
                onPreview={setPreviewing}
                onHistory={setHistoryFor}
                onRenameEmpty={(next) => renameEmptyDay(day.label, next)}
                onRemoveEmpty={() => removeEmptyDay(day.label)}
              />
            ))}
            <div>
              <Button variant="ghost" size="sm" onClick={addDay}>
                <CalendarPlus size={16} />
                Agregar día
              </Button>
            </div>
          </>
        )}
      </section>

      {pickerDay !== null && (
        <ExercisePickerModal
          exercises={exercises}
          dayLabel={pickerDay}
          onClose={() => setPickerDay(null)}
          onPick={async (exercise) => {
            const result = await actions.addItem(exercise.id, pickerDay);
            if (!result.ok) {
              toast.error(result.error);
              return;
            }
            toast.success(`${exercise.name} agregado a ${pickerDay}`);
            router.refresh();
          }}
        />
      )}

      {previewing && (
        <VideoModal exercise={previewing} onClose={() => setPreviewing(null)} />
      )}

      {historyFor && weights && (
        /* Read-only for the coach: the client's log is theirs to edit. */
        <SessionHistoryModal
          exercise={historyFor}
          entries={weights.history[historyFor.id] ?? []}
          onClose={() => setHistoryFor(null)}
        />
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Day section — one day_label group with its ordered items
// ---------------------------------------------------------------------------

function DaySection({
  label,
  items,
  otherLabels,
  actions,
  weights,
  onAddExercise,
  onPreview,
  onHistory,
  onRenameEmpty,
  onRemoveEmpty,
}: {
  label: string;
  items: PlanItemWithExercise[];
  otherLabels: string[];
  actions: PlanItemActions;
  weights?: PlanWeightTracking;
  onAddExercise: () => void;
  onPreview: (exercise: Exercise) => void;
  onHistory: (exercise: Exercise) => void;
  onRenameEmpty: (next: string) => void;
  onRemoveEmpty: () => void;
}) {
  const router = useRouter();
  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState(label);
  const [pending, startTransition] = useTransition();
  // Escape blurs the input to close it; this flag tells the blur handler to
  // discard instead of save.
  const cancelRename = useRef(false);

  const isEmpty = items.length === 0;

  /** Saves the day name. Called on blur — there is no confirm button. */
  async function commitRename() {
    if (cancelRename.current) {
      cancelRename.current = false;
      setRenaming(false);
      setDraft(label);
      return;
    }
    const next = draft.trim();
    if (!next || next === label) {
      setRenaming(false);
      setDraft(label);
      return;
    }
    if (isEmpty) {
      // No rows to update: the empty day exists only in local state.
      if (otherLabels.includes(next)) {
        toast.error("Ya existe un día con ese nombre.");
        setRenaming(false);
        setDraft(label);
        return;
      }
      onRenameEmpty(next);
      setRenaming(false);
      return;
    }
    const result = await actions.renameDay(label, next);
    if (!result.ok) {
      toast.error(result.error);
      setRenaming(false);
      setDraft(label);
      return;
    }
    toast.success("Día renombrado");
    setRenaming(false);
    router.refresh();
  }

  function move(index: number, delta: -1 | 1) {
    const target = index + delta;
    if (target < 0 || target >= items.length) return;
    const ordered = [...items];
    [ordered[index], ordered[target]] = [ordered[target], ordered[index]];
    startTransition(async () => {
      const result = await actions.reorderDay(
        label,
        ordered.map((i) => i.id),
      );
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <section className="overflow-hidden rounded-card border border-border bg-surface/60">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-5">
        {renaming ? (
          /*
            While renaming, the input owns the whole row — on a phone the day
            actions would otherwise squeeze it down to a few characters. It
            saves on blur, so there is nothing to confirm.
          */
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                e.currentTarget.blur();
              } else if (e.key === "Escape") {
                cancelRename.current = true;
                e.currentTarget.blur();
              }
            }}
            autoFocus
            aria-label="Nombre del día"
            placeholder="Ej. Día 1 — Push"
            className="w-full rounded-lg border border-primary bg-base/60 px-3 py-2 text-base text-ink outline-none placeholder:text-muted-2"
          />
        ) : (
          <button
            type="button"
            onClick={() => {
              setDraft(label);
              setRenaming(true);
            }}
            aria-label={`Renombrar ${label}`}
            className="group flex min-w-0 items-center gap-2 text-left"
          >
            <h2 className="truncate font-display text-base font-semibold text-ink">
              {label}
            </h2>
            <Pencil
              size={13}
              className="shrink-0 text-muted-2 transition-colors group-hover:text-ink"
            />
            <span className="shrink-0 text-xs tabular-nums text-muted-2">
              {items.length} {items.length === 1 ? "ejercicio" : "ejercicios"}
            </span>
          </button>
        )}

        <div className={cn("flex items-center gap-2", renaming && "hidden")}>
          {isEmpty && (
            <button
              type="button"
              aria-label={`Quitar ${label}`}
              onClick={onRemoveEmpty}
              className="rounded-lg border border-border p-1.5 text-muted transition-colors hover:border-red-400/40 hover:text-red-300"
            >
              <Trash2 size={14} />
            </button>
          )}
          <button
            type="button"
            onClick={onAddExercise}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs text-muted transition-colors hover:border-border-strong hover:text-ink"
          >
            <Plus size={12} />
            Agregar ejercicio
          </button>
        </div>
      </header>

      {isEmpty ? (
        <p className="px-5 py-8 text-center text-sm text-muted-2">
          Sin ejercicios todavía. Agregá el primero desde tu biblioteca.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {items.map((item, index) => (
            <ItemCard
              key={item.id}
              item={item}
              actions={actions}
              weights={weights}
              canMoveUp={index > 0}
              canMoveDown={index < items.length - 1}
              moving={pending}
              onMoveUp={() => move(index, -1)}
              onMoveDown={() => move(index, 1)}
              onPreview={() => onPreview(item.exercise)}
              onHistory={() => onHistory(item.exercise)}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Item card — sets/reps/notes editing (saved on blur), reorder + remove
// ---------------------------------------------------------------------------

const itemInputClass =
  "w-full rounded-lg border border-border bg-base/60 px-3 py-2 text-sm text-ink outline-none transition-colors placeholder:text-muted-2 focus:border-primary";

function ItemCard({
  item,
  actions,
  weights,
  canMoveUp,
  canMoveDown,
  moving,
  onMoveUp,
  onMoveDown,
  onPreview,
  onHistory,
}: {
  item: PlanItemWithExercise;
  actions: PlanItemActions;
  weights?: PlanWeightTracking;
  canMoveUp: boolean;
  canMoveDown: boolean;
  moving: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onPreview: () => void;
  onHistory: () => void;
}) {
  const router = useRouter();
  const [form, setForm] = useState<PlanItemInput>({
    sets: item.sets ?? "",
    reps: item.reps ?? "",
    notes: item.notes ?? "",
    weight: weightToInput(item.weight),
  });
  // Last persisted values, to skip no-op saves on blur.
  const saved = useRef(form);
  const [removing, setRemoving] = useState(false);

  const entries = weights ? weights.history[item.exercise.id] ?? [] : [];
  const lastEntry = entries[0];
  // Offered only while nothing is prescribed yet — a filled field already has
  // this session's answer, and the full record stays behind "Historial".
  const canApplyLast = Boolean(lastEntry) && !form.weight.trim();

  /** Fills the field from history and saves it right away — one tap, done. */
  async function applyLast(weight: number) {
    const next = { ...form, weight: String(Number(weight)) };
    setForm(next);
    await persist(next);
  }

  async function persist(next: PlanItemInput = form) {
    if (
      next.sets === saved.current.sets &&
      next.reps === saved.current.reps &&
      next.notes === saved.current.notes &&
      next.weight === saved.current.weight
    ) {
      return;
    }
    const weightChanged = next.weight !== saved.current.weight;
    const result = await actions.updateItem(item.id, next);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    saved.current = next;
    // A new weight also wrote a history entry; refresh so the "Historial"
    // count and the entries behind it stop lagging a save behind.
    if (weightChanged) router.refresh();
  }

  async function remove() {
    setRemoving(true);
    const result = await actions.removeItem(item.id);
    setRemoving(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Ejercicio quitado");
    router.refresh();
  }

  return (
    <li className="px-4 py-4 sm:px-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium text-ink">{item.exercise.name}</p>
          {item.exercise.category && (
            <p className="mt-0.5 text-xs text-muted-2">{item.exercise.category}</p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          {item.exercise.youtube_url && (
            <button
              type="button"
              aria-label={`Ver video de ${item.exercise.name}`}
              onClick={onPreview}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs text-muted transition-colors hover:border-border-strong hover:text-ink"
            >
              <Play size={12} />
              Video
            </button>
          )}
          <button
            type="button"
            aria-label="Subir ejercicio"
            onClick={onMoveUp}
            disabled={!canMoveUp || moving}
            className="rounded-lg border border-border p-1.5 text-muted transition-colors hover:border-border-strong hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ArrowUp size={14} />
          </button>
          <button
            type="button"
            aria-label="Bajar ejercicio"
            onClick={onMoveDown}
            disabled={!canMoveDown || moving}
            className="rounded-lg border border-border p-1.5 text-muted transition-colors hover:border-border-strong hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ArrowDown size={14} />
          </button>
          <button
            type="button"
            aria-label={`Quitar ${item.exercise.name}`}
            onClick={remove}
            disabled={removing}
            className="rounded-lg border border-border p-1.5 text-muted transition-colors hover:border-red-400/40 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <div
        className={cn(
          "mt-3 grid gap-3",
          weights
            ? "grid-cols-3 sm:grid-cols-[1fr_1fr_1fr_2fr]"
            : "grid-cols-2 sm:grid-cols-[1fr_1fr_2fr]",
        )}
      >
        <label className="block">
          <span className="mb-1 block text-xs text-muted-2">Series</span>
          <input
            value={form.sets}
            onChange={(e) => setForm((f) => ({ ...f, sets: e.target.value }))}
            onBlur={() => persist()}
            placeholder="Ej. 4"
            className={itemInputClass}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-muted-2">Reps</span>
          <input
            value={form.reps}
            onChange={(e) => setForm((f) => ({ ...f, reps: e.target.value }))}
            onBlur={() => persist()}
            placeholder="Ej. 8-10"
            className={itemInputClass}
          />
        </label>
        {weights && (
          <label className="block">
            <span className="mb-1 block text-xs text-muted-2">Peso (kg)</span>
            <input
              value={form.weight}
              onChange={(e) =>
                setForm((f) => ({ ...f, weight: e.target.value }))
              }
              onBlur={() => persist()}
              /* decimal, not number: a phone gets the numeric pad without the
                 spinner arrows and without a scroll wheel changing the load. */
              inputMode="decimal"
              placeholder="Ej. 60"
              className={cn(itemInputClass, "tabular-nums")}
            />
          </label>
        )}
        <label
          className={cn(
            "block",
            weights ? "col-span-3 sm:col-span-1" : "col-span-2 sm:col-span-1",
          )}
        >
          <span className="mb-1 block text-xs text-muted-2">Notas</span>
          <input
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            onBlur={() => persist()}
            placeholder="Ej. Tempo 3-1-1, descanso 90s…"
            className={itemInputClass}
          />
        </label>
      </div>

      {/*
        The whole point of the feature: what this client lifted last time,
        one tap away from becoming this session's starting load.
      */}
      {weights && entries.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs">
          {canApplyLast && (
            <button
              type="button"
              onClick={() => applyLast(Number(lastEntry.weight))}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2 py-1 text-primary transition-colors hover:border-primary"
            >
              <RotateCcw size={12} className="shrink-0" />
              Usar el último: {formatWeight(Number(lastEntry.weight))}
            </button>
          )}
          <button
            type="button"
            onClick={onHistory}
            className="inline-flex items-center gap-1.5 text-muted-2 transition-colors hover:text-ink"
          >
            <History size={12} className="shrink-0" />
            Historial ({entries.length})
          </button>
        </div>
      )}
    </li>
  );
}

// ---------------------------------------------------------------------------
// Exercise picker modal — searches the shared base library plus the coach's own
// ---------------------------------------------------------------------------

function ExercisePickerModal({
  exercises,
  dayLabel,
  onClose,
  onPick,
}: {
  exercises: Exercise[];
  dayLabel: string;
  onClose: () => void;
  onPick: (exercise: Exercise) => Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const [addingId, setAddingId] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return exercises;
    return exercises.filter(
      (ex) =>
        ex.name.toLowerCase().includes(q) ||
        (ex.category ?? "").toLowerCase().includes(q),
    );
  }, [exercises, query]);

  async function pick(exercise: Exercise) {
    setAddingId(exercise.id);
    try {
      await onPick(exercise);
    } finally {
      setAddingId(null);
    }
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
        aria-label={`Agregar ejercicio a ${dayLabel}`}
        className="relative z-10 flex max-h-[85vh] w-full max-w-lg flex-col rounded-t-2xl border border-border-strong bg-surface shadow-glow sm:rounded-2xl"
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="font-display text-lg font-semibold">
            Agregar a {dayLabel}
          </h2>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded-full p-1.5 text-muted transition-colors hover:bg-surface-hover hover:text-ink"
          >
            <X size={18} />
          </button>
        </div>

        <div className="border-b border-border px-5 py-3">
          <label className="relative block">
            <Search
              size={15}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-2"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
              placeholder="Buscar por nombre o categoría…"
              className="w-full rounded-full border border-border bg-base/60 py-2 pl-10 pr-4 text-sm text-ink outline-none transition-colors placeholder:text-muted-2 focus:border-primary"
            />
          </label>
        </div>

        <div className="flex-1 overflow-y-auto">
          {exercises.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-muted">
              No hay ejercicios disponibles. Agregá los tuyos en la sección
              Ejercicios.
            </p>
          ) : filtered.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-muted">
              No hay ejercicios que coincidan con tu búsqueda.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {filtered.map((ex) => (
                <li key={ex.id}>
                  <button
                    type="button"
                    onClick={() => pick(ex)}
                    disabled={addingId !== null}
                    className={cn(
                      "flex w-full items-center justify-between gap-3 px-5 py-3 text-left transition-colors hover:bg-surface-hover",
                      addingId !== null && "cursor-not-allowed opacity-60",
                    )}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-ink">
                        {ex.name}
                      </span>
                      {ex.category && (
                        <span className="block text-xs text-muted-2">
                          {ex.category}
                        </span>
                      )}
                    </span>
                    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs text-muted">
                      <Plus size={12} />
                      {addingId === ex.id ? "Agregando…" : "Agregar"}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Video preview modal
// ---------------------------------------------------------------------------

export function VideoModal({
  exercise,
  onClose,
}: {
  exercise: Exercise;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8">
      <button
        aria-label="Cerrar"
        onClick={onClose}
        className="absolute inset-0 bg-black/75 backdrop-blur-sm"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Video: ${exercise.name}`}
        className="relative z-10 w-full max-w-2xl"
      >
        <div className="mb-3 flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-lg font-semibold text-white">
              {exercise.name}
            </h2>
            {exercise.category && (
              <p className="mt-0.5 text-sm text-white/60">{exercise.category}</p>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="shrink-0 rounded-full p-1.5 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        {exercise.youtube_url ? (
          <YouTubeEmbed url={exercise.youtube_url} title={exercise.name} />
        ) : (
          <div className="flex aspect-video items-center justify-center rounded-xl bg-surface-2 text-sm text-muted">
            Este ejercicio no tiene video asociado.
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Delete confirmation modal — shared by the program and routine builders
// ---------------------------------------------------------------------------

export function ConfirmDeleteModal({
  title,
  message,
  successMessage,
  onConfirm,
  onDeleted,
  onClose,
}: {
  title: string;
  message: React.ReactNode;
  successMessage: string;
  onConfirm: () => Promise<PlanActionResult>;
  onDeleted: () => void;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function handleDelete() {
    setLoading(true);
    setError(null);
    try {
      const result = await onConfirm();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success(successMessage);
      onDeleted();
    } catch {
      setError("Ocurrió un error inesperado. Intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        aria-label="Cerrar"
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />

      <div
        role="dialog"
        aria-modal="true"
        className="relative z-10 w-full max-w-sm rounded-2xl border border-border-strong bg-surface p-6 shadow-glow"
      >
        <h2 className="font-display text-lg font-semibold">{title}</h2>
        <p className="mt-2 text-sm text-muted">{message}</p>

        {error && (
          <p
            role="alert"
            className="mt-3 flex items-start gap-2 rounded-xl border border-border-strong bg-base/60 px-3 py-2.5 text-sm text-ink"
          >
            <AlertCircle size={16} className="mt-0.5 shrink-0 text-primary" />
            <span>{error}</span>
          </p>
        )}

        <div className="mt-5 flex gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="flex-1"
            disabled={loading}
          >
            Cancelar
          </Button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={loading}
            aria-busy={loading || undefined}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-red-400/40 bg-red-400/10 px-4 py-2.5 text-sm font-medium text-red-300 transition-colors hover:bg-red-400/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading && <Loader2 size={15} className="animate-spin" />}
            {loading ? "Eliminando…" : "Eliminar"}
          </button>
        </div>
      </div>
    </div>
  );
}
