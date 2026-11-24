import Link from "next/link";
import { notFound } from "next/navigation";

import { DeskPageHeader } from "@/components/desk/page-header";
import { EXERCISE_COLUMNS, type Exercise } from "@/lib/routines/library";
import { requireStaff } from "@/lib/staff/context";
import { createClient } from "@/lib/supabase/server";
import { ExerciseForm } from "../exercise-form";

const UUID_RE = /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

/** Only the gym's own exercises are edited; the base library stays as shipped. */
export default async function EditarEjercicioPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff("exercises.write");
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();
  const supabase = await createClient();
  const { data } = await supabase.from("exercises").select(EXERCISE_COLUMNS).eq("id", id).eq("source", "staff").maybeSingle();
  if (!data) notFound();
  const exercise = data as unknown as Exercise;
  return (
    <>
      <Link href="/escritorio/ejercicios" className="mb-3 inline-block text-sm text-muted hover:text-ink">
        ← Biblioteca
      </Link>
      <DeskPageHeader title={exercise.name} />
      <ExerciseForm exercise={exercise} />
    </>
  );
}
