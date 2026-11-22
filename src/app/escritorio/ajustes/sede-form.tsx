"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { SelectField, TextField } from "@/components/portal/form-fields";
import { updateSedeAction } from "./actions";
import { DAYS, DAY_LABELS, type Day, type OpeningHours } from "./types";

type Sede = {
  id: string;
  name: string;
  address: string | null;
  building_capacity: number;
  status: "open" | "coming_soon";
  opening_hours: OpeningHours;
};

const timeInput =
  "w-[8.75rem] max-w-[calc(50%-1.5rem)] rounded-lg border border-border bg-surface px-2 py-2 text-[16px] text-ink outline-none focus:border-primary";

/** One sede: name, address, building capacity, status and weekly hours. */
export function SedeForm({ sede }: { sede: Sede }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [name, setName] = useState(sede.name);
  const [address, setAddress] = useState(sede.address ?? "");
  const [capacity, setCapacity] = useState(String(sede.building_capacity));
  const [status, setStatus] = useState(sede.status);
  // One range per day keeps the form simple; split shifts can come later.
  const [hours, setHours] = useState<Record<Day, { open: boolean; from: string; to: string }>>(() =>
    Object.fromEntries(
      DAYS.map((d) => {
        const r = sede.opening_hours[d]?.[0];
        return [d, { open: Boolean(r), from: r?.[0] ?? "06:00", to: r?.[1] ?? "21:00" }];
      }),
    ) as Record<Day, { open: boolean; from: string; to: string }>,
  );
  const [error, setError] = useState<string | null>(null);

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    const opening_hours = Object.fromEntries(
      DAYS.map((d) => [d, hours[d].open ? [[hours[d].from, hours[d].to]] : []]),
    ) as OpeningHours;
    start(async () => {
      const res = await updateSedeAction(sede.id, {
        name,
        address,
        building_capacity: Number(capacity),
        status,
        opening_hours,
      });
      if (!res.ok) return setError(res.error);
      setError(null);
      toast.success("Sede guardada.");
      router.refresh();
    });
  };

  return (
    <form onSubmit={save} className="space-y-4 rounded-2xl border border-border bg-surface p-5">
      <TextField label="Nombre" value={name} onChange={setName} required />
      <TextField label="Dirección" value={address} onChange={setAddress} />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Aforo del edificio"
          value={capacity}
          onChange={(v) => setCapacity(v.replace(/\D/g, ""))}
          inputMode="numeric"
          required
        />
        <SelectField
          label="Estado"
          value={status}
          onChange={setStatus}
          options={[
            { value: "open", label: "Abierta" },
            { value: "coming_soon", label: "Abre pronto" },
          ]}
        />
      </div>
      <fieldset>
        <legend className="mb-2 text-sm text-muted">Horario</legend>
        <div className="space-y-2">
          {DAYS.map((d) => (
            <div key={d} className="flex flex-wrap items-center gap-3">
              <label className="inline-flex w-full items-center gap-2 text-[15px] sm:w-32">
                <input
                  type="checkbox"
                  checked={hours[d].open}
                  onChange={(e) => setHours((h) => ({ ...h, [d]: { ...h[d], open: e.target.checked } }))}
                  className="size-4 accent-[var(--tf-verde-profundo)]"
                />
                {DAY_LABELS[d]}
              </label>
              {hours[d].open ? (
                <>
                  <input
                    type="time"
                    aria-label={`${DAY_LABELS[d]}, abre`}
                    value={hours[d].from}
                    onChange={(e) => setHours((h) => ({ ...h, [d]: { ...h[d], from: e.target.value } }))}
                    className={timeInput}
                  />
                  <span className="text-muted">a</span>
                  <input
                    type="time"
                    aria-label={`${DAY_LABELS[d]}, cierra`}
                    value={hours[d].to}
                    onChange={(e) => setHours((h) => ({ ...h, [d]: { ...h[d], to: e.target.value } }))}
                    className={timeInput}
                  />
                </>
              ) : (
                <span className="text-sm text-muted">Cerrado</span>
              )}
            </div>
          ))}
        </div>
      </fieldset>
      <p role="alert" className="min-h-6 text-sm font-semibold text-[var(--danger)]">
        {error}
      </p>
      <button
        type="submit"
        disabled={pending}
        className="cursor-pointer rounded-full bg-verde-profundo px-6 py-2.5 text-sm font-semibold text-crema-claro disabled:opacity-60"
      >
        Guardar sede
      </button>
    </form>
  );
}
