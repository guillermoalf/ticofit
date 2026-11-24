"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { SlideOver } from "@/components/portal/slide-over";
import { TextField } from "@/components/portal/form-fields";
import { createDeskAction, setDeskEnabledAction } from "./actions";

export type DeskRow = {
  id: string;
  name: string;
  email: string | null;
  enabled: boolean;
  /** An older admin login that works as a desk. */
  legacy: boolean;
  sede_ids: string[];
};

export function DesksPanel({ desks, sedes }: { desks: DeskRow[]; sedes: { id: string; name: string }[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const sedeName = new Map(sedes.map((s) => [s.id, s.name]));

  const toggle = (d: DeskRow) =>
    start(async () => {
      const res = await setDeskEnabledAction(d.id, !d.enabled);
      if (!res.ok) return void toast.error(res.error);
      router.refresh();
    });

  return (
    <>
      <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
        {desks.map((d) => (
          <li key={d.id} className="flex flex-wrap items-center gap-x-6 gap-y-2 px-5 py-4">
            <div className="min-w-0 flex-1">
              <p className="text-[16px] font-semibold">{d.name}</p>
              <p className="text-sm text-muted">
                {d.email} · {d.sede_ids.map((s) => sedeName.get(s) ?? s).join(", ")}
                {!d.enabled && " · desactivada"}
              </p>
            </div>
            {!d.legacy && (
              <button
                type="button"
                onClick={() => toggle(d)}
                disabled={pending}
                className="cursor-pointer rounded-full border border-border-strong px-4 py-2 text-sm font-semibold hover:bg-surface-hover disabled:opacity-50"
              >
                {d.enabled ? "Desactivar" : "Activar"}
              </button>
            )}
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-4 cursor-pointer rounded-full bg-verde-profundo px-5 py-2.5 text-sm font-semibold text-crema-claro"
      >
        Agregar computadora
      </button>

      <SlideOver open={open} title="Agregar computadora" onClose={() => setOpen(false)}>
        {open && <DeskForm sedes={sedes} onDone={() => setOpen(false)} />}
      </SlideOver>
    </>
  );
}

function DeskForm({ sedes, onDone }: { sedes: { id: string; name: string }[]; onDone: () => void }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [sedeIds, setSedeIds] = useState<string[]>(sedes.length === 1 ? [sedes[0].id] : []);
  const [error, setError] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    start(async () => {
      const res = await createDeskAction({ name, email, password, sede_ids: sedeIds });
      if (!res.ok) return setError(res.error);
      toast.success("Computadora agregada. Ya podés iniciar sesión con ese correo en esa computadora.");
      router.refresh();
      onDone();
    });
  };

  return (
    <form onSubmit={submit} method="post" className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-6 py-5">
      <p className="text-[15px] text-muted">
        Creá una cuenta para una computadora del gimnasio. Se inicia sesión una vez y cada persona entra con su PIN.
      </p>
      <TextField label="Nombre (ej. Recepción Bellavista)" value={name} onChange={setName} required autoComplete="off" />
      <TextField label="Correo de la cuenta" value={email} onChange={setEmail} type="email" required autoComplete="off" />
      <TextField
        label="Contraseña (mínimo 10 caracteres)"
        value={password}
        onChange={setPassword}
        type="password"
        required
        autoComplete="new-password"
      />
      <fieldset>
        <legend className="mb-1.5 text-sm text-muted">Sedes que ve esta computadora</legend>
        <div className="flex flex-wrap gap-4">
          {sedes.map((s) => (
            <label key={s.id} className="inline-flex items-center gap-2 text-[15px]">
              <input
                type="checkbox"
                checked={sedeIds.includes(s.id)}
                onChange={(e) => setSedeIds((cur) => (e.target.checked ? [...cur, s.id] : cur.filter((x) => x !== s.id)))}
                className="size-4 accent-[var(--tf-verde-profundo)]"
              />
              {s.name}
            </label>
          ))}
        </div>
      </fieldset>
      <p role="alert" className="min-h-6 text-sm font-semibold text-[var(--danger)]">
        {error}
      </p>
      <button
        type="submit"
        disabled={pending}
        className="w-full cursor-pointer rounded-full bg-verde-profundo px-6 py-3 font-semibold text-crema-claro disabled:opacity-60"
      >
        Crear computadora
      </button>
    </form>
  );
}
