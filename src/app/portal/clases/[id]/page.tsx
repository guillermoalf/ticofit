import Link from "next/link";
import { notFound } from "next/navigation";

import { CancelReservationButton } from "@/components/schedule/cancel-button";
import { DayCalendar } from "@/components/schedule/day-calendar";
import { DayNav } from "@/components/schedule/day-nav";
import { addDays, todayCR } from "@/lib/clients/body";
import { pickDay, spotsLeft, type Salon, type Slot } from "@/lib/schedule";
import { cancelOwnAction } from "../actions";
import { BookButton } from "../book-button";
import { clientBooking } from "../data";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

/** One salón's day, as the client books it. */
export default async function ClientSalonDay({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ dia?: string }>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  if (!UUID_RE.test(id)) notFound();
  const b = await clientBooking();
  if (!b.sede) notFound();
  const { data } = await b.supabase.from("salones").select("id, sede_id, name, capacity, sort_order, active").eq("id", id).maybeSingle();
  const salon = data as Salon | null;
  if (!salon || salon.sede_id !== b.sede.id || !salon.active) notFound();

  const today = todayCR();
  const maxDay = addDays(today, b.aheadDays);
  let day = pickDay(query.dia);
  if (day < today) day = today;
  if (day > maxDay) day = maxDay;
  const { data: slots } = await b.supabase.rpc("class_slots", { p_sede_id: salon.sede_id, p_day: day, p_salon_id: salon.id });
  const now = Date.now();
  const bookable = b.sede.status === "open" && b.canBook;

  return (
    <main className="mx-auto max-w-3xl px-5 py-10 sm:px-6 sm:py-12">
      <p className="mb-2 text-sm">
        <Link href="/portal/clases" className="font-semibold underline underline-offset-2">
          ← Clases
        </Link>
      </p>
      <h1 className="mb-6 font-tf-serif text-[40px] leading-tight">{salon.name}</h1>
      <DayNav basePath={`/portal/clases/${salon.id}`} day={day} maxDay={maxDay} />
      <DayCalendar
        slots={((slots ?? []) as Slot[]).filter((s) => s.status === "scheduled" || s.my_reservation_id)}
        empty="No hay clases este día en este salón."
        action={(s) => {
          if (s.status !== "scheduled") return null;
          const future = Date.parse(s.starts_at) > now;
          if (s.my_reservation_id) {
            return future ? (
              <CancelReservationButton action={cancelOwnAction.bind(null, s.my_reservation_id)} question={`¿Cancelar tu espacio en ${s.discipline_name}?`} />
            ) : null;
          }
          if (!bookable || !future || spotsLeft(s) === 0) return null;
          return <BookButton classId={s.class_id} label={s.discipline_name} />;
        }}
      />
      {b.sede.status === "open" && !b.canBook && (
        <p className="mt-4 text-sm text-muted">
          Para reservar, tu membresía tiene que estar al día.{" "}
          <Link href="/portal/pagos" className="font-semibold underline underline-offset-2">
            Subir comprobante
          </Link>
        </p>
      )}
    </main>
  );
}
