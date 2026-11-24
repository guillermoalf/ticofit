"use client";

import { useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { BUTTON, CONTROL, LABEL } from "../salones/class-form";
import { deleteEntryAction, saveEntryAction, type EntryInput } from "./actions";

export type EntryView = EntryInput & {
  id: string;
  name: string;
  inLabel: string;
  outLabel: string | null;
  hours: string | null;
  manual: boolean;
  /** Name of whoever last corrected it, if anyone did. */
  corrected: string | null;
};

function EntryForm({
  id,
  initial,
  people,
  onDone,
}: {
  id: string | null;
  initial: EntryInput;
  people?: { id: string; full_name: string }[];
  onDone: () => void;
}) {
  const router = useRouter();
  const uid = useId();
  const [v, setV] = useState(initial);
  const [pending, start] = useTransition();
  const set = (patch: Partial<EntryInput>) => setV((o) => ({ ...o, ...patch }));

  return (
    <form
      method="post"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await saveEntryAction(id, v);
          if (!res.ok) return void toast.error(res.error);
          toast.success(res.message);
          onDone();
          router.refresh();
        });
      }}
      className="grid gap-3 sm:grid-cols-4"
    >
      {people && (
        <div className="sm:col-span-4">
          <label htmlFor={`${uid}-p`} className={LABEL}>
            Persona
          </label>
          <select id={`${uid}-p`} value={v.staff_id} onChange={(e) => set({ staff_id: e.target.value })} className={CONTROL} required>
            <option value="">Elegí a alguien</option>
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.full_name}
              </option>
            ))}
          </select>
        </div>
      )}
      <div>
        <label htmlFor={`${uid}-d`} className={LABEL}>
          Fecha
        </label>
        <input id={`${uid}-d`} type="date" value={v.date} onChange={(e) => set({ date: e.target.value })} className={CONTROL} required />
      </div>
      <div>
        <label htmlFor={`${uid}-i`} className={LABEL}>
          Entrada
        </label>
        <input id={`${uid}-i`} type="time" value={v.clock_in} onChange={(e) => set({ clock_in: e.target.value })} className={CONTROL} required />
      </div>
      <div>
        <label htmlFor={`${uid}-o`} className={LABEL}>
          Salida (vacío = sigue adentro)
        </label>
        <input id={`${uid}-o`} type="time" value={v.clock_out} onChange={(e) => set({ clock_out: e.target.value })} className={CONTROL} />
      </div>
      <label className="flex items-center gap-2 self-end pb-3 text-sm">
        <input type="checkbox" checked={v.out_next_day} onChange={(e) => set({ out_next_day: e.target.checked })} className="size-4" />
        Salió al día siguiente
      </label>
      <div className="sm:col-span-4">
        <label htmlFor={`${uid}-n`} className={LABEL}>
          Nota (por qué se corrige)
        </label>
        <input id={`${uid}-n`} value={v.note} maxLength={300} onChange={(e) => set({ note: e.target.value })} className={CONTROL} />
      </div>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-4">
        <button type="submit" disabled={pending} className={BUTTON}>
          {id ? "Guardar corrección" : "Agregar marca"}
        </button>
        <button type="button" onClick={onDone} className="cursor-pointer text-sm font-semibold underline underline-offset-2">
          Cancelar
        </button>
      </div>
    </form>
  );
}

/** One mark: who, in, out, hours; edit and delete for attendance.manage. */
export function EntryRow({ entry }: { entry: EntryView }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [pending, start] = useTransition();

  if (editing) {
    return (
      <li className="px-5 py-4">
        <p className="mb-3 font-semibold">{entry.name}</p>
        <EntryForm id={entry.id} initial={entry} onDone={() => setEditing(false)} />
      </li>
    );
  }

  return (
    <li className="flex flex-wrap items-center gap-x-6 gap-y-1 px-5 py-3">
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{entry.name}</p>
        <p className="text-sm text-muted">
          {entry.manual ? "Agregada a mano" : "Con PIN"}
          {entry.corrected && ` · corregida por ${entry.corrected}`}
          {entry.note && ` · ${entry.note}`}
        </p>
      </div>
      <p className="tabular-nums">
        {entry.inLabel} – {entry.outLabel ?? <strong>adentro</strong>}
        {entry.hours && <span className="ml-3 text-muted">{entry.hours}</span>}
      </p>
      <div className="flex gap-4 text-sm font-semibold">
        <button type="button" onClick={() => setEditing(true)} className="cursor-pointer underline underline-offset-2">
          Corregir
        </button>
        {confirming ? (
          <span className="flex gap-3">
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const res = await deleteEntryAction(entry.id);
                  if (!res.ok) return void toast.error(res.error);
                  toast.success(res.message);
                  router.refresh();
                })
              }
              className="cursor-pointer text-[var(--danger)] underline underline-offset-2"
            >
              Sí, borrar
            </button>
            <button type="button" onClick={() => setConfirming(false)} className="cursor-pointer underline underline-offset-2">
              No
            </button>
          </span>
        ) : (
          <button type="button" onClick={() => setConfirming(true)} className="cursor-pointer underline underline-offset-2">
            Borrar
          </button>
        )}
      </div>
    </li>
  );
}

/** A mark someone forgot to make. */
export function NewEntry({
  sedeId,
  sedeName,
  day,
  people,
}: {
  sedeId: string;
  sedeName: string;
  day: string;
  people: { id: string; full_name: string }[];
}) {
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="cursor-pointer rounded-full border border-border-strong px-5 py-2.5 text-sm font-semibold hover:bg-surface-hover"
      >
        + Agregar marca en {sedeName}
      </button>
    );
  }
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <EntryForm
        id={null}
        people={people}
        initial={{ staff_id: "", sede_id: sedeId, date: day, clock_in: "", clock_out: "", out_next_day: false, note: "" }}
        onDone={() => setOpen(false)}
      />
    </div>
  );
}
