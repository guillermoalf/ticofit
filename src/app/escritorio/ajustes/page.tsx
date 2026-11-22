import { DeskPageHeader } from "@/components/desk/page-header";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/staff/context";
import { DesksPanel, type DeskRow } from "./desks-panel";
import { SedeForm } from "./sede-form";
import { SettingsPanel, type SettingRow } from "./settings-panel";
import type { OpeningHours } from "./types";

export const dynamic = "force-dynamic";

export default async function AjustesPage() {
  const staff = await requireStaff("settings.manage");
  const supabase = await createClient();

  const [{ data: sedes }, { data: settings }] = await Promise.all([
    supabase
      .from("sedes")
      .select("id, name, address, building_capacity, status, opening_hours")
      .in("id", staff.sede_ids)
      .order("sort_order"),
    supabase.from("app_settings").select("key, value, label").order("key"),
  ]);

  // Desk accounts live in auth + profiles, which RLS keeps from other desks:
  // read them with the service role after the permission check above.
  const admin = createAdminClient();
  const { data: deskLinks } = await admin.from("desk_sedes").select("desk_id, sede_id").in("sede_id", staff.sede_ids);
  const deskIds = [...new Set((deskLinks ?? []).map((d) => d.desk_id as string))];
  const { data: deskProfiles } = deskIds.length
    ? await admin.from("profiles").select("id, full_name, email, role, authorized").in("id", deskIds)
    : { data: [] };
  const desks: DeskRow[] = (deskProfiles ?? []).map((p) => ({
    id: p.id,
    name: p.full_name ?? "Computadora",
    email: p.email,
    enabled: p.authorized,
    legacy: p.role !== "desk",
    sede_ids: (deskLinks ?? []).filter((d) => d.desk_id === p.id).map((d) => d.sede_id as string),
  }));

  const sedeList = (sedes ?? []) as {
    id: string;
    name: string;
    address: string | null;
    building_capacity: number;
    status: "open" | "coming_soon";
    opening_hours: OpeningHours;
  }[];

  return (
    <>
      <DeskPageHeader title="Ajustes" description="Sedes, reglas del sistema y las computadoras del gimnasio." />

      <section className="mb-12">
        <h2 className="mb-4 text-xl font-semibold">Sedes</h2>
        <div className="grid gap-4 xl:grid-cols-2">
          {sedeList.map((s) => (
            <SedeForm key={s.id} sede={s} />
          ))}
        </div>
      </section>

      <section className="mb-12">
        <h2 className="mb-4 text-xl font-semibold">Reglas</h2>
        <SettingsPanel rows={(settings ?? []) as SettingRow[]} />
      </section>

      <section>
        <h2 className="mb-1 text-xl font-semibold">Computadoras</h2>
        <p className="mb-4 text-[15px] text-muted">
          Cada computadora del gimnasio queda con su propia cuenta y solo muestra los datos de sus sedes.
        </p>
        <DesksPanel desks={desks} sedes={sedeList.map((s) => ({ id: s.id, name: s.name }))} />
      </section>
    </>
  );
}
