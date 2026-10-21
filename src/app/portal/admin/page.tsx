import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/portal";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types/profile";
import type { CoachAuthorization, PreauthorizedEmail } from "@/types/preauth";
import { AdminClient } from "./admin-client";

// Reads the session + ledger per request; never statically prerendered.
export const dynamic = "force-dynamic";

type CoachProfile = Pick<
  Profile,
  "id" | "full_name" | "email" | "authorized" | "created_at"
>;

/**
 * The platform owner's home: the coach access ledger. Every row here is an
 * address the admin authorized — pending ones have no account yet, consumed
 * ones have signed in at least once.
 *
 * Admin-only twice over: this redirect, and RLS ("admin reads
 * authorizations") which returns nothing at all to a coach or client.
 */
export default async function AdminPage() {
  const { profile } = await requireProfile();
  if (profile.role !== "admin") redirect("/portal");

  const supabase = await createClient();

  const [{ data: ledger }, { data: coaches }] = await Promise.all([
    supabase
      .from("preauthorized_emails")
      .select("*")
      .eq("intended_role", "coach")
      .order("created_at", { ascending: false }),
    supabase
      .from("profiles")
      .select("id, full_name, email, authorized, created_at")
      .eq("role", "coach"),
  ]);

  // Join each ledger row to the account it produced, so one list shows both
  // "invited, not in yet" and "active coach, suspend me".
  const byEmail = new Map<string, CoachProfile>(
    ((coaches ?? []) as CoachProfile[]).map((c) => [
      (c.email ?? "").toLowerCase(),
      c,
    ]),
  );

  const rows: CoachAuthorization[] = ((ledger ?? []) as PreauthorizedEmail[]).map(
    (row) => {
      const account = byEmail.get(row.email) ?? null;
      return {
        ...row,
        account: account
          ? {
              id: account.id,
              full_name: account.full_name,
              authorized: account.authorized,
              created_at: account.created_at,
            }
          : null,
      };
    },
  );

  return <AdminClient rows={rows} />;
}
