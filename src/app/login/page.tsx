"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowLeft, MailCheck } from "lucide-react";

import { TicofitLogo } from "@/components/brand/ticofit-logo";
import { authErrorToSpanish } from "@/lib/auth-errors";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { cn } from "@/lib/utils";

/**
 * "recover" swaps the panel's contents rather than routing anywhere: recovering
 * is a two-field detour off signing in, and a whole page for it would lose the
 * address already typed.
 */
type Mode = "signin" | "recover" | "sent";

/**
 * The verde profundo field over the celeste page:
 *   intro → full screen with the logo, then it lifts to the top with a curved edge
 *   form  → resting at the top, the form underneath
 *   enter → after a good sign-in it drops back over everything, then /portal
 */
type Stage = "intro" | "form" | "enter";

const INTRO_MS = 1100;
const ENTER_MS = 700;

function reducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function LoginForm() {
  const router = useRouter();

  const [stage, setStage] = useState<Stage>("intro");
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setStage("form"), reducedMotion() ? 0 : INTRO_MS);
    return () => clearTimeout(t);
  }, []);

  /**
   * Sends the recovery link. Supabase answers the same way whether or not the
   * address has an account, so the copy afterwards says "if it exists".
   * The link signs the user in and lands on /portal/crear-contrasena.
   */
  async function onRecover(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!isSupabaseConfigured) {
      setError("El acceso aún no está disponible. Intentá más tarde.");
      return;
    }
    setLoading(true);
    const supabase = createClient();
    try {
      const next = encodeURIComponent("/portal/crear-contrasena");
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        // Same origin the browser is on, so it works in dev and on the deployed domain.
        redirectTo: `${window.location.origin}/auth/callback?next=${next}`,
      });
      if (resetError) {
        setError(authErrorToSpanish(resetError, "No se pudo enviar el correo. Intentá de nuevo."));
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
      setError("El acceso aún no está disponible. Intentá más tarde.");
      return;
    }
    setLoading(true);
    const supabase = createClient();
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (signInError) {
        setError(authErrorToSpanish(signInError));
        setLoading(false);
        return;
      }
      // The field drops back over the page, then /portal resolves the role
      // (client, desk), the first-login password step and the invite checks.
      // The field lives at the top of the page: be there when it drops.
      window.scrollTo({ top: 0, behavior: reducedMotion() ? "auto" : "smooth" });
      setStage("enter");
      setTimeout(
        () => {
          router.push("/portal");
          router.refresh();
        },
        reducedMotion() ? 0 : ENTER_MS,
      );
    } catch {
      setError("Ocurrió un error inesperado. Intentá de nuevo.");
      setLoading(false);
    }
  }

  // Google OAuth: to Google, then back to /auth/callback on this same origin.
  async function onGoogleSignIn() {
    setError(null);
    if (!isSupabaseConfigured) {
      setError("El acceso aún no está disponible. Intentá más tarde.");
      return;
    }
    setGoogleLoading(true);
    const supabase = createClient();
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (oauthError) {
      setError("No se pudo continuar con Google. Intentá de nuevo.");
      setGoogleLoading(false);
    }
  }

  const covered = stage !== "form";

  return (
    <div className="relative min-h-dvh overflow-x-hidden">
      {/* The field: full screen while covered, a band with a curved edge at rest. */}
      <div
        aria-hidden={stage === "form" ? undefined : true}
        className={cn(
          "tf-login-field absolute inset-x-0 top-0 z-20 bg-verde-profundo text-lima-claro",
          covered ? "h-dvh" : "h-[var(--tf-login-band)]",
        )}
      >
        <svg
          viewBox="0 0 400 90"
          preserveAspectRatio="none"
          aria-hidden="true"
          className="absolute inset-x-0 top-full -mt-px h-[clamp(96px,24vw,140px)] w-full text-verde-profundo"
        >
          <path d="M0 0H400V6C356 8 322 90 200 90C96 90 46 52 0 34Z" fill="currentColor" />
        </svg>

        {/* Intro and enter: the logo in the middle. */}
        <div
          className={cn(
            "absolute inset-0 flex flex-col items-center justify-center gap-5 px-6 transition-opacity duration-500",
            covered ? "opacity-100" : "pointer-events-none opacity-0",
          )}
        >
          <TicofitLogo className="tf-login-logo h-auto w-[min(62vw,300px)]" />
          <p className="font-tf-serif text-[clamp(20px,4.5vw,28px)] italic text-crema-claro">Un nuevo comienzo se siente.</p>
        </div>

        {/* At rest: logo and greeting in the band. */}
        <div
          className={cn(
            "mx-auto flex h-full max-w-md flex-col justify-end px-6 pb-2 transition-[opacity,transform] duration-500",
            covered ? "pointer-events-none -translate-y-3 opacity-0" : "translate-y-0 opacity-100 delay-200",
          )}
        >
          <Link href="/" aria-label="ticofit, volver al sitio" className="w-fit text-lima-claro">
            <TicofitLogo className="h-auto w-[132px]" />
          </Link>
          <p className="mt-3 text-[15px] text-crema-claro">Qué bueno verte de vuelta.</p>
        </div>
      </div>

      {/* The form, under the band. */}
      <main
        className={cn(
          "relative z-10 mx-auto w-full max-w-md px-6 pt-[calc(var(--tf-login-band)+clamp(96px,24vw,140px)+8px)] pb-14 transition-[opacity,transform] duration-500",
          stage === "form" ? "translate-y-0 opacity-100 delay-300" : "translate-y-6 opacity-0",
        )}
      >
        {mode === "sent" ? (
          <>
            <MailCheck size={28} aria-hidden="true" />
            <h1 className="mt-4 font-tf-serif text-[40px] leading-none">Revisá tu correo</h1>
            <p className="mt-4 text-[16px] leading-relaxed">
              Si <span className="font-semibold">{email.trim()}</span> tiene una cuenta, te llegó un enlace para crear una
              contraseña nueva. Abrilo en este mismo dispositivo; vence en una hora.
            </p>
            <p className="mt-3 text-[15px]">¿No lo ves? Mirá en spam antes de pedir otro.</p>
            <button type="button" onClick={backToSignIn} className={cn(GHOST, "mt-8")}>
              <ArrowLeft size={16} aria-hidden="true" />
              Volver
            </button>
          </>
        ) : mode === "recover" ? (
          <>
            <h1 className="font-tf-serif text-[40px] leading-none">¿Olvidaste tu contraseña?</h1>
            <p className="mt-3 text-[16px]">Escribí tu correo y te mandamos un enlace para crear una nueva.</p>
            <form onSubmit={onRecover} className="mt-7 space-y-5" noValidate>
              <Field label="Correo electrónico" type="email" value={email} onChange={setEmail} autoComplete="email" required />
              <ErrorNote error={error} />
              <SubmitButton loading={loading} label="Enviar enlace" />
            </form>
            <button type="button" onClick={backToSignIn} className={cn(GHOST, "mt-5")}>
              <ArrowLeft size={16} aria-hidden="true" />
              Volver a ingresar
            </button>
          </>
        ) : (
          <>
            <h1 className="font-tf-serif text-[48px] leading-none">Ingresar</h1>
            <form onSubmit={onSubmit} className="mt-7 space-y-5" noValidate>
              <Field label="Correo electrónico" type="email" value={email} onChange={setEmail} autoComplete="email" required />
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
                  className="min-h-11 cursor-pointer text-[15px] underline underline-offset-4"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
              <ErrorNote error={error} />
              <SubmitButton loading={loading} label="Entrar" />
            </form>

            <div className="my-7 flex items-center gap-3" aria-hidden="true">
              <span className="h-px flex-1 bg-verde-profundo/30" />
              <span className="text-xs tracking-[2px]">O</span>
              <span className="h-px flex-1 bg-verde-profundo/30" />
            </div>

            <button
              type="button"
              onClick={onGoogleSignIn}
              disabled={googleLoading || loading}
              className="inline-flex min-h-[52px] w-full cursor-pointer items-center justify-center gap-3 rounded-full border border-verde-profundo/40 bg-white/40 px-6 text-[15px] font-semibold transition-colors hover:bg-white/60 disabled:pointer-events-none disabled:opacity-60"
            >
              <GoogleIcon />
              {googleLoading ? "Conectando…" : "Continuar con Google"}
            </button>

            <p className="mt-8 text-center text-[15px]">¿No tenés acceso? Pedíselo a tu entrenador.</p>
          </>
        )}
      </main>
    </div>
  );
}

