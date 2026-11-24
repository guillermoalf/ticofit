import { DeskPageHeader } from "@/components/desk/page-header";
import { AutoRefresh } from "@/components/schedule/auto-refresh";
import { DayNav } from "@/components/schedule/day-nav";
import { addDays, todayCR } from "@/lib/clients/body";
import { crClock, crDate, crInstant, crTime, dayLabel, pickDay } from "@/lib/schedule";
import { hoursBetween, hoursLabel, type TimeEntry } from "@/lib/staff/clock";
import { activeSedeIds, requireStaff } from "@/lib/staff/context";
import { can } from "@/lib/staff/permissions";
import { createClient } from "@/lib/supabase/server";
import { EntryRow, NewEntry } from "./entry-form";

export const dynamic = "force-dynamic";

const SELECT = "id, staff_id, sede_id, clock_in, clock_out, source, note, updated_by_staff";

/**
 * Time clock. Marks are made on the lock screen with name + PIN. Here,
 * attendance.manage sees and corrects a day of marks for their sedes; everyone
 * else sees their own last two weeks.
 */
export default async function ClockPage({ searchParams }: { searchParams: Promise<{ dia?: string }> }) {
  const staff = await requireStaff();
  const supabase = await createClient();

  if (!can(staff, "attendance.manage")) {
    const from = addDays(todayCR(), -13);
    const { data } = await supabase
      .from("staff_time_entries")
      .select(SELECT)
      .eq("staff_id", staff.id)
      .gte("clock_in", crInstant(from, "00:00"))
      .order("clock_in", { ascending: false });
    const entries = (data ?? []) as TimeEntry[];
    const total = entries.reduce((s, e) => s + (e.clock_out ? hoursBetween(e.clock_in, e.clock_out) : 0), 0);
    return (
      <>
        <DeskPageHeader
          title="Reloj"
          description="Tus marcas de las últimas dos semanas. Para marcar entrada o salida, bloqueá la computadora y tocá «Marcar entrada o salida»."
        />
        <p className="mb-4 text-[15px]">
          Total con salida marcada: <strong>{hoursLabel(total)}</strong>
        </p>
        {entries.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border-strong bg-surface px-5 py-10 text-center text-muted">
            No tenés marcas en estas dos semanas.
          </p>
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
            {entries.map((e) => (
              <li key={e.id} className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 px-5 py-3">
                <span className="font-semibold first-letter:uppercase">{dayLabel(crDate(e.clock_in))}</span>
                <span className="tabular-nums">
                  {crTime(e.clock_in)} – {e.clock_out ? crTime(e.clock_out) : "sin salida"}
                  {e.clock_out && <span className="ml-3 text-muted">{hoursLabel(hoursBetween(e.clock_in, e.clock_out))}</span>}
                </span>
                {e.note && <span className="w-full text-sm text-muted">{e.note}</span>}
              </li>
            ))}
          </ul>
        )}
      </>
    );
  }

  const day = pickDay((await searchParams).dia);
  const sedeIds = await activeSedeIds(staff);
  const [{ data: rows }, { data: sedes }, { data: people }, { data: links }] = await Promise.all([
    supabase
      .from("staff_time_entries")
      .select(SELECT)
      .in("sede_id", sedeIds)
      .gte("clock_in", crInstant(day, "00:00"))
      .lt("clock_in", crInstant(addDays(day, 1), "00:00"))
      .order("clock_in"),
    supabase.from("sedes").select("id, name").in("id", sedeIds).order("sort_order"),
    supabase.from("staff").select("id, full_name, active").order("full_name"),
    supabase.from("staff_sedes").select("staff_id, sede_id").in("sede_id", sedeIds),
  ]);
  const entries = (rows ?? []) as TimeEntry[];
  const names = new Map(((people ?? []) as { id: string; full_name: string }[]).map((p) => [p.id, p.full_name]));
  const sedeList = (sedes ?? []) as { id: string; name: string }[];
  const sedeName = new Map(sedeList.map((s) => [s.id, s.name]));
  const staffBySede = new Map<string, { id: string; full_name: string }[]>();
  const activeIds = new Set(((people ?? []) as { id: string; active: boolean }[]).filter((p) => p.active).map((p) => p.id));
  for (const l of (links ?? []) as { staff_id: string; sede_id: string }[]) {
    if (!activeIds.has(l.staff_id)) continue;
    staffBySede.set(l.sede_id, [...(staffBySede.get(l.sede_id) ?? []), { id: l.staff_id, full_name: names.get(l.staff_id) ?? "" }]);
  }
  for (const list of staffBySede.values()) list.sort((a, b) => a.full_name.localeCompare(b.full_name, "es"));
  const isToday = day === todayCR();

  return (
    <>
      {isToday && <AutoRefresh seconds={60} />}
      <DeskPageHeader
        title="Reloj"
        description="Las marcas se hacen en la pantalla de bloqueo con el nombre y el PIN. Acá se revisan y se corrigen; cada corrección queda a nombre de quien la hizo."
      />
      <DayNav basePath="/escritorio/reloj" day={day} maxDay={todayCR()} />
      {sedeList.map((sede) => {
        const list = entries.filter((e) => e.sede_id === sede.id);
        return (
          <section key={sede.id} className="mb-10">
            <h2 className="mb-3 text-lg font-semibold">{sede.name}</h2>
            {list.length === 0 ? (
              <p className="mb-3 rounded-2xl border border-dashed border-border-strong bg-surface px-5 py-8 text-center text-muted">
                Nadie marcó este día.
              </p>
            ) : (
              <ul className="mb-3 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
                {list.map((e) => (
                  <EntryRow
                    key={e.id}
                    entry={{
                      id: e.id,
                      staff_id: e.staff_id,
                      sede_id: e.sede_id,
                      name: names.get(e.staff_id) ?? "—",
                      inLabel: crTime(e.clock_in),
                      outLabel: e.clock_out ? crTime(e.clock_out) : null,
                      hours: e.clock_out ? hoursLabel(hoursBetween(e.clock_in, e.clock_out)) : null,
                      date: crDate(e.clock_in),
                      clock_in: crClock(e.clock_in),
                      clock_out: e.clock_out ? crClock(e.clock_out) : "",
                      out_next_day: !!e.clock_out && crDate(e.clock_out) !== crDate(e.clock_in),
                      note: e.note ?? "",
                      manual: e.source === "manual",
                      corrected: e.updated_by_staff ? (names.get(e.updated_by_staff) ?? "alguien") : null,
                    }}
                  />
                ))}
              </ul>
            )}
            <NewEntry sedeId={sede.id} sedeName={sedeName.get(sede.id) ?? ""} day={day} people={staffBySede.get(sede.id) ?? []} />
          </section>
        );
      })}
    </>
  );
}
