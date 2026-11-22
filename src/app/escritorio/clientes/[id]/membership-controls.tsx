"use client";

import { useEffect, useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { formatCRC, type Overview, type Plan } from "@/lib/billing/types";
import { assignPlanAction, reactivateAction, recordCashAction } from "../../pagos-actions";

// Never `text-base`: in this theme it is a colour (--color-base).
const CONTROL =
  "w-full rounded-xl border border-border-strong bg-surface px-3.5 py-2.5 text-[16px] text-ink outline-none focus:border-primary";
const BUTTON = "cursor-pointer rounded-full bg-verde-profundo px-5 py-2.5 text-sm font-semibold text-crema-claro disabled:opacity-60";

type Result = { ok: true; message: string } | { ok: false; error: string };

export function MembershipControls({
  clientId,
  overview: o,
  plans,
  today,
  canAssign,
  canCash,
}: {
  clientId: string;
  overview: Overview;
  plans: Plan[];
  today: string;
  canAssign: boolean;
  canCash: boolean;
}) {
  const router = useRouter();
  const id = useId();
  const [pending, start] = useTransition();
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);

  const [plan, setPlan] = useState(o.plan_id ?? plans[0]?.id ?? "");
  const [restart, setRestart] = useState("");
  const [amount, setAmount] = useState(o.price_crc ? String(o.price_crc) : "");
  const [paidOn, setPaidOn] = useState(today);
  const [periods, setPeriods] = useState("1");
  const [note, setNote] = useState("");

  const run = (fn: () => Promise<Result>) =>
    start(async () => {
      const res = await fn();
      if (!res.ok) return void toast.error(res.error);
      toast.success(res.message);
      router.refresh();
    });

  if (!canAssign && !canCash) return null;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {canAssign && (
        <form
          method="post"
          onSubmit={(e) => {
            e.preventDefault();
            run(() => assignPlanAction(clientId, plan, restart));
          }}
          className="space-y-3 rounded-2xl border border-border bg-surface p-4"
        >
          <h3 className="font-semibold">{o.has_membership ? "Plan" : "Asignar plan"}</h3>
          {plans.length ? (
            <>
              <div>
                <label htmlFor={`${id}-plan`} className="mb-1.5 block text-sm text-muted">
                  Plan
                </label>
                <select id={`${id}-plan`} value={plan} onChange={(e) => setPlan(e.target.value)} className={CONTROL}>
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} · {formatCRC(p.price_crc)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor={`${id}-restart`} className="mb-1.5 block text-sm text-muted">
                  {o.has_membership ? "Reiniciar desde (opcional: borra lo pagado)" : "Cobrar desde (vacío = fecha de ingreso)"}
                </label>
                <input id={`${id}-restart`} type="date" value={restart} onChange={(e) => setRestart(e.target.value)} className={CONTROL} />
              </div>
              <button type="submit" disabled={pending || !ready} className={BUTTON}>
                {o.has_membership ? (restart ? "Reiniciar membresía" : "Cambiar plan") : "Asignar plan"}
              </button>
            </>
          ) : (
            <p className="text-sm text-muted">No hay planes activos en esta sede. Se agregan en Ajustes.</p>
          )}
        </form>
      )}

      {canCash && o.has_membership && (
        <form
          method="post"
          onSubmit={(e) => {
            e.preventDefault();
            run(() => recordCashAction(clientId, amount, paidOn, periods));
          }}
          className="space-y-3 rounded-2xl border border-border bg-surface p-4"
        >
          <h3 className="font-semibold">Pago en efectivo</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor={`${id}-amount`} className="mb-1.5 block text-sm text-muted">
                Monto (₡)
              </label>
              <input id={`${id}-amount`} value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="numeric" className={CONTROL} />
            </div>
            <div>
              <label htmlFor={`${id}-months`} className="mb-1.5 block text-sm text-muted">
                Meses
              </label>
              <select id={`${id}-months`} value={periods} onChange={(e) => setPeriods(e.target.value)} className={CONTROL}>
                {Array.from({ length: 12 }, (_, i) => String(i + 1)).map((n) => (
                  <option key={n}>{n}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label htmlFor={`${id}-paid`} className="mb-1.5 block text-sm text-muted">
              Fecha
            </label>
            <input id={`${id}-paid`} type="date" value={paidOn} max={today} onChange={(e) => setPaidOn(e.target.value)} className={CONTROL} />
          </div>
          <button type="submit" disabled={pending || !ready} className={BUTTON}>
            Registrar pago
          </button>
        </form>
      )}

      {canAssign && o.status === "suspended" && (
        <form
          method="post"
          onSubmit={(e) => {
            e.preventDefault();
            run(() => reactivateAction(clientId, note));
          }}
          className="space-y-3 rounded-2xl border border-border bg-surface p-4 md:col-span-2"
        >
          <h3 className="font-semibold">Reactivar mientras paga</h3>
          <p className="text-sm text-muted">Le devuelve el acceso por los días de gracia. Queda registrado quién lo hizo.</p>
          <div>
            <label htmlFor={`${id}-note`} className="mb-1.5 block text-sm text-muted">
              Nota (opcional)
            </label>
            <input id={`${id}-note`} value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} className={CONTROL} />
          </div>
          <button type="submit" disabled={pending || !ready} className={BUTTON}>
            Reactivar
          </button>
        </form>
      )}
    </div>
  );
}
