"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { formatDate } from "@/lib/clients/body";
import { formatCRC, type Receipt } from "@/lib/billing/types";
import { reviewReceiptAction } from "../pagos-actions";

export function ReviewCard({
  receipt: r,
  clientName,
  planPrice,
  url,
}: {
  receipt: Receipt;
  clientName: string;
  planPrice: number | null;
  url: string | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");

  const review = (approve: boolean) =>
    start(async () => {
      const res = await reviewReceiptAction(r.id, approve, reason);
      if (!res.ok) return void toast.error(res.error);
      toast.success(res.message);
      router.refresh();
    });

  const isPdf = r.file_path.endsWith(".pdf");
  const isHeic = /\.hei[cf]$/.test(r.file_path);

  return (
    <li className="grid gap-4 rounded-2xl border border-border bg-surface p-4 sm:grid-cols-[minmax(0,240px)_1fr]">
      <div className="overflow-hidden rounded-xl border border-border bg-surface-hover">
        {url && !isPdf && !isHeic ? (
          <a href={url} target="_blank" rel="noreferrer" title="Abrir en grande">
            {/* eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL */}
            <img src={url} alt={`Comprobante de ${clientName}`} className="max-h-80 w-full object-contain" />
          </a>
        ) : (
          <p className="p-6 text-center text-sm">
            {url ? (
              <a href={url} target="_blank" rel="noreferrer" className="font-semibold underline underline-offset-2">
                Abrir {isPdf ? "PDF" : "archivo"}
              </a>
            ) : (
              "No se pudo cargar el archivo."
            )}
          </p>
        )}
      </div>
      <div className="min-w-0">
        <Link href={`/escritorio/clientes/${r.client_id}?tab=pagos`} className="text-lg font-semibold underline-offset-2 hover:underline">
          {clientName}
        </Link>
        <p className="mt-1 text-[15px]">
          {formatCRC(r.amount_crc)} · pagado el {formatDate(r.paid_on)}
          {r.reference && ` · ref. ${r.reference}`}
        </p>
        <p className="text-sm text-muted">
          {planPrice !== null ? `Su plan: ${formatCRC(planPrice)} + IVA.` : "No tiene plan asignado: asignale uno antes de aprobar."}
        </p>

        {rejecting ? (
          <div className="mt-4">
            <label htmlFor={`reason-${r.id}`} className="mb-1.5 block text-sm text-muted">
              Motivo (el cliente lo va a ver)
            </label>
            <input
              id={`reason-${r.id}`}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={300}
              autoFocus
              className="w-full rounded-xl border border-border-strong bg-surface px-3.5 py-2.5 text-[16px] text-ink outline-none focus:border-primary"
            />
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={pending}
                onClick={() => review(false)}
                className="cursor-pointer rounded-full border border-[var(--danger)] px-5 py-2.5 text-sm font-semibold text-[var(--danger)] disabled:opacity-50"
              >
                Rechazar
              </button>
              <button type="button" onClick={() => setRejecting(false)} className="cursor-pointer px-3 text-sm text-muted">
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={pending || planPrice === null}
              onClick={() => review(true)}
              className="cursor-pointer rounded-full bg-verde-profundo px-5 py-2.5 text-sm font-semibold text-crema-claro disabled:opacity-50"
            >
              Aprobar
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => setRejecting(true)}
              className="cursor-pointer rounded-full border border-border-strong px-5 py-2.5 text-sm font-semibold"
            >
              Rechazar…
            </button>
          </div>
        )}
      </div>
    </li>
  );
}
