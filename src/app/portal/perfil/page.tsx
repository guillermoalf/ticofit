import Link from "next/link";
import { KeyRound, ShieldCheck } from "lucide-react";
import { requireProfile, hasPassword } from "@/lib/portal";
import { AccountCard } from "./account-card";

export const dynamic = "force-dynamic";

/**
 * Every role's account screen. Its reason to exist for admins and coaches is
 * the password card: accounts are provisioned passwordless (0009/0010), so
 * this is where a Google-only user adds email/password access to the SAME
 * account — the "re-offer" half of the first-login step.
 */
export default async function PerfilPage() {
  const { profile, email } = await requireProfile();
  const passwordSet = await hasPassword();

  return (
    <main className="mx-auto max-w-3xl px-5 py-10 sm:px-6 sm:py-12">
      <header>
        <h1 className="font-display text-3xl font-bold sm:text-4xl">
          Mi perfil
        </h1>
      </header>

      <section className="mt-6 space-y-4">
        <AccountCard
          fullName={profile.full_name}
          email={email}
          phone={profile.phone}
        />

        {/* The "crear contraseña" step, always reachable from here. */}
        <div className="rounded-card border border-border bg-surface/60 px-6 py-5">
          <div className="flex items-start gap-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border-strong bg-base/60">
              {passwordSet ? (
                <ShieldCheck size={20} className="text-primary" />
              ) : (
                <KeyRound size={20} className="text-primary" />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="font-display text-lg font-semibold">
                {passwordSet ? "Tu contraseña" : "Creá tu contraseña"}
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-muted">
                {passwordSet
                  ? "Podés entrar con Google o con tu correo y contraseña. Cambiala cuando quieras."
                  : "Ahora entrás solo con Google. Agregá una contraseña para poder entrar también con tu correo — es la misma cuenta."}
              </p>
              <Link
                href="/portal/crear-contrasena?desde=/portal/perfil"
                className="mt-3 inline-flex text-sm text-ink underline underline-offset-4 transition-colors hover:text-primary"
              >
                {passwordSet ? "Cambiar contraseña" : "Crear contraseña"}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