const GHOST =
  "inline-flex min-h-11 cursor-pointer items-center gap-1.5 text-[15px] font-semibold underline-offset-4 hover:underline";

/** Full width at rest; while it works it shrinks to a pill with three dots. */
function SubmitButton({ loading, label }: { loading: boolean; label: string }) {
  return (
    <div className="flex justify-center">
      <button
        type="submit"
        disabled={loading}
        aria-busy={loading}
        className={cn(
          "tf-login-submit inline-flex h-[52px] cursor-pointer items-center justify-center overflow-hidden rounded-full bg-verde-profundo text-[15px] font-semibold text-lima-claro",
          loading ? "w-24" : "w-full",
        )}
      >
        {loading ? (
          <span className="flex gap-1.5" aria-label="Cargando">
            <span className="tf-login-dot" />
            <span className="tf-login-dot" />
            <span className="tf-login-dot" />
          </span>
        ) : (
          label
        )}
      </button>
    </div>
  );
}

function ErrorNote({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <p role="alert" className="flex items-start gap-2 rounded-2xl bg-white/60 px-4 py-3 text-[15px]">
      <AlertCircle size={18} className="mt-0.5 shrink-0 text-[var(--danger)]" aria-hidden="true" />
      <span>{error}</span>
    </p>
  );
}

/** Google "G" mark: official four-color logo, inline so it needs no asset. */
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
      <span className="mb-1.5 block text-[14px] font-semibold">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        required={required}
        className="h-[52px] w-full rounded-2xl border border-verde-profundo/35 bg-white/45 px-4 text-[16px] text-verde-profundo outline-none transition-colors focus:border-verde-profundo focus:bg-white/70 focus-visible:ring-2 focus-visible:ring-verde-profundo/40"
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
