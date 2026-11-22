import { redirect } from "next/navigation";

import { MeasurementSheet } from "@/components/clients/measurement-sheet";
import { ProgressView } from "@/components/clients/progress-view";
import type { Client, Measurement } from "@/lib/clients/types";
import { requireProfile } from "@/lib/portal";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** The client's own measurements, as soon as the coach saves them. */
export default async function ProgresoPage() {
  const { profile, userId } = await requireProfile();
  if (profile.role !== "client") redirect("/portal");

  const supabase = await createClient();
  const { data: file, error: fileError } = await supabase
    .from("clients")
    .select("id, gender, birth_date")
    .eq("user_id", userId)
    .maybeSingle<Pick<Client, "id" | "gender" | "birth_date">>();
  const { data, error } = file
    ? await supabase.from("client_measurements").select("*").eq("client_id", file.id).order("measured_on")
    : { data: [], error: null };

  const list = (data ?? []) as Measurement[];
  const latest = list.at(-1);

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
      <h1 className="mb-6 font-tf-serif text-[40px] leading-tight">Mi progreso</h1>
      {fileError || error ? (
        <p role="alert" className="font-semibold text-[var(--danger)]">
          No pudimos cargar tu progreso. Recargá la página.
        </p>
      ) : (
        <ProgressView measurements={list} />
      )}
      {latest && (
        <section className="mt-10">
          <h2 className="mb-3 text-lg font-semibold">Tu última medición</h2>
          <MeasurementSheet
            measurement={latest}
            previous={list.at(-2) ?? null}
            gender={file?.gender ?? null}
            birthDate={file?.birth_date ?? null}
          />
        </section>
      )}
    </main>
  );
}
