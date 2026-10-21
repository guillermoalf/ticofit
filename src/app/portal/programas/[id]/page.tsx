import { notFound, redirect } from "next/navigation";
import { requireProfile } from "@/lib/portal";
import { createClient } from "@/lib/supabase/server";
import { fetchCoachLibrary } from "@/lib/exercises";
import type { Program, ProgramItemWithExercise } from "@/types/db";
import { ProgramBuilder } from "./program-builder";

export const dynamic = "force-dynamic";

export default async function ProgramDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { userId, profile } = await requireProfile();

  if (profile.role !== "coach") redirect("/portal/inicio");

  const supabase = await createClient();

  // RLS scopes programs to the coach's own rows, so a foreign id returns null.
  const [{ data: program }, { data: items }, exercises] =
    await Promise.all([
      supabase.from("programs").select("*").eq("id", id).single<Program>(),
      supabase
        .from("program_items")
        .select("*, exercise:exercises(*)")
        .eq("program_id", id)
        .order("day_label", { ascending: true })
        .order("order_index", { ascending: true }),
      fetchCoachLibrary(supabase, userId),
    ]);

  if (!program) notFound();

  return (
    <ProgramBuilder
      program={program}
      items={(items ?? []) as ProgramItemWithExercise[]}
      exercises={exercises}
    />
  );
}
