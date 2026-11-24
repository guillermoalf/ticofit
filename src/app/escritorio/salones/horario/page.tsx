import Link from "next/link";

import { DeskPageHeader } from "@/components/desk/page-header";
import { formatDate, todayCR } from "@/lib/clients/body";
import { clockLabel, weekdaysLabel, type ClassTemplate } from "@/lib/schedule";
import { activeSedeIds, requireStaff } from "@/lib/staff/context";
import { createClient } from "@/lib/supabase/server";
import { scheduleOptions } from "../staff-data";
import { EndTemplateButton, TemplateForm } from "./template-form";

export const dynamic = "force-dynamic";

const PILL = "rounded-full bg-verde-profundo px-5 py-2.5 text-sm font-semibold text-crema-claro";

/** The weekly schedule: the classes that repeat, from which the calendar fills itself. */
export default async function WeeklySchedulePage({ searchParams }: { searchParams: Promise<{ sede?: string; editar?: string; nueva?: string }> }) {
  const staff = await requireStaff("schedule.write");
  const query = await searchParams;
  const sedeIds = await activeSedeIds(staff);
  const supabase = await createClient();
  const today = todayCR();

  const [{ data: sedes }, { data: tpls }, { data: links }] = await Promise.all([
    supabase.from("sedes").select("id, name").in("id", sedeIds).order("sort_order"),
    supabase
      .from("class_templates")
      .select("id, sede_id, discipline_id, salon_id, coach_staff_id, weekdays, start_time, duration_min, repeat_until, capacity, valid_from, valid_until, active")
      .in("sede_id", sedeIds)
      .eq("active", true)
      .order("start_time"),
    supabase.from("discipline_salons").select("discipline_id, sede_id, salon_id").in("sede_id", sedeIds),
  ]);
  const templates = ((tpls ?? []) as ClassTemplate[]).filter((t) => !t.valid_until || t.valid_until >= today);
  const sedeList = (sedes ?? []) as { id: string; name: string }[];
  const optionsBySede = new Map(await Promise.all(sedeList.map(async (s) => [s.id, await scheduleOptions(supabase, s.id)] as const)));
  const editing = query.editar ? templates.find((t) => t.id === query.editar) : undefined;
  const newSede = query.nueva && sedeIds.includes(query.nueva) ? query.nueva : null;

  return (
    <>
      <p className="mb-2 text-sm">
        <Link href="/escritorio/salones" className="font-semibold underline underline-offset-2">
          ← Salones
        </Link>
      </p>
      <DeskPageHeader
        title="Horario semanal"
        description="Las clases que se repiten cada semana. El calendario se llena solo con estas; un cambio acá rehace las fechas futuras que no tienen reservas."
      />
      {sedeList.map((sede) => {
        const opts = optionsBySede.get(sede.id)!;
        const name = (list: { id: string; name?: string; full_name?: string }[], id: string | null) =>
          list.find((x) => x.id === id)?.name ?? list.find((x) => x.id === id)?.full_name ?? "";
        const defaults = Object.fromEntries(
          ((links ?? []) as { discipline_id: string; sede_id: string; salon_id: string }[])
            .filter((l) => l.sede_id === sede.id)
            .map((l) => [l.discipline_id, l.salon_id]),
        );
        const mine = templates.filter((t) => t.sede_id === sede.id);
        const formFor = (t: ClassTemplate | null) => (
          <div className="mb-6 rounded-2xl border border-border bg-surface p-4">
            <h3 className="mb-3 font-semibold">{t ? "Cambiar clase semanal" : "Nueva clase semanal"}</h3>
            <TemplateForm
              templateId={t?.id ?? null}
              initial={{
                sede_id: sede.id,
                discipline_id: t?.discipline_id ?? "",
                salon_id: t?.salon_id ?? "",
                coach_staff_id: t?.coach_staff_id ?? "",
                weekdays: t?.weekdays ?? [1, 2, 3, 4, 5],
                start_time: t?.start_time.slice(0, 5) ?? "",
                duration_min: String(t?.duration_min ?? 60),
                repeat_until: t?.repeat_until?.slice(0, 5) ?? "",
                capacity: t?.capacity ? String(t.capacity) : "",
                valid_from: t?.valid_from ?? today,
                valid_until: t?.valid_until ?? "",
              }}
              disciplines={opts.disciplines}
              salones={opts.salones}
              coaches={opts.coaches}
              defaultSalon={defaults}
              doneHref="/escritorio/salones/horario"
            />
          </div>
        );
        return (
          <section key={sede.id} className="mb-12">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">{sede.name}</h2>
              {newSede !== sede.id && !editing && (
                <Link href={`/escritorio/salones/horario?nueva=${sede.id}`} className={PILL}>
                  + Clase semanal
                </Link>
              )}
            </div>
            {newSede === sede.id && formFor(null)}
            {editing?.sede_id === sede.id && formFor(editing)}
            {mine.length ? (
              <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
                {mine.map((t) => {
                  const label = name(opts.disciplines, t.discipline_id) || "Clase";
                  return (
                    <li key={t.id} className="flex flex-wrap items-center gap-x-6 gap-y-1 px-5 py-4">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold">
                          {label} · {clockLabel(t.start_time)}
                          {t.repeat_until && ` y cada hora hasta ${clockLabel(t.repeat_until)}`}
                        </p>
                        <p className="text-sm text-muted">
                          {[
                            weekdaysLabel(t.weekdays),
                            `${t.duration_min} min`,
                            name(opts.salones, t.salon_id) || "salón desactivado",
                            name(opts.coaches, t.coach_staff_id),
                            t.capacity ? `cupo ${t.capacity}` : null,
                            t.valid_from > today ? `desde el ${formatDate(t.valid_from)}` : null,
                            t.valid_until ? `hasta el ${formatDate(t.valid_until)}` : null,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      </div>
                      <Link href={`/escritorio/salones/horario?editar=${t.id}`} className="text-sm font-semibold underline underline-offset-2">
                        Cambiar
                      </Link>
                      <EndTemplateButton id={t.id} label={label} />
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="rounded-2xl border border-dashed border-border-strong bg-surface px-5 py-10 text-center text-muted">
                Todavía no hay clases semanales en esta sede.
              </p>
            )}
          </section>
        );
      })}
    </>
  );
}
