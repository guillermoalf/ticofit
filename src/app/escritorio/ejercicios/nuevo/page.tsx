import Link from "next/link";

import { DeskPageHeader } from "@/components/desk/page-header";
import { requireStaff } from "@/lib/staff/context";
import { ExerciseForm } from "../exercise-form";

export default async function NuevoEjercicioPage() {
  await requireStaff("exercises.write");
  return (
    <>
      <Link href="/escritorio/ejercicios" className="mb-3 inline-block text-sm text-muted hover:text-ink">
        ← Biblioteca
      </Link>
      <DeskPageHeader title="Agregar ejercicio" />
      <ExerciseForm />
    </>
  );
}
