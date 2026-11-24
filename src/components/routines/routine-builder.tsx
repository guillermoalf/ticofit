"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { FavoriteButton, useLibraryFilter } from "@/app/escritorio/ejercicios/library-browser";
import { saveRoutineAction } from "@/app/escritorio/ejercicios/actions";
import { describeExercise, type Exercise, type RoutineDay } from "@/lib/routines/library";
import { cn } from "@/lib/utils";

type ItemDraft = {
  key: string;
  exercise_id: string;
  sets: string;
  reps: string;
  rest: string;
  load: string;
  notes: string;
  superset: string;
};
type DayDraft = { key: string; title: string; items: ItemDraft[] };

let seq = 0;
const key = () => `k${++seq}`;

const toDraft = (days: RoutineDay[]): DayDraft[] =>
  days.map((d) => ({
    key: key(),
    title: d.title,
    items: d.items.map((i) => ({
      key: key(),
      exercise_id: i.exercise_id,
      sets: i.sets?.toString() ?? "",
      reps: i.reps ?? "",
      rest: i.rest_seconds?.toString() ?? "",
      load: i.load ?? "",
      notes: i.notes ?? "",
      superset: i.superset?.toString() ?? "",
    })),
  }));

const num = (s: string) => (s.trim() === "" ? null : Number(s));

const field =
  "w-full rounded-lg border border-border-strong bg-surface px-2.5 py-2 text-[16px] text-ink outline-none focus:border-primary";
const small = "cursor-pointer rounded-full px-3 py-1.5 text-sm text-muted hover:bg-surface-hover hover:text-ink disabled:opacity-40";

function move<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length) return list;
  const next = [...list];
  const [x] = next.splice(from, 1);
  next.splice(to, 0, x);
  return next;
}

export type BuilderProps = {
  /** "client": 2–6 days with validity; "template": a base routine for the sede. */
  mode: "client" | "template";
  routineId: string | null;
  clientId?: string;
  sedeId?: string;
  initial: { name: string; notes: string; valid_from: string; valid_weeks: number; days: RoutineDay[] };
  exercises: Exercise[];
  favoriteIds: string[];
  doneHref: string;
};

