"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertCircle, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/portal/form-fields";
import { createClient } from "@/lib/supabase/client";
import { dismissPasswordPromptAction } from "./actions";

const MIN_LENGTH = 8;

export function SetPasswordForm({
  email,
  returnTo,
  alreadyDismissed,
  passwordSet,
}: {
  email: string | null;
  returnTo: string;
  alreadyDismissed: boolean;
  /** true when the account already has one — the form becomes "change". */
  passwordSet: boolean;
}) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [skipping, setSkipping] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < MIN_LENGTH) {
      setError(`La contraseña debe tener al menos ${MIN_LENGTH} caracteres.`);
      return;
    }
    if (password !== confirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setLoading(true);
    try {
      // updateUser on the CURRENT session: adds a password to this account.
      // It never creates a second user for the address.
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({ password });

      if (updateError) {
        setError(
          updateError.message?.toLowerCase().includes("should be different")
            ? "Elegí una contraseña distinta a la actual."
            : "No se pudo guardar la contraseña. Intentá de nuevo.",
        );
        return;
      }

      // Stop offering the step now that it's done.
      if (!alreadyDismissed) await dismissPasswordPromptAction();

      toast.success(passwordSet ? "Contraseña actualizada" : "Contraseña creada", {
        description: "Ya podés entrar con Google o con tu correo y contraseña.",
      });
      router.push(returnTo);
      router.refresh();
    } catch {
      setError("Ocurrió un error inesperado. Intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  async function onSkip() {
    setSkipping(true);
    try {
      // Only the first-login pass records the dismissal; from the profile
      // this button is a plain "cancelar" and should change nothing.
      if (!passwordSet && !alreadyDismissed) await dismissPasswordPromptAction();
      router.push(returnTo);
      router.refresh();
    } finally {
      setSkipping(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-16">
      <div className="w-full max-w-sm">
        <div className="rounded-3xl border border-border-strong bg-surface/70 p-7 shadow-glow">
          <span className="mb-5 flex h-12 w-12 items-center justify-center rounded-full border border-border-strong bg-base/60">
            <KeyRound size={20} className="text-primary" />
          </span>

          <h1 className="font-display text-2xl font-bold">
            {passwordSet ? "Cambiá tu contraseña" : "Creá tu contraseña"}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            {passwordSet ? (
              <>
                Elegí una contraseña nueva para entrar con tu correo
                {email && <span className="text-ink"> ({email})</span>}. Seguís
                pudiendo entrar con Google.
              </>
            ) : (
              <>
                Entraste con Google. Si querés, agregá una contraseña para poder
                entrar también con tu correo
                {email && <span className="text-ink"> ({email})</span>}. Es la
                misma cuenta, solo otra forma de entrar.
              </>
            )}
          </p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
            <TextField
              label="Contraseña"
              type="password"
              value={password}
              onChange={setPassword}
              autoComplete="new-password"
              placeholder={`Mínimo ${MIN_LENGTH} caracteres`}
              required
            />
            <TextField
              label="Repetí la contraseña"
              type="password"
              value={confirm}
              onChange={setConfirm}
              autoComplete="new-password"
              required
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

            <Button type="submit" loading={loading} className="w-full">
              {loading
                ? "Guardando…"
                : passwordSet
                  ? "Guardar cambios"
                  : "Guardar contraseña"}
            </Button>
          </form>

          <button
            type="button"
            onClick={onSkip}
            disabled={skipping || loading}
            className="mt-4 w-full cursor-pointer rounded-full px-6 py-2 text-sm text-muted transition-colors hover:text-ink disabled:pointer-events-none disabled:opacity-60"
          >
            {skipping
              ? "Un momento…"
              : passwordSet
                ? "Cancelar"
                : "Ahora no, seguir con Google"}
          </button>

          {!passwordSet && (
            <p className="mt-4 text-center text-xs text-muted-2">
              Podés crearla más tarde desde tu perfil.
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
