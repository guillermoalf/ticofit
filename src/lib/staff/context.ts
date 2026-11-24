import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { requireProfile } from "@/lib/portal";
import { createClient } from "@/lib/supabase/server";
import { can, type Permission, type StaffContext } from "./permissions";
import { SEDE_COOKIE, readStaffToken } from "./token";

/** Profile roles that are desk accounts (legacy `admin` logins act as desks). */
export function isDeskRole(role: string): boolean {
  return role === "desk" || role === "admin";
}

/**
 * The employee acting on this desk right now, or null when the desk is
 * locked. Slides the idle window forward on every request. Memoized per
 * request so the layout and the page share one round-trip.
 */
export const getStaff = cache(async (): Promise<StaffContext | null> => {
  if (!(await readStaffToken())) return null;
  const supabase = await createClient();
  const { data: alive } = await supabase.rpc("staff_session_touch");
  if (!alive) return null;
  const { data } = await supabase.rpc("current_staff");
  return (data as StaffContext | null) ?? null;
});

/**
 * Gate for staff pages and server actions: a desk account with an unlocked
 * PIN session, optionally holding a permission. A locked desk goes to
 * /bloqueo; a missing permission goes back to /escritorio.
 */
export async function requireStaff(permission?: Permission): Promise<StaffContext> {
  const { profile } = await requireProfile();
  if (!isDeskRole(profile.role)) redirect("/portal");
  const staff = await getStaff();
  if (!staff) redirect("/bloqueo");
  if (permission && !can(staff, permission)) redirect("/escritorio");
  return staff;
}

/** Same check for server actions: returns an error string instead of redirecting. */
export async function staffForAction(
  permission?: Permission,
): Promise<{ staff: StaffContext; error?: undefined } | { staff?: undefined; error: string }> {
  const staff = await getStaff();
  if (!staff) return { error: "La sesión se bloqueó. Ingresá tu PIN de nuevo." };
  if (permission && !can(staff, permission)) return { error: "Tu rol no permite hacer esto." };
  return { staff };
}

/**
 * Sedes the lists on screen should show: the one picked in the sede switcher,
 * or every sede this person works in.
 */
export async function activeSedeIds(staff: StaffContext): Promise<string[]> {
  const picked = (await cookies()).get(SEDE_COOKIE)?.value;
  return picked && staff.sede_ids.includes(picked) ? [picked] : staff.sede_ids;
}
