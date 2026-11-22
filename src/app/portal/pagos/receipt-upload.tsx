"use client";

import { useEffect, useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { submitReceiptAction } from "./actions";

const TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif",
  "application/pdf": "pdf",
};
const MAX = 10 * 1024 * 1024;

// Never `text-base`: in this theme it is a colour (--color-base).
const CONTROL =
  "w-full rounded-xl border border-border-strong bg-surface px-3.5 py-2.5 text-[16px] text-ink outline-none focus:border-primary";

/** Photo or PDF of the SINPE/transfer, straight to the client's private folder. */
export function ReceiptUpload({ clientId, suggested, today }: { clientId: string; suggested: string; today: string }) {
  const router = useRouter();
  const id = useId();
  const [file, setFile] = useState<File | null>(null);
  const [amount, setAmount] = useState(suggested);
  const [date, setDate] = useState(today);
  const [reference, setReference] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!file) return setError("Elegí la foto o el PDF del comprobante.");
    const ext = TYPES[file.type];
    if (!ext) return setError("Subí una foto (JPG, PNG, HEIC) o un PDF.");
    if (file.size > MAX) return setError("El archivo pesa más de 10 MB.");

    start(async () => {
      const path = `${clientId}/${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await createClient()
        .storage.from("receipts")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (uploadError) return setError("No se pudo subir el archivo. Revisá tu conexión e intentá de nuevo.");
      const res = await submitReceiptAction({ path, amount, paid_on: date, reference });
      if (!res.ok) return setError(res.error);
      toast.success("Comprobante enviado. Te avisamos cuando lo revisemos.");
      setFile(null);
      setReference("");
      (e.target as HTMLFormElement).reset();
      router.refresh();
    });
  };

  return (
    <form onSubmit={submit} method="post" className="space-y-4 rounded-2xl border border-border bg-surface p-4 sm:p-5">
      <h2 className="text-lg font-semibold">Subir comprobante</h2>
      <div>
        <label htmlFor={`${id}-file`} className="mb-1.5 block text-sm text-muted">
          Foto o PDF del SINPE o la transferencia
        </label>
        <input
          id={`${id}-file`}
          type="file"
          accept={Object.keys(TYPES).join(",")}
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="block w-full text-[16px] file:mr-3 file:cursor-pointer file:rounded-full file:border-0 file:bg-verde-profundo file:px-4 file:py-2 file:font-semibold file:text-crema-claro"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor={`${id}-amount`} className="mb-1.5 block text-sm text-muted">
            Monto (₡)
          </label>
          <input
            id={`${id}-amount`}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            inputMode="numeric"
            autoComplete="off"
            className={CONTROL}
          />
        </div>
        <div>
          <label htmlFor={`${id}-date`} className="mb-1.5 block text-sm text-muted">
            Fecha del pago
          </label>
          <input id={`${id}-date`} type="date" value={date} max={today} onChange={(e) => setDate(e.target.value)} className={CONTROL} />
        </div>
        <div>
          <label htmlFor={`${id}-ref`} className="mb-1.5 block text-sm text-muted">
            Referencia (opcional)
          </label>
          <input
            id={`${id}-ref`}
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            maxLength={60}
            autoComplete="off"
            className={CONTROL}
          />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <button
          type="submit"
          disabled={pending || !ready}
          className="cursor-pointer rounded-full bg-verde-profundo px-6 py-3 font-semibold text-crema-claro disabled:opacity-60"
        >
          {pending ? "Enviando…" : "Enviar comprobante"}
        </button>
        <p role="alert" className="text-sm font-semibold text-[var(--danger)]">
          {error}
        </p>
      </div>
    </form>
  );
}
