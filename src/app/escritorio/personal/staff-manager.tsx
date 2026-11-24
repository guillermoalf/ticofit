"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { OwnerDelete } from "@/components/desk/owner-delete";

import { SlideOver } from "@/components/portal/slide-over";
import { TextField, SelectField } from "@/components/portal/form-fields";
import { cn } from "@/lib/utils";
import { createStaffAction, resetPinAction, updateStaffAction, type StaffInput } from "./actions";

export type StaffRow = {
  id: string;
  full_name: string;
  role_id: string;
  display_title: string | null;
  phone: string | null;
  email: string | null;
  active: boolean;
  can_manage_payroll: boolean;
  sede_ids: string[];
  has_pin: boolean;
};

type Editing = { mode: "new" } | { mode: "edit"; row: StaffRow } | { mode: "pin"; row: StaffRow } | null;

export function StaffManager({
  rows,
  roles,
  sedes,
  meId,
  canGrantPayroll,
  canDelete,
}: {
  rows: StaffRow[];
  roles: { id: string; label: string }[];
  sedes: { id: string; name: string }[];
  meId: string;
  canGrantPayroll: boolean;
  /** Owners: may delete people. */
  canDelete?: boolean;
}) {
  const [editing, setEditing] = useState<Editing>(null);
  const roleLabel = new Map(roles.map((r) => [r.id, r.label]));
  const sedeName = new Map(sedes.map((s) => [s.id, s.name]));

  return (
    <>
      <div className="mb-4 flex justify-end">
        <button
          type="button"
          onClick={() => setEditing({ mode: "new" })}
          className="cursor-pointer rounded-full bg-verde-profundo px-5 py-2.5 text-sm font-semibold text-crema-claro"
        >
          Agregar persona
        </button>
      </div>

      <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
        {rows.map((r) => (
          <li key={r.id} className="flex flex-wrap items-center gap-x-6 gap-y-2 px-5 py-4">
            <div className="min-w-0 flex-1">
              <p className={cn("text-[16px] font-semibold", !r.active && "text-muted line-through")}>
                {r.full_name}
                {r.id === meId && <span className="ml-2 text-sm font-normal text-muted">(vos)</span>}
              </p>
              <p className="text-sm text-muted">
                {r.display_title ? `${r.display_title} (${roleLabel.get(r.role_id) ?? r.role_id})` : (roleLabel.get(r.role_id) ?? r.role_id)}
                {r.can_manage_payroll && " · planilla"} · {r.sede_ids.map((s) => sedeName.get(s) ?? s).join(", ")}
                {!r.has_pin && r.active && " · sin PIN"}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setEditing({ mode: "pin", row: r })}
                className="cursor-pointer rounded-full border border-border-strong px-4 py-2 text-sm font-semibold hover:bg-surface-hover"
              >
                Cambiar PIN
              </button>
              <button
                type="button"
                onClick={() => setEditing({ mode: "edit", row: r })}
                className="cursor-pointer rounded-full border border-border-strong px-4 py-2 text-sm font-semibold hover:bg-surface-hover"
              >
                Editar
              </button>
            </div>
            {canDelete && r.id !== meId && (
              <div className="basis-full">
                <OwnerDelete
                  kind="staff"
                  id={r.id}
                  label="Borrar persona"
                  question={`¿Borrar a ${r.full_name}, con sus marcas de reloj y su PIN?`}
                  done="Persona borrada."
                />
              </div>
            )}
          </li>
        ))}
      </ul>

      <SlideOver
        open={editing?.mode === "new" || editing?.mode === "edit"}
        title={editing?.mode === "edit" ? "Editar persona" : "Agregar persona"}
        onClose={() => setEditing(null)}
      >
        {(editing?.mode === "new" || editing?.mode === "edit") && (
          <StaffForm
            key={editing.mode === "edit" ? editing.row.id : "new"}
            row={editing.mode === "edit" ? editing.row : null}
            roles={roles}
            sedes={sedes}
            canGrantPayroll={canGrantPayroll}
            onDone={() => setEditing(null)}
          />
        )}
      </SlideOver>

      <SlideOver open={editing?.mode === "pin"} title="Cambiar PIN" onClose={() => setEditing(null)}>
        {editing?.mode === "pin" && <PinForm row={editing.row} onDone={() => setEditing(null)} />}
      </SlideOver>
    </>
  );
}

