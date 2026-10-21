import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/portal";
import { createClient } from "@/lib/supabase/server";
import type { Program, ProgramListEntry } from "@/types/db";
import { ProgramsClient } from "./programs-client";

export const dynamic = "force-dynamic";

type ProgramRow = Program & { program_items: { count: number }[] };

export default async function ProgramasPage() {
  const { userId, profile } = await requireProfile();

  if (profile.role !== "coach") redirect("/portal/inicio");

  const supabase = await createClient();
  const { data } = await supabase
    .from("programs")
    .select("*, program_items(count)")
    .eq("coach_id", userId)
    .order("created_at", { ascending: false });

  const programs: ProgramListEntry[] = ((data ?? []) as ProgramRow[]).map(
    ({ program_items, ...program }) => ({
      ...program,
      item_count: program_items[0]?.count ?? 0,
    }),
  );

  return <ProgramsClient programs={programs} />;
}
