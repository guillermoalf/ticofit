"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/portal/form-fields";
import {
  ClientIntakeFields,
  EMPTY_INTAKE,
  type ClientIntakeForm,
} from "@/components/portal/client-intake-fields";
import {
  SlideOver,
  SlideOverBody,
  SlideOverFooter,
} from "@/components/portal/slide-over";
import { createClientAction } from "./actions";

type AddClientForm = ClientIntakeForm & {
  create_account: boolean;
  monthly_fee: string;
  join_date: string;
  next_payment_date: string;
};

const EMPTY: AddClientForm = {
  ...EMPTY_INTAKE,
  create_account: false,
  monthly_fee: "",
  join_date: "",
  next_payment_date: "",
};

export function AddClientPanel({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Same reason as the exercise panel: this form is long and scrolls, so a
    // native bubble on an off-screen field would look like a dead button.
    if (!form.full_name.trim()) {
      setError("El nombre del cliente es obligatorio.");
      return;
    }
    if (form.create_account && !form.email.trim()) {
      setError("Para dar acceso al portal necesitás su correo electrónico.");
      return;
    }

    setLoading(true);
    try {
      const result = await createClientAction({
        ...form,
        monthly_fee: form.monthly_fee === "" ? null : Number(form.monthly_fee),
        join_date: form.join_date || null,
        next_payment_date: form.next_payment_date || null,
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      if (result.invitedEmail) {
        toast.success("Cliente creado", {
          description: `${result.invitedEmail} ya puede entrar con Google usando ese correo. No hace falta compartirle ninguna contraseña.`,
          duration: 10000,
        });
      } else {
        toast.success("Cliente creado", {
          description: "Cliente sin acceso al portal — podés registrar sus visitas desde ya.",
        });
      }
      setForm(EMPTY);
      onClose();
      router.refresh();
    } catch {
      setError("Ocurrió un error inesperado. Intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SlideOver open={open} title="Agregar cliente" onClose={onClose}>
      <form onSubmit={onSubmit} noValidate className="flex min-h-0 flex-1 flex-col">
        <SlideOverBody>
          <ClientIntakeFields
            form={form}
            onChange={(patch) => setForm((f) => ({ ...f, ...patch }))}
            disabled={loading}
            emailRequired={form.create_account}
            emailHint={
              form.create_account
                ? "Con este correo va a entrar al portal"
                : "Opcional — solo contacto"
            }
          />

          <fieldset className="flex flex-col gap-4">
            <legend className="mb-1 text-xs font-medium uppercase tracking-[0.08em] text-muted-2">
              Acceso y pagos
            </legend>

            {/* Portal access is optional: walk-ins get a profile with no login. */}
            <label className="flex items-center justify-between gap-3 rounded-xl border border-border bg-base/60 px-4 py-3">
              <span className="text-sm text-muted">
                Crear acceso al portal
                <span className="mt-0.5 block text-xs text-muted-2">
                  Autoriza su correo para que entre con Google y vea su rutina.
                </span>
              </span>
              <input
                type="checkbox"
                checked={form.create_account}
                onChange={(e) => set("create_account", e.target.checked)}
                disabled={loading}
                className="size-5 shrink-0 accent-primary"
              />
            </label>

            <TextField
              label="Mensualidad (₡)"
              type="number"
              inputMode="numeric"
              value={form.monthly_fee}
              onChange={(v) => set("monthly_fee", v)}
              disabled={loading}
              placeholder="Opcional — monto mensual"
            />
            <TextField
              label="Fecha de ingreso"
              type="date"
              value={form.join_date}
              onChange={(v) => set("join_date", v)}
              disabled={loading}
            />
            <TextField
              label="Próxima fecha de pago"
              type="date"
              value={form.next_payment_date}
              onChange={(v) => set("next_payment_date", v)}
              disabled={loading}
            />
          </fieldset>

          {error && (
            <p
              role="alert"
              className="flex items-start gap-2 rounded-xl border border-border-strong bg-base/60 px-3 py-2.5 text-sm text-ink"
            >
              <AlertCircle size={16} className="mt-0.5 shrink-0 text-primary" />
              <span>{error}</span>
            </p>
          )}
        </SlideOverBody>

        <SlideOverFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="flex-1"
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button type="submit" loading={loading} className="flex-1">
            {loading ? "Creando…" : "Crear cliente"}
          </Button>
        </SlideOverFooter>
      </form>
    </SlideOver>
  );
}
