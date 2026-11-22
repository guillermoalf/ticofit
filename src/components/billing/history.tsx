import { formatDate } from "@/lib/clients/body";
import { formatCRC, type Payment, type Receipt } from "@/lib/billing/types";
import { ReceiptBadge } from "./status-badge";

export function ReceiptList({ receipts, urls }: { receipts: Receipt[]; urls: Record<string, string> }) {
  if (!receipts.length) return <p className="text-[15px] text-muted">Todavía no hay comprobantes.</p>;
  return (
    <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
      {receipts.map((r) => (
        <li key={r.id} className="flex flex-wrap items-start justify-between gap-x-6 gap-y-1 px-4 py-3">
          <div className="min-w-0">
            <p className="font-semibold">
              {formatCRC(r.amount_crc)} · pagado el {formatDate(r.paid_on)}
            </p>
            <p className="text-sm text-muted">
              {r.reference ? `Referencia ${r.reference} · ` : ""}
              {urls[r.file_path] ? (
                <a href={urls[r.file_path]} target="_blank" rel="noreferrer" className="underline underline-offset-2">
                  Ver comprobante
                </a>
              ) : (
                "Comprobante"
              )}
            </p>
            {r.status === "rejected" && r.reject_reason && <p className="mt-1 text-sm">Motivo: {r.reject_reason}</p>}
          </div>
          <ReceiptBadge status={r.status} />
        </li>
      ))}
    </ul>
  );
}

export function PaymentList({ payments, people }: { payments: Payment[]; people?: Record<string, string> }) {
  if (!payments.length) return <p className="text-[15px] text-muted">Todavía no hay pagos.</p>;
  return (
    <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
      {payments.map((p) => (
        <li key={p.id} className="flex flex-wrap justify-between gap-x-6 gap-y-1 px-4 py-3">
          <span className="font-semibold">
            {formatCRC(p.amount_crc)} · {formatDate(p.paid_on)}
          </span>
          <span className="text-sm text-muted">
            {p.method === "cash" ? "Efectivo" : "Comprobante"}
            {p.periods > 1 && ` · ${p.periods} meses`}
            {people && p.recorded_by_staff && people[p.recorded_by_staff] && ` · ${people[p.recorded_by_staff]}`}
          </span>
        </li>
      ))}
    </ul>
  );
}