export function RoutineBuilder({ mode, routineId, clientId, sedeId, initial, exercises, favoriteIds, doneHref }: BuilderProps) {
  const router = useRouter();
  const [name, setName] = useState(initial.name);
  const [notes, setNotes] = useState(initial.notes);
  const [validFrom, setValidFrom] = useState(initial.valid_from);
  const [validWeeks, setValidWeeks] = useState(initial.valid_weeks);
  const [days, setDays] = useState<DayDraft[]>(() =>
    initial.days.length ? toDraft(initial.days) : [{ key: key(), title: "Día 1", items: [] }],
  );
  const [picking, setPicking] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);

  const byId = useMemo(() => new Map(exercises.map((e) => [e.id, e])), [exercises]);
  const minDays = mode === "client" ? 2 : 1;

  const updateDay = (k: string, fn: (d: DayDraft) => DayDraft) => setDays((ds) => ds.map((d) => (d.key === k ? fn(d) : d)));
  const updateItem = (dk: string, ik: string, patch: Partial<ItemDraft>) =>
    updateDay(dk, (d) => ({ ...d, items: d.items.map((i) => (i.key === ik ? { ...i, ...patch } : i)) }));

  const addExercise = (dayKey: string, exerciseId: string) => {
    updateDay(dayKey, (d) => ({
      ...d,
      items: [...d.items, { key: key(), exercise_id: exerciseId, sets: "3", reps: "10", rest: "60", load: "", notes: "", superset: "" }],
    }));
    toast.success(`${byId.get(exerciseId)?.name ?? "Ejercicio"} agregado`);
  };

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (days.length < minDays) return void toast.error(`La rutina necesita al menos ${minDays} días.`);
    start(async () => {
      const res = await saveRoutineAction(routineId, {
        client_id: clientId ?? null,
        sede_id: sedeId ?? null,
        name,
        notes,
        valid_from: mode === "client" ? validFrom : null,
        valid_weeks: mode === "client" ? validWeeks : null,
        days: days.map((d) => ({
          title: d.title,
          items: d.items.map((i) => ({
            exercise_id: i.exercise_id,
            sets: num(i.sets),
            reps: i.reps.trim() || null,
            rest_seconds: num(i.rest),
            load: i.load.trim() || null,
            notes: i.notes.trim() || null,
            superset: num(i.superset),
          })),
        })),
      });
      if (!res.ok) return void toast.error(res.error);
      toast.success(res.message);
      router.push(mode === "template" && !routineId ? `/escritorio/ejercicios/plantillas/${res.id}` : doneHref);
      router.refresh();
    });
  };

  return (
    <form onSubmit={save} method="post" className="space-y-6">
      <div className="grid max-w-3xl gap-4 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className="mb-1.5 block font-semibold">Nombre de la rutina</span>
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} required placeholder="Ej.: Fuerza 4 días" className={field} />
        </label>
        {mode === "client" && (
          <>
            <label className="block">
              <span className="mb-1.5 block font-semibold">Empieza</span>
              <input type="date" value={validFrom} onChange={(e) => setValidFrom(e.target.value)} required className={field} />
            </label>
            <label className="block">
              <span className="mb-1.5 block font-semibold">Vigencia</span>
              <select value={validWeeks} onChange={(e) => setValidWeeks(Number(e.target.value))} className={field}>
                {[4, 5, 6].map((w) => (
                  <option key={w} value={w}>
                    {w} semanas
                  </option>
                ))}
              </select>
            </label>
          </>
        )}
        <label className="block sm:col-span-2">
          <span className="mb-1.5 block font-semibold">Comentarios para el cliente</span>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={2000} rows={3} className={field} />
        </label>
      </div>

      <ol className="space-y-5">
        {days.map((d, di) => (
          <li key={d.key} className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <label className="min-w-0 flex-1 basis-56">
                <span className="sr-only">Nombre del día {di + 1}</span>
                <input
                  value={d.title}
                  onChange={(e) => updateDay(d.key, (x) => ({ ...x, title: e.target.value }))}
                  maxLength={60}
                  className={cn(field, "font-semibold")}
                />
              </label>
              <button type="button" className={small} disabled={di === 0} onClick={() => setDays((ds) => move(ds, di, di - 1))}>
                ↑ Subir
              </button>
              <button type="button" className={small} disabled={di === days.length - 1} onClick={() => setDays((ds) => move(ds, di, di + 1))}>
                ↓ Bajar
              </button>
              <button
                type="button"
                className={small}
                disabled={days.length >= 6}
                onClick={() =>
                  setDays((ds) => {
                    const copy = { ...d, key: key(), title: `${d.title} (copia)`, items: d.items.map((i) => ({ ...i, key: key() })) };
                    return [...ds.slice(0, di + 1), copy, ...ds.slice(di + 1)];
                  })
                }
              >
                Duplicar
              </button>
              <button
                type="button"
                className={small}
                onClick={() => {
                  if (d.items.length && !confirm(`¿Quitar "${d.title}" con sus ${d.items.length} ejercicios?`)) return;
                  setDays((ds) => ds.filter((x) => x.key !== d.key));
                }}
              >
                Quitar día
              </button>
            </div>

            {d.items.length ? (
              <ol className="divide-y divide-border">
                {d.items.map((it, ii) => {
                  const ex = byId.get(it.exercise_id);
                  return (
                    <li key={it.key} className="py-3">
                      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                        <p className="font-semibold">
                          {ii + 1}. {ex?.name ?? "Ejercicio archivado"}
                          {!ex && <span className="ml-2 text-sm font-normal text-[var(--danger)]">cambialo por otro</span>}
                        </p>
                        <div className="flex gap-1">
                          <button type="button" aria-label="Subir ejercicio" className={small} disabled={ii === 0}
                            onClick={() => updateDay(d.key, (x) => ({ ...x, items: move(x.items, ii, ii - 1) }))}>↑</button>
                          <button type="button" aria-label="Bajar ejercicio" className={small} disabled={ii === d.items.length - 1}
                            onClick={() => updateDay(d.key, (x) => ({ ...x, items: move(x.items, ii, ii + 1) }))}>↓</button>
                          <button type="button" className={small}
                            onClick={() => updateDay(d.key, (x) => ({ ...x, items: x.items.filter((y) => y.key !== it.key) }))}>Quitar</button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-[repeat(5,minmax(0,1fr))]">
                        <Mini label="Series">
                          <input value={it.sets} inputMode="numeric" onChange={(e) => updateItem(d.key, it.key, { sets: e.target.value.replace(/\D/g, "").slice(0, 2) })} className={field} />
                        </Mini>
                        <Mini label="Repeticiones">
                          <input value={it.reps} maxLength={20} placeholder="10-12" onChange={(e) => updateItem(d.key, it.key, { reps: e.target.value })} className={field} />
                        </Mini>
                        <Mini label="Descanso (s)">
                          <input value={it.rest} inputMode="numeric" onChange={(e) => updateItem(d.key, it.key, { rest: e.target.value.replace(/\D/g, "").slice(0, 3) })} className={field} />
                        </Mini>
                        <Mini label="Carga">
                          <input value={it.load} maxLength={40} placeholder="20 kg" onChange={(e) => updateItem(d.key, it.key, { load: e.target.value })} className={field} />
                        </Mini>
                        <Mini label="Superserie">
                          <select value={it.superset} onChange={(e) => updateItem(d.key, it.key, { superset: e.target.value })} className={field}>
                            <option value="">No</option>
                            {[1, 2, 3, 4, 5].map((n) => (
                              <option key={n} value={n}>
                                {String.fromCharCode(64 + n)}
                              </option>
                            ))}
                          </select>
                        </Mini>
                        <Mini label="Nota" wide>
                          <input value={it.notes} maxLength={300} onChange={(e) => updateItem(d.key, it.key, { notes: e.target.value })} className={field} />
                        </Mini>
                      </div>
                    </li>
                  );
                })}
              </ol>
            ) : (
              <p className="py-3 text-muted">Este día todavía no tiene ejercicios.</p>
            )}
            <button
              type="button"
              onClick={() => setPicking(d.key)}
              className="mt-2 cursor-pointer rounded-full border border-border-strong px-4 py-2 text-sm font-semibold hover:bg-surface-hover"
            >
              + Agregar ejercicio
            </button>
          </li>
        ))}
      </ol>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={days.length >= 6}
          onClick={() => setDays((ds) => [...ds, { key: key(), title: `Día ${ds.length + 1}`, items: [] }])}
          className="cursor-pointer rounded-full border border-border-strong px-5 py-2.5 text-sm font-semibold disabled:opacity-40"
        >
          + Agregar día
        </button>
        <span className="text-sm text-muted">
          {days.length} de {mode === "client" ? "2 a 6" : "hasta 6"} días
        </span>
      </div>

      <div className="sticky bottom-0 -mx-1 border-t border-border bg-base px-1 py-3">
        <button
          type="submit"
          disabled={pending || !ready}
          className="cursor-pointer rounded-full bg-verde-profundo px-6 py-3 font-semibold text-crema-claro disabled:cursor-default disabled:opacity-50"
        >
          {mode === "template" ? "Guardar plantilla" : routineId ? "Guardar cambios" : "Asignar rutina"}
        </button>
      </div>

      {picking && (
        <ExercisePicker
          exercises={exercises}
          favoriteIds={favoriteIds}
          dayTitle={days.find((d) => d.key === picking)?.title ?? ""}
          onPick={(id) => addExercise(picking, id)}
          onClose={() => setPicking(null)}
        />
      )}
    </form>
  );
}

