import { notFound, redirect } from "next/navigation";

import { RoutineView, ValidityNote } from "@/components/routines/routine-view";
import { appCssVars } from "@/config/brand";
import { formatDate, todayCR } from "@/lib/clients/body";
import { displaySerif } from "@/lib/fonts";
import { requireProfile } from "@/lib/portal";
import { loadRoutine, routineExercises } from "@/lib/routines/server";
import { getStaff, isDeskRole } from "@/lib/staff/context";
import { createClient } from "@/lib/supabase/server";
import { PrintButton } from "./print-button";

export const dynamic = "force-dynamic";
export const metadata = { title: "Rutina" };

const UUID_RE = /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

/**
 * Printable routine ("Guardar como PDF" from the print dialog). Shared by the
 * desk and the client portal: RLS decides who sees it — staff of the client's
 * sede, or the client themself while it is their current routine.
 */
export default async function PrintRoutinePage({ params }: { params: Promise<{ id: string }> }) {
  const { userId, profile } = await requireProfile();
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();
  const supabase = await createClient();

  let back = "/portal/rutina";
  if (isDeskRole(profile.role)) {
    if (!(await getStaff())) redirect("/bloqueo");
  } else if (profile.role === "client") {
    const { data: file } = await supabase.from("clients").select("id").eq("user_id", userId).maybeSingle();
    const { data: overview } = file
      ? await supabase.from("membership_overview").select("status").eq("client_id", file.id).maybeSingle()
      : { data: null };
    if (overview?.status === "suspended") redirect("/portal/rutina");
  }

  const routine = await loadRoutine(supabase, id);
  if (!routine || !routine.client_id) notFound();
  if (isDeskRole(profile.role)) back = `/escritorio/clientes/${routine.client_id}?tab=rutina`;
  const [exercises, { data: client }] = await Promise.all([
    routineExercises(supabase, routine),
    supabase.from("clients").select("full_name").eq("id", routine.client_id).maybeSingle(),
  ]);

  return (
    <div style={appCssVars()} className={`${displaySerif.variable} min-h-screen bg-base text-ink print:bg-white`}>
      <main className="mx-auto max-w-3xl px-5 py-8 print:max-w-none print:p-0">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <a href={back} className="text-sm text-muted hover:text-ink">
            ← Volver
          </a>
          <PrintButton />
        </div>
        <header className="mb-5 border-b border-border pb-4">
          <p className="text-sm text-muted">ticofit wellness club</p>
          <h1 className="font-tf-serif text-[34px] leading-tight">{routine.name}</h1>
          <p className="text-[15px]">
            {client?.full_name}
            {routine.valid_from && ` · desde el ${formatDate(routine.valid_from)}`}
          </p>
          <ValidityNote routine={routine} today={todayCR()} audience="client" />
        </header>
        <RoutineView routine={routine} exercises={exercises} print />
      </main>
    </div>
  );
}
