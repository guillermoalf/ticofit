import Link from "next/link";
import { notFound } from "next/navigation";

import { DeskPageHeader } from "@/components/desk/page-header";
import { AutoRefresh } from "@/components/schedule/auto-refresh";
import { DayCalendar } from "@/components/schedule/day-calendar";
import { DayNav } from "@/components/schedule/day-nav";
import { todayCR } from "@/lib/clients/body";
import { pickDay, type Salon, type Slot } from "@/lib/schedule";
import { requireStaff } from "@/lib/staff/context";
import { can } from "@/lib/staff/permissions";
import { createClient } from "@/lib/supabase/server";
import { NewClassPanel } from "../class-form";
import { scheduleOptions } from "../staff-data";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

/** One salón's classes for a day. */
export default async function SalonDayPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ dia?: string }>;
}) {
  const staff = await requireStaff();
  const [{ id }, query] = await Promise.all([params, searchParams]);
  if (!UUID_RE.test(id)) notFound();
  const supabase = await createClient();
  const { data } = await supabase.from("salones").select("id, sede_id, name, capacity, sort_order, active").eq("id", id).maybeSingle();
  const salon = data as Salon | null;
  if (!salon || !staff.sede_ids.includes(salon.sede_id)) notFound();

  const day = pickDay(query.dia);
  const { data: slots } = await supabase.rpc("class_slots", { p_sede_id: salon.sede_id, p_day: day, p_salon_id: salon.id });
  const canSchedule = can(staff, "schedule.write");
  const options = canSchedule && day >= todayCR() ? await scheduleOptions(supabase, salon.sede_id) : null;

  return (
    <>
      {day === todayCR() && <AutoRefresh seconds={30} />}
      <p className="mb-2 text-sm">
        <Link href="/escritorio/salones" className="font-semibold underline underline-offset-2">
          ← Salones
        </Link>
      </p>
      <DeskPageHeader title={salon.name} description={`Capacidad: ${salon.capacity} personas.${salon.active ? "" : " Está desactivado."}`} />
      <DayNav basePath={`/escritorio/salones/${salon.id}`} day={day} />
      {options && (
        <NewClassPanel
          initial={{
            sede_id: salon.sede_id,
            discipline_id: "",
            salon_id: salon.id,
            coach_staff_id: "",
            date: day,
            start: "",
            end: "",
            capacity: "",
          }}
          disciplines={options.disciplines}
          salones={options.salones}
          coaches={options.coaches}
        />
      )}
      <DayCalendar
        slots={(slots ?? []) as Slot[]}
        empty="No hay clases este día en este salón."
        href={(s) => `/escritorio/salones/clase/${s.class_id}`}
      />
    </>
  );
}
