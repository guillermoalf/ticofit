import Link from "next/link";

import { DeskPageHeader } from "@/components/desk/page-header";
import { RoutineBuilder } from "@/components/routines/routine-builder";
import { builderLibrary } from "@/lib/routines/server";
import { activeSedeIds, requireStaff } from "@/lib/staff/context";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function NuevaPlantillaPage() {
  const staff = await requireStaff("routines.write");
  const supabase = await createClient();
  const [sedeId] = await activeSedeIds(staff);
  const [library, { data: sede }] = await Promise.all([
    builderLibrary(supabase, staff.id),
    supabase.from("sedes").select("name").eq("id", sedeId).maybeSingle(),
  ]);
  return (
    <>
      <Link href="/escritorio/ejercicios?vista=plantillas" className="mb-3 inline-block text-sm text-muted hover:text-ink">
        ← Plantillas
      </Link>
      <DeskPageHeader title="Nueva plantilla" description={`Para el personal de ${sede?.name ?? "esta sede"}.`} />
      <RoutineBuilder
        mode="template"
        routineId={null}
        sedeId={sedeId}
        initial={{ name: "", notes: "", valid_from: "", valid_weeks: 4, days: [] }}
        {...library}
        doneHref="/escritorio/ejercicios?vista=plantillas"
      />
    </>
  );
}
