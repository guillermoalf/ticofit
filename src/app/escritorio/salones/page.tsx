import Link from "next/link";

import { DeskPageHeader } from "@/components/desk/page-header";
import { AutoRefresh } from "@/components/schedule/auto-refresh";
import { todayCR } from "@/lib/clients/body";
import type { Salon, Slot } from "@/lib/schedule";
import { activeSedeIds, requireStaff } from "@/lib/staff/context";
import { can } from "@/lib/staff/permissions";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Sede = { id: string; name: string; building_capacity: number; status: string };
type Occupancy = { salon_id: string; booked: number; attended: number };

const PILL = "rounded-full border border-border-strong px-5 py-2.5 text-sm font-semibold hover:bg-surface-hover";

/** Salones of the sede on screen, with who is in each one right now. */
export default async function SalonesPage() {
  const staff = await requireStaff();
  const sedeIds = await activeSedeIds(staff);
  const supabase = await createClient();
  const today = todayCR();

  const [{ data: sedes }, { data: salones }] = await Promise.all([
    supabase.from("sedes").select("id, name, building_capacity, status").in("id", sedeIds).order("sort_order"),
    supabase.from("salones").select("id, sede_id, name, capacity, sort_order, active").in("sede_id", sedeIds).eq("active", true).order("sort_order").order("name"),
  ]);
  const perSede = await Promise.all(
    ((sedes ?? []) as Sede[]).map(async (sede) => {
      const [occ, slots] = await Promise.all([
        supabase.rpc("occupancy_now", { p_sede_id: sede.id }),
        supabase.rpc("class_slots", { p_sede_id: sede.id, p_day: today }),
      ]);
      return { sede, occupancy: (occ.data ?? []) as Occupancy[], slots: (slots.data ?? []) as Slot[] };
    }),
  );

  const actions = (
    <div className="flex flex-wrap gap-2">
      {can(staff, "schedule.write") && (
        <Link href="/escritorio/salones/horario" className={PILL}>
          Horario semanal
        </Link>
      )}
      {can(staff, "salons.manage") && (
        <Link href="/escritorio/salones/configurar" className={PILL}>
          Salones y disciplinas
        </Link>
      )}
    </div>
  );

  return (
    <>
      <AutoRefresh seconds={30} />
      <DeskPageHeader title="Salones y clases" description="Tocá un salón para ver sus clases del día. La ocupación se actualiza sola." action={actions} />
      {perSede.map(({ sede, occupancy, slots }) => {
        const rooms = ((salones ?? []) as Salon[]).filter((s) => s.sede_id === sede.id);
        const now = occupancy.reduce((n, o) => n + o.booked, 0);
        return (
          <section key={sede.id} className="mb-10">
            {perSede.length > 1 && <h2 className="mb-1 text-lg font-semibold">{sede.name}</h2>}
            <p className="mb-4 text-[15px] text-muted">
              Ahora: <span className="font-semibold text-ink tabular-nums">{now}</span> de {sede.building_capacity} personas en el edificio, según las reservas.
              {sede.status !== "open" && " Esta sede todavía no recibe reservas de clientes."}
            </p>
            {rooms.length ? (
              <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {rooms.map((r) => {
                  const o = occupancy.find((x) => x.salon_id === r.id);
                  const todays = slots.filter((s) => s.salon_id === r.id && s.status === "scheduled").length;
                  return (
                    <li key={r.id}>
                      <Link
                        href={`/escritorio/salones/${r.id}`}
                        className="block rounded-2xl border border-border bg-surface px-5 py-4 transition-colors hover:border-primary hover:bg-surface-hover"
                      >
                        <span className="flex items-baseline justify-between gap-3">
                          <span className="text-[17px] font-semibold">{r.name}</span>
                          <span aria-hidden="true">→</span>
                        </span>
                        <span className="mt-1 block text-sm text-muted">
                          Ahora {o?.booked ?? 0} / {r.capacity}
                          {o?.attended ? ` · ${o.attended} llegaron` : ""} · {todays} {todays === 1 ? "clase" : "clases"} hoy
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="rounded-2xl border border-dashed border-border-strong bg-surface px-5 py-10 text-center text-muted">
                Esta sede no tiene salones activos.
              </p>
            )}
          </section>
        );
      })}
    </>
  );
}
