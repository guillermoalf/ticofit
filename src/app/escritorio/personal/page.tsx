import { DeskPageHeader } from "@/components/desk/page-header";
import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/staff/context";
import { StaffManager, type StaffRow } from "./staff-manager";

export const dynamic = "force-dynamic";

/** Staff list: who works where, their role, and their PIN. */
export default async function PersonalPage() {
  const me = await requireStaff("employees.manage");
  const supabase = await createClient();

  const [{ data: staff }, { data: staffSedes }, { data: roles }, { data: sedes }, { data: pins }] = await Promise.all([
    supabase.from("staff").select("id, full_name, role_id, phone, email, active, can_manage_payroll").order("full_name"),
    supabase.from("staff_sedes").select("staff_id, sede_id"),
    supabase.from("staff_roles").select("id, label").order("sort_order"),
    supabase.from("sedes").select("id, name").in("id", me.sede_ids).order("sort_order"),
    supabase.rpc("desk_staff_list"),
  ]);

  const sedesBy = new Map<string, string[]>();
  for (const r of staffSedes ?? []) {
    sedesBy.set(r.staff_id, [...(sedesBy.get(r.staff_id) ?? []), r.sede_id]);
  }
  const hasPin = new Map(((pins ?? []) as { id: string; has_pin: boolean }[]).map((p) => [p.id, p.has_pin]));

  const rows: StaffRow[] = (staff ?? []).map((s) => ({
    ...s,
    sede_ids: sedesBy.get(s.id) ?? [],
    has_pin: hasPin.get(s.id) ?? false,
  }));

  return (
    <>
      <DeskPageHeader
        title="Personal"
        description="Cada persona entra con su nombre y un PIN de 4 números. El rol decide qué puede hacer."
      />
      <StaffManager
        rows={rows}
        roles={(roles ?? []) as { id: string; label: string }[]}
        sedes={(sedes ?? []) as { id: string; name: string }[]}
        meId={me.id}
        canGrantPayroll={me.can_manage_payroll}
      />
    </>
  );
}
