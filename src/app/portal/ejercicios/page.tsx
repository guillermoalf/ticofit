import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/portal";
import { createClient } from "@/lib/supabase/server";
import { fetchCoachLibrary } from "@/lib/exercises";
import { ExerciseClient } from "./exercise-client";

export const dynamic = "force-dynamic";

export default async function EjerciciosPage() {
  const { userId, profile } = await requireProfile();

  if (profile.role !== "coach") redirect("/portal/inicio");

  const supabase = await createClient();
  const exercises = await fetchCoachLibrary(supabase, userId);

  return <ExerciseClient exercises={exercises} />;
}
