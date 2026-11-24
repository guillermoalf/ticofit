"use client";

import { useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { formatDate } from "@/lib/clients/body";
import { colones } from "@/lib/staff/clock";
import { PAY_TYPES, type PayType, type Person } from "@/lib/staff/payroll";
import { cn } from "@/lib/utils";
import { BUTTON, CONTROL, LABEL } from "../salones/class-form";
import { addVacationAction, deleteVacationAction, saveEmploymentAction, type EmploymentInput } from "./actions";

export type Vacation = { id: string; start_date: string; days: number; note: string | null };

const fmtDays = (n: number) => `${Number(n).toLocaleString("es-CR", { maximumFractionDigits: 1 })} ${Number(n) === 1 ? "día" : "días"}`;

/** One person: pay summary, aguinaldo, vacations; expands to edit. */
export function PersonRow({
  person,
  employment,
  vacations,
}: {
  person: Person;
  employment: EmploymentInput;
  vacations: Vacation[];
}) {
  const [open, setOpen] = useState(false);
  const balance = person.vacation_accrued == null ? null : person.vacation_accrued - person.vacation_taken;

  return (
    <li className="px-5 py-4">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
        <div className="min-w-0 flex-1">
          <p className={cn("font-semibold", !person.active && "text-muted line-through")}>{person.full_name}</p>
          <p className="text-sm text-muted">
            {person.rate == null
              ? "Sin datos de planilla: no entra en las planillas"
              : `${person.job_title ? `${person.job_title} · ` : ""}${PAY_TYPES[person.pay_type ?? "monthly"].label}: ${colones(person.rate)}`}
            {person.rate != null && !person.has_iban && " · falta el IBAN"}
          </p>
        </div>
        <dl className="flex gap-6 text-sm">
          <div>
            <dt className="text-muted">Aguinaldo</dt>
            <dd className="font-semibold tabular-nums">{colones(person.aguinaldo)}</dd>
          </div>
          <div>
            <dt className="text-muted">Vacaciones</dt>
            <dd className="font-semibold tabular-nums">{balance == null ? "—" : fmtDays(balance)}</dd>
          </div>
        </dl>
        <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="cursor-pointer text-sm font-semibold underline underline-offset-2">
          {open ? "Cerrar" : "Editar"}
        </button>
      </div>
      {open && (
        <div className="mt-4 grid gap-6 lg:grid-cols-[3fr_2fr]">
          <EmploymentForm staffId={person.staff_id} initial={employment} />
          <Vacations person={person} vacations={vacations} />
        </div>
      )}
    </li>
  );
}

function EmploymentForm({ staffId, initial }: { staffId: string; initial: EmploymentInput }) {
  const router = useRouter();
  const id = useId();
  const [v, setV] = useState(initial);
  const [pending, start] = useTransition();
  const set = (patch: Partial<EmploymentInput>) => setV((o) => ({ ...o, ...patch }));

  return (
    <form
      method="post"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await saveEmploymentAction(staffId, v);
          if (!res.ok) return void toast.error(res.error);
          toast.success(res.message);
          router.refresh();
        });
      }}
      className="grid gap-3 sm:grid-cols-2"
    >
      <div>
        <label htmlFor={`${id}-c`} className={LABEL}>
          Cédula
        </label>
        <input id={`${id}-c`} value={v.cedula} onChange={(e) => set({ cedula: e.target.value })} className={CONTROL} autoComplete="off" />
      </div>
      <div>
        <label htmlFor={`${id}-j`} className={LABEL}>
          Puesto
        </label>
        <input id={`${id}-j`} value={v.job_title} onChange={(e) => set({ job_title: e.target.value })} className={CONTROL} />
      </div>
      <div>
        <label htmlFor={`${id}-h`} className={LABEL}>
          Fecha de ingreso
        </label>
        <input id={`${id}-h`} type="date" value={v.hire_date} onChange={(e) => set({ hire_date: e.target.value })} className={CONTROL} />
      </div>
      <div>
        <label htmlFor={`${id}-i`} className={LABEL}>
          IBAN
        </label>
        <input
          id={`${id}-i`}
          value={v.iban}
          onChange={(e) => set({ iban: e.target.value })}
          placeholder="CR00 0000 0000 0000 0000 00"
          className={CONTROL}
          autoComplete="off"
        />
      </div>
      <div>
        <label htmlFor={`${id}-t`} className={LABEL}>
          Forma de pago
        </label>
        <select id={`${id}-t`} value={v.pay_type} onChange={(e) => set({ pay_type: e.target.value as PayType })} className={CONTROL}>
          {(Object.keys(PAY_TYPES) as PayType[]).map((k) => (
            <option key={k} value={k}>
              {PAY_TYPES[k].label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor={`${id}-r`} className={LABEL}>
          {PAY_TYPES[v.pay_type].rate}
        </label>
        <input id={`${id}-r`} inputMode="decimal" value={v.rate} onChange={(e) => set({ rate: e.target.value })} className={CONTROL} />
      </div>
      <div className="sm:col-span-2">
        <button type="submit" disabled={pending} className={BUTTON}>
          Guardar datos de planilla
        </button>
      </div>
    </form>
  );
}

function Vacations({ person, vacations }: { person: Person; vacations: Vacation[] }) {
  const router = useRouter();
  const id = useId();
  const [startDate, setStartDate] = useState("");
  const [days, setDays] = useState("");
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();

  const run = (fn: () => Promise<{ ok: true; message: string } | { ok: false; error: string }>, after?: () => void) =>
    start(async () => {
      const res = await fn();
      if (!res.ok) return void toast.error(res.error);
      toast.success(res.message);
      after?.();
      router.refresh();
    });

  return (
    <div>
      <p className="mb-2 font-semibold">Vacaciones</p>
      <p className="mb-3 text-sm text-muted">
        {person.vacation_accrued == null
          ? "Para calcular el saldo faltan la fecha de ingreso o los días por cada 50 semanas (Tarifas)."
          : `Ganadas desde el ingreso: ${fmtDays(person.vacation_accrued)} · tomadas: ${fmtDays(person.vacation_taken)}.`}
      </p>
      {vacations.length > 0 && (
        <ul className="mb-3 divide-y divide-border rounded-xl border border-border">
          {vacations.map((v) => (
            <li key={v.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
              <span>
                {formatDate(v.start_date)} · {fmtDays(v.days)}
                {v.note && <span className="text-muted"> · {v.note}</span>}
              </span>
              <button
                type="button"
                disabled={pending}
                onClick={() => run(() => deleteVacationAction(v.id))}
                className="cursor-pointer font-semibold underline underline-offset-2"
              >
                Quitar
              </button>
            </li>
          ))}
        </ul>
      )}
      <form
        method="post"
        onSubmit={(e) => {
          e.preventDefault();
          run(
            () => addVacationAction(person.staff_id, startDate, days, note),
            () => {
              setStartDate("");
              setDays("");
              setNote("");
            },
          );
        }}
        className="grid grid-cols-2 gap-3"
      >
        <div>
          <label htmlFor={`${id}-s`} className={LABEL}>
            Desde
          </label>
          <input id={`${id}-s`} type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={CONTROL} required />
        </div>
        <div>
          <label htmlFor={`${id}-d`} className={LABEL}>
            Días hábiles
          </label>
          <input id={`${id}-d`} inputMode="decimal" value={days} onChange={(e) => setDays(e.target.value)} className={CONTROL} required />
        </div>
        <div className="col-span-2">
          <label htmlFor={`${id}-n`} className={LABEL}>
            Nota (opcional)
          </label>
          <input id={`${id}-n`} value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} className={CONTROL} />
        </div>
        <div className="col-span-2">
          <button type="submit" disabled={pending} className={BUTTON}>
            Anotar vacaciones
          </button>
        </div>
      </form>
    </div>
  );
}
