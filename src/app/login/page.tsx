"use client";

import { useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowLeft, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { authErrorToSpanish } from "@/lib/auth-errors";

/**
 * "recover" swaps the card's contents rather than routing anywhere: recovering
 * is a two-field detour off signing in, and a whole page for it would lose the
 * address already typed.
 */
type Mode = "signin" | "recover" | "sent";

function LoginForm() {
  const router = useRouter();

  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Sends the recovery link. Supabase answers the same way whether or not the
   * address has an account — it will not confirm who is registered — so the
   * copy afterwards has to be "if it exists", never "we sent it".
   *
   * The link signs the user in and lands on /portal/crear-contrasena, which
   * already knows how to set a password on the current session.
   */
  async function onRecover(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!isSupabaseConfigured) {
      setError("El portal aún no está disponible. Intentá más tarde.");
      return;
    }

    setLoading(true);
    const supabase = createClient();

    try {
      const next = encodeURIComponent("/portal/crear-contrasena");
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        {
          // Same origin the browser is on, like the Google flow above, so it
          // works in dev and on the deployed domain without an env var.
          redirectTo: `${window.location.origin}/auth/callback?next=${next}`,
        },
      );

      if (resetError) {
        setError(
          authErrorToSpanish(
            resetError,
            "No se pudo enviar el correo. Intentá de nuevo.",
          ),
        );
        return;
      }
      setMode("sent");
    } catch {
      setError("Ocurrió un error inesperado. Intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  function backToSignIn() {
    setError(null);
    setMode("signin");
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!isSupabaseConfigured) {
      setError("El portal aún no está disponible. Intentá más tarde.");
      return;
    }

    setLoading(true);
    const supabase = createClient();

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signInError) {
        setError(authErrorToSpanish(signInError));
        return;
      }

      // /portal resolves the role, the first-login password step and the
      // invite-only checks in one place — no need to duplicate them here.
      router.push("/portal");
      router.refresh();
    } catch {
      setError("Ocurrió un error inesperado. Intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  // Google OAuth — redirects the browser to Google, then back to /auth/callback.
  async function onGoogleSignIn() {
    setError(null);

    if (!isSupabaseConfigured) {
      setError("El portal aún no está disponible. Intentá más tarde.");
      return;
    }

    setGoogleLoading(true);
    const supabase = createClient();

    // Derive the redirect from the browser's actual origin so OAuth always
    // returns to wherever the user is (localhost in dev, the deployed domain
    // in prod). Avoids depending on an env var that can be missing or have a
    // stray space. The origin must be in Supabase's Redirect URLs allowlist.
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });

    if (oauthError) {
      setError("No se pudo continuar con Google. Intentá de nuevo.");
      setGoogleLoading(false);
    }
    // On success the browser navigates to Google, so no further action here.
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Logo className="h-7" />
        </div>

        <div className="rounded-3xl border border-border-strong bg-surface/70 p-7 shadow-glow">
          {mode === "sent" ? (
            <>
              <span className="mb-5 flex h-12 w-12 items-center justify-center rounded-full border border-border-strong bg-base/60">
                <MailCheck size={20} className="text-primary" />
              </span>
              <h1 className="font-display text-2xl font-bold">Revisá tu correo</h1>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                Si <span className="text-ink">{email.trim()}</span> tiene una
                cuenta, te llegó un enlace para crear una contraseña nueva.
                Abrilo en este mismo dispositivo y vence en una hora.
              </p>
              <p className="mt-3 text-sm leading-relaxed text-muted-2">
                ¿No lo ves? Mirá en spam antes de pedir otro.
              </p>

              <Button
                type="button"
                variant="ghost"
                onClick={backToSignIn}
                className="mt-6 w-full"
              >
                <ArrowLeft size={16} />
                Volver
              </Button>
            </>
          ) : mode === "recover" ? (
            <>
              <p className="font-display text-sm font-medium uppercase tracking-widest text-primary">
                Recuperar acceso
              </p>
              <h1 className="mt-2 font-display text-2xl font-bold">
                ¿Olvidaste tu contraseña?
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                Escribí tu correo y te mandamos un enlace para crear una nueva.
              </p>

              <form onSubmit={onRecover} className="mt-6 space-y-4" noValidate>
                <Field
                  label="Correo electrónico"
                  type="email"
                  value={email}
                  onChange={setEmail}
                  autoComplete="email"
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
                  {loading ? "Enviando…" : "Enviar enlace"}
                </Button>
              </form>

              <button
                type="button"
                onClick={backToSignIn}
                className="mt-4 inline-flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-full px-6 py-2 text-sm text-muted transition-colors hover:text-ink"
              >
                <ArrowLeft size={15} />
                Volver a iniciar sesión
              </button>
            </>
          ) : (
            <>
              <p className="font-display text-sm font-medium uppercase tracking-widest text-primary">
                Portal de clientes
              </p>
              <h1 className="mt-2 font-display text-2xl font-bold">
                Iniciá sesión
              </h1>

              <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
                <Field
                  label="Correo electrónico"
                  type="email"
                  value={email}
                  onChange={setEmail}
                  autoComplete="email"
                  required
                />
                <Field
                  label="Contraseña"
                  type="password"
                  value={password}
                  onChange={setPassword}
                  autoComplete="current-password"
                  required
                />

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setMode("recover");
                    }}
                    className="cursor-pointer text-sm text-muted underline-offset-4 transition-colors hover:text-ink hover:underline"
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
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

                <Button type="submit" loading={loading} className="w-full">
                  {loading ? "Entrando…" : "Entrar"}
                </Button>
              </form>

              <div className="my-6 flex items-center gap-3">
                <span className="h-px flex-1 bg-border" />
                <span className="text-xs uppercase tracking-widest text-muted-2">
                  o
                </span>
                <span className="h-px flex-1 bg-border" />
              </div>

              <button
                type="button"
                onClick={onGoogleSignIn}
                disabled={googleLoading || loading}
                className="inline-flex w-full items-center justify-center gap-3 rounded-full border border-border-strong bg-surface px-6 py-3 text-sm font-medium text-ink transition-colors hover:bg-surface-hover disabled:pointer-events-none disabled:opacity-60"
              >
                <GoogleIcon />
                {googleLoading ? "Conectando…" : "Continuar con Google"}
              </button>

              <p className="mt-6 text-center text-sm text-muted">
                ¿No tenés acceso? Pedíselo a tu entrenador.
              </p>
            </>
          )}
        </div>
      </div>
    </main>
  );
}

/** Google "G" mark — official four-color logo, inline so it needs no asset. */
function GoogleIcon() {
  return (
    <svg width={18} height={18} viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.72A5.4 5.4 0 0 1 3.68 9c0-.6.1-1.18.29-1.72V4.95H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.05l3.01-2.33z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.59C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z"
      />
    </svg>
  );
}

function Field({
  label,
  type,
  value,
  onChange,
  autoComplete,
  required,
}: {
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm text-muted">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        required={required}
        className="w-full rounded-xl border border-border bg-base/60 px-4 py-3 text-ink outline-none transition-colors placeholder:text-muted-2 focus:border-primary"
      />
    </label>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
