import Link from "next/link";

import { crTime, spotsLeft, type Slot } from "@/lib/schedule";
import { cn } from "@/lib/utils";

/**
 * One day of classes, in time order. The same view serves clients and staff;
 * `action` adds the buttons each audience needs, `href` makes a row a link.
 */
export function DayCalendar({
  slots,
  empty,
  showSalon = false,
  href,
  action,
}: {
  slots: Slot[];
  empty: string;
  showSalon?: boolean;
  href?: (slot: Slot) => string;
  action?: (slot: Slot) => React.ReactNode;
}) {
  if (!slots.length) {
    return (
      <p className="rounded-2xl border border-dashed border-border-strong bg-surface px-5 py-10 text-center text-muted">{empty}</p>
    );
  }
  return (
    <ol className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
      {slots.map((s) => {
        const cancelled = s.status === "cancelled";
        const left = spotsLeft(s);
        const body = (
          <>
            <p className="w-24 shrink-0 text-[15px] font-semibold tabular-nums">
              {crTime(s.starts_at)}
              <span className="block text-sm font-normal text-muted">a {crTime(s.ends_at)}</span>
            </p>
            <div className="min-w-0 flex-1">
              <p className={cn("text-[17px] font-semibold", cancelled && "line-through")}>{s.discipline_name}</p>
              <p className="text-sm text-muted">
                {[showSalon && s.salon_name, s.coach_name].filter(Boolean).join(" · ") || " "}
              </p>
            </div>
            <p className="shrink-0 text-right text-sm">
              {cancelled ? (
                <span className="font-semibold">Cancelada</span>
              ) : (
                <>
                  <span className="font-semibold tabular-nums">
                    {s.booked} / {s.capacity}
                  </span>
                  <span className="block text-muted">{left === 0 ? "Llena" : `${left} ${left === 1 ? "espacio" : "espacios"}`}</span>
                </>
              )}
            </p>
          </>
        );
        return (
          <li key={s.class_id} className={cn("flex flex-wrap items-center gap-x-4 gap-y-3 px-5 py-4", cancelled && "text-muted")}>
            {href ? (
              <Link href={href(s)} className="flex min-w-0 flex-1 items-center gap-4 rounded-xl hover:underline hover:underline-offset-4">
                {body}
              </Link>
            ) : (
              <div className="flex min-w-0 flex-1 items-center gap-4">{body}</div>
            )}
            {s.my_reservation_id && !cancelled && (
              <span className="rounded-full bg-verde-profundo px-3 py-1 text-xs font-semibold text-crema-claro">Reservada</span>
            )}
            {action?.(s)}
          </li>
        );
      })}
    </ol>
  );
}
