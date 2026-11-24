import Link from "next/link";
import { notFound } from "next/navigation";

import { DeskPageHeader } from "@/components/desk/page-header";
import { RoutineBuilder } from "@/components/routines/routine-builder";
import { builderLibrary, loadRoutine } from "@/lib/routines/server";
import { requireStaff } from "@/lib/staff/context";
import { createClient } from "@/lib/supabase/server";
import { DeleteTemplateButton } from "./delete-button";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

export default async function PlantillaPage({ params }: { params: Promise<{ id: string }> }) {
  const staff = await requireStaff("routines.write");
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();
  const supabase = await createClient();
  const template = await loadRoutine(supabase, id);
  if (!template || template.client_id !== null) notFound();
  const library = await builderLibrary(supabase, staff.id);
  const back = "/escritorio/ejercicios?vista=plantillas";
  return (
    <>
      <Link href={back} className="mb-3 inline-block text-sm text-muted hover:text-ink">
        ← Plantillas
      </Link>
      <DeskPageHeader
        title={template.name}
        description="Para usarla, abrí el expediente del cliente → Rutina → Nueva rutina y elegí esta plantilla."
        action={<DeleteTemplateButton id={id} name={template.name} />}
      />
      <RoutineBuilder
        mode="template"
        routineId={id}
        sedeId={template.sede_id}
        initial={{ name: template.name, notes: template.notes ?? "", valid_from: "", valid_weeks: 4, days: template.days }}
        {...library}
        doneHref={back}
      />
    </>
  );
}
