"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { X, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/portal/form-fields";
import { authorizeCoachAction } from "./actions";

const EMPTY = { email: "", full_name: "" };

/**
 * Authorizes ONE coach address. This is the only way a coach account comes
 * into existence: the ledger row is what 0010's trigger consumes, and the
 * RLS policy behind it pins intended_role = 'coach', so this panel cannot
 * mint an admin even if the request were tampered with.
 */
export function AuthorizeCoachPanel({
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

  // Close on Escape and lock body scroll while open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await authorizeCoachAction({
        email: form.email,
        full_name: form.full_name,
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      toast.success("Entrenador autorizado", {
        description: `${form.email.trim().toLowerCase()} ya puede entrar con Google usando ese correo.`,
        duration: 8000,
      });
      setForm(EMPTY);
      onClose();
      router.refresh();
    } catch {
      setError("Ocurrió un error inesperado. Intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <button
        aria-label="Cerrar"
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Autorizar entrenador"
        className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col border-l border-border-strong bg-surface shadow-glow"
      >
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="font-display text-lg font-semibold">
            Autorizar entrenador
          </h2>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded-full p-1.5 text-muted transition-colors hover:bg-surface-hover hover:text-ink"
          >
            <X size={18} />
          </button>
        </div>

        <form
          onSubmit={onSubmit}
          className="flex flex-1 flex-col gap-4 overflow-y-auto px-6 py-5"
        >
          <p className="rounded-xl border border-border bg-base/60 px-4 py-3 text-sm leading-relaxed text-muted">
            El entrenador entra con{" "}
            <span className="text-ink">este mismo correo</span> desde la
            pantalla de inicio de sesión. Ningún correo sin autorizar puede
            crear una cuenta.
          </p>

          <TextField
            label="Correo electrónico"
            type="email"
            value={form.email}
            onChange={(v) => set("email", v)}
            autoComplete="off"
            required
          />
          <TextField
            label="Nombre completo"
            value={form.full_name}
            onChange={(v) => set("full_name", v)}
            placeholder="Opcional — para reconocerlo en la lista"
          />

          {error && (
            <p
              role="alert"
              className="flex items-start gap-2 rounded-xl border border-border-strong bg-base/60 px-3 py-2.5 text-sm text-ink"
            >
              <AlertCircle size={16} className="mt-0.5 shrink-0 text-primary" />
              <span>{error}</span>
            </p>
          )}

          <div className="mt-auto flex gap-3 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button type="submit" loading={loading} className="flex-1">
              {loading ? "Autorizando…" : "Autorizar"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
