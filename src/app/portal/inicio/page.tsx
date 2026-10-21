import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Dumbbell, LineChart, Target } from "lucide-react";
import { requireProfile } from "@/lib/portal";
import { StubCard } from "@/components/portal/stub-card";
import { Badge } from "@/components/ui/badge";
import { TRAINING_TYPE_LABELS } from "@/types/profile";

export const dynamic = "force-dynamic";

export default async function ClientHomePage() {
  const { profile } = await requireProfile();

  // Coaches have their own workspace.
  if (profile.role === "coach") redirect("/portal/clientes");

  const firstName = profile.full_name?.split(" ")[0] || "atleta";

  return (
    <main className="mx-auto max-w-5xl px-5 py-10 sm:px-6 sm:py-12">
      <header>
        <p className="text-sm uppercase tracking-widest text-primary">
          Tu portal
        </p>
        <h1 className="mt-1 font-display text-3xl font-bold sm:text-4xl">
          Hola, {firstName}
        </h1>

        {(profile.training_type || profile.goal) && (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            {profile.training_type && (
              <Badge tone="accent">
                {TRAINING_TYPE_LABELS[profile.training_type]}
              </Badge>
            )}
            {profile.goal && (
              <span className="inline-flex items-center gap-1.5 text-sm text-muted">
                <Target size={15} className="text-primary" />
                {profile.goal}
              </span>
            )}
          </div>
        )}
      </header>

      <section className="mt-10 grid gap-5 sm:grid-cols-2">
        {/* Real screen since the client routine view shipped — no longer a stub. */}
        <Link
          href="/portal/rutina"
          className="group rounded-card border border-border bg-surface/60 p-6 transition-colors hover:border-primary"
        >
          <div className="flex items-center justify-between">
            <Dumbbell size={22} className="text-primary" />
            <ArrowRight
              size={18}
              className="text-muted-2 transition-colors group-hover:text-primary"
            />
          </div>
          <h3 className="mt-4 font-display text-lg font-semibold">Mi rutina</h3>
          <p className="mt-2 text-sm text-muted">
            Tu plan de entrenamiento asignado, con series, repeticiones y
            videos.
          </p>
        </Link>
        <StubCard
          icon={LineChart}
          title="Tu progreso"
          desc="Seguí tu evolución: cargas, medidas y constancia en cada sesión."
        />
      </section>
    </main>
  );
}
