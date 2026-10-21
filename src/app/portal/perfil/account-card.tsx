"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertCircle, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/portal/form-fields";
import { updateOwnProfileAction } from "./actions";

/**
 * "Tus datos" — read-only by default with a pencil to edit. The email is
 * shown but never editable: it is the account identity and the key the
 * invite-only model authorizes against.
 */
export function AccountCard({
  fullName,
  email,
  phone,
}: {
  fullName: string | null;
  email: string | null;
  phone: string | null;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    full_name: fullName ?? "",
    phone: phone ?? "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function cancel() {
    setForm({ full_name: fullName ?? "", phone: phone ?? "" });
    setError(null);
    setEditing(false);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await updateOwnProfileAction(form);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success("Datos actualizados");
      setEditing(false);
      router.refresh();
    } catch {
      setError("Ocurrió un error inesperado. Intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-card border border-border bg-surface/60 px-5 py-5 sm:px-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-lg font-semibold">Tus datos</h2>
        {!editing && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            aria-label="Editar tus datos"
            title="Editar tus datos"
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-border text-muted transition-colors hover:border-primary hover:text-ink"
          >
            <Pencil size={15} />
          </button>
        )}
      </div>

      {editing ? (
        <form onSubmit={onSubmit} className="mt-4 flex flex-col gap-4">
          <TextField
            label="Nombre"
            value={form.full_name}
            onChange={(v) => setForm((f) => ({ ...f, full_name: v }))}
            required
            disabled={loading}
          />
          <TextField
            label="Teléfono"
            type="tel"
            inputMode="tel"
            value={form.phone}
            onChange={(v) => setForm((f) => ({ ...f, phone: v }))}
            disabled={loading}
            placeholder="Opcional"
          />

          <div>
            <p className="mb-1.5 text-sm text-muted">Correo</p>
            <p className="truncate rounded-xl border border-border bg-base/30 px-4 py-3 text-base text-muted-2">
              {email || "—"}
            </p>
            <p className="mt-1.5 text-xs text-muted-2">
              El correo no se puede cambiar: es con el que entrás a la cuenta.
            </p>
          </div>

          {error && (
            <p
              role="alert"
              className="flex items-start gap-2 rounded-xl border border-border-strong bg-base/60 px-3 py-2.5 text-sm text-ink"
            >
              <AlertCircle size={16} className="mt-0.5 shrink-0 text-primary" />
              <span>{error}</span>
            </p>
          )}

          <div className="flex gap-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={cancel}
              disabled={loading}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button type="submit" size="sm" loading={loading} className="flex-1">
              {loading ? "Guardando…" : "Guardar"}
            </Button>
          </div>
        </form>
      ) : (
        <dl className="mt-4 space-y-3 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted">Nombre</dt>
            <dd className="text-right text-ink">{fullName || "—"}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted">Correo</dt>
            <dd className="truncate text-right text-ink">{email || "—"}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted">Teléfono</dt>
            <dd className="text-right text-ink">{phone || "—"}</dd>
          </div>
        </dl>
      )}
    </div>
  );
}
