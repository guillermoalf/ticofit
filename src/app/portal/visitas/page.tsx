import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/portal";
import { createClient } from "@/lib/supabase/server";
import type { Measurement, Visit, VisitRowWithClient } from "@/types/db";
import { VisitsClient } from "./visits-client";

export const dynamic = "force-dynamic";

import type { ClientType } from "@/types/profile";

type RawVisitRow = Visit & {
  client: { full_name: string | null; client_type: ClientType | null } | null;
  measurements: Measurement[];
};

export default async function VisitasPage() {
  const { userId, profile } = await requireProfile();
  if (profile.role !== "coach") redirect("/portal/inicio");

  const supabase = await createClient();

  const [{ data: rawVisits }, { data: clients }] = await Promise.all([
    supabase
      .from("visits")
      .select("*, client:profiles!client_id(full_name, client_type), measurements(*)")
      .eq("coach_id", userId)
      .order("visit_date", { ascending: false }),
    supabase
      .from("profiles")
      .select("id, full_name")
      .eq("coach_id", userId)
      .order("full_name", { ascending: true }),
  ]);

  const visits: VisitRowWithClient[] = ((rawVisits ?? []) as RawVisitRow[]).map(
    ({ client, measurements, ...v }) => ({
      ...v,
      client_name: client?.full_name ?? null,
      client_type: client?.client_type ?? null,
      measurement: measurements?.[0] ?? null,
    }),
  );

  const clientOptions = (clients ?? []).map(
    (c: { id: string; full_name: string | null }) => ({
      id: c.id,
      name: c.full_name ?? "Sin nombre",
    }),
  );

  return <VisitsClient visits={visits} clients={clientOptions} />;
}
