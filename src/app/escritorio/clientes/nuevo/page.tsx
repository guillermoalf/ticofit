import { DeskPageHeader } from "@/components/desk/page-header";
import { RecordForm } from "@/components/desk/record-form";
import { todayCR } from "@/lib/clients/body";
import { activeSedeIds, requireStaff } from "@/lib/staff/context";
import { createClient } from "@/lib/supabase/server";
import { createClientFileAction } from "../actions";
import { profileFormGroups } from "../profile-groups";

export const dynamic = "force-dynamic";

export default async function NuevoClientePage() {
  const staff = await requireStaff("clients.write");
  const supabase = await createClient();
  const { data: sedes } = await supabase.from("sedes").select("id, name").in("id", staff.sede_ids).order("sort_order");
  const active = await activeSedeIds(staff);

  return (
    <>
      <DeskPageHeader
        title="Cliente nuevo"
        description="Si le ponés correo, le llega la invitación al portal. Después siguen la historia clínica y la primera medición."
      />
      <RecordForm
        groups={profileFormGroups((sedes ?? []) as { id: string; name: string }[])}
        values={{ sede_id: active[0], join_date: todayCR() }}
        action={createClientFileAction}
        submitLabel="Crear cliente"
      />
    </>
  );
}
