import Link from "next/link";

import { addDays, todayCR } from "@/lib/clients/body";
import { DAY_RANGE, dayLabel } from "@/lib/schedule";
import { cn } from "@/lib/utils";

const PILL = "rounded-full border border-border-strong px-4 py-2 text-sm font-semibold hover:bg-surface-hover";

/**
 * Previous / today / next and a date picker for a day view. Plain links and a
 * GET form, so it works before the page hydrates.
 */
export function DayNav({ basePath, day, maxDay }: { basePath: string; day: string; maxDay?: string }) {
  const today = todayCR();
  const min = addDays(today, -DAY_RANGE);
  const max = maxDay ?? addDays(today, DAY_RANGE);
  const prev = addDays(day, -1);
  const next = addDays(day, 1);
  const href = (d: string) => `${basePath}?dia=${d}`;
  return (
    <nav aria-label="Elegir día" className="mb-6 flex flex-wrap items-center gap-2">
      <p className="mr-auto font-tf-serif text-[28px] leading-tight first-letter:uppercase">
        {day === today ? "Hoy, " : ""}
        {dayLabel(day)}
      </p>
      {prev >= min && (
        <Link href={href(prev)} className={PILL} aria-label="Día anterior">
          <span aria-hidden="true">←</span>
        </Link>
      )}
      {day !== today && (
        <Link href={href(today)} className={PILL}>
          Hoy
        </Link>
      )}
      {next <= max && (
        <Link href={href(next)} className={PILL} aria-label="Día siguiente">
          <span aria-hidden="true">→</span>
        </Link>
      )}
      <form method="get" action={basePath} className="flex items-center gap-2">
        <label htmlFor="dia" className="sr-only">
          Ir a una fecha
        </label>
        <input
          id="dia"
          name="dia"
          type="date"
          defaultValue={day}
          min={min}
          max={max}
          className="rounded-full border border-border-strong bg-surface px-3.5 py-1.5 text-[16px] text-ink"
        />
        <button type="submit" className={cn(PILL, "cursor-pointer")}>
          Ir
        </button>
      </form>
    </nav>
  );
}
