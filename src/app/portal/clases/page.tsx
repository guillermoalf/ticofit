import Link from "next/link";

import { CancelReservationButton } from "@/components/schedule/cancel-button";
import { RESERVATION_SELECT, ReservationList, isUpcoming, type ReservationItem } from "@/components/schedule/reservation-list";
import type { Salon } from "@/lib/schedule";
import { cancelOwnAction } from "./actions";
import { clientBooking } from "./data";

export const dynamic = "force-dynamic";

/** The client's salones and their upcoming classes. */
export default async function ClasesPage() {
  const b = await clientBooking();
  if (!b.clientId || !b.sede) {
    return (
      <main className="mx-auto max-w-xl px-5 py-12 sm:px-6">
        <h1 className="font-tf-serif text-[40px] leading-tight">Clases</h1>
        <p className="mt-3 text-[16px] text-muted">Tu cuenta todavía no está ligada a un expediente. Escribinos y lo arreglamos.</p>
      </main>
    );
  }
  const [{ data: salones }, { data: res }] = await Promise.all([
    b.supabase.from("salones").select("id, sede_id, name, capacity, sort_order, active").eq("sede_id", b.sede.id).eq("active", true).order("sort_order").order("name"),
    b.supabase.from("class_reservations").select(RESERVATION_SELECT).eq("client_id", b.clientId).eq("status", "booked").order("created_at", { ascending: false }).limit(50),
  ]);
  const now = Date.now();
  const upcoming = ((res ?? []) as unknown as ReservationItem[])
    .filter((r) => isUpcoming(r, now))
    .sort((a, c) => a.class!.starts_at.localeCompare(c.class!.starts_at));
  const open = b.sede.status === "open";

  return (
    <main className="mx-auto max-w-3xl px-5 py-10 sm:px-6 sm:py-12">
      <h1 className="font-tf-serif text-[40px] leading-tight">Clases</h1>
      <p className="mt-2 text-[15px] text-muted">{b.sede.name}</p>

      {!open && <p className="mt-6 rounded-2xl border border-border-strong bg-surface px-5 py-4">Esta sede todavía no recibe reservas.</p>}
      {open && !b.canBook && (
        <p className="mt-6 rounded-2xl border border-border-strong bg-surface px-5 py-4">
          Para reservar, tu membresía tiene que estar al día.{" "}
          <Link href="/portal/pagos" className="font-semibold underline underline-offset-2">
            Subir comprobante
          </Link>
        </p>
      )}

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold">Mis reservas</h2>
        <ReservationList
          items={upcoming}
          empty="No tenés clases reservadas."
          action={(r) => (
            <CancelReservationButton action={cancelOwnAction.bind(null, r.id)} question="¿Cancelar esta reserva?" />
          )}
        />
        {upcoming.length > 0 && b.cutoffHours > 0 && (
          <p className="mt-2 text-sm text-muted">
            Podés cancelar hasta {b.cutoffHours} {b.cutoffHours === 1 ? "hora" : "horas"} antes de la clase.
          </p>
        )}
      </section>

      <section className="mt-10">
        <h2 className="mb-3 text-lg font-semibold">Salones</h2>
        {(salones ?? []).length ? (
          <ul className="grid gap-3 sm:grid-cols-2">
            {((salones ?? []) as Salon[]).map((s) => (
              <li key={s.id}>
                <Link
                  href={`/portal/clases/${s.id}`}
                  className="flex items-baseline justify-between rounded-2xl border border-border bg-surface px-5 py-4 text-[17px] font-semibold transition-colors hover:border-primary hover:bg-surface-hover"
                >
                  {s.name} <span aria-hidden="true">→</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted">Todavía no hay salones publicados.</p>
        )}
      </section>
    </main>
  );
}
