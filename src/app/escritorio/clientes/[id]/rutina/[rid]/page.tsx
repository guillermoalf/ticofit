import Link from "next/link";
import { notFound } from "next/navigation";

import { DeskPageHeader } from "@/components/desk/page-header";
import { RoutineBuilder } from "@/components/routines/routine-builder";
import { builderLibrary, loadRoutine } from "@/lib/routines/server";
import { requireStaff } from "@/lib/staff/context";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

export default async function EditarRutinaPage({ params }: { params: Promise<{ id: string; rid: string }> }) {
  const staff = await requireStaff("routines.write");
  const { id, rid } = await params;
  if (!UUID_RE.test(id) || !UUID_RE.test(rid)) notFound();
  const supabase = await createClient();
  const routine = await loadRoutine(supabase, rid);
  if (!routine || routine.client_id !== id) notFound();
  const { data: client } = await supabase.from("clients").select("full_name").eq("id", id).maybeSingle();
  const library = await builderLibrary(supabase, staff.id);
  const back = `/escritorio/clientes/${id}?tab=rutina`;

  return (
    <>
      <Link href={back} className="mb-3 inline-block text-sm text-muted hover:text-ink">
        ← {client?.full_name ?? "Cliente"}
      </Link>
      <DeskPageHeader title="Editar rutina" description="Los cambios se ven de inmediato en el portal del cliente." />
      <RoutineBuilder
        mode="client"
        routineId={rid}
        clientId={id}
        initial={{
          name: routine.name,
          notes: routine.notes ?? "",
          valid_from: routine.valid_from ?? "",
          valid_weeks: routine.valid_weeks ?? 4,
          days: routine.days,
        }}
        {...library}
        doneHref={back}
      />
    </>
  );
}
