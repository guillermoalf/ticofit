"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import type { RunStatus } from "@/lib/staff/payroll";
import { BUTTON } from "../../salones/class-form";
import { computeRunAction, deleteRunAction, setRunStatusAction } from "../actions";

const OUTLINE = "cursor-pointer rounded-full border border-border-strong px-5 py-2.5 text-sm font-semibold hover:bg-surface-hover disabled:opacity-60";

type Res = { ok: true; message: string } | { ok: false; error: string };

export function RunActions({ id, status }: { id: string; status: RunStatus }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [confirm, setConfirm] = useState<"approve" | "paid" | "delete" | null>(null);

  const run = (fn: () => Promise<Res>, after?: () => void) =>
    start(async () => {
      const res = await fn();
      setConfirm(null);
      if (!res.ok) return void toast.error(res.error);
      toast.success(res.message);
      if (after) after();
      else router.refresh();
    });

  const ask = (text: string, yes: string, go: () => void) => (
    <div className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl border border-border-strong bg-surface p-4">
      <p className="mr-auto text-[15px]">{text}</p>
      <button type="button" disabled={pending} onClick={go} className={BUTTON}>
        {yes}
      </button>
      <button type="button" onClick={() => setConfirm(null)} className="cursor-pointer text-sm font-semibold underline underline-offset-2">
        No
      </button>
    </div>
  );

  if (confirm === "approve")
    return ask("Al aprobarla, los montos quedan fijos. ¿Aprobar?", "Sí, aprobar", () => run(() => setRunStatusAction(id, "approved")));
  if (confirm === "paid")
    return ask("¿Ya se le pagó a todos?", "Sí, marcar pagada", () => run(() => setRunStatusAction(id, "paid")));
  if (confirm === "delete")
    return ask("¿Eliminar este borrador?", "Sí, eliminar", () =>
      run(() => deleteRunAction(id), () => router.push("/escritorio/planilla")),
    );

  return (
    <div className="mb-6 flex flex-wrap gap-3">
      {status === "draft" && (
        <>
          <button type="button" disabled={pending} onClick={() => run(() => computeRunAction(id))} className={OUTLINE}>
            Recalcular
          </button>
          <button type="button" disabled={pending} onClick={() => setConfirm("approve")} className={BUTTON}>
            Aprobar
          </button>
          <button type="button" disabled={pending} onClick={() => setConfirm("delete")} className={OUTLINE}>
            Eliminar borrador
          </button>
        </>
      )}
      {status === "approved" && (
        <>
          <button type="button" disabled={pending} onClick={() => setConfirm("paid")} className={BUTTON}>
            Marcar pagada
          </button>
          <button type="button" disabled={pending} onClick={() => run(() => setRunStatusAction(id, "draft"))} className={OUTLINE}>
            Volver a borrador
          </button>
        </>
      )}
      <a href={`/escritorio/planilla/${id}/csv`} className={OUTLINE}>
        Descargar CSV
      </a>
      <a href={`/imprimir/planilla/${id}`} className={OUTLINE}>
        PDF
      </a>
    </div>
  );
}
