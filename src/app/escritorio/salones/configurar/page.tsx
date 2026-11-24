import Link from "next/link";

import { OwnerDelete } from "@/components/desk/owner-delete";
import { DeskPageHeader } from "@/components/desk/page-header";
import type { Discipline, Salon } from "@/lib/schedule";
import { activeSedeIds, requireStaff } from "@/lib/staff/context";
import { createClient } from "@/lib/supabase/server";
import { DefaultSalon, DisciplineRow, SalonRow } from "./rows";

export const dynamic = "force-dynamic";

/** Salones per sede and the shared list of disciplines. */
export default async function ConfigurePage() {
  const staff = await requireStaff("salons.manage");
  const sedeIds = await activeSedeIds(staff);
  const supabase = await createClient();
  const [{ data: sedes }, { data: salones }, { data: disciplines }, { data: links }] = await Promise.all([
    supabase.from("sedes").select("id, name").in("id", sedeIds).order("sort_order"),
    supabase.from("salones").select("id, sede_id, name, capacity, sort_order, active").in("sede_id", sedeIds).order("sort_order").order("name"),
    supabase.from("disciplines").select("id, slug, name, default_capacity, default_minutes, sort_order, active").order("sort_order").order("name"),
    supabase.from("discipline_salons").select("discipline_id, sede_id, salon_id").in("sede_id", sedeIds),
  ]);
  const sedeList = (sedes ?? []) as { id: string; name: string }[];
  const rooms = (salones ?? []) as Salon[];
  const defaults = (links ?? []) as { discipline_id: string; sede_id: string; salon_id: string }[];

  return (
    <>
      <p className="mb-2 text-sm">
        <Link href="/escritorio/salones" className="font-semibold underline underline-offset-2">
          ← Salones
        </Link>
      </p>
      <DeskPageHeader
        title="Salones y disciplinas"
        description="Cambiá nombres, agregá o borrá salones y disciplinas. La capacidad del salón es el tope de cualquier clase que se dé ahí; el cupo de la disciplina es el que lleva cada clase si no se pone otro."
      />
      {sedeList.map((sede) => (
        <section key={sede.id} className="mb-10">
          <h2 className="mb-3 text-lg font-semibold">Salones de {sede.name}</h2>
          <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
            {rooms
              .filter((r) => r.sede_id === sede.id)
              .map((r) => (
                <div key={r.id}>
                  <SalonRow salon={r} sedeId={sede.id} />
                  <div className="-mt-1 px-5 pb-4">
                    <OwnerDelete
                      kind="salon"
                      id={r.id}
                      label="Borrar salón"
                      question={`¿Borrar «${r.name}» con todas sus clases y su horario semanal?`}
                      done="Salón borrado."
                    />
                  </div>
                </div>
              ))}
            <SalonRow salon={null} sedeId={sede.id} />
          </div>
        </section>
      ))}

      <section>
        <h2 className="mb-3 text-lg font-semibold">Disciplinas</h2>
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
          {((disciplines ?? []) as Discipline[]).map((d) => (
            <li key={d.id} className="space-y-3 px-5 py-4">
              <DisciplineRow discipline={d} />
              <OwnerDelete
                kind="discipline"
                id={d.id}
                label="Borrar disciplina"
                question={`¿Borrar «${d.name}» con todas sus clases y su horario semanal en las dos sedes?`}
                done="Disciplina borrada."
              />
              <div className="grid gap-3 sm:grid-cols-2">
                {sedeList.map((sede) => (
                  <DefaultSalon
                    key={sede.id}
                    disciplineId={d.id}
                    sedeId={sede.id}
                    sedeName={sede.name}
                    salones={rooms.filter((r) => r.sede_id === sede.id && r.active)}
                    value={defaults.find((l) => l.discipline_id === d.id && l.sede_id === sede.id)?.salon_id ?? ""}
                  />
                ))}
              </div>
            </li>
          ))}
          <li className="px-5 py-4">
            <DisciplineRow discipline={null} />
          </li>
        </ul>
      </section>
    </>
  );
}
