import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { Profile } from "@/types/profile";

/**
 * Loads the authenticated user's profile for a portal Server Component.
 * Redirects to /login when there's no session. Use this as the single entry
 * point for portal pages so auth handling stays consistent.
 *
 * Two invite-only outcomes send the user to /sin-acceso instead of /login,
 * because bouncing them back to a sign-in form they just completed would
 * loop forever:
 *   - a session with no profile row (their signup was refused by 0010's
 *     trigger, or their profile was deleted), and
 *   - a profile with authorized = false (0010's revocation switch).
 *
 * Memoized per request with React's cache(): the portal layout and its page
 * both call it, so one render costs one getUser() round-trip and one profile
 * query instead of two of each.
 */
export const requireProfile = cache(async (): Promise<{
  userId: string;
  email: string | null;
  profile: Profile;
}> => {
  if (!isSupabaseConfigured) redirect("/login");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single<Profile>();

  if (!profile) redirect("/sin-acceso");
  if (!profile.authorized) redirect("/sin-acceso?motivo=suspendido");

  return { userId: user.id, email: user.email ?? null, profile };
});

/** Does the signed-in user already have a password (vs. Google only)? */
export async function hasPassword(): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("has_password");
  return data === true;
}