function StaffForm({
  row,
  roles,
  sedes,
  canGrantPayroll,
  onDone,
}: {
  row: StaffRow | null;
  roles: { id: string; label: string }[];
  sedes: { id: string; name: string }[];
  canGrantPayroll: boolean;
  onDone: () => void;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [name, setName] = useState(row?.full_name ?? "");
  const [role, setRole] = useState(row?.role_id ?? roles.find((r) => r.id === "coach")?.id ?? roles[0]?.id ?? "");
  const [sedeIds, setSedeIds] = useState<string[]>(row?.sede_ids ?? (sedes.length === 1 ? [sedes[0].id] : []));
  const [title, setTitle] = useState(row?.display_title ?? "");
  const [phone, setPhone] = useState(row?.phone ?? "");
  const [email, setEmail] = useState(row?.email ?? "");
  const [payroll, setPayroll] = useState(row?.can_manage_payroll ?? false);
  const [active, setActive] = useState(row?.active ?? true);
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const input: StaffInput = { full_name: name, role_id: role, display_title: title, sede_ids: sedeIds, phone, email, can_manage_payroll: payroll };
    start(async () => {
      const res = row ? await updateStaffAction(row.id, { ...input, active }) : await createStaffAction(input, pin);
      if (!res.ok) return setError(res.error);
      toast.success(row ? "Cambios guardados." : "Persona agregada.");
      router.refresh();
      onDone();
    });
  };

  return (
    <form onSubmit={submit} method="post" className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-6 py-5">
      <TextField label="Nombre completo" value={name} onChange={setName} required autoComplete="off" />
      <SelectField label="Rol" value={role} onChange={setRole} options={roles.map((r) => ({ value: r.id, label: r.label }))} />
      <TextField label="Cargo que se muestra (opcional, no cambia permisos)" value={title} onChange={setTitle} autoComplete="off" />
      <fieldset>
        <legend className="mb-1.5 text-sm text-muted">Sedes</legend>
        <div className="flex flex-wrap gap-4">
          {sedes.map((s) => (
            <label key={s.id} className="inline-flex items-center gap-2 text-[15px]">
              <input
                type="checkbox"
                checked={sedeIds.includes(s.id)}
                onChange={(e) =>
                  setSedeIds((cur) => (e.target.checked ? [...cur, s.id] : cur.filter((x) => x !== s.id)))
                }
                className="size-4 accent-[var(--tf-verde-profundo)]"
              />
              {s.name}
            </label>
          ))}
        </div>
      </fieldset>
      <TextField label="Teléfono" value={phone} onChange={setPhone} inputMode="tel" autoComplete="off" />
      <TextField label="Correo" value={email} onChange={setEmail} type="email" autoComplete="off" />
      {!row && (
        <TextField
          label="PIN de 4 números"
          value={pin}
          onChange={(v) => setPin(v.replace(/\D/g, "").slice(0, 4))}
          inputMode="numeric"
          type="password"
          autoComplete="new-password"
          required
        />
      )}
      {canGrantPayroll && (
        <label className="flex items-start gap-2 text-[15px]">
          <input
            type="checkbox"
            checked={payroll}
            onChange={(e) => setPayroll(e.target.checked)}
            className="mt-1 size-4 accent-[var(--tf-verde-profundo)]"
          />
          <span>
            Puede ver salarios y hacer planillas
            <span className="block text-sm text-muted">Solo para quien maneja la planilla.</span>
          </span>
        </label>
      )}
      {row && (
        <label className="flex items-center gap-2 text-[15px]">
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
            className="size-4 accent-[var(--tf-verde-profundo)]"
          />
          Activo (si lo desmarcás, ya no puede entrar)
        </label>
      )}
      <p role="alert" className="min-h-6 text-sm font-semibold text-[var(--danger)]">
        {error}
      </p>
      <button
        type="submit"
        disabled={pending}
        className="w-full cursor-pointer rounded-full bg-verde-profundo px-6 py-3 font-semibold text-crema-claro disabled:opacity-60"
      >
        {row ? "Guardar cambios" : "Agregar"}
      </button>
    </form>
  );
}

function PinForm({ row, onDone }: { row: StaffRow; onDone: () => void }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    start(async () => {
      const res = await resetPinAction(row.id, pin);
      if (!res.ok) return setError(res.error);
      toast.success(`PIN de ${row.full_name} actualizado.`);
      router.refresh();
      onDone();
    });
  };

  return (
    <form onSubmit={submit} method="post" className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-6 py-5">
      <p className="text-[15px] text-muted">
        Nuevo PIN para <strong className="text-ink">{row.full_name}</strong>. También desbloquea a quien se quedó bloqueado por
        intentos fallidos.
      </p>
      <TextField
        label="PIN de 4 números"
        value={pin}
        onChange={(v) => setPin(v.replace(/\D/g, "").slice(0, 4))}
        inputMode="numeric"
        type="password"
        autoComplete="new-password"
        required
      />
      <p role="alert" className="min-h-6 text-sm font-semibold text-[var(--danger)]">
        {error}
      </p>
      <button
        type="submit"
        disabled={pending}
        className="w-full cursor-pointer rounded-full bg-verde-profundo px-6 py-3 font-semibold text-crema-claro disabled:opacity-60"
      >
        Guardar PIN
      </button>
    </form>
  );
}
