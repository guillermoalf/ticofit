import Link from "next/link";
import { notFound } from "next/navigation";

import { OwnerDelete } from "@/components/desk/owner-delete";
import { DeskPageHeader } from "@/components/desk/page-header";
import { formatDate, todayCR } from "@/lib/clients/body";
import { crClock, crDate, crTime, spotsLeft, type Slot } from "@/lib/schedule";
import { requireStaff } from "@/lib/staff/context";
import { can } from "@/lib/staff/permissions";
import { createClient } from "@/lib/supabase/server";
import { ClassForm } from "../../class-form";
import { CancelClass, Roster, type RosterRow } from "../../roster";
import { scheduleOptions } from "../../staff-data";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

type ClassRow = {
  id: string;
  sede_id: string;
  discipline_id: string;
  salon_id: string;
  coach_staff_id: string | null;
  template_id: string | null;
  starts_at: string;
  ends_at: string;
  capacity: number;
  status: "scheduled" | "cancelled";
  cancel_reason: string | null;
};

type ResRow = {
  id: string;
  client_id: string;
  status: string;
  attended_at: string | null;
  booked_by_staff: string | null;
  client: { full_name: string } | null;
};

/** One class: its roster, check-in, booking for a client and, for schedulers, edit or cancel. */
export default async function ClassPage({ params }: { params: Promise<{ id: string }> }) {
  const staff = await requireStaff();
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();
  const supabase = await createClient();
  const { data } = await supabase
    .from("classes")
    .select("id, sede_id, discipline_id, salon_id, coach_staff_id, template_id, starts_at, ends_at, capacity, status, cancel_reason")
    .eq("id", id)
    .maybeSingle();
  const c = data as ClassRow | null;
  if (!c || !staff.sede_ids.includes(c.sede_id)) notFound();

  const day = crDate(c.starts_at);
  const today = todayCR();
  const now = Date.now();
  const over = Date.parse(c.ends_at) <= now;
  const future = Date.parse(c.starts_at) > now;
  const canRes = can(staff, "reservations.write");
  const canSchedule = can(staff, "schedule.write") && c.status === "scheduled" && future;

  const [{ data: slots }, { data: res }, { data: clients }, options] = await Promise.all([
    supabase.rpc("class_slots", { p_sede_id: c.sede_id, p_day: day, p_salon_id: c.salon_id }),
    supabase
      .from("class_reservations")
      .select("id, client_id, status, attended_at, booked_by_staff, client:clients(full_name)")
      .eq("class_id", c.id)
      .eq("status", "booked")
      .order("created_at"),
    canRes && c.status === "scheduled" && !over
      ? supabase.from("clients").select("id, full_name").eq("sede_id", c.sede_id).order("full_name").limit(5000)
      : Promise.resolve({ data: [] }),
    canSchedule ? scheduleOptions(supabase, c.sede_id) : Promise.resolve(null),
  ]);
  const slot = ((slots ?? []) as Slot[]).find((s) => s.class_id === c.id);
  if (!slot) notFound();
  const rows: RosterRow[] = ((res ?? []) as unknown as ResRow[]).map((r) => ({
    id: r.id,
    client_id: r.client_id,
    full_name: r.client?.full_name ?? "Cliente",
    attended: !!r.attended_at,
    by_staff: !!r.booked_by_staff,
  }));
  const left = spotsLeft(slot);

  return (
    <>
      <p className="mb-2 text-sm">
        <Link href={`/escritorio/salones/${c.salon_id}?dia=${day}`} className="font-semibold underline underline-offset-2">
          ← {slot.salon_name}, {formatDate(day)}
        </Link>
      </p>
      <DeskPageHeader
        title={slot.discipline_name}
        description={`${formatDate(day)} · ${crTime(c.starts_at)} a ${crTime(c.ends_at)} · ${slot.salon_name}${slot.coach_name ? ` · ${slot.coach_name}` : ""}${c.template_id ? " · del horario semanal" : ""}`}
      />
      {c.status === "cancelled" ? (
        <p className="mb-6 rounded-2xl border border-border-strong bg-surface px-5 py-4">
          <span className="font-semibold">Clase cancelada.</span> {c.cancel_reason}
        </p>
      ) : (
        <p className="mb-6 text-[17px]">
          <span className="font-semibold tabular-nums">
            {slot.booked} / {slot.capacity}
          </span>{" "}
          reservas · {left === 0 ? "llena" : `${left} ${left === 1 ? "espacio libre" : "espacios libres"}`}
          {over && " · ya terminó"}
        </p>
      )}

      {c.status === "scheduled" && (
        <section className="mb-10">
          <h2 className="mb-3 text-lg font-semibold">Reservas</h2>
          <Roster
            classId={c.id}
            rows={rows}
            clients={(clients ?? []) as { id: string; full_name: string }[]}
            canWrite={canRes && !over}
            canMark={day === today}
            canBook={left > 0}
          />
        </section>
      )}

      {canSchedule && options && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Cambiar esta clase</h2>
          <p className="text-sm text-muted">Cambia solo esta fecha. Para cambiar todas las semanas, usá el horario semanal.</p>
          <div className="rounded-2xl border border-border bg-surface p-4">
            <ClassForm
              classId={c.id}
              initial={{
                sede_id: c.sede_id,
                discipline_id: c.discipline_id,
                salon_id: c.salon_id,
                coach_staff_id: c.coach_staff_id ?? "",
                date: day,
                start: crClock(c.starts_at),
                end: crClock(c.ends_at),
                capacity: String(c.capacity),
              }}
              disciplines={options.disciplines}
              salones={options.salones}
              coaches={options.coaches}
            />
          </div>
          <CancelClass classId={c.id} booked={slot.booked} />
        </section>
      )}

      {/* Weekly-schedule dates come back from the template; those are cancelled or the template ended instead. */}
      {can(staff, "data.delete") && !c.template_id && (
        <section className="mt-10 border-t border-border pt-6">
          <OwnerDelete
            kind="class"
            id={c.id}
            label="Borrar esta clase"
            question={slot.booked > 0 ? `¿Borrar la clase y sus ${slot.booked} ${slot.booked === 1 ? "reserva" : "reservas"}?` : "¿Borrar esta clase?"}
            done="Clase borrada."
            redirectTo={`/escritorio/salones/${c.salon_id}?dia=${day}`}
          />
        </section>
      )}
    </>
  );
}
