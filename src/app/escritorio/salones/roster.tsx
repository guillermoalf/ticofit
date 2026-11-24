"use client";

import { useEffect, useId, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { bookForClientAction, cancelClassAction, cancelReservationAction, setAttendedAction } from "./actions";
import { BUTTON, CONTROL, LABEL } from "./class-form";

type Result = { ok: true; message: string } | { ok: false; error: string };

export type RosterRow = { id: string; client_id: string; full_name: string; attended: boolean; by_staff: boolean };

function useRun() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  const run = (fn: () => Promise<Result>, after?: () => void) =>
    start(async () => {
      const res = await fn();
      if (!res.ok) return void toast.error(res.error);
      toast.success(res.message);
      after?.();
      router.refresh();
    });
  return { run, busy: pending || !ready };
}

/** Who is booked, check-in on the day, and booking someone from the desk. */
export function Roster({
  classId,
  rows,
  clients,
  canWrite,
  canMark,
  canBook,
}: {
  classId: string;
  rows: RosterRow[];
  clients: { id: string; full_name: string }[];
  canWrite: boolean;
  canMark: boolean;
  canBook: boolean;
}) {
  const { run, busy } = useRun();
  const id = useId();
  const [q, setQ] = useState("");
  const booked = useMemo(() => new Set(rows.map((r) => r.client_id)), [rows]);
  const matches = useMemo(() => {
    const term = q.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
    if (term.length < 2) return [];
    return clients
      .filter((c) => !booked.has(c.id) && c.full_name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").includes(term))
      .slice(0, 8);
  }, [q, clients, booked]);

  return (
    <div className="space-y-6">
      {rows.length ? (
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
          {rows.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3">
              <span className="min-w-0 flex-1 font-semibold">
                {r.full_name}
                {r.by_staff && <span className="ml-2 text-sm font-normal text-muted">reservó el personal</span>}
              </span>
              {canWrite && canMark && (
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={r.attended}
                    disabled={busy}
                    onChange={(e) => run(() => setAttendedAction(r.id, e.target.checked))}
                    className="size-5 accent-[var(--color-verde-profundo)]"
                  />
                  Llegó
                </label>
              )}
              {!canMark && r.attended && <span className="text-sm">Llegó</span>}
              {canWrite && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    if (confirm(`¿Cancelar la reserva de ${r.full_name}?`)) run(() => cancelReservationAction(r.id));
                  }}
                  className="cursor-pointer text-sm font-semibold underline underline-offset-2 disabled:opacity-60"
                >
                  Cancelar
                </button>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-2xl border border-dashed border-border-strong bg-surface px-5 py-8 text-center text-muted">Nadie ha reservado todavía.</p>
      )}

      {canWrite && canBook && (
        <div className="rounded-2xl border border-border bg-surface p-4">
          <label htmlFor={`${id}-q`} className={LABEL}>
            Reservar para un cliente
          </label>
          <input
            id={`${id}-q`}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Escribí el nombre"
            autoComplete="off"
            className={CONTROL}
          />
          {matches.length > 0 && (
            <ul className="mt-2 divide-y divide-border">
              {matches.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3 py-2">
                  <span>{c.full_name}</span>
                  <button type="button" disabled={busy} onClick={() => run(() => bookForClientAction(classId, c.id), () => setQ(""))} className={BUTTON}>
                    Reservar
                  </button>
                </li>
              ))}
            </ul>
          )}
          {q.trim().length >= 2 && !matches.length && <p className="mt-2 text-sm text-muted">No hay clientes con ese nombre sin reserva.</p>}
        </div>
      )}
    </div>
  );
}

/** Cancel one occurrence, with the reason the clients will see. */
export function CancelClass({ classId, booked }: { classId: string; booked: number }) {
  const { run, busy } = useRun();
  const id = useId();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="cursor-pointer rounded-full border border-border-strong px-5 py-2.5 text-sm font-semibold hover:bg-surface-hover">
        Cancelar esta clase
      </button>
    );
  }
  return (
    <form
      method="post"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => cancelClassAction(classId, reason), () => setOpen(false));
      }}
      className="space-y-3 rounded-2xl border border-border bg-surface p-4"
    >
      <label htmlFor={`${id}-r`} className={LABEL}>
        Motivo {booked > 0 && `(se cancelan también ${booked} ${booked === 1 ? "reserva" : "reservas"})`}
      </label>
      <input id={`${id}-r`} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} className={CONTROL} required />
      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={busy} className={BUTTON}>
          Sí, cancelar la clase
        </button>
        <button type="button" onClick={() => setOpen(false)} className="cursor-pointer text-sm font-semibold underline underline-offset-2">
          No
        </button>
      </div>
    </form>
  );
}