function Mini({ label, wide, children }: { label: string; wide?: boolean; children: React.ReactNode }) {
  return (
    <label className={cn("block", wide && "col-span-2 sm:col-span-5")}>
      <span className="mb-1 block text-xs text-muted">{label}</span>
      {children}
    </label>
  );
}

function ExercisePicker({
  exercises,
  favoriteIds,
  dayTitle,
  onPick,
  onClose,
}: {
  exercises: Exercise[];
  favoriteIds: string[];
  dayTitle: string;
  onPick: (id: string) => void;
  onClose: () => void;
}) {
  const [favorites, setFavorites] = useState(() => new Set(favoriteIds));
  const { shown, filters } = useLibraryFilter(exercises, favorites);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    dialog.current?.showModal();
  }, []);

  return (
    <dialog
      ref={dialog}
      onClose={onClose}
      aria-label={`Agregar ejercicio a ${dayTitle}`}
      className="m-auto h-[min(48rem,92vh)] w-[min(48rem,94vw)] rounded-2xl border border-border bg-surface p-0 text-ink backdrop:bg-black/40"
    >
      <div className="flex h-full flex-col">
        <div className="space-y-3 border-b border-border p-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Agregar a {dayTitle}</h2>
            <button type="button" onClick={() => dialog.current?.close()} className="cursor-pointer rounded-full bg-verde-profundo px-4 py-2 text-sm font-semibold text-crema-claro">
              Listo
            </button>
          </div>
          {filters}
        </div>
        <ul className="min-h-0 flex-1 divide-y divide-border overflow-y-auto">
          {shown.map((e) => (
            <li key={e.id} className="flex items-center gap-1 px-2 py-1">
              <FavoriteButton
                id={e.id}
                name={e.name}
                on={favorites.has(e.id)}
                onChange={(on) =>
                  setFavorites((prev) => {
                    const next = new Set(prev);
                    if (on) next.add(e.id);
                    else next.delete(e.id);
                    return next;
                  })
                }
              />
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{e.name}</p>
                <p className="text-sm text-muted">{describeExercise(e) || e.category}</p>
              </div>
              <button
                type="button"
                onClick={() => onPick(e.id)}
                className="cursor-pointer rounded-full border border-border-strong px-4 py-2 text-sm font-semibold hover:bg-surface-hover"
              >
                Agregar
              </button>
            </li>
          ))}
          {!shown.length && <li className="px-5 py-10 text-center text-muted">Ningún ejercicio coincide.</li>}
        </ul>
      </div>
    </dialog>
  );
}
