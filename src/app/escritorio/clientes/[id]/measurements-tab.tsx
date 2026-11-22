import Link from "next/link";

import { MeasurementSheet } from "@/components/clients/measurement-sheet";
import { ProgressView } from "@/components/clients/progress-view";
import { RecordForm, type FormValues } from "@/components/desk/record-form";
import { addDays, formatDate, todayCR } from "@/lib/clients/body";
import { MEASUREMENT_GROUPS, type FieldGroup } from "@/lib/clients/fields";
import type { Client, Measurement } from "@/lib/clients/types";
import { can, type StaffContext } from "@/lib/staff/permissions";
import { createClient } from "@/lib/supabase/server";
import { createMeasurementAction, updateMeasurementAction } from "../actions";

export async function MeasurementsTab({
  client,
  staff,
  creating,
  editing,
  selected,
}: {
  client: Client;
  staff: StaffContext;
  creating: boolean;
  editing?: string;
  selected?: string;
}) {
  const supabase = await createClient();
  const [{ data, error }, { data: setting }] = await Promise.all([
    supabase.from("client_measurements").select("*").eq("client_id", client.id).order("measured_on"),
    supabase.from("app_settings").select("value").eq("key", "measurements.interval_days").maybeSingle(),
  ]);
  if (error) {
    return (
      <p role="alert" className="font-semibold text-[var(--danger)]">
        No se pudieron cargar las mediciones. Recargá la página.
      </p>
    );
  }

  const list = data as Measurement[]; // oldest first
  const latest = list.at(-1);
  const base = `/escritorio/clientes/${client.id}?tab=mediciones`;
  const canWrite = can(staff, "measurements.write");
  const canOverride = can(staff, "measurements.override");
  const today = todayCR();
  const next = latest ? addDays(latest.measured_on, Number(setting?.value ?? 30)) : null;
  const tooSoon = next !== null && today < next;

  const back = (
    <Link href={base} className="mb-4 inline-block text-sm text-muted hover:text-ink">
      ← Volver a las mediciones
    </Link>
  );

  const edited = canWrite && editing ? list.find((m) => m.id === editing) : undefined;
  if (edited) {
    return (
      <>
        {back}
        <p className="mb-4 text-[15px] text-muted">
          Corrigiendo la medición del {formatDate(edited.measured_on)}. La fecha y el coach no cambian.
        </p>
        <RecordForm
          key={edited.id}
          groups={MEASUREMENT_GROUPS}
          values={edited as unknown as FormValues}
          action={updateMeasurementAction.bind(null, client.id, edited.id)}
          submitLabel="Guardar corrección"
        />
      </>
    );
  }

  if (creating && canWrite) {
    const session: FieldGroup = {
      title: "Sesión",
      fields: [
        { name: "measured_on", label: "Fecha de medición", type: "date", required: true },
        ...(latest && canOverride
          ? [{ name: "override_reason", label: "Motivo, si va antes del plazo", type: "text" as const, maxLength: 500 }]
          : []),
      ],
    };
    return (
      <>
        {back}
        <p className="mb-4 text-[15px] text-muted">
          Coach: {staff.full_name}.{tooSoon && ` La próxima medición toca el ${formatDate(next)}.`}
        </p>
        <RecordForm
          key={`nueva-${latest?.id ?? "primera"}`}
          groups={[session, ...MEASUREMENT_GROUPS]}
          values={{
            measured_on: today,
            // Height and targets rarely change between sessions.
            height_cm: latest?.height_cm,
            target_weight_kg: latest?.target_weight_kg,
            target_fat_pct: latest?.target_fat_pct,
            target_muscle_pct: latest?.target_muscle_pct,
          }}
          action={createMeasurementAction.bind(null, client.id)}
          submitLabel="Guardar medición"
        />
      </>
    );
  }

  const shown = list.find((m) => m.id === selected) ?? latest;
  const previous = shown ? (list[list.indexOf(shown) - 1] ?? null) : null;

  return (
    <div className="max-w-5xl space-y-8">
      {canWrite && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {(!tooSoon || canOverride) && (
            <Link href={`${base}&nueva=1`} className="rounded-full bg-verde-profundo px-5 py-2.5 text-sm font-semibold text-crema-claro">
              {latest ? "Nueva medición" : "Registrar la primera medición"}
            </Link>
          )}
          {tooSoon && <p className="text-sm text-muted">La próxima medición toca el {formatDate(next)}.</p>}
        </div>
      )}

      {shown && (
        <section>
          <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[15px]">
            {[...list].reverse().map((m) => (
              <Link
                key={m.id}
                href={`${base}&m=${m.id}`}
                aria-current={m === shown ? "true" : undefined}
                className={m === shown ? "font-semibold underline underline-offset-4" : "text-muted hover:text-ink"}
              >
                {formatDate(m.measured_on)}
              </Link>
            ))}
            {canWrite && (
              <Link href={`${base}&editar=${shown.id}`} className="ml-auto text-sm font-semibold underline underline-offset-4">
                Corregir esta medición
              </Link>
            )}
          </div>
          <MeasurementSheet measurement={shown} previous={previous} gender={client.gender} birthDate={client.birth_date} />
          {shown.override_reason && (
            <p className="mt-2 text-sm text-muted">Se registró antes del plazo: {shown.override_reason}</p>
          )}
        </section>
      )}

      <section>
        <h2 className="mb-3 text-lg font-semibold">Progreso</h2>
        <ProgressView measurements={list} />
      </section>
    </div>
  );
}
