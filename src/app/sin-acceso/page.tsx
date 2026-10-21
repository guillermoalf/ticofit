import Link from "next/link";
import { ShieldOff } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";
import { BRAND } from "@/config/brand";

export const metadata = {
  title: "Acceso restringido",
};

// Reads a query param per request; never statically prerendered.
export const dynamic = "force-dynamic";

/**
 * Where 0010's invite-only refusal lands. The trigger rolls back the signup,
 * so the visitor has no account at all — telling them to "iniciar sesión"
 * again would just loop. Explain the model instead and point them at whoever
 * can authorize them.
 *
 * `?motivo=suspendido` is the other case: the account exists but
 * profiles.authorized was flipped to false.
 */
export default async function SinAccesoPage({
  searchParams,
}: {
  searchParams: Promise<{ motivo?: string }>;
}) {
  const { motivo } = await searchParams;
  const suspended = motivo === "suspendido";

  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-16">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Logo className="h-7" />
        </div>

        <div className="rounded-3xl border border-border-strong bg-surface/70 p-7 text-center shadow-glow">
          <span className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full border border-border-strong bg-base/60">
            <ShieldOff size={24} className="text-primary" />
          </span>

          <h1 className="font-display text-2xl font-bold">
            {suspended ? "Tu acceso está suspendido" : "Tu cuenta no está autorizada"}
          </h1>

          <p className="mt-3 text-sm leading-relaxed text-muted">
            {suspended ? (
              <>
                Tu cuenta existe, pero su acceso fue pausado. Contactá a tu
                entrenador para reactivarla.
              </>
            ) : (
              <>
                {BRAND.name} es una plataforma por invitación. Para entrar, tu
                correo tiene que estar autorizado primero.{" "}
                <span className="text-ink">Pedí acceso a tu entrenador.</span>
              </>
            )}
          </p>

          <p className="mt-4 text-xs leading-relaxed text-muted-2">
            ¿Sos entrenador y querés unirte? Escribinos a{" "}
            <a
              href={`mailto:${BRAND.contact.email}`}
              className="text-muted underline underline-offset-4 transition-colors hover:text-ink"
            >
              {BRAND.contact.email}
            </a>
            .
          </p>

          <div className="mt-7">
            <Button href="/login" variant="ghost" className="w-full">
              Volver al inicio de sesión
            </Button>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-muted-2">
          Si creés que esto es un error,{" "}
          <Link
            href="/login"
            className="underline underline-offset-4 transition-colors hover:text-muted"
          >
            intentá con otra cuenta
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
