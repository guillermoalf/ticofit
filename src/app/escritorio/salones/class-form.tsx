"use client";

import { useEffect, useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import type { Discipline, Salon } from "@/lib/schedule";
import { saveClassAction, type ClassInput } from "./actions";

// Never `text-base`: in this theme it is a colour (--color-base).
export const CONTROL =
  "w-full rounded-xl border border-border-strong bg-surface px-3.5 py-2.5 text-[16px] text-ink outline-none focus:border-primary";
export const BUTTON =
  "cursor-pointer rounded-full bg-verde-profundo px-5 py-2.5 text-sm font-semibold text-crema-claro disabled:opacity-60";
export const LABEL = "mb-1.5 block text-sm text-muted";

export type Coach = { id: string; full_name: string };

function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const t = Math.min(h * 60 + m + minutes, 23 * 60 + 59);
  return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
}

/** A one-off class, or one occurrence being moved or changed. */
export function ClassForm({
  classId,
  initial,
  disciplines,
  salones,
  coaches,
  onDone,
}: {
  classId: string | null;
  initial: ClassInput;
  disciplines: Discipline[];
  salones: Salon[];
  coaches: Coach[];
  onDone?: () => void;
}) {
  const router = useRouter();
  const id = useId();
  const [pending, start] = useTransition();
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  const [v, setV] = useState(initial);
  const set = (patch: Partial<ClassInput>) => setV((old) => ({ ...old, ...patch }));

  return (
    <form
      method="post"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await saveClassAction(classId, v);
          if (!res.ok) return void toast.error(res.error);
          toast.success(res.message);
          onDone?.();
          router.refresh();
        });
      }}
      className="grid gap-3 sm:grid-cols-2"
    >
      <div>
        <label htmlFor={`${id}-d`} className={LABEL}>
          Disciplina
        </label>
        <select
          id={`${id}-d`}
          value={v.discipline_id}
          onChange={(e) => {
            const d = disciplines.find((x) => x.id === e.target.value);
            set({ discipline_id: e.target.value, ...(d && !classId ? { end: addMinutes(v.start, d.default_minutes) } : {}) });
          }}
          className={CONTROL}
          required
        >
          <option value="">Elegí una</option>
          {disciplines.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor={`${id}-s`} className={LABEL}>
          Salón
        </label>
        <select id={`${id}-s`} value={v.salon_id} onChange={(e) => set({ salon_id: e.target.value })} className={CONTROL} required>
          {salones.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} · {s.capacity} personas
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor={`${id}-date`} className={LABEL}>
          Fecha
        </label>
        <input id={`${id}-date`} type="date" value={v.date} onChange={(e) => set({ date: e.target.value })} className={CONTROL} required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor={`${id}-start`} className={LABEL}>
            Empieza
          </label>
          <input
            id={`${id}-start`}
            type="time"
            step={300}
            value={v.start}
            onChange={(e) => {
              const d = disciplines.find((x) => x.id === v.discipline_id);
              set({ start: e.target.value, ...(d && !classId && e.target.value ? { end: addMinutes(e.target.value, d.default_minutes) } : {}) });
            }}
            className={CONTROL}
            required
          />
        </div>
        <div>
          <label htmlFor={`${id}-end`} className={LABEL}>
            Termina
          </label>
          <input id={`${id}-end`} type="time" step={300} value={v.end} onChange={(e) => set({ end: e.target.value })} className={CONTROL} required />
        </div>
      </div>
      <div>
        <label htmlFor={`${id}-c`} className={LABEL}>
          Coach (opcional)
        </label>
        <select id={`${id}-c`} value={v.coach_staff_id} onChange={(e) => set({ coach_staff_id: e.target.value })} className={CONTROL}>
          <option value="">Sin asignar</option>
          {coaches.map((c) => (
            <option key={c.id} value={c.id}>
              {c.full_name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor={`${id}-cap`} className={LABEL}>
          Cupo (vacío = el de la disciplina)
        </label>
        <input
          id={`${id}-cap`}
          inputMode="numeric"
          value={v.capacity}
          onChange={(e) => set({ capacity: e.target.value })}
          className={CONTROL}
        />
      </div>
      <div className="sm:col-span-2">
        <button type="submit" disabled={pending || !ready} className={BUTTON}>
          {classId ? "Guardar cambios" : "Agregar clase"}
        </button>
      </div>
    </form>
  );
}

/** Collapsed "Nueva clase" panel for a day view. */
export function NewClassPanel(props: Omit<Parameters<typeof ClassForm>[0], "classId" | "onDone">) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mb-6">
      {open ? (
        <div className="rounded-2xl border border-border bg-surface p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Clase de una sola vez</h2>
            <button type="button" onClick={() => setOpen(false)} className="cursor-pointer text-sm font-semibold underline underline-offset-2">
              Cerrar
            </button>
          </div>
          <ClassForm classId={null} onDone={() => setOpen(false)} {...props} />
        </div>
      ) : (
        <button type="button" onClick={() => setOpen(true)} className={BUTTON}>
          + Clase de una sola vez
        </button>
      )}
    </div>
  );
}
