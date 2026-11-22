import { redirect } from "next/navigation";

import { appCssVars } from "@/config/brand";
import { displaySerif } from "@/lib/fonts";
import { requireProfile } from "@/lib/portal";
import { createClient } from "@/lib/supabase/server";
import { getStaff, isDeskRole } from "@/lib/staff/context";
import { DeskLock, type DeskLockStaff } from "@/app/escritorio/desk-lock";

// Session + PIN state per request; never prerendered.
export const dynamic = "force-dynamic";

/**
 * The shared computer's lock screen. It lives outside /escritorio on purpose:
 * client navigation doesn't re-render a layout, so a lock drawn by the desk
 * layout can't appear when the PIN session expires mid-navigation.
 */
export default async function LockPage() {
  const { profile } = await requireProfile();
  if (!isDeskRole(profile.role)) redirect("/portal");
  if (await getStaff()) redirect("/escritorio");

  const supabase = await createClient();
  const [{ data: list }, { data: sedes }, { data: deskSedes }] = await Promise.all([
    supabase.rpc("desk_staff_list"),
    supabase.from("sedes").select("id, name").order("sort_order"),
    supabase.from("desk_sedes").select("sede_id").eq("desk_id", profile.id),
  ]);
  const here = new Set((deskSedes ?? []).map((d) => d.sede_id as string));

  return (
    <div style={appCssVars()} className={`${displaySerif.variable} min-h-screen bg-base text-ink`}>
      <DeskLock
        deskName={profile.full_name ?? "Computadora"}
        sedeNames={(sedes ?? []).filter((s) => here.has(s.id)).map((s) => s.name as string)}
        staff={(list ?? []) as DeskLockStaff[]}
      />
    </div>
  );
}
