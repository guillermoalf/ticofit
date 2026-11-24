import Link from "next/link";
import { notFound } from "next/navigation";

import { DeskPageHeader } from "@/components/desk/page-header";
import { RoutineBuilder } from "@/components/routines/routine-builder";
import { todayCR } from "@/lib/clients/body";
import { builderLibrary, loadRoutine } from "@/lib/routines/server";
import { requireStaff } from "@/lib/staff/context";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

/** New routine for a client: blank, from a template or from one of theirs. */
export default async function NuevaRutinaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ desde?: string }>;
}) {
  const staff = await requireStaff("routines.write");
  const [{ id }, { desde }] = await Promise.all([params, searchParams]);
  if (!UUID_RE.test(id)) notFound();
  const supabase = await createClient();
  const { data: client } = await supabase.from("clients").select("id, full_name").eq("id", id).maybeSingle();
  if (!client) notFound();

  const source = desde && UUID_RE.test(desde) ? await loadRoutine(supabase, desde) : null;
  // A copy may come from a template or from this same client, never from someone else.
  const base = source && (source.client_id === null || source.client_id === id) ? source : null;
  const library = await builderLibrary(supabase, staff.id);
  const back = `/escritorio/clientes/${id}?tab=rutina`;

  return (
    <>
      <Link href={back} className="mb-3 inline-block text-sm text-muted hover:text-ink">
        ← {client.full_name}
      </Link>
      <DeskPageHeader
        title="Nueva rutina"
        description={`Para ${client.full_name}.${base ? ` Copiada de “${base.name}”: ajustala antes de asignarla.` : ""}`}
      />
      <RoutineBuilder
        mode="client"
        routineId={null}
        clientId={id}
        initial={{
          name: base?.name ?? "",
          notes: base?.notes ?? "",
          valid_from: todayCR(),
          valid_weeks: base?.valid_weeks ?? 4,
          days: base?.days ?? [],
        }}
        {...library}
        doneHref={back}
      />
    </>
  );
}
