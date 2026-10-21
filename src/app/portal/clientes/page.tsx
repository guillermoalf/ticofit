import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/portal";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types/profile";
import type { ClientsMeta, RosterEntry } from "@/types/db";
import { RosterClient } from "./roster-client";

export const dynamic = "force-dynamic";

type RosterRow = Profile & { clients_meta: ClientsMeta | ClientsMeta[] | null };

export default async function ClientesPage() {
  const { userId, profile } = await requireProfile();

  // Coach-only workspace.
  if (profile.role !== "coach") redirect("/portal/inicio");

  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("*, clients_meta(*)")
    .eq("coach_id", userId)
    .order("created_at", { ascending: false });

  // clients_meta is 1:1 (PK = FK), but normalize in case PostgREST embeds it
  // as an array.
  const clients: RosterEntry[] = ((data ?? []) as RosterRow[]).map((row) => ({
    ...row,
    clients_meta: Array.isArray(row.clients_meta)
      ? (row.clients_meta[0] ?? null)
      : row.clients_meta,
  }));

  return <RosterClient clients={clients} />;
}
