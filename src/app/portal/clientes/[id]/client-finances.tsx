"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Lock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { TextField, SelectField } from "@/components/portal/form-fields";
import {
  PAYMENT_STATUS_LABELS,
  type ClientsMeta,
  type PaymentStatus,
} from "@/types/db";
import { updateClientMetaAction } from "../actions";

const PAYMENT_OPTIONS = (
  Object.entries(PAYMENT_STATUS_LABELS) as [PaymentStatus, string][]
).map(([value, label]) => ({ value, label }));

const ACTIVE_OPTIONS = [
  { value: "activo", label: "Activo" },
  { value: "inactivo", label: "Inactivo" },
];

export function ClientFinances({
  clientId,
  meta,
}: {
  clientId: string;
  meta: ClientsMeta | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    monthly_fee: meta?.monthly_fee != null ? String(meta.monthly_fee) : "",
    join_date: meta?.join_date ?? "",
    next_payment_date: meta?.next_payment_date ?? "",
    payment_status: (meta?.payment_status ?? "al_dia") as PaymentStatus,
    active: meta ? meta.active : true,
  });

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function onSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await updateClientMetaAction(clientId, {
        monthly_fee:
          form.monthly_fee.trim() === "" ? null : Number(form.monthly_fee),
        join_date: form.join_date || null,
        next_payment_date: form.next_payment_date || null,
        payment_status: form.payment_status,
        active: form.active,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success("Datos financieros guardados");
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={onSave}
      className="mt-6 rounded-card border border-border bg-surface/60 p-6"
    >
      <h2 className="font-display text-lg font-semibold">Finanzas</h2>
      <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-2">
        <Lock size={12} />
        Solo visible para vos — el cliente no puede ver estos datos.
      </p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <TextField
          label="Mensualidad (₡)"
          type="number"
          value={form.monthly_fee}
          onChange={(v) => set("monthly_fee", v)}
          placeholder="Monto mensual"
        />
        <SelectField
          label="Estado de pago"
          value={form.payment_status}
          onChange={(v) => set("payment_status", v)}
          options={PAYMENT_OPTIONS}
        />
        <TextField
          label="Fecha de ingreso"
          type="date"
          value={form.join_date}
          onChange={(v) => set("join_date", v)}
        />
        <TextField
          label="Próxima fecha de pago"
          type="date"
          value={form.next_payment_date}
          onChange={(v) => set("next_payment_date", v)}
        />
        <SelectField
          label="Activo"
          value={form.active ? "activo" : "inactivo"}
          onChange={(v) => set("active", v === "activo")}
          options={ACTIVE_OPTIONS}
        />
      </div>

      {error && (
        <p
          role="alert"
          className="mt-4 flex items-start gap-2 rounded-xl border border-border-strong bg-base/60 px-3 py-2.5 text-sm text-ink"
        >
          <AlertCircle size={16} className="mt-0.5 shrink-0 text-primary" />
          <span>{error}</span>
        </p>
      )}

      <div className="mt-6 flex justify-end">
        <Button type="submit" loading={pending}>
          {pending ? "Guardando…" : "Guardar finanzas"}
        </Button>
      </div>
    </form>
  );
}
