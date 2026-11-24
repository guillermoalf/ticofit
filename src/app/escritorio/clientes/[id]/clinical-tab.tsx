import { RecordView } from "@/components/clients/record-view";
import { OwnerDelete } from "@/components/desk/owner-delete";
import { RecordForm, type FormValues } from "@/components/desk/record-form";
import { formatMoment } from "@/lib/clients/body";
import { CLINICAL_GROUPS } from "@/lib/clients/fields";
import type { Client, ClinicalVersion } from "@/lib/clients/types";
import { can, type StaffContext } from "@/lib/staff/permissions";
import { createClient } from "@/lib/supabase/server";
import { saveClinicalAction } from "../actions";

export async function ClinicalTab({ client, staff }: { client: Client; staff: StaffContext }) {
  const supabase = await createClient();
  const [{ data, error }, { data: people }] = await Promise.all([
    supabase.from("client_clinical_history").select("*").eq("client_id", client.id).order("created_at", { ascending: false }),
    supabase.from("staff").select("id, full_name"),
  ]);
  // Never offer an empty form over history that failed to load.
  if (error) {
    return (
      <p role="alert" className="font-semibold text-[var(--danger)]">
        No se pudo cargar la historia clínica. Recargá la página.
      </p>
    );
  }

  const versions = data as ClinicalVersion[];
  const current = versions[0];
  const byline = (v: ClinicalVersion) => {
    const author = people?.find((p) => p.id === v.created_by_staff)?.full_name;
    return `${formatMoment(v.created_at)}${author ? ` · ${author}` : ""}`;
  };

  const canDelete = can(staff, "data.delete");
  return (
    <div className="max-w-5xl">
      <p className="mb-4 text-sm text-muted">
        Datos de salud, de uso restringido. {current ? `Última versión: ${byline(current)}.` : "Todavía sin llenar."}
        {current && canDelete && (
          <>
            {" "}
            <OwnerDelete
              key={current.id}
              kind="clinical"
              id={current.id}
              label="Borrar esta versión"
              question={versions.length > 1 ? "¿Borrar esta versión? Queda la anterior." : "¿Borrar la historia clínica?"}
              done="Versión borrada."
            />
          </>
        )}
      </p>
      {can(staff, "clinical.write") ? (
        <RecordForm
          key={current?.id ?? "nueva"}
          groups={CLINICAL_GROUPS}
          values={current as unknown as FormValues | undefined}
          action={saveClinicalAction.bind(null, client.id)}
          submitLabel="Guardar historia clínica"
        />
      ) : (
        <RecordView groups={CLINICAL_GROUPS} record={current ?? {}} />
      )}
      {versions.length > 1 && (
        <section className="mt-10">
          <h2 className="mb-3 text-lg font-semibold">Versiones anteriores</h2>
          {versions.slice(1).map((v) => (
            <details key={v.id} className="border-b border-border py-2">
              <summary className="cursor-pointer py-1 text-[15px]">{byline(v)}</summary>
              <div className="py-3">
                <RecordView groups={CLINICAL_GROUPS} record={v} />
                {canDelete && (
                  <OwnerDelete kind="clinical" id={v.id} label="Borrar esta versión" question="¿Borrar esta versión anterior?" done="Versión borrada." />
                )}
              </div>
            </details>
          ))}
        </section>
      )}
    </div>
  );
}
