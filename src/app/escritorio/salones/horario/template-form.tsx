"use client";

import { useEffect, useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { WEEKDAYS, type Discipline, type Salon } from "@/lib/schedule";
import { endTemplateAction, saveTemplateAction, type TemplateInput } from "../actions";
import { BUTTON, CONTROL, LABEL, type Coach } from "../class-form";

/** Add or change one weekly class. Saving an edit rebuilds its future unbooked dates. */
export function TemplateForm({
  templateId,
  initial,
  disciplines,
  salones,
  coaches,
  defaultSalon,
  doneHref,
}: {
  templateId: string | null;
  initial: TemplateInput;
  disciplines: Discipline[];
  salones: Salon[];
  coaches: Coach[];
  /** discipline id → its default salón in this sede. */
  defaultSalon: Record<string, string>;
  doneHref: string;
}) {
  const router = useRouter();
  const id = useId();
  const [pending, start] = useTransition();
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  const [v, setV] = useState(initial);
  const set = (patch: Partial<TemplateInput>) => setV((old) => ({ ...old, ...patch }));
  const [hourly, setHourly] = useState(!!initial.repeat_until);

  return (
    <form
      method="post"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await saveTemplateAction(templateId, { ...v, repeat_until: hourly ? v.repeat_until : "" });
          if (!res.ok) return void toast.error(res.error);
          toast.success(res.message);
          router.push(doneHref);
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
            set({
              discipline_id: e.target.value,
              ...(defaultSalon[e.target.value] && !templateId ? { salon_id: defaultSalon[e.target.value] } : {}),
              ...(d && !templateId ? { duration_min: String(d.default_minutes) } : {}),
            });
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
          <option value="">Elegí uno</option>
          {salones.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} · {s.capacity} personas
            </option>
          ))}
        </select>
      </div>

      <fieldset className="sm:col-span-2">
        <legend className={LABEL}>Días</legend>
        <div className="flex flex-wrap gap-2">
          {Object.entries(WEEKDAYS).map(([n, d]) => {
            const day = Number(n);
            const on = v.weekdays.includes(day);
            return (
              <label
                key={n}
                className={`cursor-pointer rounded-full border px-4 py-2 text-sm font-semibold ${on ? "border-verde-profundo bg-verde-profundo text-crema-claro" : "border-border-strong"}`}
              >
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={on}
                  onChange={() => set({ weekdays: on ? v.weekdays.filter((x) => x !== day) : [...v.weekdays, day] })}
                />
                {d.short}
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor={`${id}-t`} className={LABEL}>
            Empieza
          </label>
          <input id={`${id}-t`} type="time" step={300} value={v.start_time} onChange={(e) => set({ start_time: e.target.value })} className={CONTROL} required />
        </div>
        <div>
          <label htmlFor={`${id}-m`} className={LABEL}>
            Minutos
          </label>
          <input id={`${id}-m`} inputMode="numeric" value={v.duration_min} onChange={(e) => set({ duration_min: e.target.value })} className={CONTROL} required />
        </div>
      </div>
      <div>
        <label className="mb-1.5 flex cursor-pointer items-center gap-2 text-sm text-muted">
          <input type="checkbox" checked={hourly} onChange={(e) => setHourly(e.target.checked)} className="size-4 accent-[var(--color-verde-profundo)]" />
          Repetir cada hora hasta
        </label>
        <input
          type="time"
          step={300}
          aria-label="Repetir cada hora hasta"
          value={v.repeat_until}
          disabled={!hourly}
          onChange={(e) => set({ repeat_until: e.target.value })}
          className={`${CONTROL} disabled:opacity-50`}
        />
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
        <input id={`${id}-cap`} inputMode="numeric" value={v.capacity} onChange={(e) => set({ capacity: e.target.value })} className={CONTROL} />
      </div>
      <div>
        <label htmlFor={`${id}-from`} className={LABEL}>
          Desde
        </label>
        <input id={`${id}-from`} type="date" value={v.valid_from} onChange={(e) => set({ valid_from: e.target.value })} className={CONTROL} />
      </div>
      <div>
        <label htmlFor={`${id}-until`} className={LABEL}>
          Hasta (opcional)
        </label>
        <input id={`${id}-until`} type="date" value={v.valid_until} onChange={(e) => set({ valid_until: e.target.value })} className={CONTROL} />
      </div>

      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
        <button type="submit" disabled={pending || !ready} className={BUTTON}>
          {templateId ? "Guardar cambios" : "Agregar al horario"}
        </button>
        <a href={doneHref} className="text-sm font-semibold underline underline-offset-2">
          Cancelar
        </a>
      </div>
    </form>
  );
}

export function EndTemplateButton({ id, label }: { id: string; label: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!confirm(`¿Quitar «${label}» del horario semanal? Las fechas que ya tienen reservas se quedan.`)) return;
        start(async () => {
          const res = await endTemplateAction(id);
          if (!res.ok) return void toast.error(res.error);
          toast.success(res.message);
          router.refresh();
        });
      }}
      className="cursor-pointer text-sm font-semibold underline underline-offset-2 disabled:opacity-60"
    >
      Quitar
    </button>
  );
}
