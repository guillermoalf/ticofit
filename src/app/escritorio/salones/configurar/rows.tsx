"use client";

import { useEffect, useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import type { Discipline, Salon } from "@/lib/schedule";
import { saveDisciplineAction, saveSalonAction, setDisciplineSalonAction } from "../actions";
import { BUTTON, CONTROL, LABEL } from "../class-form";

type Result = { ok: true; message: string } | { ok: false; error: string };

function useRun() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  return {
    busy: pending || !ready,
    run: (fn: () => Promise<Result>, after?: () => void) =>
      start(async () => {
        const res = await fn();
        if (!res.ok) return void toast.error(res.error);
        toast.success(res.message);
        after?.();
        router.refresh();
      }),
  };
}

function ActiveBox({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 pb-3 text-sm">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="size-4 accent-[var(--color-verde-profundo)]" />
      Activo
    </label>
  );
}

/** One salón (or a new one when `salon` is null). */
export function SalonRow({ salon, sedeId }: { salon: Salon | null; sedeId: string }) {
  const { run, busy } = useRun();
  const id = useId();
  const blank = { name: "", capacity: "", sort_order: "", active: true };
  const [v, setV] = useState(
    salon ? { name: salon.name, capacity: String(salon.capacity), sort_order: String(salon.sort_order), active: salon.active } : blank,
  );
  return (
    <form
      method="post"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => saveSalonAction(salon?.id ?? null, sedeId, v), salon ? undefined : () => setV(blank));
      }}
      className="grid grid-cols-2 items-end gap-3 px-5 py-4 sm:grid-cols-[1fr_7rem_6rem_auto_auto]"
    >
      <div className="col-span-2 sm:col-span-1">
        <label htmlFor={`${id}-n`} className={LABEL}>
          {salon ? "Nombre" : "Salón nuevo"}
        </label>
        <input id={`${id}-n`} value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} maxLength={60} className={CONTROL} required />
      </div>
      <div>
        <label htmlFor={`${id}-c`} className={LABEL}>
          Capacidad
        </label>
        <input id={`${id}-c`} inputMode="numeric" value={v.capacity} onChange={(e) => setV({ ...v, capacity: e.target.value })} className={CONTROL} required />
      </div>
      <div>
        <label htmlFor={`${id}-o`} className={LABEL}>
          Orden
        </label>
        <input id={`${id}-o`} inputMode="numeric" value={v.sort_order} onChange={(e) => setV({ ...v, sort_order: e.target.value })} className={CONTROL} />
      </div>
      {salon ? <ActiveBox checked={v.active} onChange={(active) => setV({ ...v, active })} /> : <span />}
      <button type="submit" disabled={busy} className={BUTTON}>
        {salon ? "Guardar" : "Agregar"}
      </button>
    </form>
  );
}

/** One discipline (or a new one when `discipline` is null). */
export function DisciplineRow({ discipline }: { discipline: Discipline | null }) {
  const { run, busy } = useRun();
  const id = useId();
  const blank = { name: "", default_capacity: "", default_minutes: "60", sort_order: "", active: true };
  const [v, setV] = useState(
    discipline
      ? {
          name: discipline.name,
          default_capacity: discipline.default_capacity ? String(discipline.default_capacity) : "",
          default_minutes: String(discipline.default_minutes),
          sort_order: String(discipline.sort_order),
          active: discipline.active,
        }
      : blank,
  );
  return (
    <form
      method="post"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => saveDisciplineAction(discipline?.id ?? null, v), discipline ? undefined : () => setV(blank));
      }}
      className="grid grid-cols-2 items-end gap-3 sm:grid-cols-[1fr_7rem_6rem_5rem_auto_auto]"
    >
      <div className="col-span-2 sm:col-span-1">
        <label htmlFor={`${id}-n`} className={LABEL}>
          {discipline ? "Nombre" : "Disciplina nueva"}
        </label>
        <input id={`${id}-n`} value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} maxLength={60} className={CONTROL} required />
      </div>
      <div>
        <label htmlFor={`${id}-c`} className={LABEL}>
          Cupo
        </label>
        <input
          id={`${id}-c`}
          inputMode="numeric"
          placeholder="del salón"
          value={v.default_capacity}
          onChange={(e) => setV({ ...v, default_capacity: e.target.value })}
          className={CONTROL}
        />
      </div>
      <div>
        <label htmlFor={`${id}-m`} className={LABEL}>
          Minutos
        </label>
        <input id={`${id}-m`} inputMode="numeric" value={v.default_minutes} onChange={(e) => setV({ ...v, default_minutes: e.target.value })} className={CONTROL} required />
      </div>
      <div>
        <label htmlFor={`${id}-o`} className={LABEL}>
          Orden
        </label>
        <input id={`${id}-o`} inputMode="numeric" value={v.sort_order} onChange={(e) => setV({ ...v, sort_order: e.target.value })} className={CONTROL} />
      </div>
      {discipline ? <ActiveBox checked={v.active} onChange={(active) => setV({ ...v, active })} /> : <span />}
      <button type="submit" disabled={busy} className={BUTTON}>
        {discipline ? "Guardar" : "Agregar"}
      </button>
    </form>
  );
}

/** The salón a discipline goes to by default in one sede; used to prefill the schedule. */
export function DefaultSalon({
  disciplineId,
  sedeId,
  sedeName,
  salones,
  value,
}: {
  disciplineId: string;
  sedeId: string;
  sedeName: string;
  salones: Salon[];
  value: string;
}) {
  const { run, busy } = useRun();
  const id = useId();
  return (
    <div>
      <label htmlFor={`${id}-s`} className={LABEL}>
        Salón por defecto en {sedeName}
      </label>
      <select
        id={`${id}-s`}
        defaultValue={value}
        disabled={busy}
        onChange={(e) => run(() => setDisciplineSalonAction(disciplineId, sedeId, e.target.value))}
        className={CONTROL}
      >
        <option value="">Ninguno</option>
        {salones.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
    </div>
  );
}
