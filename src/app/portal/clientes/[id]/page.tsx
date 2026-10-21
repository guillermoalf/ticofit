import { notFound, redirect } from "next/navigation";
import { requireProfile } from "@/lib/portal";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types/profile";
import type {
  ClientsMeta,
  Measurement,
  Program,
  ProgramListEntry,
  Routine,
  RoutineListEntry,
  Visit,
  VisitWithMeasurement,
} from "@/types/db";
import { ClientDetail } from "./client-detail";

export const dynamic = "force-dynamic";

type RoutineRow = Routine & { routine_items: { day_label: string }[] };
type ProgramRow = Program & { program_items: { count: number }[] };
type RawVisitRow = Visit & { measurements: Measurement[] };

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { userId, profile } = await requireProfile();

  if (profile.role !== "coach") redirect("/portal/inicio");

  const supabase = await createClient();

  const [
    { data: client },
    { data: meta },
    { data: routineRows },
    { data: programRows },
    { data: rawVisitRows },
    { data: measurementRows },
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", id).single<Profile>(),
    supabase
      .from("clients_meta")
      .select("*")
      .eq("client_id", id)
      .maybeSingle<ClientsMeta>(),
    supabase
      .from("routines")
      .select("*, routine_items(day_label)")
      .eq("client_id", id)
      .order("assigned_at", { ascending: false }),
    supabase
      .from("programs")
      .select("*, program_items(count)")
      .eq("coach_id", userId)
      .order("name", { ascending: true }),
    supabase
      .from("visits")
      .select("*, measurements(*)")
      .eq("client_id", id)
      .eq("coach_id", userId)
      .order("visit_date", { ascending: false }),
    supabase
      .from("measurements")
      .select("*")
      .eq("client_id", id)
      .order("measured_at", { ascending: false }),
  ]);

  if (!client) notFound();

  const routines: RoutineListEntry[] = ((routineRows ?? []) as RoutineRow[]).map(
    ({ routine_items, ...routine }) => ({
      ...routine,
      day_count: new Set((routine_items ?? []).map((i) => i.day_label)).size,
    }),
  );

  const programs: ProgramListEntry[] = ((programRows ?? []) as ProgramRow[]).map(
    ({ program_items, ...program }) => ({
      ...program,
      item_count: program_items[0]?.count ?? 0,
    }),
  );

  const visits: VisitWithMeasurement[] = ((rawVisitRows ?? []) as RawVisitRow[]).map(
    ({ measurements, ...v }) => ({
      ...v,
      measurement: measurements?.[0] ?? null,
    }),
  );

  return (
    <ClientDetail
      client={client}
      meta={meta ?? null}
      routines={routines}
      programs={programs}
      visits={visits}
      measurements={(measurementRows ?? []) as Measurement[]}
    />
  );
}
