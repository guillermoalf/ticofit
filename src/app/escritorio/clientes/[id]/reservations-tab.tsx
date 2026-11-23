import Link from "next/link";

import { CancelReservationButton } from "@/components/schedule/cancel-button";
import { RESERVATION_SELECT, ReservationList, isUpcoming, type ReservationItem } from "@/components/schedule/reservation-list";
import type { Client } from "@/lib/clients/types";
import { can, type StaffContext } from "@/lib/staff/permissions";
import { createClient } from "@/lib/supabase/server";
import { cancelReservationAction } from "../../salones/actions";

/** The client's upcoming classes and recent history. Booking happens from the class itself. */
export async function ReservationsTab({ client, staff }: { client: Client; staff: StaffContext }) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("class_reservations")
    .select(RESERVATION_SELECT)
    .eq("client_id", client.id)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) {
    return (
      <p role="alert" className="font-semibold text-[var(--danger)]">
        No se pudieron cargar las reservas. Recargá la página.
      </p>
    );
  }
  const items = ((data ?? []) as unknown as ReservationItem[]).sort((a, b) => (b.class?.starts_at ?? "").localeCompare(a.class?.starts_at ?? ""));
  const now = Date.now();
  const upcoming = items.filter((r) => isUpcoming(r, now)).reverse();
  const past = items.filter((r) => !isUpcoming(r, now));
  const canWrite = can(staff, "reservations.write");

  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-3 text-lg font-semibold">Próximas</h2>
        <ReservationList
          items={upcoming}
          empty="No tiene clases reservadas."
          action={
            canWrite
              ? (r) => (
                  <CancelReservationButton
                    action={cancelReservationAction.bind(null, r.id)}
                    question={`¿Cancelar la reserva de ${client.full_name}?`}
                  />
                )
              : undefined
          }
        />
        <p className="mt-3 text-sm text-muted">
          Para reservarle, abrí la clase desde{" "}
          <Link href="/escritorio/salones" className="font-semibold underline underline-offset-2">
            Salones y clases
          </Link>
          .
        </p>
      </section>
      <section>
        <h2 className="mb-3 text-lg font-semibold">Historial</h2>
        <ReservationList items={past.slice(0, 50)} empty="Todavía no tiene historial de clases." />
      </section>
    </div>
  );
}
