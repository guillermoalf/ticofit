import { crMoment } from "@/lib/schedule";
import { cn } from "@/lib/utils";

export type ReservationItem = {
  id: string;
  status: "booked" | "cancelled";
  attended_at: string | null;
  cancelled_at: string | null;
  class: {
    id: string;
    starts_at: string;
    ends_at: string;
    status: "scheduled" | "cancelled";
    cancel_reason: string | null;
    discipline: { name: string } | null;
    salon: { name: string } | null;
  } | null;
};

/** The columns both lists read, for `.select()`. */
export const RESERVATION_SELECT =
  "id, status, attended_at, cancelled_at, class:classes(id, starts_at, ends_at, status, cancel_reason, discipline:disciplines(name), salon:salones(name))";

export function reservationState(r: ReservationItem, now = Date.now()): string {
  if (r.class?.status === "cancelled") return `Clase cancelada${r.class.cancel_reason ? `: ${r.class.cancel_reason}` : ""}`;
  if (r.status === "cancelled") return "Reserva cancelada";
  if (r.attended_at) return "Asistió";
  if (r.class && Date.parse(r.class.ends_at) <= now) return "No se marcó asistencia";
  return "Reservada";
}

/** Reservations with their class, newest class first; `action` adds a button per row. */
export function ReservationList({
  items,
  empty,
  action,
}: {
  items: ReservationItem[];
  empty: string;
  action?: (r: ReservationItem) => React.ReactNode;
}) {
  if (!items.length) {
    return <p className="rounded-2xl border border-dashed border-border-strong bg-surface px-5 py-8 text-center text-muted">{empty}</p>;
  }
  return (
    <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
      {items.map((r) => {
        const off = r.status === "cancelled" || r.class?.status === "cancelled";
        return (
          <li key={r.id} className={cn("flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3", off && "text-muted")}>
            <div className="min-w-0 flex-1">
              <p className="font-semibold">
                {r.class?.discipline?.name ?? "Clase"}
                <span className="font-normal"> · {r.class ? crMoment(r.class.starts_at) : ""}</span>
              </p>
              <p className="text-sm text-muted">
                {[r.class?.salon?.name, reservationState(r)].filter(Boolean).join(" · ")}
              </p>
            </div>
            {action?.(r)}
          </li>
        );
      })}
    </ul>
  );
}

/** Live and still ahead: the ones that can be cancelled. */
export function isUpcoming(r: ReservationItem, now = Date.now()): boolean {
  return r.status === "booked" && r.class?.status === "scheduled" && Date.parse(r.class.starts_at) > now;
}
