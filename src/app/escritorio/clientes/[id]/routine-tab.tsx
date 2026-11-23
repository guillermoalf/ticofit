import Link from "next/link";

import { RoutineView, ValidityNote } from "@/components/routines/routine-view";
import { formatMoment, todayCR } from "@/lib/clients/body";
import type { Client } from "@/lib/clients/types";
import { ROUTINE_SELECT, normalizeRoutine, type Routine } from "@/lib/routines/library";
import { routineExercises } from "@/lib/routines/server";
import { can, type StaffContext } from "@/lib/staff/permissions";
import { createClient } from "@/lib/supabase/server";

const pill = "rounded-full border border-border-strong px-4 py-2 text-sm font-semibold hover:bg-surface-hover";

export async function RoutineTab({ client, staff }: { client: Client; staff: StaffContext }) {
  const supabase = await createClient();
  const [{ data, error }, { data: templates }, { data: people }] = await Promise.all([
    supabase.from("client_routines").select(ROUTINE_SELECT).eq("client_id", client.id).order("assigned_at", { ascending: false }).limit(20),
    supabase.from("client_routines").select("id, name").is("client_id", null).eq("sede_id", client.sede_id).order("name"),
    supabase.from("staff").select("id, full_name"),
  ]);
  if (error) {
    return (
      <p role="alert" className="font-semibold text-[var(--danger)]">
        No se pudo cargar la rutina. Recargá la página.
      </p>
    );
  }
  const routines = ((data ?? []) as never[]).map(normalizeRoutine) as Routine[];
  const [current, ...past] = routines;
  const names = Object.fromEntries((people ?? []).map((p) => [p.id as string, p.full_name as string]));
  const canWrite = can(staff, "routines.write");
  const base = `/escritorio/clientes/${client.id}/rutina`;

  const startNew = canWrite && (
    <form action={`${base}/nueva`} method="get" className="flex flex-wrap items-center gap-2">
      <label className="sr-only" htmlFor="desde">
        Empezar desde
      </label>
      <select id="desde" name="desde" defaultValue="" className="rounded-xl border border-border-strong bg-surface px-3 py-2.5 text-[16px] text-ink">
        <option value="">En blanco</option>
        {current && <option value={current.id}>Copiar la actual: {current.name}</option>}
        {(templates ?? []).map((t) => (
          <option key={t.id} value={t.id}>
            Plantilla: {t.name}
          </option>
        ))}
      </select>
      <button type="submit" className="cursor-pointer rounded-full bg-verde-profundo px-5 py-2.5 text-sm font-semibold text-crema-claro">
        Nueva rutina
      </button>
    </form>
  );

  if (!current) {
    return (
      <div className="max-w-4xl space-y-4">
        <p className="rounded-2xl border border-dashed border-border-strong bg-surface px-5 py-10 text-center text-muted">
          Todavía no tiene rutina asignada.
        </p>
        {startNew}
      </div>
    );
  }

  const exercises = await routineExercises(supabase, current);
  return (
    <div className="max-w-4xl space-y-8">
      <section className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold">{current.name}</h2>
            <p className="text-sm text-muted">
              Asignada {current.assigned_at && formatMoment(current.assigned_at)}
              {current.assigned_by_staff && names[current.assigned_by_staff] && ` por ${names[current.assigned_by_staff]}`}
              {` · ${current.days.length} días`}
            </p>
            <ValidityNote routine={current} today={todayCR()} audience="staff" />
          </div>
          <div className="flex flex-wrap gap-2">
            {canWrite && (
              <Link href={`${base}/${current.id}`} className={pill}>
                Editar
              </Link>
            )}
            <Link href={`/imprimir/rutina/${current.id}`} className={pill}>
              Imprimir o PDF
            </Link>
          </div>
        </div>
        <RoutineView routine={current} exercises={exercises} />
      </section>

      {startNew && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">Asignar otra rutina</h2>
          <p className="mb-3 text-[15px] text-muted">La nueva reemplaza a la actual en el portal del cliente. La actual queda en el historial.</p>
          {startNew}
        </section>
      )}

      {!!past.length && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">Rutinas anteriores</h2>
          <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
            {past.map((r) => (
              <li key={r.id} className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 px-5 py-3">
                <span className="font-semibold">{r.name}</span>
                <span className="flex flex-wrap gap-x-4 text-sm text-muted">
                  {r.assigned_at && formatMoment(r.assigned_at)}
                  {r.assigned_by_staff && names[r.assigned_by_staff] && ` · ${names[r.assigned_by_staff]}`}
                  {canWrite && (
                    <Link href={`${base}/nueva?desde=${r.id}`} className="font-semibold text-ink underline underline-offset-2">
                      Usar como base
                    </Link>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
