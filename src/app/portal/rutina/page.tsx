import Link from "next/link";
import { redirect } from "next/navigation";

import { RoutineView, ValidityNote } from "@/components/routines/routine-view";
import { formatDate, todayCR } from "@/lib/clients/body";
import { requireProfile } from "@/lib/portal";
import { ROUTINE_SELECT, normalizeRoutine } from "@/lib/routines/library";
import { routineExercises } from "@/lib/routines/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * The client's current routine. RLS (0027) returns only the newest routine
 * assigned to their file, so no filter is needed here.
 */
export default async function RutinaPage() {
  const { userId, profile } = await requireProfile();
  if (profile.role !== "client") redirect("/portal/clientes");

  const supabase = await createClient();

  // Suspended for non-payment: the routine stays locked until a payment is approved.
  const { data: file } = await supabase.from("clients").select("id").eq("user_id", userId).maybeSingle();
  const { data: overview } = file
    ? await supabase.from("membership_overview").select("status").eq("client_id", file.id).maybeSingle()
    : { data: null };
  if (overview?.status === "suspended") {
    return (
      <main className="mx-auto max-w-xl px-5 py-12 sm:px-6">
        <h1 className="font-tf-serif text-[40px] leading-tight">Tu rutina está en pausa</h1>
        <p className="mt-3 text-[16px] text-muted">
          Tu membresía está suspendida por falta de pago. Subí el comprobante y la rutina se desbloquea apenas lo aprobemos.
        </p>
        <Link href="/portal/pagos" className="mt-6 inline-flex rounded-full bg-verde-profundo px-6 py-3 font-semibold text-crema-claro">
          Subir comprobante
        </Link>
      </main>
    );
  }

  const { data } = await supabase.from("client_routines").select(ROUTINE_SELECT).limit(1).maybeSingle();
  const routine = data ? normalizeRoutine(data as never) : null;
  const exercises = routine ? await routineExercises(supabase, routine) : new Map();

  return (
    <main className="mx-auto max-w-3xl px-5 py-10 sm:px-6 sm:py-12">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-tf-serif text-[40px] leading-tight">{routine?.name ?? "Mi rutina"}</h1>
          {routine?.valid_from && <p className="text-[15px] text-muted">Desde el {formatDate(routine.valid_from)}</p>}
          {routine && <ValidityNote routine={routine} today={todayCR()} audience="client" />}
        </div>
        {routine && (
          <Link
            href={`/imprimir/rutina/${routine.id}`}
            className="rounded-full border border-border-strong px-5 py-2.5 text-sm font-semibold hover:bg-surface-hover"
          >
            Descargar PDF
          </Link>
        )}
      </header>
      {routine ? (
        <RoutineView routine={routine} exercises={exercises} />
      ) : (
        <p className="rounded-2xl border border-dashed border-border-strong bg-surface px-5 py-10 text-center text-muted">
          Tu coach todavía no te asignó una rutina.
        </p>
      )}
    </main>
  );
}
