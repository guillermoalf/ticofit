import { redirect } from "next/navigation";

import { appCssVars } from "@/config/brand";
import { displaySerif } from "@/lib/fonts";
import { requireProfile } from "@/lib/portal";
import { createClient } from "@/lib/supabase/server";
import { activeSedeIds, getStaff, isDeskRole } from "@/lib/staff/context";
import { DeskShell } from "./desk-shell";

// Session + PIN state per request; never prerendered.
export const dynamic = "force-dynamic";

/**
 * The staff desk. A desk account (a shared computer) always lands here; with
 * no PIN session open it goes to /bloqueo. Every page checks again through
 * requireStaff(), because this layout doesn't re-run on client navigation.
 */
export default async function DeskLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireProfile();
  if (!isDeskRole(profile.role)) redirect("/portal");

  const staff = await getStaff();
  if (!staff) redirect("/bloqueo");
  const supabase = await createClient();

  const [{ data: sedes }, { data: idle }] = await Promise.all([
    supabase.from("sedes").select("id, name").in("id", staff.sede_ids).order("sort_order"),
    supabase.from("app_settings").select("value").eq("key", "staff.idle_minutes").maybeSingle(),
  ]);
  const active = await activeSedeIds(staff);

  return (
    <div style={appCssVars()} className={`${displaySerif.variable} min-h-screen bg-base text-ink`}>
      <DeskShell
        staff={staff}
        sedes={(sedes ?? []) as { id: string; name: string }[]}
        activeSedeId={active.length === 1 && staff.sede_ids.length > 1 ? active[0] : null}
        idleMinutes={Number(idle?.value ?? 10)}
      >
        {children}
      </DeskShell>
    </div>
  );
}
